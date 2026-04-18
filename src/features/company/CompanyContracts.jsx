import React from 'react'
import { Download } from 'lucide-react'
import { formatDate, formatAmount } from '../../lib/formatters'

const INV_STYLES = {
  draft:     ['badge-gray', 'Brouillon'],
  sent:      ['badge-blue', 'Envoyée'],
  paid:      ['badge-green', 'Payée'],
  overdue:   ['badge-red', 'En retard'],
  cancelled: ['badge-gray', 'Annulée'],
}

export default function CompanyContracts({ invoices, onExportInvoices }) {
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft')

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>Contrats & factures</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          Administratif <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>automatisé</span>.
        </div>
        <div style={{ fontSize: 14, color: 'var(--g5)', marginTop: 8 }}>Gestion juridique 100 % automatisée par TEMPO.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
        {[
          [invoices.length, 'Factures totales'],
          [invoices.filter(i => i.status === 'paid').length, 'Factures payées'],
          [formatAmount(pendingInvoices.reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0)), 'Montant en attente'],
        ].map(([v, l]) => (
          <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value">{v}</div></div>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g4)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          Les factures apparaissent automatiquement à la fin de chaque mission
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: 'auto', marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ background: 'var(--navy)' }}>
                {['Référence', 'Travailleur', 'Date', 'Montant', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.7)', borderBottom: '1px solid #333' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr key={inv.id} style={{ background: i % 2 === 1 ? 'var(--g1)' : 'var(--wh)' }}>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 500 }}>{inv.invoice_number}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--g6)' }}>
                    {inv.contracts?.workers?.first_name} {inv.contracts?.workers?.last_name}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--g4)' }}>{formatDate(inv.created_at)}</td>
                  <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600 }}>{formatAmount(inv.amount_ttc)}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span className={`badge ${INV_STYLES[inv.status]?.[0] || 'badge-gray'}`} style={{ fontSize: 11 }}>
                      {INV_STYLES[inv.status]?.[1] || inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn-secondary" onClick={onExportInvoices} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Download size={16} /> Exporter les factures (CSV)
        </button>
      </div>
      <div style={{ background: 'var(--gr-l)', border: '1px solid #D1FAE5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--gr-d)', lineHeight: 1.6 }}>
        TEMPO est mandataire de facturation. Chaque contrat est conforme au statut auto-entrepreneur. Archivage légal 10 ans garanti.
      </div>
    </div>
  )
}
