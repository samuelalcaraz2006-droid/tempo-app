-- ============================================================
-- TEMPO · Migration 011 · Messages table + schema fixes
-- Dépend de : 002_tables.sql, 008_stripe_connect.sql
-- ============================================================

-- ─────────────────────────────────────────
-- 1. TABLE MESSAGES (chat entre utilisateurs)
-- ─────────────────────────────────────────
create table if not exists messages (
  id          uuid        primary key default uuid_generate_v4(),
  sender_id   uuid        not null references profiles(id) on delete cascade,
  receiver_id uuid        not null references profiles(id) on delete cascade,
  mission_id  uuid        references missions(id) on delete set null,
  content     text        not null check (char_length(content) <= 2000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

comment on table messages is 'Messages de chat entre travailleurs et entreprises';

create index if not exists idx_messages_sender on messages(sender_id, created_at desc);
create index if not exists idx_messages_receiver on messages(receiver_id, created_at desc);
create index if not exists idx_messages_mission on messages(mission_id);

-- RLS
alter table messages enable row level security;

-- Les utilisateurs voient leurs propres messages (envoyes ou recus)
create policy "messages_select_own" on messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Les utilisateurs peuvent envoyer des messages
create policy "messages_insert_own" on messages
  for insert with check (auth.uid() = sender_id);

-- Les utilisateurs peuvent marquer comme lu les messages recus
create policy "messages_update_read" on messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Activer realtime pour les messages
alter publication supabase_realtime add table messages;

-- ─────────────────────────────────────────
-- 2. FIX: Ajouter updated_at aux contracts
-- ─────────────────────────────────────────
alter table contracts add column if not exists updated_at timestamptz default now();

-- Trigger updated_at pour contracts
drop trigger if exists trg_contracts_updated_at on contracts;
create trigger trg_contracts_updated_at
  before update on contracts
  for each row execute function update_updated_at();

-- ─────────────────────────────────────────
-- 4. FIX: Ajouter mission_id a invoices (FK)
-- ─────────────────────────────────────────
alter table invoices add column if not exists mission_id uuid references missions(id);
alter table invoices add column if not exists total_hours decimal(6,1);

-- ─────────────────────────────────────────
-- 5. INDEX manquants pour la performance
-- ─────────────────────────────────────────
create index if not exists idx_invoices_status on invoices(status);
create index if not exists idx_missions_assigned_worker on missions(assigned_worker_id) where assigned_worker_id is not null;

-- ─────────────────────────────────────────
-- 6. FIX: Mettre a jour le trigger auto_profile
-- pour sauver phone, siret, city, radius_km a l'inscription
-- ─────────────────────────────────────────
create or replace function tempo_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role_value user_role;
  user_first_name text;
  user_last_name  text;
  user_company    text;
  user_phone      text;
  user_siret      text;
  user_city       text;
  user_radius     integer;
begin
  user_role_value := (new.raw_user_meta_data->>'role')::user_role;
  user_first_name := coalesce(new.raw_user_meta_data->>'first_name', '');
  user_last_name  := coalesce(new.raw_user_meta_data->>'last_name', '');
  user_company    := coalesce(new.raw_user_meta_data->>'company_name', '');
  user_phone      := new.raw_user_meta_data->>'phone';
  user_siret      := new.raw_user_meta_data->>'siret';
  user_city       := new.raw_user_meta_data->>'city';
  user_radius     := coalesce((new.raw_user_meta_data->>'radius_km')::integer, 10);

  if user_role_value is null then
    return new;
  end if;

  insert into public.profiles (id, email, role, phone)
  values (new.id, new.email, user_role_value, user_phone);

  if user_role_value = 'travailleur' then
    insert into public.workers (id, first_name, last_name, siret, city, radius_km)
    values (new.id, user_first_name, user_last_name, nullif(user_siret, ''), user_city, user_radius);

  elsif user_role_value = 'entreprise' then
    insert into public.companies (id, name, contact_name, siret)
    values (
      new.id,
      user_company,
      trim(user_first_name || ' ' || user_last_name),
      nullif(user_siret, '')
    );
  end if;

  return new;
end;
$$;
