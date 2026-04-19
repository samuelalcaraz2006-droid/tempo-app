// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkerActions } from '../hooks/worker/useWorkerActions'

vi.mock('../lib/supabase', () => ({
  applyToMission: vi.fn(),
  withdrawApplication: vi.fn(),
  saveContract: vi.fn(),
  createRating: vi.fn(),
  setWorkerAvailability: vi.fn(),
  supabase: {
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

import {
  applyToMission,
  withdrawApplication,
  saveContract,
  createRating,
  setWorkerAvailability,
  supabase,
} from '../lib/supabase'

const USER_ID = 'worker-123'

function makeHelpers() {
  const showToast = vi.fn()
  const setApplications = vi.fn()
  const addSignedContract = vi.fn()
  const refreshRoleData = vi.fn()
  return { showToast, setApplications, addSignedContract, refreshRoleData }
}

describe('useWorkerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase.from chain for handleSaveProfile
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    supabase.from.mockReturnValue({ update: updateMock })
  })

  // ── handleApply ────────────────────────────────────────────────────────────

  it('handleApply success: adds application and shows toast', async () => {
    applyToMission.mockResolvedValue({ data: { id: 'app-1' }, error: null })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    const mission = { id: 'm1', matchScore: 85 }
    await act(async () => {
      await result.current.handleApply(mission, false)
    })

    expect(applyToMission).toHaveBeenCalledWith({ missionId: 'm1', workerId: USER_ID, matchScore: 85 })
    expect(helpers.showToast).toHaveBeenCalledWith('Candidature envoyée !')
    expect(helpers.setApplications).toHaveBeenCalled()
    const setFn = helpers.setApplications.mock.calls[0][0]
    expect(setFn([])).toEqual([{ mission_id: 'm1', status: 'pending' }])
  })

  it('handleApply duplicate (23505): shows warn toast', async () => {
    applyToMission.mockResolvedValue({ error: { code: '23505' } })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    await act(async () => {
      await result.current.handleApply({ id: 'm1', matchScore: 70 }, false)
    })

    expect(helpers.showToast).toHaveBeenCalledWith('Vous avez déjà postulé', 'warn')
  })

  it('handleApply generic error: shows error toast', async () => {
    applyToMission.mockResolvedValue({ error: { code: '500', message: 'Server error' } })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    await act(async () => {
      await result.current.handleApply({ id: 'm1', matchScore: 60 }, false)
    })

    expect(helpers.showToast).toHaveBeenCalledWith('Erreur lors de la candidature', 'error')
    expect(helpers.setApplications).not.toHaveBeenCalled()
  })

  it('handleApply skips when hasApplied=true', async () => {
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    await act(async () => {
      await result.current.handleApply({ id: 'm1', matchScore: 50 }, true)
    })

    expect(applyToMission).not.toHaveBeenCalled()
  })

  it('handleApply: applying[id] is true during request, false after', async () => {
    let resolve
    applyToMission.mockReturnValue(new Promise(r => { resolve = r }))
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    act(() => { result.current.handleApply({ id: 'm5', matchScore: 50 }, false) })
    expect(result.current.applying['m5']).toBe(true)

    await act(async () => { resolve({ error: null }) })
    expect(result.current.applying['m5']).toBe(false)
  })

  // ── handleWithdraw ─────────────────────────────────────────────────────────

  it('handleWithdraw success: updates list and shows toast', async () => {
    withdrawApplication.mockResolvedValue({ error: null })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))
    const setAllMissions = vi.fn()

    await act(async () => {
      await result.current.handleWithdraw('app-1', setAllMissions)
    })

    expect(withdrawApplication).toHaveBeenCalledWith('app-1')
    expect(helpers.showToast).toHaveBeenCalledWith('Candidature retirée')
    expect(setAllMissions).toHaveBeenCalled()
    const mapFn = setAllMissions.mock.calls[0][0]
    const updated = mapFn([{ id: 'app-1', status: 'pending' }, { id: 'app-2', status: 'pending' }])
    expect(updated[0].status).toBe('withdrawn')
    expect(updated[1].status).toBe('pending')
  })

  it('handleWithdraw error: shows error toast, does not update list', async () => {
    withdrawApplication.mockResolvedValue({ error: { message: 'failed' } })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))
    const setAllMissions = vi.fn()

    await act(async () => {
      await result.current.handleWithdraw('app-1', setAllMissions)
    })

    expect(helpers.showToast).toHaveBeenCalledWith('Erreur lors du retrait', 'error')
    expect(setAllMissions).not.toHaveBeenCalled()
  })

  // ── handleSignContract ─────────────────────────────────────────────────────

  it('handleSignContract success: calls addSignedContract and shows toast', async () => {
    saveContract.mockResolvedValue({ error: null })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    // Set contractModal first
    act(() => result.current.setContractModal({ missionId: 'mission-99' }))

    await act(async () => {
      await result.current.handleSignContract('sig-data-base64')
    })

    expect(saveContract).toHaveBeenCalledWith(expect.objectContaining({
      mission_id: 'mission-99',
      worker_id: USER_ID,
      status: 'signed_worker',
    }))
    expect(helpers.addSignedContract).toHaveBeenCalledWith('mission-99')
    expect(helpers.showToast).toHaveBeenCalledWith('Contrat signé avec succès !')
    expect(result.current.contractModal).toBeNull()
    expect(result.current.signingContract).toBe(false)
  })

  it('handleSignContract error: shows error toast, keeps modal open', async () => {
    saveContract.mockResolvedValue({ error: { message: 'save failed' } })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    act(() => result.current.setContractModal({ missionId: 'mission-99' }))

    await act(async () => {
      await result.current.handleSignContract('sig-data')
    })

    expect(helpers.showToast).toHaveBeenCalledWith('Erreur lors de la signature', 'error')
    expect(helpers.addSignedContract).not.toHaveBeenCalled()
    expect(result.current.contractModal).not.toBeNull()
  })

  it('handleSignContract does nothing when contractModal is null', async () => {
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    await act(async () => {
      await result.current.handleSignContract('sig-data')
    })

    expect(saveContract).not.toHaveBeenCalled()
  })

  // ── handleRatingSubmit ─────────────────────────────────────────────────────

  it('handleRatingSubmit success: marks mission rated and closes modal', async () => {
    createRating.mockResolvedValue({ error: null })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    act(() => result.current.setRatingModal({ missionId: 'mission-5', rateeId: 'company-1' }))

    await act(async () => {
      await result.current.handleRatingSubmit(5, 'Excellent travail')
    })

    expect(createRating).toHaveBeenCalledWith({
      missionId: 'mission-5',
      raterId: USER_ID,
      ratedId: 'company-1',
      raterRole: 'travailleur',
      score: 5,
      comment: 'Excellent travail',
    })
    expect(result.current.ratedMissions.has('mission-5')).toBe(true)
    expect(result.current.ratingModal).toBeNull()
    expect(helpers.showToast).toHaveBeenCalledWith('Évaluation envoyée — merci !')
  })

  it('handleRatingSubmit error: shows error toast, does not close modal', async () => {
    createRating.mockResolvedValue({ error: { message: 'rating failed' } })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    act(() => result.current.setRatingModal({ missionId: 'mission-5', rateeId: 'company-1' }))

    await act(async () => {
      await result.current.handleRatingSubmit(3, 'Moyen')
    })

    expect(helpers.showToast).toHaveBeenCalledWith("Erreur lors de l'envoi de l'évaluation", 'error')
    expect(result.current.ratedMissions.has('mission-5')).toBe(false)
    expect(result.current.ratingModal).not.toBeNull()
  })

  it('handleRatingSubmit does nothing when ratingModal is null', async () => {
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    await act(async () => {
      await result.current.handleRatingSubmit(4, 'test')
    })

    expect(createRating).not.toHaveBeenCalled()
  })

  // ── handleSaveProfile ──────────────────────────────────────────────────────

  it('handleSaveProfile filters to allowed fields only', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    supabase.from.mockReturnValue({ update: updateMock })

    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    const profileForm = {
      first_name: 'Jean',
      last_name: 'Dupont',
      city: 'Paris',
      hacked_field: 'evil',  // must be stripped
      admin: true,           // must be stripped
    }

    await act(async () => {
      await result.current.handleSaveProfile(profileForm)
    })

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'Jean',
      last_name: 'Dupont',
      city: 'Paris',
    }))
    expect(updateMock).not.toHaveBeenCalledWith(expect.objectContaining({ hacked_field: 'evil' }))
    expect(updateMock).not.toHaveBeenCalledWith(expect.objectContaining({ admin: true }))
    expect(helpers.showToast).toHaveBeenCalledWith('Profil mis à jour !')
    expect(helpers.refreshRoleData).toHaveBeenCalled()
  })

  it('handleSaveProfile error: shows error toast, no refreshRoleData', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'db error' } })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    supabase.from.mockReturnValue({ update: updateMock })

    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))

    await act(async () => {
      await result.current.handleSaveProfile({ first_name: 'Jean' })
    })

    expect(helpers.showToast).toHaveBeenCalledWith(expect.stringContaining('Erreur lors de la sauvegarde'), 'error')
    expect(helpers.refreshRoleData).not.toHaveBeenCalled()
  })

  // ── toggleDispo ────────────────────────────────────────────────────────────

  it('toggleDispo success: calls setWorkerAvailability, no rollback', async () => {
    setWorkerAvailability.mockResolvedValue({ error: null })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))
    const setDisponible = vi.fn()

    await act(async () => {
      await result.current.toggleDispo(true, setDisponible)
    })

    expect(setWorkerAvailability).toHaveBeenCalledWith(USER_ID, true)
    // Called once to set true, no rollback call
    expect(setDisponible).toHaveBeenCalledTimes(1)
    expect(setDisponible).toHaveBeenCalledWith(true)
  })

  it('toggleDispo error: rolls back the value and shows toast', async () => {
    setWorkerAvailability.mockResolvedValue({ error: { message: 'unavailable' } })
    const helpers = makeHelpers()
    const { result } = renderHook(() => useWorkerActions(USER_ID, helpers))
    const setDisponible = vi.fn()

    await act(async () => {
      await result.current.toggleDispo(true, setDisponible)
    })

    // First call: set to true; Second call: rollback to false
    expect(setDisponible).toHaveBeenCalledTimes(2)
    expect(setDisponible).toHaveBeenNthCalledWith(1, true)
    expect(setDisponible).toHaveBeenNthCalledWith(2, false)
    expect(helpers.showToast).toHaveBeenCalledWith('Erreur lors de la mise à jour de la disponibilité', 'error')
  })
})
