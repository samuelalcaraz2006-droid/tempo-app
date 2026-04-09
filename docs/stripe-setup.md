# Stripe Connect — Setup Guide

## Architecture

TEMPO utilise **Stripe Connect Express** pour gerer les paiements entre entreprises et travailleurs.

```
Entreprise ──(paye)──> TEMPO (plateforme) ──(reverse)──> Worker (compte Connect Express)
                           │
                           └── commission TEMPO (application_fee_amount)
```

### Flux de paiement

1. **Inscription worker** : creation d'un compte Connect Express via `stripe-create-connect-account`
2. **Onboarding Stripe** : le worker complete son KYC Stripe via le lien d'onboarding
3. **Signature contrat** : un PaymentIntent est cree avec `capture_method: 'manual'` (autorisation sans capture)
4. **Validation timesheet** : la company valide → le paiement est capture via `stripe-capture-payment`
5. **Commission** : TEMPO preleve `application_fee_amount` automatiquement
6. **Virement worker** : Stripe reverse le montant (moins la commission) vers le compte Connect du worker

### Comptes

- **Plateforme TEMPO** : compte Stripe principal (gere les Connect accounts)
- **Workers** : comptes Connect Express (KYC gere par Stripe)
- **Companies** : paient via carte/SEPA, pas de compte Connect

## Variables d'environnement

```env
# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Backend (Supabase Edge Functions secrets)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Edge Functions

| Fonction | Methode | Description |
|----------|---------|-------------|
| `stripe-create-connect-account` | POST | Cree un compte Connect Express pour un worker |
| `stripe-account-status` | POST | Verifie le statut du compte (charges_enabled, payouts_enabled) |
| `stripe-create-payment-intent` | POST | Cree un PaymentIntent a la signature du contrat |
| `stripe-capture-payment` | POST | Capture le paiement apres validation timesheet |
| `stripe-webhook` | POST | Recoit les evenements Stripe (payment_intent.*, account.*) |

## Commission

- Taux par defaut : **8% TTC** sur le montant de la mission
- Stripe fees : ~1.4% + 0.25EUR + 0.25% Connect (deduit du brut)
- Worker recoit : montant - commission TEMPO - frais Stripe

## Mode test vs live

- Les cles `pk_test_` / `sk_test_` permettent de tester sans argent reel
- Utiliser les cartes test Stripe : `4242 4242 4242 4242` (succes), `4000 0000 0000 9995` (decline)
- Passage en live : remplacer les cles dans les env vars + activer le compte Stripe
