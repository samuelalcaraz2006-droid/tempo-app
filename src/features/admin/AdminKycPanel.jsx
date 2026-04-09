import React from 'react'

function KycWorkerCard({ u, onApproveAll, onApproveField, onReject, kycFieldLoading }) {
  const w = u.worker
  const docs = [
    { key: 'id',    label: "Pièce d'identité", verified: w.id_verified,    url: w.id_doc_url },
    { key: 'siret', label: 'SIRET',             verified: w.siret_verified,  url: w.siret_doc_url },
    { key: 'rcpro', label: 'RC Pro',            verified: w.rc_pro_verified, url: w.rc_pro_url },
  ]
  const hasAnyDoc = docs.some(d => d.url)

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{w.first_name} {w.last_name}</div>
          <div style={{ fontSize: 12, color: 'var(--g4)' }}>{u.email} · {w.city || '—'}</div>
          {w.kyc_submitted_at && (
            <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>
              Soumis le {w.kyc_submitted_at.split('T')[0]}
            </div>
          )}
          {w.kyc_rejection_reason && (
            <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>
              Refus précédent : {w.kyc_rejection_reason}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {hasAnyDoc && (
            <button
              className="btn-primary"
              style={{ padding: '4px 10px', fontSize: 11 }}
              onClick={() => onApproveAll(u)}
            >
              ✓ Tout valider
            </button>
          )}
          <button
            style={{ padding: '4px 10px', fontSize: 11, background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
            onClick={() => onReject(u)}
          >
            ✗ Refuser
          </button>
        </div>
      </div>

      {docs.map(doc => (
        <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--g1)' }}>
          <span style={{ fontSize: 12, color: 'var(--g6)', width: 120, flexShrink: 0 }}>{doc.label}</span>
          {doc.url ? (
            <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#2563EB', textDecoration: 'underline', flex: 1 }}>
              Voir le document
            </a>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--g4)', flex: 1 }}>Non déposé</span>
          )}
          {doc.verified ? (
            <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Vérifié</span>
          ) : doc.url ? (
            <button
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: 10, opacity: kycFieldLoading === `${u.id}_${doc.key}` ? 0.5 : 1 }}
              disabled={!!kycFieldLoading}
              onClick={() => onApproveField(u, doc.key)}
            >
              {kycFieldLoading === `${u.id}_${doc.key}` ? '...' : '✓ Valider'}
            </button>
          ) : (
            <span className="badge badge-orange" style={{ fontSize: 10 }}>En attente</span>
          )}
        </div>
      ))}
    </div>
  )
}

export default function AdminKycPanel({ users, onApproveAll, onApproveField, onReject, kycFieldLoading }) {
  const pendingWorkers = users.filter(u =>
    u.worker && (!u.worker.id_verified || !u.worker.siret_verified || !u.worker.rc_pro_verified)
  )

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Travailleurs — Vérifications KYC</div>
      {pendingWorkers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--g4)', fontSize: 13 }}>
          Toutes les vérifications sont à jour
        </div>
      ) : (
        pendingWorkers.map(u => (
          <KycWorkerCard
            key={u.id}
            u={u}
            onApproveAll={onApproveAll}
            onApproveField={onApproveField}
            onReject={onReject}
            kycFieldLoading={kycFieldLoading}
          />
        ))
      )}
    </div>
  )
}
