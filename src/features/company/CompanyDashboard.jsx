import React from 'react'
import { Download, PenLine, MessageCircle, RefreshCw, X, ClipboardList } from 'lucide-react'
import EmptyState from '../../components/UI/EmptyState'
import { formatDate, formatAmount, SECTOR_LABELS } from '../../lib/formatters'

const STATUS_STYLES = {
  draft:     ['badge-gray', 'Brouillon'],
  open:      ['badge-blue', 'Publiée'],
  matched:   ['badge-orange', 'Matchée'],
  active:    ['badge-orange', 'En cours'],
  completed: ['badge-green', 'Terminée'],
  cancelled: ['badge-gray', 'Annulée'],
}

const TIMELINE_STEPS = ['open', 'matched', 'active', 'completed']
const TIMELINE_LABELS = { open: 'Publiée', matched: 'Matchée', active: 'En cours', completed: 'Terminée' }

export default function CompanyDashboard({
  displayName,
  missions,
  invoices,
  company,
  actionLoading,
  signedContracts,
  onNavigate,
  onDuplicate,
  onComplete,
  onOpenContract,
  onOpenChat,
  onRepublish,
  onCancelModal,
  onExportMissions,
  onLoadCandidates,
}) {
  const activeMissions = missions.filter(m => ['open', 'matched', 'active'].includes(m.status))
  const completedMissions = missions.filter(m => m.status === 'completed')
  const totalMois = invoices
    .filter(i => new Date(i.created_at).getMonth() === new Date().getMonth())
    .reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0)

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Tableau de bord</div>
        <div className="section-sub">
          Bienvenue, {displayName} ·{' '}
          <button onClick={() => onNavigate('profil-e')} style={{ background: 'none', border: 'none', color: 'var(--or)', fontSize: 14, cursor: 'pointer' }}>
            Voir mon profil public
          </button>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid-4-mobile-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 12, marginBottom: 16 }}>
        {[
          [activeMissions.length, 'Missions actives', activeMissions.length > 0 ? `${missions.filter(m => m.status === 'open').length} en recherche` : '', 'var(--brand)'],
          [formatAmount(totalMois), 'Dépenses ce mois', (() => {
            const lastMonth = invoices.filter(i => {
              const d = new Date(i.created_at); const now = new Date()
              return d.getMonth() === (now.getMonth() - 1 + 12) % 12 && (now.getMonth() === 0 ? d.getFullYear() === now.getFullYear() - 1 : d.getFullYear() === now.getFullYear())
            }).reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0)
            return lastMonth > 0 ? (totalMois >= lastMonth ? '↑ vs mois dernier' : '↓ vs mois dernier') : ''
          })(), 'var(--am)'],
          [completedMissions.length, 'Missions terminées', missions.length > 0 ? `${Math.round((completedMissions.length / missions.length) * 100)}% taux complétion` : '', 'var(--gr)'],
          [company?.rating_avg ? parseFloat(company.rating_avg).toFixed(1) + '/5' : '—', 'Note moyenne', company?.rating_count ? `${company.rating_count} avis` : '', 'var(--am)'],
        ].map(([v, l, d, accent]) => (
          <div key={l} className="metric-card" style={{ '--metric-accent': accent }}>
            <div className="metric-label">{l}</div>
            <div className="metric-value">{v}</div>
            {d && <div className="metric-delta" style={{ color: 'var(--g4)' }}>{d}</div>}
          </div>
        ))}
      </div>

      {/* KPIs secondaires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bl-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⏱</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--g4)' }}>Temps moyen de match</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{(() => {
              const matched = missions.filter(m => m.status !== 'open' && m.status !== 'draft' && m.status !== 'cancelled' && m.matched_at && m.created_at)
              if (matched.length === 0) return '< 24h'
              const avgHours = matched.reduce((s, m) => s + (new Date(m.matched_at) - new Date(m.created_at)) / 3600000, 0) / matched.length
              return avgHours < 1 ? `${Math.round(avgHours * 60)} min` : avgHours < 24 ? `${Math.round(avgHours)}h` : `${Math.round(avgHours / 24)}j`
            })()}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--gr-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📊</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--g4)' }}>Taux de remplissage</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {missions.length > 0
                ? `${Math.round(((missions.filter(m => ['matched', 'active', 'completed'].includes(m.status)).length) / (missions.filter(m => m.status !== 'cancelled' && m.status !== 'draft').length || 1)) * 100)}%`
                : '—'}
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--or-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💰</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--g4)' }}>Budget total dépensé</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{formatAmount(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0))}</div>
          </div>
        </div>
      </div>

      {/* Mini graphique tendance sur 4 dernières semaines */}
      {invoices.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Activité récente</div>
            <button onClick={() => onNavigate('stats')} style={{ fontSize: 12, color: 'var(--or)', background: 'none', border: 'none', cursor: 'pointer' }}>Voir les stats détaillées →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {(() => {
              const weeks = []
              const now = new Date()
              for (let w = 3; w >= 0; w--) {
                const start = new Date(now); start.setDate(now.getDate() - (w + 1) * 7); start.setHours(0, 0, 0, 0)
                const end = new Date(start); end.setDate(start.getDate() + 7)
                const weekMissions = missions.filter(m => { const d = new Date(m.created_at); return d >= start && d < end })
                const weekInvoices = invoices.filter(i => { const d = new Date(i.created_at); return d >= start && d < end })
                weeks.push({ label: w === 0 ? 'Cette sem.' : w === 1 ? 'Sem. -1' : `Sem. -${w}`, missions: weekMissions.length, spent: weekInvoices.reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0) })
              }
              return weeks.map((w, i) => (
                <div key={i} style={{ background: 'var(--g1)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--g4)', marginBottom: 6 }}>{w.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--or)' }}>{w.missions}</div>
                  <div style={{ fontSize: 10, color: 'var(--g4)' }}>missions</div>
                  <div style={{ fontSize: 12, fontWeight: 500, marginTop: 4 }}>{Math.round(w.spent)}€</div>
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Actions rapides */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="btn-primary" onClick={() => onNavigate('publier')} style={{ flex: 1, justifyContent: 'center' }}>+ Publier une mission</button>
        <button className="btn-secondary" onClick={onExportMissions} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Download size={16} /> Export CSV</button>
      </div>

      {missions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune mission publiee"
          description="Publiez votre premiere mission et recevez des candidatures en moins de 30 minutes"
          action={{ label: 'Publier une mission \u2192', onClick: () => onNavigate('publier') }}
        />
      ) : (
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Vos missions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missions.map(m => {
              const stepIndex = TIMELINE_STEPS.indexOf(m.status)
              const isCancelled = m.status === 'cancelled'
              return (
                <div key={m.id} className="card" style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: !isCancelled && stepIndex >= 0 ? 10 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{m.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--g4)' }}>
                        {m.city} · {m.hourly_rate}€/h · Publiée le {formatDate(m.published_at || m.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span className={`badge ${STATUS_STYLES[m.status]?.[0] || 'badge-gray'}`} style={{ fontSize: 11 }}>
                        {STATUS_STYLES[m.status]?.[1] || m.status}
                      </span>
                      <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }} onClick={() => onDuplicate(m)} title="Dupliquer cette mission">⧉ Dupliquer</button>
                      {m.status === 'open' && (
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => onLoadCandidates(m.id)}>
                          Candidatures
                        </button>
                      )}
                      {(m.status === 'matched' || m.status === 'active') && (
                        <>
                          {signedContracts.includes(m.id) ? (
                            <span className="badge badge-green" style={{ fontSize: 10 }}>Contrat signé</span>
                          ) : (
                            <button className="btn-dark" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => onOpenContract({ missionId: m.id, mission: m, workerName: `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'Travailleur' })}>
                              <PenLine size={16} /> Signer
                            </button>
                          )}
                          <button className="btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}
                            disabled={actionLoading[m.id] === 'completing'}
                            onClick={() => onComplete(m.id, m.workers?.id, `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'le travailleur')}>
                            {actionLoading[m.id] === 'completing' ? '...' : '✓ Terminer'}
                          </button>
                          <button className="btn-secondary" aria-label="Ouvrir le chat" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center' }}
                            onClick={() => onOpenChat(m.assigned_worker_id || m.workers?.id, `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'Travailleur', m.id)}>
                            <MessageCircle size={16} />
                          </button>
                        </>
                      )}
                      {m.status === 'completed' && (
                        <button className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => onRepublish(m)} title="Republier comme mission récurrente">
                          <RefreshCw size={16} /> Récurrente
                        </button>
                      )}
                      {(m.status === 'open' || m.status === 'matched') && (
                        <button aria-label="Annuler la mission" style={{ padding: '5px 8px', border: '1px solid var(--g2)', borderRadius: 6, background: 'var(--wh)', fontSize: 11, cursor: 'pointer', color: 'var(--rd)', display: 'flex', alignItems: 'center' }}
                          onClick={() => onCancelModal(m.id)}><X size={16} /></button>
                      )}
                    </div>
                  </div>
                  {/* Timeline de progression */}
                  {!isCancelled && stepIndex >= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {TIMELINE_STEPS.map((step, i) => {
                        const done = i <= stepIndex
                        return (
                          <React.Fragment key={step}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 14, height: 14, borderRadius: '50%', background: done ? (i === stepIndex ? 'var(--or)' : 'var(--gr)') : 'var(--g2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}>
                                {done && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1 }}>✓</span>}
                              </div>
                              <span style={{ fontSize: 10, color: done ? 'var(--bk)' : 'var(--g4)', fontWeight: i === stepIndex ? 600 : 400 }}>{TIMELINE_LABELS[step]}</span>
                            </div>
                            {i < TIMELINE_STEPS.length - 1 && (
                              <div style={{ flex: 1, height: 2, background: i < stepIndex ? 'var(--gr)' : 'var(--g2)', margin: '0 6px', borderRadius: 1, transition: 'background .2s' }}></div>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
