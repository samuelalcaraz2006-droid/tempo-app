import { useCallback, useEffect, useRef, useState } from 'react'
import { getMessages, markMessagesRead, sendMessage, subscribeToChatPresence, subscribeToMessages } from '../../lib/supabase'

// Throttle des events 'typing' sortants pour eviter le spam du canal.
const TYPING_THROTTLE_MS = 1500
// Auto-effacement de l'indicateur "partenaire tape" si aucun event recu depuis ce delai.
const TYPING_DECAY_MS = 3500

// Hook stateless : une instance = une conversation avec un partenaire.
// Signature identique au mobile (tempo-mobile/hooks/useChat.js).
export function useChat(userId, partnerId, missionId, { onError } = {}) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [input, setInputState] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const latestKey = useRef('')
  const sendTypingRef = useRef(null)
  const lastTypingSent = useRef(0)
  const decayTimerRef = useRef(null)

  const convKey = `${userId || ''}::${partnerId || ''}::${missionId || ''}`

  useEffect(() => {
    if (!userId || !partnerId) {
      setLoading(false)
      return
    }
    let cancelled = false
    latestKey.current = convKey
    setLoading(true)
    setMessages([])
    ;(async () => {
      const { data, error: err } = await getMessages(userId, partnerId, missionId)
      if (cancelled || latestKey.current !== convKey) return
      if (err) {
        setError(err)
        setMessages([])
        onError?.('Erreur lors du chargement des messages')
      } else {
        setMessages(data || [])
      }
      setLoading(false)
      markMessagesRead(userId, partnerId, missionId).then(() => {})
    })()
    return () => {
      cancelled = true
    }
  }, [userId, partnerId, missionId, convKey, onError])

  useEffect(() => {
    if (!userId || !partnerId) return
    const onInsert = (payload) => {
      const msg = payload.new
      if (!msg) return
      if (msg.sender_id !== partnerId) return
      // Si le chat est scope a une mission, n'accepter que celle-ci ;
      // sinon accepter tous les messages de ce partenaire.
      if (missionId && (msg.mission_id || null) !== missionId) return
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      markMessagesRead(userId, partnerId, missionId).then(() => {})
    }
    const onUpdate = (payload) => {
      const msg = payload.new
      if (!msg || msg.receiver_id !== partnerId) return
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read_at: msg.read_at } : m)))
    }
    const sub = subscribeToMessages(userId, onInsert, onUpdate)
    return () => {
      sub.unsubscribe()
    }
  }, [userId, partnerId, missionId])

  // Indicateur "est en train d'ecrire" via broadcast channel.
  useEffect(() => {
    if (!userId || !partnerId) return
    const clearDecay = () => {
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current)
        decayTimerRef.current = null
      }
    }
    const presence = subscribeToChatPresence(userId, partnerId, (payload) => {
      if (payload?.state === 'stop') {
        clearDecay()
        setPartnerTyping(false)
        return
      }
      setPartnerTyping(true)
      clearDecay()
      decayTimerRef.current = setTimeout(() => setPartnerTyping(false), TYPING_DECAY_MS)
    })
    sendTypingRef.current = presence.sendTyping
    return () => {
      clearDecay()
      sendTypingRef.current = null
      setPartnerTyping(false)
      presence.unsubscribe()
    }
  }, [userId, partnerId])

  const setInput = useCallback((value) => {
    setInputState(value)
    if (!value) return
    const now = Date.now()
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return
    lastTypingSent.current = now
    sendTypingRef.current?.('start')
  }, [])

  const send = useCallback(async () => {
    const content = input.trim()
    if (!content || !userId || !partnerId) return { error: new Error('invalid') }
    setSending(true)
    const { data, error: err } = await sendMessage({
      senderId: userId,
      receiverId: partnerId,
      missionId,
      content,
    })
    setSending(false)
    if (err) {
      setError(err)
      onError?.("Erreur lors de l'envoi du message")
      return { error: err }
    }
    if (data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
      setInputState('')
      lastTypingSent.current = 0
      sendTypingRef.current?.('stop')
    }
    return { data }
  }, [input, userId, partnerId, missionId, onError])

  return {
    messages,
    loading,
    input,
    setInput,
    sending,
    error,
    send,
    partnerTyping,
  }
}
