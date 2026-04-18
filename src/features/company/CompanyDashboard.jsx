import React, { useEffect, useMemo, useState } from 'react'
import { Download, Plus } from 'lucide-react'
import { formatAmount, formatDate, SECTOR_LABELS } from '../../lib/formatters'
import TopBarA from '../../design/TopBar'
import { T } from '../../design/tokens'
import { Pill, LiveDot, KpiCard, Eyebrow, Avatar, GridBg } from '../../design/primitives'
import { getMissionApplications } from '../../lib/supabase'

// Helpers ─────────────────────────────────────────────────────

const relativeFromNow = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const secs = Math.round((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return `il y a ${secs} s`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  if (hours < 48) return `hier, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// Format mission subtitle : "Meyzieu · 16 €/h · Démarrage lundi 22/04"
const missionSubtitle = (m) => {
  const parts = []
  if (m?.city) parts.push(m.city)
  if (m?.hourly_rate != null) parts.push(`${m.hourly_rate} €/h`)
  if (m?.start_date) parts.push(`Démarrage ${formatDate(m.start_date)}`)
  return parts.join(' · ')
}

// Format mission title line 1 (avec shift) : "Cariste CACES 3 · Shift 8h-16h"
const missionTitleLine = (m) => {
  if (!m) return ''
  const title = m.title || '—'
  if (m.start_date && m.total_hours) {
    const d = new Date(m.start_date)
    const h1 = d.getUTCHours()
    const h2 = (h1 + parseInt(m.total_hours, 10)) % 24
    return `${title} · Shift ${h1}h-${h2}h`
  }
  return title
}

// Tagline serif italique pour "Mission suivante" : "démarre demain 6h."
const missionStartTagline = (m) => {
  if (!m?.start_date) return 'à planifier'
  const d = new Date(m.start_date)
  const now = new Date()
  const isoDay = d.toISOString().slice(0, 10)
  const todayIso = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString().slice(0, 10)
  const hour = d.getUTCHours()
  if (isoDay === todayIso) return `démarre aujourd'hui ${hour}h.`
  if (isoDay === tomorrowIso) return `démarre demain ${hour}h.`
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  return `démarre ${days[d.getDay()]} ${hour}h.`
}

// ─────────────────────────────────────────────────────────────

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
  // Mission en cours = première matched/active, la suivante = deuxième
  const activeMissions = useMemo(
    () => (missions || []).filter(m => ['matched', 'active', 'open'].includes(m.status)),
    [missions],
  )
  const currentMission = activeMissions[0] || null
  const nextMission = activeMissions[1] || null

  // Candidats top 3 pour la mission en cours (auto-chargés au mount)
  const [topCandidates, setTopCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    if (!currentMission?.id) { setTopCandidates([]); return }
    setCandidatesLoading(true)
    getMissionApplications(currentMission.id).then(({ data }) => {
      if (cancelled) return
      setTopCandidates((data || []).slice(0, 3))
      setCandidatesLoading(false)
    }).catch(() => {
      if (cancelled) return
      setTopCandidates([])
      setCandidatesLoading(false)
    })
    return () => { cancelled = true }
  }, [currentMission?.id])

  // KPIs
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const monthInvoices = useMemo(
    () => (invoices || []).filter(i => {
      const d = new Date(i.created_at)
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear
    }),
    [invoices, thisMonth, thisYear],
  )
  const monthSpent = monthInvoices.reduce((s, i) => s + parseFloat(i.amount_ttc || 0), 0)
  const acceptedCandidates = useMemo(
    () => (missions || []).reduce((acc, m) => acc + (m.accepted_candidates_count || 0), 0),
    [missions],
  )
  const verifiedCount = useMemo(
    () => (missions || []).reduce((acc, m) => acc + (m.verified_candidates_count || 0), 0),
    [missions],
  )
  const avgMatchTime = useMemo(() => {
    const matched = (missions || []).filter(m => m.matched_at && m.created_at)
    if (matched.length === 0) return '—'
    const avgMin = matched.reduce((s, m) => s + (new Date(m.matched_at) - new Date(m.created_at)) / 60000, 0) / matched.length
    return avgMin < 60 ? `${Math.round(avgMin)} min` : avgMin < 1440 ? `${Math.round(avgMin / 60)} h` : `${Math.round(avgMin / 1440)} j`
  }, [missions])

  // Activité 24h : missions créées récemment + factures payées + candidatures acceptées
  const activity = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const items = []

    ;(missions || []).forEach(m => {
      if (m.created_at && new Date(m.created_at).getTime() >= cutoff) {
        items.push({
          when: m.created_at,
          color: T.color.g5,
          label: `Mission publiée · ${m.title || 'sans titre'}`,
        })
      }
      if (m.matched_at && new Date(m.matched_at).getTime() >= cutoff) {
        const workerName = [m.workers?.first_name, m.workers?.last_name].filter(Boolean).join(' ') || 'Un candidat'
        items.push({
          when: m.matched_at,
          color: T.color.green,
          label: `${workerName} a accepté`,
        })
      }
    })

    ;(invoices || []).forEach(i => {
      if (i.paid_at && new Date(i.paid_at).getTime() >= cutoff) {
        items.push({
          when: i.paid_at,
          color: T.color.g5,
          label: `Facture ${i.invoice_number || `#${i.id?.slice(0, 4)}`} payée`,
        })
      }
    })

    if (currentMission && topCandidates.length > 0) {
      const mostRecent = topCandidates.reduce((best, c) => {
        if (!best) return c
        return new Date(c.created_at) > new Date(best.created_at) ? c : best
      }, null)
      if (mostRecent?.created_at && new Date(mostRecent.created_at).getTime() >= cutoff) {
        items.push({
          when: mostRecent.created_at,
          color: T.color.brand,
          label: `${topCandidates.length} profil${topCandidates.length > 1 ? 's' : ''} retenu${topCandidates.length > 1 ? 's' : ''} · ${currentMission.title || 'mission'}`,
        })
      }
    }

    items.sort((a, b) => new Date(b.when) - new Date(a.when))
    return items.slice(0, 4)
  }, [missions, invoices, currentMission, topCandidates])

  // ─── Render ────────────────────────────────────────────────

  const firstName = (displayName || '').split(' ')[0] || ''
  const activeCount = activeMissions.length
  const topBarTitle = activeCount > 0
    ? <>Bonjour {firstName}, <em>{activeCount} mission{activeCount > 1 ? 's' : ''}</em> en cours.</>
    : <>Bonjour {firstName}, prêt à <em>publier</em> ?</>

  return (
    <>
      <TopBarA
        subtitle={`Tableau de bord · ${company?.name || '—'}`}
        title={topBarTitle}
        actions={
          <>
            <button type="button" className="a-btn-ghost-dark" onClick={onExportMissions}>
              <Download size={16} /> Exporter
            </button>
            <button type="button" className="a-btn-primary" onClick={() => onNavigate('publier')}>
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
            value={activeCount}
            sub={(() => {
              const thisWeek = (missions || []).filter(m => {
                const d = new Date(m.created_at)
                return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000
              }).length
              return thisWeek > 0 ? `+${thisWeek} cette semaine` : 'Aucune nouvelle'
            })()}
            accentColor={T.color.brand}
          />
          <KpiCard
            label="CANDIDATS RETENUS"
            value={acceptedCandidates}
            sub={verifiedCount > 0 ? `dont ${verifiedCount} vérifié${verifiedCount > 1 ? 's' : ''}` : '—'}
            accentColor={T.color.ink}
          />
          <KpiCard
            label="TEMPS MOYEN MATCH"
            value={avgMatchTime}
            sub={activeCount > 0 ? 'Calculé sur les missions matchées' : '—'}
            accentColor={T.color.green}
          />
          <KpiCard
            label="BUDGET MENSUEL"
            value={formatAmount(monthSpent)}
            sub={monthInvoices.length > 0 ? `${monthInvoices.length} facture${monthInvoices.length > 1 ? 's' : ''} ce mois` : '—'}
            accentColor={T.color.brandD}
          />
        </div>

        {/* ─── Grid 2 colonnes ─── */}
        <div className="company-dash-grid" style={{
          display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24,
        }}>
          {/* ─ Gauche : MISSION EN COURS + candidats ─ */}
          <MissionEnCoursCard
            mission={currentMission}
            candidates={topCandidates}
            loading={candidatesLoading}
            onLoadCandidates={onLoadCandidates}
            onNavigate={onNavigate}
          />

          {/* ─ Droite : MISSION SUIVANTE + ACTIVITÉ 24H ─ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <MissionSuivanteCard mission={nextMission} />
            <ActivityCard items={activity} />
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────

function MissionEnCoursCard({ mission, candidates, loading, onLoadCandidates, onNavigate }) {
  if (!mission) {
    return (
      <div className="a-card" style={{
        padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 12, textAlign: 'center',
      }}>
        <Eyebrow>Mission en cours</Eyebrow>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.color.ink, letterSpacing: '-0.015em' }}>
          Aucune mission <span className="font-serif-italic" style={{ color: T.color.brand }}>active</span>
        </div>
        <div style={{ fontSize: 13, color: T.color.g5, maxWidth: 360 }}>
          Publiez votre première mission pour recevoir des candidatures en moins de 30 minutes.
        </div>
        <button
          type="button"
          className="a-btn-primary"
          style={{ marginTop: 6 }}
          onClick={() => onNavigate('publier')}
        >+ Publier une mission</button>
      </div>
    )
  }

  const live = candidates?.length > 0
  return (
    <div className="a-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '22px 26px 16px', borderBottom: `1px solid ${T.color.g2}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.4 }}>Mission en cours</Eyebrow>
          <div style={{
            marginTop: 4, fontSize: 19, fontWeight: 700, color: T.color.ink,
            letterSpacing: '-0.015em',
          }}>{missionTitleLine(mission)}</div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: T.color.g5 }}>
            {missionSubtitle(mission)}
          </div>
        </div>
        <Pill variant={live ? 'green' : 'neutral'} size="sm" icon={live ? <LiveDot size={6} /> : null}>
          {live ? `LIVE · ${candidates.length} candidat${candidates.length > 1 ? 's' : ''}` : 'En attente'}
        </Pill>
      </div>

      {/* Candidate rows */}
      <div style={{ padding: '8px 12px 12px' }}>
        {loading && (
          <div style={{ padding: '18px 14px', color: T.color.g5, fontSize: 13 }}>Chargement des candidats…</div>
        )}
        {!loading && candidates.length === 0 && (
          <div style={{ padding: '18px 14px', color: T.color.g5, fontSize: 13 }}>
            Aucun candidat pour l'instant. TEMPO notifie les profils compatibles en temps réel.
          </div>
        )}
        {!loading && candidates.map((c, i) => <CandidateRow key={c.id} application={c} highlighted={i === 0} seed={i + 1} />)}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 26px 20px', borderTop: `1px solid ${T.color.g2}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: T.color.g5 }}>
          {candidates.length > 0
            ? 'Retenez les profils les plus adaptés à cette mission'
            : 'Les candidatures apparaîtront ici en direct'}
        </span>
        <button
          type="button"
          onClick={() => mission?.id && onLoadCandidates?.(mission.id)}
          style={{
            background: 'none', border: 'none', color: T.color.brand,
            fontWeight: 600, fontSize: 12.5, cursor: 'pointer', padding: 0,
          }}
        >Voir tous →</button>
      </div>
    </div>
  )
}

function CandidateRow({ application, highlighted, seed }) {
  const worker = application.workers || {}
  const name = [worker.first_name, worker.last_name].filter(Boolean).join(' ') || 'Candidat'
  const role = [worker.sector || 'Profil', worker.experience_years ? `${worker.experience_years} ans` : null]
    .filter(Boolean).join(' · ')
  const loc = [worker.city, application.distance_km != null ? `${application.distance_km} km` : null]
    .filter(Boolean).join(' · ')
  const rate = worker.hourly_rate_target || application.proposed_rate || worker.hourly_rate || null
  const stars = worker.rating_avg != null ? parseFloat(worker.rating_avg).toFixed(1) : null
  const matchPct = application.match_score != null ? Math.round(application.match_score) : null
  const verified = worker.id_verified && worker.siret_verified

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 14px', borderRadius: 12, marginBottom: 4,
      background: highlighted ? T.color.brandL : 'transparent',
      border: `1px solid ${highlighted ? 'rgba(37,99,235,0.18)' : 'transparent'}`,
    }}>
      <Avatar name={name} seed={seed} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.color.ink }}>{name}</div>
        <div style={{ fontSize: 12, color: T.color.g5, marginTop: 3 }}>
          {[role, loc].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center' }}>
          {stars && <span style={{ fontSize: 11, color: T.color.g6 }}>★ {stars}</span>}
          {stars && rate && <span style={{ fontSize: 11, color: T.color.g3 }}>·</span>}
          {rate && <span style={{ fontSize: 11, color: T.color.ink, fontWeight: 600 }}>{rate} €/h</span>}
          {verified && <>
            <span style={{ fontSize: 11, color: T.color.g3 }}>·</span>
            <Pill variant="neutral" size="xs">Vérifié ✓</Pill>
          </>}
        </div>
      </div>
      {matchPct != null && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.color.brand, fontFamily: T.font.mono }}>{matchPct}%</div>
          <div style={{ fontSize: 10, color: T.color.g5, marginTop: 2 }}>match</div>
        </div>
      )}
      <button type="button" style={{
        padding: '8px 14px', background: T.color.brand, color: '#fff',
        border: 'none', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>Retenir</button>
    </div>
  )
}

function MissionSuivanteCard({ mission }) {
  if (!mission) {
    return (
      <div style={{
        background: T.color.navy, borderRadius: 18, padding: 24,
        color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <GridBg opacity={0.25} />
        <div style={{ position: 'relative' }}>
          <Eyebrow color="rgba(255,255,255,0.5)" style={{ fontSize: 10.5, letterSpacing: 1.4 }}>Mission suivante</Eyebrow>
          <div style={{ marginTop: 10, fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Aucune <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brandXL }}>mission en attente</span>.
          </div>
          <div style={{ marginTop: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
            Publiez une nouvelle mission pour remplir votre calendrier.
          </div>
        </div>
      </div>
    )
  }

  const workerName = [mission.workers?.first_name, mission.workers?.last_name].filter(Boolean).join(' ')
  const confirmed = mission.status === 'matched' || mission.status === 'active'
  const rate = mission.workers?.hourly_rate_target || mission.hourly_rate

  return (
    <div style={{
      background: T.color.navy, borderRadius: 18, padding: 24,
      color: '#fff', position: 'relative', overflow: 'hidden',
    }}>
      <GridBg opacity={0.25} />
      <div style={{ position: 'relative' }}>
        <Eyebrow color="rgba(255,255,255,0.5)" style={{ fontSize: 10.5, letterSpacing: 1.4 }}>Mission suivante</Eyebrow>
        <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          {mission.title}<br />
          <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brandXL }}>
            {missionStartTagline(mission)}
          </span>
        </div>
        {workerName ? (
          <div style={{
            marginTop: 18, display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 12,
          }}>
            <Avatar name={workerName} seed={2} size={36} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{workerName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {confirmed ? 'Confirmée' : 'En attente'}{rate ? ` · ${rate} €/h` : ''}
              </div>
            </div>
            <div style={{
              fontSize: 11, color: confirmed ? T.color.green : T.color.amber,
              fontFamily: T.font.mono,
            }}>{confirmed ? '● OK' : '● WAIT'}</div>
          </div>
        ) : (
          <div style={{ marginTop: 18, fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>
            Aucun prestataire confirmé pour l'instant.
          </div>
        )}
      </div>
    </div>
  )
}

function ActivityCard({ items }) {
  return (
    <div className="a-card" style={{ padding: 22 }}>
      <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.4 }}>Activité · 24 h</Eyebrow>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.length === 0 && (
          <div style={{ fontSize: 12.5, color: T.color.g5 }}>Aucune activité récente.</div>
        )}
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: T.color.ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </div>
            <div style={{ fontSize: 11, color: T.color.g5, fontFamily: T.font.mono, flexShrink: 0 }}>
              {relativeFromNow(item.when)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
