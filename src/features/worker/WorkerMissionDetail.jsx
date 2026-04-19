import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { formatDate } from '../../lib/formatters'
import { T } from '../../design/tokens'
import { Pill, LiveDot, GridBg, Eyebrow, AvatarStack, Avatar } from '../../design/primitives'
import { equipmentFor } from '../../lib/equipmentGuidelines'

// ─────────────────────────────────────────────────────────────
// Helpers dérivés
// ─────────────────────────────────────────────────────────────

const relativeFromNow = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  if (mins < 1440) return `il y a ${Math.round(mins / 60)} h`
  return `il y a ${Math.round(mins / 1440)} j`
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

// Tagline serif italique automatique :
// Priorité à l'heure du shift (« du matin », « de l'après-midi », « du soir »)
// Fallback sur urgency ou message générique.
const deriveTagline = (mission) => {
  if (mission.tagline) return mission.tagline
  if (mission.start_date) {
    const d = new Date(mission.start_date)
    const hour = d.getUTCHours()
    if (hour < 12) return 'pour shift du matin.'
    if (hour < 18) return "pour shift de l'après-midi."
    return 'pour shift du soir.'
  }
  if (mission.urgency === 'urgent' || mission.urgency === 'immediate') {
    return 'pour renfort urgent.'
  }
  return 'à saisir maintenant.'
}

// H2 éditorial de la section 01 : « Renfort équipe [rôle] pour le pic [jour]. »
const deriveSectionHeadline = (mission) => {
  const rawRole = mission.title?.split(/\s+/).slice(0, 2).join(' ').toLowerCase() || 'prestation'
  const day = mission.start_date
    ? DAYS[new Date(mission.start_date).getDay()]
    : null
  const accent = day
    ? `pour le pic ${day}.`
    : mission.urgency === 'urgent'
    ? 'en urgence.'
    : 'sur mesure.'
  return { prefix: `Renfort équipe ${rawRole}`, accent }
}

// Horaires affichés : « 8h → 16h »
const deriveHoraires = (mission) => {
  if (!mission.start_date || !mission.total_hours) return '—'
  const d = new Date(mission.start_date)
  const h1 = d.getUTCHours()
  const h2 = (h1 + parseInt(mission.total_hours, 10)) % 24
  return `${h1}h → ${h2}h`
}

// ─────────────────────────────────────────────────────────────

export default function WorkerMissionDetail({
  mission, hasApplied, applying, onApply, onBack,
  isSaved, onToggleSave, onViewCompany,
}) {
  const [apps, setApps] = useState([])
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let cancelled = false
    if (!mission?.id) { setApps([]); return }
    import('../../lib/supabase').then(({ getMissionApplicationsCount }) =>
      getMissionApplicationsCount(mission.id).then(({ data }) => {
        if (!cancelled) setApps(data || [])
      }),
    ).catch(() => { if (!cancelled) setApps([]) })
    return () => { cancelled = true }
  }, [mission?.id])

  useEffect(() => {
    let cancelled = false
    if (!mission?.company_id && !mission?.companies?.id) { setReviews([]); return }
    const companyId = mission.company_id || mission.companies?.id
    import('../../lib/supabase').then(({ getCompanyReviews }) =>
      getCompanyReviews(companyId, 2).then(({ data }) => {
        if (!cancelled) setReviews(data || [])
      }),
    ).catch(() => { if (!cancelled) setReviews([]) })
    return () => { cancelled = true }
  }, [mission?.company_id, mission?.companies?.id])

  if (!mission) return null

  const companyName = mission.companies?.name || 'Entreprise'
  const companyInitial = companyName.slice(0, 1).toUpperCase()
  const totalBrut = mission.total_hours
    ? `${Math.round(mission.hourly_rate * mission.total_hours)} €`
    : `${mission.hourly_rate} €/h`

  const matchScore = mission.match_score != null ? Math.round(mission.match_score) : null
  const computedTagline = deriveTagline(mission)
  const sectionHeadline = deriveSectionHeadline(mission)
  const horairesLabel = deriveHoraires(mission)
  const publishedAgo = relativeFromNow(mission.published_at || mission.created_at)

  const equipment = Array.isArray(mission.equipment_provided) && mission.equipment_provided.length
    ? mission.equipment_provided
    : equipmentFor(mission.sector)

  // Candidats
  const applicationsCount = apps.length
  const applicationsAccepted = apps.filter(a => a.status === 'accepted' || a.status === 'retained').length
  const applicationsPending = apps.filter(a => a.status === 'pending').length
  const applicantNames = apps.slice(0, 4)
    .map(a => [a.workers?.first_name, a.workers?.last_name].filter(Boolean).join(' '))
    .filter(Boolean)

  // Pourquoi ce match — critères dérivés mission
  const matchCriteria = [
    [
      mission.required_certs?.[0] || 'Profil qualifié',
      mission.required_certs?.[0] ? 'Valide et à jour' : 'Expérience sectorielle',
      matchScore != null ? `${matchScore} %` : '100 %',
    ],
    [
      'Distance',
      mission.city ? `Poste à ${mission.city}` : 'Compatible',
      '98 %',
    ],
    [
      'Expérience',
      mission.required_skills?.[0] || `${mission.sector || 'Secteur'} — profil adapté`,
      '96 %',
    ],
    [
      'Disponibilité',
      mission.start_date ? `Libre ${formatDate(mission.start_date)}` : 'Compatible',
      '100 %',
    ],
  ]

  return (
    <>
      {/* ═══ HERO NAVY ═══ */}
      <div className="mission-detail-hero" style={{
        position: 'relative', background: T.color.navy,
        padding: '28px 48px 48px', overflow: 'hidden',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        color: '#fff',
      }}>
        <GridBg opacity={0.22} />
        <div style={{
          position: 'absolute', top: '-40%', right: '-5%', width: 520, height: 520,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)',
        }} />

        <div style={{ position: 'relative', maxWidth: 1400, margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div className="mission-detail-breadcrumb" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 12, color: 'rgba(255,255,255,0.55)',
            fontFamily: T.font.mono, letterSpacing: 0.8,
          }}>
            <button type="button" onClick={onBack} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)',
              cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit',
            }}>Missions</button>
            <span>›</span>
            {mission.sector && <>
              <span style={{ textTransform: 'capitalize' }}>{mission.sector}</span>
              <span>›</span>
            </>}
            <span style={{ color: '#fff' }}>TEMPO‑{mission.id ? mission.id.slice(0, 4).toUpperCase() : '—'}</span>
          </div>

          <div className="mission-detail-hero-grid" style={{
            marginTop: 24, display: 'grid',
            gridTemplateColumns: '1fr 340px', gap: 40,
            alignItems: 'end',
          }}>
            <div style={{ minWidth: 0 }}>
              {/* 3 pills */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
                <Pill variant="white" icon={<LiveDot color={T.color.brandXL} size={6} />}>
                  {publishedAgo ? `Publiée · ${publishedAgo}` : 'Publiée'}
                </Pill>
                {mission.urgency === 'urgent' && <Pill variant="white">🔥 Urgent</Pill>}
                {mission.urgency === 'immediate' && <Pill variant="white">⚡ Immédiat</Pill>}
                {mission.companies?.verified !== false && <Pill variant="white">Vérifié</Pill>}
                <button
                  type="button"
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

              {/* H1 massif 2 lignes */}
              <h1 className="mission-detail-h1" style={{
                margin: 0, fontSize: 60, fontWeight: 800, lineHeight: 0.96,
                color: '#fff', letterSpacing: '-0.04em', fontFamily: T.font.body,
                maxWidth: 780,
              }}>
                {mission.title}
                <br />
                <span className="serif" style={{
                  fontFamily: T.font.serif, fontStyle: 'italic',
                  fontWeight: 400, color: T.color.brandXL,
                }}>{computedTagline}</span>
              </h1>

              {/* Ligne entreprise */}
              <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="button"
                  onClick={() => onViewCompany?.(mission.company_id, mission.companies)}
                  style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: '#fff', display: 'grid', placeItems: 'center',
                    color: T.color.ink, fontSize: 16, fontWeight: 800,
                    cursor: onViewCompany ? 'pointer' : 'default', flexShrink: 0,
                    border: 'none',
                  }}
                >{companyInitial}</button>
                <div>
                  <button
                    type="button"
                    onClick={() => onViewCompany?.(mission.company_id, mission.companies)}
                    style={{
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      cursor: onViewCompany ? 'pointer' : 'default',
                      background: 'none', border: 'none', padding: 0,
                    }}
                  >{companyName}</button>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    {mission.companies?.rating_avg ? `★ ${parseFloat(mission.companies.rating_avg).toFixed(1)}` : '★ —'}
                    {mission.companies?.missions_posted ? ` · ${mission.companies.missions_posted} missions publiées` : ''}
                    {' · Client fidèle'}
                  </div>
                </div>
              </div>
            </div>

            {/* Matching card glass */}
            <div style={{
              padding: '26px 28px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              minWidth: 280,
            }}>
              <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                Votre matching
              </Eyebrow>
              <div style={{
                marginTop: 10, fontSize: 64, fontWeight: 800, color: '#fff',
                fontFamily: T.font.body, letterSpacing: '-0.04em', lineHeight: 0.95,
              }}>
                {matchScore != null ? matchScore : '—'}
                <span style={{ color: T.color.brandXL, fontWeight: 700 }}>{matchScore != null ? '%' : ''}</span>
              </div>
              <div style={{
                marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55,
              }}>
                {mission.required_certs?.[0] ? `${mission.required_certs[0]} à jour` : 'Profil qualifié'}
                {mission.city ? ` · ${mission.city}` : ''}
              </div>
              <button
                type="button"
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
        padding: '32px 48px', display: 'grid',
        gridTemplateColumns: '1.5fr 1fr', gap: 32,
        maxWidth: 1400, margin: '0 auto', width: '100%',
      }} className="mission-detail-grid">
        {/* ─── Gauche : key facts + description + skills/equipment ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Key facts strip */}
          <div className="a-card mission-detail-keyfacts" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden', padding: 0,
          }}>
            {[
              ['Taux horaire', `${mission.hourly_rate} €`, 'brut · majoré dimanche'],
              ['Durée', mission.total_hours ? `${mission.total_hours} h` : 'À définir', mission.start_date ? formatDate(mission.start_date) : ''],
              ['Horaires', horairesLabel, '30 min pause déj.'],
              ['Total brut', totalBrut, 'Versé sous 48 h'],
            ].map(([l, v, s], i) => (
              <div key={l} style={{
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

          {/* Section 01 · La mission */}
          <section>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>01 · La mission</Eyebrow>
            <h2 style={{
              marginTop: 8, fontSize: 26, fontWeight: 700, color: T.color.ink,
              letterSpacing: '-0.02em', fontFamily: T.font.body, lineHeight: 1.15,
            }}>
              {sectionHeadline.prefix}{' '}
              <span style={{
                fontFamily: T.font.serif, fontStyle: 'italic',
                fontWeight: 400, color: T.color.brand,
              }}>{sectionHeadline.accent}</span>
            </h2>
            {mission.description && (
              <p style={{
                marginTop: 14, fontSize: 15, lineHeight: 1.65, color: T.color.g8,
              }}>{mission.description}</p>
            )}

            {/* 2 cards : Compétences + Équipement */}
            <div className="mission-detail-cards-2col" style={{
              marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
            }}>
              <div style={{
                padding: '18px 20px', background: '#fff',
                border: `1px solid ${T.color.g2}`, borderRadius: 12,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink, marginBottom: 10 }}>
                  Compétences requises
                </div>
                {(mission.required_skills?.length ? mission.required_skills : ['Expérience secteur', 'Ponctualité', 'Autonomie']).map((it) => (
                  <div key={it} style={{
                    fontSize: 13, color: T.color.g8,
                    padding: '5px 0', display: 'flex', gap: 8,
                  }}>
                    <span style={{ color: T.color.brand, fontWeight: 700 }}>→</span>{it}
                  </div>
                ))}
              </div>
              <div style={{
                padding: '18px 20px', background: '#fff',
                border: `1px solid ${T.color.g2}`, borderRadius: 12,
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink, marginBottom: 10 }}>
                  Équipement fourni
                </div>
                {equipment.map((it) => (
                  <div key={it} style={{
                    fontSize: 13, color: T.color.g8,
                    padding: '5px 0', display: 'flex', gap: 8,
                  }}>
                    <span style={{ color: T.color.brand, fontWeight: 700 }}>→</span>{it}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ─── Droite : autres candidats + pourquoi ce match + avis ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Autres candidats */}
          <div className="a-card" style={{ padding: 22 }}>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>Autres candidats</Eyebrow>
            {applicationsCount === 0 ? (
              <div style={{ marginTop: 14, fontSize: 13, color: T.color.g8, lineHeight: 1.55 }}>
                <div style={{ fontWeight: 700, color: T.color.ink }}>Soyez le premier à postuler.</div>
                <div style={{ color: T.color.g5, marginTop: 2 }}>Les candidatures apparaîtront ici en direct.</div>
              </div>
            ) : (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                {applicantNames.length > 0 && (
                  <AvatarStack names={applicantNames} size={36} />
                )}
                <div style={{ fontSize: 13, color: T.color.g8, lineHeight: 1.55 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: T.color.ink }}>{applicationsCount} candidat{applicationsCount > 1 ? 's' : ''}</span> ont déjà postulé.
                  </div>
                  <div style={{ color: T.color.g5, marginTop: 2 }}>
                    {applicationsAccepted} retenu{applicationsAccepted > 1 ? 's' : ''} · {applicationsPending} en attente
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pourquoi ce match — navy card */}
          <div style={{
            background: T.color.navy, borderRadius: 18, padding: 26,
            color: '#fff', position: 'relative', overflow: 'hidden',
          }}>
            <GridBg opacity={0.25} />
            <div style={{ position: 'relative' }}>
              <Eyebrow color="rgba(255,255,255,0.55)" style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
                Pourquoi ce match ?
              </Eyebrow>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {matchCriteria.map(([l, s, v]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{l}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{s}</div>
                    </div>
                    <div style={{
                      fontFamily: T.font.mono, fontSize: 14, fontWeight: 700,
                      color: T.color.brandXL,
                    }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Avis récents */}
          <div className="a-card" style={{ padding: 22 }}>
            <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6 }}>
              Avis récents · {companyName}
            </Eyebrow>
            {reviews.length === 0 ? (
              <div style={{ marginTop: 14, fontSize: 12.5, color: T.color.g5 }}>
                Aucun avis pour l'instant.
              </div>
            ) : (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {reviews.map((r, i) => {
                  const raterName = [r.rater?.first_name, r.rater?.last_name].filter(Boolean).join(' ') || 'Anonyme'
                  const firstName = r.rater?.first_name || 'Anonyme'
                  const lastInit = r.rater?.last_name ? `${r.rater.last_name[0]}.` : ''
                  return (
                    <div key={r.id || i} style={{ display: 'flex', gap: 12 }}>
                      <Avatar name={raterName} size={32} seed={i + 2} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.color.ink }}>
                            {firstName} {lastInit}
                          </div>
                          <div style={{ fontSize: 11, color: T.color.amber, letterSpacing: 1 }}>
                            {'★'.repeat(Math.round(r.score || 5))}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: T.color.g8, marginTop: 4, lineHeight: 1.5 }}>
                          {r.comment || 'Mission validée.'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 900px) {
          .mission-detail-grid { grid-template-columns: 1fr !important; padding: 24px 20px !important; gap: 24px !important; }
          .mission-detail-hero-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
        @media (max-width: 640px) {
          .mission-detail-hero { padding: 20px 16px 32px !important; }
          .mission-detail-breadcrumb { font-size: 11px !important; flex-wrap: wrap !important; }
          .mission-detail-h1 { font-size: 32px !important; line-height: 1.05 !important; }
          .mission-detail-h1 span.serif { font-size: 22px !important; }
          .mission-detail-keyfacts { grid-template-columns: 1fr 1fr !important; }
          .mission-detail-keyfacts > div { padding: 14px 16px !important; border-right: 0 !important; border-bottom: 1px solid var(--g2) !important; }
          .mission-detail-keyfacts > div:nth-child(2) { border-right: 0 !important; }
          .mission-detail-cards-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}
