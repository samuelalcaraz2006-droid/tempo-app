-- ============================================================================
-- Migration 023 — Fingerprinting & signaux de fraude (anti-fraude Phase 3)
-- ============================================================================
-- Objectif : collecter les empreintes numériques (IP, device) à chaque login
-- et action sensible, puis détecter automatiquement les patterns de collusion
-- (IP partagée, alternance de rôles, litiges récurrents).
--
-- Tables :
--   1. login_fingerprints — empreintes IP/device par action
--   2. fraud_signals — signaux suspects détectés
--
-- RPCs :
--   1. detect_shared_ip_signals() — détecte IP partagées entre comptes
--   2. detect_recurring_dispute_signals() — litiges récurrents même paire
--   3. detect_role_alternation_signals() — même IP worker + company
--   4. run_fraud_detection() — master detector (admin)
--   5. purge_old_fingerprints() — RGPD 90 jours
--
-- Dépend de : 022 (fraud_cases), 017 (is_admin)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Types enum
-- ────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'fraud_signal_type') then
    create type fraud_signal_type as enum (
      'shared_ip',
      'role_alternation',
      'recurring_disputes',
      'rapid_account',
      'ip_mismatch',
      'suspicious_pattern',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'fraud_signal_severity') then
    create type fraud_signal_severity as enum ('info', 'warning', 'critical');
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Table login_fingerprints
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists login_fingerprints (
  id            uuid        primary key default uuid_generate_v4(),
  user_id       uuid        not null references profiles(id),
  ip_address    inet,
  user_agent    text,
  device_model  text,
  os_name       text,
  os_version    text,
  action_type   text        not null default 'login',
  metadata      jsonb       default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

comment on table login_fingerprints is
  'Empreintes numériques collectées à chaque login et action sensible. Purge RGPD à 90 jours.';

create index if not exists idx_fingerprints_user_ip
  on login_fingerprints (user_id, ip_address);

create index if not exists idx_fingerprints_ip
  on login_fingerprints (ip_address)
  where ip_address is not null;

create index if not exists idx_fingerprints_created
  on login_fingerprints (created_at);

-- RLS : admin uniquement — les utilisateurs ne doivent JAMAIS voir les fingerprints
alter table login_fingerprints enable row level security;

create policy "fingerprints_admin_select" on login_fingerprints
  for select using (is_admin());

-- INSERT via Edge Function (SECURITY DEFINER / service_role_key)
-- Pas de policy INSERT directe — empêche les inserts hors Edge Function

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Table fraud_signals
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists fraud_signals (
  id              uuid                  primary key default uuid_generate_v4(),
  user_id         uuid                  not null references profiles(id),
  related_user_id uuid                  references profiles(id),
  signal_type     fraud_signal_type     not null,
  severity        fraud_signal_severity not null default 'warning',
  description     text                  not null,
  metadata        jsonb                 default '{}'::jsonb,
  acknowledged    boolean               not null default false,
  acknowledged_by uuid                  references profiles(id),
  acknowledged_at timestamptz,
  detected_at     timestamptz           not null default now(),
  created_at      timestamptz           not null default now()
);

comment on table fraud_signals is
  'Signaux de fraude détectés automatiquement ou manuellement. Visibles par admin uniquement.';

create index if not exists idx_signals_user
  on fraud_signals (user_id, signal_type);

create index if not exists idx_signals_severity
  on fraud_signals (severity, detected_at desc)
  where acknowledged = false;

-- RLS : admin uniquement
alter table fraud_signals enable row level security;

create policy "signals_admin_select" on fraud_signals
  for select using (is_admin());

create policy "signals_admin_update" on fraud_signals
  for update using (is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Détection : IP partagée entre comptes non liés
-- ────────────────────────────────────────────────────────────────────────────
create or replace function detect_shared_ip_signals()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  v_pair  record;
begin
  for v_pair in
    select f1.user_id as user_a, f2.user_id as user_b, f1.ip_address,
           count(*) as shared_count
    from login_fingerprints f1
    join login_fingerprints f2
      on f1.ip_address = f2.ip_address
      and f1.user_id < f2.user_id
    where f1.created_at > now() - interval '30 days'
      and f2.created_at > now() - interval '30 days'
      and f1.ip_address is not null
    group by f1.user_id, f2.user_id, f1.ip_address
    having count(*) >= 3
  loop
    if not exists (
      select 1 from fraud_signals
      where user_id = v_pair.user_a
        and related_user_id = v_pair.user_b
        and signal_type = 'shared_ip'
        and detected_at > now() - interval '7 days'
    ) then
      insert into fraud_signals (user_id, related_user_id, signal_type, severity, description, metadata)
      values (
        v_pair.user_a, v_pair.user_b, 'shared_ip',
        case when v_pair.shared_count >= 10 then 'critical'::fraud_signal_severity
             else 'warning'::fraud_signal_severity end,
        'IP partagée détectée entre deux comptes',
        jsonb_build_object('ip', v_pair.ip_address::text, 'count', v_pair.shared_count)
      );
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

comment on function detect_shared_ip_signals is
  'Détecte les adresses IP partagées par au moins 2 comptes distincts (3+ logins en 30 jours).';

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Détection : litiges récurrents entre mêmes parties
-- ────────────────────────────────────────────────────────────────────────────
create or replace function detect_recurring_dispute_signals()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  v_pair  record;
begin
  for v_pair in
    select fc.worker_id, fc.company_id, count(*) as dispute_count
    from fraud_cases fc
    where fc.opened_at > now() - interval '12 months'
    group by fc.worker_id, fc.company_id
    having count(*) >= 2
  loop
    if not exists (
      select 1 from fraud_signals
      where user_id = v_pair.worker_id::uuid
        and related_user_id = v_pair.company_id::uuid
        and signal_type = 'recurring_disputes'
        and detected_at > now() - interval '30 days'
    ) then
      insert into fraud_signals (user_id, related_user_id, signal_type, severity, description, metadata)
      values (
        v_pair.worker_id::uuid, v_pair.company_id::uuid, 'recurring_disputes',
        case when v_pair.dispute_count >= 3 then 'critical'::fraud_signal_severity
             else 'warning'::fraud_signal_severity end,
        'Litiges récurrents entre les mêmes parties (' || v_pair.dispute_count || ' en 12 mois)',
        jsonb_build_object('count', v_pair.dispute_count, 'period', '12 months')
      );
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

comment on function detect_recurring_dispute_signals is
  'Détecte les paires worker/company ayant 2+ litiges en 12 mois.';

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Détection : alternance de rôles (même IP = worker + company)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function detect_role_alternation_signals()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  v_match record;
begin
  for v_match in
    select fw.user_id as worker_user_id, fc.user_id as company_user_id,
           fw.ip_address, count(*) as overlap_count
    from login_fingerprints fw
    join login_fingerprints fc
      on fw.ip_address = fc.ip_address
      and abs(extract(epoch from fw.created_at - fc.created_at)) < 604800
    join profiles pw on pw.id = fw.user_id and pw.role = 'travailleur'
    join profiles pc on pc.id = fc.user_id and pc.role = 'entreprise'
    where fw.created_at > now() - interval '30 days'
      and fw.ip_address is not null
      and fw.user_id <> fc.user_id
    group by fw.user_id, fc.user_id, fw.ip_address
    having count(*) >= 2
  loop
    if not exists (
      select 1 from fraud_signals
      where user_id = v_match.worker_user_id
        and related_user_id = v_match.company_user_id
        and signal_type = 'role_alternation'
        and detected_at > now() - interval '7 days'
    ) then
      insert into fraud_signals (user_id, related_user_id, signal_type, severity, description, metadata)
      values (
        v_match.worker_user_id, v_match.company_user_id, 'role_alternation',
        'critical',
        'Même IP utilisée par un compte worker et un compte entreprise',
        jsonb_build_object('ip', v_match.ip_address::text, 'overlap_count', v_match.overlap_count)
      );
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

comment on function detect_role_alternation_signals is
  'Détecte quand une même IP est utilisée par un compte worker ET un compte entreprise dans la même semaine. Toujours severity critical.';

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Master detector (admin) + purge RGPD
-- ────────────────────────────────────────────────────────────────────────────
create or replace function run_fraud_detection()
returns jsonb
language plpgsql
security definer
as $$
declare
  v_shared_ip integer;
  v_recurring integer;
  v_role_alt  integer;
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  v_shared_ip := detect_shared_ip_signals();
  v_recurring := detect_recurring_dispute_signals();
  v_role_alt  := detect_role_alternation_signals();

  return jsonb_build_object(
    'shared_ip', v_shared_ip,
    'recurring_disputes', v_recurring,
    'role_alternation', v_role_alt,
    'total', v_shared_ip + v_recurring + v_role_alt
  );
end;
$$;

comment on function run_fraud_detection is
  'Admin : exécute tous les détecteurs de fraude et retourne le nombre de signaux créés.';

create or replace function purge_old_fingerprints()
returns integer
language plpgsql
security definer
as $$
declare v_deleted integer;
begin
  delete from login_fingerprints where created_at < now() - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

comment on function purge_old_fingerprints is
  'RGPD : supprime les empreintes de plus de 90 jours. À exécuter quotidiennement.';

-- ────────────────────────────────────────────────────────────────────────────
-- 8. RPC : admin acquitter un signal
-- ────────────────────────────────────────────────────────────────────────────
create or replace function acknowledge_fraud_signal(p_signal_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_caller uuid := auth.uid();
begin
  if not is_admin() then
    raise exception 'forbidden: réservé aux administrateurs'
      using errcode = 'insufficient_privilege';
  end if;

  update fraud_signals set
    acknowledged = true,
    acknowledged_by = v_caller,
    acknowledged_at = now()
  where id = p_signal_id
    and acknowledged = false;

  if not found then
    raise exception 'signal_already_acknowledged: ce signal a déjà été traité'
      using errcode = 'check_violation';
  end if;
end;
$$;

comment on function acknowledge_fraud_signal is
  'Admin : marque un signal de fraude comme traité.';
