-- ============================================================================
-- Migration 044b — Dédup policy ratings_select
-- ============================================================================
-- Dernière permissive_policies restante après 044 : ratings avait 2 policies
-- qui se chevauchaient sur SELECT :
--   - ratings_select : (rater_id = auth.uid()) OR (rated_id = auth.uid())
--   - ratings_select_all : true (lecture publique)
--
-- Les 2 en OR = overhead pur. On garde ratings_select_all car les profils
-- publics (PublicWorkerProfile, PublicCompanyProfile) affichent les 3 derniers
-- avis à n'importe quel viewer. Les ratings sont publics par design dans
-- un système de trust — c'est le point d'un review.
--
-- Sécurité : on ne durcit PAS l'accès — ratings_select_all permettait déjà
-- la lecture publique. On élimine juste la policy redondante.
-- ============================================================================

DROP POLICY IF EXISTS "ratings_select" ON ratings;
