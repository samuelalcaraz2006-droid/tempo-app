-- ============================================================================
-- Migration 027 — Jours fériés français dans le calcul des heures ouvrables
-- ============================================================================
-- Complète la migration 026 : business_hours_elapsed() exclut désormais les
-- 11 jours fériés légaux français (fixes + mobiles calculés depuis Pâques).
--
-- Jours fériés fixes (8) :
--   1er jan, 1er mai, 8 mai, 14 juil, 15 août, 1er nov, 11 nov, 25 déc
-- Jours fériés mobiles (3, base Pâques) :
--   Lundi de Pâques (Pâques + 1j), Ascension (+ 39j), Lundi de Pentecôte (+ 50j)
-- ============================================================================

-- ────────────────────────────────────────────
-- 1. Calcul de la date de Pâques (algorithme de Meeus/Jones/Butcher)
-- ────────────────────────────────────────────
create or replace function easter_date(p_year integer)
returns date
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  a  integer := p_year % 19;
  b  integer := p_year / 100;
  c  integer := p_year % 100;
  d  integer := b / 4;
  e  integer := b % 4;
  f  integer := (b + 8) / 25;
  g  integer := (b - f + 1) / 3;
  h  integer := (19 * a + b - d - g + 15) % 30;
  i  integer := c / 4;
  k  integer := c % 4;
  l  integer := (32 + 2 * e + 2 * i - h - k) % 7;
  m  integer := (a + 11 * h + 22 * l) / 451;
  month integer := (h + l - 7 * m + 114) / 31;
  day   integer := ((h + l - 7 * m + 114) % 31) + 1;
begin
  return make_date(p_year, month, day);
end;
$$;

comment on function easter_date(integer) is
  'Retourne la date de Pâques pour une année donnée (algorithme Meeus/Jones/Butcher).';

revoke execute on function easter_date(integer) from public;
revoke execute on function easter_date(integer) from authenticated;

-- ────────────────────────────────────────────
-- 2. Liste des jours fériés français pour une année
-- ────────────────────────────────────────────
create or replace function french_public_holidays(p_year integer)
returns setof date
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  e date := easter_date(p_year);
begin
  -- 8 jours fériés fixes
  return next make_date(p_year, 1,  1);   -- Jour de l'An
  return next make_date(p_year, 5,  1);   -- Fête du Travail
  return next make_date(p_year, 5,  8);   -- Victoire 1945
  return next make_date(p_year, 7,  14);  -- Fête Nationale
  return next make_date(p_year, 8,  15);  -- Assomption
  return next make_date(p_year, 11, 1);   -- Toussaint
  return next make_date(p_year, 11, 11);  -- Armistice
  return next make_date(p_year, 12, 25);  -- Noël
  -- 3 jours fériés mobiles (calculés depuis Pâques)
  return next e + 1;   -- Lundi de Pâques
  return next e + 39;  -- Ascension (jeudi)
  return next e + 50;  -- Lundi de Pentecôte
end;
$$;

comment on function french_public_holidays(integer) is
  'Retourne les 11 jours fériés légaux français pour une année donnée '
  '(8 fixes + lundi de Pâques, Ascension, lundi de Pentecôte).';

revoke execute on function french_public_holidays(integer) from public;
revoke execute on function french_public_holidays(integer) from authenticated;

-- ────────────────────────────────────────────
-- 3. business_hours_elapsed() — version avec jours fériés exclus
-- ────────────────────────────────────────────
-- Remplace la version de migration 026. Exclut :
--   • Samedi (DOW 6) et dimanche (DOW 0)
--   • Les 11 jours fériés français
create or replace function business_hours_elapsed(p_from timestamptz)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(
      case
        when extract(dow from d.day) between 1 and 5  -- lun (1) → ven (5)
          and not exists (
            -- Exclure les jours fériés de l'année courante du jour
            select 1
            from french_public_holidays(extract(year from d.day)::integer) h
            where h = d.day::date
          )
        then
          extract(epoch from (
            least(now(), d.day + interval '1 day') -
            greatest(p_from, d.day)
          )) / 3600.0
        else 0
      end
    ),
    0
  )
  from generate_series(
    date_trunc('day', p_from),
    date_trunc('day', now()),
    interval '1 day'
  ) as d(day)
  where d.day + interval '1 day' > p_from
    and d.day <= now()
$$;

comment on function business_hours_elapsed(timestamptz) is
  'Nombre d''heures ouvrables (lun-ven, hors jours fériés français) écoulées depuis p_from. '
  'Utilisé par tacit_validate_time_entries() : seuil = 72h = 3 jours ouvrables.';

grant execute on function business_hours_elapsed(timestamptz) to service_role;
revoke execute on function business_hours_elapsed(timestamptz) from public;
revoke execute on function business_hours_elapsed(timestamptz) from authenticated;

-- ────────────────────────────────────────────
-- 4. Vérification rapide (commentée, pour tests manuels)
-- ────────────────────────────────────────────
-- select easter_date(2026);                                    -- 2026-04-05
-- select * from french_public_holidays(2026) order by 1;      -- 11 dates
-- select business_hours_elapsed(now() - interval '5 days');   -- ~72 selon pont
