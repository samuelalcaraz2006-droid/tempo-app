import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import colors from '../theme/colors'
import { formatDate, SECTOR_LABELS } from '../lib/formatters'
import Badge from './Badge'
import Button from './Button'

const URGENCY_LABEL = { immediate: 'Urgent', urgent: 'Urgent', normal: 'Normal' }
const URGENCY_VARIANT = { immediate: 'red', urgent: 'orange', normal: 'gray' }

export default function MissionCard({ mission, applied, saved, onApply, onToggleSave, onSelect, applying }) {
  const rate = mission.hourly_rate ? `${mission.hourly_rate} €/h` : '—'
  const hours = mission.total_hours ? `${mission.total_hours}h` : ''
  const sector = SECTOR_LABELS[mission.sector] || mission.sector || '—'
  const urgency = mission.urgency || 'normal'

  return (
    <TouchableOpacity style={s.card} onPress={onSelect} activeOpacity={0.92}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={2}>{mission.title}</Text>
          <Text style={s.company}>{mission.companies?.name || '—'} · {mission.city || '—'}</Text>
        </View>
        <TouchableOpacity onPress={() => onToggleSave?.(mission.id)} style={s.saveBtn}>
          <Text style={{ fontSize: 20 }}>{saved ? '🔖' : '📌'}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.chips}>
        <Badge label={sector} variant="blue" />
        <Badge label={URGENCY_LABEL[urgency]} variant={URGENCY_VARIANT[urgency]} />
        {mission.companies?.rating_avg > 0 && (
          <Badge label={`★ ${mission.companies.rating_avg.toFixed(1)}`} variant="gray" />
        )}
      </View>

      <View style={s.meta}>
        <Text style={s.metaText}>💰 {rate}</Text>
        {hours && <Text style={s.metaText}>⏱ {hours}</Text>}
        <Text style={s.metaText}>📅 {formatDate(mission.start_date)}</Text>
      </View>

      <View style={s.footer}>
        {applied ? (
          <View style={s.appliedBadge}>
            <Text style={s.appliedText}>✓ Candidature envoyée</Text>
          </View>
        ) : (
          <Button
            title={applying ? 'Envoi...' : 'Postuler'}
            onPress={() => onApply?.(mission)}
            loading={applying}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 2 },
  company: { fontSize: 12, color: colors.gray4 },
  saveBtn: { paddingLeft: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  meta: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metaText: { fontSize: 12, color: colors.gray6 },
  footer: { flexDirection: 'row' },
  appliedBadge: { flex: 1, backgroundColor: colors.greenLight, borderRadius: 8, padding: 10, alignItems: 'center' },
  appliedText: { color: colors.greenDark, fontSize: 13, fontWeight: '600' },
})
