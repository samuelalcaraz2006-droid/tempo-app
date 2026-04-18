import React from 'react'
import { Download } from 'lucide-react'
import { SECTOR_LABELS } from '../../lib/formatters'

const SECTORS = ['logistique', 'btp', 'industrie', 'hotellerie', 'proprete']

const STATUS_STYLES = {
  draft:     ['badge-gray', 'Brouillon'],
  open:      ['badge-blue', 'Publiée'],
  matched:   ['badge-orange', 'Matchée'],
  active:    ['badge-orange', 'En cours'],
  completed: ['badge-green', 'Terminée'],
  cancelled: ['badge-gray', 'Annulée'],
}

export default function CompanyStats({
  missions,
  invoices,
  company,
  onExportMissions,
  onExportInvoices,
}) {
  const completedMissions = missions.filter(m => m.status === 'completed')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>Statistiques</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          Vue <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>d'ensemble</span>.
        </div>
        <div style={{ fontSize: 14, color: 'var(--g5)', marginTop: 8 }}>Toute votre activité en chiffres.</div>
      </div>

      <div className="grid-4-mobile-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          [missions.length, 'Missions publiées'],
          [completedMissions.length, 'Missions terminées'],
          [missions.length > 0 ? `${Math.round((completedMissions.length / missions.length) * 100)}%` : '—', 'Taux de complétion'],
          [company?.rating_avg ? parseFloat(company.rating_avg).toFixed(1) + '/5' : '—', 'Note moyenne'],
        ].map(([v, l]) => (
          <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value">{v}</div></div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Spending over time */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Dépenses mensuelles</div>
          {(() => {
            const months = {}
            invoices.forEach(inv => {
              const d = new Date(inv.created_at)
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
              months[key] = (months[key] || 0) + parseFloat(inv.amount_ttc || 0)
            })
            const entries = Object.entries(months).sort().slice(-6)
            const max = Math.max(...entries.map(e => e[1]), 1)
            return entries.length === 0
              ? <div style={{ fontSize: 12, color: 'var(--g4)', textAlign: 'center', padding: 20 }}>Pas encore de données</div>
              : <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                  {entries.map(([month, total]) => (
                    <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--g6)' }}>{Math.round(total)}€</div>
                      <div style={{ width: '100%', background: 'var(--or)', borderRadius: 4, height: Math.max(4, (total / max) * 80), transition: 'height .3s' }}></div>
                      <div style={{ fontSize: 10, color: 'var(--g4)' }}>{month.split('-')[1]}/{month.split('-')[0].slice(2)}</div>
                    </div>
                  ))}
                </div>
          })()}
        </div>

        {/* Missions by status */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Missions par statut</div>
          {['open', 'matched', 'active', 'completed', 'cancelled'].map(status => {
            const count = missions.filter(m => m.status === status).length
            const pct = missions.length > 0 ? (count / missions.length) * 100 : 0
            return (
              <div key={status} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--g6)' }}>{STATUS_STYLES[status]?.[1] || status}</span>
                  <span style={{ fontWeight: 500 }}>{count}</span>
                </div>
                <div className="pbar"><div className="pfill" style={{ width: `${pct}%`, background: status === 'completed' ? 'var(--gr)' : status === 'open' ? 'var(--bl)' : 'var(--or)' }}></div></div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sector breakdown */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Répartition par secteur</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
          {SECTORS.map(s => {
            const count = missions.filter(m => m.sector === s).length
            return (
              <div key={s} style={{ textAlign: 'center', padding: 10, background: 'var(--g1)', borderRadius: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--or)' }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>{SECTOR_LABELS[s]}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn-secondary" onClick={onExportMissions} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Download size={16} /> Exporter missions (CSV)</button>
        <button className="btn-secondary" onClick={onExportInvoices} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Download size={16} /> Exporter factures (CSV)</button>
      </div>
    </div>
  )
}
