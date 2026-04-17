-- ============================================================================
-- Migration 029 — Notifications manquantes : haute priorité (6 triggers)
-- ============================================================================
-- Audit 028 : 47% des interactions utilisateurs n'avaient aucune notification.
-- Cette migration couvre les 6 cas haute priorité.
--
-- 1. expo_push_token sur profiles (prérequis push background)
-- 2. Enum values manquants
-- 3. Trigger : nouveau message → destinataire (anti-spam 60s)
-- 4. Trigger : contrat signé par une partie → l'autre
-- 5. Trigger : facture créée → worker + company
-- 6. Trigger : mission publiée → workers du même secteur (limite 100)
-- 7. Trigger : mission fermée/annulée → candidats pending
-- 8. Trigger : évaluation reçue → partie notée
-- ============================================================================

-- ────────────────────────────────────────────
-- 0. Prérequis : colonne expo_push_token sur profiles
-- ────────────────────────────────────────────
-- savePushToken() dans le client mobile fait un UPDATE sur cette colonne.
-- Elle n'était pas déclarée dans les migrations SQL → persistance non garantie.
alter table profiles add column if not exists expo_push_token text;
comment on column profiles.expo_push_token is
  'Token Expo Push Notifications enregistré par le client mobile. '
  'Null si l''utilisateur n''a pas accordé les permissions ou n''est pas connecté.';

-- ────────────────────────────────────────────
-- 1. Nouveaux types notif_type
-- ────────────────────────────────────────────
-- contract_signed, new_mission, rating_received, new_message : déjà dans 001_types.sql
alter type notif_type add value if not exists 'application_withdrawn';
alter type notif_type add value if not exists 'invoice_created';
alter type notif_type add value if not exists 'mission_closed';
alter type notif_type add value if not exists 'mission_completed';
alter type notif_type add value if not exists 'invoice_paid';
alter type notif_type add value if not exists 'invoice_overdue';
alter type notif_type add value if not exists 'amendment_cancelled';
alter type notif_type add value if not exists 'dispute_escalated';

-- ────────────────────────────────────────────
-- 2. Trigger : nouveau message → destinataire
-- ────────────────────────────────────────────
-- Problème : le realtime channel messages ne fonctionne que si l'app est
-- au premier plan. En arrière-plan, aucun push n'était envoyé.
-- Anti-spam : pas de doublon si une notif non lue du même sender
-- existe déjà depuis moins de 60 secondes.
create or replace function notify_receiver_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
begin
  -- Anti-spam : une seule notif par sender par fenêtre de 60s
  if exists (
    select 1 from notifications
    where user_id                   = NEW.receiver_id
      and type                      = 'new_message'
      and read_at                   is null
      and (payload->>'partner_id')  = NEW.sender_id::text
      and created_at                >= now() - interval '60 seconds'
  ) then
    return NEW;
  end if;

  -- Nom du sender (worker ou company)
  select coalesce(
    (select w.first_name || ' ' || w.last_name from workers   w where w.id = NEW.sender_id),
    (select c.name                               from companies c where c.id = NEW.sender_id),
    'Un utilisateur'
  ) into v_sender_name;

  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.receiver_id,
    'new_message',
    'Nouveau message de ' || v_sender_name,
    v_sender_name || ' vous a envoyé un message.',
    jsonb_build_object(
      'partner_id', NEW.sender_id,
      'mission_id', NEW.mission_id,
      'message_id', NEW.id
    )
  );

  return NEW;
end;
$$;

comment on function notify_receiver_on_new_message() is
  'Trigger : insère une notification DB à chaque message pour garantir le push background. '
  'Anti-spam 60s : un seul insert par sender par minute.';

drop trigger if exists trg_messages_notify_receiver on messages;
create trigger trg_messages_notify_receiver
  after insert on messages
  for each row
  execute function notify_receiver_on_new_message();

-- ────────────────────────────────────────────
-- 3. Trigger : contrat signé par une partie → l'autre
-- ────────────────────────────────────────────
-- Transitions couvertes :
--   sent → signed_worker : worker a signé, company doit signer
--   signed_worker → signed_company : company a signé, contrat actif
create or replace function notify_on_contract_signature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_title text;
begin
  if OLD.status = NEW.status then
    return NEW;
  end if;

  select title into v_mission_title
  from missions where id = NEW.mission_id;

  -- Worker vient de signer → notifier la company
  if NEW.status = 'signed_worker' and OLD.status in ('draft','sent') then
    insert into notifications (user_id, type, title, body, payload)
    values (
      NEW.company_id,
      'contract_signed',
      'Contrat signé par le travailleur',
      'Le travailleur a signé le contrat pour « ' || coalesce(v_mission_title, 'la mission') || ' ». À votre tour de signer.',
      jsonb_build_object(
        'contract_id', NEW.id,
        'mission_id',  NEW.mission_id,
        'signed_by',   'worker',
        'partner_id',  NEW.worker_id
      )
    );

  -- Company vient de signer → notifier le worker (contrat bilatéralement signé)
  elsif NEW.status in ('signed_company', 'active') and OLD.status = 'signed_worker' then
    insert into notifications (user_id, type, title, body, payload)
    values (
      NEW.worker_id,
      'contract_signed',
      'Contrat signé — mission confirmée',
      'L''entreprise a contresigné le contrat pour « ' || coalesce(v_mission_title, 'la mission') || ' ». La mission est confirmée.',
      jsonb_build_object(
        'contract_id', NEW.id,
        'mission_id',  NEW.mission_id,
        'signed_by',   'company',
        'partner_id',  NEW.company_id
      )
    );
  end if;

  return NEW;
end;
$$;

comment on function notify_on_contract_signature() is
  'Trigger : notifie l''autre partie à chaque étape de signature du contrat.';

drop trigger if exists trg_contracts_signature_notify on contracts;
create trigger trg_contracts_signature_notify
  after update of status on contracts
  for each row
  execute function notify_on_contract_signature();

-- ────────────────────────────────────────────
-- 4. Trigger : facture créée → worker + company
-- ────────────────────────────────────────────
create or replace function notify_on_invoice_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_title text;
begin
  select m.title into v_mission_title
  from contracts c
  join missions  m on m.id = c.mission_id
  where c.id = NEW.contract_id;

  -- Notifier le worker : montant qu'il va recevoir (worker_payout)
  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.worker_id,
    'invoice_created',
    'Facture émise',
    'Une facture de ' || NEW.worker_payout || ' € a été créée pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
    jsonb_build_object(
      'invoice_id',    NEW.id,
      'contract_id',   NEW.contract_id,
      'worker_payout', NEW.worker_payout
    )
  );

  -- Notifier la company : montant TTC à régler
  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.company_id,
    'invoice_created',
    'Nouvelle facture à régler',
    'Une facture de ' || NEW.amount_ttc || ' € TTC vous a été adressée pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
    jsonb_build_object(
      'invoice_id',  NEW.id,
      'contract_id', NEW.contract_id,
      'amount_ttc',  NEW.amount_ttc
    )
  );

  return NEW;
end;
$$;

comment on function notify_on_invoice_created() is
  'Trigger : notifie le worker (montant net) et la company (montant TTC) à la création d''une facture.';

drop trigger if exists trg_invoice_created_notify on invoices;
create trigger trg_invoice_created_notify
  after insert on invoices
  for each row
  execute function notify_on_invoice_created();

-- ────────────────────────────────────────────
-- 5. Trigger : mission publiée → workers du même secteur
-- ────────────────────────────────────────────
-- Couverture : INSERT avec status='open' ET UPDATE old.status<>'open' → 'open'.
-- Limite 100 workers par mission (tri par proximité si geo disponible).
create or replace function notify_workers_on_new_mission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_worker record;
begin
  -- Guard : seulement lors du passage initial à 'open'
  if NEW.status <> 'open' then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and OLD.status = 'open' then
    return NEW;
  end if;
  -- Pas de secteur défini → notification inutile
  if NEW.sector is null then
    return NEW;
  end if;

  for v_worker in
    select w.id
    from workers w
    where w.is_available = true
      and NEW.sector = any(w.sectors)
    order by
      case
        when NEW.lat is not null and w.lat is not null
        then sqrt(power(coalesce(w.lat,0) - NEW.lat, 2) + power(coalesce(w.lng,0) - NEW.lng, 2))
        else 0
      end asc
    limit 100
  loop
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_worker.id,
      'new_mission',
      'Nouvelle mission · ' || NEW.sector,
      'Une mission est disponible à ' || coalesce(NEW.city, 'proximité') || '.',
      jsonb_build_object(
        'mission_id', NEW.id,
        'sector',     NEW.sector,
        'city',       NEW.city,
        'urgency',    NEW.urgency
      )
    );
  end loop;

  return NEW;
end;
$$;

comment on function notify_workers_on_new_mission() is
  'Trigger : notifie les workers disponibles du même secteur lors de la publication. '
  'Limite 100 workers, tri par proximité géographique si lat/lng disponibles.';

drop trigger if exists trg_mission_published_notify on missions;
create trigger trg_mission_published_notify
  after insert or update of status on missions
  for each row
  execute function notify_workers_on_new_mission();

-- ────────────────────────────────────────────
-- 6. Trigger : mission fermée/annulée → candidats en attente
-- ────────────────────────────────────────────
create or replace function notify_applicants_on_mission_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant record;
begin
  if NEW.status not in ('cancelled') then
    return NEW;
  end if;
  if OLD.status not in ('open', 'matched') then
    return NEW;
  end if;
  if OLD.status = NEW.status then
    return NEW;
  end if;

  for v_applicant in
    select a.worker_id
    from applications a
    where a.mission_id = NEW.id
      and a.status     = 'pending'
  loop
    insert into notifications (user_id, type, title, body, payload)
    values (
      v_applicant.worker_id,
      'mission_closed',
      'Mission annulée',
      'La mission « ' || coalesce(NEW.title, 'sans titre') || ' » a été annulée. Votre candidature est close.',
      jsonb_build_object('mission_id', NEW.id)
    );
  end loop;

  return NEW;
end;
$$;

comment on function notify_applicants_on_mission_closed() is
  'Trigger : notifie les candidats (pending) quand une mission est annulée.';

drop trigger if exists trg_mission_closed_notify on missions;
create trigger trg_mission_closed_notify
  after update of status on missions
  for each row
  execute function notify_applicants_on_mission_closed();

-- ────────────────────────────────────────────
-- 7. Trigger : évaluation reçue → partie notée
-- ────────────────────────────────────────────
-- La table ratings a déjà trg_ratings_refresh_avg (AFTER INSERT, migration 003).
-- Ce second trigger AFTER INSERT est compatible — PostgreSQL supporte N triggers.
create or replace function notify_rated_on_rating_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rater_name    text;
  v_mission_title text;
begin
  select coalesce(
    (select w.first_name || ' ' || w.last_name from workers   w where w.id = NEW.rater_id),
    (select c.name                               from companies c where c.id = NEW.rater_id),
    'Un utilisateur'
  ) into v_rater_name;

  select title into v_mission_title
  from missions where id = NEW.mission_id;

  insert into notifications (user_id, type, title, body, payload)
  values (
    NEW.rated_id,
    'rating_received',
    'Nouvelle évaluation reçue',
    v_rater_name || ' vous a attribué ' || NEW.score || '/5 pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
    jsonb_build_object(
      'mission_id', NEW.mission_id,
      'rater_id',   NEW.rater_id,
      'score',      NEW.score
    )
  );

  return NEW;
end;
$$;

comment on function notify_rated_on_rating_received() is
  'Trigger : notifie la partie notée dès qu''une évaluation est insérée.';

drop trigger if exists trg_rating_received_notify on ratings;
create trigger trg_rating_received_notify
  after insert on ratings
  for each row
  execute function notify_rated_on_rating_received();
