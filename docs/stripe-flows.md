# Stripe Connect — Diagrammes de flux

## 1. Onboarding Worker (creation compte Connect)

```
Worker                  TEMPO Frontend              Edge Function              Stripe
  |                         |                           |                       |
  |-- Clic "Configurer" --> |                           |                       |
  |                         |-- POST /stripe-create ---> |                       |
  |                         |   connect-account         |-- accounts.create --> |
  |                         |                           |<-- account_id --------|
  |                         |                           |-- accountLinks -----> |
  |                         |                           |<-- onboarding_url ----|
  |                         |<-- { onboardingUrl } ------|                       |
  |<-- window.open(url) ----|                           |                       |
  |                         |                           |                       |
  |== Complete KYC Stripe =========================================> |
  |                         |                           |<-- account.updated ---|
  |                         |                           |   (webhook)           |
  |                         |                           |-- UPDATE workers ---->|
  |                         |                           |   stripe_charges=true |
```

## 2. Paiement mission (autorisation + capture differee)

```
Company                 TEMPO Frontend              Edge Function              Stripe
  |                         |                           |                       |
  |== Signe le contrat ==>  |                           |                       |
  |                         |-- POST /stripe-create ---> |                       |
  |                         |   payment-intent          |-- paymentIntents ----> |
  |                         |                           |   .create(manual)     |
  |                         |                           |<-- client_secret ------|
  |                         |<-- { clientSecret } -------|                       |
  |                         |                           |                       |
  |-- Confirme le paiement  |-- confirmCardPayment ---->|                       |
  |   (carte / SEPA)       |                           |<-- requires_capture ---|
  |                         |                           |                       |
  | ... mission en cours ... |                           |                       |
  |                         |                           |                       |
  |== Valide timesheet ===> |                           |                       |
  |                         |-- POST /stripe-capture --> |                       |
  |                         |   payment                 |-- paymentIntents ----> |
  |                         |                           |   .capture()          |
  |                         |                           |<-- succeeded ----------|
  |                         |<-- { captured: true } ------|                       |
  |                         |                           |                       |
  |                         |                           |<-- payment_intent -----|
  |                         |                           |   .succeeded (webhook)|
  |                         |                           |-- UPDATE invoice ----> |
  |                         |                           |-- NOTIFY worker -----> |
```

## 3. Commission TEMPO

```
Montant mission : 1000 EUR (100h x 10 EUR/h)

  Company paye      : 1000 EUR (PaymentIntent amount)
  Commission TEMPO  :   80 EUR (application_fee_amount = 8%)
  Frais Stripe      :  ~17 EUR (1.4% + 0.25 EUR + 0.25%)
  Worker recoit     :  920 EUR (transfer vers compte Connect)
  TEMPO net         :  ~63 EUR (commission - frais Stripe plateforme)
```

## 4. Litige

```
Worker/Company          TEMPO Frontend              Supabase                   Stripe
  |                         |                           |                       |
  |-- Ouvrir litige ------> |                           |                       |
  |                         |-- INSERT disputes -------> |                       |
  |                         |-- NOTIFY admin ----------> |                       |
  |                         |                           |                       |
  | ... OU via carte (chargeback) ...                   |<-- charge.dispute ----|
  |                         |                           |   .created (webhook)  |
  |                         |                           |-- INSERT disputes --> |
  |                         |                           |-- NOTIFY admin -----> |
  |                         |                           |                       |
  | Admin resout :          |                           |                       |
  |   resolved_worker      = rembourser la company     |                       |
  |   resolved_company     = confirmer le paiement     |                       |
  |   escalated            = intervention juridique    |                       |
```

## 5. Edge Functions deployees

| Slug | JWT | Description |
|------|-----|-------------|
| `stripe-create-connect-account` | Oui | Cree/reprend un compte Connect Express |
| `stripe-account-status` | Oui | Verifie charges_enabled + payouts_enabled |
| `stripe-create-payment-intent` | Oui | Cree un PaymentIntent (manual capture) |
| `stripe-capture-payment` | Oui | Capture le paiement apres validation |
| `stripe-webhook` | Non | Recoit les evenements Stripe |

## 6. Evenements webhook traites

| Evenement | Action |
|-----------|--------|
| `payment_intent.succeeded` | UPDATE contract + invoice, NOTIFY worker |
| `payment_intent.payment_failed` | UPDATE contract, NOTIFY company |
| `account.updated` | UPDATE worker stripe_charges/payouts_enabled |
| `charge.dispute.created` | INSERT dispute, NOTIFY admins |
