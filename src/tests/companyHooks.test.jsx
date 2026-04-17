// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCompanyData } from '../hooks/company/useCompanyData'
import { useCompanyActions } from '../hooks/company/useCompanyActions'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  getCompanyMissions: vi.fn(),
  getCompanyInvoices: vi.fn(),
  getNotifications: vi.fn(),
  createMission: vi.fn(),
  getMissionApplications: vi.fn(),
  updateApplicationStatus: vi.fn(),
  assignWorkerToMission: vi.fn(),
  completeMission: vi.fn(),
  createRating: vi.fn(),
  cancelMission: vi.fn(),
  saveContract: vi.fn(),
  createInvoice: vi.fn(),
}))

vi.mock('../lib/pushNotifications', () => ({
  isPushSupported: vi.fn().mockReturnValue(false),
  requestPushPermission: vi.fn(),
  getPermissionStatus: vi.fn().mockReturnValue('denied'),
}))

import {
  getCompanyMissions,
  getCompanyInvoices,
  getNotifications,
  createMission,
  updateApplicationStatus,
  assignWorkerToMission,
  completeMission,
  cancelMission,
  saveContract,
  createInvoice,
} from '../lib/supabase'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_MISSIONS = [
  { id: 'm1', title: 'Opérateur logistique', status: 'open', hourly_rate: 14.5, total_hours: 40 },
]
const FAKE_INVOICES = [{ id: 'inv1', invoice_number: 'F-001', amount_ttc: 580, status: 'sent' }]
const FAKE_NOTIFS = [{ id: 'n1', title: 'Candidature reçue' }]

// ── useCompanyData ────────────────────────────────────────────────────────────

describe('useCompanyData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCompanyMissions.mockResolvedValue({ data: FAKE_MISSIONS, error: null })
    getCompanyInvoices.mockResolvedValue({ data: FAKE_INVOICES, error: null })
    getNotifications.mockResolvedValue({ data: FAKE_NOTIFS, error: null })
  })

  it('starts with loading=true and empty arrays', async () => {
    const { result } = renderHook(() => useCompanyData('user-1'))
    expect(result.current.loading).toBe(true)
    expect(result.current.missions).toEqual([])
    expect(result.current.invoices).toEqual([])
    expect(result.current.notifs).toEqual([])
  })

  it('loadData fetches missions, invoices and notifications', async () => {
    const { result } = renderHook(() => useCompanyData('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual(FAKE_MISSIONS)
    expect(result.current.invoices).toEqual(FAKE_INVOICES)
    expect(result.current.notifs).toEqual(FAKE_NOTIFS)
  })

  it('does not fetch when userId is falsy', async () => {
    const { result } = renderHook(() => useCompanyData(null))
    await act(async () => {})
    expect(getCompanyMissions).not.toHaveBeenCalled()
  })

  it('handles partial failures gracefully (missions fail)', async () => {
    getCompanyMissions.mockResolvedValue({ data: null, error: new Error('fail') })
    const { result } = renderHook(() => useCompanyData('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.missions).toEqual([])
    expect(result.current.invoices).toEqual(FAKE_INVOICES)
  })

  it('exposes setMissions and setInvoices', async () => {
    const { result } = renderHook(() => useCompanyData('user-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setMissions([]))
    expect(result.current.missions).toEqual([])
  })

  it('push permission check skips when isPushSupported returns false', async () => {
    const { isPushSupported } = await import('../lib/pushNotifications')
    isPushSupported.mockReturnValue(false)
    renderHook(() => useCompanyData('user-1'))
    await waitFor(() => {})
    // no error thrown — test passes by not throwing
  })
})

// ── useCompanyActions ─────────────────────────────────────────────────────────

describe('useCompanyActions', () => {
  let showToast, setMissions, setInvoices, missions

  beforeEach(() => {
    vi.clearAllMocks()
    showToast = vi.fn()
    setMissions = vi.fn()
    setInvoices = vi.fn()
    missions = [...FAKE_MISSIONS]
    // localStorage cleanup
    localStorage.clear()
  })

  const makeHook = () =>
    renderHook(() =>
      useCompanyActions('user-1', { showToast, setMissions, setInvoices, missions })
    )

  const VALID_FORM = {
    title: 'New',
    sector: 'logistique',
    objet_prestation: 'Objet suffisamment long pour passer la validation des 40 caractères minimum requis.',
    motif_recours: 'accroissement_temporaire',
    pricing_mode: 'forfait',
    forfait_total: '200',
    total_hours: '8',
    hourly_rate: '',
    city: 'Lyon',
    start_date: '2025-06-10',
    urgency: 'normal',
    legal_confirmed: true,
  }

  it('handlePublish shows error when required fields missing', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handlePublish({ title: '', city: '', start_date: '' })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('titre'), 'error')
    expect(createMission).not.toHaveBeenCalled()
  })

  it('handlePublish shows error when objet_prestation too short', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handlePublish({ ...VALID_FORM, objet_prestation: 'trop court' })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('objet'), 'error')
    expect(createMission).not.toHaveBeenCalled()
  })

  it('handlePublish shows error when legal_confirmed is false', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handlePublish({ ...VALID_FORM, legal_confirmed: false })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('engagement'), 'error')
    expect(createMission).not.toHaveBeenCalled()
  })

  it('handlePublish shows error for invalid date', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handlePublish({ ...VALID_FORM, start_date: 'not-a-date' })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('date'), 'error')
  })

  it('handlePublish shows error for invalid forfait', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handlePublish({ ...VALID_FORM, forfait_total: '-5' })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('montant'), 'error')
  })

  it('handlePublish succeeds and updates missions', async () => {
    const newMission = { id: 'm2', title: 'New', status: 'open' }
    createMission.mockResolvedValue({ data: newMission, error: null })
    const { result } = makeHook()
    const onSuccess = vi.fn()
    await act(async () => {
      await result.current.handlePublish(VALID_FORM, onSuccess)
    })
    expect(createMission).toHaveBeenCalled()
    expect(setMissions).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('publiée'))
    expect(onSuccess).toHaveBeenCalled()
  })

  it('handleAccept updates candidate status and missions', async () => {
    updateApplicationStatus.mockResolvedValue({ error: null })
    assignWorkerToMission.mockResolvedValue({ error: null })
    const { result } = makeHook()
    act(() => result.current.setSelectedMissionId('m1'))
    const candidate = { id: 'c1', worker_id: 'w1', workers: { id: 'w1', first_name: 'Marie' } }
    await act(async () => {
      await result.current.handleAccept(candidate)
    })
    expect(updateApplicationStatus).toHaveBeenCalledWith('c1', 'accepted')
    expect(assignWorkerToMission).toHaveBeenCalled()
    expect(setMissions).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Marie'))
  })

  it('handleReject updates candidate status', async () => {
    updateApplicationStatus.mockResolvedValue({ error: null })
    const { result } = makeHook()
    await act(async () => {
      await result.current.handleReject('c1')
    })
    expect(updateApplicationStatus).toHaveBeenCalledWith('c1', 'rejected')
  })

  it('handleCompleteMission calls completeMission and creates invoice', async () => {
    completeMission.mockResolvedValue({ error: null })
    createInvoice.mockResolvedValue({ data: { id: 'inv2' }, error: null })
    const { result } = makeHook()
    await act(async () => {
      await result.current.handleCompleteMission('m1', 'w1', 'Jean', missions)
    })
    expect(completeMission).toHaveBeenCalledWith('m1')
    expect(createInvoice).toHaveBeenCalled()
    expect(setMissions).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('facture'))
  })

  it('handleCancel does nothing when cancelModal is null', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handleCancel()
    })
    expect(cancelMission).not.toHaveBeenCalled()
  })

  it('handleCancel calls cancelMission and updates missions', async () => {
    cancelMission.mockResolvedValue({ error: null })
    const { result } = makeHook()
    act(() => result.current.setCancelModal('m1'))
    await act(async () => {
      await result.current.handleCancel()
    })
    expect(cancelMission).toHaveBeenCalledWith('m1', '')
    expect(setMissions).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Mission annulée')
  })

  it('handleSignContract does nothing when contractModal is null', async () => {
    const { result } = makeHook()
    await act(async () => {
      await result.current.handleSignContract('sig-data')
    })
    expect(saveContract).not.toHaveBeenCalled()
  })

  it('handleSignContract saves contract and updates signedContracts', async () => {
    saveContract.mockResolvedValue({ error: null })
    const { result } = makeHook()
    act(() => result.current.setContractModal({ missionId: 'm1' }))
    await act(async () => {
      await result.current.handleSignContract('base64-sig')
    })
    expect(saveContract).toHaveBeenCalledWith(expect.objectContaining({ mission_id: 'm1', status: 'signed_company' }))
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('signé'))
  })

  it('exportCSV does nothing when data is empty', () => {
    // URL.createObjectURL may not exist in jsdom — mock it
    const createObjectURL = vi.fn().mockReturnValue('blob:test')
    const revokeObjectURL = vi.fn()
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL
    const { result } = makeHook()
    // calling with empty data should not call createObjectURL
    act(() => result.current.exportMissionsCSV([]))
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('duplicateMission calls setForm with mission data and navigates to publier', () => {
    const setForm = vi.fn()
    const setScreen = vi.fn()
    const { result } = makeHook()
    act(() => {
      result.current.duplicateMission(FAKE_MISSIONS[0], setForm, setScreen)
    })
    expect(setForm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Opérateur logistique' }))
    expect(setScreen).toHaveBeenCalledWith('publier')
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('dupliquée'))
  })
})
