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

  it('workerId absent : loading=false, applications=[], pas d\'appel Supabase', async () => {
    const { result } = renderHook(() => useApplications(null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(result.current.error).toBeNull()
    expect(getWorkerApplications).not.toHaveBeenCalled()
  })

  it('état initial avec workerId : loading=true', () => {
    getWorkerApplications.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useApplications('w1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.applications).toEqual([])
  })

  it('success : applications chargées, loading=false, error=null', async () => {
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPS, error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual(FAKE_APPS)
    expect(result.current.error).toBeNull()
  })

  it('error : applications=[], loading=false, error défini', async () => {
    const fakeError = { message: 'not found' }
    getWorkerApplications.mockResolvedValue({ data: null, error: fakeError })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
    expect(result.current.error).toEqual(fakeError)
  })

  it('data=null sans error → applications=[]', async () => {
    getWorkerApplications.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useApplications('w1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.applications).toEqual([])
  })

  it('appelle getWorkerApplications avec le bon workerId', async () => {
    getWorkerApplications.mockResolvedValue({ data: [], error: null })
    renderHook(() => useApplications('worker-42'))
    await waitFor(() => expect(getWorkerApplications).toHaveBeenCalledWith('worker-42'))
  })

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
})
