import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getCompanyMissions, getCompanyInvoices } from '../../lib/supabase'
import { formatAmount, SECTOR_LABELS } from '../../lib/formatters'
import colors from '../../theme/colors'

export default function StatsScreen() {
  const { user, roleData } = useAuth()
  const company = roleData
  const [missions, setMissions] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const [{ data: m }, { data: i }] = await Promise.all([
        getCompanyMissions(user.id),
        getCompanyInvoices(user.id),
      ])
      setMissions(m || [])
      setInvoices(i || [])
      setLoading(false)
    }
    load()
  }, [user?.id])

  const totalSpent = invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + (i.amount_ttc || 0), 0)
  const totalPending = invoices.filter((i) => i.status !== 'paid').reduce((acc, i) => acc + (i.amount_ttc || 0), 0)
  const openMissions = missions.filter((m) => m.status === 'open').length
  const completedMissions = missions.filter((m) => m.status === 'completed').length

  // Sector breakdown
  const sectorCounts = missions.reduce((acc, m) => { acc[m.sector] = (acc[m.sector] || 0) + 1; return acc }, {})
  const sectorEntries = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Statistiques</Text>
        {company?.name && <Text style={s.companyName}>{company.name}</Text>}
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : (
            <>
              {/* Main stats */}
              <View style={s.statsGrid}>
                {[
                  { icon: '📋', label: 'Total missions', value: missions.length },
                  { icon: '✅', label: 'Terminées', value: completedMissions },
                  { icon: '🔓', label: 'En cours', value: openMissions },
                  { icon: '👥', label: 'Note moy.', value: company?.rating_avg ? company.rating_avg.toFixed(1) : '—' },
                ].map((stat) => (
                  <View key={stat.label} style={s.statCard}>
                    <Text style={s.statIcon}>{stat.icon}</Text>
                    <Text style={s.statValue}>{stat.value}</Text>
                    <Text style={s.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              {/* Financial */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Financier</Text>
                <View style={s.finRow}>
                  <View style={s.finCard}>
                    <Text style={s.finLabel}>Total dépensé</Text>
                    <Text style={s.finValue}>{formatAmount(totalSpent)}</Text>
                  </View>
                  <View style={[s.finCard, { borderLeftWidth: 1, borderLeftColor: colors.gray2 }]}>
                    <Text style={s.finLabel}>En attente</Text>
                    <Text style={[s.finValue, { color: colors.brand }]}>{formatAmount(totalPending)}</Text>
                  </View>
                </View>
              </View>

              {/* Sector breakdown */}
              {sectorEntries.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Missions par secteur</Text>
                  {sectorEntries.map(([sector, count]) => (
                    <View key={sector} style={s.sectorRow}>
                      <Text style={s.sectorLabel}>{SECTOR_LABELS[sector] || sector}</Text>
                      <View style={s.sectorBar}>
                        <View style={[s.sectorFill, { flex: count / missions.length }]} />
                        <View style={[s.sectorEmpty, { flex: 1 - count / missions.length }]} />
                      </View>
                      <Text style={s.sectorCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Invoices count */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Factures</Text>
                <View style={s.invoiceStats}>
                  {[
                    { label: 'Payées', count: invoices.filter((i) => i.status === 'paid').length, color: colors.green },
                    { label: 'En attente', count: invoices.filter((i) => i.status === 'pending').length, color: colors.brand },
                    { label: 'Brouillon', count: invoices.filter((i) => i.status === 'draft').length, color: colors.gray4 },
                  ].map((item) => (
                    <View key={item.label} style={s.invoiceStat}>
                      <Text style={[s.invoiceCount, { color: item.color }]}>{item.count}</Text>
                      <Text style={s.invoiceLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )
        }
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray1 },
  pageHeader: { padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray2 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.black },
  companyName: { fontSize: 13, color: colors.gray4, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: colors.white, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statIcon: { fontSize: 26, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.black },
  statLabel: { fontSize: 11, color: colors.gray4, marginTop: 2, textAlign: 'center' },
  section: { backgroundColor: colors.white, borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 12 },
  finRow: { flexDirection: 'row' },
  finCard: { flex: 1, alignItems: 'center', padding: 8 },
  finLabel: { fontSize: 12, color: colors.gray4, marginBottom: 4 },
  finValue: { fontSize: 22, fontWeight: '700', color: colors.black },
  sectorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  sectorLabel: { width: 90, fontSize: 13, color: colors.gray6 },
  sectorBar: { flex: 1, flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  sectorFill: { backgroundColor: colors.brand },
  sectorEmpty: { backgroundColor: colors.gray2 },
  sectorCount: { width: 24, fontSize: 13, fontWeight: '600', color: colors.gray6, textAlign: 'right' },
  invoiceStats: { flexDirection: 'row', justifyContent: 'space-around' },
  invoiceStat: { alignItems: 'center' },
  invoiceCount: { fontSize: 28, fontWeight: '700' },
  invoiceLabel: { fontSize: 12, color: colors.gray4, marginTop: 4 },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
})
