import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getMissionApplications, updateApplicationStatus } from '../../lib/supabase'
import colors from '../../theme/colors'
import Badge from '../../components/Badge'
import Button from '../../components/Button'

export default function CandidatesScreen({ route, navigation }) {
  const { missionId, missionTitle } = route.params || {}
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})

  const load = async () => {
    if (!missionId) return
    const { data } = await getMissionApplications(missionId)
    setCandidates(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [missionId])

  const handleDecision = async (appId, status) => {
    setActionLoading((prev) => ({ ...prev, [appId]: status }))
    const { error } = await updateApplicationStatus(appId, status)
    if (error) Alert.alert('Erreur', error.message)
    else load()
    setActionLoading((prev) => ({ ...prev, [appId]: null }))
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>Candidatures</Text>
          <Text style={s.subtitle} numberOfLines={1}>{missionTitle || '—'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : candidates.length === 0
            ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>👥</Text>
                <Text style={s.emptyTitle}>Aucune candidature</Text>
                <Text style={s.emptyDesc}>Les candidatures apparaîtront ici dès qu'un travailleur postulera.</Text>
              </View>
            )
            : candidates.map((cand) => {
              const w = cand.workers
              const fullName = w ? `${w.first_name || ''} ${w.last_name || ''}`.trim() : '—'
              const isAccepted = cand.status === 'accepted'
              const isRejected = cand.status === 'rejected'
              return (
                <View key={cand.id} style={s.candidateCard}>
                  <View style={s.cardHeader}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{fullName?.[0] || '?'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.candidateName}>{fullName}</Text>
                      <Text style={s.candidateCity}>{w?.city || '—'}</Text>
                      {w?.rating_avg > 0 && (
                        <Text style={s.candidateRating}>★ {w.rating_avg.toFixed(1)} ({w.rating_count} avis)</Text>
                      )}
                    </View>
                    {cand.match_score && (
                      <View style={s.scoreBadge}>
                        <Text style={s.scoreText}>{Math.round(cand.match_score)}%</Text>
                        <Text style={s.scoreLabel}>match</Text>
                      </View>
                    )}
                  </View>

                  {/* Skills */}
                  {w?.skills?.length > 0 && (
                    <View style={s.skillsRow}>
                      {w.skills.slice(0, 4).map((sk) => <Badge key={sk} label={sk} variant="gray" style={{ marginRight: 4, marginBottom: 4 }} />)}
                    </View>
                  )}

                  {/* Status */}
                  {isAccepted && <View style={s.acceptedBanner}><Text style={s.acceptedText}>✓ Candidature acceptée</Text></View>}
                  {isRejected && <View style={s.rejectedBanner}><Text style={s.rejectedText}>✕ Candidature refusée</Text></View>}

                  {/* Actions */}
                  {!isAccepted && !isRejected && (
                    <View style={s.actions}>
                      <Button
                        title={actionLoading[cand.id] === 'rejected' ? '...' : 'Refuser'}
                        variant="secondary"
                        onPress={() => handleDecision(cand.id, 'rejected')}
                        loading={actionLoading[cand.id] === 'rejected'}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={actionLoading[cand.id] === 'accepted' ? '...' : 'Accepter'}
                        onPress={() => handleDecision(cand.id, 'accepted')}
                        loading={actionLoading[cand.id] === 'accepted'}
                        style={{ flex: 1, marginLeft: 8 }}
                      />
                    </View>
                  )}
                </View>
              )
            })
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray2 },
  back: { color: colors.gray4, fontSize: 15 },
  title: { fontSize: 17, fontWeight: '700', color: colors.black },
  subtitle: { fontSize: 12, color: colors.gray4, marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  candidateCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  candidateName: { fontSize: 15, fontWeight: '600', color: colors.black },
  candidateCity: { fontSize: 12, color: colors.gray4, marginTop: 2 },
  candidateRating: { fontSize: 12, color: colors.brand, marginTop: 2 },
  scoreBadge: { backgroundColor: colors.brandLight, borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 50 },
  scoreText: { fontSize: 16, fontWeight: '700', color: colors.brand },
  scoreLabel: { fontSize: 10, color: colors.brand },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  acceptedBanner: { backgroundColor: colors.greenLight, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 4 },
  acceptedText: { color: colors.greenDark, fontSize: 13, fontWeight: '600' },
  rejectedBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 4 },
  rejectedText: { color: colors.red, fontSize: 13, fontWeight: '600' },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.gray4, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
})
