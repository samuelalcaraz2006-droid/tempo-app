-- ============================================================================
-- Seed TEMPO — environnement de test
-- ============================================================================
--
-- Objectif : peupler un nouveau projet Supabase (ou reset un existant)
-- avec des données réalistes pour tester l'app de bout en bout, sans
-- faire les 40 clics manuels à chaque fois.
--
-- Couvre :
--   • 2 comptes de démo (1 worker "Léa Martin", 1 company "LogisTec Express")
--   • ~20 missions completed (historique)
--   • 4 missions open (pour tester la liste + candidature)
--   • 1 mission matched (pour tester le dashboard "mission en cours")
--   • 21 contracts signés + 20 invoices payées + 1 pending
--   • 40 ratings (20 worker↔company)
--   • 21 notifications pour chaque rôle
--
-- USAGE
--   1. Sur un Supabase projet vierge (ou après reset) :
--        psql "$SUPABASE_DB_URL" -f supabase/seed-test.sql
--   2. Les emails de connexion seront :
--        lea.martin@tempo-test.fr   / TempoTest2026!
--        jean.dupont@tempo-test.fr  / TempoTest2026!
--
-- ATTENTION
--   • N'exécute JAMAIS ce script en prod. Le prefix @tempo-test.fr
--     protège des collisions avec des vrais users mais ne dispense
--     pas de la vigilance.
--   • Le script utilise `session_replication_role = 'replica'` pour
--     bypasser les triggers `protect_kyc_fields`, `trg_invoice_number`,
--     et contraintes `future_date` / `time_entry_before_mission`.
--     Ces triggers servent la prod, pas les seeds.
-- ============================================================================

BEGIN;

-- Bypasse les triggers de protection (KYC, invoice_number auto, etc.)
SET LOCAL session_replication_role = 'replica';

-- Neutralise les triggers d'auto-calc factures (on fixe les montants à la main)
ALTER TABLE invoices DISABLE TRIGGER trg_invoices_auto_calculate;

-- ────────────────────────────────────────────────────────────
-- 0. Nettoyage — idempotent
-- ────────────────────────────────────────────────────────────

DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr'
);
DELETE FROM ratings WHERE rater_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr')
   OR rated_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM invoices WHERE worker_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr')
   OR company_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM contracts WHERE worker_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr')
   OR company_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM applications WHERE worker_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr')
   OR mission_id IN (SELECT id FROM missions WHERE company_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr'));
DELETE FROM missions WHERE company_id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM workers WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM companies WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@tempo-test.fr');
DELETE FROM auth.users WHERE email LIKE '%@tempo-test.fr';

-- ────────────────────────────────────────────────────────────
-- 1. Users auth.users (mot de passe = TempoTest2026!)
-- ────────────────────────────────────────────────────────────

-- UUIDs déterministes pour faciliter les re-seeds
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_user_meta_data, aud, role
) VALUES
  -- Worker : Léa Martin
  (
    '11111111-1111-1111-1111-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'lea.martin@tempo-test.fr',
    crypt('TempoTest2026!', gen_salt('bf')),
    now(), now() - interval '6 months', now(),
    jsonb_build_object(
      'role', 'travailleur',
      'first_name', 'Léa',
      'last_name', 'Martin'
    ),
    'authenticated', 'authenticated'
  ),
  -- Company : Jean Dupont (LogisTec Express)
  (
    '22222222-2222-2222-2222-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'jean.dupont@tempo-test.fr',
    crypt('TempoTest2026!', gen_salt('bf')),
    now(), now() - interval '8 months', now(),
    jsonb_build_object(
      'role', 'entreprise',
      'first_name', 'Jean',
      'last_name', 'Dupont',
      'company_name', 'LogisTec Express'
    ),
    'authenticated', 'authenticated'
  );

-- Le trigger handle_new_user crée normalement profiles/workers/companies.
-- Comme on est en session_replication_role=replica, on fait tout à la main.

-- ────────────────────────────────────────────────────────────
-- 2. profiles
-- ────────────────────────────────────────────────────────────

INSERT INTO profiles (id, email, role, first_name, last_name, created_at) VALUES
  ('11111111-1111-1111-1111-000000000001', 'lea.martin@tempo-test.fr',
   'travailleur', 'Léa', 'Martin', now() - interval '6 months'),
  ('22222222-2222-2222-2222-000000000001', 'jean.dupont@tempo-test.fr',
   'entreprise', 'Jean', 'Dupont', now() - interval '8 months');

-- ────────────────────────────────────────────────────────────
-- 3. Worker & Company
-- ────────────────────────────────────────────────────────────

INSERT INTO workers (
  id, first_name, last_name, city, siret, sectors,
  id_verified, siret_verified, rc_pro_verified,
  rating_avg, rating_count, missions_completed,
  skills, experience_years, is_available, created_at
) VALUES (
  '11111111-1111-1111-1111-000000000001',
  'Léa', 'Martin', 'Lyon',
  '79012345600015',
  ARRAY['logistique']::sector_type[],
  true, true, true,
  4.8, 18, 20,
  ARRAY['CACES R489 cat. 3', 'Préparation commandes', 'Manutention'],
  3, true,
  now() - interval '6 months'
);

INSERT INTO companies (
  id, name, siret, city, sector, contact_name, contact_phone,
  description, siret_verified, rating_avg, rating_count, missions_posted,
  created_at
) VALUES (
  '22222222-2222-2222-2222-000000000001',
  'LogisTec Express', '34056789100012', 'Meyzieu', 'logistique',
  'Jean Dupont', '+33 4 78 00 00 00',
  'Plateforme logistique 35 000 m² — spécialiste du pic saisonnier.',
  true, 4.6, 22, 25,
  now() - interval '8 months'
);

-- ────────────────────────────────────────────────────────────
-- 4. Missions
-- ────────────────────────────────────────────────────────────

-- 20 missions completed (historique 6 derniers mois)
INSERT INTO missions (
  id, company_id, title, sector, status, city,
  start_date, end_date, total_hours, hourly_rate,
  created_at, assigned_worker_id, description
)
SELECT
  gen_random_uuid(),
  '22222222-2222-2222-2222-000000000001',
  CASE (gs % 4)
    WHEN 0 THEN 'Préparation de commandes — pic saisonnier'
    WHEN 1 THEN 'Cariste CACES R489 cat. 3'
    WHEN 2 THEN 'Déchargement camions + rangement palettes'
    ELSE 'Inventaire + étiquetage e-commerce'
  END,
  'logistique'::sector_type,
  'completed'::mission_status,
  'Meyzieu',
  (now() - (gs || ' days')::interval - interval '8 hours')::timestamptz,
  (now() - (gs || ' days')::interval)::timestamptz,
  8, 14.5,
  now() - (gs || ' days')::interval - interval '2 days',
  '11111111-1111-1111-1111-000000000001',
  'Mission complétée — historique de test.'
FROM generate_series(7, 180, 9) AS gs;

-- 4 missions open (pour tester la liste côté worker + candidatures)
INSERT INTO missions (
  id, company_id, title, sector, status, city,
  start_date, total_hours, hourly_rate,
  created_at, description, urgency
) VALUES
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000001',
   'Renfort équipe logistique — soirée du jeudi',
   'logistique'::sector_type, 'open'::mission_status, 'Meyzieu',
   now() + interval '2 days', 6, 15.0,
   now() - interval '3 hours',
   'Déchargement 3 camions semi-remorques 18h-00h. Équipe soudée.',
   'normal'::mission_urgency),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000001',
   'Cariste CACES R489 cat. 3 — remplacement',
   'logistique'::sector_type, 'open'::mission_status, 'Meyzieu',
   now() + interval '1 day', 8, 16.0,
   now() - interval '8 hours',
   'Remplacement cariste sur ligne prépa. Contrat ponctuel.',
   'urgent'::mission_urgency),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000001',
   'Préparateur commandes e-commerce — semaine complète',
   'logistique'::sector_type, 'open'::mission_status, 'Meyzieu',
   now() + interval '5 days', 40, 14.0,
   now() - interval '1 day',
   'Pic e-commerce, 40h/semaine pendant 2 semaines.',
   'normal'::mission_urgency),
  (gen_random_uuid(), '22222222-2222-2222-2222-000000000001',
   'Inventaire annuel — nuit du samedi',
   'logistique'::sector_type, 'open'::mission_status, 'Meyzieu',
   now() + interval '9 days', 10, 17.5,
   now() - interval '2 days',
   'Inventaire complet du site. 22h-8h. Majoration nuit incluse.',
   'normal'::mission_urgency);

-- 1 mission matched (pour tester le panel "mission en cours" côté worker)
INSERT INTO missions (
  id, company_id, title, sector, status, city,
  start_date, total_hours, hourly_rate,
  assigned_worker_id, created_at, description
) VALUES (
  gen_random_uuid(),
  '22222222-2222-2222-2222-000000000001',
  'Cariste CACES 3 — Shift matin 8h-16h',
  'logistique'::sector_type, 'matched'::mission_status,
  'Meyzieu',
  now() + interval '1 day' + interval '8 hours',
  8, 16.0,
  '11111111-1111-1111-1111-000000000001',
  now() - interval '4 hours',
  'Ligne prépa + manutention caisses. 30 min de pause incluses.'
);

-- ────────────────────────────────────────────────────────────
-- 5. Applications (sur les missions open)
-- ────────────────────────────────────────────────────────────

-- Léa postule sur les 4 missions open avec matching scores variés
INSERT INTO applications (id, mission_id, worker_id, status, match_score, created_at)
SELECT gen_random_uuid(), m.id, '11111111-1111-1111-1111-000000000001',
       'pending'::application_status,
       (85 + (row_number() OVER ()) * 3)::int,
       now() - interval '1 hour'
FROM missions m
WHERE m.company_id = '22222222-2222-2222-2222-000000000001'
  AND m.status = 'open'::mission_status;

-- ────────────────────────────────────────────────────────────
-- 6. Contracts + Invoices (sur les missions completed)
-- ────────────────────────────────────────────────────────────

INSERT INTO contracts (id, mission_id, worker_id, company_id, status, created_at, worker_signed_at, company_signed_at)
SELECT gen_random_uuid(), m.id,
       m.assigned_worker_id, m.company_id,
       'active'::contract_status,
       m.created_at + interval '1 day',
       m.created_at + interval '1 day' + interval '2 hours',
       m.created_at + interval '1 day' + interval '3 hours'
FROM missions m
WHERE m.company_id = '22222222-2222-2222-2222-000000000001'
  AND m.status = 'completed'::mission_status;

-- 20 factures payées (match avec les 20 contracts)
INSERT INTO invoices (
  id, invoice_number, contract_id, mission_id,
  worker_id, company_id,
  amount_ht, amount_ttc, worker_payout,
  status, created_at, paid_at
)
SELECT
  gen_random_uuid(),
  'SEED-' || substring(c.id::text, 1, 8),
  c.id, c.mission_id, c.worker_id, c.company_id,
  116.00, 139.20, 116.00,
  'paid'::invoice_status,
  c.created_at + interval '2 days',
  c.created_at + interval '3 days'
FROM contracts c
WHERE c.company_id = '22222222-2222-2222-2222-000000000001';

-- ────────────────────────────────────────────────────────────
-- 7. Ratings
-- ────────────────────────────────────────────────────────────

-- Company → Worker (20 notes positives)
INSERT INTO ratings (id, mission_id, rater_id, rated_id, score, comment, created_at)
SELECT gen_random_uuid(), m.id,
       m.company_id, m.assigned_worker_id,
       5, 'Travail impeccable, ponctuelle, je recommande.',
       m.end_date + interval '1 hour'
FROM missions m
WHERE m.company_id = '22222222-2222-2222-2222-000000000001'
  AND m.status = 'completed'::mission_status;

-- Worker → Company (20 notes positives)
INSERT INTO ratings (id, mission_id, rater_id, rated_id, score, comment, created_at)
SELECT gen_random_uuid(), m.id,
       m.assigned_worker_id, m.company_id,
       5, 'Équipe accueillante, paiement rapide. À refaire.',
       m.end_date + interval '2 hours'
FROM missions m
WHERE m.company_id = '22222222-2222-2222-2222-000000000001'
  AND m.status = 'completed'::mission_status;

-- ────────────────────────────────────────────────────────────
-- 8. Notifications (21 pour chaque rôle)
-- ────────────────────────────────────────────────────────────

-- Worker (Léa)
INSERT INTO notifications (id, user_id, type, title, body, payload, read_at, created_at)
SELECT gen_random_uuid(),
       '11111111-1111-1111-1111-000000000001',
       'new_mission',
       'Nouvelle mission près de chez vous',
       'Cariste CACES 3 — Meyzieu, démarre demain 8h',
       jsonb_build_object('mission_id', (SELECT id FROM missions WHERE status='open' LIMIT 1)),
       NULL,
       now() - ((gs * 2) || ' hours')::interval
FROM generate_series(1, 21) AS gs;

-- Company (Jean)
INSERT INTO notifications (id, user_id, type, title, body, payload, read_at, created_at)
SELECT gen_random_uuid(),
       '22222222-2222-2222-2222-000000000001',
       CASE (gs % 3)
         WHEN 0 THEN 'application_received'
         WHEN 1 THEN 'mission_matched'
         ELSE 'invoice_paid'
       END,
       'Événement plateforme',
       'Mise à jour côté entreprise',
       '{}'::jsonb,
       CASE WHEN gs > 15 THEN now() ELSE NULL END,
       now() - ((gs * 3) || ' hours')::interval
FROM generate_series(1, 21) AS gs;

-- Réactivation des triggers désactivés
ALTER TABLE invoices ENABLE TRIGGER trg_invoices_auto_calculate;

COMMIT;

-- ────────────────────────────────────────────────────────────
-- Vérification (optionnel — à exécuter à part après seed)
-- ────────────────────────────────────────────────────────────
-- SELECT 'workers' t, count(*) FROM workers WHERE id::text LIKE '11111111%'
-- UNION ALL SELECT 'companies', count(*) FROM companies WHERE id::text LIKE '22222222%'
-- UNION ALL SELECT 'missions', count(*) FROM missions WHERE company_id::text LIKE '22222222%'
-- UNION ALL SELECT 'applications', count(*) FROM applications WHERE worker_id::text LIKE '11111111%'
-- UNION ALL SELECT 'contracts', count(*) FROM contracts WHERE company_id::text LIKE '22222222%'
-- UNION ALL SELECT 'invoices', count(*) FROM invoices WHERE company_id::text LIKE '22222222%'
-- UNION ALL SELECT 'ratings', count(*) FROM ratings WHERE rater_id::text LIKE '11111111%' OR rated_id::text LIKE '11111111%'
-- UNION ALL SELECT 'notifications', count(*) FROM notifications WHERE user_id::text LIKE '11111111%' OR user_id::text LIKE '22222222%';
