-- ============================================================
-- TEMPO · Migration 013 · Colonnes KYC manquantes
-- Migration 007 n'avait pas été appliquée en production.
-- Le trigger protect_kyc_fields() référençait kyc_rejection_reason
-- qui n'existait pas → TOUS les UPDATE sur workers échouaient.
-- Symptôme : aucune donnée retenue après actualisation de la page.
-- ============================================================

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS siret_doc_url          TEXT,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason   TEXT;

COMMENT ON COLUMN workers.siret_doc_url         IS 'URL du justificatif SIRET dans Supabase Storage';
COMMENT ON COLUMN workers.kyc_submitted_at      IS 'Horodatage du premier dépôt KYC par le travailleur';
COMMENT ON COLUMN workers.kyc_rejection_reason  IS 'Raison du refus KYC saisie par l administrateur';

-- Recompiler le trigger pour qu'il prenne en compte les nouvelles colonnes
CREATE OR REPLACE FUNCTION protect_kyc_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  caller_role user_role;
BEGIN
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();

  IF caller_role IS DISTINCT FROM 'admin' THEN
    NEW.id_verified               := OLD.id_verified;
    NEW.siret_verified            := OLD.siret_verified;
    NEW.rc_pro_verified           := OLD.rc_pro_verified;
    NEW.kyc_completed_at          := OLD.kyc_completed_at;
    NEW.kyc_rejection_reason      := OLD.kyc_rejection_reason;
    NEW.stripe_account_id         := OLD.stripe_account_id;
    NEW.stripe_onboarding_complete := OLD.stripe_onboarding_complete;
    NEW.stripe_charges_enabled    := OLD.stripe_charges_enabled;
    NEW.stripe_payouts_enabled    := OLD.stripe_payouts_enabled;
  END IF;

  RETURN NEW;
END;
$$;
