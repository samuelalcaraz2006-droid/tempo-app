import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getWorkerApplications, withdrawApplication } from '../../lib/supabase'
import { formatDate } from '../../lib/formatters'
import colors from '../../theme/colors'
import Badge from '../../components/Badge'

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'orange' },
  accepted: { label: 'Acceptée', variant: 'green' },
  rejected: { label: 'Refusée', variant: 'red' },
  withdrawn: { label: 'Retirée', variant: 'gray' },
}

export default function ApplicationsScreen() {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user) return
    const { data } = await getWorkerApplications(user.id)
    setApplications(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  const handleWithdraw = (appId) => {
    Alert.alert('Retirer la candidature', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          await withdrawApplication(appId)
          load()
        },
      },
    ])
  }

  const active = applications.filter((a) => !['withdrawn', 'rejected'].includes(a.status))
  const archived = applications.filter((a) => ['withdrawn', 'rejected'].includes(a.status))

  const AppCard = ({ app }) => {
    const mission = app.missions
    const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{mission?.title || '—'}</Text>
            <Text style={s.cardSub}>{mission?.companies?.name || '—'} · {mission?.city || '—'}</Text>
          </View>
          <Badge label={config.label} variant={config.variant} />
        </View>
        <View style={s.cardMeta}>
          <Text style={s.metaText}>💰 {mission?.hourly_rate ? `${mission.hourly_rate} €/h` : '—'}</Text>
          <Text style={s.metaText}>📅 {formatDate(mission?.start_date)}</Text>
          <Text style={s.metaText}>Postulé le {formatDate(app.applied_at)}</Text>
        </View>
        {app.status === 'pending' && (
          <TouchableOpacity onPress={() => handleWithdraw(app.id)} style={s.withdrawBtn}>
            <Text style={s.withdrawText}>Retirer la candidature</Text>
          </TouchableOpacity>
        )}
        {app.status === 'accepted' && (
          <View style={s.acceptedBanner}>
            <Text style={s.acceptedText}>🎉 Mission acceptée ! Signez le contrat depuis votre messagerie.</Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Mes candidatures</Text>
        <Text style={s.pageCount}>{applications.length} au total</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : applications.length === 0
            ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={s.emptyTitle}>Aucune candidature</Text>
                <Text style={s.emptyDesc}>Parcourez les missions et postulez pour commencer !</Text>
              </View>
            )
            : (
              <>
                {active.length > 0 && (
                  <>
                    <Text style={s.groupTitle}>En cours ({active.length})</Text>
                    {active.map((a) => <AppCard key={a.id} app={a} />)}
                  </>
                )}
                {archived.length > 0 && (
                  <>
                    <Text style={s.groupTitle}>Archivées ({archived.length})</Text>
                    {archived.map((a) => <AppCard key={a.id} app={a} />)}
                  </>
                )}
              </>
            )
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  pageHeader: { padding: 16, paddingBottom: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray2 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.black },
  pageCount: { fontSize: 13, color: colors.gray4, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  groupTitle: { fontSize: 14, fontWeight: '600', color: colors.gray6, marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.black },
  cardSub: { fontSize: 12, color: colors.gray4, marginTop: 2 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaText: { fontSize: 12, color: colors.gray6 },
  withdrawBtn: { borderWidth: 1, borderColor: colors.red, borderRadius: 8, padding: 8, alignItems: 'center' },
  withdrawText: { color: colors.red, fontSize: 13, fontWeight: '500' },
  acceptedBanner: { backgroundColor: colors.greenLight, borderRadius: 8, padding: 10 },
  acceptedText: { color: colors.greenDark, fontSize: 12 },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.black, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.gray4, textAlign: 'center', lineHeight: 20 },
})
