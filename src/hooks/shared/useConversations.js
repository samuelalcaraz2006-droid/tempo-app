import { useCallback, useEffect, useRef, useState } from 'react'
import { getConversations, subscribeToMessages } from '../../lib/supabase'

// Charge les conversations d'un utilisateur et se rafraichit en realtime
// a chaque nouveau message recu (debouncing 300ms pour absorber les rafales).
export function useConversations(userId) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const reloadTimer = useRef(null)

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    const { data, error: loadError } = await getConversations(userId)
    setError(loadError || null)
    setConversations(data || [])
    setLoading(false)
  }, [userId])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    if (!userId) return
    const sub = subscribeToMessages(userId, () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
      reloadTimer.current = setTimeout(() => {
        load()
      }, 300)
    })
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
      sub.unsubscribe()
    }
  }, [userId, load])

  return { conversations, loading, refreshing, refresh, error }
}
