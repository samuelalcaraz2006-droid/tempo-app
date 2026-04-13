import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getNotifications, markNotifsRead } from '../../lib/supabase'
import { formatDate } from '../../lib/formatters'
import colors from '../../theme/colors'

const TYPE_ICONS = {
  application_accepted: '✅',
  application_rejected: '❌',
  new_mission: '📋',
  kyc_approved: '🎉',
  kyc_rejected: '⚠️',
  message: '💬',
  payment: '💰',
}

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await getNotifications(user.id)
      setNotifs(data || [])
      setLoading(false)
      await markNotifsRead(user.id)
    }
    load()
  }, [user?.id])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹ Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : notifs.length === 0
            ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>🔔</Text>
                <Text style={s.emptyTitle}>Aucune notification</Text>
                <Text style={s.emptyDesc}>Vos notifications apparaîtront ici.</Text>
              </View>
            )
            : notifs.map((n) => (
              <View key={n.id} style={[s.notifCard, !n.read_at && s.unread]}>
                <Text style={s.notifIcon}>{TYPE_ICONS[n.type] || '🔔'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.notifTitle}>{n.title}</Text>
                  {n.body && <Text style={s.notifBody}>{n.body}</Text>}
                  <Text style={s.notifDate}>{formatDate(n.created_at)}</Text>
                </View>
                {!n.read_at && <View style={s.dot} />}
              </View>
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
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray1, gap: 12 },
  unread: { backgroundColor: colors.brandLight },
  notifIcon: { fontSize: 22, width: 32 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.black, marginBottom: 2 },
  notifBody: { fontSize: 13, color: colors.gray6, lineHeight: 18, marginBottom: 4 },
  notifDate: { fontSize: 11, color: colors.gray4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 4 },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.gray4, textAlign: 'center' },
})
