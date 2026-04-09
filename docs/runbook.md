# TEMPO — Runbook Operations

## Services et URLs

| Service | URL | Dashboard |
|---------|-----|-----------|
| Frontend | https://tempo-app.vercel.app | Vercel Dashboard |
| API Supabase | https://ibievmxehhvdplhinher.supabase.co | Supabase Dashboard |
| Edge Functions | https://ibievmxehhvdplhinher.supabase.co/functions/v1/* | Supabase → Edge Functions |
| Healthcheck | https://ibievmxehhvdplhinher.supabase.co/functions/v1/health | Public, no auth |
| Stripe | https://dashboard.stripe.com | Stripe Dashboard |
| Sentry | https://sentry.io | Sentry Dashboard |

## Deploiement

### Frontend (Vercel)
```bash
# Deploiement automatique sur push main
git push origin main

# Deploiement manuel
npx vercel --prod

# Rollback (derniere version stable)
# Vercel Dashboard → Deployments → ... → Promote to Production
```

### Edge Functions (Supabase)
```bash
# Via Supabase CLI
supabase functions deploy <function-name> --project-ref ibievmxehhvdplhinher

# Ou via MCP dans Claude Code
# Les fonctions sont deployees via l'outil mcp__supabase__deploy_edge_function
```

### Migrations DB
```bash
# Via Supabase CLI
supabase db push --project-ref ibievmxehhvdplhinher

# Ou via MCP
# mcp__supabase__apply_migration
```

## Monitoring

### Healthcheck
```bash
curl https://ibievmxehhvdplhinher.supabase.co/functions/v1/health | jq
```
Reponse attendue :
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "ok", "latency_ms": 50 },
    "stripe": { "status": "ok", "latency_ms": 200 },
    "storage": { "status": "ok", "latency_ms": 30 }
  }
}
```

### Sentry
- Les erreurs front remontent automatiquement (si VITE_SENTRY_DSN configure)
- Les Edge Functions loggent dans Supabase Dashboard → Logs

### Logs Edge Functions
```bash
# Via Supabase Dashboard → Edge Functions → <function> → Logs
# Ou via MCP
# mcp__supabase__get_logs avec service="edge-function"
```

## Incidents courants

### 1. Frontend ne charge pas
1. Verifier Vercel : Dashboard → Deployments (build vert ?)
2. Verifier DNS : `dig tempo-app.fr` pointe vers Vercel ?
3. Rollback si necessaire via Vercel Dashboard

### 2. Erreur 500 sur une Edge Function
1. Verifier les logs : Supabase Dashboard → Edge Functions → Logs
2. Verifier les secrets : STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
3. Redeploy la fonction si necessaire

### 3. Paiement echoue
1. Verifier Stripe Dashboard → Payments → filtrer par statut "Failed"
2. Verifier le webhook : Stripe Dashboard → Developers → Webhooks → Events
3. Verifier les logs de `stripe-webhook` Edge Function
4. Causes courantes : carte expiree, fonds insuffisants, 3D Secure echoue

### 4. Base de donnees lente
1. Verifier Supabase Dashboard → Database → Query Performance
2. Verifier les index manquants
3. Verifier le plan Supabase (limites du free tier)

### 5. KYC bloque
1. Verifier Supabase Dashboard → Table Editor → workers (colonnes *_verified)
2. Verifier les logs audit_log pour les actions admin recentes
3. Contacter le worker si documents refuses

### 6. Rate limiting Supabase
1. Le free tier a des limites sur les requetes API
2. Verifier Dashboard → API → Usage
3. Solution : upgrade vers Pro si necessaire

## Restauration DB

### Point-in-time Recovery (PITR)
- Disponible sur le plan Pro Supabase
- Dashboard → Settings → Database → Backups
- Restauration a n'importe quel point dans les 7 derniers jours

### Backup manuel
```sql
-- Export d'une table specifique via Supabase SQL Editor
COPY (SELECT * FROM workers) TO STDOUT WITH CSV HEADER;
```

## Variables d'environnement

### Frontend (Vercel)
| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| VITE_SUPABASE_URL | Oui | URL du projet Supabase |
| VITE_SUPABASE_ANON_KEY | Oui | Cle publique Supabase |
| VITE_STRIPE_PUBLISHABLE_KEY | Oui | Cle publique Stripe |
| VITE_SENTRY_DSN | Non | DSN Sentry pour error tracking |

### Edge Functions (Supabase Secrets)
| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| STRIPE_SECRET_KEY | Oui | Cle secrete Stripe |
| STRIPE_WEBHOOK_SECRET | Oui | Secret webhook Stripe |
| SUPABASE_URL | Auto | Fourni automatiquement |
| SUPABASE_ANON_KEY | Auto | Fourni automatiquement |
| SUPABASE_SERVICE_ROLE_KEY | Auto | Fourni automatiquement |

## Contacts

| Role | Contact |
|------|---------|
| Dev principal | Samuel Alcaraz |
| Support technique | contact@tempo-app.fr |
| DPO | dpo@tempo-app.fr |
| Urgence Stripe | https://support.stripe.com |
| Urgence Supabase | https://supabase.com/support |

## Rate limits

| Endpoint | Limite | Note |
|----------|--------|------|
| Supabase API (free tier) | 500 req/min | Upgrade Pro pour plus |
| Edge Functions | 500K invocations/mois (free) | |
| Stripe API | 100 req/s (test), 10K/s (live) | |
| API INSEE/Sirene | 30 req/min | Via data.gouv.fr |
| Auth (signup/login) | Rate limited par Supabase Auth | ~30 tentatives/heure/IP |
