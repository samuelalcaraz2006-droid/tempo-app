import React from 'react'

export default function CompanyCandidates({
  candidates,
  actionLoading,
  onAccept,
  onReject,
  onBack,
}) {
  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--g4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>
        ‹ Retour au tableau de bord
      </button>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Candidatures reçues</div>
      <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 16 }}>
        {candidates.length} candidat{candidates.length !== 1 ? 's' : ''}
      </div>

      {candidates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g4)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          Aucune candidature pour le moment — les travailleurs compatibles ont été notifiés
        </div>
      ) : (
        candidates.map(c => {
          const isLoading = actionLoading[c.id]
          const isPending = c.status === 'pending'
          const isAccepted = c.status === 'accepted'
          const isRejected = c.status === 'rejected'
          return (
            <div key={c.id} className="card" style={{ padding: 16, marginBottom: 10, borderLeft: isAccepted ? '3px solid var(--gr)' : isRejected ? '3px solid var(--rd)' : '3px solid transparent', transition: 'border-color .2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: isAccepted ? 'var(--gr-l)' : 'var(--bl-l)', color: isAccepted ? 'var(--gr-d)' : '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                  {(c.workers?.first_name?.[0] || '?')}{c.workers?.last_name?.[0] || ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.workers?.first_name} {c.workers?.last_name}</span>
                    {c.match_score && <span className="score-badge">{c.match_score}% match</span>}
                    <span className={`badge ${isAccepted ? 'badge-green' : isRejected ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: 11 }}>
                      {isPending ? 'En attente' : isAccepted ? '✓ Accepté' : '✗ Refusé'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 2 }}>
                    {c.workers?.city || '—'} · Note {c.workers?.rating_avg ? parseFloat(c.workers.rating_avg).toFixed(1) : 'Nouveau'}/5
                  </div>
                  {c.workers?.skills?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                      {c.workers.skills.slice(0, 4).map(s => <span key={s} className="tag" style={{ fontSize: 11 }}>{s}</span>)}
                    </div>
                  )}
                </div>
              </div>
              {isPending && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F4F4F2' }}>
                  <button style={{ flex: 1, padding: '8px', border: '1.5px solid var(--g2)', borderRadius: 8, background: 'var(--wh)', fontSize: 13, color: 'var(--g6)', cursor: 'pointer', fontWeight: 500, transition: 'all .15s' }}
                    disabled={!!isLoading}
                    onClick={() => onReject(c.id)}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--rd)'; e.currentTarget.style.color = 'var(--rd)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--g2)'; e.currentTarget.style.color = 'var(--g6)' }}>
                    {isLoading === 'rejecting' ? '...' : '✗ Refuser'}
                  </button>
                  <button style={{ flex: 2, padding: '8px', border: 'none', borderRadius: 8, background: 'var(--gr)', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'opacity .15s' }}
                    disabled={!!isLoading}
                    onClick={() => onAccept(c)}
                    onMouseEnter={e => e.currentTarget.style.opacity = '.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    {isLoading === 'accepting' ? 'Acceptation...' : '✓ Accepter ce travailleur'}
                  </button>
                </div>
              )}
              {isAccepted && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--gr-l)', borderRadius: 8, fontSize: 12, color: 'var(--gr-d)' }}>
                  ✓ Contrat de prestation généré automatiquement — signature en attente
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
