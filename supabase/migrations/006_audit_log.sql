-- ── Journal d'audit ───────────────────────────────────────────────────────────
-- Enregistre les actions administratives sensibles (validation KYC, etc.)
-- Immuable : pas de UPDATE ni DELETE autorisés

create table audit_log (
  id          uuid        primary key default uuid_generate_v4(),
  actor_id    uuid        not null references auth.users(id),
  action      text        not null,
  target_id   uuid,
  target_type text,
  payload     jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

comment on table audit_log is 'Journal immuable des actions administratives TEMPO';

create index idx_audit_log_actor  on audit_log(actor_id, created_at desc);
create index idx_audit_log_target on audit_log(target_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table audit_log enable row level security;

-- Lecture réservée aux administrateurs
create policy "audit_log · admin read"
  on audit_log for select
  using (
    auth.uid() in (
      select id from profiles where role = 'admin'
    )
  );

-- Insert : l'actor_id doit correspondre à l'utilisateur courant
-- (empêche de forger des entrées au nom d'autrui)
create policy "audit_log · insert self"
  on audit_log for insert
  with check (actor_id = auth.uid());
