import React from 'react'
import { Search } from 'lucide-react'
import MissionCard from '../shared/MissionCard'
import EmptyState from '../../components/UI/EmptyState'
import TopBarA from '../../design/TopBar'
import { T } from '../../design/tokens'
import { KpiCard, Pill, LiveDot, Eyebrow, GridBg } from '../../design/primitives'
import { formatDate } from '../../lib/formatters'

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

        {/* ─── Grid 2 colonnes : missions (2/3) + panel latéral (1/3) ─── */}
        {missions.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Aucune mission disponible"
            description="Les missions apparaissent ici en temps réel"
            action={{ label: 'Voir les missions', onClick: () => onNavigate('missions') }}
          />
        ) : (
        <div className="worker-dash-grid" style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24,
        }}>
          {/* ─ Gauche : missions sélectionnées ─ */}
          <div className="a-card" style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '22px 26px 14px', borderBottom: `1px solid ${T.color.g2}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Pour vous · matching &gt; 90 %</Eyebrow>
                <div style={{
                  marginTop: 6, fontSize: 20, fontWeight: 700, color: T.color.ink,
                  letterSpacing: '-0.015em',
                }}>
                  Missions sélectionnées <span style={{
                    fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand,
                  }}>pour vous</span>
                </div>
              </div>
              <Pill variant="brand" size="sm">{missions.length} nouvelle{missions.length > 1 ? 's' : ''}</Pill>
            </div>

            <div style={{ padding: 16 }}>
              {missions.slice(0, 3).map(m => (
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

          {/* ─ Droite : side panel (mission en cours, prochain paiement, profil) ─ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Mission en cours (navy card) */}
            {worker?.current_mission && (
              <div style={{
                background: T.color.navy, borderRadius: 18, padding: 24,
                color: '#fff', position: 'relative', overflow: 'hidden',
              }}>
                <GridBg opacity={0.25} />
                <div style={{ position: 'relative' }}>
                  <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Mission en cours</Eyebrow>
                  <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
                    {worker.current_mission.title}
                    <br />
                    <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brandXL }}>
                      {worker.current_mission.accent || 'démarre bientôt'}.
                    </span>
                  </div>
                  {worker.current_mission.subtitle && (
                    <div style={{ marginTop: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.7)' }}>
                      {worker.current_mission.subtitle}
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate('mission-detail', worker.current_mission)}
                    style={{
                      marginTop: 18, width: '100%', background: '#fff', color: T.color.ink,
                      border: 'none', padding: '12px 0', borderRadius: 999,
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}
                  >Voir les détails →</button>
                </div>
              </div>
            )}

            {/* Prochain paiement */}
            {(worker?.next_payment_eur != null || worker?.next_payment_date) && (
              <div className="a-card" style={{ padding: 22 }}>
                <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Prochain paiement</Eyebrow>
                <div style={{
                  marginTop: 12, fontSize: 34, fontWeight: 800, color: T.color.ink,
                  letterSpacing: '-0.03em', fontFamily: T.font.body, lineHeight: 1,
                }}>{worker.next_payment_eur ? `${Math.round(worker.next_payment_eur)} €` : '—'}</div>
                {worker.next_payment_date && (
                  <div style={{ fontSize: 12, color: T.color.g5, marginTop: 6 }}>
                    Versement {formatDate(worker.next_payment_date)}
                  </div>
                )}
                {worker.next_payment_progress != null && (
                  <>
                    <div style={{ marginTop: 14, height: 6, background: T.color.g1, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(0, worker.next_payment_progress))}%`,
                        height: '100%', background: T.color.brand, borderRadius: 99,
                        transition: 'width .6s ease-out',
                      }} />
                    </div>
                    {worker.next_payment_label && (
                      <div style={{ marginTop: 8, fontSize: 11, color: T.color.g5, fontFamily: T.font.mono }}>
                        {worker.next_payment_label}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Profil vérifié */}
            <div className="a-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Profil vérifié</Eyebrow>
                <Pill variant="green" size="xs">{worker?.verification_pct ?? (
                  [worker?.id_verified, worker?.siret_verified, worker?.rc_pro_verified].filter(Boolean).length === 3 ? 100 : 0
                )} %</Pill>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Pièce d\'identité', worker?.id_verified],
                  ['CACES / certification', worker?.rc_pro_verified],
                  ['SIRET vérifié', worker?.siret_verified],
                  ['Attestation URSSAF', worker?.urssaf_verified],
                ].map(([l, ok]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.color.ink }}>
                    <span style={{ color: ok ? T.color.green : T.color.g3, fontWeight: 700 }}>{ok ? '✓' : '·'}</span> {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  )
}
