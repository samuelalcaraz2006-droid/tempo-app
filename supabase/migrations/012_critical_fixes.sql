-- ============================================================
-- TEMPO · Migration 012 · Correctifs critiques
-- Corrige 10 bugs bloquants identifiés lors de l'audit complet
-- ============================================================

-- ─────────────────────────────────────────
-- FIX 1 : Contrainte UNIQUE sur contracts(mission_id)
-- Requis pour que l'upsert onConflict:'mission_id' fonctionne
-- ─────────────────────────────────────────
ALTER TABLE contracts ADD CONSTRAINT contracts_mission_id_key UNIQUE (mission_id);

-- ─────────────────────────────────────────
-- FIX 2 : Rendre contract_id nullable dans invoices
-- completeMission crée une facture sans contractId — la FK NOT NULL
-- empêchait toute création de facture
-- ─────────────────────────────────────────
ALTER TABLE invoices ALTER COLUMN contract_id DROP NOT NULL;

-- ─────────────────────────────────────────
-- FIX 3 : Colonne cancellation_reason sur missions
-- cancelMission écrasait la description avec la raison d'annulation
-- ─────────────────────────────────────────
ALTER TABLE missions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- ─────────────────────────────────────────
-- FIX 4 : RLS — entreprise peut mettre à jour le statut des candidatures
-- Sans cette policy, updateApplicationStatus() retournait 0 lignes
-- ─────────────────────────────────────────
CREATE POLICY "applications · entreprise peut mettre a jour le statut"
  ON applications FOR UPDATE
  USING (
    mission_id IN (SELECT id FROM missions WHERE company_id = auth.uid())
  )
  WITH CHECK (
    mission_id IN (SELECT id FROM missions WHERE company_id = auth.uid())
  );

-- ─────────────────────────────────────────
-- FIX 5 : RLS — admin peut modifier les workers (KYC)
-- Sans cette policy, approveKycField/rejectKyc échouaient silencieusement
-- ─────────────────────────────────────────
CREATE POLICY "workers · admin peut modifier"
  ON workers FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─────────────────────────────────────────
-- FIX 6 : notify_kyc_decision — ajouter le champ title (NOT NULL)
-- L'ancienne version n'incluait pas title → erreur NOT NULL à chaque décision KYC
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION notify_kyc_decision(
  p_worker_id uuid,
  p_approved  boolean,
  p_reason    text default null
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
    CASE WHEN p_approved THEN 'KYC validé — compte actif' ELSE 'KYC refusé — action requise' END,
    CASE
      WHEN p_approved THEN 'Votre identité a été vérifiée. Vous pouvez désormais postuler à des missions.'
      ELSE COALESCE('Raison : ' || p_reason, 'Vos documents ont été refusés. Veuillez les soumettre à nouveau.')
    END,
    jsonb_build_object(
      'approved',    p_approved,
      'reason',      p_reason,
      'decided_at',  now()
    )
  );
END;
$$;

-- ─────────────────────────────────────────
-- INDEX supplémentaire pour la performance
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contracts_mission_id ON contracts(mission_id);
CREATE INDEX IF NOT EXISTS idx_invoices_mission_id  ON invoices(mission_id);
