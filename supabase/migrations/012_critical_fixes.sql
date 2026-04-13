-- ============================================================
-- TEMPO · Migration 012 · Corrections critiques
-- Corrige 8 bugs identifiés lors de l'audit DB ↔ client
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. FIX : notify_kyc_decision — champ title manquant (NOT NULL)
--    Bug : INSERT dans notifications sans 'title' → violation contrainte
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_kyc_decision(
  p_worker_id uuid,
  p_approved  boolean,
  p_reason    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, payload)
  VALUES (
    p_worker_id,
    CASE WHEN p_approved THEN 'kyc_validated' ELSE 'kyc_rejected' END,
    CASE WHEN p_approved
      THEN 'Identité vérifiée ✓'
      ELSE 'Dossier KYC refusé'
    END,
    CASE WHEN p_approved
      THEN 'Votre dossier KYC a été validé. Vous pouvez désormais accepter des missions.'
      ELSE COALESCE('Refus : ' || p_reason, 'Votre dossier KYC a été refusé. Contactez le support.')
    END,
    jsonb_build_object(
      'approved',    p_approved,
      'reason',      p_reason,
      'decided_at',  now()
    )
  );
END;
$$;

comment on function notify_kyc_decision is
  'Envoie une notification au travailleur après décision KYC (approbation ou rejet)';

-- ─────────────────────────────────────────────────────────────
-- 2. FIX : trigger contracts — appelait update_updated_at()
--    qui n'existe pas. Remplace par tempo_set_updated_at()
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_contracts_updated_at ON contracts;

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION tempo_set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. FIX : colonnes invoices manquantes (si migration 011 a
--    échoué en transaction à cause du bug trigger ci-dessus)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS mission_id   uuid       REFERENCES missions(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_hours  decimal(6,1);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_missions_assigned_worker
  ON missions(assigned_worker_id)
  WHERE assigned_worker_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. FIX : invoices.contract_id → nullable
--    handleCompleteMission crée une facture sans contract_id
--    (le contrat peut ne pas encore être signé à ce moment)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE invoices ALTER COLUMN contract_id DROP NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. FIX : contrainte UNIQUE sur contracts.mission_id
--    Nécessaire pour que l'upsert et les signatures soient fiables.
--    Une mission ne peut avoir qu'un seul contrat.
-- ─────────────────────────────────────────────────────────────
ALTER TABLE contracts
  ADD CONSTRAINT contracts_mission_id_unique UNIQUE (mission_id);

-- ─────────────────────────────────────────────────────────────
-- 6. Fonction helper is_admin()
--    SECURITY DEFINER : s'exécute avec les droits admin,
--    évite la récursion RLS sur la table profiles.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

comment on function is_admin is
  'Retourne true si l utilisateur courant a le rôle admin (bypasse RLS via SECURITY DEFINER)';

-- ─────────────────────────────────────────────────────────────
-- 7. FIX : RLS profiles — admin peut lire tous les profils
--    Avant : seul auth.uid() = id → admin voyait uniquement
--    son propre profil, liste utilisateurs vide.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles · admin lecture tous" ON profiles;

CREATE POLICY "profiles · admin lecture tous"
  ON profiles FOR SELECT
  USING (is_admin());

-- ─────────────────────────────────────────────────────────────
-- 8. FIX : RLS applications — entreprise peut mettre à jour
--    le statut de ses candidatures (accepter / refuser)
--    Avant : seul FOR SELECT existait pour les entreprises.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "applications · entreprise update statut" ON applications;

CREATE POLICY "applications · entreprise update statut"
  ON applications FOR UPDATE
  USING (
    mission_id IN (
      SELECT id FROM missions WHERE company_id = auth.uid()
    )
  )
  WITH CHECK (
    mission_id IN (
      SELECT id FROM missions WHERE company_id = auth.uid()
    )
  );
