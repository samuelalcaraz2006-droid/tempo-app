import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getConversations } from '../../lib/supabase'
import { formatDate } from '../../lib/formatters'
import colors from '../../theme/colors'

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await getConversations(user.id)
      setConversations(data || [])
      setLoading(false)
    }
    load()
  }, [user?.id])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Messages</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : conversations.length === 0
            ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>💬</Text>
                <Text style={s.emptyTitle}>Aucun message</Text>
                <Text style={s.emptyDesc}>Vos conversations avec les entreprises apparaîtront ici.</Text>
              </View>
            )
            : conversations.map((conv, i) => (
              <TouchableOpacity
                key={i}
                style={s.convCard}
                onPress={() => navigation.navigate('Chat', {
                  partnerId: conv.partnerId,
                  partnerName: `Entreprise #${conv.partnerId?.slice(0, 6)}`,
                  missionId: conv.missionId,
                })}
              >
                <View style={s.convAvatar}>
                  <Text style={s.convAvatarText}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.convName}>Entreprise #{conv.partnerId?.slice(0, 6)}</Text>
                  <Text style={s.convLast} numberOfLines={1}>{conv.lastMessage?.content || '—'}</Text>
                </View>
                <Text style={s.convDate}>{formatDate(conv.lastMessage?.created_at)}</Text>
              </TouchableOpacity>
            ))
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray2, gap: 12 },
  back: { color: colors.gray4, fontSize: 15 },
  title: { fontSize: 18, fontWeight: '700', color: colors.black },
  scroll: { paddingBottom: 32 },
  convCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray1, gap: 12 },
  convAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gray1, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { fontSize: 22 },
  convName: { fontSize: 14, fontWeight: '600', color: colors.black, marginBottom: 2 },
  convLast: { fontSize: 13, color: colors.gray4 },
  convDate: { fontSize: 11, color: colors.gray4 },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.gray4, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
})
