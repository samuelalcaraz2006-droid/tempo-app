# TEMPO — Incident playbook

> Procédures de réaction face aux 8 incidents les plus probables.
> À garder sous la main lors d'un on-call.

---

## 1. 🔴 Erreur prod sur un écran (Sentry alert)

**Symptôme** : alerte Sentry, user signale un crash, ErrorBoundary affiché.

**Diagnostic rapide**
1. Ouvrir Sentry → détail de l'erreur → lire la stack (les noms de
   fonctions sont lisibles grâce à `keepNames: true` dans Vite config).
2. Regarder les breadcrumbs navigation (`trackScreen('worker', 'X')`)
   pour voir où l'user était.
3. Reproduire en dev en suivant le chemin.

**Fix**
- Ajouter un guard / défensif sur la ligne fautive
- Tester en jsdom/axe-core
- PR → merge → Vercel auto-deploy

**Rollback si critique**
- Vercel Dashboard → Deployments → Promote le dernier stable

---

## 2. 🔴 DB down / Supabase inaccessible

**Symptôme** : "Failed to fetch" dans les DevTools, toutes les pages spinent.

**Diagnostic**
1. https://status.supabase.com → incident global ?
2. Dashboard Supabase → Project Status
3. `curl https://ibievmxehhvdplhinher.supabase.co/functions/v1/health`

**Actions**
- Si incident global → attendre + communiquer aux users
- Si notre projet : vérifier quota + usage
- Pire cas : restore depuis PITR (Point-In-Time Recovery, dispo sur Pro)

---

## 3. 🟠 Stripe payment failure

**Symptôme** : factures bloquent en `pending`, `created_at` > 48h.

**Diagnostic**
1. Stripe Dashboard → Payments → Failed
2. Webhook events : `…/stripe-webhook` logs

**Fix**
- Si signature webhook cassée : regénérer dans Stripe + mettre à jour
  env var Vercel
- Si paiement client refusé : le mail de relance part tout seul via
  Stripe (3-min retry, puis email user)

---

## 4. 🟠 Application massive (>100 missions d'un coup)

**Symptôme** : tests E2E lents, DB CPU élevé.

**Diagnostic**
1. Supabase Dashboard → Database → Query Performance
2. Chercher queries qui touchent `applications` + `missions`

**Fix**
- Indexes sur `applications.mission_id`, `applications.worker_id`
  (déjà en place via migration 042-043)
- Rate limit côté frontend : debounce de 1s sur les boutons postuler
- Si abuse : flagger le worker

---

## 5. 🟠 Candidature bloquée (worker n'arrive pas à postuler)

**Symptôme** : bouton "Postuler" reste en "Envoi…" indéfiniment.

**Diagnostic**
1. Demander au worker : DevTools → Network → réponse de
   `POST /applications`
2. Vérifier RLS : `applications_insert` = `worker_id = auth.uid() OR is_admin()`
3. Vérifier quota Supabase

**Fix commun**
- KYC pas validé → user redirigé vers upload
- Mission `status` pas `open` → pas d'insert possible (trigger)
- Si RLS bloque : checker `auth.uid()` retourne bien l'id du user

---

## 6. 🟡 Chat/Messages ne délivre pas

**Symptôme** : worker envoie un message, company ne le reçoit jamais.

**Diagnostic**
1. Supabase → Realtime → Subscriptions actives ?
2. RLS `messages_select` → vérifier que receiver_id = auth.uid()
3. Broadcaster events (`trg_messages_insert`) : déclenchent les notifs

**Fix**
- Si realtime planté : redémarrage Supabase (rarement nécessaire)
- Vérifier que le user a bien donné consentement push notifications

---

## 7. 🟡 KYC valide mais worker flagged

**Symptôme** : worker KYC complet (3 ✓) mais `is_available=false` ou ne
peut pas postuler.

**Diagnostic**
1. Supabase → `workers` → vérifier les 3 colonnes vérifiées
2. Trigger `protect_kyc_fields` : bypass via `session_replication_role = 'replica'`
3. Vérifier `user_trust_scores` (s'il existe)

**Fix**
- Rouvrir la suspension via AdminApp
- Reset `is_available = true` + clear `kyc_rejection_reason`

---

## 8. 🟡 Service Worker cache stale (user voit ancienne version)

**Symptôme** : user rapporte qu'un bug "déjà corrigé" réapparaît.

**Diagnostic**
- `useUpdateChecker` (src/hooks/) poll `/version.json` toutes les 60 s
- Si user a bloqué le SW ou désactivé JS → ne reçoit pas les updates

**Fix**
- Envoyer au user : `chrome://settings/content/all?searchSubpage=tempo-app.vercel.app`
  → "Clear & reset"
- Ou : cmd+shift+R (force refresh)
- Ou : désinstaller + réinstaller le PWA

---

## 🔧 Outils de diagnostic

### Côté DB
```sql
-- Slow queries récentes
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Taille des tables
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- Triggers désactivés ? (NE PAS OUBLIER de re-enable)
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgisinternal = false;
```

### Côté app
```bash
# Logs Vercel en live
npx vercel logs --follow

# Build local avec prod env
npm run build && npx vercel build --prod

# Tester une edge function en local
npx supabase functions serve <name>
```

### Sentry queries utiles
- `event.type:error AND user.role:worker AND message:*TDZ*`
- `event.type:error AND browser:mobile`
- Top erreurs dernière heure
