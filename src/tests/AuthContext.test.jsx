// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, renderHook } from '@testing-library/react'
import React from 'react'

// ── Mock Supabase ─────────────────────────────────────────────
// Le callback onAuthStateChange est stocké pour être déclenché depuis les tests.
const authCb = { fn: null }

const makeFromMock = (profileData = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: profileData, error: null }),
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

// ── Flush React effects (useEffect async) ────────────────────
const flushEffects = () => act(async () => {})

// ── Composant consommateur ────────────────────────────────────
const TestConsumer = () => {
  const { user, profile, loading, isAdmin, isWorker, isCompany } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{user ? user.id : 'no-user'}</span>
      <span data-testid="profile">{profile ? profile.role : 'no-profile'}</span>
      <span data-testid="isAdmin">{isAdmin ? 'admin' : 'not-admin'}</span>
      <span data-testid="isWorker">{isWorker ? 'worker' : 'not-worker'}</span>
      <span data-testid="isCompany">{isCompany ? 'company' : 'not-company'}</span>
    </div>
  )
}

// ── Setup commun ──────────────────────────────────────────────
beforeEach(() => {
  authCb.fn = null
  vi.clearAllMocks()
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    authCb.fn = cb
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  supabase.from.mockReturnValue(makeFromMock())
})

describe('AuthProvider', () => {
  it('loading passe à false après getSession sans session', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })
    expect(screen.getByTestId('user').textContent).toBe('no-user')
  })

  it('expose user et profil travailleur après SIGNED_IN', async () => {
    const fakeUser = { id: 'user-123' }
    const fakeProfile = { id: 'user-123', role: 'travailleur', status: 'verified' }
    supabase.from.mockReturnValue(makeFromMock(fakeProfile))

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await flushEffects()

    await act(async () => {
      authCb.fn('SIGNED_IN', { user: fakeUser })
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user-123')
      expect(screen.getByTestId('profile').textContent).toBe('travailleur')
      expect(screen.getByTestId('isWorker').textContent).toBe('worker')
      expect(screen.getByTestId('isAdmin').textContent).toBe('not-admin')
    })
  })

  it('remet user/profile à null après SIGNED_OUT', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await flushEffects()

    await act(async () => {
      authCb.fn('SIGNED_OUT', null)
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('no-user')
      expect(screen.getByTestId('profile').textContent).toBe('no-profile')
      expect(screen.getByTestId('loading').textContent).toBe('ready')
    })
  })

  it('isAdmin = true pour profil admin', async () => {
    const fakeUser = { id: 'admin-1' }
    supabase.from.mockReturnValue(makeFromMock({ id: 'admin-1', role: 'admin', status: 'verified' }))

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await flushEffects()

    await act(async () => {
      authCb.fn('SIGNED_IN', { user: fakeUser })
    })

    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('admin')
      expect(screen.getByTestId('isWorker').textContent).toBe('not-worker')
      expect(screen.getByTestId('isCompany').textContent).toBe('not-company')
    })
  })

  it('useAuth lève une erreur hors AuthProvider', () => {
    expect(() => render(<TestConsumer />)).toThrow('useAuth doit être utilisé dans AuthProvider')
  })

  it('isCompany = true pour profil entreprise', async () => {
    const fakeUser = { id: 'co-1' }
    supabase.from.mockReturnValue(makeFromMock({ id: 'co-1', role: 'entreprise', status: 'verified' }))

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await flushEffects()

    await act(async () => { authCb.fn('SIGNED_IN', { user: fakeUser }) })

    await waitFor(() => {
      expect(screen.getByTestId('isCompany').textContent).toBe('company')
    })
  })

  it('PASSWORD_RECOVERY met recovering=true et ne charge pas de profil', async () => {
    const RecoveringConsumer = () => {
      const { recovering } = useAuth()
      return <span data-testid="recovering">{recovering ? 'recovering' : 'normal'}</span>
    }

    render(<AuthProvider><RecoveringConsumer /></AuthProvider>)
    await flushEffects()

    await act(async () => {
      authCb.fn('PASSWORD_RECOVERY', { user: { id: 'rec-1' } })
    })

    await waitFor(() => {
      expect(screen.getByTestId('recovering').textContent).toBe('recovering')
    })
  })

  it('USER_UPDATED remet recovering=false et recharge le profil', async () => {
    const fakeUser = { id: 'upd-1' }
    supabase.from.mockReturnValue(makeFromMock({ id: 'upd-1', role: 'travailleur', status: 'verified' }))

    const RecoveringConsumer = () => {
      const { recovering, profile } = useAuth()
      return (
        <>
          <span data-testid="recovering">{recovering ? 'recovering' : 'normal'}</span>
          <span data-testid="profile">{profile?.role ?? 'no-profile'}</span>
        </>
      )
    }

    render(<AuthProvider><RecoveringConsumer /></AuthProvider>)
    await flushEffects()

    await act(async () => { authCb.fn('PASSWORD_RECOVERY', { user: fakeUser }) })
    await act(async () => { authCb.fn('USER_UPDATED', { user: fakeUser }) })

    await waitFor(() => {
      expect(screen.getByTestId('recovering').textContent).toBe('normal')
    })
  })
})

// ── Fonctions exposées par AuthProvider ───────────────────────
describe('AuthProvider — login / logout / register / refreshRoleData', () => {
  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

  it('login retourne data/error en cas de succès', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.login({ email: 'a@b.com', password: 'pass' })
    })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' })
    expect(res.error).toBeNull()
  })

  it('login retourne { error } quand signInWithPassword rejette', async () => {
    supabase.auth.signInWithPassword.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.login({ email: 'a@b.com', password: 'pass' })
    })

    expect(res.error.message).toBe('network error')
  })

  it('logout appelle signOut', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.logout() })

    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('register retourne data en cas de succès', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: 'new-1' } }, error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.register({ email: 'a@b.com', password: 'pass', role: 'travailleur' })
    })

    expect(supabase.auth.signUp).toHaveBeenCalled()
    expect(res.error).toBeNull()
  })

  it('register retourne { error } quand signUp rejette', async () => {
    supabase.auth.signUp.mockRejectedValue(new Error('signup failed'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res
    await act(async () => {
      res = await result.current.register({ email: 'a@b.com', password: 'pass', role: 'travailleur' })
    })

    expect(res.error.message).toBe('signup failed')
  })

  it('refreshRoleData ne crashe pas quand user est null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => { await result.current.refreshRoleData() })

    expect(result.current.user).toBeNull()
  })

  it('loadProfile absorbe les erreurs Supabase sans crasher', async () => {
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
    expect(localCb.fn).not.toBeNull()

    await act(async () => {
      localCb.fn('SIGNED_IN', { user: { id: 'err-user' } })
    })

    // loadProfile rejette — profile reste null
    await waitFor(() => expect(result.current.profile).toBeNull())
  })

  it('getSession qui échoue passe loading à false', async () => {
    supabase.auth.getSession.mockRejectedValue(new Error('session error'))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
  })
})
