import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { createMission } from '../../lib/supabase'
import colors from '../../theme/colors'
import Button from '../../components/Button'
import Badge from '../../components/Badge'

const SECTORS = ['logistique', 'btp', 'industrie', 'hotellerie', 'proprete']
const SECTOR_LABELS = { logistique: 'Logistique', btp: 'BTP', industrie: 'Industrie', hotellerie: 'Hôtellerie', proprete: 'Propreté' }
const URGENCIES = ['normal', 'urgent', 'immediate']
const URGENCY_LABELS = { normal: 'Normal', urgent: 'Urgent', immediate: 'Immédiat' }
const SKILLS_OPTIONS = ['Manutention', 'Conduite', 'Nettoyage', 'Soudure', 'Cariste', 'Électricité', 'Plomberie', 'Peinture']

const EMPTY = { title: '', sector: 'logistique', hourly_rate: '', total_hours: '', start_date: '', city: '', address: '', description: '', required_skills: [], urgency: 'normal' }

export default function PublishMissionScreen() {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const toggleSkill = (sk) => {
    const skills = form.required_skills.includes(sk)
      ? form.required_skills.filter((s) => s !== sk)
      : [...form.required_skills, sk]
    setF('required_skills', skills)
  }

  const handlePublish = async () => {
    if (!form.title) return Alert.alert('Erreur', 'Le titre est requis')
    if (!form.hourly_rate) return Alert.alert('Erreur', 'Le taux horaire est requis')
    if (!form.total_hours) return Alert.alert('Erreur', 'La durée est requise')
    if (!form.start_date) return Alert.alert('Erreur', 'La date de début est requise')
    if (!form.city) return Alert.alert('Erreur', 'La ville est requise')

    setPublishing(true)
    const payload = {
      ...form,
      company_id: user.id,
      hourly_rate: parseFloat(form.hourly_rate),
      total_hours: parseFloat(form.total_hours),
    }
    const { error } = await createMission(payload)
    setPublishing(false)
    if (error) Alert.alert('Erreur', error.message || 'Impossible de publier la mission')
    else {
      setPublished(true)
      setForm(EMPTY)
      setTimeout(() => setPublished(false), 4000)
    }
  }

  if (published) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successState}>
          <Text style={s.successIcon}>🎉</Text>
          <Text style={s.successTitle}>Mission publiée !</Text>
          <Text style={s.successDesc}>Votre mission est maintenant visible par les travailleurs disponibles.</Text>
          <Button title="Publier une autre mission" onPress={() => setPublished(false)} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Publier une mission</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={s.section}>
          <Text style={s.label}>Titre de la mission *</Text>
          <TextInput style={s.input} placeholder="Ex: Cariste nuit weekend" placeholderTextColor={colors.gray4} value={form.title} onChangeText={(v) => setF('title', v)} />
        </View>

        {/* Sector */}
        <View style={s.section}>
          <Text style={s.label}>Secteur</Text>
          <View style={s.chips}>
            {SECTORS.map((sec) => (
              <TouchableOpacity key={sec} onPress={() => setF('sector', sec)}>
                <Badge label={SECTOR_LABELS[sec]} variant={form.sector === sec ? 'orange' : 'gray'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rate + Hours */}
        <View style={s.section}>
          <View style={s.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.label}>Taux horaire (€/h) *</Text>
              <TextInput style={s.input} placeholder="Ex: 14.50" placeholderTextColor={colors.gray4} value={form.hourly_rate} onChangeText={(v) => setF('hourly_rate', v)} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>Durée totale (h) *</Text>
              <TextInput style={s.input} placeholder="Ex: 35" placeholderTextColor={colors.gray4} value={form.total_hours} onChangeText={(v) => setF('total_hours', v)} keyboardType="decimal-pad" />
            </View>
          </View>
        </View>

        {/* Date + City */}
        <View style={s.section}>
          <Text style={s.label}>Date de début *</Text>
          <TextInput style={s.input} placeholder="YYYY-MM-DD (ex: 2025-08-01)" placeholderTextColor={colors.gray4} value={form.start_date} onChangeText={(v) => setF('start_date', v)} />
          <Text style={s.label}>Ville *</Text>
          <TextInput style={s.input} placeholder="Paris, Lyon, Marseille..." placeholderTextColor={colors.gray4} value={form.city} onChangeText={(v) => setF('city', v)} />
          <Text style={s.label}>Adresse (optionnel)</Text>
          <TextInput style={s.input} placeholder="Rue, code postal..." placeholderTextColor={colors.gray4} value={form.address} onChangeText={(v) => setF('address', v)} />
        </View>

        {/* Urgency */}
        <View style={s.section}>
          <Text style={s.label}>Urgence</Text>
          <View style={s.chips}>
            {URGENCIES.map((u) => (
              <TouchableOpacity key={u} onPress={() => setF('urgency', u)}>
                <Badge label={URGENCY_LABELS[u]} variant={form.urgency === u ? 'orange' : 'gray'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={s.section}>
          <Text style={s.label}>Description (optionnel)</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Détails de la mission, conditions, équipement..."
            placeholderTextColor={colors.gray4}
            value={form.description}
            onChangeText={(v) => setF('description', v)}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Required skills */}
        <View style={s.section}>
          <Text style={s.label}>Compétences requises (optionnel)</Text>
          <View style={s.chips}>
            {SKILLS_OPTIONS.map((sk) => (
              <TouchableOpacity key={sk} onPress={() => toggleSkill(sk)}>
                <Badge label={sk} variant={form.required_skills.includes(sk) ? 'blue' : 'gray'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        {form.hourly_rate && form.total_hours && (
          <View style={s.summary}>
            <Text style={s.summaryText}>
              Coût estimé : {(parseFloat(form.hourly_rate || 0) * parseFloat(form.total_hours || 0) * 1.2).toFixed(0)} € TTC
            </Text>
          </View>
        )}

        <Button title="Publier la mission" onPress={handlePublish} loading={publishing} style={{ marginBottom: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  pageHeader: { padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray2 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.black },
  scroll: { padding: 16 },
  section: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray6, marginBottom: 8 },
  input: { backgroundColor: colors.gray1, borderWidth: 1, borderColor: colors.gray2, borderRadius: 10, padding: 12, color: colors.black, fontSize: 14, marginBottom: 10 },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { backgroundColor: colors.brandLight, borderRadius: 10, padding: 14, marginBottom: 16, alignItems: 'center' },
  summaryText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  successState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.black, marginBottom: 8 },
  successDesc: { fontSize: 15, color: colors.gray4, textAlign: 'center', lineHeight: 22 },
})
