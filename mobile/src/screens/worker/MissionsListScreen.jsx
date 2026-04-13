import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getMissions, applyToMission, getWorkerApplications } from '../../lib/supabase'
import colors from '../../theme/colors'
import MissionCard from '../../components/MissionCard'
import Badge from '../../components/Badge'
import Toast, { useToast } from '../../components/Toast'

const SECTORS = ['tous', 'logistique', 'btp', 'industrie', 'hotellerie', 'proprete']
const SECTOR_LABELS = { tous: 'Tous', logistique: 'Logistique', btp: 'BTP', industrie: 'Industrie', hotellerie: 'Hôtellerie', proprete: 'Propreté' }
const URGENCIES = ['tous', 'immediate', 'urgent', 'normal']
const URGENCY_LABELS = { tous: 'Tous', immediate: 'Immédiat', urgent: 'Urgent', normal: 'Normal' }

export default function MissionsListScreen({ navigation }) {
  const { user } = useAuth()
  const { toast, showToast, hideToast } = useToast()
  const [missions, setMissions] = useState([])
  const [applications, setApplications] = useState([])
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('tous')
  const [urgency, setUrgency] = useState('tous')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState({})
  const [savedMissions, setSavedMissions] = useState([])

  useEffect(() => {
    const load = async () => {
      const [{ data: m }, { data: a }] = await Promise.all([
        getMissions({ status: 'open', limit: 50 }),
        user ? getWorkerApplications(user.id) : Promise.resolve({ data: [] }),
      ])
      setMissions(m || [])
      setApplications(a || [])
      setLoading(false)
    }
    load()
  }, [user?.id])

  const hasApplied = (id) => applications.some((a) => a.mission_id === id)
  const toggleSave = (id) => setSavedMissions((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleApply = async (mission) => {
    if (!user) return
    setApplying((prev) => ({ ...prev, [mission.id]: true }))
    const { error } = await applyToMission({ missionId: mission.id, workerId: user.id })
    if (error) showToast('Erreur lors de la candidature', 'error')
    else {
      showToast('Candidature envoyée !', 'success')
      setApplications((prev) => [...prev, { mission_id: mission.id }])
    }
    setApplying((prev) => ({ ...prev, [mission.id]: false }))
  }

  const filtered = missions.filter((m) => {
    if (sector !== 'tous' && m.sector !== sector) return false
    if (urgency !== 'tous' && m.urgency !== urgency) return false
    if (search) {
      const q = search.toLowerCase()
      return m.title?.toLowerCase().includes(q) || m.city?.toLowerCase().includes(q) || m.companies?.name?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <SafeAreaView style={s.safe}>
      <Toast {...toast} onHide={hideToast} />
      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          placeholder="Chercher une mission, ville, entreprise..."
          placeholderTextColor={colors.gray4}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Sector filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}>
        {SECTORS.map((s_) => (
          <TouchableOpacity key={s_} onPress={() => setSector(s_)}>
            <Badge label={SECTOR_LABELS[s_]} variant={sector === s_ ? 'orange' : 'gray'} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Urgency filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 8 }}>
        {URGENCIES.map((u) => (
          <TouchableOpacity key={u} onPress={() => setUrgency(u)}>
            <Badge label={URGENCY_LABELS[u]} variant={urgency === u ? 'orange' : 'gray'} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={s.count}>
        <Text style={s.countText}>{filtered.length} mission{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : filtered.length === 0
            ? <Text style={s.empty}>Aucune mission trouvée</Text>
            : filtered.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                applied={hasApplied(m.id)}
                saved={savedMissions.includes(m.id)}
                applying={applying[m.id]}
                onApply={() => handleApply(m)}
                onToggleSave={toggleSave}
                onSelect={() => navigation.navigate('MissionDetail', { mission: m })}
              />
            ))
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  searchWrap: { padding: 16, paddingBottom: 0 },
  search: { backgroundColor: colors.white, borderRadius: 10, padding: 12, fontSize: 14, color: colors.black, borderWidth: 1, borderColor: colors.gray2 },
  filterBar: { flexGrow: 0 },
  count: { paddingHorizontal: 16, paddingBottom: 8 },
  countText: { fontSize: 12, color: colors.gray4 },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.gray4, padding: 40 },
})
