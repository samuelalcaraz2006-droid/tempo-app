import { useState, useEffect, useCallback } from 'react'
import { getMessages, sendMessage, subscribeToMessages } from '../../lib/supabase'
import { sendLocalNotification } from '../../lib/pushNotifications'

export function useChat(userId, { onError } = {}) {
  const [chatMessages, setChatMessages] = useState([])
  const [chatPartner, setChatPartner] = useState(null)
  const [chatMissionId, setChatMissionId] = useState(null)
  const [chatInput, setChatInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)

  const openChat = useCallback(async (partnerId, partnerName, missionId) => {
    setChatPartner({ id: partnerId, name: partnerName })
    setChatMissionId(missionId)
    const { data, error } = await getMessages(userId, partnerId, missionId)
    if (error && onError) onError('Erreur lors du chargement des messages')
    setChatMessages(data || [])
    return { data, error }
  }, [userId, onError])

  const handleSendMessage = useCallback(async () => {
    if (!chatInput.trim() || !chatPartner) return
    setSendingMsg(true)
    const { data, error } = await sendMessage({
      senderId: userId,
      receiverId: chatPartner.id,
      missionId: chatMissionId,
      content: chatInput.trim(),
    })
    setSendingMsg(false)
    if (error) {
      if (onError) onError('Erreur lors de l\'envoi du message')
      return
    }
    if (data) setChatMessages(prev => [...prev, data])
    setChatInput('')
  }, [chatInput, chatPartner, chatMissionId, userId, onError])

  const closeChat = useCallback(() => {
    setChatPartner(null)
    setChatMissionId(null)
    setChatMessages([])
    setChatInput('')
  }, [])

  // Realtime subscription
  //  - Si une conversation est ouverte avec un partenaire : tout message de
  //    ce partenaire est ajoute au fil, quelle que soit la mission (la vue
  //    messages est groupee par interlocuteur, pas par mission).
  //  - Si le chat est ferme ou vient d'un autre expediteur : increment
  //    badge + notification locale.
  useEffect(() => {
    if (!userId) return
    const msgSub = subscribeToMessages(userId, (payload) => {
      const fromCurrentPartner = chatPartner && payload.new.sender_id === chatPartner.id
      const missionMatches = chatMissionId == null || payload.new.mission_id === chatMissionId
      if (fromCurrentPartner && missionMatches) {
        setChatMessages(prev => [...prev, payload.new])
      } else {
        setUnreadMessages(prev => prev + 1)
        sendLocalNotification('Nouveau message', {
          body: payload.new.content?.slice(0, 80) || 'Vous avez reçu un message',
          tag: `msg-${payload.new.id}`,
        })
      }
    })
    return () => { msgSub.unsubscribe() }
  }, [userId, chatPartner?.id, chatMissionId])

  return {
    chatMessages,
    chatPartner,
    chatMissionId,
    chatInput,
    setChatInput,
    sendingMsg,
    unreadMessages,
    openChat,
    handleSendMessage,
    closeChat,
  }
}
