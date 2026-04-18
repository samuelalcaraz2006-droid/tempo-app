
import { getRecurrenceLevel, getRecurrenceMessage } from '../../lib/recurrenceCheck'

const RECURRENCE_STYLES = {
  info: {
    background: 'var(--bl-l)',
    color: 'var(--brand-d)',
    border: '1px solid rgba(37,99,235,.18)',
  },
  warn: {
    background: 'var(--am-l)',
    color: '#92400E',
    border: '1px solid rgba(245,158,11,.25)',
  },
  danger: {
    background: 'var(--rd-l)',
    color: 'var(--rd)',
    border: '1px solid rgba(239,68,68,.3)',
  },
}

function RecurrenceBanner({ count }) {
  const level = getRecurrenceLevel(count)
  const msg = getRecurrenceMessage(count, level)
  if (!msg) return null
  const style = RECURRENCE_STYLES[msg.tone] || RECURRENCE_STYLES.info
  return (
    <div
      role="alert"
      style={{
        marginTop: 10,
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.4,
        ...style,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{msg.title}</div>
      <div style={{ opacity: 0.9 }}>{msg.body}</div>
    </div>
  )
}

export default function CompanyCandidates({
  candidates,
  actionLoading,
  onAccept,
  onReject,
  onBack,
  onViewProfile,
}) {
  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--g4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>
        ‹ Retour au tableau de bord
      </button>
      <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>Candidatures reçues</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05, marginBottom: 8 }}>
        <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>{candidates.length}</span> candidat{candidates.length !== 1 ? 's' : ''} en attente.
      </div>
      <div style={{ fontSize: 14, color: 'var(--g5)', marginBottom: 24 }}>
        Retenez les profils les mieux notés pour cette mission.
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
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: isAccepted ? 'var(--gr-l)' : 'var(--bl-l)', color: isAccepted ? 'var(--gr-d)' : 'var(--brand-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
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
              <RecurrenceBanner count={c.recurrence_count || 0} />
              {isPending && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid #F4F4F2' }}>
                  {onViewProfile && (
                    <button type="button" style={{ padding: '8px 14px', border: '1.5px solid var(--g2)', borderRadius: 999, background: 'var(--wh)', fontSize: 12, color: 'var(--g6)', cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => onViewProfile(c)}>
                      👁 Voir le profil
                    </button>
                  )}
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
