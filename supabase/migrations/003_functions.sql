-- ============================================================
-- TEMPO · Migration 003 · Fonctions & Triggers
-- Dépend de : 002_tables.sql
-- ============================================================

-- ─────────────────────────────────────────
-- FONCTION : mise à jour automatique de updated_at
-- ─────────────────────────────────────────
create or replace function tempo_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function tempo_set_updated_at is
  'Met à jour automatiquement le champ updated_at avant chaque UPDATE';

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function tempo_set_updated_at();

create trigger trg_workers_updated_at
  before update on workers
  for each row execute function tempo_set_updated_at();

create trigger trg_companies_updated_at
  before update on companies
  for each row execute function tempo_set_updated_at();

create trigger trg_missions_updated_at
  before update on missions
  for each row execute function tempo_set_updated_at();

-- ─────────────────────────────────────────
-- FONCTION : recalcul de la note moyenne
-- Appelée après chaque INSERT dans ratings
-- ─────────────────────────────────────────
create or replace function tempo_refresh_rating_avg()
returns trigger
language plpgsql
as $$
begin
  if new.rater_role = 'company' then
    -- Une entreprise note un travailleur
    update workers
    set
      rating_avg   = (
        select round(avg(score)::numeric, 2)
        from ratings
        where rated_id = new.rated_id
          and rater_role = 'company'
      ),
      rating_count = (
        select count(*)
        from ratings
        where rated_id = new.rated_id
          and rater_role = 'company'
      )
    where id = new.rated_id;

  elsif new.rater_role = 'worker' then
    -- Un travailleur note une entreprise
    update companies
    set
      rating_avg   = (
        select round(avg(score)::numeric, 2)
        from ratings
        where rated_id = new.rated_id
          and rater_role = 'worker'
      ),
      rating_count = (
        select count(*)
        from ratings
        where rated_id = new.rated_id
          and rater_role = 'worker'
      )
    where id = new.rated_id;
  end if;

  return new;
end;
$$;

comment on function tempo_refresh_rating_avg is
  'Recalcule la note moyenne du profil noté après chaque évaluation';

create trigger trg_ratings_refresh_avg
  after insert on ratings
  for each row execute function tempo_refresh_rating_avg();

-- ─────────────────────────────────────────
-- FONCTION : numérotation automatique des factures
-- Format : FAC-YYYY-NNNN (ex: FAC-2026-0001)
-- ─────────────────────────────────────────
create or replace function tempo_generate_invoice_number()
returns trigger
language plpgsql
as $$
declare
  current_year text;
  next_number  integer;
begin
  current_year := to_char(now(), 'YYYY');

  select count(*) + 1
  into next_number
  from invoices
  where invoice_number like 'FAC-' || current_year || '-%';

  new.invoice_number := 'FAC-' || current_year || '-' || lpad(next_number::text, 4, '0');

  return new;
end;
$$;

comment on function tempo_generate_invoice_number is
  'Génère un numéro de facture séquentiel au format FAC-YYYY-NNNN';

create trigger trg_invoices_generate_number
  before insert on invoices
  for each row execute function tempo_generate_invoice_number();

-- ─────────────────────────────────────────
-- FONCTION : alerte seuil CA auto-entrepreneur
-- Déclenche une notification quand le CA atteint 85% du plafond
-- Plafond 2026 pour les prestations de services : 77 700 €
-- ─────────────────────────────────────────
create or replace function tempo_check_ca_threshold()
returns trigger
language plpgsql
as $$
declare
  seuil_alerte  decimal := 77700 * 0.85;  -- 85% = 66 045 €
  seuil_maximum decimal := 77700;
begin
  -- Alerte à 85% du plafond, envoyée une seule fois
  if new.ca_ytd >= seuil_alerte
    and old.ca_ytd < seuil_alerte
    and new.ca_threshold_alerted = false
  then
    insert into notifications (user_id, type, title, body)
    values (
      new.id,
      'ca_threshold_alert',
      'Attention — seuil CA bientôt atteint',
      'Vous avez atteint 85% de votre plafond annuel auto-entrepreneur (' || seuil_maximum || ' €). Consultez un comptable.'
    );

    update workers set ca_threshold_alerted = true where id = new.id;
  end if;

  return new;
end;
$$;

comment on function tempo_check_ca_threshold is
  'Envoie une notification quand le CA annuel dépasse 85% du plafond auto-entrepreneur';

create trigger trg_workers_ca_threshold
  after update of ca_ytd on workers
  for each row execute function tempo_check_ca_threshold();
