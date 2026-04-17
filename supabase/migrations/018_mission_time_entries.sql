-- ============================================================================
-- Migration 018 — mission_time_entries (audit finding #5)
-- ============================================================================
-- Objectif légal : tracer les heures réellement travaillées pour chaque
-- mission afin que l'employeur puisse prouver les heures (art. L.3171-4 du
-- Code du travail). Sans ce décompte horodaté, ni l'entreprise ni le worker
-- ne peuvent défendre leur version en cas de litige ou de requalification.
--
-- Philosophie : worker déclare, company valide (ou propose un amendement,
-- ou conteste). Facture bloquée tant que toutes les entries du contrat ne
-- sont pas validées (explicitement ou par tacite acceptation à 7 jours).
--
-- Défense en profondeur :
--   1. Table des entries horodatées avec worked_minutes calculé côté DB
--   2. Trigger d'immutabilité : impossible de modifier une entry validée
--   3. Trigger gate invoice étendu : bloque l'insert si entries non validées
--   4. RPC SECURITY DEFINER pour soumettre / valider / contester
--   5. RPC tacite (appelée par pg_cron) qui valide automatiquement après 7j
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Extensions des enums existants (001_types.sql)
-- ────────────────────────────────────────────
alter type notif_type add value if not exists 'time_entries_submitted';
alter type notif_type add value if not exists 'time_entries_validated';
alter type notif_type add value if not exists 'time_entries_disputed';
alter type notif_type add value if not exists 'time_entries_reminder';

alter type contract_status add value if not exists 'awaiting_hours_validation';
alter type contract_status add value if not exists 'hours_disputed';

-- Nouveaux types dédiés aux entries
do $$
begin
  if not exists (select 1 from pg_type where typname = 'time_entry_status') then
    create type time_entry_status as enum (
      'draft',        -- worker saisit encore
      'submitted',    -- soumis à validation company
      'validated',    -- accepté (explicit ou tacite)
      'disputed',     -- contesté, litige admin
      'billed'        -- facturée, figée définitivement
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'time_entry_declared_by') then
    create type time_entry_declared_by as enum ('worker','company');
  end if;
  if not exists (select 1 from pg_type where typname = 'time_entry_validation_kind') then
    create type time_entry_validation_kind as enum ('explicit','tacit','amended');
  end if;
end $$;

-- ────────────────────────────────────────────
-- 2. Table mission_time_entries
-- ────────────────────────────────────────────
create table if not exists mission_time_entries (
  id                uuid                        primary key default uuid_generate_v4(),
  contract_id       uuid                        not null references contracts(id) on delete cascade,
  worker_id         uuid                        not null references workers(id)   on delete cascade,
  company_id        uuid                        not null references companies(id) on delete cascade,
  work_date         date                        not null,
  started_at        timestamptz                 not null,
  ended_at          timestamptz                 not null,
  break_minutes     integer                     not null default 0 check (break_minutes >= 0),
  worked_minutes    integer                     generated always as (
                                                   (extract(epoch from (ended_at - started_at))::int / 60) - break_minutes
                                                 ) stored,
  note              text,
  declared_by       time_entry_declared_by      not null default 'worker',
  status            time_entry_status           not null default 'draft',
  submitted_at      timestamptz,
  validated_at      timestamptz,
  validation_kind   time_entry_validation_kind,
  disputed_at       timestamptz,
  dispute_note      text,
  created_at        timestamptz                 not null default now(),
  updated_at        timestamptz                 not null default now(),
  constraint end_after_start check (ended_at > started_at),
  constraint worked_minutes_positive check (
    (extract(epoch from (ended_at - started_at))::int / 60) - break_minutes > 0
  )
);

comment on table mission_time_entries is
  'Décompte horodaté des heures réellement travaillées. Base légale de facturation et preuve L.3171-4.';
comment on column mission_time_entries.worked_minutes is
  'Calculé côté DB : (ended_at - started_at) - break_minutes. Stored pour indexation.';
comment on column mission_time_entries.declared_by is
  'Qui a saisi : worker (cas standard) ou company (exceptionnel).';
comment on column mission_time_entries.validation_kind is
  'explicit = company a cliqué validate ; tacit = 7j de silence ; amended = issue d''un amendement bilatéral.';

create index if not exists idx_time_entries_contract_status
  on mission_time_entries(contract_id, status);
create index if not exists idx_time_entries_worker_date
  on mission_time_entries(worker_id, work_date desc);
create index if not exists idx_time_entries_company_status
  on mission_time_entries(company_id, status);
create index if not exists idx_time_entries_submitted_at
  on mission_time_entries(submitted_at) where status = 'submitted';

-- ────────────────────────────────────────────
-- 3. RLS — party-based, cohérent avec contracts/invoices
-- ────────────────────────────────────────────
alter table mission_time_entries enable row level security;

drop policy if exists "time_entries · lecture parties" on mission_time_entries;
create policy "time_entries · lecture parties"
  on mission_time_entries for select
  using (
    worker_id  = auth.uid()
    or company_id = auth.uid()
    or is_admin()
  );

-- Insert : worker crée ses propres entries en draft ou submitted.
-- Company peut aussi insérer (cas où elle pré-remplit depuis les heures prévues).
drop policy if exists "time_entries · insert par les parties" on mission_time_entries;
create policy "time_entries · insert par les parties"
  on mission_time_entries for insert
  with check (
    (worker_id  = auth.uid() and declared_by = 'worker')
    or (company_id = auth.uid() and declared_by = 'company')
  );

-- Update côté worker : uniquement tant que l'entry est draft.
-- La transition submitted → validated/disputed se fait via RPC, pas par update direct.
drop policy if exists "time_entries · update worker draft" on mission_time_entries;
create policy "time_entries · update worker draft"
  on mission_time_entries for update
  using (worker_id = auth.uid() and status = 'draft')
  with check (worker_id = auth.uid() and status in ('draft','submitted'));

-- Delete : worker peut supprimer ses drafts uniquement.
drop policy if exists "time_entries · delete worker draft" on mission_time_entries;
create policy "time_entries · delete worker draft"
  on mission_time_entries for delete
  using (worker_id = auth.uid() and status = 'draft');

-- Column-level : pas de colonne sensible, on laisse le GRANT par défaut.

-- ────────────────────────────────────────────
-- 4. Trigger d'immutabilité
-- ────────────────────────────────────────────
-- Une fois une entry validée, seul le passage à 'billed' est autorisé, et
-- aucun champ de contenu (heures, dates, note) ne peut être modifié.
-- Une entry disputed ne peut revenir à submitted que via RPC admin.
create or replace function tempo_time_entries_immutability()
returns trigger
language plpgsql
as $$
begin
  -- Transitions de statut autorisées
  if OLD.status = 'validated' and NEW.status not in ('validated','billed') then
    raise exception 'time_entry_locked: une entry validée ne peut pas revenir en arrière'
      using errcode = 'check_violation';
  end if;
  if OLD.status = 'billed' and NEW.status <> 'billed' then
    raise exception 'time_entry_billed_frozen: une entry facturée est figée définitivement'
      using errcode = 'check_violation';
  end if;

  -- Champs immuables après validation
  if OLD.status in ('validated','billed') then
    if NEW.started_at    is distinct from OLD.started_at
       or NEW.ended_at      is distinct from OLD.ended_at
       or NEW.break_minutes is distinct from OLD.break_minutes
       or NEW.work_date     is distinct from OLD.work_date then
      raise exception 'time_entry_content_frozen: contenu figé après validation'
        using errcode = 'check_violation';
    end if;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

comment on function tempo_time_entries_immutability() is
  'Garde d''intégrité : une entry validée ou facturée ne peut plus être modifiée (preuve L.3171-4).';

drop trigger if exists trg_time_entries_immutability on mission_time_entries;
create trigger trg_time_entries_immutability
  before update on mission_time_entries
  for each row
  execute function tempo_time_entries_immutability();

-- Idem delete : une entry non-draft ne peut pas être supprimée.
create or replace function tempo_time_entries_no_delete_after_submit()
returns trigger
language plpgsql
as $$
begin
  if OLD.status <> 'draft' then
    raise exception 'time_entry_locked: seules les entries en brouillon peuvent être supprimées'
      using errcode = 'check_violation';
  end if;
  return OLD;
end;
$$;

drop trigger if exists trg_time_entries_no_delete_after_submit on mission_time_entries;
create trigger trg_time_entries_no_delete_after_submit
  before delete on mission_time_entries
  for each row
  execute function tempo_time_entries_no_delete_after_submit();

-- ────────────────────────────────────────────
-- 5. Gate invoice étendu : heures validées requises
-- ────────────────────────────────────────────
-- On étend le trigger existant de migration 016 : en plus de vérifier que
-- le contrat est signé par les deux parties, on vérifie qu'il n'existe
-- aucune entry du contrat qui soit encore en draft/submitted/disputed.
create or replace function tempo_check_invoice_contract_signed()
returns trigger
language plpgsql
as $$
declare
  v_contract_status contract_status;
  v_pending_count   integer;
begin
  if NEW.contract_id is null then
    raise exception 'invoice_requires_contract: une facture doit être liée à un contrat signé'
      using errcode = 'check_violation';
  end if;

  select status into v_contract_status
  from contracts
  where id = NEW.contract_id;

  if v_contract_status is null then
    raise exception 'invoice_contract_not_found: contrat % introuvable', NEW.contract_id
      using errcode = 'foreign_key_violation';
  end if;

  -- Contrat doit être bilatéralement signé. awaiting_hours_validation est
  -- un sous-état de active : les heures sont en attente de validation mais
  -- la signature est acquise — on le rejette ici pour forcer la validation
  -- avant toute facture.
  if v_contract_status not in ('active', 'completed') then
    raise exception 'invoice_contract_not_signed: contrat non signé par les deux parties (statut: %)', v_contract_status
      using errcode = 'check_violation';
  end if;

  -- Vérification nouvelle : aucune entry en attente de validation
  select count(*) into v_pending_count
  from mission_time_entries
  where contract_id = NEW.contract_id
    and status in ('draft','submitted','disputed');

  if v_pending_count > 0 then
    raise exception 'invoice_requires_validated_hours: % entries en attente de validation sur ce contrat', v_pending_count
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

comment on function tempo_check_invoice_contract_signed() is
  'Garde légale : refuse toute facture dont le contrat n''est pas bilatéralement signé OU dont les heures ne sont pas toutes validées.';

-- Le trigger trg_invoices_check_contract_signed (migration 016) référence déjà
-- cette fonction — pas besoin de le recréer, il reprendra automatiquement le
-- nouveau corps.

-- ────────────────────────────────────────────
-- 6. RPC — soumettre les heures pour validation
-- ────────────────────────────────────────────
create or replace function submit_time_entries(p_contract_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id  uuid;
  v_company_id uuid;
  v_count      integer;
begin
  -- Charger les ids du contrat
  select worker_id, company_id into v_worker_id, v_company_id
  from contracts
  where id = p_contract_id;

  if v_worker_id is null then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;

  -- Seul le worker du contrat peut soumettre (ou un admin)
  if auth.uid() <> v_worker_id and not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Bascule toutes les entries draft → submitted
  update mission_time_entries
     set status       = 'submitted',
         submitted_at = now(),
         updated_at   = now()
   where contract_id = p_contract_id
     and status      = 'draft';
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'no_draft_entries' using errcode = 'P0001';
  end if;

  -- Contrat passe en attente de validation des heures
  update contracts
     set status = 'awaiting_hours_validation'
   where id = p_contract_id
     and status in ('active','awaiting_hours_validation');

  -- Notification company
  insert into notifications (user_id, type, title, body, payload)
  values (
    v_company_id,
    'time_entries_submitted',
    'Heures à valider',
    'Un travailleur a soumis ses heures, à valider sous 7 jours.',
    jsonb_build_object('contract_id', p_contract_id, 'count', v_count)
  );

  return v_count;
end;
$$;

grant execute on function submit_time_entries(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 7. RPC — valider explicitement (company)
-- ────────────────────────────────────────────
create or replace function validate_time_entries(p_contract_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id  uuid;
  v_company_id uuid;
  v_count      integer;
begin
  select worker_id, company_id into v_worker_id, v_company_id
  from contracts
  where id = p_contract_id;

  if v_worker_id is null then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;

  -- Seule la company ou un admin peut valider
  if auth.uid() <> v_company_id and not is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update mission_time_entries
     set status          = 'validated',
         validated_at    = now(),
         validation_kind = 'explicit',
         updated_at      = now()
   where contract_id = p_contract_id
     and status      = 'submitted';
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'no_submitted_entries' using errcode = 'P0001';
  end if;

  -- Contrat revient en active
  update contracts
     set status = 'active'
   where id = p_contract_id
     and status = 'awaiting_hours_validation';

  insert into notifications (user_id, type, title, body, payload)
  values (
    v_worker_id,
    'time_entries_validated',
    'Heures validées',
    'Ton client a validé tes heures, la facturation peut être émise.',
    jsonb_build_object('contract_id', p_contract_id, 'count', v_count, 'kind', 'explicit')
  );

  return v_count;
end;
$$;

grant execute on function validate_time_entries(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 8. RPC — contester les heures
-- ────────────────────────────────────────────
create or replace function dispute_time_entries(p_contract_id uuid, p_note text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_id   uuid;
  v_company_id  uuid;
  v_caller_role text;
  v_count       integer;
begin
  if p_note is null or length(trim(p_note)) < 5 then
    raise exception 'dispute_note_required' using errcode = 'P0001';
  end if;

  select worker_id, company_id into v_worker_id, v_company_id
  from contracts
  where id = p_contract_id;

  if v_worker_id is null then
    raise exception 'contract_not_found' using errcode = 'P0002';
  end if;

  if auth.uid() = v_company_id then
    v_caller_role := 'company';
  elsif auth.uid() = v_worker_id then
    v_caller_role := 'worker';
  elsif is_admin() then
    v_caller_role := 'admin';
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update mission_time_entries
     set status       = 'disputed',
         disputed_at  = now(),
         dispute_note = p_note,
         updated_at   = now()
   where contract_id = p_contract_id
     and status in ('submitted','draft');
  get diagnostics v_count = row_count;

  if v_count = 0 then
    raise exception 'no_entries_to_dispute' using errcode = 'P0001';
  end if;

  update contracts
     set status = 'hours_disputed'
   where id = p_contract_id;

  -- Notif aux deux parties (la contestante incluse pour avoir la trace)
  insert into notifications (user_id, type, title, body, payload)
  values
    (v_worker_id,  'time_entries_disputed', 'Heures contestées',
     'Un litige est ouvert sur les heures déclarées.',
     jsonb_build_object('contract_id', p_contract_id, 'by', v_caller_role)),
    (v_company_id, 'time_entries_disputed', 'Heures contestées',
     'Un litige est ouvert sur les heures déclarées.',
     jsonb_build_object('contract_id', p_contract_id, 'by', v_caller_role));

  return v_count;
end;
$$;

grant execute on function dispute_time_entries(uuid, text) to authenticated;

-- ────────────────────────────────────────────
-- 9. RPC — validation tacite (appelée par pg_cron)
-- ────────────────────────────────────────────
-- Parcourt les entries 'submitted' depuis plus de 7 jours et les bascule en
-- 'validated' avec validation_kind = 'tacit'. Appelée quotidiennement par
-- pg_cron (cf. bas de migration).
create or replace function tacit_validate_time_entries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record    record;
  v_total     integer := 0;
  v_contracts uuid[]  := array[]::uuid[];
begin
  -- Pas d'auth check : la fonction est SECURITY DEFINER, appelée par cron.
  -- Les GRANT sont restreints à pg_cron owner et service_role.

  for v_record in
    select id, contract_id, worker_id
      from mission_time_entries
     where status       = 'submitted'
       and submitted_at < now() - interval '7 days'
     order by contract_id
  loop
    update mission_time_entries
       set status          = 'validated',
           validated_at    = now(),
           validation_kind = 'tacit',
           updated_at      = now()
     where id = v_record.id;
    v_total := v_total + 1;
    if not (v_record.contract_id = any(v_contracts)) then
      v_contracts := array_append(v_contracts, v_record.contract_id);
      -- Notification worker pour lui annoncer la tacite
      insert into notifications (user_id, type, title, body, payload)
      values (
        v_record.worker_id,
        'time_entries_validated',
        'Heures validées (tacite)',
        'Ton client n''a pas répondu sous 7 jours, tes heures sont validées automatiquement.',
        jsonb_build_object('contract_id', v_record.contract_id, 'kind', 'tacit')
      );
    end if;
  end loop;

  -- Bascule les contrats concernés en active
  if array_length(v_contracts, 1) > 0 then
    update contracts
       set status = 'active'
     where id = any(v_contracts)
       and status = 'awaiting_hours_validation';
  end if;

  return v_total;
end;
$$;

comment on function tacit_validate_time_entries() is
  'Job nocturne : valide tacitement toute entry submitted depuis plus de 7 jours. Appelée par pg_cron.';

revoke execute on function tacit_validate_time_entries() from public;
revoke execute on function tacit_validate_time_entries() from authenticated;

-- ────────────────────────────────────────────
-- 10. RPC lecture — résumé heures d'un contrat
-- ────────────────────────────────────────────
create or replace function get_contract_hours_summary(p_contract_id uuid)
returns table (
  declared_hours       numeric,
  validated_hours      numeric,
  pending_validation   integer,
  disputed             integer,
  amount_validated_ht  numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(case when e.status in ('submitted','validated','billed')
                      then e.worked_minutes / 60.0 end), 0)                        as declared_hours,
    coalesce(sum(case when e.status in ('validated','billed')
                      then e.worked_minutes / 60.0 end), 0)                        as validated_hours,
    coalesce(sum(case when e.status = 'submitted' then 1 else 0 end), 0)::int      as pending_validation,
    coalesce(sum(case when e.status = 'disputed'  then 1 else 0 end), 0)::int      as disputed,
    coalesce(sum(case when e.status in ('validated','billed')
                      then (e.worked_minutes / 60.0) * c.hourly_rate end), 0)      as amount_validated_ht
  from mission_time_entries e
  join contracts c on c.id = e.contract_id
  where e.contract_id = p_contract_id
    and (c.worker_id = auth.uid() or c.company_id = auth.uid() or is_admin())
$$;

grant execute on function get_contract_hours_summary(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 11. pg_cron — validation tacite quotidienne à 03h00 UTC
-- ────────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('tempo_tacit_validate_time_entries')
      where exists (select 1 from cron.job where jobname = 'tempo_tacit_validate_time_entries');
    perform cron.schedule(
      'tempo_tacit_validate_time_entries',
      '0 3 * * *',
      $cron$ select tacit_validate_time_entries(); $cron$
    );
  end if;
exception when others then
  -- pg_cron absent en dev local : on ignore silencieusement, le trigger sera
  -- posé en prod où l'extension est activée.
  null;
end $$;
