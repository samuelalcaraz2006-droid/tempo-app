-- ============================================================================
-- Migration 017 — Privacy column-level sur workers & companies
-- ============================================================================
-- Objectif RGPD : empêcher la lecture publique des colonnes sensibles sur
-- workers et companies. Avant cette migration, les policies `using (true)`
-- exposaient SIRET, adresses, téléphones, pièce d'identité scannée, CA annuel
-- à n'importe quel utilisateur authentifié.
--
-- Stratégie : column-level GRANT (plus simple que des vues, préserve les
-- embeds PostgREST existants qui ne demandent que des colonnes safe).
--
--   1. Révocation du SELECT global sur `authenticated`
--   2. GRANT SELECT sur les colonnes safe uniquement
--   3. Fonctions SECURITY DEFINER `get_*_private()` pour self + admin
--   4. Fonctions SECURITY DEFINER `admin_list_*()` pour admin uniquement
--
-- Les policies RLS `using (true)` restent en place — elles n'exposent plus
-- rien puisque les GRANT column-level sont le goulot d'étranglement.
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Helper is_admin()
-- ────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

comment on function public.is_admin() is
  'Retourne true si l''utilisateur courant a le rôle admin dans profiles.';

grant execute on function public.is_admin() to authenticated;

-- ────────────────────────────────────────────
-- 2. Column-level privacy sur workers
-- ────────────────────────────────────────────
revoke select on public.workers from authenticated;

grant select (
  id,
  first_name,
  last_name,
  city,
  radius_km,
  is_available,
  sectors,
  skills,
  certifications,
  id_verified,
  kyc_completed_at,
  rating_avg,
  rating_count,
  missions_completed,
  missions_cancelled,
  hourly_rate_min,
  bio,
  created_at,
  updated_at
) on public.workers to authenticated;

-- ────────────────────────────────────────────
-- 3. Column-level privacy sur companies
-- ────────────────────────────────────────────
revoke select on public.companies from authenticated;

grant select (
  id,
  name,
  siret_verified,
  city,
  lat,
  lng,
  sector,
  subscription_plan,
  rating_avg,
  rating_count,
  missions_posted,
  missions_completed,
  created_at,
  updated_at
) on public.companies to authenticated;

-- ────────────────────────────────────────────
-- 4. get_worker_private(target_id) — self ou admin
-- ────────────────────────────────────────────
create or replace function public.get_worker_private(target_id uuid)
returns setof public.workers
language sql
stable
security definer
set search_path = public
as $$
  select w.*
  from public.workers w
  where w.id = target_id
    and (target_id = auth.uid() or public.is_admin())
$$;

comment on function public.get_worker_private(uuid) is
  'Retourne le profil worker complet (colonnes sensibles incluses) uniquement si target_id = auth.uid() ou si l''appelant est admin.';

grant execute on function public.get_worker_private(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 5. get_company_private(target_id) — self ou admin
-- ────────────────────────────────────────────
create or replace function public.get_company_private(target_id uuid)
returns setof public.companies
language sql
stable
security definer
set search_path = public
as $$
  select c.*
  from public.companies c
  where c.id = target_id
    and (target_id = auth.uid() or public.is_admin())
$$;

comment on function public.get_company_private(uuid) is
  'Retourne le profil company complet (colonnes sensibles incluses) uniquement si target_id = auth.uid() ou si l''appelant est admin.';

grant execute on function public.get_company_private(uuid) to authenticated;

-- ────────────────────────────────────────────
-- 6. admin_list_workers() — admin only
-- ────────────────────────────────────────────
create or replace function public.admin_list_workers()
returns setof public.workers
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.workers
  where public.is_admin()
  order by created_at desc
$$;

comment on function public.admin_list_workers() is
  'Liste complète des workers avec colonnes sensibles. Accessible uniquement aux admins.';

grant execute on function public.admin_list_workers() to authenticated;

-- ────────────────────────────────────────────
-- 7. admin_list_companies() — admin only
-- ────────────────────────────────────────────
create or replace function public.admin_list_companies()
returns setof public.companies
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.companies
  where public.is_admin()
  order by created_at desc
$$;

comment on function public.admin_list_companies() is
  'Liste complète des companies avec colonnes sensibles. Accessible uniquement aux admins.';

grant execute on function public.admin_list_companies() to authenticated;
