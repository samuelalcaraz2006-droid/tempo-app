// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock refs ─────────────────────────────────────────
const { mockStripeInstance, mockLoadStripe } = vi.hoisted(() => {
  const mockStripeInstance = { elements: vi.fn(), confirmPayment: vi.fn() }
  const mockLoadStripe = vi.fn().mockResolvedValue(mockStripeInstance)
  return { mockStripeInstance, mockLoadStripe }
})

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: (...args) => mockLoadStripe(...args),
}))

// ── Supabase: mutable session ref ────────────────────────────
let sessionValue = { data: { session: { access_token: 'tok-abc123' } } }

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve(sessionValue),
    },
  },
}))

// ── Mock fetch ────────────────────────────────────────────────
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocks
import { getStripe, createConnectAccount, getStripeAccountStatus, createPaymentIntent, capturePayment } from '../lib/stripe'

// ────────────────────────────────────────────────────────────────
// getStripe tests
// ────────────────────────────────────────────────────────────────

describe('stripe.js — getStripe', () => {
  it('returns a promise', () => {
    const result = getStripe()
    expect(result).toBeInstanceOf(Promise)
  })

  it('loadStripe was called (singleton pattern)', () => {
    // stripePromise is initialized on first call — loadStripe must have been invoked
    expect(mockLoadStripe).toHaveBeenCalled()
  })

  it('returns the stripe instance when resolved', async () => {
    const stripe = await getStripe()
    expect(stripe).toBe(mockStripeInstance)
  })
})

// ────────────────────────────────────────────────────────────────
// callEdgeFunction helpers
// ────────────────────────────────────────────────────────────────

describe('stripe.js — callEdgeFunction helpers', () => {
  beforeEach(() => {
    // Restore authenticated session before each test
    sessionValue = { data: { session: { access_token: 'tok-abc123' } } }
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    })
  })

  it('createConnectAccount calls stripe-create-connect-account edge function', async () => {
    await createConnectAccount()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('stripe-create-connect-account'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('createConnectAccount sends Authorization header', async () => {
    await createConnectAccount()
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer tok-abc123')
  })

  it('getStripeAccountStatus calls stripe-account-status edge function', async () => {
    await getStripeAccountStatus()
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('stripe-account-status'),
      expect.anything()
    )
  })

  it('createPaymentIntent calls stripe-create-payment-intent with contractId', async () => {
    await createPaymentIntent('contract-42')
    const [, options] = mockFetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ contractId: 'contract-42' })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('stripe-create-payment-intent'),
      expect.anything()
    )
  })

  it('capturePayment calls stripe-capture-payment with contractId', async () => {
    await capturePayment('contract-99')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('stripe-capture-payment'),
      expect.anything()
    )
    const [, options] = mockFetch.mock.calls[0]
    expect(JSON.parse(options.body)).toEqual({ contractId: 'contract-99' })
  })

  it('throws when not authenticated', async () => {
    sessionValue = { data: { session: null } }
    await expect(createConnectAccount()).rejects.toThrow('Not authenticated')
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Internal error' }),
    })
    await expect(createConnectAccount()).rejects.toThrow('Internal error')
  })

  it('returns JSON data on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: 'https://connect.stripe.com/setup' }),
    })
    const result = await createConnectAccount()
    expect(result).toEqual({ url: 'https://connect.stripe.com/setup' })
  })
})
