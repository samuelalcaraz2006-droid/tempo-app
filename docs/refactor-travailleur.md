# Refactoring — Cartographie avant/apres

## Etat actuel

| Fichier | Lignes | Taille | Ecrans/onglets |
|---------|--------|--------|-----------------|
| TravailleurApp.jsx | 1531 | ~97 KB | 13 ecrans |
| EntrepriseApp.jsx | 1069 | ~68 KB | 7 ecrans |
| AdminApp.jsx | 379 | ~21 KB | 3 onglets |
| **Total** | **2979** | **~186 KB** | **23 vues** |

---

## TravailleurApp.jsx — Responsabilites identifiees

### 13 ecrans dans un seul fichier

| Ecran | Ligne | Description |
|-------|-------|-------------|
| `accueil` | 664 | Dashboard worker : stats perso, missions urgentes, top 3 recommandees |
| `missions` | 706 | Liste complete avec recherche, filtres avances, tri, vue carte/liste |
| `favoris` | 820 | Missions sauvegardees |
| `mission-detail` | 836 | Detail d'une mission + bouton postuler |
| `suivi` | 885 | Suivi des candidatures (pending/accepted/rejected) + contrats |
| `gains` | 1003 | Revenus : CA mois/annee, factures, graphiques |
| `messages` | 1112 | Liste des conversations |
| `chat` | 1146 | Messagerie temps reel |
| `alertes` | 1178 | Alertes sauvegardees par le worker |
| `calendrier` | 1238 | Calendrier de disponibilite (jours bloques) |
| `profil` | 1289 | Edition profil + skills + certifications + badges |
| `company-profile` | 1427 | Fiche entreprise consultee par le worker |
| `notifs` | 1481 | Centre de notifications |

### 40+ variables d'etat (useState) en vrac

Toutes declarees dans le composant principal (lignes 143-197). Melange de :
- State UI (screen, loading, showFilters, mapView, showOnboarding)
- State data (missions, applications, invoices, notifs, conversations, chatMessages)
- State filtres (filterSecteur, searchQuery, sortBy, filterRateMin/Max, filterUrgency, filterPeriod)
- State modales (ratingModal, contractModal, selectedMission, viewCompany)
- State profil (profileForm, savingProfile, newSkill, newCert)
- State chat (chatPartner, chatMissionId, chatInput, sendingMsg)
- State localStorage (savedMissions, savedAlerts, blockedDays, signedContracts)

### Composants inline

- `Star` (ligne 15) — deja petit, ok
- `Field` (ligne 23) — composant formulaire generique
- `KycUploadSection` (ligne 37) — 100 lignes, deja extrait partiellement
- `MissionCard` (ligne 519) — 34 lignes, defini a l'interieur du composant principal

### Logique metier melee au rendu

- `loadData` (ligne 212) — 30 lignes de fetching parallele
- `handleApply`, `handleSaveProfile`, `handleRatingSubmit`, `handleSignContract`, `handleWithdraw` — handlers metier
- `openChat`, `handleSendMessage` — logique messagerie
- `openCompanyProfile`, `saveAlert`, `deleteAlert`, `toggleBlockedDay` — utilitaires divers
- `filteredMissions` (ligne 464) — 48 lignes de memo avec 7 criteres de filtrage
- `badges` (ligne 441) — calcul gamification

---

## EntrepriseApp.jsx — Responsabilites identifiees

### 7 ecrans

| Ecran | Ligne | Description |
|-------|-------|-------------|
| `dashboard` | 427 | KPIs, activite recente, graphiques tendance |
| `publier` | 614 | Formulaire publication mission + templates |
| `candidatures` | 765 | Liste candidats par mission, accept/reject |
| `stats` | 836 | Statistiques avancees |
| `contrats` | 925 | Gestion des contrats signes |
| `messages-e` | 985 | Liste conversations |
| `chat` | 1016 | Messagerie temps reel |

### State : ~30 useState

Meme pattern que TravailleurApp : tout en vrac dans le composant racine.

### Logique metier melee

- `loadData`, `handlePublish`, `handleAccept`, `handleReject`, `handleCompleteMission`
- `duplicateMission`, `saveAsTemplate`, `loadTemplate`, `deleteTemplate`
- `exportCSV`, `exportInvoicesCSV`, `exportMissionsCSV`
- `handleCancel`, `openChat`, `handleSendMessage`, `handleSignContract`

---

## AdminApp.jsx — Responsabilites identifiees

### 3 onglets (users, kyc, stats)

Deja assez compact a 379 lignes mais contient :
- Logique KYC complete (approve all, approve field, reject)
- 2 modales inline (confirmation + rejet)
- Fetching + pagination inline

---

## Plan de decoupage propose

### Structure cible

```
src/
├── layouts/
│   └── DashboardLayout.jsx          # Header + nav + sidebar partages
├── features/
│   ├── worker/
│   │   ├── WorkerDashboard.jsx       # ecran accueil
│   │   ├── WorkerMissionsList.jsx    # ecran missions + filtres + carte
│   │   ├── WorkerMissionDetail.jsx   # detail mission
│   │   ├── WorkerFavorites.jsx       # favoris
│   │   ├── WorkerApplications.jsx    # suivi candidatures + contrats
│   │   ├── WorkerEarnings.jsx        # gains + factures
│   │   ├── WorkerProfile.jsx         # profil + skills + badges
│   │   ├── WorkerKycPanel.jsx        # upload KYC (existe deja partiellement)
│   │   ├── WorkerAlerts.jsx          # alertes sauvegardees
│   │   ├── WorkerCalendar.jsx        # calendrier de dispo
│   │   ├── WorkerNotifications.jsx   # centre notifs
│   │   └── CompanyProfile.jsx        # fiche entreprise vue worker
│   ├── company/
│   │   ├── CompanyDashboard.jsx      # dashboard + KPIs
│   │   ├── CompanyPublishMission.jsx # formulaire publication
│   │   ├── CompanyCandidates.jsx     # gestion candidatures
│   │   ├── CompanyStats.jsx          # statistiques
│   │   ├── CompanyContracts.jsx      # contrats
│   │   └── CompanyProfile.jsx        # profil entreprise (edition)
│   ├── admin/
│   │   ├── AdminUsersList.jsx        # liste utilisateurs
│   │   ├── AdminKycPanel.jsx         # verification KYC
│   │   └── AdminStats.jsx            # statistiques plateforme
│   └── shared/
│       ├── ChatView.jsx              # messagerie (identique worker/company)
│       ├── ConversationsList.jsx     # liste conversations
│       ├── MissionCard.jsx           # carte mission reutilisable
│       └── MissionFilters.jsx        # barre de filtres avances
├── hooks/
│   ├── worker/
│   │   ├── useWorkerData.js          # loadData worker (missions, apps, invoices, notifs)
│   │   ├── useWorkerApplications.js  # postuler, retirer, suivi
│   │   ├── useWorkerContracts.js     # signature, liste contrats
│   │   ├── useWorkerEarnings.js      # factures, CA
│   │   └── useMissionFilters.js      # filtrage + tri (gros useMemo extrait)
│   ├── company/
│   │   ├── useCompanyData.js         # loadData company
│   │   ├── useCompanyMissions.js     # publish, duplicate, cancel, templates
│   │   ├── useCompanyCandidates.js   # accept, reject, assign
│   │   └── useCompanyContracts.js    # signature
│   └── shared/
│       └── useChat.js                # openChat, sendMessage, subscribe (identique)
└── pages/
    ├── TravailleurApp.jsx            # ~50 lignes : router entre features/worker/*
    ├── EntrepriseApp.jsx             # ~50 lignes : router entre features/company/*
    └── AdminApp.jsx                  # ~50 lignes : router entre features/admin/*
```

### Tailles estimees apres refacto

| Fichier | Avant | Apres (estim.) |
|---------|-------|----------------|
| TravailleurApp.jsx | 1531 lignes | ~60 lignes (routeur) |
| EntrepriseApp.jsx | 1069 lignes | ~50 lignes (routeur) |
| AdminApp.jsx | 379 lignes | ~40 lignes (routeur) |
| Plus gros sous-composant | — | ~200 lignes max |
| Plus gros hook | — | ~100 lignes max |

### Code reutilisable identifie (shared)

1. **ChatView + useChat** : la messagerie est quasi identique entre worker et company (openChat, handleSendMessage, subscribeToMessages). A extraire en un seul composant + hook.
2. **MissionCard** : defini inline dans TravailleurApp mais reutilisable dans CompanyProfile et dashboard.
3. **DashboardLayout** : header (logo, nav tabs, dark mode, lang switch, avatar, logout) duplique entre les 3 pages. Pattern identique, seuls les onglets changent.
4. **MissionFilters** : le bloc filtres avances (48 lignes de useMemo + UI) est autonome.
5. **ContractModal + RatingModal** : deja des composants separes, OK.

### Ordre d'execution recommande

1. Creer `src/layouts/DashboardLayout.jsx` (header + nav communes)
2. Creer `src/features/shared/ChatView.jsx` + `src/hooks/shared/useChat.js`
3. Extraire les features worker une par une (du plus simple au plus complexe)
4. Rebrancher TravailleurApp comme routeur
5. Meme chose pour company
6. Meme chose pour admin (plus leger)
7. Verifier les tests

### Risques

- Les 40+ useState sont interconnectes (ex: `screen` + `chatPartner` + `chatMissionId`). Il faudra passer les setters en props ou utiliser un contexte worker/company.
- Certains handlers referent `worker` (roleData) qui vient du AuthContext — pas de probleme, chaque sous-composant peut appeler useAuth().
- Les subscriptions realtime (missions, messages, notifications) sont dans des useEffect du composant parent — a deplacer dans les hooks dedies.
