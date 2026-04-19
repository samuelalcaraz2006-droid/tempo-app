# TEMPO — Statut i18n

> État de la localisation FR/EN au fil du temps. Source : `src/lib/i18n/{fr,en}.js`.

## État actuel

**Langue par défaut** : FR.
**Langues supportées** : FR, EN (toggle utility bar).

### Couverture par écran

| Écran | FR | EN | Commentaire |
|---|---|---|---|
| **Navigation sidebar** | ✅ | ✅ | Via `nav_*` keys |
| **Landing** | ✅ | ⚠️ partiel | H1/H2 sections traduites, body prose encore FR |
| **Auth (login/signup/reset)** | ✅ | ✅ | Complet |
| **Legal (CGU/CGV/etc.)** | ✅ | ❌ | Texte légal FR uniquement (par choix — juridiction FR) |
| **WorkerDashboard** | ✅ | ⚠️ | H1 + KPIs traduits, accents serif restent FR |
| **WorkerMissionsList** | ✅ | ✅ | Filtres, CTAs, headers |
| **WorkerMissionDetail** | ✅ | ⚠️ | H1 traduit, sections 01/02 en FR |
| **WorkerApplications** | ✅ | ⚠️ | Status labels traduits, timeline FR |
| **WorkerEarnings** | ✅ | ✅ | Complet |
| **WorkerProfile** | ✅ | ⚠️ | KYC labels FR, form labels traduits |
| **WorkerStripeOnboarding** | ✅ | ❌ | FR uniquement |
| **CompanyDashboard** | ✅ | ⚠️ | KPIs + H1 traduits, sous-titres FR |
| **CompanyPublishMission** | ✅ | ⚠️ | Forms traduits, hints FR |
| **CompanyCandidates** | ✅ | ⚠️ | Labels traduits, empty state FR |
| **CompanyContracts** | ✅ | ⚠️ | Headers traduits, cells FR |
| **CompanyStats** | ✅ | ✅ | Complet |
| **CompanyProfile** | ✅ | ⚠️ | Form traduit, description field FR |
| **AdminApp** | ✅ | ❌ | Panel admin FR uniquement (usage interne) |
| **NotificationsView** | ✅ | ❌ | 32 types de notifs FR |
| **PublicWorkerProfile** | ✅ | ❌ | Nouveau écran, encore FR |
| **PublicCompanyProfile** | ✅ | ❌ | Nouveau écran, encore FR |
| **ChatView** | ✅ | ⚠️ | Bubbles traduits, status FR |
| **PWAInstallPrompt** | ✅ | ✅ | Traduit dès la création (via keys pwa_install_*) |
| **LoadingState** | ✅ | ⚠️ | « Chargement… » par défaut FR, labels custom varient |

### Keys i18n

- `fr.js` : 187 keys
- `en.js` : 187 keys (sync)

Les keys **manquantes** sont celles des écrans encore en FR hardcodé.
Pour migrer un écran : remplacer les strings inline par `t('key')` + ajouter
la paire FR/EN dans les 2 fichiers.

## Stratégie

### Principe

Les écrans **publics + conversion critique** (Landing, Auth, Legal hors juridique)
doivent être EN-ready en priorité. Les écrans **admin / interne** restent FR.

### Ordre de migration recommandé

1. **PublicWorkerProfile / PublicCompanyProfile** (visibles par n'importe
   quel worker / company — point de friction UX bilingue)
2. **NotificationsView** (notifications système récurrentes)
3. **ChatView status** (+ labels de mission status)
4. **WorkerProfile / CompanyProfile KYC** (onboarding critique)
5. Le reste au fil des touches

### Convention

- 1 key = 1 phrase complète (pas de concatenation à runtime)
- Pluriel : soit 2 keys (`mission_one`, `mission_many`) soit format
  `${N} mission${N > 1 ? 's' : ''}` inline sans i18n (FR+EN compatibles)
- Dates : utiliser `Intl.DateTimeFormat(locale)` (pas de key FR/EN)
- Les emoji et symboles (★, €, …) restent inline sans traduction

### Dette actuelle

- Les accents serif italique dans les heroes (« 2 missions en cours »)
  sont composés de 2 fragments FR concaténés — difficilement
  traduisibles sans changer la structure. À réinitialiser si on
  réécrit l'accent pattern pour EN.

## Pour l'audit

Grep pour repérer les strings non-i18n :

```bash
# Phrases FR hardcodées visibles à l'utilisateur
grep -rnE ">[A-ZÉÈ][a-zéèêàâç ]{3,}[.?!]" src/features/ src/pages/

# Check cohérence des keys FR vs EN
diff <(grep -oE "^  [a-z_]+:" src/lib/i18n/fr.js | sort -u) \
     <(grep -oE "^  [a-z_]+:" src/lib/i18n/en.js | sort -u)
# → devrait être vide (sync parfait des keys)
```
