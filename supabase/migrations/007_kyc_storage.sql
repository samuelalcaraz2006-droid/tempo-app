-- ============================================================
-- TEMPO · Migration 007 · KYC Storage & Document Tracking
-- Dépend de : 002_tables.sql
-- ============================================================

-- ─────────────────────────────────────────
-- COLONNES MANQUANTES SUR LA TABLE WORKERS
-- ─────────────────────────────────────────
alter table workers
  add column if not exists siret_doc_url       text,
  add column if not exists kyc_submitted_at    timestamptz,
  add column if not exists kyc_rejection_reason text;

comment on column workers.siret_doc_url is 'URL du justificatif SIRET (extrait Kbis) dans Supabase Storage';
comment on column workers.kyc_submitted_at is 'Horodatage du premier dépôt de documents KYC par le travailleur';
comment on column workers.kyc_rejection_reason is 'Raison du refus KYC saisie par l administrateur';

-- ─────────────────────────────────────────
-- BUCKET STORAGE POUR LES DOCUMENTS KYC
-- ─────────────────────────────────────────
-- Créer le bucket "kyc-documents" (privé, non public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,  -- 10 MB max
  array['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- RLS POLICIES POUR LE BUCKET KYC
-- ─────────────────────────────────────────

-- Les travailleurs peuvent uploader leurs propres documents
-- Convention : kyc-documents/{user_id}/{doc_type}/{filename}
create policy "Workers upload own KYC docs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Les travailleurs peuvent lire leurs propres documents
create policy "Workers read own KYC docs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Les travailleurs peuvent remplacer leurs propres documents
create policy "Workers update own KYC docs"
on storage.objects for update
to authenticated
using (
  bucket_id = 'kyc-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Les admins peuvent lire tous les documents KYC
create policy "Admins read all KYC docs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'kyc-documents'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- ─────────────────────────────────────────
-- FONCTION : notifier le travailleur après décision KYC
-- ─────────────────────────────────────────
create or replace function notify_kyc_decision(
  p_worker_id uuid,
  p_approved  boolean,
  p_reason    text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into notifications (user_id, type, payload)
  values (
    p_worker_id,
    case when p_approved then 'kyc_validated' else 'kyc_rejected' end,
    jsonb_build_object(
      'approved', p_approved,
      'reason',   p_reason,
      'decided_at', now()
    )
  );
end;
$$;
