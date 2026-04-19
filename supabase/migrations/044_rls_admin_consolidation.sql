-- ============================================================================
-- Migration 044 — Consolidation des policies admin_* dans les policies parties
-- ============================================================================
-- Contexte : Supabase advisors signalait 110 `multiple_permissive_policies`
-- warnings, tous dus au fait qu'on avait 2 policies qui couvraient les mêmes
-- rows pour les mêmes actions :
--   - <table>_parties (ou <table>_select/insert/update/delete) pour le user
--   - <table>_admin_<action> pour l'admin
--
-- Postgres évalue les 2 en OR → overhead pur. Solution : merger l'admin
-- dans la policy parties avec `OR is_admin()`.
--
-- Sécurité : sémantique identique (admin a toujours le même accès).
-- Perf : -50 % sur les tables avec FOR ALL parties (contracts, invoices).
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- contracts : policy FOR ALL parties → ajouter is_admin()
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "contracts_parties_all" ON contracts;
DROP POLICY IF EXISTS "contracts_admin_select" ON contracts;
DROP POLICY IF EXISTS "contracts_admin_insert" ON contracts;
DROP POLICY IF EXISTS "contracts_admin_update" ON contracts;
DROP POLICY IF EXISTS "contracts_admin_delete" ON contracts;

CREATE POLICY "contracts_all" ON contracts FOR ALL
  USING (
    worker_id = (select auth.uid())
    OR company_id = (select auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    worker_id = (select auth.uid())
    OR company_id = (select auth.uid())
    OR is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- invoices : même pattern
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "invoices_parties_all" ON invoices;
DROP POLICY IF EXISTS "invoices_admin_select" ON invoices;
DROP POLICY IF EXISTS "invoices_admin_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_admin_update" ON invoices;
DROP POLICY IF EXISTS "invoices_admin_delete" ON invoices;

CREATE POLICY "invoices_all" ON invoices FOR ALL
  USING (
    worker_id = (select auth.uid())
    OR company_id = (select auth.uid())
    OR is_admin()
  )
  WITH CHECK (
    worker_id = (select auth.uid())
    OR company_id = (select auth.uid())
    OR is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- applications : séparation select / insert / update / delete
-- Chacune gagne un OR is_admin(). Les admin_* policies sautent.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "applications_select" ON applications;
DROP POLICY IF EXISTS "applications_insert_worker" ON applications;
DROP POLICY IF EXISTS "applications_update" ON applications;
DROP POLICY IF EXISTS "applications_delete_worker" ON applications;
DROP POLICY IF EXISTS "applications_admin_select" ON applications;
DROP POLICY IF EXISTS "applications_admin_insert" ON applications;
DROP POLICY IF EXISTS "applications_admin_update" ON applications;
DROP POLICY IF EXISTS "applications_admin_delete" ON applications;

CREATE POLICY "applications_select" ON applications FOR SELECT
  USING (
    worker_id = (select auth.uid())
    OR mission_id IN (SELECT id FROM missions WHERE company_id = (select auth.uid()))
    OR is_admin()
  );

CREATE POLICY "applications_insert" ON applications FOR INSERT
  WITH CHECK (worker_id = (select auth.uid()) OR is_admin());

CREATE POLICY "applications_update" ON applications FOR UPDATE
  USING (
    worker_id = (select auth.uid())
    OR mission_id IN (SELECT id FROM missions WHERE company_id = (select auth.uid()))
    OR is_admin()
  )
  WITH CHECK (
    worker_id = (select auth.uid())
    OR mission_id IN (SELECT id FROM missions WHERE company_id = (select auth.uid()))
    OR is_admin()
  );

CREATE POLICY "applications_delete" ON applications FOR DELETE
  USING (worker_id = (select auth.uid()) OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- missions : select/insert/update + admin_{select,insert,update,delete}
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "missions_select" ON missions;
DROP POLICY IF EXISTS "missions_insert" ON missions;
DROP POLICY IF EXISTS "missions_update" ON missions;
DROP POLICY IF EXISTS "missions_admin_select" ON missions;
DROP POLICY IF EXISTS "missions_admin_insert" ON missions;
DROP POLICY IF EXISTS "missions_admin_update" ON missions;
DROP POLICY IF EXISTS "missions_admin_delete" ON missions;

CREATE POLICY "missions_select" ON missions FOR SELECT
  USING (
    status <> 'draft'::mission_status
    OR company_id = (select auth.uid())
    OR is_admin()
  );

CREATE POLICY "missions_insert" ON missions FOR INSERT
  WITH CHECK (company_id = (select auth.uid()) OR is_admin());

CREATE POLICY "missions_update" ON missions FOR UPDATE
  USING (company_id = (select auth.uid()) OR is_admin())
  WITH CHECK (company_id = (select auth.uid()) OR is_admin());

CREATE POLICY "missions_delete_admin" ON missions FOR DELETE
  USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- profiles : consolidation
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON profiles;
DROP POLICY IF EXISTS "profiles · lecture admin" ON profiles;

CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING ((select auth.uid()) = id OR is_admin());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id OR is_admin());

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING ((select auth.uid()) = id OR is_admin())
  WITH CHECK ((select auth.uid()) = id OR is_admin());

CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- companies
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_admin_insert" ON companies;
DROP POLICY IF EXISTS "companies_admin_update" ON companies;
DROP POLICY IF EXISTS "companies_admin_delete" ON companies;

CREATE POLICY "companies_insert" ON companies FOR INSERT
  WITH CHECK ((select auth.uid()) = id OR is_admin());

CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING ((select auth.uid()) = id OR is_admin())
  WITH CHECK ((select auth.uid()) = id OR is_admin());

CREATE POLICY "companies_delete_admin" ON companies FOR DELETE
  USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- workers : admin peut déjà via workers_update_self_or_admin. Admin insert/delete à créer.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "workers_insert" ON workers;
DROP POLICY IF EXISTS "workers_admin_insert" ON workers;
DROP POLICY IF EXISTS "workers_admin_delete" ON workers;

CREATE POLICY "workers_insert" ON workers FOR INSERT
  WITH CHECK ((select auth.uid()) = id OR is_admin());

CREATE POLICY "workers_delete_admin" ON workers FOR DELETE
  USING (is_admin());

COMMIT;

-- ============================================================================
-- Tables laissées intentionnellement
-- ============================================================================
-- - fraud_signals, user_trust_scores, login_fingerprints : admin-only,
--   pas de parties policy à fusionner. OK tel quel.
-- - fraud_cases, fraud_case_documents, disputes : déjà _parties_or_admin.
-- - beta_feedback, data_export_requests, account_deletion_requests : no overlap.
-- - requalification_audit_log : admin only.
-- ============================================================================
