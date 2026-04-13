import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getMessages, sendMessage, supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/formatters'
import colors from '../../theme/colors'

export default function ChatScreen({ route, navigation }) {
  const { partnerId, partnerName = 'Conversation', missionId } = route.params || {}
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const load = async () => {
    if (!user || !partnerId) return
    const { data } = await getMessages(user.id, partnerId, missionId)
    setMessages(data || [])
  }

  useEffect(() => {
    load()
    // Realtime subscription
    const channel = supabase
      .channel(`chat_${user?.id}_${partnerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${user?.id}`,
      }, (payload) => {
        if (payload.new.sender_id === partnerId) {
          setMessages((prev) => [...prev, payload.new])
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id, partnerId])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !user || !partnerId) return
    setSending(true)
    const content = input.trim()
    setInput('')
    const { data, error } = await sendMessage({ senderId: user.id, receiverId: partnerId, missionId, content })
    if (!error && data) setMessages((prev) => [...prev, data])
    setSending(false)
  }

  const renderMessage = ({ item }) => {
    const isMine = item.sender_id === user?.id
    return (
      <View style={[s.msgRow, isMine ? s.msgRowMine : s.msgRowOther]}>
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
          <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextOther]}>{item.content}</Text>
          <Text style={[s.bubbleTime, isMine ? s.bubbleTimeMine : s.bubbleTimeOther]}>
            {new Date(item.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <Text style={s.headerName}>{partnerName}</Text>
          {missionId && <Text style={s.headerSub}>Mission en cours</Text>}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={renderMessage}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>Démarrez la conversation !</Text>}
        />
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Votre message..."
            placeholderTextColor={colors.gray4}
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={sending || !input.trim()}>
            <Text style={s.sendText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray2, gap: 12 },
  back: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: colors.gray6 },
  headerInfo: {},
  headerName: { fontSize: 16, fontWeight: '600', color: colors.black },
  headerSub: { fontSize: 12, color: colors.gray4, marginTop: 2 },
  list: { padding: 12, paddingBottom: 8 },
  msgRow: { marginBottom: 6 },
  msgRowMine: { alignItems: 'flex-end' },
  msgRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10, paddingHorizontal: 14 },
  bubbleMine: { backgroundColor: colors.brand, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.gray1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextOther: { color: colors.black },
  bubbleTime: { fontSize: 10, marginTop: 4, opacity: 0.7 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  bubbleTimeOther: { color: colors.gray4 },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: colors.gray2, gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.gray1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.black, maxHeight: 120 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18 },
  empty: { textAlign: 'center', color: colors.gray4, padding: 40 },
})
