# TEMPO — Plateforme de missions temporaires

TEMPO met en relation des **entreprises** avec des **travailleurs indépendants** pour des missions courtes, directement depuis un navigateur web. La plateforme gère l'intégralité du cycle : publication de mission, candidature, matching automatique, signature de contrat, messagerie, facturation et évaluation.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Installation locale](#installation-locale)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Tests E2E](#tests-e2e)
- [Déploiement](#déploiement)
- [Structure du projet](#structure-du-projet)
- [Licence](#licence)

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18.2 + Vite 5 |
| Backend / BDD | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Cartes | Leaflet 1.9 / React Leaflet 4.2 |
| Animations | Framer Motion 11 |
| Icônes | Lucide React |
| Tests E2E | Playwright 1.59 |
| Déploiement | Vercel |
| PWA | Service Worker + Web Push |

---

## Architecture

L'application repose sur un **système de rôles à trois niveaux** géré par Supabase Auth :

```
┌─────────────────────────────────────────────────────────┐
│                        React SPA                        │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐  │
│  │ TravailleurApp│ │ EntrepriseApp│ │    AdminApp     │  │
│  └──────┬───────┘ └──────┬───────┘ └────────┬────────┘  │
│         └────────────────┼──────────────────┘           │
│                          │ AuthContext (rôle)            │
└──────────────────────────┼──────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Supabase   │
                    │  Auth + RLS │
                    │  Realtime   │
                    │  Storage    │
                    └─────────────┘
```

- **Travailleurs** : candidatent aux missions, gèrent leur profil et leurs documents KYC
- **Entreprises** : publient des missions, gèrent les candidatures et les contrats
- **Admins** : vérifient les KYC, consultent les statistiques, journalisent leurs actions

Le routing est géré par `App.jsx` qui lit le rôle de l'utilisateur connecté pour afficher le bon dashboard.

### Algorithme de matching

`src/lib/matching.js` calcule un score de compatibilité entre un travailleur et une mission en tenant compte des compétences, de la localisation et de la disponibilité. Ce score (`match_score`) est stocké dans la table `applications`.

---

## Fonctionnalités

### Travailleurs
- Parcourir les missions avec filtres (secteur, taux horaire, durée, urgence, dates)
- Carte interactive géolocalisée des missions (React Leaflet)
- Candidature en un clic avec score de matching automatique
- Retrait de candidature
- Gestion du profil (compétences, certifications, disponibilité)
- Dépôt de documents KYC (pièce d'identité, SIRET, assurance RC Pro)
- Signature électronique des contrats (canvas + libsodium)
- Messagerie en temps réel avec les entreprises
- Suivi des gains, factures et statut des missions
- Évaluations reçues après chaque mission

### Entreprises
- Publication de missions (intitulé, taux, durée, localisation, secteur, urgence)
- Gestion des candidatures et assignation d'un travailleur
- Génération et signature numérique des contrats
- Messagerie en temps réel avec les travailleurs
- Dashboard de statistiques (missions actives, dépenses, évaluations)
- Gestion des factures

### Espace administrateur
- Vue globale de tous les utilisateurs (travailleurs et entreprises)
- Vérification KYC par champ (approbation / rejet avec motif)
- Journal d'audit des actions admin (table `audit_log`)
- Statistiques globales de la plateforme
- Sélecteur de rôle pour naviguer entre les vues

### Transversal
- Notifications push PWA (Web Push API)
- Mode sombre
- Interface bilingue Français / Anglais (`src/lib/i18n/`)
- Mises à jour en temps réel via Supabase Realtime

---

## Installation locale

### Prérequis

- Node.js >= 18
- Un projet [Supabase](https://supabase.com) créé (gratuit)

### Étapes

```bash
git clone https://github.com/samuelalcaraz2006-droid/tempo-app.git
cd tempo-app

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Editer .env.local avec vos clés Supabase

# Appliquer les migrations SQL (voir section Base de données)

# Lancer le serveur de développement
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

---

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner :

```bash
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_ici
```

> Ces variables sont préfixées `VITE_` pour être exposées au bundle client. La clé `anon` est publique et protégée par les politiques Row Level Security (RLS) côté Supabase. Ne jamais utiliser la clé `service_role` côté frontend.

Sur Vercel, ces variables se configurent dans **Settings > Environment Variables**.

---

## Base de données

Les migrations sont dans `supabase/migrations/`. Les appliquer dans l'ordre dans l'**éditeur SQL Supabase** (ou via la CLI Supabase) :

| Fichier | Contenu |
|---|---|
| `001_types.sql` | Types personnalisés (statuts mission, rôles) |
| `002_tables.sql` | Schéma complet (profiles, workers, companies, missions, applications, contracts, ratings, messages, invoices, notifications) |
| `003_functions.sql` | Fonctions RPC (notifications, matching) |
| `004_rls.sql` | Politiques Row Level Security |
| `005_auto_profile.sql` | Trigger de création automatique de profil à l'inscription |
| `006_audit_log.sql` | Table de journal admin |
| `007_kyc_storage.sql` | Bucket Storage pour les documents KYC |

### Tables principales

```
profiles          — Utilisateurs (id, role, status)
workers           — Données travailleur (compétences, KYC, disponibilité, note)
companies         — Données entreprise (SIRET, adresse, note)
missions          — Offres de mission (titre, taux, durée, localisation, statut)
applications      — Candidatures (worker ↔ mission, match_score)
contracts         — Contrats signés (signatures, dates)
ratings           — Évaluations post-mission
messages          — Messagerie par mission
invoices          — Factures et suivi des paiements
notifications     — Notifications in-app
audit_log         — Journal des actions admin
```

---

## Tests E2E

Les tests Playwright couvrent les flux critiques (KYC, candidature, contrat).

```bash
# Lancer les tests (headless)
npm run test:e2e

# Avec navigateur visible
npm run test:e2e:headed

# Interface graphique Playwright
npm run test:e2e:ui

# Rapport HTML des résultats
npm run test:e2e:report
```

> Les tests ciblent `http://localhost:5173/tempo-app/`. Le serveur de développement doit être en cours d'exécution.

---

## Déploiement

### Vercel (recommandé)

1. Connecter ce dépôt GitHub à [Vercel](https://vercel.com)
2. Ajouter les variables d'environnement dans les settings Vercel :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel déploie automatiquement à chaque push sur `main`

La configuration Vercel (`vercel.json`) inclut :
- Rewrite SPA : toutes les routes → `/index.html`
- Headers de sécurité (CSP, X-Frame-Options, X-Content-Type-Options)
- Cache des assets statiques : 1 an (immutable)

### Build manuel

```bash
npm run build    # Génère dist/
npm run preview  # Prévisualisation locale du build
```

---

## Structure du projet

```
tempo-app/
├── public/                    # Assets statiques + manifest PWA
├── src/
│   ├── App.jsx                # Router principal (routing par rôle)
│   ├── index.css              # Styles globaux + thème sombre
│   ├── pages/
│   │   ├── Landing.jsx        # Page d'accueil
│   │   ├── Auth.jsx           # Connexion / inscription
│   │   ├── TravailleurApp.jsx # Dashboard travailleur
│   │   ├── EntrepriseApp.jsx  # Dashboard entreprise
│   │   ├── AdminApp.jsx       # Panneau d'administration
│   │   └── ResetPassword.jsx  # Réinitialisation du mot de passe
│   ├── components/
│   │   ├── MissionsMap.jsx    # Carte Leaflet interactive
│   │   ├── ContractModal.jsx  # Génération + signature de contrat
│   │   ├── RatingModal.jsx    # Évaluation post-mission
│   │   ├── SignatureCanvas.jsx# Capture de signature
│   │   └── AnimatedCounter.jsx# Compteurs animés (stats)
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Session, rôle, état d'authentification
│   │   ├── I18nContext.jsx    # Internationalisation FR/EN
│   │   └── useAuth.js         # Hook useAuth (accès au contexte Auth)
│   ├── hooks/
│   │   ├── useDarkMode.js
│   │   ├── useAdminGuard.js
│   │   └── useToast.js
│   └── lib/
│       ├── supabase.js        # Helpers API Supabase
│       ├── matching.js        # Algorithme de scoring travailleur/mission
│       ├── formatters.js      # Formatage dates et montants
│       ├── animations.js      # Presets Framer Motion
│       ├── pushNotifications.js # Gestion des notifications push PWA
│       └── i18n/
│           ├── fr.js
│           └── en.js
├── supabase/
│   └── migrations/            # Scripts SQL à appliquer dans l'ordre
├── e2e/                       # Tests Playwright
├── playwright.config.js
├── vercel.json
└── vite.config.js
```

---

## Licence

MIT
