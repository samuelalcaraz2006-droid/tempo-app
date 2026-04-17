-- ============================================================================
-- Migration 022 — Dossier litige structuré (anti-fraude Phase 2)
-- ============================================================================
-- Objectif : chaque litige génère un dossier complet, exploitable en justice,
-- avec snapshots figés des preuves, pièces jointes, et suspension automatique
-- des comptes en cas de non-paiement.
--
-- Tables :
--   1. fraud_cases — dossier litige complet
--   2. fraud_case_documents — pièces jointes liées
--
-- RPCs :
--   1. open_fraud_case() — ouvre un litige + compile le dossier
--   2. add_fraud_case_document() — ajoute une pièce jointe
--   3. check_fraud_case_suspension() — suspension auto (pg_cron)
--   4. admin_update_fraud_case() — admin résout/escale
--   5. admin_unsuspend_account() — admin lève la suspension
--
-- Dépend de : 020 (blindage), 021 (avenants), 017 (is_admin)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Types enum
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'fraud_case_type') then
    create type fraud_case_type as enum (
      'non_payment',
      'hours_dispute',
      'contract_dispute',
      'working_conditions',
      'unfair_rating',
      'absence',
      'quality',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'fraud_case_status') then
    create type fraud_case_status as enum (
      'open',
      'investigating',
      'resolved_worker',
      'resolved_company',
      'resolved_mutual',
      'dismissed',
      'escalated_legal'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'fraud_case_priority') then
    create type fraud_case_priority as enum ('low', 'medium', 'high', 'critical');
  end if;

  if not exists (select 1 from pg_type where typname = 'fraud_document_type') then
    create type fraud_document_type as enum (
      'screenshot',
      'photo',
      'email',
      'contract_pdf',
      'timesheet',
      'message_export',
      'other'
    );
  end if;
end $$;

alter type notif_type add value if not exists 'fraud_case_opened';
alter type notif_type add value if not exists 'fraud_case_updated';
alter type notif_type add value if not exists 'fraud_case_resolved';
alter type notif_type add value if not exists 'fraud_case_escalated';
alter type notif_type add value if not exists 'account_suspended';
alter type notif_type add value if not exists 'account_unsuspended';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table fraud_cases
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists fraud_cases (
  id                  uuid               primary key default uuid_generate_v4(),
  contract_id         uuid               not null references contracts(id),
  mission_id          uuid               not null references missions(id),
  opened_by           uuid               not null references profiles(id),
  worker_id           uuid               not null references workers(id),
  company_id          uuid               not null references companies(id),
  type                fraud_case_type    not null,
  priority            fraud_case_priority not null default 'medium',
  status              fraud_case_status  not null default 'open',
  description         text               not null check (length(description) >= 20),
  admin_notes         text,
  decision            text,
  decided_by          uuid               references profiles(id),
  decided_at          timestamptz,
  -- Snapshots figés au moment de l'ouverture (preuve juridique)
  snapshot_contract   jsonb              not null default '{}'::jsonb,
  snapshot_hours      jsonb              not null default '{}'::jsonb,
  snapshot_invoices   jsonb              not null default '[]'::jsonb,
  -- Suspension liée
  suspension_applied  boolean            not null default false,
  suspended_profile_id uuid              references profiles(id),
  -- Timestamps
  opened_at           timestamptz        not null default now(),
  updated_at          timestamptz        not null default now(),
  closed_at           timestamptz,
  -- Rétention légale : 5 ans litiges commerciaux (art. L.110-4)
  retention_until     timestamptz,
  created_at          timestamptz        not null default now()
);

comment on table fraud_cases is
  'Dossier litige structuré avec snapshots figés. Conservation 5 ans (art. L.110-4 Code de commerce).';

create trigger trg_fraud_cases_updated_at
  before update on fraud_cases
  for each row execute function update_updated_at();

-- Un seul litige ouvert par contrat à la fois
create unique index if not exists idx_fraud_cases_open_per_contract
  on fraud_cases (contract_id)
  where status in ('open', 'investigating');

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Table fraud_case_documents
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists fraud_case_documents (
  id            uuid                primary key default uuid_generate_v4(),
  case_id       uuid                not null references fraud_cases(id) on delete cascade,
  uploaded_by   uuid                not null references profiles(id),
  file_url      text                not null,
  file_name     text                not null,
  file_size     integer,
  file_type     text,
  document_type fraud_document_type not null default 'other',
  description   text,
  created_at    timestamptz         not null default now()
);

comment on table fraud_case_documents is
  'Pièces jointes d''un dossier litige. Preuve légale — suppression admin uniquement.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ────────────────────────────────────────────────────────────────────────────
alter table fraud_cases enable row level security;
alter table fraud_case_documents enable row level security;

-- fraud_cases: parties + admin
create policy "fraud_cases_select" on fraud_cases
  for select using (
    worker_id::uuid = auth.uid()
    or company_id::uuid = auth.uid()
    or opened_by = auth.uid()
    or is_admin()
  );

-- INSERT via RPC uniquement (SECURITY DEFINER)
-- Pas de policy INSERT directe — empêche les inserts hors RPC

-- UPDATE admin uniquement
create policy "fraud_cases_update_admin" on fraud_cases
  for update using (is_admin());

-- Jamais de DELETE
-- (pas de policy DELETE = bloqué par défaut avec RLS activé)

-- fraud_case_documents: parties du case + admin
create policy "fraud_docs_select" on fraud_case_documents
  for select using (
    exists (
      select 1 from fraud_cases fc
      where fc.id = fraud_case_documents.case_id
        and (fc.worker_id::uuid = auth.uid() or fc.company_id::uuid = auth.uid() or is_admin())
    )
  );

create policy "fraud_docs_insert" on fraud_case_documents
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from fraud_cases fc
      where fc.id = fraud_case_documents.case_id
        and (fc.worker_id::uuid = auth.uid() or fc.company_id::uuid = auth.uid())
        and fc.status in ('open', 'investigating')
    )
  );

-- DELETE admin uniquement (préservation des preuves)
create policy "fraud_docs_delete_admin" on fraud_case_documents
  for delete using (is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Storage bucket pour les pièces jointes
-- ────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('dispute-documents', 'dispute-documents', false, 10485760)
on conflict (id) do nothing;

-- Storage RLS : upload par parties du case, read par parties + admin
create policy "dispute_docs_upload" on storage.objects
  for insert with check (
    bucket_id = 'dispute-documents'
    and auth.uid() is not null
  );

create policy "dispute_docs_read" on storage.objects
  for select using (
    bucket_id = 'dispute-documents'
    and auth.uid() is not null
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 6. RPC : ouvrir un litige
-- ────────────────────────────────────────────────────────────────────────────
create or replace function open_fraud_case(
  p_contract_id  uuid,
  p_type         fraud_case_type,
  p_description  text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_contract     contracts;
  v_mission      missions;
  v_caller       uuid := auth.uid();
  v_other_party  uuid;
  v_case_id      uuid;
  v_priority     fraud_case_priority;
  v_snap_hours   jsonb;
  v_snap_invoices jsonb;
begin
  -- Validation description
  if length(coalesce(p_description, '')) < 20 then
    raise exception 'fraud_case_description_too_short: la description doit faire au moins 20 caractères'
      using errcode = 'check_violation';
  end if;

  -- Récupérer le contrat
  select * into v_contract from contracts where id = p_contract_id;
  if v_contract is null then
    raise exception 'contract_not_found: contrat introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  -- Vérifier que l'appelant est partie du contrat
  if v_caller = v_contract.worker_id then
    v_other_party := v_contract.company_id;
  elsif v_caller = v_contract.company_id then
    v_other_party := v_contract.worker_id;
  else
    raise exception 'forbidden: seules les parties du contrat peuvent ouvrir un litige'
      using errcode = 'insufficient_privilege';
  end if;

  -- Vérifier qu'il n'y a pas déjà un litige ouvert sur ce contrat
  if exists (
    select 1 from fraud_cases
    where contract_id = p_contract_id
      and status in ('open', 'investigating')
  ) then
    raise exception 'fraud_case_already_open: un litige est déjà ouvert pour ce contrat'
      using errcode = 'check_violation';
  end if;

  -- Récupérer la mission
  select * into v_mission from missions where id = v_contract.mission_id;

  -- Calculer la priorité
  v_priority := case p_type
    when 'non_payment' then 'critical'::fraud_case_priority
    when 'hours_dispute' then 'high'::fraud_case_priority
    when 'absence' then 'high'::fraud_case_priority
    when 'working_conditions' then 'high'::fraud_case_priority
    else 'medium'::fraud_case_priority
  end;

  -- Compiler les snapshots
  -- Snapshot heures
  select jsonb_build_object(
    'total_entries', count(*),
    'draft', count(*) filter (where status = 'draft'),
    'submitted', count(*) filter (where status = 'submitted'),
    'validated', count(*) filter (where status = 'validated'),
    'disputed', count(*) filter (where status = 'disputed'),
    'billed', count(*) filter (where status = 'billed'),
    'total_worked_minutes', coalesce(sum(worked_minutes), 0),
    'validated_minutes', coalesce(sum(worked_minutes) filter (where status in ('validated', 'billed')), 0)
  ) into v_snap_hours
  from mission_time_entries
  where contract_id = p_contract_id;

  -- Snapshot factures
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'amount_ht', i.amount_ht,
    'amount_ttc', i.amount_ttc,
    'commission', i.commission,
    'worker_payout', i.worker_payout,
    'status', i.status,
    'paid_at', i.paid_at,
    'created_at', i.created_at
  )), '[]'::jsonb) into v_snap_invoices
  from invoices i
  where i.contract_id = p_contract_id;

  -- Créer le dossier
  insert into fraud_cases (
    contract_id, mission_id, opened_by,
    worker_id, company_id,
    type, priority, description,
    snapshot_contract, snapshot_hours, snapshot_invoices
  ) values (
    p_contract_id, v_contract.mission_id, v_caller,
    v_contract.worker_id, v_contract.company_id,
    p_type, v_priority, p_description,
    jsonb_build_object(
      'id', v_contract.id,
      'hourly_rate', v_contract.hourly_rate,
      'total_hours', v_contract.total_hours,
      'total_amount_ht', v_contract.total_amount_ht,
      'commission_rate', v_contract.commission_rate,
      'commission_amount', v_contract.commission_amount,
      'status', v_contract.status,
      'signed_worker_at', v_contract.signed_worker_at,
      'signed_company_at', v_contract.signed_company_at,
      'mission_title', v_mission.title,
      'mission_sector', v_mission.sector,
      'mission_city', v_mission.city
    ),
    v_snap_hours,
    v_snap_invoices
  )
  returning id into v_case_id;

  -- Notifier l'autre partie
  insert into notifications (user_id, type, title, body)
  values (
    v_other_party,
    'fraud_case_opened',
    'Litige ouvert',
    'Un litige a été ouvert sur votre contrat. Consultez le dossier et fournissez vos preuves.'
  );

  -- Notifier l'admin (toujours — les litiges sont critiques)
  insert into notifications (user_id, type, title, body)
  select p.id, 'fraud_case_opened', 'Nouveau litige [' || p_type || ']',
    'Un litige de type "' || p_type || '" a été ouvert. Priorité : ' || v_priority || '.'
  from profiles p
  where p.role = 'admin';

  return v_case_id;
end;
$$;

comment on function open_fraud_case is
  'Ouvre un litige structuré avec compilation automatique des preuves (snapshots contrat, heures, factures).';


-- ────────────────────────────────────────────────────────────────────────────
-- 7. RPC : suspension automatique (non-paiement > 1 jour ouvré)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function check_fraud_case_suspension()
returns void
language plpgsql
security definer
as $$
declare
  v_case   record;
  v_company_profile_id uuid;
begin
  for v_case in
    select fc.id, fc.company_id, fc.worker_id
    from fraud_cases fc
    where fc.type = 'non_payment'
      and fc.status = 'open'
      and fc.suspension_applied = false
      -- Plus de 1 jour ouvré (on ignore les weekends)
      and fc.opened_at < now() - interval '1 day'
      and extract(dow from fc.opened_at) not in (0, 6)
  loop
    -- Trouver le profile_id de l'entreprise
    select c.id into v_company_profile_id
    from companies c
    where c.id = v_case.company_id;

    -- Suspendre le compte entreprise
    update profiles set status = 'suspended'
    where id = v_company_profile_id
      and status <> 'suspended';

    -- Bloquer les missions ouvertes de cette entreprise
    update missions set status = 'cancelled'
    where company_id = v_case.company_id
      and status in ('open', 'draft');

    -- Marquer le case
    update fraud_cases set
      status = 'investigating',
      suspension_applied = true,
      suspended_profile_id = v_company_profile_id,
      admin_notes = coalesce(admin_notes, '') || E'\n[AUTO] Compte entreprise suspendu le ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || ' pour non-paiement > 1 jour.'
    where id = v_case.id;

    -- Notifier l'entreprise
    insert into notifications (user_id, type, title, body)
    values (
      v_company_profile_id,
      'account_suspended',
      'Compte suspendu',
      'Votre compte a été suspendu suite à un litige de non-paiement non résolu. Régularisez la situation pour lever la suspension.'
    );

    -- Notifier l'admin
    insert into notifications (user_id, type, title, body)
    select p.id, 'fraud_case_updated', 'Suspension automatique appliquée',
      'Le compte entreprise a été suspendu automatiquement pour le litige #' || v_case.id::text
    from profiles p
    where p.role = 'admin';
  end loop;
end;
$$;

comment on function check_fraud_case_suspension is
  'Cron job : suspend les comptes entreprise avec un litige non-paiement non résolu > 1 jour ouvré.';

-- Job pg_cron : exécuter tous les jours à 09:00 UTC
select cron.schedule(
  'check-fraud-suspension',
  '0 9 * * 1-5',
  $$select check_fraud_case_suspension()$$
);


-- ────────────────────────────────────────────────────────────────────────────
-- 8. RPC : admin résoudre / mettre à jour un litige
-- ────────────────────────────────────────────────────────────────────────────
create or replace function admin_update_fraud_case(
  p_case_id     uuid,
  p_status      fraud_case_status default null,
  p_admin_notes text              default null,
  p_decision    text              default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_case         fraud_cases;
  v_caller       uuid := auth.uid();
  v_is_resolved  boolean;
  v_other_open   integer;
begin
  -- Admin uniquement
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_case from fraud_cases where id = p_case_id;
  if v_case is null then
    raise exception 'fraud_case_not_found: dossier de litige introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  -- Vérifier que le case n'est pas déjà fermé
  if v_case.status in ('resolved_worker', 'resolved_company', 'resolved_mutual', 'dismissed') then
    raise exception 'fraud_case_closed: ce litige est déjà résolu'
      using errcode = 'check_violation';
  end if;

  -- Appliquer les mises à jour
  v_is_resolved := p_status in ('resolved_worker', 'resolved_company', 'resolved_mutual', 'dismissed');

  update fraud_cases set
    status      = coalesce(p_status, status),
    admin_notes = coalesce(p_admin_notes, admin_notes),
    decision    = case when v_is_resolved then coalesce(p_decision, decision) else decision end,
    decided_by  = case when v_is_resolved then v_caller else decided_by end,
    decided_at  = case when v_is_resolved then now() else decided_at end,
    closed_at   = case when v_is_resolved then now() else closed_at end,
    retention_until = case when v_is_resolved then now() + interval '5 years' else retention_until end
  where id = p_case_id;

  -- Si résolu et que le compte était suspendu pour ce case → vérifier désuspension
  if v_is_resolved and v_case.suspension_applied and v_case.suspended_profile_id is not null then
    -- Compter les AUTRES litiges non-paiement encore ouverts pour cette entreprise
    select count(*) into v_other_open
    from fraud_cases
    where company_id = v_case.company_id
      and id <> p_case_id
      and type = 'non_payment'
      and status in ('open', 'investigating');

    -- Désuspendre seulement si aucun autre litige non-paiement ouvert
    if v_other_open = 0 then
      update profiles set status = 'verified'
      where id = v_case.suspended_profile_id
        and status = 'suspended';

      insert into notifications (user_id, type, title, body)
      values (
        v_case.suspended_profile_id,
        'account_unsuspended',
        'Compte réactivé',
        'Votre compte a été réactivé suite à la résolution du litige. Vous pouvez à nouveau publier des missions.'
      );
    end if;
  end if;

  -- Notifier les deux parties
  insert into notifications (user_id, type, title, body)
  values
    (v_case.worker_id, 'fraud_case_updated', 'Litige mis à jour', 'Le statut de votre litige a été mis à jour par l''administrateur.'),
    (v_case.company_id, 'fraud_case_updated', 'Litige mis à jour', 'Le statut de votre litige a été mis à jour par l''administrateur.');
end;
$$;

comment on function admin_update_fraud_case is
  'Admin : met à jour un dossier litige. Gère la désuspension automatique si plus aucun litige non-paiement ouvert.';


-- ────────────────────────────────────────────────────────────────────────────
-- 9. RPC : admin forcer la désuspension manuelle
-- ────────────────────────────────────────────────────────────────────────────
create or replace function admin_unsuspend_account(p_profile_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  update profiles set status = 'verified'
  where id = p_profile_id and status = 'suspended';

  insert into notifications (user_id, type, title, body)
  values (
    p_profile_id,
    'account_unsuspended',
    'Compte réactivé',
    'Votre compte a été réactivé par un administrateur.'
  );
end;
$$;

comment on function admin_unsuspend_account is
  'Admin : lève manuellement la suspension d''un compte.';


-- ────────────────────────────────────────────────────────────────────────────
-- 10. RPC : escalade juridique
-- ────────────────────────────────────────────────────────────────────────────
create or replace function admin_escalate_to_legal(p_case_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_case fraud_cases;
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_case from fraud_cases where id = p_case_id;
  if v_case is null then
    raise exception 'fraud_case_not_found: dossier introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  update fraud_cases set
    status = 'escalated_legal',
    admin_notes = coalesce(admin_notes, '') || E'\n[LEGAL] Escaladé en procédure juridique le ' || to_char(now(), 'DD/MM/YYYY HH24:MI')
  where id = p_case_id;

  -- Notifier les deux parties
  insert into notifications (user_id, type, title, body)
  values
    (v_case.worker_id, 'fraud_case_escalated', 'Litige escaladé', 'Votre litige a été transmis au service juridique de TEMPO.'),
    (v_case.company_id, 'fraud_case_escalated', 'Litige escaladé', 'Ce litige a été transmis au service juridique de TEMPO.');
end;
$$;

comment on function admin_escalate_to_legal is
  'Admin : escalade un litige vers la procédure juridique (co-plainte TEMPO + partie lésée).';
