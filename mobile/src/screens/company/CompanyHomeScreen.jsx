import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getCompanyMissions, cancelMission, completeMission } from '../../lib/supabase'
import { formatDate } from '../../lib/formatters'
import colors from '../../theme/colors'
import Badge from '../../components/Badge'

const STATUS_CONFIG = {
  open: { label: 'Ouverte', variant: 'green' },
  matched: { label: 'Pourvue', variant: 'blue' },
  completed: { label: 'Terminée', variant: 'gray' },
  cancelled: { label: 'Annulée', variant: 'red' },
}

export default function CompanyHomeScreen({ navigation }) {
  const { user, profile, roleData } = useAuth()
  const company = roleData
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!user) return
    const { data } = await getCompanyMissions(user.id)
    setMissions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  const handleCancel = (missionId) => {
    Alert.alert('Annuler la mission', 'Cette action est irréversible.', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler la mission', style: 'destructive',
        onPress: async () => { await cancelMission(missionId, ''); load() },
      },
    ])
  }

  const handleComplete = (missionId) => {
    Alert.alert('Terminer la mission', 'Marquer cette mission comme terminée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Terminer',
        onPress: async () => { await completeMission(missionId); load() },
      },
    ])
  }

  const active = missions.filter((m) => ['open', 'matched'].includes(m.status))
  const past = missions.filter((m) => ['completed', 'cancelled'].includes(m.status))

  const displayName = company?.name || profile?.email || '—'

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Bienvenue,</Text>
            <Text style={s.name}>{displayName}</Text>
          </View>
          <TouchableOpacity
            style={s.publishBtn}
            onPress={() => navigation.navigate('PublierTab')}
          >
            <Text style={s.publishText}>+ Publier</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Actives', value: active.length },
            { label: 'Total', value: missions.length },
            { label: 'Terminées', value: past.filter((m) => m.status === 'completed').length },
          ].map((stat) => (
            <View key={stat.label} style={s.stat}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Active missions */}
        <Text style={s.sectionTitle}>Missions actives ({active.length})</Text>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : active.length === 0
            ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>Aucune mission active. Publiez votre première mission !</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('PublierTab')}>
                  <Text style={s.emptyBtnText}>Publier une mission →</Text>
                </TouchableOpacity>
              </View>
            )
            : active.map((m) => (
              <MissionRow
                key={m.id}
                mission={m}
                onViewCandidates={() => navigation.navigate('Candidates', { missionId: m.id, missionTitle: m.title })}
                onCancel={() => handleCancel(m.id)}
                onComplete={() => handleComplete(m.id)}
              />
            ))
        }

        {/* Past missions */}
        {past.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Historique ({past.length})</Text>
            {past.map((m) => <MissionRow key={m.id} mission={m} past />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function MissionRow({ mission, onViewCandidates, onCancel, onComplete, past }) {
  const config = STATUS_CONFIG[mission.status] || STATUS_CONFIG.open
  return (
    <View style={s.missionCard}>
      <View style={s.missionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.missionTitle} numberOfLines={1}>{mission.title}</Text>
          <Text style={s.missionMeta}>{mission.city || '—'} · {formatDate(mission.start_date)}</Text>
        </View>
        <Badge label={config.label} variant={config.variant} />
      </View>
      <View style={s.missionDetails}>
        <Text style={s.missionDetail}>💰 {mission.hourly_rate ? `${mission.hourly_rate} €/h` : '—'}</Text>
        <Text style={s.missionDetail}>⏱ {mission.total_hours ? `${mission.total_hours}h` : '—'}</Text>
      </View>
      {!past && (
        <View style={s.missionActions}>
          {mission.status === 'open' && (
            <TouchableOpacity style={s.actionBtn} onPress={onViewCandidates}>
              <Text style={s.actionBtnText}>Voir candidats</Text>
            </TouchableOpacity>
          )}
          {mission.status === 'matched' && (
            <TouchableOpacity style={[s.actionBtn, s.actionGreen]} onPress={onComplete}>
              <Text style={[s.actionBtnText, { color: colors.greenDark }]}>Terminer</Text>
            </TouchableOpacity>
          )}
          {['open', 'matched'].includes(mission.status) && (
            <TouchableOpacity style={[s.actionBtn, s.actionRed]} onPress={onCancel}>
              <Text style={[s.actionBtnText, { color: colors.red }]}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 13, color: colors.gray4 },
  name: { fontSize: 20, fontWeight: '700', color: colors.black },
  publishBtn: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  publishText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.black },
  statLabel: { fontSize: 11, color: colors.gray4, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 12 },
  missionCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  missionHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  missionTitle: { fontSize: 14, fontWeight: '600', color: colors.black },
  missionMeta: { fontSize: 12, color: colors.gray4, marginTop: 2 },
  missionDetails: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  missionDetail: { fontSize: 12, color: colors.gray6 },
  missionActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', backgroundColor: colors.gray1, borderWidth: 1, borderColor: colors.gray2 },
  actionGreen: { backgroundColor: colors.greenLight, borderColor: colors.green },
  actionRed: { backgroundColor: colors.redLight, borderColor: colors.red },
  actionBtnText: { fontSize: 13, fontWeight: '500', color: colors.gray6 },
  emptyCard: { backgroundColor: colors.white, borderRadius: 14, padding: 20, alignItems: 'center' },
  emptyText: { color: colors.gray4, fontSize: 14, textAlign: 'center', marginBottom: 12 },
  emptyBtn: { backgroundColor: colors.brandLight, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  emptyBtnText: { color: colors.brand, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.gray4, textAlign: 'center', padding: 20 },
})
