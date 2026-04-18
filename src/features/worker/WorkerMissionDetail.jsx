import React from 'react'
import { Heart } from 'lucide-react'
import { formatDate } from '../../lib/formatters'
import { T } from '../../design/tokens'
import { Pill, LiveDot, GridBg, Eyebrow, AvatarStack } from '../../design/primitives'

export default function WorkerMissionDetail({
  mission, hasApplied, applying, onApply, onBack,
  isSaved, onToggleSave, onViewCompany,
}) {
  if (!mission) return null

  const companyName = mission.companies?.name || 'Entreprise'
  const companyInitial = companyName.slice(0, 1).toUpperCase()
  const netEstime = mission.total_hours ? `~${Math.round(mission.hourly_rate * mission.total_hours * 0.78)} €` : '—'
  const forfaitBrut = mission.total_hours ? `${mission.hourly_rate * mission.total_hours} €` : `${mission.hourly_rate} €/h`

  // Match score — si fourni par l'app, sinon 95 par défaut (affiché en mono)
  const matchScore = mission.match_score != null ? Math.round(mission.match_score) : null

  return (
    <>
      {/* ═══ HERO NAVY ═══ */}
      <div style={{
        position: 'relative', background: T.color.navy,
        padding: '28px 40px 40px', overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: '#fff',
      }}>
        <GridBg opacity={0.22} />
        <div style={{
          position: 'absolute', top: '-40%', right: '-5%', width: 480, height: 480,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 65%)',
        }} />

        <div style={{ position: 'relative' }}>
          {/* Breadcrumb */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, color: 'rgba(255,255,255,0.55)',
            fontFamily: T.font.mono, letterSpacing: 0.8,
          }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit',
            }}>Missions</button>
            <span>›</span>
            {mission.sector && <><span style={{ textTransform: 'capitalize' }}>{mission.sector}</span><span>›</span></>}
            <span style={{ color: '#fff' }}>TEMPO‑{mission.id ? mission.id.slice(0, 6).toUpperCase() : '—'}</span>
          </div>

          <div style={{
            marginTop: 20, display: 'grid',
            gridTemplateColumns: '1fr 320px', gap: 32,
            alignItems: 'end',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                <Pill variant="white" icon={<LiveDot color={T.color.brandXL} size={6} />}>Publiée</Pill>
                {mission.urgency === 'urgent' && <Pill variant="white">🔥 Urgent</Pill>}
                {mission.urgency === 'immediate' && <Pill variant="white">⚡ Immédiat</Pill>}
                <button
                  onClick={() => onToggleSave(mission.id)}
                  aria-label={isSaved ? 'Retirer des favoris' : 'Sauvegarder'}
                  style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: isSaved ? T.color.brandXL : '#fff', cursor: 'pointer',
                    padding: '5px 10px', borderRadius: 999, display: 'inline-flex',
                    alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.3,
                  }}
                >
                  <Heart size={12} style={{ fill: isSaved ? 'currentColor' : 'none' }} />
                  {isSaved ? 'Sauvé' : 'Sauver'}
                </button>
              </div>
              <h1 style={{
                margin: 0, fontSize: 60, fontWeight: 800, lineHeight: 0.96,
                color: '#fff', letterSpacing: '-0.04em', fontFamily: T.font.body,
                maxWidth: 780,
              }}>
                {mission.title}
                {mission.tagline && (
                  <>
                    <br />
                    <span style={{
                      fontFamily: T.font.serif, fontStyle: 'italic',
                      fontWeight: 400, color: T.color.brandXL,
                    }}>{mission.tagline}</span>
                  </>
                )}
              </h1>
              {mission.objet_prestation && !mission.tagline && (
                <p style={{
                  marginTop: 18, fontSize: 20, color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.4, fontStyle: 'italic', fontFamily: T.font.serif,
                  fontWeight: 400, maxWidth: 680,
                }}>
                  « {mission.objet_prestation.length > 150 ? mission.objet_prestation.slice(0, 150) + '…' : mission.objet_prestation} »
                </p>
              )}
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  onClick={() => onViewCompany && onViewCompany(mission.company_id, mission.companies)}
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: '#fff', display: 'grid', placeItems: 'center',
                    color: T.color.ink, fontSize: 16, fontWeight: 800,
                    cursor: onViewCompany ? 'pointer' : 'default', flexShrink: 0,
                  }}
                >{companyInitial}</div>
                <div>
                  <div
                    onClick={() => onViewCompany && onViewCompany(mission.company_id, mission.companies)}
                    style={{
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      cursor: onViewCompany ? 'pointer' : 'default',
                    }}
                  >{companyName}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    {mission.companies?.rating_avg ? `★ ${parseFloat(mission.companies.rating_avg).toFixed(1)}` : '★ —'}
                    {' · '}{mission.city}
                  </div>
                </div>
              </div>
            </div>

            {/* Matching card */}
            <div style={{
              padding: '26px 28px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              minWidth: 280,
            }}>
              <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Votre matching</Eyebrow>
              <div style={{
                marginTop: 10, fontSize: 80, fontWeight: 800, color: '#fff',
                fontFamily: T.font.body, letterSpacing: '-0.05em', lineHeight: 0.9,
              }}>
                {matchScore != null ? matchScore : '—'}
                <span style={{ color: T.color.brandXL, fontWeight: 700 }}>{matchScore != null ? '%' : ''}</span>
              </div>
              <div style={{
                marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55,
              }}>
                {mission.required_certs?.length > 0 ? mission.required_certs.slice(0, 2).join(' · ') : (mission.city ? `Poste à ${mission.city}` : 'Compatibilité estimée')}
              </div>
              <button
                className="a-btn-primary"
                style={{ width: '100%', marginTop: 16, padding: '14px 0', fontSize: 13.5 }}
                disabled={hasApplied || applying}
                onClick={() => onApply(mission, hasApplied)}
              >
                {applying ? 'Envoi...' : hasApplied ? '✓ Candidature envoyée' : 'Postuler → Confirmer en 1 clic'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{
        padding: '32px 40px', display: 'grid',
        gridTemplateColumns: '1.5fr 1fr', gap: 32,
        maxWidth: 1400, margin: '0 auto', width: '100%',
      }}>
        {/* Left — key facts + description + skills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Key facts strip */}
          <div className="a-card" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden', padding: 0,
          }}>
            {[
              ['Taux horaire', `${mission.hourly_rate} €`, 'brut HT'],
              ['Durée', mission.total_hours ? `${mission.total_hours} h` : 'À définir', mission.start_date ? formatDate(mission.start_date) : ''],
              ['Horaires', mission.shift_label || '—', '30 min pause déj.'],
              ['Total brut', forfaitBrut !== '—' ? forfaitBrut : netEstime, 'Versé sous 48 h'],
            ].map(([l, v, s], i) => (
              <div key={i} style={{
                padding: '22px 24px',
                borderRight: i < 3 ? `1px solid ${T.color.g2}` : 'none',
              }}>
                <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>{l}</Eyebrow>
                <div style={{
                  marginTop: 10, fontSize: 28, fontWeight: 800, color: T.color.ink,
                  letterSpacing: '-0.03em', fontFamily: T.font.body, lineHeight: 1,
                }}>{v}</div>
                {s && <div style={{ fontSize: 11, color: T.color.g5, marginTop: 6 }}>{s}</div>}
              </div>
            ))}
          </div>

          {/* Description */}
          <section>
            <Eyebrow>01 · La mission</Eyebrow>
            <h2 style={{
              marginTop: 8, fontSize: 24, fontWeight: 700, color: T.color.ink,
              letterSpacing: '-0.02em', fontFamily: T.font.body,
            }}>
              {mission.sector ? <>Détails <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>{mission.sector}</span></> : 'Détails de la mission'}
            </h2>
            {mission.description && (
              <p style={{
                marginTop: 12, fontSize: 15, lineHeight: 1.65, color: T.color.g8,
              }}>{mission.description}</p>
            )}

            {(mission.required_skills?.length > 0 || mission.required_certs?.length > 0) && (
              <div style={{
                marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
              }}>
                {mission.required_skills?.length > 0 && (
                  <div style={{
                    padding: '18px 20px', background: '#fff',
                    border: `1px solid ${T.color.g2}`, borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink, marginBottom: 10 }}>
                      Compétences requises
                    </div>
                    {mission.required_skills.map((it, k) => (
                      <div key={k} style={{
                        fontSize: 13, color: T.color.g8,
                        padding: '5px 0', display: 'flex', gap: 8,
                      }}>
                        <span style={{ color: T.color.brand, fontWeight: 700 }}>→</span>{it}
                      </div>
                    ))}
                  </div>
                )}
                {mission.required_certs?.length > 0 && (
                  <div style={{
                    padding: '18px 20px', background: '#fff',
                    border: `1px solid ${T.color.g2}`, borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink, marginBottom: 10 }}>
                      Certifications requises
                    </div>
                    {mission.required_certs.map((it, k) => (
                      <div key={k} style={{
                        fontSize: 13, color: T.color.g8,
                        padding: '5px 0', display: 'flex', gap: 8,
                      }}>
                        <span style={{ color: T.color.brand, fontWeight: 700 }}>✓</span>{it}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Location */}
          {mission.city && (
            <section>
              <Eyebrow>02 · Le lieu</Eyebrow>
              <div className="a-card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{
                  position: 'relative', height: 160,
                  background: `linear-gradient(135deg, ${T.color.brandL} 0%, #DBEAFE 100%)`,
                  backgroundImage: `
                    linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)
                  `,
                  backgroundSize: '32px 32px',
                }}>
                  <div style={{ position: 'absolute', top: '40%', left: '45%' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', background: T.color.brand,
                      display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14,
                      boxShadow: '0 6px 18px rgba(37,99,235,.5)',
                    }}>▼</div>
                  </div>
                </div>
                <div style={{
                  padding: '18px 22px', display: 'grid',
                  gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.color.ink }}>
                      {companyName} · {mission.city}
                    </div>
                    {mission.address && (
                      <div style={{ fontSize: 12, color: T.color.g5, marginTop: 3 }}>{mission.address}</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Right column — matching details, legal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="a-card" style={{ padding: 22 }}>
            <Eyebrow>Signature & paiement</Eyebrow>
            <div style={{ marginTop: 14, fontSize: 13, color: T.color.g8, lineHeight: 1.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: T.color.green, fontWeight: 700 }}>✓</span>
                Contrat de prestation auto-généré par TEMPO
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: T.color.green, fontWeight: 700 }}>✓</span>
                Signature électronique incluse
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: T.color.green, fontWeight: 700 }}>✓</span>
                Paiement sécurisé sous 48h après validation
              </div>
            </div>
          </div>

          {/* Pourquoi ce match (placeholder quand match_score non disponible) */}
          <div style={{
            background: T.color.navy, borderRadius: 18, padding: 24,
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <GridBg opacity={0.25} />
            <div style={{ position: 'relative' }}>
              <Eyebrow color="rgba(255,255,255,0.55)">Pourquoi ce match ?</Eyebrow>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Secteur', mission.sector || 'Non spécifié', '✓'],
                  ['Lieu', mission.city || '—', '✓'],
                  ['Taux', `${mission.hourly_rate} €/h`, '✓'],
                  ['Disponibilité', mission.start_date ? formatDate(mission.start_date) : '—', '✓'],
                ].map(([l, s, v], i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{l}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s}</div>
                    </div>
                    <div style={{
                      fontFamily: T.font.mono, fontSize: 13, fontWeight: 700,
                      color: T.color.brandXL,
                    }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Apply CTA sticky */}
          <div className="a-card" style={{
            padding: 20, position: 'sticky', bottom: 20,
            display: 'flex', gap: 10,
          }}>
            <button className="a-btn-outline" style={{ flex: 0 }} onClick={onBack}>← Retour</button>
            <button
              className="a-btn-primary"
              style={{ flex: 1 }}
              disabled={hasApplied || applying}
              onClick={() => onApply(mission, hasApplied)}
            >
              {applying ? 'Envoi...' : hasApplied ? '✓ Candidature envoyée' : 'Postuler →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
