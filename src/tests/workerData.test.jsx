// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWorkerData } from '../hooks/worker/useWorkerData'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  getMissions: vi.fn(),
  getWorkerApplications: vi.fn(),
  getWorkerInvoices: vi.fn(),
  getNotifications: vi.fn(),
  getWorkerMissions: vi.fn(),
  getSignedContractsByWorker: vi.fn(),
  subscribeToMissions: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  subscribeToNotifications: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
}))

vi.mock('../lib/matching', () => ({
  computeMatchScore: vi.fn().mockReturnValue({ total_score: 75 }),
}))

vi.mock('../lib/pushNotifications', () => ({
  isPushSupported: vi.fn().mockReturnValue(false),
  requestPushPermission: vi.fn(),
  sendLocalNotification: vi.fn(),
  getPermissionStatus: vi.fn().mockReturnValue('denied'),
}))

import {
  getMissions,
  getWorkerApplications,
  getWorkerInvoices,
  getNotifications,
  getWorkerMissions,
  getSignedContractsByWorker,
  subscribeToMissions,
  subscribeToNotifications,
} from '../lib/supabase'

import { computeMatchScore } from '../lib/matching'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_MISSIONS = [
  { id: 'm1', title: 'Dev React', status: 'open', required_skills: ['react'] },
  { id: 'm2', title: 'Chef de projet', status: 'open', required_skills: [] },
]

const FAKE_APPLICATIONS = [
  { id: 'a1', mission_id: 'm1', status: 'pending' },
]

const FAKE_INVOICES = [
  { id: 'inv1', amount: 1200 },
]

const FAKE_NOTIFS = [
  { id: 'n1', title: 'Candidature acceptée', body: 'Bonne nouvelle !' },
]

const FAKE_ALL_MISSIONS = [
  { id: 'm3', title: 'Mission passée', status: 'completed' },
]

const WORKER = { id: 'worker-1', skills: ['react'] }
const USER_ID = 'worker-1'

function setupDefaultMocks() {
  getMissions.mockResolvedValue({ data: FAKE_MISSIONS, error: null })
  getWorkerApplications.mockResolvedValue({ data: FAKE_APPLICATIONS, error: null })
  getWorkerInvoices.mockResolvedValue({ data: FAKE_INVOICES, error: null })
  getNotifications.mockResolvedValue({ data: FAKE_NOTIFS, error: null })
  getWorkerMissions.mockResolvedValue({ data: FAKE_ALL_MISSIONS, error: null })
  getSignedContractsByWorker.mockResolvedValue({ data: [], error: null })
}

describe('useWorkerData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setupDefaultMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // ── Initial loading state ──────────────────────────────────────────────────

  it('starts with loading=true when userId is provided', () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    expect(result.current.loading).toBe(true)
  })

  it('starts with empty arrays when userId is null', async () => {
    getMissions.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useWorkerData(null, null))
    // loadData returns early when userId is null — state stays at defaults
    expect(result.current.missions).toEqual([])
    expect(result.current.applications).toEqual([])
  })

  // ── loadData fetches all data in parallel ──────────────────────────────────

  it('loadData fetches all 6 endpoints in parallel', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getMissions).toHaveBeenCalledOnce()
    expect(getWorkerApplications).toHaveBeenCalledWith(USER_ID)
    expect(getWorkerInvoices).toHaveBeenCalledWith(USER_ID)
    expect(getNotifications).toHaveBeenCalledWith(USER_ID)
    expect(getWorkerMissions).toHaveBeenCalledWith(USER_ID)
    expect(getSignedContractsByWorker).toHaveBeenCalledWith(USER_ID)
  })

  it('sets applications, invoices, notifs, allMissions from API', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.applications).toEqual(FAKE_APPLICATIONS)
    expect(result.current.invoices).toEqual(FAKE_INVOICES)
    expect(result.current.notifs).toEqual(FAKE_NOTIFS)
    expect(result.current.allMissions).toEqual(FAKE_ALL_MISSIONS)
  })

  it('loading transitions to false after data is loaded', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  // ── Match scores ───────────────────────────────────────────────────────────

  it('computes matchScore for each mission using worker', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(computeMatchScore).toHaveBeenCalledTimes(FAKE_MISSIONS.length)
    result.current.missions.forEach(m => {
      expect(m.matchScore).toBe(75)
    })
  })

  it('uses matchScore=50 as default when worker is null', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, null))
    await waitFor(() => expect(result.current.loading).toBe(false))

    result.current.missions.forEach(m => {
      expect(m.matchScore).toBe(50)
    })
    expect(computeMatchScore).not.toHaveBeenCalled()
  })

  it('missions are sorted by matchScore descending', async () => {
    computeMatchScore
      .mockReturnValueOnce({ total_score: 40 })
      .mockReturnValueOnce({ total_score: 90 })

    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const scores = result.current.missions.map(m => m.matchScore)
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1])
  })

  // ── Signed contracts merge with localStorage ───────────────────────────────

  it('merges signed contracts from API with localStorage', async () => {
    localStorage.setItem('tempo_signed_contracts', JSON.stringify(['local-m1']))
    getSignedContractsByWorker.mockResolvedValue({ data: ['api-m2'], error: null })

    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.signedContracts).toContain('local-m1')
    expect(result.current.signedContracts).toContain('api-m2')
  })

  it('initializes signedContracts from localStorage on mount', () => {
    localStorage.setItem('tempo_signed_contracts', JSON.stringify(['stored-m3']))
    getSignedContractsByWorker.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    expect(result.current.signedContracts).toContain('stored-m3')
  })

  it('addSignedContract appends to signedContracts and persists to localStorage', async () => {
    getSignedContractsByWorker.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.addSignedContract('new-mission'))

    expect(result.current.signedContracts).toContain('new-mission')
    const stored = JSON.parse(localStorage.getItem('tempo_signed_contracts'))
    expect(stored).toContain('new-mission')
  })

  // ── Partial failures handled gracefully ───────────────────────────────────

  it('handles partial API failures: loads available data, ignores rejected', async () => {
    getMissions.mockRejectedValue(new Error('network error'))
    getWorkerApplications.mockResolvedValue({ data: FAKE_APPLICATIONS, error: null })

    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // missions empty (failed), applications loaded
    expect(result.current.missions).toEqual([])
    expect(result.current.applications).toEqual(FAKE_APPLICATIONS)
  })

  it('handles error responses (data=null): sets empty arrays', async () => {
    getMissions.mockResolvedValue({ data: null, error: { message: 'forbidden' } })
    getWorkerApplications.mockResolvedValue({ data: null, error: { message: 'err' } })

    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.missions).toEqual([])
    expect(result.current.applications).toEqual([])
  })

  // ── Realtime subscriptions ─────────────────────────────────────────────────

  it('subscribes to missions and notifications on mount', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(subscribeToMissions).toHaveBeenCalled()
    expect(subscribeToNotifications).toHaveBeenCalledWith(USER_ID, expect.any(Function))
  })

  it('unsubscribes from realtime on unmount', async () => {
    const unsubMissions = vi.fn()
    const unsubNotifs = vi.fn()
    subscribeToMissions.mockReturnValue({ unsubscribe: unsubMissions })
    subscribeToNotifications.mockReturnValue({ unsubscribe: unsubNotifs })

    const { result, unmount } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    unmount()
    expect(unsubMissions).toHaveBeenCalled()
    expect(unsubNotifs).toHaveBeenCalled()
  })

  // ── loadData can be called manually ───────────────────────────────────────

  it('loadData can be called manually to refresh data', async () => {
    const { result } = renderHook(() => useWorkerData(USER_ID, WORKER))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(getMissions).toHaveBeenCalledTimes(1)

    await act(async () => {
      await result.current.loadData()
    })

    expect(getMissions).toHaveBeenCalledTimes(2)
  })

  it('does not fetch when userId is falsy (undefined)', async () => {
    const { result } = renderHook(() => useWorkerData(undefined, null))
    // loadData returns early without calling any API when userId is undefined
    expect(getMissions).not.toHaveBeenCalled()
    expect(result.current.missions).toEqual([])
  })
})
