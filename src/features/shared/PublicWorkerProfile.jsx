import React, { useEffect, useState } from 'react'
import { T } from '../../design/tokens'
import { Pill, Eyebrow, Avatar, AvatarStack, GridBg } from '../../design/primitives'
import { getPublicWorkerProfile } from '../../lib/supabase'
import { formatDate, SECTOR_LABELS } from '../../lib/formatters'
import {
  workerBadges,
  workerReturnRate,
  workerLoyalCompanies,
  formatMemberSince,
  resolveProfileVisibility,
  formatName,
} from '../../lib/profileMetrics'

// ═══════════════════════════════════════════════════════════
// Carte de visite publique — travailleur vu par une entreprise
// (ou admin). Lecture seule. Style A strict.
// ═══════════════════════════════════════════════════════════

export default function PublicWorkerProfile({
  workerId,
  viewerRole,          // 'company' | 'admin'
  viewerCompanyId,     // pour calculer hasApplication
  onBack,
  onOpenChat,
  onRetain,            // callback "Retenir ce candidat" — optionnel
  applicationId,       // si consulté depuis une candidature précise
  matchScore,          // match % affiché dans la carte contexte
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!workerId) return
    setLoading(true)
    getPublicWorkerProfile(workerId, viewerCompanyId).then(({ data }) => {
      if (!cancelled) {
        setData(data)
        setLoading(false)
      }
    }).catch(() => { if (!cancelled) { setData(null); setLoading(false) } })
    return () => { cancelled = true }
  }, [workerId, viewerCompanyId])

  if (loading) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: T.color.g5 }}>
        Chargement du profil…
      </div>
    )
  }
  if (!data || !data.worker) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.color.ink, marginBottom: 8 }}>
          Profil <span className="font-serif-italic" style={{ color: T.color.brand }}>indisponible</span>
        </div>
        <div style={{ fontSize: 13, color: T.color.g5, marginBottom: 20 }}>
          Ce profil n'est plus accessible ou vous n'avez pas les permissions.
        </div>
        {onBack && <button type="button" className="a-btn-outline" onClick={onBack}>← Retour</button>}
      </div>
    )
  }

  const { worker, profile, ratings, missions, hasApplication } = data

  const visibility = resolveProfileVisibility(
    viewerRole,
    viewerCompanyId,
    worker.id,
    { hasApplication: hasApplication || !!applicationId, isAdmin: viewerRole === 'admin' },
  )

  const displayName = formatName(worker.first_name, worker.last_name, visibility)
  const initials = ((worker.first_name?.[0] || '') + (worker.last_name?.[0] || '')).toUpperCase() || '··'
  const badges = workerBadges(worker, missions)
  const returnRate = workerReturnRate(missions)
  const loyalCompanies = workerLoyalCompanies(missions)
  const memberSince = formatMemberSince(profile?.created_at || worker.created_at)

  const sectorLabel = SECTOR_LABELS?.[worker.sector] || worker.sector || 'Travailleur'
  const tagline = worker.city ? `${sectorLabel.toLowerCase()} sur ${worker.city}.` : `${sectorLabel.toLowerCase()} disponible.`

  const ratingAvg = worker.rating_avg != null ? parseFloat(worker.rating_avg).toFixed(1).replace('.', ',') : null
  const ratingCount = worker.rating_count || 0
  const missionsDone = worker.missions_completed || missions.filter(m => (m?.missions?.status || m?.status) === 'completed').length

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
            }}>Candidats</button>
            <span>›</span>
            {worker.city && <><span style={{ textTransform: 'capitalize' }}>{worker.city}</span><span>›</span></>}
            <span style={{ color: '#fff' }}>{displayName}</span>
          </div>

          <div style={{
            marginTop: 24, display: 'grid',
            gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'end',
          }} className="public-profile-hero">
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <Avatar name={`${worker.first_name || 'U'} ${worker.last_name || 'W'}`} seed={1} size={72} ring ringColor={T.color.brand} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Eyebrow color="rgba(255,255,255,0.5)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                    Profil · Travailleur
                  </Eyebrow>
                  <h1 style={{
                    margin: 0, fontSize: 48, fontWeight: 800, lineHeight: 1.0,
                    color: '#fff', letterSpacing: '-0.03em', fontFamily: T.font.body,
                  }}>
                    {displayName}
                    <br />
                    <span style={{
                      fontFamily: T.font.serif, fontStyle: 'italic',
                      fontWeight: 400, color: T.color.brandXL, fontSize: 36,
                    }}>{tagline}</span>
                  </h1>
                </div>
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ratingAvg && <Pill variant="white">★ {ratingAvg} · {ratingCount} avis</Pill>}
                <Pill variant="white">{missionsDone} missions réalisées</Pill>
                {worker.experience_years && <Pill variant="white">{worker.experience_years} ans d'exp.</Pill>}
                {visibility === 'preview' && (
                  <Pill variant="white">Aperçu · nom complet après candidature</Pill>
                )}
              </div>
            </div>

            {/* Carte contexte : matching ou actions */}
            <div style={{
              padding: '22px 24px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
            }}>
              {matchScore != null ? (
                <>
                  <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                    Matching mission
                  </Eyebrow>
                  <div style={{
                    marginTop: 8, fontSize: 52, fontWeight: 800, color: '#fff',
                    fontFamily: T.font.body, letterSpacing: '-0.035em', lineHeight: 1,
                  }}>
                    {Math.round(matchScore)}
                    <span style={{ color: T.color.brandXL }}>%</span>
                  </div>
                </>
              ) : (
                <>
                  <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                    Actions
                  </Eyebrow>
                  <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
                    Interagir avec <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brandXL }}>ce profil</span>.
                  </div>
                </>
              )}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {onRetain && applicationId && (
                  <button type="button" className="a-btn-primary" style={{ width: '100%' }}
                    onClick={() => onRetain(applicationId)}>
                    Retenir ce candidat →
                  </button>
                )}
                {onOpenChat && hasApplication && (
                  <button type="button" className="a-btn-ghost-dark" style={{ width: '100%' }}
                    onClick={() => onOpenChat(worker.id, displayName)}>
                    Contacter
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT BLANC */}
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
              ['Missions réalisées', missionsDone, missionsDone > 0 ? 'Total depuis inscription' : '—'],
              ['Note moyenne', ratingAvg ? `${ratingAvg}/5` : '—', ratingCount ? `${ratingCount} avis` : 'Aucun avis'],
              ['Taux de retour', returnRate != null ? `${returnRate} %` : '—', 'Clients fidèles'],
              ['Membre depuis', memberSince, worker.city || 'TEMPO'],
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

          {/* Bio — si le worker a écrit une présentation */}
          {worker.bio && worker.bio.trim().length > 0 && (
            <section>
              <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>À propos</Eyebrow>
              <div className="a-card" style={{ padding: 22, marginTop: 8, fontSize: 14, lineHeight: 1.65, color: T.color.g8, fontStyle: 'italic', fontFamily: T.font.serif, fontWeight: 400 }}>
                « {worker.bio} »
              </div>
            </section>
          )}

          {/* Section 01 · EXPERTISE */}
          <section>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>01 · Expertise</Eyebrow>
            <h2 style={{
              marginTop: 8, fontSize: 24, fontWeight: 700, color: T.color.ink,
              letterSpacing: '-0.02em', fontFamily: T.font.body, lineHeight: 1.15,
            }}>
              Compétences <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>vérifiées</span>.
            </h2>

            <div style={{
              marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
            }}>
              {/* Certifications vérifiées */}
              <div style={{
                padding: '18px 20px', background: '#fff',
                border: `1px solid ${T.color.g2}`, borderRadius: 12,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink, marginBottom: 10 }}>
                  Certifications
                </div>
                {(() => {
                  const certs = []
                  if (worker.id_verified) certs.push('Identité vérifiée')
                  if (worker.siret_verified) certs.push('SIRET actif')
                  if (worker.rc_pro_verified) certs.push('RC Pro en cours')
                  return certs.length > 0 ? certs.map(c => (
                    <div key={c} style={{
                      fontSize: 13, color: T.color.g8, padding: '5px 0', display: 'flex', gap: 8,
                    }}>
                      <span style={{ color: T.color.green, fontWeight: 700 }}>✓</span>{c}
                    </div>
                  )) : <div style={{ fontSize: 12.5, color: T.color.g5 }}>Aucune certification validée</div>
                })()}
              </div>

              {/* Compétences déclarées */}
              <div style={{
                padding: '18px 20px', background: '#fff',
                border: `1px solid ${T.color.g2}`, borderRadius: 12,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink, marginBottom: 10 }}>
                  Compétences
                </div>
                {(worker.skills && worker.skills.length > 0 ? worker.skills : [sectorLabel]).map((s) => (
                  <div key={s} style={{
                    fontSize: 13, color: T.color.g8, padding: '5px 0', display: 'flex', gap: 8,
                  }}>
                    <span style={{ color: T.color.brand, fontWeight: 700 }}>→</span>{s}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Section 02 · AVIS RÉCENTS */}
          <section>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>02 · Avis récents</Eyebrow>
            <h2 style={{
              marginTop: 8, fontSize: 24, fontWeight: 700, color: T.color.ink,
              letterSpacing: '-0.02em', fontFamily: T.font.body, lineHeight: 1.15,
            }}>
              Retours d'<span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>entreprises</span>.
            </h2>

            <div className="a-card" style={{ padding: 22, marginTop: 14 }}>
              {ratings.length === 0 ? (
                <div style={{ fontSize: 12.5, color: T.color.g5 }}>Aucun avis pour l'instant.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {ratings.slice(0, 3).map((r, i) => {
                    const raterName = [r.rater?.first_name, r.rater?.last_name].filter(Boolean).join(' ') || 'Anonyme'
                    const firstName = r.rater?.first_name || 'Anonyme'
                    const lastInit = r.rater?.last_name ? `${r.rater.last_name[0]}.` : ''
                    return (
                      <div key={r.id || i} style={{ display: 'flex', gap: 12 }}>
                        <Avatar name={raterName} seed={i + 2} size={36} />
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

          {/* Section 03 · ENTREPRISES FIDÈLES */}
          {loyalCompanies.length > 0 && (
            <section>
              <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>03 · Entreprises fidèles</Eyebrow>
              <div className="a-card" style={{ padding: 22, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AvatarStack names={loyalCompanies.map(c => c.name)} size={36} />
                  <div style={{ fontSize: 13, color: T.color.g8, lineHeight: 1.55 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: T.color.ink }}>{loyalCompanies.length} entreprise{loyalCompanies.length > 1 ? 's' : ''}</span> ont rebooké ce profil.
                    </div>
                    <div style={{ color: T.color.g5, marginTop: 2 }}>
                      Total {loyalCompanies.reduce((s, c) => s + c.count, 0)} missions récurrentes
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Droite — Badges + KYC */}
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
                  Les badges apparaîtront dès que la plateforme aura suffisamment de données.
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

          {/* Profil vérifié */}
          <div className="a-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Profil vérifié</Eyebrow>
              {(() => {
                const checks = [worker.id_verified, worker.siret_verified, worker.rc_pro_verified]
                const done = checks.filter(Boolean).length
                const pct = Math.round((done / checks.length) * 100)
                return <Pill variant={pct === 100 ? 'green' : 'amber'} size="xs">{pct} %</Pill>
              })()}
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ["Pièce d'identité", worker.id_verified],
                ['SIRET actif', worker.siret_verified],
                ['RC Pro valide', worker.rc_pro_verified],
              ].map(([label, ok]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.color.ink }}>
                  <span style={{ color: ok ? T.color.green : T.color.g3, fontWeight: 700 }}>{ok ? '✓' : '·'}</span>{label}
                </div>
              ))}
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
