import { useState, useCallback } from 'react'
import {
  createMission,
  getMissionApplications,
  updateApplicationStatus,
  assignWorkerToMission,
  completeMission,
  createRating,
  cancelMission,
  saveContract,
  createInvoice,
  getContract,
  supabase,
} from '../../lib/supabase'
import { getRecurrenceCounts } from '../../lib/recurrenceCheck'

export function useCompanyActions(userId, { showToast, setMissions, setInvoices, missions, refreshRoleData }) {
  const [publishing, setPublishing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [published, setPublished] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [selectedMissionId, setSelectedMissionId] = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [ratingModal, setRatingModal] = useState(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_mission_templates') || '[]') } catch { return [] }
  })
  const [showTemplates, setShowTemplates] = useState(false)
  const [cancelModal, setCancelModal] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [contractModal, setContractModal] = useState(null)
  const [signingContract, setSigningContract] = useState(false)
  const [signedContracts, setSignedContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_signed_contracts_e') || '[]') } catch { return [] }
  })

  const handlePublish = useCallback(async (form, onSuccess) => {
    if (!form.title?.trim() || !form.city?.trim() || !form.start_date) {
      showToast('Veuillez remplir le titre, la ville et la date de début', 'error')
      return
    }
    if (!form.objet_prestation || form.objet_prestation.trim().length < 40) {
      showToast('L\'objet de la prestation doit être précis (40 caractères minimum)', 'error')
      return
    }
    if (!form.motif_recours) {
      showToast('Veuillez préciser le motif de recours', 'error')
      return
    }
    if (!form.legal_confirmed) {
      showToast('Merci de confirmer l\'engagement juridique avant de publier', 'error')
      return
    }
    const parsedDate = new Date(form.start_date)
    if (Number.isNaN(parsedDate.getTime())) {
      showToast('La date de début est invalide', 'error')
      return
    }

    // Normalisation rémunération : on stocke toujours un forfait_total et,
    // quand on peut, un hourly_rate dérivé. La facture finale est forfaitaire.
    const totalHours = form.total_hours ? parseFloat(form.total_hours) : null
    const forfaitInput = parseFloat(form.forfait_total) || 0
    const hourlyInput = parseFloat(form.hourly_rate) || 0
    const pricingMode = form.pricing_mode === 'horaire' ? 'horaire' : 'forfait'

    let forfaitTotal = null
    let hourlyRate = null
    if (pricingMode === 'forfait') {
      forfaitTotal = forfaitInput || (hourlyInput && totalHours ? hourlyInput * totalHours : 0)
      hourlyRate = totalHours && forfaitTotal ? forfaitTotal / totalHours : (hourlyInput || null)
    } else {
      hourlyRate = hourlyInput
      forfaitTotal = totalHours && hourlyInput ? hourlyInput * totalHours : null
    }

    if (!forfaitTotal && !hourlyRate) {
      showToast('Veuillez renseigner le montant de la prestation', 'error')
      return
    }
    if ((forfaitTotal != null && forfaitTotal <= 0) || (hourlyRate != null && hourlyRate <= 0)) {
      showToast('Le montant doit être un nombre positif', 'error')
      return
    }

    setPublishing(true)
    const { data, error } = await createMission({
      company_id: userId,
      title: form.title.trim(),
      sector: form.sector,
      objet_prestation: form.objet_prestation.trim(),
      motif_recours: form.motif_recours,
      pricing_mode: pricingMode,
      forfait_total: forfaitTotal,
      hourly_rate: hourlyRate,
      total_hours: totalHours,
      start_date: parsedDate.toISOString(),
      city: form.city.trim(),
      address: form.address?.trim() || '',
      description: form.description?.trim() || '',
      required_skills: form.required_skills,
      required_certs: form.required_certs,
      urgency: form.urgency,
      legal_confirmation_at: new Date().toISOString(),
    })
    setPublishing(false)
    if (error) {
      showToast(`Erreur lors de la publication : ${error.message}`, 'error')
    } else {
      setPublished(true)
      setMissions(prev => [data, ...prev])
      showToast('Mission publiée — les prestataires sont notifiés !')
      if (onSuccess) onSuccess()
    }
  }, [userId, showToast, setMissions])

  const loadCandidates = useCallback(async (missionId) => {
    setSelectedMissionId(missionId)
    const { data, error } = await getMissionApplications(missionId)
    if (error) showToast('Erreur lors du chargement des candidatures', 'error')
    if (data) {
      // Enrichit chaque candidat avec son historique de missions avec cette
      // entreprise (pour afficher l'alerte anti-requalification à côté du
      // bouton Accepter).
      const workerIds = data
        .map((c) => c.workers?.id || c.worker_id)
        .filter(Boolean)
      let enriched = data
      if (userId && workerIds.length) {
        const { data: counts } = await getRecurrenceCounts(userId, workerIds)
        enriched = data.map((c) => ({
          ...c,
          recurrence_count: counts[c.workers?.id || c.worker_id] || 0,
        }))
      }
      setCandidates(enriched)
    }
    return { data, error }
  }, [userId, showToast])

  const handleAccept = useCallback(async (candidate) => {
    const key = candidate.id
    setActionLoading(s => ({ ...s, [key]: 'accepting' }))
    const [appRes, assignRes] = await Promise.all([
      updateApplicationStatus(candidate.id, 'accepted'),
      assignWorkerToMission(selectedMissionId, candidate.workers?.id || candidate.worker_id),
    ])
    setActionLoading(s => ({ ...s, [key]: null }))
    if (appRes.error || assignRes.error) {
      showToast("Erreur lors de l'acceptation", 'error')
      return
    }
    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'accepted' } : c))
    setMissions(prev => prev.map(m => m.id === selectedMissionId ? { ...m, status: 'matched' } : m))
    showToast(`${candidate.workers?.first_name} accepté — contrat en cours de génération !`)
  }, [selectedMissionId, showToast, setMissions])

  const handleReject = useCallback(async (applicationId) => {
    setActionLoading(s => ({ ...s, [applicationId]: 'rejecting' }))
    const { error } = await updateApplicationStatus(applicationId, 'rejected')
    setActionLoading(s => ({ ...s, [applicationId]: null }))
    if (error) { showToast('Erreur lors du refus', 'error'); return }
    setCandidates(prev => prev.map(c => c.id === applicationId ? { ...c, status: 'rejected' } : c))
  }, [showToast])

  const handleCompleteMission = useCallback(async (missionId, workerId, workerName, missionsRef) => {
    setActionLoading(s => ({ ...s, [missionId]: 'completing' }))
    const { error } = await completeMission(missionId)
    if (error) {
      showToast('Erreur lors de la complétion', 'error')
      setActionLoading(s => ({ ...s, [missionId]: null }))
      return
    }
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'completed' } : m))
    const mission = (missionsRef || missions).find(m => m.id === missionId)
    if (mission && workerId) {
      // Récupère le contrat signé pour cette mission — contract_id est
      // NOT NULL sur invoices depuis la migration 016.
      const { data: contract, error: ctrErr } = await getContract(missionId)
      if (ctrErr || !contract) {
        showToast("Mission terminée mais contrat introuvable — la facture ne peut pas être générée sans contrat signé.", 'error')
        setActionLoading(s => ({ ...s, [missionId]: null }))
        return
      }
      if (contract.status !== 'active' && contract.status !== 'completed') {
        showToast("Mission terminée mais le contrat n'est pas signé par les 2 parties — générez la facture une fois les signatures complètes.", 'error')
        setActionLoading(s => ({ ...s, [missionId]: null }))
        return
      }

      // Montants : on fait confiance au taux du contrat si dispo, sinon
      // on retombe sur le taux de la mission. amount_ht = rate * hours.
      const hourlyRate = parseFloat(contract.hourly_rate || mission.hourly_rate) || 0
      const totalHours = parseFloat(contract.total_hours || mission.total_hours) || 0
      const amountHt = Math.round(hourlyRate * totalHours * 100) / 100
      const commissionRate = parseFloat(contract.commission_rate) || 8
      const commission = Math.round(amountHt * (commissionRate / 100) * 100) / 100
      const workerPayout = Math.round((amountHt - commission) * 100) / 100

      const { data: inv, error: invErr } = await createInvoice({
        workerPayout,
        amountTtc: amountHt, // TVA = 0 en auto-liquidation pro-pro (simplification)
        amountHt,
        workerId,
        companyId: userId,
        contractId: contract.id,
        missionId,
        totalHours,
      })
      if (invErr) {
        console.error('[createInvoice] error:', invErr)
        showToast('Mission terminée mais erreur lors de la génération de la facture', 'error')
        setActionLoading(s => ({ ...s, [missionId]: null }))
        return
      }
      if (inv) setInvoices(prev => [inv, ...prev])
    }
    setActionLoading(s => ({ ...s, [missionId]: null }))
    showToast('Mission terminée — facture générée !')
    setRatingModal({ missionId, rateeId: workerId, rateeName: workerName })
  }, [userId, showToast, setMissions, setInvoices, missions])

  const handleRatingSubmit = useCallback(async (score, comment) => {
    if (!ratingModal) return
    setRatingLoading(true)
    const { error } = await createRating({
      missionId: ratingModal.missionId,
      raterId: userId,
      ratedId: ratingModal.rateeId,
      raterRole: 'company',
      score,
      comment,
    })
    setRatingLoading(false)
    if (error) { showToast("Erreur lors de l'envoi de l'évaluation", 'error'); return }
    setRatingModal(null)
    showToast('Évaluation envoyée — merci !')
  }, [ratingModal, userId, showToast])

  const duplicateMission = useCallback((m, setForm, setScreen) => {
    setForm({
      title: m.title || '', sector: m.sector || 'logistique',
      objet_prestation: m.objet_prestation || '',
      motif_recours: m.motif_recours || 'accroissement_temporaire',
      pricing_mode: m.pricing_mode || 'forfait',
      forfait_total: m.forfait_total?.toString() || '',
      hourly_rate: m.hourly_rate?.toString() || '',
      total_hours: m.total_hours?.toString() || '', start_date: '', city: m.city || '',
      address: m.address || '', description: m.description || '',
      required_skills: m.required_skills || [], required_certs: m.required_certs || [],
      urgency: m.urgency || 'normal',
      legal_confirmed: false,
    })
    setPublished(false)
    setScreen('publier')
    showToast('Mission dupliquée — vérifiez les informations et publiez')
  }, [showToast])

  const saveAsTemplate = useCallback((name, form) => {
    const tpl = { id: Date.now(), name, ...form, created_at: new Date().toISOString() }
    const updated = [...templates, tpl]
    setTemplates(updated)
    localStorage.setItem('tempo_mission_templates', JSON.stringify(updated))
    showToast('Template sauvegardé !')
  }, [templates, showToast])

  const loadTemplate = useCallback((tpl, setForm) => {
    setForm({
      title: tpl.title || '', sector: tpl.sector || 'logistique',
      objet_prestation: tpl.objet_prestation || '',
      motif_recours: tpl.motif_recours || 'accroissement_temporaire',
      pricing_mode: tpl.pricing_mode || 'forfait',
      forfait_total: tpl.forfait_total?.toString() || '',
      hourly_rate: tpl.hourly_rate?.toString() || '',
      total_hours: tpl.total_hours?.toString() || '', start_date: '', city: tpl.city || '',
      address: tpl.address || '', description: tpl.description || '',
      required_skills: tpl.required_skills || [], required_certs: tpl.required_certs || [],
      urgency: tpl.urgency || 'normal',
      legal_confirmed: false,
    })
    setShowTemplates(false)
    showToast('Template chargé — complétez les informations')
  }, [showToast])

  const deleteTemplate = useCallback((id) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem('tempo_mission_templates', JSON.stringify(updated))
  }, [templates])

  const exportCSV = useCallback((data, filename) => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [
      headers.join(';'),
      ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(';')),
    ].join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const exportInvoicesCSV = useCallback((invoices) => {
    const data = invoices.map(inv => ({
      Référence: inv.invoice_number,
      Travailleur: `${inv.contracts?.workers?.first_name || ''} ${inv.contracts?.workers?.last_name || ''}`.trim(),
      Date: inv.created_at?.split('T')[0],
      Montant_HT: inv.amount_ht,
      Montant_TTC: inv.amount_ttc,
      Commission: inv.commission,
      Statut: inv.status,
    }))
    exportCSV(data, `tempo_factures_${new Date().toISOString().split('T')[0]}.csv`)
    showToast('Export CSV téléchargé')
  }, [exportCSV, showToast])

  const exportMissionsCSV = useCallback((missions) => {
    const SECTOR_LABELS = { logistique: 'Logistique', btp: 'BTP', industrie: 'Industrie', hotellerie: 'Hôtellerie', proprete: 'Propreté' }
    const STATUS_STYLES = { draft: 'Brouillon', open: 'Publiée', matched: 'Matchée', active: 'En cours', completed: 'Terminée', cancelled: 'Annulée' }
    const data = missions.map(m => ({
      Titre: m.title, Secteur: SECTOR_LABELS[m.sector] || m.sector, Ville: m.city,
      Taux_horaire: m.hourly_rate, Heures: m.total_hours, Statut: STATUS_STYLES[m.status] || m.status,
      Date_début: m.start_date?.split('T')[0], Date_publication: (m.published_at || m.created_at)?.split('T')[0],
    }))
    exportCSV(data, `tempo_missions_${new Date().toISOString().split('T')[0]}.csv`)
    showToast('Export CSV téléchargé')
  }, [exportCSV, showToast])

  const handleCancel = useCallback(async () => {
    if (!cancelModal) return
    setActionLoading(s => ({ ...s, [cancelModal]: 'cancelling' }))
    const { error } = await cancelMission(cancelModal, cancelReason)
    setActionLoading(s => ({ ...s, [cancelModal]: null }))
    if (error) { showToast("Erreur lors de l'annulation", 'error'); return }
    setMissions(prev => prev.map(m => m.id === cancelModal ? { ...m, status: 'cancelled' } : m))
    setCancelModal(null)
    setCancelReason('')
    showToast('Mission annulée')
  }, [cancelModal, cancelReason, showToast, setMissions])

  const handleSignContract = useCallback(async (_signatureData) => {
    if (!contractModal) return
    setSigningContract(true)
    const { error: contractError } = await saveContract({
      mission_id: contractModal.missionId,
      company_id: userId,
      worker_id: contractModal.workerId,
      signed_company_at: new Date().toISOString(),
      status: 'signed_company',
    })
    if (contractError) {
      showToast('Erreur lors de la signature', 'error')
      setSigningContract(false)
      return
    }
    const updated = [...signedContracts, contractModal.missionId]
    setSignedContracts(updated)
    localStorage.setItem('tempo_signed_contracts_e', JSON.stringify(updated))
    setSigningContract(false)
    setContractModal(null)
    showToast('Contrat signé avec succès !')
  }, [contractModal, userId, showToast, signedContracts])

  const ALLOWED_COMPANY_FIELDS = ['name', 'siret', 'city', 'address', 'sector', 'contact_name', 'contact_phone', 'description']

  const handleSaveCompanyProfile = useCallback(async (profileForm) => {
    setSavingProfile(true)
    const safeUpdate = Object.fromEntries(
      Object.entries(profileForm)
        .filter(([k, v]) => ALLOWED_COMPANY_FIELDS.includes(k) && v !== undefined)
    )
    if (Object.keys(safeUpdate).length === 0) {
      setSavingProfile(false)
      showToast('Aucune modification à sauvegarder', 'warn')
      return
    }
    safeUpdate.updated_at = new Date().toISOString()
    const { error } = await supabase
      .from('companies')
      .update(safeUpdate)
      .eq('id', userId)
      .select('id')
    setSavingProfile(false)
    if (error) {
      showToast(`Erreur lors de la sauvegarde : ${error.message || 'erreur inconnue'}`, 'error')
    } else {
      showToast('Profil mis à jour !')
      refreshRoleData?.()
    }
  }, [userId, showToast, refreshRoleData])

  const handleRepublishRecurring = useCallback((m, setForm, setScreen) => {
    setForm({
      title: m.title || '', sector: m.sector || 'logistique',
      objet_prestation: m.objet_prestation || '',
      motif_recours: m.motif_recours || 'accroissement_temporaire',
      pricing_mode: m.pricing_mode || 'forfait',
      forfait_total: m.forfait_total?.toString() || '',
      hourly_rate: m.hourly_rate?.toString() || '',
      total_hours: m.total_hours?.toString() || '', start_date: '', city: m.city || '',
      address: m.address || '', description: m.description || '',
      required_skills: m.required_skills || [], required_certs: m.required_certs || [],
      urgency: m.urgency || 'normal',
      legal_confirmed: false,
    })
    setPublished(false)
    setScreen('publier')
    showToast('Mission récurrente — ajustez la date, confirmez l\'engagement et publiez')
  }, [showToast])

  return {
    publishing,
    published,
    savingProfile,
    handleSaveCompanyProfile,
    setPublished,
    candidates,
    setCandidates,
    selectedMissionId,
    setSelectedMissionId,
    actionLoading,
    ratingModal,
    setRatingModal,
    ratingLoading,
    templates,
    showTemplates,
    setShowTemplates,
    cancelModal,
    setCancelModal,
    cancelReason,
    setCancelReason,
    contractModal,
    setContractModal,
    signingContract,
    signedContracts,
    handlePublish,
    loadCandidates,
    handleAccept,
    handleReject,
    handleCompleteMission,
    handleRatingSubmit,
    duplicateMission,
    saveAsTemplate,
    loadTemplate,
    deleteTemplate,
    exportInvoicesCSV,
    exportMissionsCSV,
    handleCancel,
    handleSignContract,
    handleRepublishRecurring,
  }
}
