-- ============================================================================
-- Migration 037 — Restreindre le listing du bucket message-attachments
-- ============================================================================
-- L'advisor "public_bucket_allows_listing" signalait que la policy
-- "message-attachments read authenticated" sur storage.objects autorisait
-- tous les utilisateurs authentifiés à lister l'intégralité du bucket.
--
-- Le bucket reste public → les URLs publiques (getPublicUrl) fonctionnent
-- toujours car elles ne passent pas par RLS. Ce qui est bloqué : le listing
-- global du bucket par n'importe quel client authentifié.
-- ============================================================================

DROP POLICY IF EXISTS "message-attachments read authenticated" ON storage.objects;
