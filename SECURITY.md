# Sécurité — TEMPO App

## Credentials Supabase

### Nature des clés

- `VITE_SUPABASE_URL` — URL publique du projet Supabase (non secrète)
- `VITE_SUPABASE_ANON_KEY` — Clé anonyme publique, exposée au navigateur **par conception**. Elle est protégée par les politiques Row Level Security (RLS) côté base.
- `service_role` — **Clé secrète. Ne jamais committer, ne jamais exposer côté client.**

### Vérifier si des credentials ont été commités

```bash
git log --all --full-history -S "supabase.co" -- "*.env" "*.env.local"
```

Si cette commande retourne des commits, les clés ont été exposées et doivent être immédiatement révoquées.

### Rotation des clés (si compromises)

1. Aller sur [dashboard.supabase.com](https://supabase.com/dashboard)
2. Sélectionner le projet → **Settings → API**
3. Cliquer **"Regenerate"** sur la clé `anon` et la clé `service_role`
4. Mettre à jour les variables d'environnement dans le dashboard Vercel :
   - **Settings → Environment Variables**
   - Mettre à jour `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
5. Redéployer l'application

### Purger l'historique git (si une clé a été commitée)

```bash
# Installer git-filter-repo
pip install git-filter-repo

# Supprimer le fichier .env de tout l'historique
git filter-repo --path .env --invert-paths
git filter-repo --path .env.local --invert-paths

# Force-push toutes les branches (ATTENTION : réécrit l'historique)
git push origin --force --all
git push origin --force --tags
```

**Attention :** Tous les collaborateurs devront re-cloner le dépôt après un force-push.

## Variables d'environnement requises

Copier `.env.example` en `.env` et remplir les valeurs :

```bash
cp .env.example .env
```

Voir `.env.example` pour les variables nécessaires.

## RLS Supabase

Vérifier que la policy sur la table `profiles` interdit à un utilisateur de modifier son propre champ `role` en `'admin'`. La policy `profiles · modification propre` dans `supabase/migrations/004_rls.sql` doit restreindre les colonnes éditables ou un trigger doit bloquer la modification du rôle.

## Journal d'audit

Les actions administratives sensibles (validation KYC, etc.) sont enregistrées dans la table `audit_log`. Voir `supabase/migrations/006_audit_log.sql`.
