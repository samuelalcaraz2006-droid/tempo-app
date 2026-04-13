# TEMPO Mobile — Application iOS & Android

Application mobile React Native / Expo pour la plateforme TEMPO.

## Démarrage rapide

```bash
cd mobile
npm install
```

Copier le fichier d'environnement et remplir les valeurs :
```bash
cp .env.example .env
# Éditer .env avec vos clés Supabase
```

## Lancer l'app

```bash
npx expo start
```

Puis **scanner le QR code** avec l'app **Expo Go** (disponible sur l'App Store iOS et Google Play).

### Tester dans le navigateur
```bash
npx expo start --web
```

## Structure

```
src/
├── lib/          # Supabase client + helpers + formatters
├── theme/        # Couleurs de la marque
├── contexts/     # AuthContext (session utilisateur)
├── navigation/   # RootNavigator, WorkerTabs, CompanyTabs
├── components/   # Composants partagés (Button, Badge, Toast, MissionCard…)
└── screens/
    ├── auth/     # AuthScreen (login + inscription)
    ├── worker/   # 8 écrans espace travailleur
    └── company/  # 6 écrans espace entreprise
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL Supabase (même que le site web) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clé anon Supabase (même que le site web) |

## Fonctionnalités

### Espace Travailleur
- Tableau de bord avec stats et missions urgentes
- Liste des missions avec filtres (secteur, urgence, recherche)
- Détail mission + candidature en 1 clic
- Suivi des candidatures (acceptées / refusées / retirées)
- Gains et factures
- Profil + upload documents KYC (pièce d'identité, SIRET, RC Pro)
- Messagerie temps réel avec les entreprises
- Notifications push

### Espace Entreprise
- Tableau de bord missions actives
- Publication de mission (formulaire complet)
- Gestion candidatures (accepter / refuser)
- Statistiques & visualisation
- Contrats et factures
- Messagerie temps réel avec les travailleurs

## Test sur émulateur

> KVM n'est pas disponible dans cet environnement. Utilisez **Expo Go** sur un téléphone physique.
> 
> Pour un émulateur Android, installez Android Studio sur votre machine locale puis `npx expo start --android`.
> Pour le simulateur iOS (macOS uniquement), `npx expo start --ios`.
