-- ============================================================================
-- Migration 030 — Notifications manquantes : priorité moyenne (4 cas)
-- ============================================================================
-- 1. Trigger : candidature retirée (withdrawn) → company
-- 2. Patch RPC : cancel_contract_amendment → notifie l'autre partie
-- 3. Cron job : litige heures non résolu depuis 5j → admin + parties
-- 4. Trigger : requalification 'warning' → company (était seulement 'alert')
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Trigger : candidature retirée → company
-- ────────────────────────────────────────────
-- Le trigger 028 couvre accepted/rejected → worker.
-- Ici on couvre withdrawn → company.
-- L'application_status enum doit inclure 'withdrawn' (vérifier 001_types.sql).
create or replace function notify_company_on_application_withdrawn()
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
  if NEW.status <> 'withdrawn' then
    return NEW;
  end if;
  if OLD.status = NEW.status then
    return NEW;
  end if;

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
    'application_withdrawn',
    'Candidature retirée',
    coalesce(v_worker_name, 'Un travailleur') || ' a retiré sa candidature pour « ' || coalesce(v_mission_title, 'votre mission') || ' ».',
    jsonb_build_object(
      'application_id', NEW.id,
      'mission_id',     NEW.mission_id,
      'worker_id',      NEW.worker_id
    )
  );

  return NEW;
end;
$$;

comment on function notify_company_on_application_withdrawn() is
  'Trigger : notifie la company quand un worker retire sa candidature.';

drop trigger if exists trg_application_withdrawn_notify on applications;
create trigger trg_application_withdrawn_notify
  after update of status on applications
  for each row
  execute function notify_company_on_application_withdrawn();

-- ────────────────────────────────────────────
-- 2. Patch RPC : cancel_contract_amendment + notification
-- ────────────────────────────────────────────
-- Migration 021 : cancel_contract_amendment n'envoyait pas de notification.
-- Correction : notifier l'autre partie (le non-proposeur) de l'annulation.
create or replace function cancel_contract_amendment(p_amendment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amendment   contract_amendments;
  v_contract    contracts;
  v_caller      uuid := auth.uid();
  v_other_party uuid;
begin
  select * into v_amendment from contract_amendments where id = p_amendment_id;
  if v_amendment is null then
    raise exception 'amendment_not_found: avenant introuvable'
      using errcode = 'foreign_key_violation';
  end if;
  if v_amendment.status <> 'pending' then
    raise exception 'amendment_not_pending: cet avenant n''est plus en attente'
      using errcode = 'check_violation';
  end if;

  -- Seul le proposeur peut annuler
  if v_caller <> v_amendment.proposer_id then
    raise exception 'forbidden: seul l''auteur de l''avenant peut l''annuler'
      using errcode = 'insufficient_privilege';
  end if;

  update contract_amendments set status = 'cancelled'
  where id = p_amendment_id;

  -- Déterminer l'autre partie et la notifier
  select * into v_contract from contracts where id = v_amendment.contract_id;

  v_other_party := case
    when v_caller = v_contract.worker_id  then v_contract.company_id
    when v_caller = v_contract.company_id then v_contract.worker_id
    else null
  end;

  if v_other_party is not null then
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_other_party,
      'amendment_cancelled',
      'Avenant annulé',
      'L''autre partie a annulé sa proposition de modification du contrat.',
      jsonb_build_object(
        'amendment_id', p_amendment_id,
        'contract_id',  v_amendment.contract_id,
        'partner_id',   v_caller
      )
    );
  end if;
end;
$$;

comment on function cancel_contract_amendment is
  'Annule un avenant en attente. Seul le proposeur peut annuler. '
  'Notifie désormais l''autre partie (correction migration 030).';

-- ────────────────────────────────────────────
-- 3. Cron : escalade des litiges heures non résolus après 5 jours
-- ────────────────────────────────────────────
-- Notifie worker, company ET tous les admins quand un litige
-- (mission_time_entries.status = 'disputed') dure plus de 5 jours.
-- Anti-spam : une seule escalade par contrat par 7 jours.
-- Schedule : lun-ven à 10h00 UTC (heures ouvrées).
create or replace function escalate_unresolved_disputes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_admin  record;
  v_count  integer := 0;
begin
  for v_record in
    select
      e.contract_id,
      c.worker_id,
      c.company_id,
      min(e.disputed_at)  as first_disputed_at,
      count(*)::int       as dispute_count
    from mission_time_entries e
    join contracts c on c.id = e.contract_id
    where e.status       = 'disputed'
      and e.disputed_at  < now() - interval '5 days'
      -- Anti-spam : pas de doublon dans les 7 derniers jours
      and not exists (
        select 1 from notifications n
        where (n.payload->>'contract_id') = e.contract_id::text
          and n.type       = 'dispute_escalated'
          and n.created_at >= now() - interval '7 days'
      )
    group by e.contract_id, c.worker_id, c.company_id
  loop
    -- Notifier le worker
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_record.worker_id,
      'dispute_escalated',
      'Litige heures escaladé',
      'Votre litige sur les heures n''est pas résolu depuis 5 jours. L''équipe Tempo intervient.',
      jsonb_build_object(
        'contract_id',       v_record.contract_id,
        'dispute_count',     v_record.dispute_count,
        'first_disputed_at', v_record.first_disputed_at
      )
    );

    -- Notifier la company
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_record.company_id,
      'dispute_escalated',
      'Litige heures escaladé',
      'Le litige sur les heures déclarées n''est pas résolu depuis 5 jours. L''équipe Tempo intervient.',
      jsonb_build_object(
        'contract_id',       v_record.contract_id,
        'dispute_count',     v_record.dispute_count,
        'first_disputed_at', v_record.first_disputed_at
      )
    );

    -- Notifier tous les admins
    for v_admin in
      select id from profiles where role = 'admin'
    loop
      insert into notifications (user_id, type, title, body, payload)
      values (
        v_admin.id,
        'dispute_escalated',
        '[ADMIN] Litige heures — intervention requise',
        v_record.dispute_count || ' entrées en litige depuis > 5 jours. Contrat ' || v_record.contract_id || '.',
        jsonb_build_object(
          'contract_id',       v_record.contract_id,
          'worker_id',         v_record.worker_id,
          'company_id',        v_record.company_id,
          'dispute_count',     v_record.dispute_count,
          'first_disputed_at', v_record.first_disputed_at
        )
      );
    end loop;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function escalate_unresolved_disputes() is
  'Cron job : escalade les litiges heures non résolus depuis > 5 jours. '
  'Notifie worker, company et tous les admins. Anti-spam : une escalade par contrat par 7 jours.';

revoke execute on function escalate_unresolved_disputes() from public;
revoke execute on function escalate_unresolved_disputes() from authenticated;
grant execute on function escalate_unresolved_disputes() to service_role;

-- pg_cron : lun-ven à 10h00 UTC
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('tempo_escalate_disputes')
      where exists (select 1 from cron.job where jobname = 'tempo_escalate_disputes');
    perform cron.schedule(
      'tempo_escalate_disputes',
      '0 10 * * 1-5',
      $cron$ select escalate_unresolved_disputes(); $cron$
    );
  end if;
exception when others then null;
end $$;

-- ────────────────────────────────────────────
-- 4. Trigger : requalification 'warning' → notifier la company
-- ────────────────────────────────────────────
-- Migration 019 : recompute_requalification_risk() notifiait la company
-- seulement pour 'alert'. La company n'était pas avertie du niveau
-- intermédiaire 'warning' qui arrive pourtant en premier.
-- Solution : trigger AFTER INSERT OR UPDATE sur worker_company_risk.
-- 'alert' est déjà géré dans recompute_requalification_risk() → ce trigger
-- ne traite que 'warning' pour éviter le doublon.
create or replace function notify_company_on_requalification_warning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Uniquement lors de l'escalade ok → warning
  if NEW.level <> 'warning' then
    return NEW;
  end if;
  if OLD.level = 'warning' then
    return NEW; -- pas de changement
  end if;
  if OLD.level <> 'ok' then
    return NEW; -- 'alert' → 'warning' = descente, pas d'escalade
  end if;

  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.company_id,
    'requalification_level_changed',
    'Attention au risque de requalification',
    'La collaboration avec ce travailleur atteint un niveau intermédiaire de risque. Diversifiez vos prestataires.',
    jsonb_build_object(
      'worker_id', NEW.worker_id,
      'level',     'warning'
    )
  );

  return NEW;
end;
$$;

comment on function notify_company_on_requalification_warning() is
  'Trigger : notifie la company lors du passage ok → warning du risque de requalification. '
  'L''escalade ok/warning → alert est déjà couverte par recompute_requalification_risk().';

drop trigger if exists trg_requalification_company_warning_notify on worker_company_risk;
create trigger trg_requalification_company_warning_notify
  after insert or update of level on worker_company_risk
  for each row
  execute function notify_company_on_requalification_warning();
