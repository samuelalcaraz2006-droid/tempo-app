// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMissions } from '../hooks/useMissions'

vi.mock('../lib/supabase', () => ({
  getMissions: vi.fn(),
}))

import { getMissions } from '../lib/supabase'

const FAKE_MISSIONS = [
  { id: 'm1', title: 'Mission A', status: 'open',   sector: 'tech',    location: 'Paris',  hourly_rate: 14 },
  { id: 'm2', title: 'Mission B', status: 'closed',  sector: 'finance', location: 'Lyon',   hourly_rate: 16 },
  { id: 'm3', title: 'Mission C', status: 'pending', sector: 'tech',    location: 'Paris',  hourly_rate: 18 },
]

describe('useMissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── état initial ─────────────────────────────────────────────────────────────

  it('état initial : loading=true, missions=[], error=null', () => {
    getMissions.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useMissions())
    expect(result.current.loading).toBe(true)
    expect(result.current.missions).toEqual([])
    expect(result.current.error).toBeNull()
  })

  // ── success ──────────────────────────────────────────────────────────────────

  it('success : missions chargées, loading=false, error=null', async () => {
    getMissions.mockResolvedValue({ data: FAKE_MISSIONS, error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual(FAKE_MISSIONS)
    expect(result.current.error).toBeNull()
  })

  it('liste vide : missions=[], loading=false, error=null', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('data=null sans error → missions=[]', async () => {
    getMissions.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
  })

  // ── erreurs ──────────────────────────────────────────────────────────────────

  it('error Supabase : missions=[], loading=false, error défini', async () => {
    const fakeError = { message: 'DB error' }
    getMissions.mockResolvedValue({ data: null, error: fakeError })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
    expect(result.current.error).toEqual(fakeError)
  })

  it('erreur réseau : error propagée, missions=[]', async () => {
    const networkError = { message: 'FetchError: network failure', code: 'NETWORK_ERROR' }
    getMissions.mockResolvedValue({ data: null, error: networkError })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
    expect(result.current.error).toEqual(networkError)
  })

  it('error puis reload success : error effacée, missions mises à jour', async () => {
    const fakeError = { message: 'timeout' }
    getMissions.mockResolvedValueOnce({ data: null, error: fakeError })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.error).toEqual(fakeError))

    getMissions.mockResolvedValueOnce({ data: FAKE_MISSIONS, error: null })
    await act(async () => { await result.current.reload() })

    expect(result.current.error).toBeNull()
    expect(result.current.missions).toEqual(FAKE_MISSIONS)
  })

  // ── appel API ────────────────────────────────────────────────────────────────

  it('appelle getMissions avec {} par défaut', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    renderHook(() => useMissions())
    await waitFor(() => expect(getMissions).toHaveBeenCalledWith({}))
  })

  it('passe les filtres à getMissions', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const filters = { sector: 'tech', status: 'open' }
    renderHook(() => useMissions(filters))
    await waitFor(() => expect(getMissions).toHaveBeenCalledWith(filters))
  })

  // ── reload ────────────────────────────────────────────────────────────────────

  it('reload déclenche un nouveau fetch', async () => {
    getMissions.mockResolvedValue({ data: FAKE_MISSIONS, error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getMissions).toHaveBeenCalledTimes(1)

    getMissions.mockResolvedValue({ data: [], error: null })
    await act(async () => { await result.current.reload() })

    expect(getMissions).toHaveBeenCalledTimes(2)
    expect(result.current.missions).toEqual([])
  })

  it('reload remet loading=true pendant le fetch', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resolveReload
    getMissions.mockReturnValue(new Promise(r => { resolveReload = r }))

    act(() => { result.current.reload() })
    expect(result.current.loading).toBe(true)

    await act(async () => { resolveReload({ data: [], error: null }) })
    expect(result.current.loading).toBe(false)
  })

  // ── filtres / changement ──────────────────────────────────────────────────────

  it('re-fetch quand les filtres changent', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    let sector = 'tech'
    const { rerender } = renderHook(() => useMissions({ sector }))
    await waitFor(() => expect(getMissions).toHaveBeenCalledTimes(1))

    sector = 'finance'
    rerender()
    await waitFor(() => expect(getMissions).toHaveBeenCalledTimes(2))
    expect(getMissions).toHaveBeenLastCalledWith({ sector: 'finance' })
  })

  it('filtre {} == filtre par défaut : pas de re-fetch superflu', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const { rerender } = renderHook(({ f }) => useMissions(f), {
      initialProps: { f: {} },
    })
    await waitFor(() => expect(getMissions).toHaveBeenCalledTimes(1))
    rerender({ f: {} })
    await waitFor(() => expect(getMissions).toHaveBeenCalledTimes(1))
  })

  it('filtres combinés : appel correct', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const filters = { status: 'open', sector: 'tech', location: 'Paris' }
    renderHook(() => useMissions(filters))
    await waitFor(() => expect(getMissions).toHaveBeenCalledWith(filters))
  })

  // ── fixtures détaillées ───────────────────────────────────────────────────────

  it('préserve la structure complète des missions', async () => {
    getMissions.mockResolvedValue({ data: FAKE_MISSIONS, error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.missions[0]).toMatchObject({ id: 'm1', title: 'Mission A', status: 'open',  sector: 'tech' })
    expect(result.current.missions[1]).toMatchObject({ id: 'm2', title: 'Mission B', status: 'closed' })
    expect(result.current.missions[2]).toMatchObject({ id: 'm3', title: 'Mission C', status: 'pending' })
  })
})
