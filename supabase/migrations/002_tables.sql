-- ============================================================
-- TEMPO · Migration 002 · Tables
-- Dépend de : 001_types.sql
-- ============================================================

-- ─────────────────────────────────────────
-- PROFILS (lié au système d'auth Supabase)
-- ─────────────────────────────────────────
create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        user_role   not null,
  email       text        not null unique,
  phone       text,
  status      user_status not null default 'pending',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table profiles is 'Profil de base commun à tous les utilisateurs TEMPO';

-- ─────────────────────────────────────────
-- TRAVAILLEURS
-- ─────────────────────────────────────────
create table workers (
  id                   uuid          primary key references profiles(id) on delete cascade,
  first_name           text          not null default '',
  last_name            text          not null default '',
  siret                text          unique,
  siret_verified       boolean       not null default false,
  city                 text,
  lat                  decimal(10,7),
  lng                  decimal(10,7),
  radius_km            integer       not null default 10,
  is_available         boolean       not null default false,
  sectors              sector_type[],
  skills               text[],
  certifications       jsonb         not null default '[]',
  rc_pro_url           text,
  rc_pro_expiry        date,
  rc_pro_verified      boolean       not null default false,
  id_doc_url           text,
  id_verified          boolean       not null default false,
  kyc_completed_at     timestamptz,
  rating_avg           decimal(3,2)  not null default 0,
  rating_count         integer       not null default 0,
  missions_completed   integer       not null default 0,
  missions_cancelled   integer       not null default 0,
  ca_ytd               decimal(12,2) not null default 0,
  ca_threshold_alerted boolean       not null default false,
  hourly_rate_min      decimal(6,2),
  bio                  text,
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

comment on table workers is 'Données spécifiques aux travailleurs auto-entrepreneurs';
comment on column workers.ca_ytd is 'Chiffre d affaires cumulé depuis le 1er janvier';
comment on column workers.certifications is 'JSON : [{name, expires_at, verified, url}]';

-- ─────────────────────────────────────────
-- ENTREPRISES
-- ─────────────────────────────────────────
create table companies (
  id                 uuid              primary key references profiles(id) on delete cascade,
  name               text              not null default '',
  siret              text              unique,
  siret_verified     boolean           not null default false,
  address            text,
  city               text,
  lat                decimal(10,7),
  lng                decimal(10,7),
  sector             sector_type,
  contact_name       text,
  contact_phone      text,
  subscription_plan  subscription_plan not null default 'free',
  subscription_ends  timestamptz,
  stripe_customer_id text,
  rating_avg         decimal(3,2)      not null default 0,
  rating_count       integer           not null default 0,
  missions_posted    integer           not null default 0,
  missions_completed integer           not null default 0,
  created_at         timestamptz       not null default now(),
  updated_at         timestamptz       not null default now()
);

comment on table companies is 'Données spécifiques aux entreprises clientes';

-- ─────────────────────────────────────────
-- MISSIONS
-- ─────────────────────────────────────────
create table missions (
  id                 uuid           primary key default uuid_generate_v4(),
  company_id         uuid           not null references companies(id) on delete cascade,
  title              text           not null,
  sector             sector_type    not null,
  description        text,
  required_skills    text[],
  required_certs     text[],
  hourly_rate        decimal(8,2)   not null check (hourly_rate > 0),
  total_hours        decimal(6,1)   check (total_hours > 0),
  start_date         timestamptz    not null,
  end_date           timestamptz,
  address            text,
  city               text           not null,
  lat                decimal(10,7),
  lng                decimal(10,7),
  status             mission_status not null default 'open',
  urgency            urgency_level  not null default 'normal',
  assigned_worker_id uuid           references workers(id),
  published_at       timestamptz    not null default now(),
  matched_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz    not null default now(),
  updated_at         timestamptz    not null default now(),
  constraint end_after_start check (end_date is null or end_date > start_date)
);

comment on table missions is 'Missions publiées par les entreprises';

-- ─────────────────────────────────────────
-- CANDIDATURES
-- ─────────────────────────────────────────
create table applications (
  id           uuid               primary key default uuid_generate_v4(),
  mission_id   uuid               not null references missions(id) on delete cascade,
  worker_id    uuid               not null references workers(id) on delete cascade,
  status       application_status not null default 'pending',
  match_score  integer            check (match_score between 0 and 100),
  applied_at   timestamptz        not null default now(),
  responded_at timestamptz,
  unique (mission_id, worker_id)
);

comment on table applications is 'Candidatures des travailleurs aux missions';

-- ─────────────────────────────────────────
-- CONTRATS
-- ─────────────────────────────────────────
create table contracts (
  id                uuid            primary key default uuid_generate_v4(),
  mission_id        uuid            not null references missions(id),
  worker_id         uuid            not null references workers(id),
  company_id        uuid            not null references companies(id),
  pdf_url           text,
  total_hours       decimal(6,1),
  hourly_rate       decimal(8,2),
  total_amount_ht   decimal(10,2),
  commission_rate   decimal(4,2)    not null default 8.0,
  commission_amount decimal(10,2),
  status            contract_status not null default 'draft',
  signed_worker_at  timestamptz,
  signed_company_at timestamptz,
  created_at        timestamptz     not null default now()
);

comment on table contracts is 'Contrats de prestation auto-générés par TEMPO';
comment on column contracts.commission_rate is 'Taux de commission TEMPO en pourcentage (défaut 8%)';

-- ─────────────────────────────────────────
-- FACTURES
-- ─────────────────────────────────────────
create table invoices (
  id                 uuid           primary key default uuid_generate_v4(),
  contract_id        uuid           not null references contracts(id),
  worker_id          uuid           not null references workers(id),
  company_id         uuid           not null references companies(id),
  invoice_number     text           not null unique,
  amount_ht          decimal(10,2)  not null check (amount_ht >= 0),
  amount_ttc         decimal(10,2)  not null check (amount_ttc >= 0),
  commission         decimal(10,2)  not null check (commission >= 0),
  worker_payout      decimal(10,2)  not null check (worker_payout >= 0),
  status             invoice_status not null default 'draft',
  stripe_payment_id  text,
  stripe_transfer_id text,
  due_date           timestamptz,
  paid_at            timestamptz,
  payout_at          timestamptz,
  created_at         timestamptz    not null default now()
);

comment on table invoices is 'Factures émises par TEMPO en tant que mandataire';
comment on column invoices.worker_payout is 'Montant net reversé au travailleur';

-- ─────────────────────────────────────────
-- ÉVALUATIONS (bidirectionnelles)
-- ─────────────────────────────────────────
create table ratings (
  id           uuid        primary key default uuid_generate_v4(),
  mission_id   uuid        not null references missions(id),
  rater_id     uuid        not null references profiles(id),
  rated_id     uuid        not null references profiles(id),
  rater_role   rater_role  not null,
  score        integer     not null check (score between 1 and 5),
  score_detail jsonb,
  comment      text,
  is_public    boolean     not null default true,
  created_at   timestamptz not null default now(),
  unique (mission_id, rater_id)
);

comment on table ratings is 'Notes bidirectionnelles travailleur <-> entreprise';
comment on column ratings.score_detail is 'JSON : {ponctualite, qualite, comportement, competence}';

-- ─────────────────────────────────────────
-- SCORES DE MATCHING IA
-- ─────────────────────────────────────────
create table matching_scores (
  id               uuid        primary key default uuid_generate_v4(),
  mission_id       uuid        not null references missions(id) on delete cascade,
  worker_id        uuid        not null references workers(id) on delete cascade,
  total_score      integer     not null check (total_score between 0 and 100),
  score_skills     integer     check (score_skills between 0 and 100),
  score_rating     integer     check (score_rating between 0 and 100),
  score_distance   integer     check (score_distance between 0 and 100),
  score_history    integer     check (score_history between 0 and 100),
  score_avail      integer     check (score_avail between 0 and 100),
  score_reactivity integer     check (score_reactivity between 0 and 100),
  breakdown        jsonb,
  computed_at      timestamptz not null default now(),
  unique (mission_id, worker_id)
);

comment on table matching_scores is 'Scores de compatibilité calculés par l algorithme IA';

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
create table notifications (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       notif_type  not null,
  title      text        not null,
  body       text,
  payload    jsonb       not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

comment on table notifications is 'Notifications in-app envoyées aux utilisateurs';

-- ─────────────────────────────────────────
-- FAVORIS (entreprise → travailleur)
-- ─────────────────────────────────────────
create table favorites (
  company_id uuid        not null references companies(id) on delete cascade,
  worker_id  uuid        not null references workers(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, worker_id)
);

comment on table favorites is 'Travailleurs favoris d une entreprise, rappelés en priorité';

-- ─────────────────────────────────────────
-- INDEX pour les performances
-- ─────────────────────────────────────────
create index idx_missions_status       on missions(status);
create index idx_missions_sector       on missions(sector);
create index idx_missions_company      on missions(company_id);
create index idx_applications_mission  on applications(mission_id);
create index idx_applications_worker   on applications(worker_id);
create index idx_notifications_user    on notifications(user_id, created_at desc);
create index idx_workers_available     on workers(is_available) where is_available = true;
create index idx_invoices_worker       on invoices(worker_id);
create index idx_invoices_company      on invoices(company_id);
