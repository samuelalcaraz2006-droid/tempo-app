import { useState, useEffect, useCallback } from 'react'
import { getCompanyMissions, getCompanyInvoices, getNotifications } from '../../lib/supabase'
import { isPushSupported, requestPushPermission, getPermissionStatus } from '../../lib/pushNotifications'

export function useCompanyData(userId) {
  const [missions, setMissions] = useState([])
  const [invoices, setInvoices] = useState([])
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [mRes, iRes, nRes] = await Promise.allSettled([
        getCompanyMissions(userId),
        getCompanyInvoices(userId),
        getNotifications(userId),
      ])
      if (mRes.status === 'fulfilled' && mRes.value.data) setMissions(mRes.value.data)
      if (iRes.status === 'fulfilled' && iRes.value.data) setInvoices(iRes.value.data)
      if (nRes.status === 'fulfilled' && nRes.value.data) setNotifs(nRes.value.data)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { loadData() }, [loadData])

  // Push permission request on first load
  useEffect(() => {
    if (isPushSupported() && getPermissionStatus() === 'default') {
      requestPushPermission()
    }
  }, [])

  return {
    missions,
    setMissions,
    invoices,
    setInvoices,
    notifs,
    loading,
    loadData,
  }
}
