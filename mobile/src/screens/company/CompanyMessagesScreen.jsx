import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getConversations, getCompanyMissions } from '../../lib/supabase'
import { formatDate } from '../../lib/formatters'
import colors from '../../theme/colors'

export default function CompanyMessagesScreen({ navigation }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const [{ data: convs }, { data: m }] = await Promise.all([
        getConversations(user.id),
        getCompanyMissions(user.id),
      ])
      setConversations(convs || [])
      setMissions(m || [])
      setLoading(false)
    }
    load()
  }, [user?.id])

  const getMissionTitle = (missionId) => {
    const m = missions.find((mis) => mis.id === missionId)
    return m?.title || null
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <Text style={s.subtitle}>{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : conversations.length === 0
            ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>💬</Text>
                <Text style={s.emptyTitle}>Aucune conversation</Text>
                <Text style={s.emptyDesc}>Vos échanges avec les travailleurs apparaîtront ici.</Text>
              </View>
            )
            : conversations.map((conv, i) => {
              const missionTitle = conv.missionId ? getMissionTitle(conv.missionId) : null
              return (
                <TouchableOpacity
                  key={i}
                  style={s.convCard}
                  onPress={() => navigation.navigate('Chat', {
                    partnerId: conv.partnerId,
                    partnerName: `Travailleur #${conv.partnerId?.slice(0, 6)}`,
                    missionId: conv.missionId,
                  })}
                >
                  <View style={s.convAvatar}>
                    <Text style={s.convAvatarText}>👷</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.convName}>Travailleur #{conv.partnerId?.slice(0, 6)}</Text>
                    {missionTitle && <Text style={s.convMission} numberOfLines={1}>Mission : {missionTitle}</Text>}
                    <Text style={s.convLast} numberOfLines={1}>{conv.lastMessage?.content || '—'}</Text>
                  </View>
                  <View style={s.convRight}>
                    <Text style={s.convDate}>{formatDate(conv.lastMessage?.created_at)}</Text>
                    {!conv.lastMessage?.read_at && conv.lastMessage?.receiver_id === user?.id && (
                      <View style={s.unreadDot} />
                    )}
                  </View>
                </TouchableOpacity>
              )
            })
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray2 },
  title: { fontSize: 20, fontWeight: '700', color: colors.black },
  subtitle: { fontSize: 13, color: colors.gray4, marginTop: 2 },
  scroll: { paddingBottom: 32 },
  convCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray1, gap: 12 },
  convAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gray1, alignItems: 'center', justifyContent: 'center' },
  convAvatarText: { fontSize: 22 },
  convName: { fontSize: 14, fontWeight: '600', color: colors.black, marginBottom: 2 },
  convMission: { fontSize: 11, color: colors.brand, marginBottom: 2 },
  convLast: { fontSize: 13, color: colors.gray4 },
  convRight: { alignItems: 'flex-end', gap: 6 },
  convDate: { fontSize: 11, color: colors.gray4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.gray4, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
})
