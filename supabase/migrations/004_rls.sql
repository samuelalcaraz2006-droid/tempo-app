-- ============================================================
-- TEMPO · Migration 004 · Sécurité (RLS)
-- Dépend de : 002_tables.sql
-- ============================================================
-- Row Level Security : chaque utilisateur ne voit et ne modifie
-- que les données auxquelles il a le droit d'accéder.
-- ============================================================

-- ─────────────────────────────────────────
-- Activer RLS sur toutes les tables
-- ─────────────────────────────────────────
alter table profiles        enable row level security;
alter table workers         enable row level security;
alter table companies       enable row level security;
alter table missions        enable row level security;
alter table applications    enable row level security;
alter table contracts       enable row level security;
alter table invoices        enable row level security;
alter table ratings         enable row level security;
alter table matching_scores enable row level security;
alter table notifications   enable row level security;
alter table favorites       enable row level security;

-- ─────────────────────────────────────────
-- PROFILES
-- Chaque utilisateur gère uniquement son propre profil
-- ─────────────────────────────────────────
create policy "profiles · lecture propre"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles · création propre"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles · modification propre"
  on profiles for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────
-- WORKERS
-- Profil public en lecture (nécessaire pour le matching)
-- Modification uniquement par le propriétaire
-- ─────────────────────────────────────────
create policy "workers · lecture publique"
  on workers for select
  using (true);

create policy "workers · création propre"
  on workers for insert
  with check (auth.uid() = id);

create policy "workers · modification propre"
  on workers for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────
-- COMPANIES
-- Profil public en lecture
-- Modification uniquement par le propriétaire
-- ─────────────────────────────────────────
create policy "companies · lecture publique"
  on companies for select
  using (true);

create policy "companies · création propre"
  on companies for insert
  with check (auth.uid() = id);

create policy "companies · modification propre"
  on companies for update
  using (auth.uid() = id);

-- ─────────────────────────────────────────
-- MISSIONS
-- Toutes les missions "open" sont visibles par les travailleurs
-- Les brouillons (draft) ne sont visibles que par l'entreprise propriétaire
-- ─────────────────────────────────────────
create policy "missions · lecture ouverte"
  on missions for select
  using (
    status != 'draft'
    or company_id = auth.uid()
  );

create policy "missions · création par entreprise"
  on missions for insert
  with check (company_id = auth.uid());

create policy "missions · modification par propriétaire"
  on missions for update
  using (company_id = auth.uid());

-- ─────────────────────────────────────────
-- APPLICATIONS (candidatures)
-- Le travailleur voit et gère ses propres candidatures
-- L'entreprise voit les candidatures de ses missions
-- ─────────────────────────────────────────
create policy "applications · travailleur gère les siennes"
  on applications for all
  using (worker_id = auth.uid());

create policy "applications · entreprise voit celles de ses missions"
  on applications for select
  using (
    mission_id in (
      select id from missions where company_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- CONTRACTS
-- Accessible uniquement aux deux parties du contrat
-- ─────────────────────────────────────────
create policy "contracts · parties concernées uniquement"
  on contracts for all
  using (
    worker_id  = auth.uid()
    or company_id = auth.uid()
  );

-- ─────────────────────────────────────────
-- INVOICES
-- Accessible uniquement aux deux parties de la facture
-- ─────────────────────────────────────────
create policy "invoices · parties concernées uniquement"
  on invoices for all
  using (
    worker_id  = auth.uid()
    or company_id = auth.uid()
  );

-- ─────────────────────────────────────────
-- RATINGS
-- Toutes les notes publiques sont lisibles
-- Seul l'auteur peut créer sa note
-- ─────────────────────────────────────────
create policy "ratings · lecture publique"
  on ratings for select
  using (is_public = true);

create policy "ratings · lecture propre (notes privées)"
  on ratings for select
  using (rater_id = auth.uid() or rated_id = auth.uid());

create policy "ratings · création par l auteur"
  on ratings for insert
  with check (rater_id = auth.uid());

-- ─────────────────────────────────────────
-- MATCHING SCORES
-- Lecture autorisée pour tout utilisateur connecté
-- Écriture réservée (gérée côté serveur uniquement)
-- ─────────────────────────────────────────
create policy "matching_scores · lecture connectée"
  on matching_scores for select
  using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- Chaque utilisateur voit et gère uniquement les siennes
-- ─────────────────────────────────────────
create policy "notifications · propriétaire uniquement"
  on notifications for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────
-- FAVORITES
-- Chaque entreprise gère ses propres favoris
-- ─────────────────────────────────────────
create policy "favorites · entreprise propriétaire"
  on favorites for all
  using (company_id = auth.uid());
