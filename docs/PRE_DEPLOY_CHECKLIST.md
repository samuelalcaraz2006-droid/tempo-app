# TEMPO — Checklist pré-déploiement prod

> À passer systématiquement avant un push sur `main` qui touche du code
> métier. Pour les petites modifs (docs, lint, typos) ok de sauter.

## 🔒 Pré-requis techniques (hors code)

- [ ] Env vars Vercel à jour :
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_SENTRY_DSN` (si monitoring activé)
  - `VITE_APP_VERSION` (optionnel, sinon `2.1.0` par défaut)
- [ ] Supabase dashboard : « Leaked Password Protection » activée
- [ ] Stripe webhooks : endpoint `…/stripe-webhook` enregistré sur le compte Stripe prod

## ✅ Qualité du code

```bash
cd tempo-app
npm run lint       # objectif : 0 erreur (warnings OK)
npm test           # objectif : 0 failed
npm run build      # objectif : vert
```

- [ ] `Found 0 errors` sur lint (ou acceptation explicite des erreurs résiduelles)
- [ ] `Test Files N passed` (actuellement N=37)
- [ ] Bundle gzip total < 350 kB (actuellement ~311 kB)

## 🗄 Migrations Supabase

- [ ] Si nouvelles migrations dans `supabase/migrations/` : testées sur
      une branche Supabase avant merge main
- [ ] `mcp__supabase__get_advisors` : vérifier `security` = 0 critique,
      `performance` = 0 new warning
- [ ] RLS matrix documentée pour toute nouvelle table

## 🛡 Sécurité

- [ ] `grep -r "console.log" src/` hors tests : 0
- [ ] Aucun secret en dur (`.env` dans `.gitignore` ✓)
- [ ] Les nouvelles policies RLS utilisent `(select auth.uid())`
      (pas `auth.uid()` direct → TDZ perf)
- [ ] Aucun `dangerouslySetInnerHTML` sans sanitization

## 🎨 UI / a11y

- [ ] Tests axe-core verts : `npx vitest run src/tests/a11y*.test.jsx`
- [ ] Nouveaux `<button>` ont `type="button"` (défaut = submit)
- [ ] Nouveaux icônes SVG : `aria-hidden="true"` si décoratifs,
      `<title>` si porteurs de sens
- [ ] Dark mode testé sur les nouveaux écrans (toggle utility bar)
- [ ] Mobile testé en 375 × 667 (Chrome DevTools)

## 📊 Tests E2E critiques (avant release majeure)

```bash
npm run test:e2e
```

- [ ] `auth.spec.js` vert (login / signup / reset)
- [ ] `mission-publish.spec.js` vert (company publie)
- [ ] `mission-apply.spec.js` vert (worker postule)
- [ ] `kyc-admin-validation.spec.js` vert (admin valide KYC)

## 📦 Déploiement

```bash
# 1. Merge de la PR sur main (via gh pr merge)
# 2. Vercel déploie automatiquement → attendre la Deployment health check
# 3. Vérifier /version.json → buildId change
curl https://tempo-app.vercel.app/version.json

# 4. Smoke test manuel (3 min) :
#    - Landing charge
#    - Login Léa → dashboard
#    - Login Jean → dashboard
#    - Clic profil worker / company → pas de crash
#    - Logout fonctionne
```

## 🚨 Rollback rapide (si incident)

```bash
# Vercel : promote le précédent deploy à la prod
# → Dashboard → Deployments → 3-dots sur le précédent → Promote to Production
# OU via CLI :
npx vercel rollback --token=$VERCEL_TOKEN

# Supabase : rollback migration (manuel via SQL console)
# Pas de CLI auto — garder les migrations IDEMPOTENTES + DROP IF EXISTS
```

## 📣 Post-deploy

- [ ] Sentry dashboard : 0 nouvelle erreur grave dans les 10 min suivantes
- [ ] Vercel analytics : LCP < 2.5s, CLS < 0.1
- [ ] Monitoring Supabase : slow queries < 100 ms sur les routes critiques
- [ ] Si release majeure : post Discord/Telegram aux users + note de version
