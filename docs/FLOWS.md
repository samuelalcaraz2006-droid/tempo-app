# TEMPO — Flux métier

> Vue d'ensemble des flux de bout en bout. Référence pour onboarder un
> nouveau contributeur (ou re-contextualiser après 3 mois hors projet).

## 1. Inscription et activation

### Worker
```
Page Auth → role picker "Travailleur"
  → étape 1 : email + mot de passe + first_name / last_name
  → étape 2 : ville + rayon + SIRET (validation API INSEE)
  → étape 3 : secteur(s) + CGU/CGV accept
  → supabase.auth.signUp
    → trigger handle_new_user
      → profiles + workers créés
        → email de confirmation
          → à la 1ère connexion : upload KYC (pièce identité, SIRET, RC Pro)
            → côté admin : validation KYC manuelle
              → côté worker : is_available = true, badges débloqués
```

### Company
```
Page Auth → role picker "Entreprise"
  → étape 1 : email + mdp + nom
  → étape 2 : SIRET (validation) + secteur + ville
  → étape 3 : CGU/CGV
  → trigger handle_new_user → companies créé
    → dashboard vide, CTA "Publier votre première mission"
```

## 2. Mission lifecycle

### Côté entreprise
```
Dashboard → "+ Nouvelle mission"
  → CompanyPublishMission (4 étapes)
    1. Titre + description (anti red flags)
    2. Conditions : ville + début + durée + taux horaire
    3. Compétences + équipement attendus (chips)
    4. Motif légal + preview + publier
  → missions.insert (status=draft → open)
    → trigger notify_matching
      → notifications insérées pour workers du secteur disponibles
        dans le rayon et avec les compétences matchant
  → Candidats arrivent (applications pending)
    → Candidates view → clic "Profil" → PublicWorkerProfile
      → "Retenir" → applications.update(accepted)
        → trigger auto-generate contract
          → mission status = matched
            → contract_offers créé côté worker
              → worker signe → contract status = signed
                → côté company : mission "en cours"
                  → time_entries soumis par worker
                    → company valide → mission status = completed
                      → trigger auto-generate invoice
                        → côté company : Stripe paiement
                          → webhook → invoice.status = paid
                            → ratings ouverts 48h
```

### Côté worker
```
WorkerMissionsList → filtres (secteur, tarif, ville, urgence)
  → clic mission → WorkerMissionDetail
    → "Postuler" → applications.insert(pending, match_score)
      → suivi : WorkerApplications
        → notification application_accepted reçue
          → Contract à signer → signature canvas
            → contract_offers.update(accepted) → contract.status = signed
              → dashboard : "Mission en cours" avec tagline "démarre demain 6h"
                → jour J : pointage via time_entries
                  → soumission → attente validation company
                    → invoice générée → gains.list
                      → Stripe payout → solde crédité
                        → rating bidirectionnel
```

## 3. Gestion KYC

```
Worker upload docs → storage.objects + workers.kyc_submitted_at
  → Admin (AdminApp → AdminKycPanel) voit la liste kyc_submitted_at IS NOT NULL
    → Admin valide pièce par pièce (id_verified, siret_verified, rc_pro_verified)
      ou rejette avec raison
        → notification au worker
          → triple ✓ : badge "TEMPO Vérifié" débloqué
```

## 4. Litiges (disputes)

```
Worker OU Company clique "Ouvrir un litige" sur un contrat
  → DisputeModal → disputes.insert(status=open)
    → fraud_cases.insert(related)
      → notification aux deux parties + admin
        → Admin review → statut resolved/escalated
          → notification résolution
```

## 5. Notifications

```
Supabase trigger (notifications.insert)
  → Realtime broadcast au user_id
    → NotificationsView (unified FR worker + company)
      → filter pills : Toutes / Non lues / Missions / Contrats / Paiements / Litiges
        → clic → resolveTarget(type, role) → setScreen(deep-link)
```

Types gérés : `new_mission`, `mission_matched`, `application_*`,
`contract_*`, `invoice_*`, `payment_received`, `rating_received`,
`kyc_*`, `fraud_case_*`, `amendment_*`, `account_*`, `trust_*`,
`time_entries_*`, `new_message`. Total : 32 types côté UI.

## 6. Profils publics (carte de visite)

### Worker vu par company
```
Côté company : clic "Profil" sur un candidat
  → EntrepriseApp.openWorkerProfile(workerId, { applicationId, matchScore })
    → PublicWorkerProfile
      → getPublicWorkerProfile(workerId, viewerCompanyId)
        → hasApplication = true (company a reçu sa candidature)
          → visibility = 'contextual' → nom complet "Marc Rousseau"
        → badges calculés : workerBadges(worker, missions)
        → loyalCompanies, returnRate, memberSince
      → Affiche hero navy + match score + expertise + avis + KYC
```

### Company vue par worker
```
Côté worker : clic sur le nom de la company dans MissionCard / applications
  → TravailleurApp.openCompanyProfile(companyId, companyData)
    → PublicCompanyProfile
      → getPublicCompanyProfile(companyId)
        → infos entreprise + missions open + stats rebooking
      → Affiche hero + missions postulables + avis workers + badges
```

## 7. Monitoring & debug

```
Erreur runtime en prod
  → ErrorBoundary (src/App.jsx)
    → captureError(error, { componentStack }) → Sentry
      → Sentry inclut :
        - User context (user.id, email) via setSentryUser
        - Breadcrumbs navigation (trackScreen à chaque setScreen)
        - Session Replay 100% si on error
          → Dashboard Sentry : on voit le chemin + la frame précise

Warning produit au module-load (env vars manquantes)
  → console.error (bypass Sentry non-initialisé) avec biome-ignore
```

## 8. Déploiement

```
git push main → GitHub Actions CI
  → npm run lint (biome)
  → npm test (vitest run)
  → npm run build (vite + esbuild minifyIdentifiers + keepNames)
  → Vercel preview auto (sur branche) ou prod (sur main)
    → build génère /version.json avec VERCEL_GIT_COMMIT_SHA
      → côté client : useUpdateChecker poll /version.json toutes les 60s
        → si buildId change → window.location.reload()
```
