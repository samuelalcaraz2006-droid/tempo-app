-- ============================================================
-- TEMPO · Migration 014 · Durcissement juridique des missions
--
-- Ajoute les champs nécessaires pour positionner chaque mission
-- comme une PRESTATION DE SERVICE B2B (et non du prêt de main-
-- d'œuvre) afin d'écarter les risques de :
--   - délit de marchandage (art. L.8231-1)
--   - prêt de main-d'œuvre illicite (art. L.8241-1)
--   - requalification en CDI (jurisprudence Uber/Deliveroo)
--
-- Nouveaux champs :
--   - objet_prestation      : description précise du livrable
--   - motif_recours         : raison légale du recours à l'indép.
--   - pricing_mode          : 'forfait' (recommandé) ou 'horaire'
--   - forfait_total         : montant total de la prestation
--   - legal_confirmation_at : horodatage du consentement éclairé
--                             de l'entreprise (preuve en cas de
--                             contrôle URSSAF / procédure).
-- ============================================================

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS objet_prestation       TEXT,
  ADD COLUMN IF NOT EXISTS motif_recours          TEXT,
  ADD COLUMN IF NOT EXISTS pricing_mode           TEXT
    CHECK (pricing_mode IN ('forfait', 'horaire')),
  ADD COLUMN IF NOT EXISTS forfait_total          NUMERIC(10,2)
    CHECK (forfait_total IS NULL OR forfait_total > 0),
  ADD COLUMN IF NOT EXISTS legal_confirmation_at  TIMESTAMPTZ;

COMMENT ON COLUMN missions.objet_prestation
  IS 'Description précise de la prestation attendue (livrable, pas heures). Requis pour nouvelles missions.';
COMMENT ON COLUMN missions.motif_recours
  IS 'Motif légal de recours à un indépendant (ex: accroissement_temporaire, remplacement, saisonnier, tache_ponctuelle, expertise_technique).';
COMMENT ON COLUMN missions.pricing_mode
  IS 'Mode de facturation : forfait (privilégié, évite le salariat déguisé) ou horaire (indicatif).';
COMMENT ON COLUMN missions.forfait_total
  IS 'Montant forfaitaire total de la prestation. Si null + pricing_mode=forfait, calculé à partir de hourly_rate * total_hours.';
COMMENT ON COLUMN missions.legal_confirmation_at
  IS 'Horodatage de la case cochée par l''entreprise attestant que la mission est bien une prestation ponctuelle et autonome. Preuve de diligence opposable.';

-- Les anciennes missions (avant migration) restent avec ces colonnes à NULL.
-- Les nouvelles seront forcées côté applicatif à remplir au moins :
-- objet_prestation, motif_recours, pricing_mode, legal_confirmation_at.
