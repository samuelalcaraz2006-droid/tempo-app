import { useState, useCallback } from 'react'
import { applyToMission, withdrawApplication, saveContract, createRating, supabase, setWorkerAvailability } from '../../lib/supabase'

export function useWorkerActions(userId, { showToast, setApplications, addSignedContract, refreshRoleData } = {}) {
  const [applying, setApplying] = useState({})
  const [ratingModal, setRatingModal] = useState(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratedMissions, setRatedMissions] = useState(new Set())
  const [contractModal, setContractModal] = useState(null)
  const [signingContract, setSigningContract] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)

  const ALLOWED_PROFILE_FIELDS = ['first_name', 'last_name', 'city', 'siret', 'radius_km', 'skills', 'certifications']

  const handleApply = useCallback(async (mission, hasApplied) => {
    if (applying[mission.id] || hasApplied) return
    setApplying(a => ({ ...a, [mission.id]: true }))
    const { error } = await applyToMission({ missionId: mission.id, workerId: userId, matchScore: mission.matchScore })
    setApplying(a => ({ ...a, [mission.id]: false }))
    if (error) {
      if (error.code === '23505') showToast?.('Vous avez déjà postulé', 'warn')
      else showToast?.('Erreur lors de la candidature', 'error')
    } else {
      showToast?.('Candidature envoyée !')
      setApplications?.(prev => [...prev, { mission_id: mission.id, status: 'pending' }])
    }
  }, [userId, applying, showToast, setApplications])

  const handleWithdraw = useCallback(async (applicationId, setAllMissions) => {
    const { error } = await withdrawApplication(applicationId)
    if (error) { showToast?.('Erreur lors du retrait', 'error'); return }
    setAllMissions?.(prev => prev.map(a => a.id === applicationId ? { ...a, status: 'withdrawn' } : a))
    showToast?.('Candidature retirée')
  }, [showToast])

  const handleSignContract = useCallback(async (signatureData) => {
    if (!contractModal) return
    setSigningContract(true)
    const { error } = await saveContract({
      mission_id: contractModal.missionId,
      worker_id: userId,
      signed_worker_at: new Date().toISOString(),
      status: 'signed_worker',
    })
    if (error) { showToast?.('Erreur lors de la signature', 'error'); setSigningContract(false); return }
    addSignedContract?.(contractModal.missionId)
    setSigningContract(false)
    setContractModal(null)
    showToast?.('Contrat signé avec succès !')
  }, [contractModal, userId, showToast, addSignedContract])

  const handleRatingSubmit = useCallback(async (score, comment) => {
    if (!ratingModal) return
    setRatingLoading(true)
    const { error } = await createRating({
      missionId: ratingModal.missionId,
      raterId: userId,
      ratedId: ratingModal.rateeId,
      raterRole: 'travailleur',
      score,
      comment,
    })
    setRatingLoading(false)
    if (error) { showToast?.('Erreur lors de l\'envoi de l\'évaluation', 'error'); return }
    setRatedMissions(prev => new Set([...prev, ratingModal.missionId]))
    setRatingModal(null)
    showToast?.('Évaluation envoyée — merci !')
  }, [ratingModal, userId, showToast])

  const handleSaveProfile = useCallback(async (profileForm) => {
    setSavingProfile(true)
    // Filtrer les champs autorises et retirer les undefined
    const safeUpdate = Object.fromEntries(
      Object.entries(profileForm)
        .filter(([k, v]) => ALLOWED_PROFILE_FIELDS.includes(k) && v !== undefined)
    )
    if (Object.keys(safeUpdate).length === 0) {
      setSavingProfile(false)
      showToast?.('Aucune modification a sauvegarder', 'warn')
      return
    }
    safeUpdate.updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('workers')
      .update(safeUpdate)
      .eq('id', userId)
    setSavingProfile(false)
    if (error) {
      console.error('[WorkerActions] saveProfile error:', error)
      showToast?.('Erreur lors de la sauvegarde : ' + (error.message || 'erreur inconnue'), 'error')
    } else {
      showToast?.('Profil mis a jour !')
      refreshRoleData?.()
    }
  }, [userId, showToast, refreshRoleData])

  const toggleDispo = useCallback(async (val, setDisponible) => {
    setDisponible(val)
    const { error } = await setWorkerAvailability(userId, val)
    if (error) {
      setDisponible(!val)
      showToast?.('Erreur lors de la mise à jour de la disponibilité', 'error')
    }
  }, [userId, showToast])

  return {
    applying,
    ratingModal, setRatingModal,
    ratingLoading,
    ratedMissions,
    contractModal, setContractModal,
    signingContract,
    savingProfile,
    handleApply,
    handleWithdraw,
    handleSignContract,
    handleRatingSubmit,
    handleSaveProfile,
    toggleDispo,
  }
}
