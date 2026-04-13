import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { getCompanyInvoices } from '../../lib/supabase'
import { formatDate, formatAmount } from '../../lib/formatters'
import colors from '../../theme/colors'
import Badge from '../../components/Badge'

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', variant: 'gray' },
  pending: { label: 'En attente', variant: 'orange' },
  paid: { label: 'Payée', variant: 'green' },
}

export default function ContractsScreen() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await getCompanyInvoices(user.id)
      setInvoices(data || [])
      setLoading(false)
    }
    load()
  }, [user?.id])

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((acc, i) => acc + (i.amount_ttc || 0), 0)

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Contrats & Factures</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Total payé</Text>
            <Text style={s.summaryValue}>{formatAmount(totalPaid)}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>Factures</Text>
            <Text style={s.summaryValue}>{invoices.length}</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryLabel}>En attente</Text>
            <Text style={[s.summaryValue, { color: colors.brand }]}>
              {invoices.filter((i) => i.status === 'pending').length}
            </Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Toutes les factures</Text>
        {loading
          ? <Text style={s.empty}>Chargement...</Text>
          : invoices.length === 0
            ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>📄</Text>
                <Text style={s.emptyTitle}>Aucune facture</Text>
                <Text style={s.emptyDesc}>Vos factures apparaîtront ici après la signature des contrats.</Text>
              </View>
            )
            : invoices.map((inv) => {
              const mission = inv.contracts?.missions
              const worker = inv.contracts?.workers
              const config = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft
              const workerName = worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() : '—'
              return (
                <View key={inv.id} style={s.invoiceCard}>
                  <View style={s.invoiceHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.invoiceTitle} numberOfLines={1}>{mission?.title || 'Mission'}</Text>
                      <Text style={s.invoiceSub}>Travailleur : {workerName}</Text>
                      <Text style={s.invoiceDate}>{formatDate(inv.created_at)}</Text>
                    </View>
                    <Badge label={config.label} variant={config.variant} />
                  </View>

                  <View style={s.amounts}>
                    <View style={s.amountItem}>
                      <Text style={s.amountLabel}>HT</Text>
                      <Text style={s.amountValue}>{formatAmount(inv.amount_ht)}</Text>
                    </View>
                    <View style={s.amountItem}>
                      <Text style={s.amountLabel}>TVA 20%</Text>
                      <Text style={s.amountValue}>{formatAmount((inv.amount_ttc || 0) - (inv.amount_ht || 0))}</Text>
                    </View>
                    <View style={s.amountItem}>
                      <Text style={s.amountLabel}>TTC</Text>
                      <Text style={[s.amountValue, s.amountTotal]}>{formatAmount(inv.amount_ttc)}</Text>
                    </View>
                  </View>

                  {inv.total_hours && (
                    <Text style={s.hours}>{inv.total_hours}h · Commission plateforme : {formatAmount(inv.commission)}</Text>
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
  pageHeader: { padding: 16, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray2 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: colors.black },
  scroll: { padding: 16, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryLabel: { fontSize: 11, color: colors.gray4, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.black },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 12 },
  invoiceCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  invoiceHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  invoiceTitle: { fontSize: 14, fontWeight: '600', color: colors.black },
  invoiceSub: { fontSize: 12, color: colors.gray4, marginTop: 2 },
  invoiceDate: { fontSize: 11, color: colors.gray4, marginTop: 2 },
  amounts: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.gray1, borderRadius: 8, padding: 10 },
  amountItem: { alignItems: 'center' },
  amountLabel: { fontSize: 11, color: colors.gray4, marginBottom: 2 },
  amountValue: { fontSize: 14, fontWeight: '600', color: colors.black },
  amountTotal: { color: colors.brand },
  hours: { fontSize: 11, color: colors.gray4, marginTop: 8 },
  empty: { color: colors.gray4, textAlign: 'center', padding: 40 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.black, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: colors.gray4, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },
})
