-- ============================================================================
-- Migration 032 — Types notifications fantômes + payload case_id fraud_case
-- ============================================================================
-- Partie A : Ajouter case_id dans le payload des notifications fraud_case_*
--            (open_fraud_case, admin_update_fraud_case, admin_escalate_to_legal)
--            → permet la navigation mobile vers /(role)/disputes/[id]
--
-- Partie B : Implémenter les 4 types notif_type définis dans 001_types.sql
--            mais jamais déclenchés :
--              1. application_received  → company quand un worker postule
--              2. mission_matched       → worker quand la mission lui est attribuée
--              3. contract_generated    → worker quand la company crée le contrat
--              4. mission_reminder      → worker + company la veille de la mission
--
-- Types intentionnellement laissés sans trigger (redondants avec d'autres) :
--   payment_received → doublonne invoice_paid    (031)
--   payment_sent     → doublonne invoice_created (029)
-- ============================================================================


-- ────────────────────────────────────────────
-- PARTIE A — Patch fraud_case RPCs : payload case_id
-- ────────────────────────────────────────────

-- A1. open_fraud_case — other_party notification + payload
-- (corps complet, seule la ligne INSERT notifications est modifiée)
create or replace function open_fraud_case(
  p_contract_id  uuid,
  p_type         fraud_case_type,
  p_description  text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract      contracts;
  v_mission       missions;
  v_caller        uuid := auth.uid();
  v_other_party   uuid;
  v_case_id       uuid;
  v_priority      fraud_case_priority;
  v_snap_hours    jsonb;
  v_snap_invoices jsonb;
begin
  if length(coalesce(p_description, '')) < 20 then
    raise exception 'fraud_case_description_too_short: la description doit faire au moins 20 caractères'
      using errcode = 'check_violation';
  end if;

  select * into v_contract from contracts where id = p_contract_id;
  if v_contract is null then
    raise exception 'contract_not_found: contrat introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  if v_caller = v_contract.worker_id then
    v_other_party := v_contract.company_id;
  elsif v_caller = v_contract.company_id then
    v_other_party := v_contract.worker_id;
  else
    raise exception 'forbidden: seules les parties du contrat peuvent ouvrir un litige'
      using errcode = 'insufficient_privilege';
  end if;

  if exists (
    select 1 from fraud_cases
    where contract_id = p_contract_id
      and status in ('open', 'investigating')
  ) then
    raise exception 'fraud_case_already_open: un litige est déjà ouvert pour ce contrat'
      using errcode = 'check_violation';
  end if;

  select * into v_mission from missions where id = v_contract.mission_id;

  v_priority := case p_type
    when 'non_payment'        then 'critical'::fraud_case_priority
    when 'hours_dispute'      then 'high'::fraud_case_priority
    when 'absence'            then 'high'::fraud_case_priority
    when 'working_conditions' then 'high'::fraud_case_priority
    else 'medium'::fraud_case_priority
  end;

  -- Snapshot heures
  select jsonb_build_object(
    'total_entries',         count(*),
    'draft',                 count(*) filter (where status = 'draft'),
    'submitted',             count(*) filter (where status = 'submitted'),
    'validated',             count(*) filter (where status = 'validated'),
    'disputed',              count(*) filter (where status = 'disputed'),
    'billed',                count(*) filter (where status = 'billed'),
    'total_worked_minutes',  coalesce(sum(worked_minutes), 0),
    'validated_minutes',     coalesce(sum(worked_minutes) filter (where status in ('validated', 'billed')), 0)
  ) into v_snap_hours
  from mission_time_entries
  where contract_id = p_contract_id;

  -- Snapshot factures
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',            i.id,
    'invoice_number',i.invoice_number,
    'amount_ht',     i.amount_ht,
    'amount_ttc',    i.amount_ttc,
    'commission',    i.commission,
    'worker_payout', i.worker_payout,
    'status',        i.status,
    'paid_at',       i.paid_at,
    'created_at',    i.created_at
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
      'id',               v_contract.id,
      'hourly_rate',      v_contract.hourly_rate,
      'total_hours',      v_contract.total_hours,
      'total_amount_ht',  v_contract.total_amount_ht,
      'commission_rate',  v_contract.commission_rate,
      'commission_amount',v_contract.commission_amount,
      'status',           v_contract.status,
      'signed_worker_at', v_contract.signed_worker_at,
      'signed_company_at',v_contract.signed_company_at,
      'mission_title',    v_mission.title,
      'mission_sector',   v_mission.sector,
      'mission_city',     v_mission.city
    ),
    v_snap_hours,
    v_snap_invoices
  )
  returning id into v_case_id;

  -- Notifier l'autre partie — PATCH 032 : ajout payload case_id
  insert into notifications (user_id, type, title, body, payload)
  values (
    v_other_party,
    'fraud_case_opened',
    'Litige ouvert',
    'Un litige a été ouvert sur votre contrat. Consultez le dossier et fournissez vos preuves.',
    jsonb_build_object('case_id', v_case_id)
  );

  -- Notifier l'admin (sans payload : ils naviguent vers /(admin)/antifraud)
  insert into notifications (user_id, type, title, body)
  select p.id, 'fraud_case_opened', 'Nouveau litige [' || p_type || ']',
    'Un litige de type "' || p_type || '" a été ouvert. Priorité : ' || v_priority || '.'
  from profiles p
  where p.role = 'admin';

  return v_case_id;
end;
$$;

comment on function open_fraud_case is
  'Ouvre un litige structuré avec compilation automatique des preuves. '
  'Patch 032 : case_id ajouté dans le payload de la notif other_party.';


-- A2. admin_update_fraud_case — payload case_id sur les notifs worker/company
create or replace function admin_update_fraud_case(
  p_case_id     uuid,
  p_status      fraud_case_status default null,
  p_admin_notes text              default null,
  p_decision    text              default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case         fraud_cases;
  v_caller       uuid := auth.uid();
  v_is_resolved  boolean;
  v_other_open   integer;
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_case from fraud_cases where id = p_case_id;
  if v_case is null then
    raise exception 'fraud_case_not_found: dossier de litige introuvable'
      using errcode = 'foreign_key_violation';
  end if;

  if v_case.status in ('resolved_worker', 'resolved_company', 'resolved_mutual', 'dismissed') then
    raise exception 'fraud_case_closed: ce litige est déjà résolu'
      using errcode = 'check_violation';
  end if;

  v_is_resolved := p_status in ('resolved_worker', 'resolved_company', 'resolved_mutual', 'dismissed');

  update fraud_cases set
    status          = coalesce(p_status, status),
    admin_notes     = coalesce(p_admin_notes, admin_notes),
    decision        = case when v_is_resolved then coalesce(p_decision, decision) else decision end,
    decided_by      = case when v_is_resolved then v_caller else decided_by end,
    decided_at      = case when v_is_resolved then now() else decided_at end,
    closed_at       = case when v_is_resolved then now() else closed_at end,
    retention_until = case when v_is_resolved then now() + interval '5 years' else retention_until end
  where id = p_case_id;

  if v_is_resolved and v_case.suspension_applied and v_case.suspended_profile_id is not null then
    select count(*) into v_other_open
    from fraud_cases
    where company_id = v_case.company_id
      and id         <> p_case_id
      and type       = 'non_payment'
      and status     in ('open', 'investigating');

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

  -- Notifier les deux parties — PATCH 032 : ajout payload case_id
  insert into notifications (user_id, type, title, body, payload)
  values
    (v_case.worker_id,  'fraud_case_updated', 'Litige mis à jour',
     'Le statut de votre litige a été mis à jour par l''administrateur.',
     jsonb_build_object('case_id', p_case_id)),
    (v_case.company_id, 'fraud_case_updated', 'Litige mis à jour',
     'Le statut de votre litige a été mis à jour par l''administrateur.',
     jsonb_build_object('case_id', p_case_id));
end;
$$;

comment on function admin_update_fraud_case is
  'Admin : met à jour un dossier litige. Gère la désuspension automatique. '
  'Patch 032 : case_id dans le payload des notifs worker/company.';


-- A3. admin_escalate_to_legal — payload case_id
create or replace function admin_escalate_to_legal(p_case_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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
    status      = 'escalated_legal',
    admin_notes = coalesce(admin_notes, '') || E'\n[LEGAL] Escaladé en procédure juridique le ' || to_char(now(), 'DD/MM/YYYY HH24:MI')
  where id = p_case_id;

  -- Notifier les deux parties — PATCH 032 : ajout payload case_id
  insert into notifications (user_id, type, title, body, payload)
  values
    (v_case.worker_id,  'fraud_case_escalated', 'Litige escaladé',
     'Votre litige a été transmis au service juridique de TEMPO.',
     jsonb_build_object('case_id', p_case_id)),
    (v_case.company_id, 'fraud_case_escalated', 'Litige escaladé',
     'Ce litige a été transmis au service juridique de TEMPO.',
     jsonb_build_object('case_id', p_case_id));
end;
$$;

comment on function admin_escalate_to_legal is
  'Admin : escalade un litige vers la procédure juridique. '
  'Patch 032 : case_id dans le payload des notifs.';


-- ────────────────────────────────────────────
-- PARTIE B — Types fantômes : implémentation
-- ────────────────────────────────────────────

-- B1. application_received → company notifiée quand un worker postule
-- ─────────────────────────────────────────────────────────────────
create or replace function notify_company_on_application_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker_name   text;
  v_mission_title text;
  v_company_id    uuid;
begin
  -- Seulement sur INSERT direct (pas les transitions de statut)
  select
    w.first_name || ' ' || w.last_name,
    m.title,
    m.company_id
  into v_worker_name, v_mission_title, v_company_id
  from workers  w
  join missions m on m.id = NEW.mission_id
  where w.id = NEW.worker_id;

  if v_company_id is null then
    return NEW;
  end if;

  insert into notifications (user_id, type, title, body, payload)
  values (
    v_company_id,
    'application_received',
    'Nouvelle candidature',
    coalesce(v_worker_name, 'Un travailleur') || ' a postulé à « ' || coalesce(v_mission_title, 'votre mission') || ' ».',
    jsonb_build_object(
      'application_id', NEW.id,
      'mission_id',     NEW.mission_id,
      'worker_id',      NEW.worker_id
    )
  );

  return NEW;
end;
$$;

comment on function notify_company_on_application_received() is
  'Trigger : notifie la company quand un worker soumet une candidature (application_received).';

drop trigger if exists trg_application_received_notify on applications;
create trigger trg_application_received_notify
  after insert on applications
  for each row
  execute function notify_company_on_application_received();


-- B2. mission_matched → worker notifié quand la mission lui est attribuée
-- ─────────────────────────────────────────────────────────────────
create or replace function notify_worker_on_mission_matched()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Seulement lors de l'attribution initiale du worker (NULL → valeur)
  if NEW.assigned_worker_id is null then
    return NEW;
  end if;
  if OLD.assigned_worker_id is not null then
    return NEW; -- déjà attribué, pas de changement
  end if;

  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.assigned_worker_id,
    'mission_matched',
    'Mission confirmée',
    'Vous avez été sélectionné pour la mission « ' || coalesce(NEW.title, 'sans titre') || ' ». Consultez les détails.',
    jsonb_build_object(
      'mission_id', NEW.id,
      'partner_id', NEW.company_id
    )
  );

  return NEW;
end;
$$;

comment on function notify_worker_on_mission_matched() is
  'Trigger : notifie le worker quand il est attribué à une mission (mission_matched).';

drop trigger if exists trg_mission_matched_notify on missions;
create trigger trg_mission_matched_notify
  after update of assigned_worker_id on missions
  for each row
  execute function notify_worker_on_mission_matched();


-- B3. contract_generated → worker notifié quand la company crée le contrat
-- ─────────────────────────────────────────────────────────────────
create or replace function notify_worker_on_contract_generated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_title text;
  v_company_name  text;
begin
  select m.title, coalesce(c.name, 'L''entreprise')
  into v_mission_title, v_company_name
  from missions  m
  join companies c on c.id = m.company_id
  where m.id = NEW.mission_id;

  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.worker_id,
    'contract_generated',
    'Contrat à signer',
    v_company_name || ' vous a envoyé un contrat à signer pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
    jsonb_build_object(
      'contract_id', NEW.id,
      'mission_id',  NEW.mission_id,
      'partner_id',  NEW.company_id
    )
  );

  return NEW;
end;
$$;

comment on function notify_worker_on_contract_generated() is
  'Trigger : notifie le worker quand la company génère un contrat (contract_generated).';

drop trigger if exists trg_contract_generated_notify on contracts;
create trigger trg_contract_generated_notify
  after insert on contracts
  for each row
  execute function notify_worker_on_contract_generated();


-- B4. mission_reminder → worker + company la veille de la mission (cron J-1)
-- ─────────────────────────────────────────────────────────────────
-- Envoie un rappel pour toutes les missions qui commencent le lendemain.
-- Anti-spam : pas de doublon si déjà envoyé dans les 20 dernières heures.
-- Schedule : quotidien à 18h00 UTC (veille en soirée, heure française ~20h).
create or replace function notify_mission_reminder()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission record;
  v_count   integer := 0;
  v_tomorrow_start timestamptz := date_trunc('day', now() + interval '1 day');
  v_tomorrow_end   timestamptz := v_tomorrow_start + interval '1 day';
begin
  for v_mission in
    select
      m.id,
      m.title,
      m.assigned_worker_id,
      m.company_id,
      m.start_date
    from missions m
    where m.status          in ('matched', 'active')
      and m.assigned_worker_id is not null
      and m.start_date      >= v_tomorrow_start
      and m.start_date       < v_tomorrow_end
      -- Anti-spam : pas de doublon dans les 20 dernières heures
      and not exists (
        select 1 from notifications n
        where (n.payload->>'mission_id') = m.id::text
          and n.type       = 'mission_reminder'
          and n.created_at >= now() - interval '20 hours'
      )
  loop
    -- Rappel au worker
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_mission.assigned_worker_id,
      'mission_reminder',
      'Rappel : mission demain',
      'Votre mission « ' || coalesce(v_mission.title, 'sans titre') || ' » commence demain. Pensez à vous préparer.',
      jsonb_build_object(
        'mission_id', v_mission.id,
        'start_date', v_mission.start_date
      )
    );

    -- Rappel à la company
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_mission.company_id,
      'mission_reminder',
      'Rappel : mission demain',
      'La mission « ' || coalesce(v_mission.title, 'sans titre') || ' » commence demain.',
      jsonb_build_object(
        'mission_id', v_mission.id,
        'start_date', v_mission.start_date
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function notify_mission_reminder() is
  'Cron job : envoie un rappel J-1 au worker assigné et à la company. '
  'Anti-spam : une seule fois par mission dans les 20h.';

revoke execute on function notify_mission_reminder() from public;
revoke execute on function notify_mission_reminder() from authenticated;
grant execute on function notify_mission_reminder() to service_role;

-- pg_cron : tous les jours à 18h00 UTC
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('tempo_mission_reminder')
      where exists (select 1 from cron.job where jobname = 'tempo_mission_reminder');
    perform cron.schedule(
      'tempo_mission_reminder',
      '0 18 * * *',
      $cron$ select notify_mission_reminder(); $cron$
    );
  end if;
exception when others then null;
end $$;
