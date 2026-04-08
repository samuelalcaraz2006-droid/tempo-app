import { useState, useEffect, useCallback } from 'react'
import { getMissions } from '../lib/supabase'

export function useMissions(filters = {}) {
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filtersKey = JSON.stringify(filters)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await getMissions(filters)
    if (err) {
      setError(err)
    } else {
      setMissions(data ?? [])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey])

  useEffect(() => { load() }, [load])

  return { missions, loading, error, reload: load }
}
