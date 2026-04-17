-- ============================================================================
-- Migration 024 — Score de confiance utilisateur (anti-fraude Phase 4)
-- ============================================================================
-- Objectif : quantifier la fiabilité de chaque utilisateur sur une échelle
-- 0-100, recalculable à tout moment, avec suspension automatique si < 30.
--
-- Base : 50 points
-- Positifs (+50 max) : KYC, ancienneté, missions, notes, zéro litige
-- Négatifs (-50 max) : litiges ouverts, signaux fraude, retards paiement
--
-- Seuils :
--   < 30  = suspension automatique
--   30-50 = surveillance renforcée
--   > 50  = normal
--
-- Dépend de : 022 (fraud_cases), 023 (fraud_signals)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Table user_trust_scores
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists user_trust_scores (
  user_id     uuid        primary key references profiles(id),
  score       integer     not null default 50 check (score >= 0 and score <= 100),
  level       text        not null default 'normal' check (level in ('normal', 'surveillance', 'critical')),
  factors     jsonb       not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table user_trust_scores is
  'Score de confiance utilisateur 0-100. Recalculé à chaque événement significatif. Admin-only.';

create trigger trg_trust_scores_updated_at
  before update on user_trust_scores
  for each row execute function update_updated_at();

-- RLS : admin uniquement
alter table user_trust_scores enable row level security;

create policy "trust_scores_admin_select" on user_trust_scores
  for select using (is_admin());

create policy "trust_scores_admin_update" on user_trust_scores
  for update using (is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 2. RPC : calculer le score de confiance d'un utilisateur
-- ────────────────────────────────────────────────────────────────────────────
create or replace function compute_trust_score(p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_profile       profiles;
  v_score         integer := 50;
  v_factors       jsonb := '{}'::jsonb;
  v_level         text;
  -- Positive factors
  v_kyc_done      boolean := false;
  v_months        integer;
  v_missions_done integer := 0;
  v_avg_rating    numeric;
  v_no_disputes   boolean;
  -- Negative factors
  v_open_cases    integer := 0;
  v_critical_sigs integer := 0;
  v_warning_sigs  integer := 0;
  v_overdue_inv   integer := 0;
  v_disputed_hrs  integer := 0;
begin
  -- Récupérer le profil
  select * into v_profile from profiles where id = p_user_id;
  if v_profile is null then return 50; end if;

  -- ═══════════════════════════════════════════
  -- FACTEURS POSITIFS
  -- ═══════════════════════════════════════════

  -- KYC complet (+15)
  if v_profile.role = 'travailleur' then
    select (kyc_completed_at is not null) into v_kyc_done
    from workers where id = p_user_id;
  else
    v_kyc_done := true;
  end if;
  if v_kyc_done then
    v_score := v_score + 15;
    v_factors := v_factors || '{"kyc": 15}'::jsonb;
  else
    v_factors := v_factors || '{"kyc": 0}'::jsonb;
  end if;

  -- Ancienneté (+5 si > 6 mois, +10 si > 12 mois)
  v_months := extract(month from age(now(), v_profile.created_at))
    + extract(year from age(now(), v_profile.created_at)) * 12;
  if v_months >= 12 then
    v_score := v_score + 10;
    v_factors := v_factors || '{"seniority": 10}'::jsonb;
  elsif v_months >= 6 then
    v_score := v_score + 5;
    v_factors := v_factors || '{"seniority": 5}'::jsonb;
  else
    v_factors := v_factors || '{"seniority": 0}'::jsonb;
  end if;

  -- Missions terminées (+2 par mission, cap +15)
  if v_profile.role = 'travailleur' then
    select coalesce(missions_completed, 0) into v_missions_done
    from workers where id = p_user_id;
  else
    select count(*) into v_missions_done
    from missions where company_id = p_user_id and status = 'completed';
  end if;
  v_score := v_score + least(v_missions_done * 2, 15);
  v_factors := v_factors || jsonb_build_object('missions_completed', least(v_missions_done * 2, 15));

  -- Note moyenne (+10 si >= 4.0, +15 si >= 4.5)
  select avg(score) into v_avg_rating
  from ratings where rated_id = p_user_id;
  if v_avg_rating is not null and v_avg_rating >= 4.5 then
    v_score := v_score + 15;
    v_factors := v_factors || '{"avg_rating": 15}'::jsonb;
  elsif v_avg_rating is not null and v_avg_rating >= 4.0 then
    v_score := v_score + 10;
    v_factors := v_factors || '{"avg_rating": 10}'::jsonb;
  else
    v_factors := v_factors || jsonb_build_object('avg_rating', 0);
  end if;

  -- Zéro litige jamais (+5)
  select not exists (
    select 1 from fraud_cases
    where worker_id::uuid = p_user_id or company_id::uuid = p_user_id
  ) into v_no_disputes;
  if v_no_disputes then
    v_score := v_score + 5;
    v_factors := v_factors || '{"zero_disputes": 5}'::jsonb;
  else
    v_factors := v_factors || '{"zero_disputes": 0}'::jsonb;
  end if;

  -- ═══════════════════════════════════════════
  -- FACTEURS NÉGATIFS
  -- ═══════════════════════════════════════════

  -- Litiges ouverts (-15 par case)
  select count(*) into v_open_cases
  from fraud_cases
  where (worker_id::uuid = p_user_id or company_id::uuid = p_user_id)
    and status in ('open', 'investigating');
  v_score := v_score - (v_open_cases * 15);
  v_factors := v_factors || jsonb_build_object('open_cases', -(v_open_cases * 15));

  -- Signaux fraude non acquittés
  select
    count(*) filter (where severity = 'critical'),
    count(*) filter (where severity = 'warning')
  into v_critical_sigs, v_warning_sigs
  from fraud_signals
  where (user_id = p_user_id or related_user_id = p_user_id)
    and acknowledged = false;
  v_score := v_score - (v_critical_sigs * 20) - (v_warning_sigs * 10);
  v_factors := v_factors || jsonb_build_object(
    'critical_signals', -(v_critical_sigs * 20),
    'warning_signals', -(v_warning_sigs * 10)
  );

  -- Factures en retard (-10 par facture, entreprises)
  if v_profile.role = 'entreprise' then
    select count(*) into v_overdue_inv
    from invoices where company_id = p_user_id and status = 'overdue';
    v_score := v_score - (v_overdue_inv * 10);
    v_factors := v_factors || jsonb_build_object('overdue_invoices', -(v_overdue_inv * 10));
  end if;

  -- Heures contestées (-5 par entrée)
  select count(*) into v_disputed_hrs
  from mission_time_entries mte
  join contracts c on c.id = mte.contract_id
  where (c.worker_id = p_user_id or c.company_id = p_user_id)
    and mte.status = 'disputed';
  v_score := v_score - (v_disputed_hrs * 5);
  v_factors := v_factors || jsonb_build_object('disputed_hours', -(v_disputed_hrs * 5));

  -- ═══════════════════════════════════════════
  -- CLAMP & LEVEL
  -- ═══════════════════════════════════════════
  v_score := greatest(0, least(100, v_score));

  v_level := case
    when v_score < 30 then 'critical'
    when v_score < 50 then 'surveillance'
    else 'normal'
  end;

  -- Upsert le score
  insert into user_trust_scores (user_id, score, level, factors, computed_at)
  values (p_user_id, v_score, v_level, v_factors, now())
  on conflict (user_id) do update set
    score = excluded.score,
    level = excluded.level,
    factors = excluded.factors,
    computed_at = excluded.computed_at;

  return v_score;
end;
$$;

comment on function compute_trust_score is
  'Calcule le score de confiance (0-100) d''un utilisateur et l''enregistre. Facteurs positifs et négatifs pondérés.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RPC : recalculer tous les scores (admin batch)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function recompute_all_trust_scores()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_total     integer := 0;
  v_critical  integer := 0;
  v_surveill  integer := 0;
  v_normal    integer := 0;
  v_suspended integer := 0;
  v_rec       record;
  v_score     integer;
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  for v_rec in
    select id from profiles where role in ('travailleur', 'entreprise')
  loop
    v_score := compute_trust_score(v_rec.id);
    v_total := v_total + 1;

    if v_score < 30 then
      v_critical := v_critical + 1;

      -- Auto-suspension si score critique ET pas déjà suspendu/banni
      if exists (
        select 1 from profiles
        where id = v_rec.id and status not in ('suspended', 'banned')
      ) then
        update profiles set status = 'suspended'
        where id = v_rec.id;

        insert into notifications (user_id, type, title, body)
        values (
          v_rec.id,
          'account_suspended',
          'Compte suspendu',
          'Votre compte a été suspendu suite à une vérification de sécurité. Contactez le support pour plus d''informations.'
        );

        v_suspended := v_suspended + 1;
      end if;
    elsif v_score < 50 then
      v_surveill := v_surveill + 1;
    else
      v_normal := v_normal + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'total', v_total,
    'critical', v_critical,
    'surveillance', v_surveill,
    'normal', v_normal,
    'auto_suspended', v_suspended
  );
end;
$$;

comment on function recompute_all_trust_scores is
  'Admin : recalcule le score de confiance de tous les utilisateurs. Auto-suspend les scores < 30.';

-- ────────────────────────────────────────────────────────────────────────────
-- 4. RPC : admin consulter le score d'un utilisateur
-- ────────────────────────────────────────────────────────────────────────────
create or replace function get_trust_score(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_score integer;
  v_row   user_trust_scores;
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  -- Recalculer d'abord (toujours frais)
  v_score := compute_trust_score(p_user_id);

  select * into v_row from user_trust_scores where user_id = p_user_id;

  return jsonb_build_object(
    'user_id', p_user_id,
    'score', v_row.score,
    'level', v_row.level,
    'factors', v_row.factors,
    'computed_at', v_row.computed_at
  );
end;
$$;

comment on function get_trust_score is
  'Admin : retourne le score de confiance d''un utilisateur (recalculé à la volée).';
