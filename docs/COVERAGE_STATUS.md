# Statut couverture de tests — 2026-04-08

## Résultat actuel : 29.8% global

### Stats par domaine

| Domaine | Stmts | Branch | Funcs | Lines | Statut |
|---|---|---|---|---|---|
| `src/hooks/` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/formatters.js` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/matching.js` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/animations.js` | 100% | 100% | 100% | 100% | DONE |
| `src/lib/supabase.js` | 28% | 0% | 13% | 29% | BLOQUÉ |
| `src/contexts/AuthContext.jsx` | 52% | 38% | 60% | 52% | BLOQUÉ |
| `src/pages/` | ~10% | ~5% | ~15% | ~10% | BLOQUÉ |
| `src/components/` | ~15% | ~8% | ~20% | ~15% | PARTIEL |
| `src/lib/i18n/en.js` | 0% | 0% | 0% | 0% | SKIPPÉ |
| `src/lib/i18n/fr.js` | 0% | 0% | 0% | 0% | SKIPPÉ |

**Total tests : 368 (368 passants, 0 failing)**

---

## Blocage : Rate Limit Supabase

Les modules suivants nécessitent des mocks Supabase complexes qui triggent
des rate limits lors des runs CI répétés :

- `src/lib/supabase.js` — ~40 fonctions CRUD, Storage, Auth
- `src/contexts/AuthContext.jsx` — dépend de `supabase.auth.*`
- `src/pages/AdminApp.jsx`, `EntrepriseApp.jsx`, `TravailleurApp.jsx` — appels DB live
- `src/components/ContractModal.jsx`, `RatingModal.jsx`, `SignatureCanvas.jsx`

**Symptôme** : tests passent en local mais flaky en CI à cause des retries Supabase.

---

## Priorités prochaine session

### Priorité 1 — Mocks Supabase centralisés (gain ~+15%)
Créer `src/__mocks__/supabase.js` avec mock complet de `@supabase/supabase-js` :
```js
vi.mock('@/lib/supabase', () => ({ supabase: mockSupabase }))
```
Cibles : `supabase.js` entier, `AuthContext`, `useAuth`

### Priorité 2 — Tests composants UI purs (gain ~+5%)
Composants sans dépendance API :
- `AnimatedCounter.jsx` — pur calcul CSS/animation
- `MissionsMap.jsx` — rendu conditionnel, pas d'appel DB direct
- `Landing.jsx` — page statique

### Priorité 3 — Pages avec routing mocké (gain ~+5%)
- `Auth.jsx` — formulaire login/register, mocker supabase.auth
- `ResetPassword.jsx` — déjà 20 tests, compléter branches

### Priorité 4 — i18n (gain ~+2%)
- `en.js` / `fr.js` — data pure, écrire test de snapshot en 10 min

---

## Objectif session suivante
**Cible : 45-50% global** en résolvant le mock Supabase centralisé.

## Commandes utiles
```bash
npm test -- --coverage --reporter=verbose
npm test -- --coverage --testPathPattern="AuthContext"
```
