-- ============================================================================
-- Migration 039 — GRANT SELECT companies/workers à authenticated (FIX CRITIQUE)
-- ============================================================================
-- Bug bloquant découvert via logs Postgres : "permission denied for table
-- companies" depuis PostgREST, empêchant tout accès au dashboard entreprise.
--
-- Root cause : le rôle `authenticated` avait INSERT + UPDATE sur companies
-- (et workers) mais pas SELECT. Les policies RLS "companies · lecture
-- publique" / "companies_select_all" étaient bien en place, mais RLS ne
-- s'évalue qu'une fois le GRANT de base accordé. Sans GRANT SELECT,
-- Postgres bloque avant même d'atteindre RLS avec une erreur de permission.
--
-- Symptômes :
--   - Dashboard entreprise inaccessible (fetch company profile → 403)
--   - Side effects potentiels côté worker (fetch worker profile)
--   - Seul `anon` avait SELECT — paradoxal vu que la lecture était censée
--     être "publique".
-- ============================================================================

GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT ON public.workers   TO authenticated;
