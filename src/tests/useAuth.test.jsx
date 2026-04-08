// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// ── Mock Supabase ─────────────────────────────────────────────
const authCb = { fn: null }

const makeFromMock = (profileData = null, workerData = null, companyData = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockImplementation(async () => {
    if (profileData) return { data: profileData, error: null }
    return { data: null, error: null }
  }),
})

vi.mock('../lib/supabase', () => {
  const supabase = {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authCb.fn = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn(() => makeFromMock()),
  }
  return { supabase }
})

import { AuthProvider } from '../contexts/AuthContext'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'

const flushEffects = () => act(async () => {})

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

beforeEach(() => {
  authCb.fn = null
  vi.clearAllMocks()
  localStorage.clear()
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    authCb.fn = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  supabase.from.mockReturnValue(makeFromMock())
})

// ── Hook isolation ────────────────────────────────────────────
describe('useAuth — hors provider', () => {
  it('lève une erreur explicite si utilisé hors AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth doit être utilisé dans AuthProvider'
    )
  })
})

// ── État initial ──────────────────────────────────────────────
describe('useAuth — état initial', () => {
  it('loading=true puis false, user=null sans session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.roleData).toBeNull()
    expect(result.current.recovering).toBe(false)
  })

  it('expose toutes les propriétés attendues', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const keys = ['user','profile','roleData','loading','recovering',
      'isWorker','isCompany','isAdmin','isVerified',
      'login','logout','register','refreshRoleData']
    keys.forEach(k => expect(result.current).toHaveProperty(k))
  })

  it('isWorker / isCompany / isAdmin / isVerified = false sans profil', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isWorker).toBe(false)
    expect(result.current.isCompany).toBe(false)
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isVerified).toBe(false)
  })
})

// ── États authentifiés ────────────────────────────────────────
describe('useAuth — états authentifiés', () => {
  it('user et isWorker=true après SIGNED_IN travailleur', async () => {
    const fakeUser = { id: 'w-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'w-1', role: 'travailleur', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })

    await waitFor(() => {
      expect(result.current.user?.id).toBe('w-1')
      expect(result.current.isWorker).toBe(true)
      expect(result.current.isVerified).toBe(true)
    })
  })

  it('isCompany=true après SIGNED_IN entreprise', async () => {
    const fakeUser = { id: 'co-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'co-1', role: 'entreprise', status: 'pending' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })

    await waitFor(() => {
      expect(result.current.isCompany).toBe(true)
      expect(result.current.isWorker).toBe(false)
      expect(result.current.isVerified).toBe(false)
    })
  })

  it('isAdmin=true après SIGNED_IN admin', async () => {
    const fakeUser = { id: 'adm-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'adm-1', role: 'admin', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(true)
      expect(result.current.isWorker).toBe(false)
      expect(result.current.isCompany).toBe(false)
    })
  })

  it('session initiale avec user charge le profil', async () => {
    const fakeUser = { id: 'sess-1' }
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: fakeUser } } })
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'sess-1', role: 'travailleur', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user?.id).toBe('sess-1')
    expect(result.current.profile?.role).toBe('travailleur')
  })
})

// ── SIGNED_OUT ────────────────────────────────────────────────
describe('useAuth — logout / SIGNED_OUT', () => {
  it('user/profile/roleData reviennent à null après SIGNED_OUT', async () => {
    const fakeUser = { id: 'out-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'out-1', role: 'travailleur', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()
    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })
    await waitFor(() => expect(result.current.user?.id).toBe('out-1'))

    await act(async () => { authCb.fn('SIGNED_OUT', null) })

    await waitFor(() => {
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.roleData).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  it('logout nettoie les clés tempo_ du localStorage', async () => {
    localStorage.setItem('tempo_foo', 'bar')
    localStorage.setItem('other_key', 'value')

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.logout() })

    expect(localStorage.getItem('tempo_foo')).toBeNull()
    expect(localStorage.getItem('other_key')).toBe('value')
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('logout force le reset local si signOut échoue', async () => {
    supabase.auth.signOut.mockRejectedValue(new Error('signout failed'))

    const fakeUser = { id: 'fail-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'fail-1', role: 'travailleur', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()
    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })
    await waitFor(() => expect(result.current.user?.id).toBe('fail-1'))

    await act(async () => { await result.current.logout() })

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
  })
})

// ── Login ─────────────────────────────────────────────────────
describe('useAuth — login', () => {
  it('retourne data/error:null en cas de succès', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } }, error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.login({ email: 'a@b.com', password: 'pass' })
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com', password: 'pass'
    })
    expect(res.error).toBeNull()
    expect(res.data).toBeDefined()
  })

  it('retourne { error } quand signInWithPassword retourne une erreur', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null, error: { message: 'Invalid credentials' }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.login({ email: 'a@b.com', password: 'wrong' })
    })

    expect(res.error.message).toBe('Invalid credentials')
  })

  it('retourne { error } quand signInWithPassword rejette (erreur réseau)', async () => {
    supabase.auth.signInWithPassword.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.login({ email: 'a@b.com', password: 'pass' })
    })

    expect(res.error.message).toBe('network error')
  })
})

// ── Register ──────────────────────────────────────────────────
describe('useAuth — register', () => {
  it('retourne data en cas de succès (travailleur)', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'new-w' } }, error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.register({
        email: 'a@b.com', password: 'pass',
        role: 'travailleur', firstName: 'Jean', lastName: 'Dupont'
      })
    })

    expect(supabase.auth.signUp).toHaveBeenCalled()
    const callArgs = supabase.auth.signUp.mock.calls[0][0]
    expect(callArgs.options.data.role).toBe('travailleur')
    expect(res.error).toBeNull()
  })

  it('retourne data en cas de succès (entreprise)', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'new-co' } }, error: null
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.register({
        email: 'co@b.com', password: 'pass',
        role: 'entreprise', companyName: 'Acme Corp'
      })
    })

    const callArgs = supabase.auth.signUp.mock.calls[0][0]
    expect(callArgs.options.data.company_name).toBe('Acme Corp')
    expect(res.error).toBeNull()
  })

  it('retourne { error } quand signUp retourne une erreur', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: null, error: { message: 'Email already in use' }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.register({ email: 'a@b.com', password: 'pass', role: 'travailleur' })
    })

    expect(res.error.message).toBe('Email already in use')
  })

  it('retourne { error } quand signUp rejette (erreur réseau)', async () => {
    supabase.auth.signUp.mockRejectedValue(new Error('signup failed'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.register({ email: 'a@b.com', password: 'pass', role: 'travailleur' })
    })

    expect(res.error.message).toBe('signup failed')
  })
})

// ── refreshRoleData ───────────────────────────────────────────
describe('useAuth — refreshRoleData', () => {
  it('ne crashe pas quand user est null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.refreshRoleData() })

    expect(result.current.user).toBeNull()
  })

  it('recharge le profil quand user est défini', async () => {
    const fakeUser = { id: 'ref-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'ref-1', role: 'travailleur', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()
    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })
    await waitFor(() => expect(result.current.profile?.role).toBe('travailleur'))

    const callCount = supabase.from.mock.calls.length
    await act(async () => { await result.current.refreshRoleData() })

    expect(supabase.from.mock.calls.length).toBeGreaterThan(callCount)
  })
})

// ── PASSWORD_RECOVERY ─────────────────────────────────────────
describe('useAuth — password recovery', () => {
  it('recovering=true après PASSWORD_RECOVERY', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => {
      authCb.fn('PASSWORD_RECOVERY', { user: { id: 'rec-1' } })
    })

    await waitFor(() => expect(result.current.recovering).toBe(true))
  })

  it('SIGNED_IN après PASSWORD_RECOVERY est ignoré (recovering reste true)', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => { authCb.fn('PASSWORD_RECOVERY', { user: { id: 'rec-1' } }) })
    await act(async () => { authCb.fn('SIGNED_IN', { user: { id: 'rec-1' } }) })

    await waitFor(() => expect(result.current.recovering).toBe(true))
  })

  it('USER_UPDATED remet recovering=false', async () => {
    const fakeUser = { id: 'upd-1' }
    supabase.from.mockReturnValue(
      makeFromMock({ id: 'upd-1', role: 'travailleur', status: 'verified' })
    )

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => { authCb.fn('PASSWORD_RECOVERY', { user: fakeUser }) })
    await waitFor(() => expect(result.current.recovering).toBe(true))

    await act(async () => { authCb.fn('USER_UPDATED', { user: fakeUser }) })
    await waitFor(() => expect(result.current.recovering).toBe(false))
  })
})

// ── Error handling ────────────────────────────────────────────
describe('useAuth — gestion des erreurs', () => {
  it('getSession qui échoue passe loading à false', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('session error'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('loadProfile absorbe les erreurs DB sans crasher', async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockRejectedValue(new Error('db error')),
    })

    const localCb = { fn: null }
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      localCb.fn = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await flushEffects()

    await act(async () => {
      localCb.fn('SIGNED_IN', { user: { id: 'err-user' } })
    })

    await waitFor(() => expect(result.current.profile).toBeNull())
  })
})
