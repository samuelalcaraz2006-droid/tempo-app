# Statut couverture de tests — 2026-04-08

## Résultat actuel : 31.77% global (397 tests)

### Stats par domaine

| Domaine | Stmts | Branch | Funcs | Lines | Statut |
|---|---|---|---|---|---|
| `src/hooks/` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/formatters.js` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/matching.js` | 95.9% | 85.39% | 100% | 98.96% | DONE |
| `src/lib/animations.js` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/notifications.js` | 95.65% | 94.11% | 100% | 100% | DONE |
| `src/contexts/` | 100% | 88.67% | 100% | 100% | DONE |
| `src/components/` | 94.48% | 86.42% | 97.36% | 100% | DONE |
| `src/lib/supabase.js` | 28.83% | 8.86% | 1.88% | 30.96% | BLOQUÉ |
| `src/pages/` | 8.81% | 9.42% | 5.67% | 9.31% | BLOQUÉ |
| `src/lib/i18n/en.js` | 0% | 0% | 0% | 0% | SKIPPÉ |
| `src/lib/i18n/fr.js` | 0% | 0% | 0% | 0% | SKIPPÉ |

**Total tests : 397 (397 passants, 0 failing)**

---

## Top 10 fichiers < 50% — classés par type de dépendance

### 🟢 PUR (sans appel API) — testables immédiatement

| Fichier | Stmts | Lignes | Gain estimé | Raison |
|---|---|---|---|---|
| `src/lib/i18n/en.js` | 0% | ~180 lignes | +1% | Export pur de strings |
| `src/lib/i18n/fr.js` | 0% | ~180 lignes | +1% | Export pur de strings |
| `src/pages/Landing.jsx` | 0% | ~420 lignes | +3% | Page statique, props/state simples |
| `src/pages/Auth.jsx` | 77.47% → ↑ | ~260 lignes | +1% | Formulaires + branches non couvertes |

### 🔴 API-DÉPENDANT (nécessite mock Supabase)

| Fichier | Stmts | Lignes | Gain si mocké | Raison |
|---|---|---|---|---|
| `src/lib/supabase.js` | 28.83% | ~600 lignes | +15% | ~40 fonctions CRUD/Storage/Auth |
| `src/pages/AdminApp.jsx` | 0% | ~370 lignes | +5% | Dashboard admin — appels DB live |
| `src/pages/EntrepriseApp.jsx` | 0% | ~1058 lignes | +8% | App entreprise — appels DB live |
| `src/pages/TravailleurApp.jsx` | 0% | ~1515 lignes | +10% | App travailleur — appels DB live |
| `src/App.jsx` | 69.35% → ↑ | ~200 lignes | +2% | Routes protégées, dépend auth |

---

## Plan d'attaque — prochaine session

### Phase 1 — PUR (rapide, ~2-3h) → +5-6%
1. **i18n snapshot** : `en.js` + `fr.js` — test que toutes les clés existent, types string
2. **Landing.jsx** : render statique, sections affichées, liens CTA, pas d'API
3. **Auth.jsx branches** : compléter les cas password reset / validation

### Phase 2 — Mock Supabase centralisé (~4-6h) → +20-25%
Créer `src/__mocks__/supabase.js` :
```js
// vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  auth: { getUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn() },
  storage: { from: vi.fn().mockReturnThis(), upload: vi.fn(), getPublicUrl: vi.fn() },
}
```
Cibles avec ce mock : `supabase.js` entier, `AdminApp`, `EntrepriseApp`, `TravailleurApp`

---

## Objectif session suivante
**Cible : 50-55% global** après mock Supabase centralisé + tests Landing/i18n.

## Commandes utiles
```bash
npm test -- --coverage
npm test -- --coverage --reporter=verbose
npm test -- src/tests/Landing.test.jsx --coverage
```
