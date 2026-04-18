# TEMPO — Code Map (structure de l'application)

> Cartographie actualisée du codebase après audit de stabilisation (PRs #28–39).
> Dernière mise à jour : 2026-04-18.

## Layout général

```
tempo-app/
├── src/
│   ├── App.jsx              # Routeur racine + ErrorBoundary + Suspense
│   ├── main.jsx             # Entry point, initSentry
│   ├── index.css            # Tokens CSS variables
│   │
│   ├── pages/               # Pages plein écran orchestrent des features
│   │   ├── Landing.jsx      # Homepage publique
│   │   ├── Auth.jsx         # Login/Signup/Reset (2 colonnes Style A)
│   │   ├── ResetPassword.jsx
│   │   ├── Legal.jsx        # CGU/CGV/Mentions/Privacy/Cookies
│   │   ├── TravailleurApp.jsx  # Router worker (782 lignes, à splitter)
│   │   ├── EntrepriseApp.jsx   # Router company
│   │   ├── AdminApp.jsx        # Panel admin + KYC
│   │   └── GodModePicker.jsx   # Admin choose viewpoint
│   │
│   ├── features/            # Écrans composés par rôle
│   │   ├── worker/          # 14 features (Dashboard, Applications, …)
│   │   ├── company/         # 7 features (Dashboard, Publish, …)
│   │   ├── shared/          # ChatView, MissionCard, Notifications, Profiles publics
│   │   └── admin/           # Users, KYC, Stats
│   │
│   ├── layouts/
│   │   └── DashboardLayout.jsx  # Sidebar + slim utility bar
│   │
│   ├── design/              # Design system Style A
│   │   ├── tokens.js        # Couleurs, fonts, radius, shadows
│   │   ├── primitives.jsx   # TempoLogoA, Pill, Avatar, Eyebrow, Headline, KpiCard, GridBg, LiveDot
│   │   ├── Sidebar.jsx      # SidebarA (navy 240px)
│   │   └── TopBar.jsx       # TopBarA (hero navy)
│   │
│   ├── components/
│   │   ├── UI/              # Button, Modal, Toast, EmptyState, FormField
│   │   ├── CookieBanner.jsx
│   │   ├── FeedbackWidget.jsx
│   │   ├── ContractModal.jsx (lazy)
│   │   ├── SignatureCanvas.jsx
│   │   ├── RatingModal.jsx
│   │   ├── MissionsMap.jsx  (lazy — Leaflet)
│   │   └── ImpersonationBanner.jsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx  # user/profile/roleData + God Mode
│   │   └── I18nContext.jsx  # locale FR/EN
│   │
│   ├── hooks/
│   │   ├── worker/          # useWorkerActions, useWorkerData, useMissionFilters
│   │   ├── company/         # useCompanyActions, useCompanyData
│   │   ├── shared/          # useChat, useConversations
│   │   ├── useAuth          # re-export AuthContext
│   │   ├── useDarkMode.js
│   │   ├── useI18n.js
│   │   ├── useToast.js
│   │   └── useUpdateChecker.js  # reload sur nouveau build
│   │
│   ├── lib/
│   │   ├── supabase.js      # Client + helpers DB (getPublic*, subscribe*)
│   │   ├── sentry.js        # initSentry, captureError, logWarn, trackScreen
│   │   ├── pushNotifications.js
│   │   ├── profileMetrics.js # Badges auto-calculés
│   │   ├── equipmentGuidelines.js
│   │   ├── formatters.js    # formatDate, formatAmount, SECTOR_LABELS
│   │   ├── legal.js         # validateSiret, signAttestation
│   │   ├── missionGuidelines.js
│   │   ├── stripe.js
│   │   └── matching.js
│   │
│   └── tests/               # Vitest + Testing Library
│       ├── setup.js
│       ├── mocks/           # supabase, lucide
│       └── *.test.jsx       # 35 fichiers, 709 tests
│
├── supabase/
│   ├── migrations/          # 43 migrations versionnées
│   └── seed-test.sql        # Reset env avec Léa + Jean
│
├── e2e/                     # Playwright (3 scénarios critiques)
│
├── .claude/
│   ├── PRPs/
│   │   ├── plans/           # audit-stabilisation-tempo.plan.md
│   │   └── reports/
│   └── design-bundle/       # Maquettes Style A de référence
│
└── vite.config.js           # Build esbuild (minifyIdentifiers actif, keepNames)
```

## Flux de données principaux

### Auth flow
```
User click "Se connecter"
  → pages/Auth.jsx
    → supabase.auth.signInWithPassword
      → onAuthStateChange (AuthContext)
        → loadProfile (profiles + workers/companies)
          → AppRouter décide TravailleurApp | EntrepriseApp | AdminApp
```

### Mission lifecycle
```
Company publie
  → missions.insert (status=open)
    → trigger notify_matching → notifications pour workers du secteur
      → Worker voit la mission dans WorkerMissionsList
        → applications.insert (pending)
          → notification application_received pour company
            → Company clique "Retenir" → applications.update(accepted)
              → trigger auto-generate contract
                → status=matched → côté worker dashboard "mission en cours"
                  → Après shift : time_entries submitted
                    → Company valide → mission status=completed
                      → trigger auto-generate invoice
                        → Stripe webhook → invoice.status=paid
                          → ratings ouverts (worker ↔ company)
```

### Navigation interne (worker)
```
DashboardLayout (Sidebar + utility bar)
  ↓ onTabChange
TravailleurApp ({screen === 'X' && …})
  ↓
Feature component (WorkerDashboard, WorkerApplications, …)
  ↓ onNavigate / onViewCompany / onSelectMission
Feature component suivante
```

Chaque navigation déclenche `trackScreen('worker', screen)` dans
`src/lib/sentry.js` → breadcrumb Sentry pour debug en prod.

## Conventions

- **Fichiers** : PascalCase pour composants (`WorkerDashboard.jsx`),
  camelCase pour hooks et helpers (`useWorkerData.js`, `formatters.js`).
- **Imports groupés** : React & hooks → libs tierces → composants
  internes → helpers/lib.
- **Style A** : tokens dans `src/design/tokens.js`, primitives dans
  `src/design/primitives.jsx`, classes utilitaires `.a-btn-primary`,
  `.font-serif-italic`, etc. dans `src/index.css`.
- **Erreurs** : toujours via `captureError` (Sentry). `console.*` réservés
  au fallback dev-only ou aux erreurs config-time (pre-Sentry).

## Dependencies clés

| Package | Rôle |
|---|---|
| `react` 18 + `@vitejs/plugin-react` | Base |
| `@supabase/supabase-js` | DB + Auth + Realtime + Storage |
| `@sentry/browser` | Monitoring prod |
| `leaflet` + `react-leaflet` | Carte missions (lazy) |
| `lucide-react` | Icons |
| `vitest` + `@testing-library/react` | Tests unitaires |
| `@playwright/test` | E2E |
| `@biomejs/biome` | Lint + format |
