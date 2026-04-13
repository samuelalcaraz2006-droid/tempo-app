import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getMissions, setWorkerAvailability } from '../../lib/supabase'
import colors from '../../theme/colors'
import MissionCard from '../../components/MissionCard'
import { useToast } from '../../components/Toast'
import Toast from '../../components/Toast'

export default function WorkerHomeScreen({ navigation }) {
  const { user, profile, roleData, refreshRoleData } = useAuth()
  const worker = roleData
  const { toast, showToast, hideToast } = useToast()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [disponible, setDisponible] = useState(worker?.is_available || false)
  const [applying, setApplying] = useState({})

  const displayName = worker
    ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || profile?.email
    : profile?.email || '—'

  useEffect(() => {
    const load = async () => {
      const { data } = await getMissions({ status: 'open', limit: 10 })
      setMissions(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (worker) setDisponible(worker.is_available || false)
  }, [worker?.id])

  const toggleDispo = async (val) => {
    setDisponible(val)
    await setWorkerAvailability(user.id, val)
    await refreshRoleData()
  }

  const urgentMissions = missions.filter((m) => m.urgency === 'immediate' || m.urgency === 'urgent')

  const kycStatus = () => {
    if (worker?.id_verified && worker?.siret_verified && worker?.rc_pro_verified) return { label: 'KYC vérifié ✓', color: colors.green, bg: colors.greenLight }
    if (worker?.kyc_submitted_at) return { label: 'KYC en cours de vérification', color: colors.brand, bg: colors.brandLight }
    return { label: 'KYC à compléter', color: colors.red, bg: colors.redLight }
  }
  const kyc = kycStatus()

  return (
    <SafeAreaView style={s.safe}>
      <Toast {...toast} onHide={hideToast} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Bonjour,</Text>
            <Text style={s.name}>{displayName}</Text>
          </View>
          <View style={s.dispoRow}>
            <Text style={[s.dispoText, { color: disponible ? colors.green : colors.gray4 }]}>
              {disponible ? 'Disponible' : 'Indisponible'}
            </Text>
            <Switch
              value={disponible}
              onValueChange={toggleDispo}
              trackColor={{ true: colors.green, false: colors.gray2 }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* KYC Banner */}
        <View style={[s.kycBanner, { backgroundColor: kyc.bg }]}>
          <Text style={[s.kycText, { color: kyc.color }]}>{kyc.label}</Text>
          {!worker?.id_verified && (
            <TouchableOpacity onPress={() => navigation.navigate('ProfilTab', { screen: 'Profile' })}>
              <Text style={[s.kycLink, { color: kyc.color }]}>Compléter →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Missions', value: worker?.missions_completed || 0 },
            { label: 'Note moy.', value: worker?.rating_avg ? worker.rating_avg.toFixed(1) : '—' },
            { label: 'Gains', value: `${worker?.total_earned || 0} €` },
          ].map((stat) => (
            <View key={stat.label} style={s.stat}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Urgent missions */}
        {urgentMissions.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>🔥 Missions urgentes</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MissionsTab')}>
                <Text style={s.sectionLink}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            {urgentMissions.slice(0, 3).map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                onSelect={() => navigation.navigate('MissionDetail', { mission: m })}
                applying={applying[m.id]}
              />
            ))}
          </>
        )}

        {/* Recent missions */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Dernières missions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MissionsTab')}>
            <Text style={s.sectionLink}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {loading
          ? <Text style={s.loading}>Chargement...</Text>
          : missions.slice(0, 5).map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onSelect={() => navigation.navigate('MissionDetail', { mission: m })}
              applying={applying[m.id]}
            />
          ))
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 13, color: colors.gray4 },
  name: { fontSize: 20, fontWeight: '700', color: colors.black },
  dispoRow: { alignItems: 'flex-end', gap: 4 },
  dispoText: { fontSize: 12, fontWeight: '500' },
  kycBanner: { borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kycText: { fontSize: 13, fontWeight: '500' },
  kycLink: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.black },
  statLabel: { fontSize: 11, color: colors.gray4, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.black },
  sectionLink: { fontSize: 13, color: colors.brand, fontWeight: '500' },
  loading: { color: colors.gray4, textAlign: 'center', padding: 20 },
})
