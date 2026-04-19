import { useCallback, useEffect, useState } from 'react'
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  submitTimeEntries,
} from '../../lib/supabase'
import { captureError } from '../../lib/sentry'

// ═══════════════════════════════════════════════════════════════
// useMissionTimeEntries — CRUD des heures travaillées pour un worker.
//
// Scoping :
// - workerId (obligatoire) : toutes les entries du worker
// - contractId (optionnel) : filtre sur un contrat précis
//
// Retourne :
// - entries, loading, error, refresh
// - create(payload), update(id, patch), remove(id), submit(contractId)
// - totals : totalWorkedMinutes, totalByStatus (draft/submitted/validated)
// ═══════════════════════════════════════════════════════════════

export function useMissionTimeEntries(workerId, { contractId } = {}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!workerId) { setLoading(false); return }
    setLoading(true)
    const { data, error: err } = await getTimeEntries({ workerId, contractId })
    if (err) {
      setError(err)
      captureError(err, { source: 'useMissionTimeEntries.refresh' })
    } else {
      setEntries(data || [])
      setError(null)
    }
    setLoading(false)
  }, [workerId, contractId])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (payload) => {
    const { data, error: err } = await createTimeEntry(payload)
    if (err) {
      captureError(err, { source: 'useMissionTimeEntries.create' })
      return { error: err }
    }
    setEntries(prev => [data, ...prev])
    return { data }
  }, [])

  const update = useCallback(async (id, patch) => {
    const { data, error: err } = await updateTimeEntry(id, patch)
    if (err) {
      captureError(err, { source: 'useMissionTimeEntries.update' })
      return { error: err }
    }
    setEntries(prev => prev.map(e => e.id === id ? data : e))
    return { data }
  }, [])

  const remove = useCallback(async (id) => {
    const { error: err } = await deleteTimeEntry(id)
    if (err) {
      captureError(err, { source: 'useMissionTimeEntries.remove' })
      return { error: err }
    }
    setEntries(prev => prev.filter(e => e.id !== id))
    return { data: true }
  }, [])

  const submit = useCallback(async (cid) => {
    const target = cid || contractId
    if (!target) return { error: new Error('contractId missing') }
    const { data, error: err } = await submitTimeEntries(target)
    if (err) {
      captureError(err, { source: 'useMissionTimeEntries.submit' })
      return { error: err }
    }
    // Mettre à jour localement les drafts → submitted
    setEntries(prev => prev.map(e => (
      e.contract_id === target && e.status === 'draft'
        ? { ...e, status: 'submitted', submitted_at: new Date().toISOString() }
        : e
    )))
    return { data }
  }, [contractId])

  // Agrégats utiles pour l'UI
  const totalWorkedMinutes = entries.reduce((s, e) => s + (e.worked_minutes || 0), 0)
  const totalByStatus = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return {
    entries,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    submit,
    totalWorkedMinutes,
    totalByStatus,
  }
}
