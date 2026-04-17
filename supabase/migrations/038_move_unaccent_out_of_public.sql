-- ============================================================================
-- Migration 038 — Déplacer l'extension unaccent hors du schéma public
-- ============================================================================
-- L'advisor "extension_in_public" signalait que l'extension unaccent (créée
-- en 001_types.sql) résidait dans le schéma public. Convention Supabase :
-- les extensions doivent être installées dans un schéma dédié `extensions`
-- pour éviter les collisions avec les objets applicatifs.
--
-- Vérifié avant migration : aucune fonction applicative ni index ne référence
-- unaccent() dans ce projet. Déplacer l'extension est donc sans impact.
-- ============================================================================

ALTER EXTENSION unaccent SET SCHEMA extensions;
