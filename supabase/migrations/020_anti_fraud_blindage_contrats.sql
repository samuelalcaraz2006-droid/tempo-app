-- ============================================================================
-- Migration 020 — Anti-fraude : Blindage contrats & factures
-- ============================================================================
-- Objectif : rendre structurellement impossible la manipulation des montants,
-- heures et termes contractuels une fois le contrat signé.
--
-- 4 gardes DB (triggers BEFORE) :
--   1. Gel du contrat après double signature (champs financiers + parties)
--   2. Plafond d'heures = contract.total_hours (time entries)
--   3. Facture auto-calculée depuis les heures validées × tarif signé
--   4. Deadline 30 jours pour déclarer des heures + pas de date future
--
-- Défense en profondeur : ni l'admin, ni un bug client, ni une Edge Function
-- ne peut contourner ces gardes. La base de données est la source de vérité.
--
-- Dépend de : 002_tables.sql, 018_mission_time_entries.sql
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. Gel du contrat après double signature
-- ────────────────────────────────────────────────────────────────────────────
-- Une fois que les deux parties ont signé (signed_worker_at ET signed_company_at
-- non NULL), les champs financiers et identitaires sont gelés.
-- Restent modifiables : status (lifecycle), pdf_url (e-signature stocke le PDF
-- signé), et les timestamps de signature eux-mêmes (le webhook Yousign les met
-- à jour séquentiellement).
create or replace function tempo_freeze_contract_after_signature()
returns trigger
language plpgsql
as $$
begin
  -- Seulement si le contrat est bilatéralement signé AVANT cette modification
  if OLD.signed_worker_at is not null and OLD.signed_company_at is not null then
    -- Champs financiers gelés
    if NEW.hourly_rate       is distinct from OLD.hourly_rate
       or NEW.total_hours       is distinct from OLD.total_hours
       or NEW.total_amount_ht   is distinct from OLD.total_amount_ht
       or NEW.commission_rate   is distinct from OLD.commission_rate
       or NEW.commission_amount is distinct from OLD.commission_amount
    then
      raise exception 'contract_frozen: les termes financiers d''un contrat signé ne peuvent plus être modifiés'
        using errcode = 'check_violation';
    end if;

    -- Champs identitaires gelés
    if NEW.worker_id  is distinct from OLD.worker_id
       or NEW.company_id is distinct from OLD.company_id
       or NEW.mission_id is distinct from OLD.mission_id
    then
      raise exception 'contract_frozen: les parties d''un contrat signé ne peuvent pas être changées'
        using errcode = 'check_violation';
    end if;
  end if;

  return NEW;
end;
$$;

comment on function tempo_freeze_contract_after_signature() is
  'Anti-fraude : gèle les termes financiers et les parties d''un contrat une fois signé par les deux parties. Les transitions de statut et le pdf_url restent modifiables.';

drop trigger if exists trg_freeze_contract_after_signature on contracts;
create trigger trg_freeze_contract_after_signature
  before update on contracts
  for each row
  execute function tempo_freeze_contract_after_signature();


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Plafond d'heures par contrat
-- ────────────────────────────────────────────────────────────────────────────
-- La somme de toutes les worked_minutes d'un contrat ne peut pas dépasser
-- contract.total_hours × 60 minutes. Protège contre la surfacturation.
-- Si total_hours est NULL (contrat sans limite horaire), le check est ignoré.
create or replace function tempo_cap_time_entry_hours()
returns trigger
language plpgsql
as $$
declare
  v_total_hours     decimal;
  v_max_minutes     integer;
  v_existing_minutes integer;
  v_new_minutes     integer;
begin
  -- Récupérer le plafond du contrat
  select total_hours into v_total_hours
  from contracts
  where id = NEW.contract_id;

  -- Contrat sans plafond : skip
  if v_total_hours is null then
    return NEW;
  end if;

  v_max_minutes := (v_total_hours * 60)::integer;

  -- Calculer les minutes de cette entry manuellement
  -- (le GENERATED column n'est pas encore dispo dans BEFORE INSERT)
  v_new_minutes := greatest(0,
    extract(epoch from (NEW.ended_at - NEW.started_at))::integer / 60
    - coalesce(NEW.break_minutes, 0)
  );

  -- Somme des minutes existantes (hors entry courante si UPDATE)
  select coalesce(sum(worked_minutes), 0) into v_existing_minutes
  from mission_time_entries
  where contract_id = NEW.contract_id
    and (TG_OP = 'INSERT' or id <> NEW.id);

  if (v_existing_minutes + v_new_minutes) > v_max_minutes then
    raise exception 'time_entry_hours_exceeded: le plafond de % heures du contrat est atteint (% min existantes + % min nouvelles > % min max)',
      v_total_hours, v_existing_minutes, v_new_minutes, v_max_minutes
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

comment on function tempo_cap_time_entry_hours() is
  'Anti-fraude : refuse les déclarations d''heures qui feraient dépasser le plafond contract.total_hours.';

drop trigger if exists trg_cap_time_entry_hours on mission_time_entries;
create trigger trg_cap_time_entry_hours
  before insert or update of started_at, ended_at, break_minutes on mission_time_entries
  for each row
  execute function tempo_cap_time_entry_hours();


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Facture auto-calculée
-- ────────────────────────────────────────────────────────────────────────────
-- Le montant d'une facture est TOUJOURS calculé depuis les heures validées
-- du contrat × le tarif horaire signé. Aucun montant libre n'est possible.
-- Le trigger écrase les valeurs fournies par l'appelant.
create or replace function tempo_auto_calculate_invoice()
returns trigger
language plpgsql
as $$
declare
  v_hourly_rate      decimal;
  v_commission_rate  decimal;
  v_total_minutes    integer;
  v_amount_ht        decimal;
begin
  -- Récupérer le tarif et la commission du contrat
  select hourly_rate, commission_rate
  into v_hourly_rate, v_commission_rate
  from contracts
  where id = NEW.contract_id;

  if v_hourly_rate is null then
    raise exception 'contract_not_found: contrat % introuvable pour calcul de facture', NEW.contract_id
      using errcode = 'foreign_key_violation';
  end if;

  -- Somme des minutes validées ou facturées
  select coalesce(sum(worked_minutes), 0)
  into v_total_minutes
  from mission_time_entries
  where contract_id = NEW.contract_id
    and status in ('validated', 'billed');

  -- Calcul automatique (auto-entrepreneur = pas de TVA → amount_ttc = amount_ht)
  v_amount_ht := round((v_total_minutes / 60.0) * v_hourly_rate, 2);

  NEW.amount_ht     := v_amount_ht;
  NEW.amount_ttc    := v_amount_ht;
  NEW.commission    := round(v_amount_ht * (v_commission_rate / 100.0), 2);
  NEW.worker_payout := v_amount_ht - round(v_amount_ht * (v_commission_rate / 100.0), 2);

  return NEW;
end;
$$;

comment on function tempo_auto_calculate_invoice() is
  'Anti-fraude : calcule automatiquement les montants de facture depuis les heures validées × tarif signé. Écrase toute valeur manuelle.';

-- Nom alphabétiquement APRÈS trg_invoices_check_contract_signed pour que
-- la vérification de contrat signé passe en premier.
drop trigger if exists trg_invoices_auto_calculate on invoices;
create trigger trg_invoices_auto_calculate
  before insert or update on invoices
  for each row
  execute function tempo_auto_calculate_invoice();


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Deadline de déclaration + contrôle de dates
-- ────────────────────────────────────────────────────────────────────────────
-- a) Impossible de déclarer des heures pour une date dans le futur.
-- b) Impossible de déclarer des heures pour un work_date antérieur au
--    start_date de la mission.
-- c) Deadline 30 jours : si la mission est terminée et que work_date
--    est > 30 jours dans le passé, la déclaration est refusée.
create or replace function tempo_deadline_time_entry_submission()
returns trigger
language plpgsql
as $$
declare
  v_mission_start  date;
  v_mission_end    date;
begin
  -- Date future interdite
  if NEW.work_date > current_date then
    raise exception 'time_entry_future_date: impossible de déclarer des heures pour une date future (%)', NEW.work_date
      using errcode = 'check_violation';
  end if;

  -- Récupérer les dates de la mission via le contrat
  select m.start_date::date, m.end_date::date
  into v_mission_start, v_mission_end
  from contracts c
  join missions m on m.id = c.mission_id
  where c.id = NEW.contract_id;

  -- Date avant le début de mission
  if v_mission_start is not null and NEW.work_date < v_mission_start then
    raise exception 'time_entry_before_mission: cette date (%) est antérieure au début de la mission (%)', NEW.work_date, v_mission_start
      using errcode = 'check_violation';
  end if;

  -- Deadline 30 jours après la date travaillée
  if NEW.work_date + interval '30 days' < current_date then
    raise exception 'time_entry_deadline_expired: la date limite de déclaration (30 jours) est dépassée pour le %', NEW.work_date
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

comment on function tempo_deadline_time_entry_submission() is
  'Anti-fraude : interdit les déclarations d''heures pour des dates futures, antérieures à la mission, ou > 30 jours dans le passé.';

drop trigger if exists trg_deadline_time_entry_submission on mission_time_entries;
create trigger trg_deadline_time_entry_submission
  before insert or update of work_date on mission_time_entries
  for each row
  execute function tempo_deadline_time_entry_submission();
