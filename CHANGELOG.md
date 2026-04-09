# Changelog

## [2.1.0] - 2026-04-09

### Chantier 1 — Refactoring des pages monolithiques

**Objectif** : aucun fichier de page > 15 KB. Logique metier dans des hooks, UI dans des sous-composants.

#### Resultats

| Page | Avant | Apres | Reduction |
|------|-------|-------|-----------|
| TravailleurApp.jsx | 1531 lignes / 95 KB | 242 lignes / 20 KB | -84% |
| EntrepriseApp.jsx | 1069 lignes / 68 KB | 244 lignes / 11 KB | -84% |
| AdminApp.jsx | 379 lignes / 21 KB | 275 lignes / 12 KB | -43% |
| **Total pages** | **2979 lignes** | **761 lignes** | **-74%** |

#### 30 fichiers crees

**Layouts (1)**
- `src/layouts/DashboardLayout.jsx` — header + nav partage entre les 3 roles

**Features worker (11)**
- WorkerDashboard, WorkerMissionsList, WorkerMissionDetail, WorkerFavorites
- WorkerApplications, WorkerEarnings, WorkerProfile, WorkerNotifications
- WorkerMessages, WorkerAlerts, WorkerCalendar, WorkerCompanyProfile

**Features company (6)**
- CompanyDashboard, CompanyPublishMission, CompanyCandidates
- CompanyStats, CompanyContracts, CompanyMessages

**Features admin (3)**
- AdminUsersList, AdminKycPanel, AdminStats

**Features shared (3)**
- ChatView, ConversationsList, MissionCard

**Hooks worker (3)**
- useWorkerData, useWorkerActions, useMissionFilters

**Hooks company (2)**
- useCompanyData, useCompanyActions

**Hooks shared (1)**
- useChat (messagerie temps reel reutilisable)

#### Tests
- 397/397 tests passent (zero regression)
- Aucun changement dans les fichiers de test

#### Architecture
Les pages sont devenues des routeurs fins qui :
1. Composent les hooks custom pour le state et la logique
2. Delegent chaque ecran a un feature component
3. Gardent uniquement les modales et le toast inline
