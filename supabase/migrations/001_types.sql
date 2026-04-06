-- ============================================================
-- TEMPO · Migration 001 · Extensions & Types
-- À exécuter en premier, une seule fois
-- ============================================================

-- Extensions PostgreSQL nécessaires
create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";

-- ─────────────────────────────────────────
-- TYPES ÉNUMÉRÉS
-- Chaque type est déclaré une seule fois ici
-- ─────────────────────────────────────────

create type user_role as enum (
  'travailleur',
  'entreprise',
  'admin'
);

create type user_status as enum (
  'pending',
  'verified',
  'suspended',
  'banned'
);

create type sector_type as enum (
  'logistique',
  'btp',
  'industrie',
  'hotellerie',
  'proprete'
);

create type subscription_plan as enum (
  'free',
  'basic',
  'pro'
);

create type mission_status as enum (
  'draft',
  'open',
  'matched',
  'active',
  'completed',
  'cancelled'
);

create type urgency_level as enum (
  'normal',
  'urgent',
  'immediate'
);

create type application_status as enum (
  'pending',
  'accepted',
  'rejected',
  'withdrawn'
);

create type contract_status as enum (
  'draft',
  'sent',
  'signed_worker',
  'signed_company',
  'active',
  'completed',
  'disputed'
);

create type invoice_status as enum (
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);

create type rater_role as enum (
  'worker',
  'company'
);

create type notif_type as enum (
  'new_mission',
  'mission_matched',
  'application_received',
  'application_accepted',
  'application_rejected',
  'contract_generated',
  'contract_signed',
  'payment_received',
  'payment_sent',
  'rating_received',
  'kyc_validated',
  'kyc_rejected',
  'ca_threshold_alert',
  'mission_reminder'
);
