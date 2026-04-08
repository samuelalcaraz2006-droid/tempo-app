// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useAdminGuard } from '../hooks/useAdminGuard'

const makeWrapper = (contextValue) => ({ children }) => (
  <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
)

describe('useAdminGuard', () => {
  it('allowed = true quand profil admin et chargement terminé', () => {
    const wrapper = makeWrapper({ user: { id: '1' }, profile: { role: 'admin' }, loading: false })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })
    expect(result.current.allowed).toBe(true)
    expect(result.current.loading).toBe(false)
  })

  it('allowed = false quand profil non-admin', () => {
    const wrapper = makeWrapper({ user: { id: '1' }, profile: { role: 'travailleur' }, loading: false })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })
    expect(result.current.allowed).toBe(false)
  })

  it('allowed = false quand loading = true même si admin', () => {
    const wrapper = makeWrapper({ user: { id: '1' }, profile: { role: 'admin' }, loading: true })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })
    expect(result.current.allowed).toBe(false)
    expect(result.current.loading).toBe(true)
  })

  it('allowed = false quand profil null', () => {
    const wrapper = makeWrapper({ user: null, profile: null, loading: false })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })
    expect(result.current.allowed).toBe(false)
  })

  it('allowed = false quand profil entreprise', () => {
    const wrapper = makeWrapper({ user: { id: '1' }, profile: { role: 'entreprise' }, loading: false })
    const { result } = renderHook(() => useAdminGuard(), { wrapper })
    expect(result.current.allowed).toBe(false)
  })
})
