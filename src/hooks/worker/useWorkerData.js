import { useState, useEffect, useCallback, useRef } from 'react'
import { getMissions, getWorkerApplications, getWorkerInvoices, getNotifications, getWorkerMissions, getSignedContractsByWorker, subscribeToMissions, subscribeToNotifications } from '../../lib/supabase'
import { computeMatchScore } from '../../lib/matching'
import { isPushSupported, requestPushPermission, sendLocalNotification, getPermissionStatus } from '../../lib/pushNotifications'

export function useWorkerData(userId, worker) {
  const [missions, setMissions] = useState([])
  const [applications, setApplications] = useState([])
  const [invoices, setInvoices] = useState([])
  const [notifs, setNotifs] = useState([])
  const [allMissions, setAllMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [signedContracts, setSignedContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_signed_contracts') || '[]') } catch { return [] }
  })

  const loadData = useCallback(async (missionFilters = {}) => {
    if (!userId) return
    setLoading(true)
    try {
      const [mRes, aRes, iRes, nRes, wmRes, scRes] = await Promise.allSettled([
        getMissions({ status: 'open', limit: 50, ...missionFilters }),
        getWorkerApplications(userId),
        getWorkerInvoices(userId),
        getNotifications(userId),
        getWorkerMissions(userId),
        getSignedContractsByWorker(userId),
      ])
      if (mRes.status === 'fulfilled' && mRes.value.data) {
        const withScores = mRes.value.data.map(m => ({
          ...m,
          matchScore: worker ? computeMatchScore(m, worker).total_score : 50
        })).sort((a, b) => b.matchScore - a.matchScore)
        setMissions(withScores)
      }
      if (aRes.status === 'fulfilled' && aRes.value.data) setApplications(aRes.value.data)
      if (iRes.status === 'fulfilled' && iRes.value.data) setInvoices(iRes.value.data)
      if (nRes.status === 'fulfilled' && nRes.value.data) setNotifs(nRes.value.data)
      if (wmRes.status === 'fulfilled' && wmRes.value.data) setAllMissions(wmRes.value.data)
      if (scRes.status === 'fulfilled' && scRes.value.data?.length) {
        setSignedContracts(prev => {
          const merged = [...new Set([...prev, ...scRes.value.data])]
          localStorage.setItem('tempo_signed_contracts', JSON.stringify(merged))
          return merged
        })
      }
    } finally {
      setLoading(false)
    }
  }, [userId, worker?.id])

  const loadDataRef = useRef(loadData)
  useEffect(() => { loadDataRef.current = loadData }, [loadData])

  useEffect(() => { loadData() }, [loadData])

  // Push permission
  useEffect(() => {
    if (isPushSupported() && getPermissionStatus() === 'default') {
      requestPushPermission()
    }
  }, [])

  // Realtime: missions + notifications
  useEffect(() => {
    if (!userId) return
    const mSub = subscribeToMissions(() => loadDataRef.current())
    const nSub = subscribeToNotifications(userId, (payload) => {
      setNotifs(prev => [payload.new, ...prev])
      sendLocalNotification(payload.new.title || 'TEMPO', {
        body: payload.new.body || 'Vous avez une nouvelle notification',
        tag: `notif-${payload.new.id}`,
      })
    })
    return () => {
      mSub.unsubscribe()
      nSub.unsubscribe()
    }
  }, [userId])

  const addSignedContract = (missionId) => {
    const updated = [...signedContracts, missionId]
    setSignedContracts(updated)
    localStorage.setItem('tempo_signed_contracts', JSON.stringify(updated))
  }

  return {
    missions, setMissions,
    applications, setApplications,
    invoices,
    notifs, setNotifs,
    allMissions, setAllMissions,
    loading,
    signedContracts,
    addSignedContract,
    loadData,
  }
}
