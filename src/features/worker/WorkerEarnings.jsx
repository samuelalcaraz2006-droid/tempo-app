import React from 'react'
import { formatDate, formatAmount } from '../../lib/formatters'

export default function WorkerEarnings({ worker, invoices, allMissions, t }) {
  const totalMois = invoices.filter(i => new Date(i.created_at).getMonth() === new Date().getMonth()).reduce((s, i) => s + parseFloat(i.worker_payout || 0), 0)
  const totalAnnee = invoices.reduce((s, i) => s + parseFloat(i.worker_payout || 0), 0)

  // Monthly summary
  const now = new Date()
  const monthInvoices = invoices.filter(i => { const d = new Date(i.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const monthMissions = allMissions.filter(a => a.missions?.status === 'completed' && a.missions?.completed_at && new Date(a.missions.completed_at).getMonth() === now.getMonth())
  const totalHours = monthInvoices.reduce((s, i) => s + parseFloat(i.total_hours || i.contracts?.missions?.total_hours || 0), 0)
  const totalNet = monthInvoices.reduce((s, i) => s + parseFloat(i.worker_payout || 0), 0)

  // Monthly chart data
  const months = {}
  invoices.filter(i => i.status === 'paid').forEach(inv => {
    const d = new Date(inv.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = (months[key] || 0) + parseFloat(inv.worker_payout || 0)
  })
  const chartEntries = Object.entries(months).sort().slice(-6)
  const chartMax = Math.max(...chartEntries.map(e => e[1]), 1)

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:600, marginBottom:16 }}>{t('my_earnings')}</div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
        {[[formatAmount(totalMois), 'Ce mois'], [formatAmount(totalAnnee), 'Cette annee'], [worker?.missions_completed || 0, 'Missions'], [worker?.ca_ytd ? `${Math.round((worker.ca_ytd / 77700) * 100)}%` : '0%', 'CA / plafond']].map(([v, l]) => (
          <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value" style={{ fontSize:18 }}>{v}</div></div>
        ))}
      </div>

      {/* Monthly summary */}
      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Resume du mois</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
          <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
            <div style={{ fontSize:18, fontWeight:600, color:'var(--or)' }}>{monthMissions.length}</div>
            <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Missions terminees</div>
          </div>
          <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
            <div style={{ fontSize:18, fontWeight:600, color:'var(--gr)' }}>{Math.round(totalHours)}h</div>
            <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Heures travaillees</div>
          </div>
          <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
            <div style={{ fontSize:18, fontWeight:600, color:'var(--gr)' }}>{Math.round(totalNet)} €</div>
            <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Revenus nets</div>
          </div>
          <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
            <div style={{ fontSize:18, fontWeight:600 }}>{worker?.rating_avg ? parseFloat(worker.rating_avg).toFixed(1) : '—'}</div>
            <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Note moyenne</div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartEntries.length > 0 && (
        <div className="card" style={{ padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Evolution des gains</div>
          <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
            {chartEntries.map(([month, total]) => (
              <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--gr)' }}>{Math.round(total)}€</div>
                <div style={{ width:'100%', background:'var(--gr)', borderRadius:4, height: Math.max(4, (total / chartMax) * 70), transition:'height .3s' }}></div>
                <div style={{ fontSize:10, color:'var(--g4)' }}>{month.split('-')[1]}/{month.split('-')[0].slice(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CA Projection */}
      {worker?.ca_ytd > 0 && (
        <div className="card" style={{ padding:16, marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Projection CA annuel</div>
          <div className="pbar" style={{ height:8, marginBottom:6 }}>
            <div className="pfill" style={{ width:`${Math.min(100, (worker.ca_ytd / 77700) * 100)}%`, background: worker.ca_ytd > 70000 ? 'var(--rd)' : worker.ca_ytd > 50000 ? '#D97706' : 'var(--gr)' }}></div>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--g4)' }}>
            <span>{formatAmount(worker.ca_ytd)}</span>
            <span>Plafond AE : 77 700 €</span>
          </div>
          {worker.ca_ytd > 70000 && <div style={{ marginTop:8, padding:'8px 12px', background:'var(--rd-l)', borderRadius:8, fontSize:12, color:'var(--rd)' }}>⚠ Vous approchez du plafond auto-entrepreneur</div>}
        </div>
      )}

      {/* Invoices table */}
      {invoices.length === 0
        ? <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>Vos gains apparaitront ici apres vos premieres missions</div>
        : <div className="card" style={{ padding:0, overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
              <thead><tr style={{ background:'var(--g1)' }}>
                {['Reference', 'Date', 'Montant', 'Statut'].map(h => <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:12, fontWeight:500, color:'var(--g4)', borderBottom:'1px solid var(--g2)' }}>{h}</th>)}
              </tr></thead>
              <tbody>{invoices.map((inv, i) => (
                <tr key={inv.id} style={{ background: i % 2 === 1 ? 'var(--g1)' : 'var(--wh)' }}>
                  <td style={{ padding:'10px 12px', fontSize:12, fontWeight:500 }}>{inv.invoice_number}</td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:'var(--g4)' }}>{formatDate(inv.created_at)}</td>
                  <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{formatAmount(inv.worker_payout)}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize:11 }}>{inv.status === 'paid' ? 'Payee' : 'En attente'}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
      }
    </div>
  )
}
