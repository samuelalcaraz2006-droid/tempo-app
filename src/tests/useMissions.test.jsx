// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMissions } from '../hooks/useMissions'

vi.mock('../lib/supabase', () => ({
  getMissions: vi.fn(),
}))

import { getMissions } from '../lib/supabase'

const FAKE_MISSIONS = [
  { id: '1', title: 'Manutentionnaire', sector: 'logistique', hourly_rate: 14, status: 'open' },
  { id: '2', title: 'Agent de sécurité',  sector: 'btp',         hourly_rate: 16, status: 'open' },
]

describe('useMissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('état initial : loading=true, missions=[]', () => {
    getMissions.mockReturnValue(new Promise(() => {})) // pending forever
    const { result } = renderHook(() => useMissions())
    expect(result.current.loading).toBe(true)
    expect(result.current.missions).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('success : missions chargées, loading=false, error=null', async () => {
    getMissions.mockResolvedValue({ data: FAKE_MISSIONS, error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual(FAKE_MISSIONS)
    expect(result.current.error).toBeNull()
  })

  it('error : missions=[], loading=false, error défini', async () => {
    const fakeError = { message: 'DB error' }
    getMissions.mockResolvedValue({ data: null, error: fakeError })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
    expect(result.current.error).toEqual(fakeError)
  })

  it('data=null sans error → missions=[]', async () => {
    getMissions.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => useMissions())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
  })

  it('passe les filtres à getMissions', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const filters = { sector: 'logistique', rateMin: '12' }
    renderHook(() => useMissions(filters))
    await waitFor(() => expect(getMissions).toHaveBeenCalledWith(filters))
  })

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

  it('re-fetch quand les filtres changent', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    let sector = 'logistique'
    const { rerender } = renderHook(() => useMissions({ sector }))
    await waitFor(() => expect(getMissions).toHaveBeenCalledTimes(1))

    sector = 'btp'
    rerender()
    await waitFor(() => expect(getMissions).toHaveBeenCalledTimes(2))
  })
})
