import { describe, it, expect, vi, beforeAll } from 'vitest'

// Mock createClient avant l'import pour éviter de vraies connexions
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { persistSession: true },
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
    storage: { from: vi.fn() },
    rpc: vi.fn(),
  }))
}))

// Mock les variables d'env
vi.stubGlobal('import', { meta: { env: { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-key' } } })

import { extractKycStoragePath } from '../lib/supabase'

// ── extractKycStoragePath ──────────────────────────────────────
describe('extractKycStoragePath', () => {
  it('retourne null pour null', () => {
    expect(extractKycStoragePath(null)).toBeNull()
  })

  it('retourne null pour undefined', () => {
    expect(extractKycStoragePath(undefined)).toBeNull()
  })

  it('retourne null pour une chaîne vide', () => {
    expect(extractKycStoragePath('')).toBeNull()
  })

  it('retourne null pour une URL invalide (non-URL)', () => {
    expect(extractKycStoragePath('not-a-url')).toBeNull()
  })

  it('retourne null si le pattern kyc-documents est absent', () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/other-bucket/file.jpg'
    expect(extractKycStoragePath(url)).toBeNull()
  })

  it('extrait le path depuis une signed URL Supabase valide', () => {
    const url = 'https://project.supabase.co/storage/v1/object/sign/kyc-documents/user123/id/1234567890.jpg?token=abc123'
    expect(extractKycStoragePath(url)).toBe('user123/id/1234567890.jpg')
  })

  it('extrait le path avec plusieurs niveaux de répertoire', () => {
    const url = 'https://project.supabase.co/storage/v1/object/sign/kyc-documents/abc-def-ghi/siret_doc/1234.pdf?token=xxx'
    expect(extractKycStoragePath(url)).toBe('abc-def-ghi/siret_doc/1234.pdf')
  })

  it('strip les query params du path extrait', () => {
    const url = 'https://project.supabase.co/storage/v1/object/sign/kyc-documents/user/id/file.jpg?expiresIn=3600&token=abc'
    const result = extractKycStoragePath(url)
    expect(result).toBe('user/id/file.jpg')
    expect(result).not.toContain('?')
  })

  it('fonctionne avec une extension .png', () => {
    const url = 'https://project.supabase.co/storage/v1/object/sign/kyc-documents/user456/rc_pro/doc.png?t=xyz'
    expect(extractKycStoragePath(url)).toBe('user456/rc_pro/doc.png')
  })
})
