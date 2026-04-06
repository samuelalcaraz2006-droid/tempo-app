-- ============================================================
-- TEMPO · Migration 005 · Création automatique du profil
-- Dépend de : 002_tables.sql, 003_functions.sql
-- ============================================================
-- Quand un utilisateur s'inscrit via Supabase Auth,
-- ce trigger crée automatiquement son profil et ses données
-- de rôle dans nos tables, sans passer par le client.
-- ============================================================

create or replace function tempo_handle_new_user()
returns trigger
language plpgsql
security definer                      -- S'exécute avec les droits admin, pas RLS
set search_path = public
as $$
declare
  user_role_value user_role;
  user_first_name text;
  user_last_name  text;
  user_company    text;
begin
  -- Lire le rôle depuis les métadonnées d'inscription
  user_role_value := (new.raw_user_meta_data->>'role')::user_role;
  user_first_name := coalesce(new.raw_user_meta_data->>'first_name', '');
  user_last_name  := coalesce(new.raw_user_meta_data->>'last_name', '');
  user_company    := coalesce(new.raw_user_meta_data->>'company_name', '');

  -- Si pas de rôle fourni, on ignore (compte admin créé manuellement)
  if user_role_value is null then
    return new;
  end if;

  -- Créer le profil de base
  insert into public.profiles (id, email, role)
  values (new.id, new.email, user_role_value);

  -- Créer le profil spécifique au rôle
  if user_role_value = 'travailleur' then
    insert into public.workers (id, first_name, last_name)
    values (new.id, user_first_name, user_last_name);

  elsif user_role_value = 'entreprise' then
    insert into public.companies (id, name, contact_name)
    values (
      new.id,
      user_company,
      trim(user_first_name || ' ' || user_last_name)
    );
  end if;

  return new;
end;
$$;

comment on function tempo_handle_new_user is
  'Crée automatiquement le profil TEMPO quand un utilisateur s inscrit';

-- Déclenché à chaque nouvel utilisateur dans auth.users
create trigger trg_auth_new_user
  after insert on auth.users
  for each row execute function tempo_handle_new_user();
