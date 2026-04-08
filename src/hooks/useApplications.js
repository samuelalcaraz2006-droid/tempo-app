import { useState, useEffect, useCallback } from 'react'
import { getWorkerApplications } from '../lib/supabase'

export function useApplications(workerId) {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!workerId) {
      setApplications([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await getWorkerApplications(workerId)
    if (err) {
      setError(err)
    } else {
      setApplications(data ?? [])
    }
    setLoading(false)
  }, [workerId])

  useEffect(() => { load() }, [load])

  return { applications, loading, error, reload: load }
}
