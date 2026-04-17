-- ============================================================
-- TEMPO · Migration 015 · Contract counter-offers + e-signature envelopes
-- Dépend de : 002_tables.sql (contracts), 011_messages_and_fixes.sql,
--             014_message_attachments.sql
-- ============================================================
-- Objectifs :
--
-- 1. Permettre à un travailleur qui reçoit un contrat dans le chat de
--    proposer une contre-offre sur le taux horaire, avec historique
--    complet côté entreprise (accept / reject / expired).
--
-- 2. Formaliser les signatures de contrat via un provider e-signature
--    eIDAS conforme (Yousign par défaut). On stocke une "enveloppe"
--    par contrat qui suit le cycle de vie de la demande de signature
--    côté provider, avec hash du document signé et URL du trail d'audit
--    — indispensable pour être irreprochable légalement.
--
-- Design RLS :
--   - contract_offers : lisible par proposer et target ; créable par
--     les deux parties du contrat ; update (accept/reject) réservé à
--     la cible.
--   - contract_signature_envelopes : lisible par les parties du contrat.
--     Seul le service_role (edge functions) peut écrire — le client ne
--     touche jamais directement au statut de signature.
-- ============================================================

-- ─────────────────────────────────────────
-- 1. CONTRE-OFFRES DE TAUX HORAIRE
-- ─────────────────────────────────────────

do $$ begin
  create type contract_offer_status as enum (
    'pending',
    'accepted',
    'rejected',
    'expired',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

create table if not exists contract_offers (
  id             uuid                    primary key default uuid_generate_v4(),
  contract_id    uuid                    not null references contracts(id) on delete cascade,
  proposer_id    uuid                    not null references profiles(id) on delete cascade,
  target_id      uuid                    not null references profiles(id) on delete cascade,
  -- Message qui a porté la contre-offre (pour lier l'historique au chat).
  message_id     uuid                    references messages(id) on delete set null,
  original_rate  decimal(8,2)            not null check (original_rate >= 0),
  proposed_rate  decimal(8,2)            not null check (proposed_rate > 0),
  note           text                    check (char_length(coalesce(note, '')) <= 500),
  status         contract_offer_status   not null default 'pending',
  responded_at   timestamptz,
  responder_id   uuid                    references profiles(id),
  created_at     timestamptz             not null default now(),
  updated_at     timestamptz             not null default now()
);

comment on table contract_offers is
  'Contre-offres sur le taux horaire d''un contrat, proposées depuis le chat';

create index if not exists idx_contract_offers_contract
  on contract_offers(contract_id, created_at desc);

create index if not exists idx_contract_offers_target_pending
  on contract_offers(target_id) where status = 'pending';

drop trigger if exists trg_contract_offers_updated_at on contract_offers;
create trigger trg_contract_offers_updated_at
  before update on contract_offers
  for each row execute function update_updated_at();

alter table contract_offers enable row level security;

create policy "contract_offers_select_parties"
  on contract_offers for select
  using (auth.uid() = proposer_id or auth.uid() = target_id);

-- Insert : l'émetteur doit être une partie du contrat.
create policy "contract_offers_insert_proposer"
  on contract_offers for insert
  with check (
    auth.uid() = proposer_id
    and exists (
      select 1 from contracts c
      where c.id = contract_id
        and (c.worker_id = auth.uid() or c.company_id = auth.uid())
    )
  );

-- Update : uniquement la cible (pour accepter/refuser) ou le proposer
-- (pour annuler avant réponse).
create policy "contract_offers_update_target_or_proposer"
  on contract_offers for update
  using (auth.uid() = target_id or auth.uid() = proposer_id)
  with check (auth.uid() = target_id or auth.uid() = proposer_id);

alter publication supabase_realtime add table contract_offers;

-- ─────────────────────────────────────────
-- 2. ENVELOPPES DE SIGNATURE ÉLECTRONIQUE
-- ─────────────────────────────────────────

do $$ begin
  create type signature_provider as enum ('yousign', 'universign', 'docusign');
exception when duplicate_object then null; end $$;

do $$ begin
  create type signature_envelope_status as enum (
    'created',
    'sent',
    'in_progress',
    'signed',
    'declined',
    'expired',
    'cancelled',
    'error'
  );
exception when duplicate_object then null; end $$;

create table if not exists contract_signature_envelopes (
  id                    uuid                      primary key default uuid_generate_v4(),
  contract_id           uuid                      not null references contracts(id) on delete cascade,
  provider              signature_provider        not null default 'yousign',
  -- Identifiant côté provider (procedure_id pour Yousign, envelope_id pour DocuSign, etc.)
  provider_envelope_id  text,
  initiator_id          uuid                      not null references profiles(id),
  signer_worker_id      uuid                      references profiles(id),
  signer_company_id     uuid                      references profiles(id),
  -- Hash SHA-256 du PDF envoyé au provider — preuve d'intégrité.
  document_hash         text,
  document_url          text,
  -- URL du PDF signé renvoyé par le provider (ou trail d'audit).
  signed_document_url   text,
  audit_trail_url       text,
  status                signature_envelope_status not null default 'created',
  worker_signed_at      timestamptz,
  company_signed_at     timestamptz,
  cancelled_at          timestamptz,
  expired_at            timestamptz,
  -- Payload brut du dernier webhook reçu — utile pour debug / audit.
  raw_metadata          jsonb                     not null default '{}'::jsonb,
  created_at            timestamptz               not null default now(),
  updated_at            timestamptz               not null default now()
);

comment on table contract_signature_envelopes is
  'Enveloppes de signature électronique liées à un contrat (provider eIDAS)';

create unique index if not exists idx_sig_env_contract_active
  on contract_signature_envelopes(contract_id)
  where status in ('created', 'sent', 'in_progress');

create index if not exists idx_sig_env_provider_envelope
  on contract_signature_envelopes(provider, provider_envelope_id);

drop trigger if exists trg_sig_envelope_updated_at on contract_signature_envelopes;
create trigger trg_sig_envelope_updated_at
  before update on contract_signature_envelopes
  for each row execute function update_updated_at();

alter table contract_signature_envelopes enable row level security;

-- Lecture : parties du contrat uniquement.
create policy "sig_envelopes_select_parties"
  on contract_signature_envelopes for select
  using (
    exists (
      select 1 from contracts c
      where c.id = contract_id
        and (c.worker_id = auth.uid() or c.company_id = auth.uid())
    )
  );

-- Insert/update/delete : jamais depuis le client. Les edge functions
-- tournent avec le service_role key qui bypasse RLS, donc aucune
-- politique permissive ici volontairement.

alter publication supabase_realtime add table contract_signature_envelopes;
