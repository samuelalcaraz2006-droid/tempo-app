import React from 'react'
import { Search } from 'lucide-react'
import MissionCard from '../shared/MissionCard'
import EmptyState from '../../components/UI/EmptyState'
import TopBarA from '../../design/TopBar'
import { T } from '../../design/tokens'
import { KpiCard, Pill, LiveDot, Eyebrow, GridBg } from '../../design/primitives'
import { formatDate } from '../../lib/formatters'

export default function WorkerDashboard({
  worker, displayName, missions, allMissions = [], invoices = [],
  urgentMissions, applications,
  onNavigate, onApply, applying, savedMissions, onToggleSave, onViewCompany,
}) {
  const hasApplied = (id) => applications.some(a => a.mission_id === id)
  const firstName = (displayName || '').split(' ')[0] || ''

  // ─── Mission en cours (active/matched) ─────────────────
  const currentMission = React.useMemo(() => {
    const assigned = (allMissions || []).filter(m => ['active', 'matched'].includes(m?.missions?.status || m?.status))
    const first = assigned[0]
    if (!first) return null
    const m = first.missions || first
    // Calcule un tagline italique depuis start_date (« démarre lundi 8h »)
    let tagline = 'démarre bientôt'
    if (m.start_date) {
      const d = new Date(m.start_date)
      const now = new Date()
      const isoDay = d.toISOString().slice(0, 10)
      const todayIso = now.toISOString().slice(0, 10)
      const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
      const tomorrowIso = tomorrow.toISOString().slice(0, 10)
      const hour = d.getUTCHours()
      const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
      if (isoDay === todayIso) tagline = `démarre aujourd'hui ${hour}h`
      else if (isoDay === tomorrowIso) tagline = `démarre demain ${hour}h`
      else tagline = `démarre ${days[d.getDay()]} ${hour}h`
    }
    const companyName = m.companies?.name || ''
    return {
      id: m.id,
      title: m.title,
      accent: tagline,
      companyName,
      companyId: m.company_id || m.companies?.id,
      companies: m.companies,
      city: m.city,
      subtitle: [companyName, m.city].filter(Boolean).join(' · '),
      raw: m,
    }
  }, [allMissions])

  // ─── Prochain paiement ──────────────────────────────────
  const payment = React.useMemo(() => {
    const pending = (invoices || []).filter(i => i.status === 'draft' || i.status === 'pending')
    const totalPending = pending.reduce((s, i) => s + parseFloat(i.worker_payout || 0), 0)
    const paidCount = (invoices || []).filter(i => i.status === 'paid').length
    const totalCount = (invoices || []).length
    const progress = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0
    // Date approximée : vendredi prochain
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=dimanche
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
    const next = new Date(now); next.setDate(now.getDate() + daysUntilFriday)
    return {
      eur: Math.round(totalPending),
      date: totalPending > 0 ? next.toISOString() : null,
      progress,
      label: totalCount > 0 ? `${paidCount} sur ${totalCount} missions validées` : null,
    }
  }, [invoices])

  // ─── KPIs dérivés ──────────────────────────────────────
  const completedCount = worker?.missions_completed || 0
  const ratingAvg = worker?.rating_avg ? `${parseFloat(worker.rating_avg).toFixed(1).replace('.', ',')}/5` : '—'
  const ratingCount = worker?.rating_count || 0
  const disponibles = missions.length

  // Revenus du mois : somme des invoices payées ce mois
  const monthRevenue = React.useMemo(() => {
    const now = new Date()
    const total = (invoices || []).filter(i => {
      if (i.status !== 'paid' || !i.paid_at) return false
      const d = new Date(i.paid_at)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((s, i) => s + parseFloat(i.worker_payout || 0), 0)
    return total > 0 ? `${Math.round(total)} €` : '—'
  }, [invoices])

  // Taux de retour : % d'entreprises avec ≥ 2 missions terminées
  const returnRate = React.useMemo(() => {
    const completed = (allMissions || []).filter(m => (m?.missions?.status || m?.status) === 'completed')
    if (completed.length === 0) return '—'
    const byCompany = {}
    completed.forEach(a => {
      const cid = a?.missions?.company_id || a?.company_id
      if (cid) byCompany[cid] = (byCompany[cid] || 0) + 1
    })
    const repeatCompanies = Object.values(byCompany).filter(n => n >= 2).length
    const totalCompanies = Object.keys(byCompany).length
    if (totalCompanies === 0) return '—'
    return `${Math.round((repeatCompanies / totalCompanies) * 100)} %`
  }, [allMissions])

  // ─── Profil vérifié ─────────────────────────────────────
  const verifications = [
    { label: "Pièce d'identité", ok: !!worker?.id_verified },
    { label: 'CACES / certification', ok: !!worker?.rc_pro_verified },
    { label: 'SIRET vérifié', ok: !!worker?.siret_verified },
    { label: 'Attestation URSSAF', ok: !!worker?.siret_verified }, // fallback même champ
  ]
  const verifiedCount = verifications.filter(v => v.ok).length
  const verificationPct = Math.round((verifiedCount / verifications.length) * 100)

  const title = disponibles > 0
    ? <><span>{firstName ? `Bonjour ${firstName}, ` : ''}</span><em>{disponibles} mission{disponibles > 1 ? 's' : ''}</em> vous attendent.</>
    : <><span>{firstName ? `Bonjour ${firstName}, ` : ''}</span>prêt pour votre <em>prochaine mission</em> ?</>

  return (
    <>
      <TopBarA
        subtitle={`${worker?.sector || 'Travailleur'}${worker?.city ? ` · ${worker.city}` : ''}`}
        title={title}
        actions={
          <>
            <button type="button" className="a-btn-ghost-dark" onClick={() => onNavigate('profil')}>
              Mes disponibilités
            </button>
            <button type="button" className="a-btn-primary" onClick={() => onNavigate('missions')}>
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
          <button
            type="button"
            onClick={() => onNavigate('missions')}
            style={{
              position: 'relative', overflow: 'hidden',
              background: T.color.navy, borderRadius: 18, border: 'none',
              padding: '22px 26px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 18,
              color: '#fff', textAlign: 'left', width: '100%',
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
                À saisir maintenant.
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
          </button>
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
                    onViewCompany={onViewCompany}
                  />
                </div>
              ))}
            </div>

            <div style={{
              padding: '14px 26px 20px', borderTop: `1px solid ${T.color.g2}`,
              textAlign: 'center',
            }}>
              <button
                type="button"
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
            {/* Mission en cours (navy card) — affichée même vide pour matcher la maquette */}
            <div style={{
              background: T.color.navy, borderRadius: 18, padding: 24,
              color: '#fff', position: 'relative', overflow: 'hidden',
            }}>
              <GridBg opacity={0.25} />
              <div style={{ position: 'relative' }}>
                <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10, letterSpacing: 1.4 }}>Mission en cours</Eyebrow>
                {currentMission ? (
                  <>
                    <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800, letterSpacing: '-0.022em', lineHeight: 1.1, color: '#fff' }}>
                      {currentMission.title}
                      <br />
                      <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brandXL }}>
                        {currentMission.accent}.
                      </span>
                    </div>
                    {(currentMission.companyName || currentMission.city) && (
                      <div style={{ marginTop: 12, fontSize: 12.5, color: 'rgba(255,255,255,0.65)' }}>
                        {onViewCompany && currentMission.companyId && currentMission.companyName ? (
                          <button
                            type="button"
                            onClick={() => onViewCompany(currentMission.companyId, currentMission.companies)}
                            style={{
                              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                              color: T.color.brandXL, fontWeight: 600, fontSize: 'inherit', fontFamily: 'inherit',
                              textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: 'rgba(96,165,250,.4)',
                            }}
                          >{currentMission.companyName}</button>
                        ) : (
                          <span>{currentMission.companyName || '—'}</span>
                        )}
                        {currentMission.city ? ` · ${currentMission.city}` : ''}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => onNavigate('mission-detail', currentMission.raw)}
                      style={{
                        marginTop: 16, width: '100%', background: '#fff', color: T.color.ink,
                        border: 'none', padding: '11px 0', borderRadius: 999,
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >Voir les détails →</button>
                  </>
                ) : (
                  <>
                    <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#fff' }}>
                      Aucune <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brandXL }}>mission active</span>.
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
                      Explorez les missions disponibles et postulez en 1 clic.
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('missions')}
                      style={{
                        marginTop: 16, width: '100%', background: '#fff', color: T.color.ink,
                        border: 'none', padding: '11px 0', borderRadius: 999,
                        fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      }}
                    >Explorer les missions →</button>
                  </>
                )}
              </div>
            </div>

            {/* Prochain paiement — toujours affiché */}
            <div className="a-card" style={{ padding: 22 }}>
              <Eyebrow style={{ fontSize: 10, letterSpacing: 1.4 }}>Prochain paiement</Eyebrow>
              <div style={{
                marginTop: 10, fontSize: 28, fontWeight: 800, color: T.color.ink,
                letterSpacing: '-0.025em', fontFamily: T.font.body, lineHeight: 1,
              }}>{payment.eur > 0 ? `${payment.eur} €` : '—'}</div>
              {payment.date && (
                <div style={{ fontSize: 12, color: T.color.g5, marginTop: 6 }}>
                  Versement {formatDate(payment.date)}
                </div>
              )}
              {!payment.date && payment.eur <= 0 && (
                <div style={{ fontSize: 12, color: T.color.g5, marginTop: 6 }}>
                  Aucune facture en attente
                </div>
              )}
              {payment.label && (
                <>
                  <div style={{ marginTop: 12, height: 6, background: T.color.g1, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, Math.max(0, payment.progress))}%`,
                      height: '100%', background: T.color.brand, borderRadius: 99,
                      transition: 'width .6s ease-out',
                    }} />
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: T.color.g5, fontFamily: T.font.mono }}>
                    {payment.label}
                  </div>
                </>
              )}
            </div>

            {/* Profil vérifié */}
            <div className="a-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow style={{ fontSize: 10, letterSpacing: 1.4 }}>Profil vérifié</Eyebrow>
                <Pill variant={verificationPct === 100 ? 'green' : 'amber'} size="xs">{verificationPct} %</Pill>
              </div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {verifications.map(({ label, ok }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.color.ink }}>
                    <span style={{ color: ok ? T.color.green : T.color.g3, fontWeight: 700 }}>{ok ? '✓' : '·'}</span> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .worker-dash-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </>
  )
}
