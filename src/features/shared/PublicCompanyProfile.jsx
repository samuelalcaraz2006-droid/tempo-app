import React, { useEffect, useState } from 'react'
import { T } from '../../design/tokens'
import { Pill, Eyebrow, Avatar, AvatarStack, GridBg } from '../../design/primitives'
import { getPublicCompanyProfile } from '../../lib/supabase'
import { formatDate, SECTOR_LABELS } from '../../lib/formatters'
import {
  companyBadges,
  companyAvgPaymentDelay,
  companyHonoredRate,
  formatMemberSince,
} from '../../lib/profileMetrics'

// ═══════════════════════════════════════════════════════════
// Carte de visite publique — entreprise vue par un travailleur
// (ou admin). Lecture seule. Style A strict.
// ═══════════════════════════════════════════════════════════

export default function PublicCompanyProfile({
  companyId,
  onBack,
  onSelectMission,   // callback ouvrir une mission (si mission list visible)
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!companyId) return
    setLoading(true)
    getPublicCompanyProfile(companyId).then(({ data }) => {
      if (!cancelled) {
        setData(data)
        setLoading(false)
      }
    }).catch(() => { if (!cancelled) { setData(null); setLoading(false) } })
    return () => { cancelled = true }
  }, [companyId])

  if (loading) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: T.color.g5 }}>
        Chargement du profil…
      </div>
    )
  }
  if (!data || !data.company) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.color.ink, marginBottom: 8 }}>
          Entreprise <span className="font-serif-italic" style={{ color: T.color.brand }}>indisponible</span>
        </div>
        {onBack && <button type="button" className="a-btn-outline" onClick={onBack}>← Retour</button>}
      </div>
    )
  }

  const { company, profile, ratings, missions, invoices, rebookingStats } = data

  const companyName = company.name || 'Entreprise'
  const companyInitial = companyName.slice(0, 1).toUpperCase()
  const memberSince = formatMemberSince(profile?.created_at || company.created_at)

  const badges = companyBadges(company, invoices, rebookingStats, missions)
  const avgPayHours = companyAvgPaymentDelay(invoices)
  const honoredRate = companyHonoredRate(missions)
  const sectorLabel = SECTOR_LABELS?.[company.sector] || company.sector || ''
  const tagline = company.city ? `basée à ${company.city}.` : 'partenaire TEMPO.'

  const ratingAvg = company.rating_avg != null ? parseFloat(company.rating_avg).toFixed(1).replace('.', ',') : null
  const ratingCount = company.rating_count || 0
  const missionsPosted = missions.length

  // Missions ouvertes accessibles pour le worker qui consulte
  const openMissions = missions.filter(m => m.status === 'open').slice(0, 3)

  // Secteurs actifs (distincts)
  const activeSectors = Array.from(new Set(missions.map(m => m.sector).filter(Boolean)))

  return (
    <>
      {/* HERO NAVY */}
      <div style={{
        position: 'relative', background: T.color.navy,
        padding: '28px 48px 48px', overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff',
      }}>
        <GridBg opacity={0.22} />
        <div style={{
          position: 'absolute', top: '-40%', right: '-5%', width: 500, height: 500,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)',
        }} />

        <div style={{ position: 'relative', maxWidth: 1400, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
            color: 'rgba(255,255,255,0.55)', fontFamily: T.font.mono, letterSpacing: 0.8,
          }}>
            <button type="button" onClick={onBack} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit',
            }}>Entreprises</button>
            <span>›</span>
            {company.city && <><span style={{ textTransform: 'capitalize' }}>{company.city}</span><span>›</span></>}
            <span style={{ color: '#fff' }}>{companyName}</span>
          </div>

          <div style={{
            marginTop: 24, display: 'grid',
            gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'end',
          }} className="public-profile-hero">
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {/* Logo carré blanc */}
                <div style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: '#fff', display: 'grid', placeItems: 'center',
                  color: T.color.ink, fontSize: 28, fontWeight: 800,
                  boxShadow: '0 0 0 3px rgba(37,99,235,.3)',
                }}>{companyInitial}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Eyebrow color="rgba(255,255,255,0.5)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                    Profil · Entreprise
                  </Eyebrow>
                  <h1 style={{
                    margin: 0, fontSize: 48, fontWeight: 800, lineHeight: 1.0,
                    color: '#fff', letterSpacing: '-0.03em', fontFamily: T.font.body,
                  }}>
                    {companyName}
                    <br />
                    <span style={{
                      fontFamily: T.font.serif, fontStyle: 'italic',
                      fontWeight: 400, color: T.color.brandXL, fontSize: 32,
                    }}>{tagline}</span>
                  </h1>
                </div>
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ratingAvg && <Pill variant="white">★ {ratingAvg} · {ratingCount} avis</Pill>}
                <Pill variant="white">{missionsPosted} mission{missionsPosted > 1 ? 's' : ''} publiée{missionsPosted > 1 ? 's' : ''}</Pill>
                {sectorLabel && <Pill variant="white">{sectorLabel}</Pill>}
                {openMissions.length > 0 && <Pill variant="white">{openMissions.length} en recherche</Pill>}
              </div>
            </div>

            {/* Carte contexte — CTA retour si depuis mission detail */}
            <div style={{
              padding: '22px 24px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}>
              <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                Missions ouvertes
              </Eyebrow>
              <div style={{
                marginTop: 8, fontSize: 52, fontWeight: 800, color: '#fff',
                fontFamily: T.font.body, letterSpacing: '-0.035em', lineHeight: 1,
              }}>
                {openMissions.length}
                <span style={{ color: T.color.brandXL, fontSize: 32 }}> en cours</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                {openMissions.length > 0 ? 'Postulez dès maintenant.' : 'Aucune mission active pour l\'instant.'}
              </div>
              {onBack && (
                <button type="button" className="a-btn-ghost-dark" style={{ width: '100%', marginTop: 14 }}
                  onClick={onBack}>← Retour aux missions</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{
        padding: '32px 48px', display: 'grid',
        gridTemplateColumns: '1.5fr 1fr', gap: 32,
        maxWidth: 1400, margin: '0 auto', width: '100%',
      }} className="public-profile-grid">
        {/* Gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Key facts */}
          <div className="a-card" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden', padding: 0,
          }}>
            {[
              ['Missions publiées', missionsPosted, 'Total historique'],
              ['Note moyenne', ratingAvg ? `${ratingAvg}/5` : '—', ratingCount ? `${ratingCount} avis` : 'Aucun avis'],
              ['Délai paiement', avgPayHours != null ? `${avgPayHours} h` : '—', avgPayHours != null ? 'Moyenne factures payées' : '—'],
              ['Missions honorées', honoredRate != null ? `${honoredRate} %` : '—', 'Non annulées'],
            ].map(([l, v, s], i) => (
              <div key={l} style={{
                padding: '20px 22px', borderRight: i < 3 ? `1px solid ${T.color.g2}` : 'none',
              }}>
                <Eyebrow style={{ fontSize: 10, letterSpacing: 1.4 }}>{l}</Eyebrow>
                <div style={{
                  marginTop: 8, fontSize: 24, fontWeight: 800, color: T.color.ink,
                  letterSpacing: '-0.02em', fontFamily: T.font.body, lineHeight: 1,
                }}>{v}</div>
                {s && <div style={{ fontSize: 11, color: T.color.g5, marginTop: 5 }}>{s}</div>}
              </div>
            ))}
          </div>

          {/* Section 01 — À propos */}
          {company.description && (
            <section>
              <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>01 · À propos</Eyebrow>
              <div className="a-card" style={{ padding: 22, marginTop: 8, fontSize: 14, lineHeight: 1.65, color: T.color.g8 }}>
                {company.description}
              </div>
            </section>
          )}

          {/* Section Secteurs actifs */}
          {activeSectors.length > 0 && (
            <section>
              <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                {company.description ? '02' : '01'} · Secteurs actifs
              </Eyebrow>
              <div className="a-card" style={{ padding: 22, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {activeSectors.map(s => (
                    <Pill key={s} variant="brand" size="sm">{SECTOR_LABELS?.[s] || s}</Pill>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section Missions ouvertes */}
          {openMissions.length > 0 && (
            <section>
              <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Missions en cours</Eyebrow>
              <h2 style={{
                marginTop: 8, fontSize: 24, fontWeight: 700, color: T.color.ink,
                letterSpacing: '-0.02em', fontFamily: T.font.body, lineHeight: 1.15,
              }}>
                Postez votre <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>candidature</span>.
              </h2>
              <div className="a-card" style={{ padding: 8, marginTop: 14 }}>
                {openMissions.map((m, i) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => onSelectMission && onSelectMission(m)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 12,
                      background: i === 0 ? T.color.brandL : 'transparent',
                      border: `1px solid ${i === 0 ? 'rgba(37,99,235,0.18)' : 'transparent'}`,
                      cursor: onSelectMission ? 'pointer' : 'default',
                      textAlign: 'left', marginBottom: 4,
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: '#fff', border: `1px solid ${T.color.g2}`,
                      display: 'grid', placeItems: 'center',
                      color: T.color.brand, fontSize: 16, fontWeight: 800, fontFamily: T.font.mono, flexShrink: 0,
                    }}>▤</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.color.ink }}>{m.title || 'Mission'}</div>
                      <div style={{ fontSize: 12, color: T.color.g5, marginTop: 3 }}>
                        {[m.sector, m.created_at ? `Publiée ${formatDate(m.created_at)}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ color: T.color.g4, fontSize: 18 }}>→</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Avis récents */}
          <section>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Avis récents</Eyebrow>
            <h2 style={{
              marginTop: 8, fontSize: 24, fontWeight: 700, color: T.color.ink,
              letterSpacing: '-0.02em', fontFamily: T.font.body, lineHeight: 1.15,
            }}>
              Retours <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>de prestataires</span>.
            </h2>
            <div className="a-card" style={{ padding: 22, marginTop: 14 }}>
              {ratings.length === 0 ? (
                <div style={{ fontSize: 12.5, color: T.color.g5 }}>Aucun avis pour l'instant.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {ratings.slice(0, 3).map((r, i) => {
                    const firstName = r.rater?.first_name || 'Anonyme'
                    const lastInit = r.rater?.last_name ? `${r.rater.last_name[0]}.` : ''
                    return (
                      <div key={r.id || i} style={{ display: 'flex', gap: 12 }}>
                        <Avatar name={firstName} seed={i + 2} size={36} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: T.color.ink }}>{firstName} {lastInit}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ fontSize: 11, color: T.color.amber, letterSpacing: 1 }}>
                                {'★'.repeat(Math.round(r.score || 5))}
                              </div>
                              <div style={{ fontSize: 11, color: T.color.g5, fontFamily: T.font.mono }}>
                                {r.created_at ? formatDate(r.created_at) : ''}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 12.5, color: T.color.g8, marginTop: 4, lineHeight: 1.55 }}>
                            {r.comment || 'Mission validée.'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Droite — Badges + stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Badges navy */}
          <div style={{
            background: T.color.navy, borderRadius: 18, padding: 24,
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <GridBg opacity={0.25} />
            <div style={{ position: 'relative' }}>
              <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                Badges mérités
              </Eyebrow>
              {badges.length === 0 ? (
                <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
                  Les badges apparaîtront avec l'historique sur la plateforme.
                </div>
              ) : (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {badges.map(b => (
                    <div key={b.key} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                      <Pill variant={b.variant} size="xs">{b.label}</Pill>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', flex: 1 }}>{b.sub}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Infos admin */}
          <div className="a-card" style={{ padding: 22 }}>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Informations</Eyebrow>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: T.color.g5 }}>Membre depuis</span>
                <span style={{ color: T.color.ink, fontWeight: 600 }}>{memberSince}</span>
              </div>
              {company.siret && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: T.color.g5 }}>SIRET</span>
                  <span style={{ color: T.color.ink, fontWeight: 600, fontFamily: T.font.mono }}>
                    {company.siret.slice(0, 9)}…
                  </span>
                </div>
              )}
              {rebookingStats && rebookingStats.totalWorkers > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: T.color.g5 }}>Prestataires rebookés</span>
                  <span style={{ color: T.color.ink, fontWeight: 600 }}>
                    {rebookingStats.loyalWorkers} / {rebookingStats.totalWorkers}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .public-profile-hero { grid-template-columns: 1fr !important; }
          .public-profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
