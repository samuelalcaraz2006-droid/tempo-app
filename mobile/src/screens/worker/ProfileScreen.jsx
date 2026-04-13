import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import { useAuth } from '../../contexts/AuthContext'
import { updateWorkerProfile, supabase, submitKycDocuments } from '../../lib/supabase'
import colors from '../../theme/colors'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import Toast, { useToast } from '../../components/Toast'

const SKILLS_OPTIONS = ['Manutention', 'Conduite', 'Nettoyage', 'Soudure', 'Cariste', 'Électricité', 'Plomberie', 'Peinture', 'Informatique', 'Cuisine']

const KYC_DOCS = [
  { key: 'id', field: 'id_doc_url', verifiedField: 'id_verified', label: "Pièce d'identité" },
  { key: 'siret', field: 'siret_doc_url', verifiedField: 'siret_verified', label: 'Justificatif SIRET' },
  { key: 'rcpro', field: 'rc_pro_url', verifiedField: 'rc_pro_verified', label: 'RC Professionnelle' },
]

export default function ProfileScreen({ navigation }) {
  const { user, profile, roleData, refreshRoleData, logout } = useAuth()
  const worker = roleData
  const { toast, showToast, hideToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    city: '',
    siret: '',
    radius_km: 10,
    skills: [],
  })

  useEffect(() => {
    if (worker) {
      setForm({
        first_name: worker.first_name || '',
        last_name: worker.last_name || '',
        city: worker.city || '',
        siret: worker.siret || '',
        radius_km: worker.radius_km || 10,
        skills: worker.skills || [],
      })
    }
  }, [worker?.id])

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  const toggleSkill = (sk) => {
    const skills = form.skills.includes(sk)
      ? form.skills.filter((s) => s !== sk)
      : [...form.skills, sk]
    setF('skills', skills)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updateWorkerProfile(user.id, form)
    if (error) showToast('Erreur lors de la sauvegarde', 'error')
    else { showToast('Profil mis à jour', 'success'); await refreshRoleData() }
    setSaving(false)
  }

  const handleKycUpload = async (doc) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      })
      if (result.canceled) return
      const file = result.assets[0]
      if (file.size > 10 * 1024 * 1024) { showToast('Fichier trop volumineux (max 10 Mo)', 'error'); return }

      setUploading((u) => ({ ...u, [doc.key]: true }))
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${doc.key}/${Date.now()}.${ext}`

      const response = await fetch(file.uri)
      const blob = await response.blob()

      const { error: upErr } = await supabase.storage.from('kyc-documents').upload(path, blob, { upsert: true })
      if (upErr) { showToast('Erreur upload', 'error'); setUploading((u) => ({ ...u, [doc.key]: false })); return }

      const { data: signed } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
      const url = signed?.signedUrl
      if (!url) { showToast('Erreur URL', 'error'); setUploading((u) => ({ ...u, [doc.key]: false })); return }

      const { error: saveErr } = await submitKycDocuments(user.id, { [doc.field]: url })
      if (saveErr) showToast('Erreur sauvegarde', 'error')
      else { showToast(`${doc.label} déposé !`, 'success'); await refreshRoleData() }
      setUploading((u) => ({ ...u, [doc.key]: false }))
    } catch (e) {
      showToast('Erreur lors de la sélection', 'error')
      setUploading((u) => ({ ...u, [doc.key]: false }))
    }
  }

  const initials = worker?.first_name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'
  const displayName = worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || profile?.email : profile?.email

  const badges = []
  if (worker?.missions_completed >= 1) badges.push({ icon: '🎯', label: '1ère mission' })
  if (worker?.missions_completed >= 5) badges.push({ icon: '⭐', label: 'Confirmé' })
  if (worker?.missions_completed >= 20) badges.push({ icon: '🏆', label: 'Expert' })
  if (worker?.rating_avg >= 4.5) badges.push({ icon: '💎', label: 'Top performer' })
  if (worker?.siret_verified) badges.push({ icon: '✓', label: 'SIRET vérifié' })
  if (worker?.id_verified) badges.push({ icon: '🪪', label: 'Identité validée' })

  return (
    <SafeAreaView style={s.safe}>
      <Toast {...toast} onHide={hideToast} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.displayName}>{displayName}</Text>
          <Text style={s.email}>{profile?.email}</Text>
          {worker?.rating_avg > 0 && (
            <Text style={s.rating}>★ {worker.rating_avg.toFixed(1)} · {worker.rating_count} avis</Text>
          )}
        </View>

        {/* Badges */}
        {badges.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Badges</Text>
            <View style={s.badgeRow}>
              {badges.map((b) => (
                <View key={b.label} style={s.badgeItem}>
                  <Text style={s.badgeIcon}>{b.icon}</Text>
                  <Text style={s.badgeLabel}>{b.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Edit form */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations personnelles</Text>
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="Prénom" placeholderTextColor={colors.gray4} value={form.first_name} onChangeText={(v) => setF('first_name', v)} />
            <TextInput style={[s.input, { flex: 1 }]} placeholder="Nom" placeholderTextColor={colors.gray4} value={form.last_name} onChangeText={(v) => setF('last_name', v)} />
          </View>
          <TextInput style={s.input} placeholder="Ville" placeholderTextColor={colors.gray4} value={form.city} onChangeText={(v) => setF('city', v)} />
          <TextInput style={s.input} placeholder="SIRET" placeholderTextColor={colors.gray4} value={form.siret} onChangeText={(v) => setF('siret', v)} keyboardType="numeric" />
        </View>

        {/* Skills */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Compétences</Text>
          <View style={s.skillsGrid}>
            {SKILLS_OPTIONS.map((sk) => (
              <TouchableOpacity key={sk} onPress={() => toggleSkill(sk)} style={[s.skillChip, form.skills.includes(sk) && s.skillChipActive]}>
                <Text style={[s.skillText, form.skills.includes(sk) && s.skillTextActive]}>{sk}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button title="Sauvegarder le profil" onPress={handleSave} loading={saving} style={{ marginBottom: 24 }} />

        {/* KYC */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Documents KYC</Text>
          {worker?.kyc_rejection_reason && (
            <View style={s.rejectionBanner}>
              <Text style={s.rejectionText}>Refusé : {worker.kyc_rejection_reason}</Text>
            </View>
          )}
          {KYC_DOCS.map((doc) => {
            const verified = worker?.[doc.verifiedField]
            const hasDoc = !!worker?.[doc.field]
            return (
              <View key={doc.key} style={s.kycDoc}>
                <View style={{ flex: 1 }}>
                  <Text style={s.kycLabel}>{doc.label}</Text>
                  <Badge
                    label={verified ? '✓ Vérifié' : hasDoc ? 'En cours' : 'À déposer'}
                    variant={verified ? 'green' : hasDoc ? 'blue' : 'orange'}
                  />
                </View>
                {!verified && (
                  <Button
                    title={uploading[doc.key] ? 'Upload...' : hasDoc ? 'Remplacer' : 'Déposer'}
                    onPress={() => handleKycUpload(doc)}
                    variant="secondary"
                    loading={uploading[doc.key]}
                    style={{ marginLeft: 12 }}
                  />
                )}
              </View>
            )
          })}
        </View>

        {/* Nav links */}
        <View style={s.section}>
          <TouchableOpacity style={s.navLink} onPress={() => navigation.navigate('Notifications')}>
            <Text style={s.navLinkText}>🔔 Notifications</Text>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navLink} onPress={() => navigation.navigate('Messages')}>
            <Text style={s.navLinkText}>💬 Messages</Text>
            <Text style={s.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity onPress={() => Alert.alert('Déconnexion', 'Confirmer ?', [{ text: 'Annuler' }, { text: 'Déconnexion', style: 'destructive', onPress: logout }])} style={s.logoutBtn}>
          <Text style={s.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  scroll: { padding: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  displayName: { fontSize: 20, fontWeight: '700', color: colors.black },
  email: { fontSize: 13, color: colors.gray4, marginTop: 2 },
  rating: { fontSize: 13, color: colors.brand, marginTop: 4 },
  section: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeItem: { alignItems: 'center', minWidth: 60 },
  badgeIcon: { fontSize: 24, marginBottom: 4 },
  badgeLabel: { fontSize: 10, color: colors.gray6, textAlign: 'center' },
  row: { flexDirection: 'row', marginBottom: 0 },
  input: { backgroundColor: colors.gray1, borderWidth: 1, borderColor: colors.gray2, borderRadius: 10, padding: 12, color: colors.black, fontSize: 14, marginBottom: 10 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.gray1, borderWidth: 1, borderColor: colors.gray2 },
  skillChipActive: { backgroundColor: colors.brandLight, borderColor: colors.brand },
  skillText: { fontSize: 13, color: colors.gray6 },
  skillTextActive: { color: colors.brand, fontWeight: '600' },
  kycDoc: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray1 },
  kycLabel: { fontSize: 13, fontWeight: '500', color: colors.gray6, marginBottom: 4 },
  rejectionBanner: { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 12 },
  rejectionText: { color: colors.red, fontSize: 13 },
  navLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray1 },
  navLinkText: { fontSize: 14, color: colors.black },
  navArrow: { fontSize: 18, color: colors.gray4 },
  logoutBtn: { alignItems: 'center', padding: 16 },
  logoutText: { color: colors.gray4, fontSize: 14 },
})
