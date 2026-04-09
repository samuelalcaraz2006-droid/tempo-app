import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

let stripePromise = null

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

async function callEdgeFunction(name, body = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || `Edge function error: ${res.status}`)
  }

  return res.json()
}

// Worker: create or resume Stripe Connect onboarding
export async function createConnectAccount() {
  return callEdgeFunction('stripe-create-connect-account')
}

// Worker: check Stripe account status
export async function getStripeAccountStatus() {
  return callEdgeFunction('stripe-account-status')
}

// Company: create a PaymentIntent for a contract
export async function createPaymentIntent(contractId) {
  return callEdgeFunction('stripe-create-payment-intent', { contractId })
}

// Company: capture payment after timesheet validation
export async function capturePayment(contractId) {
  return callEdgeFunction('stripe-capture-payment', { contractId })
}
