# TEMPO — Plateforme de missions temporaires

TEMPO met en relation des **entreprises** avec des **travailleurs** pour des missions courtes, directement depuis un navigateur web.

## Stack technique

- **Frontend** : React 18 + Vite 5
- **Backend** : Supabase (PostgreSQL + Auth + Realtime)
- **Cartes** : Leaflet / React Leaflet
- **Animations** : Framer Motion
- **Déploiement** : Vercel

## Fonctionnalités

### Pour les travailleurs
- Parcourir et postuler aux missions disponibles
- Carte interactive des missions géolocalisées
- Gestion des disponibilités et du profil
- Messagerie avec les entreprises
- Signature électronique des contrats
- Suivi des gains et factures

### Pour les entreprises
- Publier des missions (poste, taux, durée, localisation)
- Gestion des candidatures et assignation
- Contrats numériques et facturation
- Dashboard de statistiques

### Espace admin
- Gestion des utilisateurs et vérifications KYC
- Statistiques globales de la plateforme

## Installation locale

```bash
git clone https://github.com/samuelalcaraz2006-droid/tempo-app.git
cd tempo-app
npm install
cp .env.example .env.local
# Remplis VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env.local
npm run dev
```

Ouvre http://localhost:5173

## Variables d'environnement

Copie `.env.example` en `.env.local` et remplis :

```
VITE_SUPABASE_URL=https://ton-projet.supabase.co
VITE_SUPABASE_ANON_KEY=ta_clé_anon_ici
```

## Base de données

Les migrations sont dans `supabase/migrations/`. Exécute chaque fichier `.sql` dans l'ordre dans l'éditeur SQL Supabase.

## Déploiement (Vercel)

1. Connecte ce repo GitHub à [Vercel](https://vercel.com)
2. Ajoute les variables d'environnement (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Vercel déploie automatiquement à chaque push sur `main`

## Licence

MIT
