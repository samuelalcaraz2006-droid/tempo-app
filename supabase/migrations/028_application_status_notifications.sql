-- ============================================================================
-- Migration 028 — Notifications automatiques sur changement de statut candidature
-- ============================================================================
-- Problème : aucun trigger n'existait sur la table applications.
-- Résultat : un refus ou une acceptation côté company ne notifiait jamais le worker.
--
-- Solution : trigger AFTER UPDATE sur applications qui envoie une notification
-- au worker dès que son statut passe à 'accepted' ou 'rejected'.
-- Couvre TOUS les points d'entrée (dashboard, page missions, admin, API externe).
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Nouveaux types de notification
-- ────────────────────────────────────────────
alter type notif_type add value if not exists 'application_accepted';
alter type notif_type add value if not exists 'application_rejected';

-- ────────────────────────────────────────────
-- 2. Trigger function
-- ────────────────────────────────────────────
create or replace function notify_worker_on_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_title text;
  v_company_name  text;
begin
  -- On ne réagit qu'aux transitions vers accepted ou rejected
  if NEW.status not in ('accepted', 'rejected') then
    return NEW;
  end if;
  -- Évite de renvoyer une notif si le statut n'a pas changé
  if OLD.status = NEW.status then
    return NEW;
  end if;

  -- Récupérer le titre de la mission et le nom de la company
  select m.title, coalesce(c.name, 'L''entreprise')
    into v_mission_title, v_company_name
  from missions m
  left join companies c on c.id = m.company_id
  where m.id = NEW.mission_id;

  if NEW.status = 'accepted' then
    insert into notifications (user_id, type, title, body, payload)
    values (
      NEW.worker_id,
      'application_accepted',
      'Candidature acceptée',
      v_company_name || ' a accepté votre candidature pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
      jsonb_build_object(
        'application_id', NEW.id,
        'mission_id',     NEW.mission_id
      )
    );

  elsif NEW.status = 'rejected' then
    insert into notifications (user_id, type, title, body, payload)
    values (
      NEW.worker_id,
      'application_rejected',
      'Candidature non retenue',
      v_company_name || ' n''a pas retenu votre candidature pour « ' || coalesce(v_mission_title, 'la mission') || ' ».',
      jsonb_build_object(
        'application_id', NEW.id,
        'mission_id',     NEW.mission_id
      )
    );
  end if;

  return NEW;
end;
$$;

comment on function notify_worker_on_application_status_change() is
  'Trigger : envoie une notification au worker dès qu''une company accepte ou refuse sa candidature. '
  'Couvre tous les points d''entrée (dashboard, page missions, admin).';

-- ────────────────────────────────────────────
-- 3. Trigger sur applications
-- ────────────────────────────────────────────
drop trigger if exists trg_application_status_notify on applications;
create trigger trg_application_status_notify
  after update of status on applications
  for each row
  execute function notify_worker_on_application_status_change();
