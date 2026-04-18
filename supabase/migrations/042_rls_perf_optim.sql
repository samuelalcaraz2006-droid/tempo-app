-- ============================================================================
-- Migration 042 — Optimisation RLS : doublons + auth.uid() en subquery
-- ============================================================================
-- Deux grosses familles de warnings remontés par `supabase advisors` :
--
-- 1. **multiple_permissive_policies** (180 occurrences)
--    Plusieurs policies font la même chose sur la même table×role×action.
--    Postgres les évalue toutes en OR → coût doublé.
--    → On garde la version snake_case (plus récente), on drop les anciennes.
--
-- 2. **auth_rls_initplan** (64 occurrences)
--    Les expressions `auth.uid() = user_id` réévaluent la fonction par ligne.
--    La solution officielle Supabase : `(select auth.uid())` → caché une
--    seule fois par query.
--    → DROP + CREATE avec la version optimisée.
--
-- Principe : on ne CHANGE PAS la sémantique des policies (mêmes colonnes,
-- mêmes rôles). On réduit juste le coût en temps d'exécution.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────
-- Partie 1 : drop des doublons (garder la version snake_case récente)
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "applications · entreprise voit celles de ses missions" ON applications;
DROP POLICY IF EXISTS "applications · entreprise peut mettre a jour le statut" ON applications;
DROP POLICY IF EXISTS "applications · travailleur gère les siennes" ON applications;
DROP POLICY IF EXISTS "applications_company" ON applications;
DROP POLICY IF EXISTS "applications_worker" ON applications;

DROP POLICY IF EXISTS "companies · création propre" ON companies;
DROP POLICY IF EXISTS "companies · modification propre" ON companies;
DROP POLICY IF EXISTS "companies_insert_own" ON companies;
DROP POLICY IF EXISTS "companies_update_own" ON companies;

DROP POLICY IF EXISTS "contracts · parties concernées uniquement" ON contracts;
DROP POLICY IF EXISTS "contracts_parties" ON contracts;

DROP POLICY IF EXISTS "favorites · entreprise propriétaire" ON favorites;
DROP POLICY IF EXISTS "favorites_own" ON favorites;

DROP POLICY IF EXISTS "invoices · parties concernées uniquement" ON invoices;
DROP POLICY IF EXISTS "invoices_parties" ON invoices;

DROP POLICY IF EXISTS "matching_scores · lecture connectée" ON matching_scores;
DROP POLICY IF EXISTS "scores_select" ON matching_scores;

DROP POLICY IF EXISTS "missions · création par entreprise" ON missions;
DROP POLICY IF EXISTS "missions · lecture ouverte" ON missions;
DROP POLICY IF EXISTS "missions · modification par propriétaire" ON missions;
DROP POLICY IF EXISTS "missions_insert_own" ON missions;
DROP POLICY IF EXISTS "missions_select_open" ON missions;
DROP POLICY IF EXISTS "missions_update_own" ON missions;

DROP POLICY IF EXISTS "notifications · propriétaire uniquement" ON notifications;
DROP POLICY IF EXISTS "notifs_owner_or_admin" ON notifications;

DROP POLICY IF EXISTS "profiles · création propre" ON profiles;
DROP POLICY IF EXISTS "profiles · lecture propre" ON profiles;
DROP POLICY IF EXISTS "profiles · modification propre" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

DROP POLICY IF EXISTS "ratings · création par l auteur" ON ratings;
DROP POLICY IF EXISTS "ratings · lecture propre (notes privées)" ON ratings;
DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;

DROP POLICY IF EXISTS "workers · admin peut modifier" ON workers;
DROP POLICY IF EXISTS "workers · création propre" ON workers;
DROP POLICY IF EXISTS "workers · modification propre" ON workers;
DROP POLICY IF EXISTS "workers_admin_update" ON workers;
DROP POLICY IF EXISTS "workers_insert_own" ON workers;
DROP POLICY IF EXISTS "workers_update_own_safe" ON workers;

DROP POLICY IF EXISTS "account_deletion_requests_create" ON account_deletion_requests;
DROP POLICY IF EXISTS "Users can create deletion requests" ON account_deletion_requests;
DROP POLICY IF EXISTS "Users can view own deletion requests" ON account_deletion_requests;

DROP POLICY IF EXISTS "beta_feedback_admin_view" ON beta_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Users can create feedback" ON beta_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON beta_feedback;

DROP POLICY IF EXISTS "data_export_requests_create" ON data_export_requests;
DROP POLICY IF EXISTS "Users can create export requests" ON data_export_requests;
DROP POLICY IF EXISTS "Users can view own export requests" ON data_export_requests;

DROP POLICY IF EXISTS "disputes_admin_update" ON disputes;
DROP POLICY IF EXISTS "Admins can update disputes" ON disputes;
DROP POLICY IF EXISTS "Authenticated users can create disputes" ON disputes;
DROP POLICY IF EXISTS "Users can view their own disputes" ON disputes;

DROP POLICY IF EXISTS "amendments_parties_insert" ON contract_amendments;
DROP POLICY IF EXISTS "amendments_parties_select" ON contract_amendments;

DROP POLICY IF EXISTS "contract_offers_insert_proposer" ON contract_offers;
DROP POLICY IF EXISTS "contract_offers_select_parties" ON contract_offers;
DROP POLICY IF EXISTS "contract_offers_update_target_or_proposer" ON contract_offers;

DROP POLICY IF EXISTS "sig_envelopes_select_parties" ON contract_signature_envelopes;

DROP POLICY IF EXISTS "fraud_docs_insert" ON fraud_case_documents;
DROP POLICY IF EXISTS "fraud_docs_select" ON fraud_case_documents;

DROP POLICY IF EXISTS "fraud_cases_select" ON fraud_cases;

DROP POLICY IF EXISTS "message_attachments_delete_sender" ON message_attachments;
DROP POLICY IF EXISTS "message_attachments_insert_sender" ON message_attachments;
DROP POLICY IF EXISTS "message_attachments_select_parties" ON message_attachments;

DROP POLICY IF EXISTS "messages_insert_own" ON messages;
DROP POLICY IF EXISTS "messages_select_own" ON messages;
DROP POLICY IF EXISTS "messages_update_read" ON messages;

-- ─────────────────────────────────────────────────────────────────────────
-- Partie 2 : recréation des policies optimisées avec (select auth.uid())
-- ─────────────────────────────────────────────────────────────────────────

-- profiles : 1 policy par action (était : 6 doublons)
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING ((select auth.uid()) = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- workers
CREATE POLICY "workers_insert" ON workers FOR INSERT
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "workers_update_self_or_admin" ON workers FOR UPDATE
  USING (
    (select auth.uid()) = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role)
  )
  WITH CHECK (
    (select auth.uid()) = id
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role)
  );

-- companies
CREATE POLICY "companies_insert" ON companies FOR INSERT
  WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "companies_update" ON companies FOR UPDATE
  USING ((select auth.uid()) = id);

-- missions : 1 policy par action
CREATE POLICY "missions_select" ON missions FOR SELECT
  USING (status <> 'draft'::mission_status OR company_id = (select auth.uid()));
CREATE POLICY "missions_insert" ON missions FOR INSERT
  WITH CHECK (company_id = (select auth.uid()));
CREATE POLICY "missions_update" ON missions FOR UPDATE
  USING (company_id = (select auth.uid()));

-- applications
CREATE POLICY "applications_select" ON applications FOR SELECT
  USING (
    worker_id = (select auth.uid())
    OR mission_id IN (SELECT id FROM missions WHERE company_id = (select auth.uid()))
  );
CREATE POLICY "applications_insert_worker" ON applications FOR INSERT
  WITH CHECK (worker_id = (select auth.uid()));
CREATE POLICY "applications_update" ON applications FOR UPDATE
  USING (
    worker_id = (select auth.uid())
    OR mission_id IN (SELECT id FROM missions WHERE company_id = (select auth.uid()))
  )
  WITH CHECK (
    worker_id = (select auth.uid())
    OR mission_id IN (SELECT id FROM missions WHERE company_id = (select auth.uid()))
  );
CREATE POLICY "applications_delete_worker" ON applications FOR DELETE
  USING (worker_id = (select auth.uid()));

-- contracts
CREATE POLICY "contracts_parties_all" ON contracts FOR ALL
  USING (worker_id = (select auth.uid()) OR company_id = (select auth.uid()))
  WITH CHECK (worker_id = (select auth.uid()) OR company_id = (select auth.uid()));

-- invoices
CREATE POLICY "invoices_parties_all" ON invoices FOR ALL
  USING (worker_id = (select auth.uid()) OR company_id = (select auth.uid()))
  WITH CHECK (worker_id = (select auth.uid()) OR company_id = (select auth.uid()));

-- notifications
CREATE POLICY "notifications_owner" ON notifications FOR ALL
  USING (user_id = (select auth.uid()) OR is_admin())
  WITH CHECK (user_id = (select auth.uid()) OR is_admin());

-- favorites
CREATE POLICY "favorites_owner" ON favorites FOR ALL
  USING (company_id = (select auth.uid()))
  WITH CHECK (company_id = (select auth.uid()));

-- matching_scores (authenticated only)
CREATE POLICY "matching_scores_authenticated" ON matching_scores FOR SELECT
  USING ((select auth.role()) = 'authenticated'::text);

-- ratings
CREATE POLICY "ratings_select" ON ratings FOR SELECT
  USING (rater_id = (select auth.uid()) OR rated_id = (select auth.uid()));
CREATE POLICY "ratings_insert" ON ratings FOR INSERT
  WITH CHECK (rater_id = (select auth.uid()));

-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT
  USING ((select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id OR is_admin());
CREATE POLICY "messages_insert" ON messages FOR INSERT
  WITH CHECK ((select auth.uid()) = sender_id OR is_admin());
CREATE POLICY "messages_update" ON messages FOR UPDATE
  USING ((select auth.uid()) = receiver_id OR is_admin())
  WITH CHECK ((select auth.uid()) = receiver_id OR is_admin());

-- message_attachments
CREATE POLICY "message_attachments_select" ON message_attachments FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_attachments.message_id
        AND (m.sender_id = (select auth.uid()) OR m.receiver_id = (select auth.uid()))
    )
  );
CREATE POLICY "message_attachments_insert" ON message_attachments FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_attachments.message_id
        AND m.sender_id = (select auth.uid())
    )
  );
CREATE POLICY "message_attachments_delete" ON message_attachments FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_attachments.message_id
        AND m.sender_id = (select auth.uid())
    )
  );

-- contract_amendments
CREATE POLICY "amendments_select" ON contract_amendments FOR SELECT
  USING (
    proposer_id = (select auth.uid())
    OR approver_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_amendments.contract_id
        AND (c.worker_id = (select auth.uid()) OR c.company_id = (select auth.uid()))
    )
  );
CREATE POLICY "amendments_insert" ON contract_amendments FOR INSERT
  WITH CHECK (
    proposer_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_amendments.contract_id
        AND (c.worker_id = (select auth.uid()) OR c.company_id = (select auth.uid()))
    )
  );

-- contract_offers
CREATE POLICY "contract_offers_select" ON contract_offers FOR SELECT
  USING ((select auth.uid()) = proposer_id OR (select auth.uid()) = target_id);
CREATE POLICY "contract_offers_insert" ON contract_offers FOR INSERT
  WITH CHECK (
    (select auth.uid()) = proposer_id
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_offers.contract_id
        AND (c.worker_id = (select auth.uid()) OR c.company_id = (select auth.uid()))
    )
  );
CREATE POLICY "contract_offers_update" ON contract_offers FOR UPDATE
  USING ((select auth.uid()) = target_id OR (select auth.uid()) = proposer_id)
  WITH CHECK ((select auth.uid()) = target_id OR (select auth.uid()) = proposer_id);

-- contract_signature_envelopes
CREATE POLICY "sig_envelopes_select" ON contract_signature_envelopes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_signature_envelopes.contract_id
        AND (c.worker_id = (select auth.uid()) OR c.company_id = (select auth.uid()))
    )
  );

-- fraud_cases
CREATE POLICY "fraud_cases_select_parties_admin" ON fraud_cases FOR SELECT
  USING (
    worker_id = (select auth.uid())
    OR company_id = (select auth.uid())
    OR opened_by = (select auth.uid())
    OR is_admin()
  );

-- fraud_case_documents
CREATE POLICY "fraud_docs_select_parties" ON fraud_case_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fraud_cases fc
      WHERE fc.id = fraud_case_documents.case_id
        AND (fc.worker_id = (select auth.uid()) OR fc.company_id = (select auth.uid()) OR is_admin())
    )
  );
CREATE POLICY "fraud_docs_insert_parties" ON fraud_case_documents FOR INSERT
  WITH CHECK (
    uploaded_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM fraud_cases fc
      WHERE fc.id = fraud_case_documents.case_id
        AND (fc.worker_id = (select auth.uid()) OR fc.company_id = (select auth.uid()))
        AND fc.status = ANY (ARRAY['open'::fraud_case_status, 'investigating'::fraud_case_status])
    )
  );

-- account_deletion_requests
CREATE POLICY "account_deletion_select_own" ON account_deletion_requests FOR SELECT
  USING (user_id = (select auth.uid()));
CREATE POLICY "account_deletion_insert_own" ON account_deletion_requests FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- data_export_requests
CREATE POLICY "data_export_select_own" ON data_export_requests FOR SELECT
  USING (user_id = (select auth.uid()));
CREATE POLICY "data_export_insert_own" ON data_export_requests FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- beta_feedback
CREATE POLICY "beta_feedback_select_own_or_admin" ON beta_feedback FOR SELECT
  USING (
    user_id = (select auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role)
  );
CREATE POLICY "beta_feedback_insert_own" ON beta_feedback FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

-- disputes
CREATE POLICY "disputes_select_parties_or_admin" ON disputes FOR SELECT
  USING (
    opened_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = disputes.contract_id
        AND (c.worker_id = (select auth.uid()) OR c.company_id = (select auth.uid()))
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role)
  );
CREATE POLICY "disputes_insert_authenticated" ON disputes FOR INSERT
  WITH CHECK ((select auth.uid()) = opened_by);
CREATE POLICY "disputes_update_admin" ON disputes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role));

-- ─────────────────────────────────────────────────────────────────────────
-- Partie 3 : indexes sur les foreign keys (accélère JOIN et CASCADE)
-- ─────────────────────────────────────────────────────────────────────────

-- applications
CREATE INDEX IF NOT EXISTS idx_applications_mission_id ON applications(mission_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON applications(worker_id);

-- beta_feedback
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user_id ON beta_feedback(user_id);

-- contract_amendments
CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract_id ON contract_amendments(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_proposer_id ON contract_amendments(proposer_id);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_approver_id ON contract_amendments(approver_id);

-- contract_offers
CREATE INDEX IF NOT EXISTS idx_contract_offers_contract_id ON contract_offers(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_offers_proposer_id ON contract_offers(proposer_id);
CREATE INDEX IF NOT EXISTS idx_contract_offers_target_id ON contract_offers(target_id);

-- contract_signature_envelopes
CREATE INDEX IF NOT EXISTS idx_sig_envelopes_contract_id ON contract_signature_envelopes(contract_id);

-- contracts
CREATE INDEX IF NOT EXISTS idx_contracts_mission_id ON contracts(mission_id);
CREATE INDEX IF NOT EXISTS idx_contracts_worker_id ON contracts(worker_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);

-- disputes
CREATE INDEX IF NOT EXISTS idx_disputes_contract_id ON disputes(contract_id);
CREATE INDEX IF NOT EXISTS idx_disputes_opened_by ON disputes(opened_by);

-- favorites
CREATE INDEX IF NOT EXISTS idx_favorites_company_id ON favorites(company_id);
CREATE INDEX IF NOT EXISTS idx_favorites_worker_id ON favorites(worker_id);

-- fraud_case_documents
CREATE INDEX IF NOT EXISTS idx_fraud_docs_case_id ON fraud_case_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_fraud_docs_uploaded_by ON fraud_case_documents(uploaded_by);

-- fraud_cases
CREATE INDEX IF NOT EXISTS idx_fraud_cases_worker_id ON fraud_cases(worker_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_company_id ON fraud_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_opened_by ON fraud_cases(opened_by);
CREATE INDEX IF NOT EXISTS idx_fraud_cases_contract_id ON fraud_cases(contract_id);

-- fraud_signals (schema : user_id only)
CREATE INDEX IF NOT EXISTS idx_fraud_signals_user_id ON fraud_signals(user_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_worker_id ON invoices(worker_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON invoices(contract_id);

-- matching_scores
CREATE INDEX IF NOT EXISTS idx_matching_scores_mission_id ON matching_scores(mission_id);
CREATE INDEX IF NOT EXISTS idx_matching_scores_worker_id ON matching_scores(worker_id);

-- missions
CREATE INDEX IF NOT EXISTS idx_missions_company_id ON missions(company_id);
CREATE INDEX IF NOT EXISTS idx_missions_assigned_worker_id ON missions(assigned_worker_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- ratings
CREATE INDEX IF NOT EXISTS idx_ratings_rater_id ON ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rated_id ON ratings(rated_id);
CREATE INDEX IF NOT EXISTS idx_ratings_mission_id ON ratings(mission_id);

COMMIT;

-- ============================================================================
-- Notes
-- ============================================================================
-- On ne touche PAS aux policies déjà migrées vers `(select auth.uid())` :
--   - mission_time_entries.*
--   - worker_company_risk.*
--   - notifs_owner_or_admin (mais on l'a remplacée par notifications_owner)
--
-- Les indexes idx_* suivent la convention `idx_<table>_<column>` pour
-- qu'ils soient faciles à repérer lors d'un futur nettoyage.
-- ============================================================================
