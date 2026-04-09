# TEMPO — Trame de finition (v2.0 → v1.0 launch-ready)

> Version: plan de travail post-rapport du 8 avril 2026
> Objectif: passer d'un MVP fonctionnel (v2.0) a une plateforme prete pour lancement commercial fin 2026.
> Format: 8 chantiers sequentiels, chacun decoupe en sous-taches.

---

## Ou on en est (rappel du rapport)

**Fait** : auth, 3 roles, 12 tables + RLS, matching, carte, contrats + signature canvas, KYC, messagerie temps reel, notifications push, dark mode, i18n FR/EN, PWA, facturation (structure), 368 tests (29.8% couverture), 18 commits.

**Gaps critiques identifies** :
1. Pas de Stripe Connect -> pas de flux de paiement reel. Bloquant pour monetiser.
2. Signature canvas libsodium -> juridiquement fragile vs eIDAS.
3. Pas de validation SIRET automatique (API INSEE/Sirene).
4. Pages monolithiques : TravailleurApp (97KB), EntrepriseApp (68KB).
5. Couverture tests 29.8% -> loin des 60% vises.
6. Legal absent : pas de CGU/CGV/mentions legales/politique RGPD.
7. Pas de monitoring prod (Sentry, logs structures).
8. Pas de flux de lancement : domaine, SEO, onboarding commercial.

---

## CHANTIER 1 — Refactoring des pages monolithiques

**Objectif** : aucun fichier de page > 15 KB. Logique metier dans des hooks, UI dans des sous-composants.

### Sous-taches

1. **1.1** — Analyser TravailleurApp.jsx : lister toutes les responsabilites et proposer un decoupage. Livrable : docs/refactor-travailleur.md.
2. **1.2** — Extraire les onglets de TravailleurApp en composants dedies dans src/features/worker/.
3. **1.3** — Extraire la logique metier en hooks custom dans src/hooks/worker/.
4. **1.4** — Meme exercice pour EntrepriseApp -> src/features/company/ + src/hooks/company/.
5. **1.5** — Meme exercice pour AdminApp -> src/features/admin/.
6. **1.6** — Creer un layout commun <DashboardLayout> partage entre les 3 roles.
7. **1.7** — Verifier que les tests existants passent, ajuster si besoin.
8. **1.8** — Mesurer : aucune page > 15 KB. Rapport dans CHANGELOG.md.

**Criteres de done** : build vert, tests passent, poids des fichiers de page divise par >= 4.

---

## CHANTIER 2 — Integration Stripe Connect (paiements reels)

**Modele** : comptes Stripe Connect Express pour les workers, paiement destination avec application_fee_amount.

### Sous-taches

1. **2.1** — Provisionner un compte Stripe test, activer Connect. Documenter dans .env.example et docs/stripe-setup.md.
2. **2.2** — Edge Function stripe-create-connect-account.
3. **2.3** — Edge Function stripe-account-status.
4. **2.4** — Etape "Configurer paiements" dans l'onboarding worker.
5. **2.5** — Edge Function stripe-create-payment-intent (a la signature du contrat).
6. **2.6** — Page "Moyens de paiement" cote Company (Stripe Elements).
7. **2.7** — Fonction stripe-capture-on-timesheet-validated + gestion acomptes > 7 jours.
8. **2.8** — Webhook Stripe (payment_intent.succeeded/failed, account.updated, charge.refunded, dispute.created).
9. **2.9** — Gestion des litiges : bouton "Ouvrir un litige", gel du paiement, notif admin.
10. **2.10** — Page "Revenus" cote worker avec historique Stripe.
11. **2.11** — Tests Vitest + E2E Playwright sur le flux complet.
12. **2.12** — Documentation docs/stripe-flows.md avec diagrammes Mermaid.

**Criteres de done** : paiement test complet, commission prelevee, virement worker visible dans Stripe test.

---

## CHANTIER 3 — Conformite juridique & KYC renforce

### Sous-taches

1. **3.1** — API Sirene/INSEE dans Edge Function validate-siret.
2. **3.2** — Validation double workers : SIRET + attestation de vigilance URSSAF.
3. **3.3** — Formulaire d'attestation sur l'honneur signee.
4. **3.4** — Pages legales (routes /legal/*) : CGU, CGV, mentions legales, politique RGPD, cookies, charte travailleur.
5. **3.5** — Banniere cookies conforme CNIL.
6. **3.6** — Registre RGPD dans docs/rgpd/registre-traitements.md.
7. **3.7** — Export de donnees perso (art. 15 RGPD) : bouton "Telecharger mes donnees".
8. **3.8** — Suppression de compte (art. 17 RGPD) avec anonymisation.
9. **3.9** — Remplacer libsodium canvas par Yousign (ou equivalent eIDAS).
10. **3.10** — PDFs de contrats conformes avec toutes les mentions obligatoires.
11. **3.11** — Generation de factures conformes avec numerotation sequentielle + archivage 10 ans.

**Criteres de done** : SIRET valide obligatoire, 6 pages legales en ligne, contrats eIDAS-valides, facture conforme.

---

## CHANTIER 4 — Tests & qualite (29.8% -> 70%)

### Sous-taches

1. **4.1** — Mock Supabase complet dans src/test/mocks/supabase.ts.
2. **4.2** — Tests unitaires hooks worker (objectif 90%).
3. **4.3** — Tests unitaires hooks company.
4. **4.4** — Tests pages refactorees avec mock Supabase.
5. **4.5** — Tests Edge Functions (Stripe, SIRET, Yousign) avec mocks.
6. **4.6** — E2E Playwright : flux worker complet, flux company complet, flux admin.
7. **4.7** — Tests de charge k6 sur endpoints critiques.
8. **4.8** — Configurer Codecov dans le CI.

**Criteres de done** : couverture >= 70%, hooks metier >= 90%, 3 flows E2E verts.

---

## CHANTIER 5 — Observabilite & production readiness

### Sous-taches

1. **5.1** — Sentry front + Edge Functions.
2. **5.2** — Logging structure JSON dans Edge Functions.
3. **5.3** — Healthcheck /api/health (Supabase, Stripe, Yousign).
4. **5.4** — Alerting UptimeRobot.
5. **5.5** — Verifier backups Supabase PITR.
6. **5.6** — Rate limiting documente + ajoute sur endpoints sensibles.
7. **5.7** — Secrets management : audit + Vercel env vars + Supabase vault.
8. **5.8** — Runbook docs/runbook.md.

**Criteres de done** : erreur front remonte en < 30s, rollback documente, runbook valide.

---

## CHANTIER 6 — UX, performance & accessibilite

### Sous-taches

1. **6.1** — Audit Lighthouse mobile (objectif >= 90 perf, >= 95 accessibilite).
2. **6.2** — Optimiser bundles : code-splitting, lazy loading, compression images.
3. **6.3** — Audit axe-core accessibilite.
4. **6.4** — Mobile-first review sur iOS + Android.
5. **6.5** — Onboarding tour guide (driver.js).
6. **6.6** — Empty states soignes.
7. **6.7** — Micro-animations Framer Motion.
8. **6.8** — Verifier PWA : installable, offline basique.

**Criteres de done** : Lighthouse >= 90/95, zero erreur axe-core critique, PWA installable.

---

## CHANTIER 7 — Preparation au lancement commercial

### Sous-taches

1. **7.1** — Nom de domaine + DNS Vercel.
2. **7.2** — Landing page marketing.
3. **7.3** — SEO : meta tags, Open Graph, sitemap, JSON-LD.
4. **7.4** — Emails transactionnels via Resend.
5. **7.5** — Emails dans la langue de l'utilisateur.
6. **7.6** — Page statut.
7. **7.7** — Programme beta fermee (5 entreprises, 30-50 workers, 2 villes).
8. **7.8** — Dashboard admin suivi beta.
9. **7.9** — Widget feedback in-app.
10. **7.10** — Supports commerciaux (one-pagers, FAQ, argumentaire).

**Criteres de done** : domaine pointe sur l'app, landing SEO-ready, 5 partenaires pilotes, premier paiement reel.

---

## CHANTIER 8 — Go-live & iteration post-lancement

### Sous-taches

1. **8.1** — Go/No-go checklist finale.
2. **8.2** — Stripe test -> live, test paiement reel 10EUR.
3. **8.3** — Assurance RC Pro pour TEMPO.
4. **8.4** — Canal de support (Crisp/HelpScout + contact@).
5. **8.5** — Soft launch 1 ville, 2-4 semaines.
6. **8.6** — Iteration rapide sur les 3 principaux points de friction.
7. **8.7** — Ouverture 2 villes suivantes.
8. **8.8** — Roadmap publique v1.1.

**Criteres de done** : 10+ missions completees avec paiement reel, NPS >= 40, zero incident securite critique.

---

## Ordre recommande et dependances

```
Chantier 1 (Refacto) ─────┐
                          ├──> Chantier 2 (Stripe) ──┐
Chantier 3 (Legal/KYC) ───┤                          ├──> Chantier 4 (Tests) ──> Chantier 5 (Obs) ──> Chantier 6 (UX) ──> Chantier 7 (Launch prep) ──> Chantier 8 (Go-live)
                          └──> Chantier 3.9 (Yousign)┘
```

Parallelisation possible : chantiers 1 et 3 peuvent demarrer en parallele.

## Points de decision humaine (pas Claude Code)

1. **Avant Chantier 2** : budget Stripe (1.4% + 0.25EUR/tx + 0.25% Connect + commission TEMPO).
2. **Avant Chantier 3.9** : choix prestataire signature electronique (Yousign, Docusign, Universign...).
3. **Avant Chantier 7** : valider le nom commercial + recherche INPI classe 35.
4. **Avant Chantier 8** : consultation avocat droit du travail (500-1500EUR). Risque requalification salariee.
