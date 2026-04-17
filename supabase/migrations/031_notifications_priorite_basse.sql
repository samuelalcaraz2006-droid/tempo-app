-- ============================================================================
-- Migration 031 — Notifications manquantes : priorité basse (3 cas)
-- ============================================================================
-- 1. Trigger : mission complétée → worker + company
-- 2. Trigger : facture payée → worker
-- 3. Cron job : factures en retard → company (overdue)
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Trigger : mission complétée → worker assigné + company
-- ────────────────────────────────────────────
-- Différent de notify_applicants_on_mission_closed (029) qui couvre les
-- candidats pending lors d'une annulation. Ici on notifie les PARTICIPANTS
-- (worker assigné + company) quand la mission passe en 'completed'.
create or replace function notify_on_mission_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.status <> 'completed' then
    return NEW;
  end if;
  if OLD.status = 'completed' then
    return NEW;
  end if;

  -- Notifier le worker assigné si disponible
  if NEW.assigned_worker_id is not null then
    insert into notifications (user_id, type, title, body, payload)
    values (
      NEW.assigned_worker_id,
      'mission_completed',
      'Mission terminée',
      '« ' || coalesce(NEW.title, 'La mission') || ' » est clôturée. Vous pouvez laisser une évaluation.',
      jsonb_build_object(
        'mission_id', NEW.id,
        'partner_id', NEW.company_id
      )
    );
  end if;

  -- Notifier la company
  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.company_id,
    'mission_completed',
    'Mission clôturée',
    '« ' || coalesce(NEW.title, 'La mission') || ' » est terminée. Pensez à évaluer le travailleur.',
    jsonb_build_object(
      'mission_id', NEW.id,
      'partner_id', NEW.assigned_worker_id
    )
  );

  return NEW;
end;
$$;

comment on function notify_on_mission_completed() is
  'Trigger : notifie le worker assigné et la company quand une mission passe en completed.';

drop trigger if exists trg_mission_completed_notify on missions;
create trigger trg_mission_completed_notify
  after update of status on missions
  for each row
  execute function notify_on_mission_completed();

-- ────────────────────────────────────────────
-- 2. Trigger : facture payée → worker
-- ────────────────────────────────────────────
create or replace function notify_worker_on_invoice_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_title text;
begin
  if NEW.status <> 'paid' then
    return NEW;
  end if;
  if OLD.status = 'paid' then
    return NEW;
  end if;

  select m.title into v_mission_title
  from contracts c
  join missions  m on m.id = c.mission_id
  where c.id = NEW.contract_id;

  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.worker_id,
    'invoice_paid',
    'Paiement reçu',
    'Votre paiement de ' || NEW.worker_payout || ' € a été effectué pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
    jsonb_build_object(
      'invoice_id',    NEW.id,
      'contract_id',   NEW.contract_id,
      'worker_payout', NEW.worker_payout
    )
  );

  return NEW;
end;
$$;

comment on function notify_worker_on_invoice_paid() is
  'Trigger : notifie le worker quand sa facture passe en ''paid''.';

drop trigger if exists trg_invoice_paid_notify on invoices;
create trigger trg_invoice_paid_notify
  after update of status on invoices
  for each row
  execute function notify_worker_on_invoice_paid();

-- ────────────────────────────────────────────
-- 3. Cron job : factures en retard → company
-- ────────────────────────────────────────────
-- Détecte les factures 'sent' dont la due_date est dépassée,
-- les bascule en 'overdue' et notifie la company.
-- Anti-spam : une seule notif par facture par 48h.
-- Schedule : quotidien à 08h00 UTC.
create or replace function notify_companies_on_overdue_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_count  integer := 0;
begin
  for v_record in
    select
      i.id              as invoice_id,
      i.company_id,
      i.contract_id,
      i.amount_ttc,
      i.due_date,
      i.invoice_number
    from invoices i
    where i.status   = 'sent'
      and i.due_date is not null
      and i.due_date <  now()
      -- Anti-spam 48h par facture
      and not exists (
        select 1 from notifications n
        where n.user_id                   = i.company_id
          and n.type                      = 'invoice_overdue'
          and (n.payload->>'invoice_id')  = i.id::text
          and n.created_at               >= now() - interval '48 hours'
      )
  loop
    -- Basculer la facture en overdue
    update invoices
       set status = 'overdue'
     where id     = v_record.invoice_id
       and status = 'sent';

    -- Notifier la company
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_record.company_id,
      'invoice_overdue',
      'Facture en retard de paiement',
      'La facture ' || coalesce(v_record.invoice_number, v_record.invoice_id::text) || ' de ' || v_record.amount_ttc || ' € TTC est en retard.',
      jsonb_build_object(
        'invoice_id',     v_record.invoice_id,
        'contract_id',    v_record.contract_id,
        'invoice_number', v_record.invoice_number,
        'amount_ttc',     v_record.amount_ttc,
        'due_date',       v_record.due_date
      )
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function notify_companies_on_overdue_invoices() is
  'Cron job : bascule les factures ''sent'' expirées en ''overdue'' et notifie la company. '
  'Anti-spam : une notif par facture par 48h.';

revoke execute on function notify_companies_on_overdue_invoices() from public;
revoke execute on function notify_companies_on_overdue_invoices() from authenticated;
grant execute on function notify_companies_on_overdue_invoices() to service_role;

-- pg_cron : quotidien à 08h00 UTC
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('tempo_overdue_invoices')
      where exists (select 1 from cron.job where jobname = 'tempo_overdue_invoices');
    perform cron.schedule(
      'tempo_overdue_invoices',
      '0 8 * * *',
      $cron$ select notify_companies_on_overdue_invoices(); $cron$
    );
  end if;
exception when others then null;
end $$;
