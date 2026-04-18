import React from 'react'
import { Download, PenLine, MessageCircle, RefreshCw, X, ClipboardList, Plus } from 'lucide-react'
import EmptyState from '../../components/UI/EmptyState'
import { formatDate, formatAmount } from '../../lib/formatters'
import TopBarA from '../../design/TopBar'
import { T } from '../../design/tokens'
import { Pill, LiveDot, KpiCard, Eyebrow, Avatar } from '../../design/primitives'

const STATUS_STYLE = {
  draft:     { variant: 'neutral', label: 'Brouillon' },
  open:      { variant: 'brand',   label: 'Publiée' },
  matched:   { variant: 'amber',   label: 'Matchée' },
  active:    { variant: 'amber',   label: 'En cours' },
  completed: { variant: 'green',   label: 'Terminée' },
  cancelled: { variant: 'neutral', label: 'Annulée' },
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

  // Compute avg match time
  const avgMatchTime = (() => {
    const matched = missions.filter(m => m.status !== 'open' && m.status !== 'draft' && m.status !== 'cancelled' && m.matched_at && m.created_at)
    if (matched.length === 0) return '< 24h'
    const avgHours = matched.reduce((s, m) => s + (new Date(m.matched_at) - new Date(m.created_at)) / 3600000, 0) / matched.length
    return avgHours < 1 ? `${Math.round(avgHours * 60)} min` : avgHours < 24 ? `${Math.round(avgHours)}h` : `${Math.round(avgHours / 24)}j`
  })()

  const fillRate = missions.length > 0
    ? `${Math.round(((missions.filter(m => ['matched', 'active', 'completed'].includes(m.status)).length) / (missions.filter(m => m.status !== 'cancelled' && m.status !== 'draft').length || 1)) * 100)}%`
    : '—'

  const openCount = missions.filter(m => m.status === 'open').length
  const activeTitle = activeMissions.length > 0
    ? <>Bonjour {displayName?.split(' ')[0] || ''}, <em>{activeMissions.length} mission{activeMissions.length > 1 ? 's' : ''}</em> en cours.</>
    : <>Bonjour {displayName?.split(' ')[0] || ''}, prêt à <em>publier</em> ?</>

  return (
    <>
      <TopBarA
        subtitle={company?.name ? `Tableau de bord · ${company.name}` : 'Tableau de bord'}
        title={activeTitle}
        actions={
          <>
            <button className="a-btn-ghost-dark" onClick={onExportMissions}>
              <Download size={16} /> Exporter
            </button>
            <button className="a-btn-primary" onClick={() => onNavigate('publier')}>
              <Plus size={16} /> Nouvelle mission
            </button>
          </>
        }
      />

      <div className="app-main-container" style={{
        padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 32,
        maxWidth: 1400, margin: '0 auto', width: '100%',
      }}>
        {/* ─── KPIs ─── */}
        <div className="grid-4-mobile-2" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16,
        }}>
          <KpiCard
            label="MISSIONS ACTIVES"
            value={activeMissions.length}
            sub={openCount > 0 ? `${openCount} en recherche` : '—'}
            accentColor={T.color.brand}
          />
          <KpiCard
            label="DÉPENSES CE MOIS"
            value={formatAmount(totalMois)}
            sub={(() => {
              const lastMonth = invoices.filter(i => {
                const d = new Date(i.created_at); const now = new Date()
                return d.getMonth() === (now.getMonth() - 1 + 12) % 12 && (now.getMonth() === 0 ? d.getFullYear() === now.getFullYear() - 1 : d.getFullYear() === now.getFullYear())
              }).reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0)
              return lastMonth > 0 ? (totalMois >= lastMonth ? '↑ vs mois dernier' : '↓ vs mois dernier') : ''
            })()}
            accentColor={T.color.ink}
          />
          <KpiCard
            label="TEMPS MOYEN MATCH"
            value={avgMatchTime}
            sub={`${missions.filter(m => m.status !== 'open' && m.status !== 'draft' && m.status !== 'cancelled').length} missions matchées`}
            accentColor={T.color.green}
          />
          <KpiCard
            label="NOTE MOYENNE"
            value={company?.rating_avg ? parseFloat(company.rating_avg).toFixed(1) + '/5' : '—'}
            sub={company?.rating_count ? `${company.rating_count} avis` : 'Aucun avis'}
            accentColor={T.color.amber}
          />
        </div>

        {/* ─── KPIs secondaires ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Taux de remplissage', value: fillRate, icon: '▦', color: T.color.brand },
            { label: 'Budget total dépensé', value: formatAmount(invoices.filter(i => i.status === 'paid').reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0)), icon: '€', color: T.color.green },
            { label: 'Missions terminées', value: completedMissions.length, icon: '✓', color: T.color.ink },
          ].map((kpi, i) => (
            <div key={i} className="a-card" style={{
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: T.color.brandL, color: T.color.brand,
                display: 'grid', placeItems: 'center',
                fontSize: 18, fontWeight: 700, fontFamily: T.font.mono,
                flexShrink: 0,
              }}>{kpi.icon}</div>
              <div style={{ minWidth: 0 }}>
                <Eyebrow style={{ marginBottom: 4 }}>{kpi.label}</Eyebrow>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: T.color.ink,
                  letterSpacing: '-0.01em',
                }}>{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Missions list ─── */}
        {missions.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aucune mission publiée"
            description="Publiez votre première mission et recevez des candidatures en moins de 30 minutes"
            action={{ label: 'Publier une mission →', onClick: () => onNavigate('publier') }}
          />
        ) : (
          <div className="a-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '20px 24px 14px', borderBottom: `1px solid ${T.color.g2}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <Eyebrow>Vos missions</Eyebrow>
                <div style={{
                  marginTop: 4, fontSize: 18, fontWeight: 700, color: T.color.ink,
                  letterSpacing: '-0.015em',
                }}>
                  {missions.length} mission{missions.length > 1 ? 's' : ''}
                  {activeMissions.length > 0 && <>, <span style={{
                    fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand,
                  }}>{activeMissions.length} active{activeMissions.length > 1 ? 's' : ''}</span></>}
                </div>
              </div>
              {openCount > 0 && (
                <Pill variant="green" size="sm" icon={<LiveDot size={6} />}>
                  LIVE · {openCount} en recherche
                </Pill>
              )}
            </div>

            <div style={{ padding: '6px 0' }}>
              {missions.map(m => <MissionRow key={m.id} m={m}
                signedContracts={signedContracts}
                actionLoading={actionLoading}
                onDuplicate={onDuplicate}
                onComplete={onComplete}
                onOpenContract={onOpenContract}
                onOpenChat={onOpenChat}
                onRepublish={onRepublish}
                onCancelModal={onCancelModal}
                onLoadCandidates={onLoadCandidates} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function MissionRow({
  m, signedContracts, actionLoading,
  onDuplicate, onComplete, onOpenContract, onOpenChat, onRepublish, onCancelModal, onLoadCandidates,
}) {
  const status = STATUS_STYLE[m.status] || { variant: 'neutral', label: m.status }
  const isCancelled = m.status === 'cancelled'
  const stepIndex = TIMELINE_STEPS.indexOf(m.status)
  const workerFullName = `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'Travailleur'

  return (
    <div style={{
      padding: '16px 24px', borderBottom: `1px solid ${T.color.g1}`,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.color.ink, letterSpacing: '-0.01em' }}>{m.title}</span>
            <Pill variant={status.variant} size="xs">{status.label}</Pill>
          </div>
          <div style={{ fontSize: 12.5, color: T.color.g5, marginTop: 4 }}>
            {m.city} · {m.hourly_rate}€/h · Publiée le {formatDate(m.published_at || m.created_at)}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          <button className="a-btn-outline" style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => onDuplicate(m)} title="Dupliquer cette mission">⧉ Dupliquer</button>

          {m.status === 'open' && (
            <button className="a-btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}
              onClick={() => onLoadCandidates(m.id)}>Candidatures</button>
          )}

          {(m.status === 'matched' || m.status === 'active') && (
            <>
              {signedContracts.includes(m.id) ? (
                <Pill variant="green" size="xs">Contrat signé</Pill>
              ) : (
                <button className="a-btn-outline" style={{ padding: '6px 12px', fontSize: 12, gap: 4 }}
                  onClick={() => onOpenContract({
                    missionId: m.id, mission: m,
                    workerName: workerFullName,
                    workerId: m.workers?.id || m.assigned_worker_id,
                  })}>
                  <PenLine size={14} /> Signer
                </button>
              )}
              <button className="a-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}
                disabled={actionLoading[m.id] === 'completing'}
                onClick={() => onComplete(m.id, m.workers?.id, workerFullName)}>
                {actionLoading[m.id] === 'completing' ? '...' : '✓ Terminer'}
              </button>
              <button className="a-btn-outline" aria-label="Ouvrir le chat" style={{ padding: '6px 10px', fontSize: 12 }}
                onClick={() => onOpenChat(m.assigned_worker_id || m.workers?.id, workerFullName, m.id)}>
                <MessageCircle size={14} />
              </button>
            </>
          )}

          {m.status === 'completed' && (
            <button className="a-btn-outline" style={{ padding: '6px 12px', fontSize: 12, gap: 4 }}
              onClick={() => onRepublish(m)} title="Republier comme mission récurrente">
              <RefreshCw size={14} /> Récurrente
            </button>
          )}

          {(m.status === 'open' || m.status === 'matched') && (
            <button aria-label="Annuler la mission" style={{
              padding: '6px 10px', border: `1px solid ${T.color.g2}`, borderRadius: 999,
              background: '#fff', color: T.color.red, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }} onClick={() => onCancelModal(m.id)}><X size={14} /></button>
          )}
        </div>
      </div>

      {/* Timeline */}
      {!isCancelled && stepIndex >= 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, paddingLeft: 4 }}>
          {TIMELINE_STEPS.map((step, i) => {
            const done = i <= stepIndex
            const isCurrent = i === stepIndex
            return (
              <React.Fragment key={step}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: done ? (isCurrent ? T.color.brand : T.color.green) : T.color.g2,
                    display: 'grid', placeItems: 'center', transition: 'background .2s',
                    boxShadow: isCurrent ? `0 0 0 3px ${T.color.brandL}` : 'none',
                  }}>
                    {done && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1 }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize: 10.5, color: done ? T.color.ink : T.color.g5,
                    fontWeight: isCurrent ? 700 : 500,
                    fontFamily: T.font.mono, letterSpacing: 0.5,
                  }}>{TIMELINE_LABELS[step]}</span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, background: i < stepIndex ? T.color.green : T.color.g2,
                    margin: '0 10px', borderRadius: 1, transition: 'background .2s',
                  }} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
