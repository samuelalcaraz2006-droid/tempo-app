// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mock refs ─────────────────────────────────────────
const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}))

// ── Mock fetch for validateSiret ──────────────────────────────
const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
    auth: {
      getSession: (...args) => mockGetSession(...args),
    },
  },
}))

import { validateSiret, signAttestation, requestDataExport, requestAccountDeletion, saveCookieConsent } from '../lib/legal'

describe('legal.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default authenticated session
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'access-token-xyz' } },
    })

    // Default fetch success
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ valid: true, company: 'Test SARL' }),
    })
  })

  // ── validateSiret ───────────────────────────────────────────

  describe('validateSiret', () => {
    it('calls the validate-siret edge function via fetch', async () => {
      await validateSiret('12345678901234')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('validate-siret'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('sends the siret in the request body', async () => {
      await validateSiret('98765432100012')
      const [, options] = mockFetch.mock.calls[0]
      expect(JSON.parse(options.body)).toEqual({ siret: '98765432100012' })
    })

    it('includes Authorization header', async () => {
      await validateSiret('12345678901234')
      const [, options] = mockFetch.mock.calls[0]
      expect(options.headers['Authorization']).toBe('Bearer access-token-xyz')
    })

    it('throws when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } })
      await expect(validateSiret('123')).rejects.toThrow('Not authenticated')
    })

    it('returns json response from edge function', async () => {
      const result = await validateSiret('12345678901234')
      expect(result).toEqual({ valid: true, company: 'Test SARL' })
    })
  })

  // ── signAttestation ─────────────────────────────────────────

  describe('signAttestation', () => {
    it('calls supabase.from("workers")', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      await signAttestation('user-123')
      expect(mockFrom).toHaveBeenCalledWith('workers')
    })

    it('updates attestation_honneur_signed_at for the correct user', async () => {
      const mockEqFn = vi.fn().mockResolvedValue({ error: null })
      const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockEqFn })
      mockFrom.mockReturnValue({ update: mockUpdateFn })

      await signAttestation('user-456')

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({ attestation_honneur_signed_at: expect.any(String) })
      )
      expect(mockEqFn).toHaveBeenCalledWith('id', 'user-456')
    })

    it('returns { error } from supabase', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      const result = await signAttestation('user-789')
      expect(result).toEqual({ error: null })
    })
  })

  // ── requestDataExport ────────────────────────────────────────

  describe('requestDataExport', () => {
    it('inserts into data_export_requests table', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'export-1' }, error: null }),
          }),
        }),
      })
      await requestDataExport('user-1')
      expect(mockFrom).toHaveBeenCalledWith('data_export_requests')
    })

    it('inserts with correct user_id', async () => {
      const mockSingleFn = vi.fn().mockResolvedValue({ data: { id: 'e-1' }, error: null })
      const mockSelectFn = vi.fn().mockReturnValue({ single: mockSingleFn })
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectFn })
      mockFrom.mockReturnValue({ insert: mockInsertFn })

      await requestDataExport('user-abc')
      expect(mockInsertFn).toHaveBeenCalledWith({ user_id: 'user-abc' })
    })

    it('returns { data, error } from supabase', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'exp-1' }, error: null }),
          }),
        }),
      })
      const result = await requestDataExport('user-1')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('error')
    })
  })

  // ── requestAccountDeletion ───────────────────────────────────

  describe('requestAccountDeletion', () => {
    it('inserts into account_deletion_requests table', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'del-1' }, error: null }),
          }),
        }),
      })
      await requestAccountDeletion('user-1', 'Je pars')
      expect(mockFrom).toHaveBeenCalledWith('account_deletion_requests')
    })

    it('includes user_id and reason in the insert payload', async () => {
      const mockSingleFn = vi.fn().mockResolvedValue({ data: {}, error: null })
      const mockSelectFn = vi.fn().mockReturnValue({ single: mockSingleFn })
      const mockInsertFn = vi.fn().mockReturnValue({ select: mockSelectFn })
      mockFrom.mockReturnValue({ insert: mockInsertFn })

      await requestAccountDeletion('user-del', 'motif test')
      expect(mockInsertFn).toHaveBeenCalledWith({ user_id: 'user-del', reason: 'motif test' })
    })

    it('returns { data, error }', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'd-1' }, error: null }),
          }),
        }),
      })
      const result = await requestAccountDeletion('u', 'r')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('error')
    })
  })

  // ── saveCookieConsent ────────────────────────────────────────

  describe('saveCookieConsent', () => {
    it('calls supabase.from("profiles")', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      await saveCookieConsent('user-1')
      expect(mockFrom).toHaveBeenCalledWith('profiles')
    })

    it('updates cookie_consent_at and cookie_consent_version', async () => {
      const mockEqFn = vi.fn().mockResolvedValue({ error: null })
      const mockUpdateFn = vi.fn().mockReturnValue({ eq: mockEqFn })
      mockFrom.mockReturnValue({ update: mockUpdateFn })

      await saveCookieConsent('user-consent')
      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          cookie_consent_at: expect.any(String),
          cookie_consent_version: '1.0',
        })
      )
      expect(mockEqFn).toHaveBeenCalledWith('id', 'user-consent')
    })

    it('returns { error: null } on success', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })
      const result = await saveCookieConsent('user-1')
      expect(result).toEqual({ error: null })
    })

    it('returns error when supabase fails', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'RLS violation' } }),
        }),
      })
      const result = await saveCookieConsent('user-bad')
      expect(result.error).toBeTruthy()
    })
  })
})
