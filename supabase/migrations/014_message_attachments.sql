-- ============================================================
-- TEMPO · Migration 014 · Message attachments (multi / multi-type)
-- Dépend de : 011_messages_and_fixes.sql
-- ============================================================
-- Objectif :
--   Permettre d'attacher PLUSIEURS pièces à un message et de
--   supporter plusieurs types (image, document, référence contrat,
--   référence facture, contre-offre de taux horaire).
--
-- Design :
--   - Table dédiée `message_attachments` pour le plural + le metadata
--     typé par kind.
--   - `messages.content` devient nullable (un message peut n'être
--     qu'une pièce jointe sans texte).
--   - RLS héritée : lire si on est partie du message, insérer si
--     on est l'émetteur.
-- ============================================================

-- 1. Rendre le contenu texte optionnel (attachment-only messages)
alter table messages
  alter column content drop not null;

-- 2. Table des pièces jointes
create table if not exists message_attachments (
  id          uuid        primary key default uuid_generate_v4(),
  message_id  uuid        not null references messages(id) on delete cascade,
  kind        text        not null check (kind in (
                'image',
                'document',
                'contract_ref',
                'invoice_ref',
                'counter_offer'
              )),
  url         text,
  mime_type   text,
  file_name   text,
  file_size   integer,
  metadata    jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table message_attachments is
  'Pièces jointes multi-type attachées à un message (image, document, contrat, facture, contre-offre)';

create index if not exists idx_message_attachments_message
  on message_attachments(message_id);

create index if not exists idx_message_attachments_kind
  on message_attachments(kind);

-- 3. RLS : visible pour les parties du message parent
alter table message_attachments enable row level security;

create policy "message_attachments_select_parties"
  on message_attachments for select
  using (
    exists (
      select 1 from messages m
      where m.id = message_attachments.message_id
        and (m.sender_id = auth.uid() or m.receiver_id = auth.uid())
    )
  );

create policy "message_attachments_insert_sender"
  on message_attachments for insert
  with check (
    exists (
      select 1 from messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
    )
  );

create policy "message_attachments_delete_sender"
  on message_attachments for delete
  using (
    exists (
      select 1 from messages m
      where m.id = message_attachments.message_id
        and m.sender_id = auth.uid()
    )
  );

-- 4. Realtime : propager les inserts pour que le destinataire voie
--    immédiatement les nouvelles pièces arriver après le message.
alter publication supabase_realtime add table message_attachments;
