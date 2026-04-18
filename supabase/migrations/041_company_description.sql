-- ============================================================================
-- Migration 041 — description éditable pour les entreprises
-- ============================================================================
-- Ajoute une colonne `description` text (max 500 caractères) pour permettre
-- aux entreprises de personnaliser leur carte de visite publique.
-- Limite : court et non social (pas de bio kilométrique).
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_description_length'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_description_length
      CHECK (description IS NULL OR char_length(description) <= 500);
  END IF;
END $$;

COMMENT ON COLUMN companies.description IS
  'Courte présentation publique de l''entreprise. Max 500 caractères. Affichée sur la carte de visite publique.';
