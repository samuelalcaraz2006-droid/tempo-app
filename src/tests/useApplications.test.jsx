// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useApplications } from '../hooks/useApplications'

vi.mock('../lib/supabase', () => ({
  getWorkerApplications: vi.fn(),
}))

import { getWorkerApplications } from '../lib/supabase'

const FAKE_APPS = [
  { id: 'a1', mission_id: 'm1', worker_id: 'w1', status: 'pending',  missions: { title: 'Mission A' } },
  { id: 'a2', mission_id: 'm2', worker_id: 'w1', status: 'accepted', missions: { title: 'Mission B' } },
]

describe('useApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── états de base ───────────────────────────────────────────────────────────

  it('workerId absent : loading=false, applications=[], pas d\'appel Supabase', async () => {
    const { result } = renderHook(() => useApplications(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(result.current.error).toBeNull()
    expect(getWorkerApplications).not.toHaveBeenCalled()
  })

  it('workerId undefined : même comportement que null', async () => {
    const { result } = renderHook(() => useApplications(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(getWorkerApplications).not.toHaveBeenCalled()
  })

  it('état initial avec workerId : loading=true', () => {
    getWorkerApplications.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useApplications('w1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.applications).toEqual([])
  })

  // ── cas success ─────────────────────────────────────────────────────────────

  it('success : applications chargées, loading=false, error=null', async () => {
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPS, error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual(FAKE_APPS)
    expect(result.current.error).toBeNull()
  })

  it('liste vide : applications=[], loading=false, error=null', async () => {
    getWorkerApplications.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('data=null sans error → applications=[]', async () => {
    getWorkerApplications.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
  })

  // ── cas erreur ──────────────────────────────────────────────────────────────

  it('error Supabase : applications=[], loading=false, error défini', async () => {
    const fakeError = { message: 'not found' }
    getWorkerApplications.mockResolvedValue({ data: null, error: fakeError })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(result.current.error).toEqual(fakeError)
  })

  it('erreur Supabase avec message réseau : error propagée, applications=[]', async () => {
    const networkError = { message: 'FetchError: network failure', code: 'NETWORK_ERROR' }
    getWorkerApplications.mockResolvedValue({ data: null, error: networkError })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(result.current.error).toEqual(networkError)
  })

  it('error puis reload success : error effacée, applications mises à jour', async () => {
    const fakeError = { message: 'timeout' }
    getWorkerApplications.mockResolvedValueOnce({ data: null, error: fakeError })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.error).toEqual(fakeError))

    getWorkerApplications.mockResolvedValueOnce({ data: FAKE_APPS, error: null })
    await act(async () => { await result.current.reload() })

    expect(result.current.error).toBeNull()
    expect(result.current.applications).toEqual(FAKE_APPS)
  })

  // ── appel API ───────────────────────────────────────────────────────────────

  it('appelle getWorkerApplications avec le bon workerId', async () => {
    getWorkerApplications.mockResolvedValue({ data: [], error: null })
    renderHook(() => useApplications('worker-42'))
    await waitFor(() => expect(getWorkerApplications).toHaveBeenCalledWith('worker-42'))
  })

  it('n\'appelle pas getWorkerApplications quand workerId est falsy', async () => {
    for (const falsy of [null, undefined, '']) {
      getWorkerApplications.mockClear()
      const { result } = renderHook(() => useApplications(falsy))
      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(getWorkerApplications).not.toHaveBeenCalled()
    }
  })

  // ── reload ──────────────────────────────────────────────────────────────────

  it('reload déclenche un nouveau fetch', async () => {
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPS, error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getWorkerApplications).toHaveBeenCalledTimes(1)

    getWorkerApplications.mockResolvedValue({ data: [], error: null })
    await act(async () => { await result.current.reload() })

    expect(getWorkerApplications).toHaveBeenCalledTimes(2)
    expect(result.current.applications).toEqual([])
  })

  it('reload remet loading=true pendant le fetch', async () => {
    getWorkerApplications.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let resolveReload
    getWorkerApplications.mockReturnValue(new Promise(r => { resolveReload = r }))

    act(() => { result.current.reload() })
    expect(result.current.loading).toBe(true)

    await act(async () => { resolveReload({ data: [], error: null }) })
    expect(result.current.loading).toBe(false)
  })

  // ── changement de workerId ──────────────────────────────────────────────────

  it('re-fetch quand workerId change', async () => {
    getWorkerApplications.mockResolvedValue({ data: [], error: null })
    let workerId = 'w1'
    const { rerender } = renderHook(() => useApplications(workerId))
    await waitFor(() => expect(getWorkerApplications).toHaveBeenCalledTimes(1))

    workerId = 'w2'
    rerender()
    await waitFor(() => expect(getWorkerApplications).toHaveBeenCalledTimes(2))
    expect(getWorkerApplications).toHaveBeenLastCalledWith('w2')
  })

  it('transition null → workerId déclenche le fetch', async () => {
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPS, error: null })
    let workerId = null
    const { result, rerender } = renderHook(() => useApplications(workerId))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getWorkerApplications).not.toHaveBeenCalled()

    workerId = 'w1'
    rerender()
    await waitFor(() => expect(result.current.applications).toEqual(FAKE_APPS))
    expect(getWorkerApplications).toHaveBeenCalledWith('w1')
  })

  it('transition workerId → null vide les applications', async () => {
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPS, error: null })
    let workerId = 'w1'
    const { result, rerender } = renderHook(() => useApplications(workerId))
    await waitFor(() => expect(result.current.applications).toEqual(FAKE_APPS))

    workerId = null
    rerender()
    await waitFor(() => expect(result.current.applications).toEqual([]))
    expect(result.current.loading).toBe(false)
  })

  // ── fixtures détaillées ─────────────────────────────────────────────────────

  it('préserve la structure complète des applications (missions jointure)', async () => {
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPS, error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.applications[0]).toMatchObject({
      id: 'a1',
      status: 'pending',
      missions: { title: 'Mission A' },
    })
    expect(result.current.applications[1]).toMatchObject({
      id: 'a2',
      status: 'accepted',
      missions: { title: 'Mission B' },
    })
  })
})
