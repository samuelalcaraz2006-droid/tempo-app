-- ============================================================
-- TEMPO · Migration 015 · Admin peut lire tous les profiles
--
-- Contexte : le God Mode affichait des listes vides ou des emails
-- null parce que la RLS sur `profiles` n'autorise que la lecture
-- de son propre profil. Les joins `companies(profiles(email))` et
-- `workers(profiles(email))` renvoyaient donc `null` côté client.
--
-- Fix : ajouter une policy qui autorise les admins à lire tous les
-- profiles, cohérent avec les autres bypasses admin existants.
--
-- Point d'attention : une policy qui interroge directement
-- `profiles` pour déterminer si le caller est admin déclencherait
-- une RÉCURSION INFINIE (la policy se rappelle elle-même sur son
-- propre SELECT). Pour éviter ça on passe par une fonction
-- SECURITY DEFINER qui bypasse la RLS pour ce lookup.
-- ============================================================

-- Fonction utilitaire : renvoie true si l'utilisateur courant est
-- admin. Exécutée avec les droits du propriétaire (owner =
-- superuser en local, rôle postgres en Supabase) donc la requête
-- interne ne repasse pas par la RLS de `profiles` → pas de boucle.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
$$;

COMMENT ON FUNCTION public.is_admin()
  IS 'Retourne true si l''appelant est admin. SECURITY DEFINER pour contourner la RLS profiles (évite récursion infinie).';

-- Policy séparée du "profiles · lecture propre" existant. Les deux
-- coexistent : on peut lire son profil, ET si on est admin on peut
-- aussi lire les autres.
DROP POLICY IF EXISTS "profiles · lecture admin" ON profiles;
CREATE POLICY "profiles · lecture admin"
  ON profiles FOR SELECT
  USING (public.is_admin());

COMMENT ON POLICY "profiles · lecture admin" ON profiles
  IS 'Autorise les admins à lire tous les profils (God Mode, support).';
