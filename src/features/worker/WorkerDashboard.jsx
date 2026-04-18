import React from 'react'
import { Search } from 'lucide-react'
import MissionCard from '../shared/MissionCard'
import EmptyState from '../../components/UI/EmptyState'
import TopBarA from '../../design/TopBar'
import { T } from '../../design/tokens'
import { KpiCard, Pill, LiveDot, Eyebrow, GridBg } from '../../design/primitives'

export default function WorkerDashboard({
  worker, displayName, missions, urgentMissions, applications,
  onNavigate, onApply, applying, savedMissions, onToggleSave, t,
}) {
  const hasApplied = (id) => applications.some(a => a.mission_id === id)
  const firstName = (displayName || '').split(' ')[0] || ''

  // KPIs dérivés
  const completedCount = worker?.missions_completed || 0
  const ratingAvg = worker?.rating_avg ? parseFloat(worker.rating_avg).toFixed(1).replace('.', ',') + '/5' : '—'
  const ratingCount = worker?.rating_count || 0
  const disponibles = missions.length

  // Revenus du mois (calcul naïf : somme des invoices paid ce mois)
  const thisMonth = new Date().getMonth()
  const monthRevenue = (worker?.month_revenue_eur != null)
    ? `${Math.round(worker.month_revenue_eur)} €`
    : '—'
  const monthHours = (worker?.month_hours != null)
    ? `${Math.round(worker.month_hours)} h`
    : '—'
  const returnRate = (worker?.return_rate_pct != null)
    ? `${Math.round(worker.return_rate_pct)} %`
    : '—'

  const title = disponibles > 0
    ? <><span>{firstName ? `Bonjour ${firstName}, ` : ''}</span><em>{disponibles} mission{disponibles > 1 ? 's' : ''}</em> vous attendent.</>
    : <><span>{firstName ? `Bonjour ${firstName}, ` : ''}</span>prêt pour votre <em>prochaine mission</em> ?</>

  return (
    <>
      <TopBarA
        subtitle={`${worker?.sector || 'Travailleur'}${worker?.city ? ' · ' + worker.city : ''}`}
        title={title}
        actions={
          <>
            <button className="a-btn-ghost-dark" onClick={() => onNavigate('profil')}>
              Mes disponibilités
            </button>
            <button className="a-btn-primary" onClick={() => onNavigate('missions')}>
              Explorer →
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
            label="REVENUS DU MOIS"
            value={monthRevenue}
            sub={worker?.month_revenue_delta != null ? `${worker.month_revenue_delta > 0 ? '+' : ''}${worker.month_revenue_delta} % vs mois dernier` : 'Cumul des factures payées'}
            accentColor={T.color.brand}
          />
          <KpiCard
            label="MISSIONS RÉALISÉES"
            value={completedCount}
            sub={completedCount > 0 ? 'Depuis votre inscription' : 'À commencer'}
            accentColor={T.color.ink}
          />
          <KpiCard
            label="NOTE MOYENNE"
            value={ratingAvg}
            sub={ratingCount > 0 ? `${ratingCount} avis récents` : 'Aucun avis'}
            accentColor={T.color.amber}
          />
          <KpiCard
            label="TAUX DE RETOUR"
            value={returnRate}
            sub="Clients fidèles"
            accentColor={T.color.green}
          />
        </div>

        {/* ─── Urgent banner ─── */}
        {urgentMissions.length > 0 && (
          <div
            onClick={() => onNavigate('missions')}
            style={{
              position: 'relative', overflow: 'hidden',
              background: T.color.navy, borderRadius: 18,
              padding: '22px 26px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 18,
              color: '#fff',
              boxShadow: '0 20px 40px -15px rgba(37,99,235,.4)',
            }}
          >
            <GridBg opacity={0.2} />
            <div style={{
              position: 'absolute', top: '-50%', right: '-10%', width: 300, height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', flex: 1 }}>
              <Pill variant="amber" size="sm" icon={<LiveDot color="#F59E0B" size={6} />}>
                {urgentMissions.length} mission{urgentMissions.length > 1 ? 's' : ''} urgente{urgentMissions.length > 1 ? 's' : ''}
              </Pill>
              <div style={{
                marginTop: 12, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
                lineHeight: 1.1, fontFamily: T.font.body,
              }}>
                À <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: '#FCD34D' }}>saisir</span> maintenant.
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
                Cliquez pour voir les missions prioritaires du jour.
              </div>
            </div>
            <div style={{
              position: 'relative', fontSize: 28, color: '#fff',
              background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
              width: 52, height: 52, display: 'grid', placeItems: 'center',
              flexShrink: 0,
            }}>›</div>
          </div>
        )}

        {/* ─── Missions suggérées ─── */}
        {missions.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Aucune mission disponible"
            description="Les missions apparaissent ici en temps réel"
            action={{ label: 'Voir les missions', onClick: () => onNavigate('missions') }}
          />
        ) : (
          <div className="a-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '22px 26px 14px', borderBottom: `1px solid ${T.color.g2}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <Eyebrow>Pour vous · matching personnalisé</Eyebrow>
                <div style={{
                  marginTop: 4, fontSize: 19, fontWeight: 700, color: T.color.ink,
                  letterSpacing: '-0.015em',
                }}>
                  Missions sélectionnées <span style={{
                    fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand,
                  }}>pour vous</span>
                </div>
              </div>
              <Pill variant="brand" size="sm">{missions.length} disponible{missions.length > 1 ? 's' : ''}</Pill>
            </div>

            <div style={{ padding: 16 }}>
              {missions.slice(0, 4).map(m => (
                <div key={m.id} style={{ marginBottom: 10 }}>
                  <MissionCard
                    mission={m}
                    applied={hasApplied(m.id)}
                    saved={savedMissions.includes(m.id)}
                    applying={applying[m.id]}
                    onApply={() => onApply(m, hasApplied(m.id))}
                    onToggleSave={onToggleSave}
                    onSelect={() => onNavigate('mission-detail', m)}
                  />
                </div>
              ))}
            </div>

            <div style={{
              padding: '14px 26px 20px', borderTop: `1px solid ${T.color.g2}`,
              textAlign: 'center',
            }}>
              <button
                onClick={() => onNavigate('missions')}
                style={{
                  background: 'none', border: 'none', color: T.color.brand,
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0,
                }}
              >
                Voir les {missions.length} missions du jour →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
