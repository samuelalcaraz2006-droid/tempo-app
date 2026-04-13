import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { applyToMission, getWorkerApplications } from '../../lib/supabase'
import { formatDate, SECTOR_LABELS } from '../../lib/formatters'
import colors from '../../theme/colors'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import Toast, { useToast } from '../../components/Toast'

export default function MissionDetailScreen({ route, navigation }) {
  const { mission } = route.params
  const { user } = useAuth()
  const { toast, showToast, hideToast } = useToast()
  const [applied, setApplied] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    const check = async () => {
      if (!user) return
      const { data } = await getWorkerApplications(user.id)
      setApplied((data || []).some((a) => a.mission_id === mission.id))
    }
    check()
  }, [user?.id, mission.id])

  const handleApply = async () => {
    if (!user) return
    setApplying(true)
    const { error } = await applyToMission({ missionId: mission.id, workerId: user.id })
    if (error) showToast('Erreur lors de la candidature', 'error')
    else { showToast('Candidature envoyée !', 'success'); setApplied(true) }
    setApplying(false)
  }

  const rate = mission.hourly_rate ? `${mission.hourly_rate} €/h` : '—'
  const total = mission.hourly_rate && mission.total_hours ? `${(mission.hourly_rate * mission.total_hours).toFixed(0)} €` : '—'

  return (
    <SafeAreaView style={s.safe}>
      <Toast {...toast} onHide={hideToast} />
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>‹ Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={s.title}>{mission.title}</Text>
        <Text style={s.company}>{mission.companies?.name || '—'} · {mission.city || '—'}</Text>

        {/* Chips */}
        <View style={s.chips}>
          <Badge label={SECTOR_LABELS[mission.sector] || mission.sector || '—'} variant="blue" />
          {mission.urgency === 'immediate' && <Badge label="Urgent" variant="red" />}
          {mission.urgency === 'urgent' && <Badge label="Urgent" variant="orange" />}
        </View>

        {/* Key metrics */}
        <View style={s.metricsRow}>
          {[
            { icon: '💰', label: 'Taux horaire', value: rate },
            { icon: '⏱', label: 'Durée', value: mission.total_hours ? `${mission.total_hours}h` : '—' },
            { icon: '💵', label: 'Total estimé', value: total },
            { icon: '📅', label: 'Date début', value: formatDate(mission.start_date) },
          ].map((item) => (
            <View key={item.label} style={s.metric}>
              <Text style={s.metricIcon}>{item.icon}</Text>
              <Text style={s.metricValue}>{item.value}</Text>
              <Text style={s.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        {mission.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Description</Text>
            <Text style={s.description}>{mission.description}</Text>
          </View>
        )}

        {/* Required skills */}
        {mission.required_skills?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Compétences requises</Text>
            <View style={s.chips}>
              {mission.required_skills.map((sk) => <Badge key={sk} label={sk} variant="gray" />)}
            </View>
          </View>
        )}

        {/* Company info */}
        {mission.companies && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>À propos de l'entreprise</Text>
            <View style={s.companyCard}>
              <Text style={s.companyName}>{mission.companies.name}</Text>
              <Text style={s.companyCity}>{mission.companies.city || '—'}</Text>
              {mission.companies.rating_avg > 0 && (
                <Text style={s.companyRating}>★ {mission.companies.rating_avg.toFixed(1)} ({mission.companies.rating_count} avis)</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Apply button */}
      <View style={s.footer}>
        {applied ? (
          <View style={s.appliedBanner}>
            <Text style={s.appliedText}>✓ Candidature envoyée</Text>
          </View>
        ) : (
          <Button title="Postuler à cette mission" onPress={handleApply} loading={applying} style={{ flex: 1 }} />
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  navBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  back: { paddingVertical: 8 },
  backText: { color: colors.gray4, fontSize: 15 },
  scroll: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 22, fontWeight: '700', color: colors.black, marginBottom: 4 },
  company: { fontSize: 14, color: colors.gray4, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  metric: { width: '47%', backgroundColor: colors.gray1, borderRadius: 12, padding: 12, alignItems: 'center' },
  metricIcon: { fontSize: 22, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '700', color: colors.black },
  metricLabel: { fontSize: 11, color: colors.gray4, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 8 },
  description: { fontSize: 14, color: colors.gray6, lineHeight: 22 },
  companyCard: { backgroundColor: colors.gray1, borderRadius: 12, padding: 14 },
  companyName: { fontSize: 15, fontWeight: '600', color: colors.black },
  companyCity: { fontSize: 13, color: colors.gray4, marginTop: 2 },
  companyRating: { fontSize: 13, color: colors.brand, marginTop: 4 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.gray2 },
  appliedBanner: { backgroundColor: colors.greenLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  appliedText: { color: colors.greenDark, fontSize: 15, fontWeight: '600' },
})
