import React, { Suspense, useEffect, useState } from 'react'
import RatingModal from '../components/RatingModal'
import Toast from '../components/UI/Toast'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/useAuth'
import ChatView from '../features/shared/ChatView'
import MissionCard from '../features/shared/MissionCard'
import WorkerAlerts from '../features/worker/WorkerAlerts'
import WorkerApplications from '../features/worker/WorkerApplications'
import WorkerCalendar from '../features/worker/WorkerCalendar'
import PublicCompanyProfile from '../features/shared/PublicCompanyProfile'
import WorkerDashboard from '../features/worker/WorkerDashboard'
import WorkerEarnings from '../features/worker/WorkerEarnings'
import WorkerMessages from '../features/worker/WorkerMessages'
import WorkerMissionDetail from '../features/worker/WorkerMissionDetail'
import WorkerMissionsList from '../features/worker/WorkerMissionsList'
import NotificationsView from '../features/shared/NotificationsView'
import WorkerProfile from '../features/worker/WorkerProfile'
import { useToast } from '../hooks/useToast'
import { useMissionFilters } from '../hooks/worker/useMissionFilters'
import { useWorkerActions } from '../hooks/worker/useWorkerActions'
import { useWorkerData } from '../hooks/worker/useWorkerData'
import DashboardLayout from '../layouts/DashboardLayout'
import { submitKycDocuments, supabase, uploadKycDocument } from '../lib/supabase'
import { logWarn, trackScreen } from '../lib/sentry'

const ContractModal = React.lazy(() => import('../components/ContractModal'))

// ── KYC Upload Section ──
const KYC_DOCS = [
  { key: 'id', field: 'id_doc_url', verifiedField: 'id_verified', label: "Piece d'identite", hint: 'CNI, passeport (JPEG, PNG ou PDF, max 10 Mo)' },
  {
    key: 'siret',
    field: 'siret_doc_url',
    verifiedField: 'siret_verified',
    label: 'Justificatif SIRET',
    hint: 'Extrait Kbis ou avis de situation INSEE (PDF, max 10 Mo)',
  },
  {
    key: 'rcpro',
    field: 'rc_pro_url',
    verifiedField: 'rc_pro_verified',
    label: 'RC Professionnelle',
    hint: 'Attestation RC Pro en cours de validite (PDF, max 10 Mo)',
  },
]

function KycUploadSection({ worker, userId, onUpdate, showToast }) {
  const [uploading, setUploading] = React.useState({})
  const fileRefs = React.useRef({})
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  const handleFile = async (doc, file) => {
    if (!file || !userId) return
    if (!ALLOWED.includes(file.type)) {
      showToast('Type non autorise (JPEG, PNG, WebP ou PDF)', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Fichier trop volumineux (max 10 Mo)', 'error')
      return
    }
    setUploading((u) => ({ ...u, [doc.key]: true }))
    const { url, error } = await uploadKycDocument(userId, doc.key, file)
    if (error || !url) {
      showToast('Erreur upload', 'error')
      setUploading((u) => ({ ...u, [doc.key]: false }))
      return
    }
    const { error: saveErr } = await submitKycDocuments(userId, { [doc.field]: url })
    if (saveErr) showToast('Erreur sauvegarde', 'error')
    else {
      showToast(`${doc.label} depose`, 'success')
      await onUpdate()
    }
    setUploading((u) => ({ ...u, [doc.key]: false }))
  }

  const allVerified = worker?.id_verified && worker?.siret_verified && worker?.rc_pro_verified

  return (
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Documents & verifications KYC</div>
      {allVerified && (
        <div
          style={{
            background: 'var(--gr-l)',
            border: '1px solid var(--gr)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: 'var(--gr-d)',
          }}
        >
          KYC complete — identite verifiee
        </div>
      )}
      {worker?.kyc_rejection_reason && (
        <div
          style={{
            background: 'var(--rd-l)',
            border: '1px solid var(--rd)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 12,
            fontSize: 12,
            color: 'var(--rd)',
          }}
        >
          <strong>Refuses :</strong> {worker.kyc_rejection_reason}
        </div>
      )}
      {KYC_DOCS.map((doc) => {
        const verified = worker?.[doc.verifiedField],
          hasDoc = !!worker?.[doc.field],
          isUp = uploading[doc.key]
        return (
          <div key={doc.key} style={{ padding: '10px 0', borderBottom: '1px solid var(--g1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: verified ? 0 : 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)' }}>{doc.label}</div>
                {!verified && <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>{doc.hint}</div>}
              </div>
              <span className={`badge ${verified ? 'badge-green' : hasDoc ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: 10 }}>
                {verified ? '✓ Vérifié' : hasDoc ? 'En cours' : 'A deposer'}
              </span>
            </div>
            {!verified && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <input
                  ref={(el) => {
                    fileRefs.current[doc.key] = el
                  }}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(doc, e.target.files?.[0])}
                />
                <button type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 11, opacity: isUp ? 0.6 : 1 }}
                  disabled={isUp}
                  onClick={() => fileRefs.current[doc.key]?.click()}
                >
                  {isUp ? 'Upload...' : hasDoc ? 'Remplacer' : 'Deposer'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──
// onNavigate est passé par App.jsx pour une navigation parent mais pas
// encore consommé ici (le router interne utilise `setScreen`). Préfixe `_`
// pour satisfaire biome tout en conservant le prop côté caller.
export default function TravailleurApp({ onNavigate: _onNavigate, onLogoClick }) {
  const { user, profile, roleData, refreshRoleData, logout } = useAuth()
  const { t } = useI18n()
  const { toast, showToast, dismissToast } = useToast()
  const worker = roleData

  const [screen, setScreen] = useState('accueil')
  const [selectedMission, setSelectedMission] = useState(null)
  const [chatTarget, setChatTarget] = useState(null)
  const [viewCompany, setViewCompany] = useState(null)
  const [viewCompanyId, setViewCompanyId] = useState(null)
  const [_companyMissions, setCompanyMissions] = useState([])
  const [disponible, setDisponible] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [mapView, setMapView] = useState(false)
  const [savedMissions, setSavedMissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tempo_saved_missions') || '[]')
    } catch {
      return []
    }
  })
  const [savedAlerts, setSavedAlerts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tempo_saved_alerts') || '[]')
    } catch {
      return []
    }
  })
  const [blockedDays, setBlockedDays] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tempo_blocked_days') || '[]')
    } catch {
      return []
    }
  })
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('tempo_onboarding_done'))
  // Rappel discret qui apparait près du toggle quand le travailleur est
  // indisponible. Affiché à chaque session (pas une seule fois dans la vie
  // du compte) via sessionStorage : si l'utilisateur reste indisponible,
  // on le relance à chaque connexion — mais une fois dismissé dans une
  // session, on ne le réaffiche pas jusqu'à la prochaine ouverture.
  const [showDispoReminder, setShowDispoReminder] = useState(false)
  const dismissDispoReminder = () => {
    setShowDispoReminder(false)
    sessionStorage.setItem('tempo_dispo_reminder_dismissed', '1')
  }

  const data = useWorkerData(user?.id, worker)
  const actions = useWorkerActions(user?.id, {
    showToast,
    setApplications: data.setApplications,
    addSignedContract: data.addSignedContract,
    refreshRoleData,
  })
  const filters = useMissionFilters(data.missions)

  const displayName = worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || profile?.email : profile?.email || '—'
  const initials = worker?.first_name?.[0] || profile?.email?.[0]?.toUpperCase() || '?'
  const unreadCount = data.notifs.filter((n) => !n.read_at).length
  const urgentMissions = data.missions.filter((m) => m.urgency === 'immediate' || m.urgency === 'urgent')

  // Breadcrumb Sentry à chaque changement d'écran — aide au debug
  // des crashes en prod (on voit le chemin exact de l'user avant la stack).
  useEffect(() => { trackScreen('worker', screen) }, [screen])

  useEffect(() => {
    if (!worker) return
    // Nouveau compte : is_available est null/undefined → on bascule en
    // "Disponible" par défaut et on persiste. Le travailleur peut toujours
    // se mettre en indisponible après, mais on part du bon pied.
    if (worker.is_available == null) {
      setDisponible(true)
      actions.toggleDispo(true, () => {})
    } else {
      setDisponible(worker.is_available)
    }
    setProfileForm({
      first_name: worker.first_name || '',
      last_name: worker.last_name || '',
      city: worker.city || '',
      siret: worker.siret || '',
      radius_km: worker.radius_km || 10,
      skills: worker.skills || [],
      certifications: worker.certifications || [],
    })
  }, [worker?.id])

  // Affiche le rappel si le travailleur est indisponible et n'a pas
  // encore dismissé le message dans cette session.
  useEffect(() => {
    if (!worker) return
    if (disponible) {
      setShowDispoReminder(false)
      return
    }
    if (sessionStorage.getItem('tempo_dispo_reminder_dismissed')) return
    // Petit délai pour laisser la page s'installer avant de popover
    const timer = setTimeout(() => setShowDispoReminder(true), 900)
    return () => clearTimeout(timer)
  }, [disponible, worker?.id])

  const badges = React.useMemo(() => {
    const b = []
    if (worker?.missions_completed >= 1) b.push({ icon: '🎯', label: 'Premiere mission', desc: '1 mission' })
    if (worker?.missions_completed >= 5) b.push({ icon: '⭐', label: 'Confirme', desc: '5 missions' })
    if (worker?.missions_completed >= 20) b.push({ icon: '🏆', label: 'Expert', desc: '20 missions' })
    if (worker?.rating_avg >= 4.5 && worker?.rating_count >= 3) b.push({ icon: '💎', label: 'Top performer', desc: 'Note >= 4.5' })
    if (worker?.siret_verified) b.push({ icon: '✓', label: 'SIRET', desc: 'Vérifié' })
    if (worker?.id_verified) b.push({ icon: '🪪', label: 'Identite', desc: 'Validee' })
    if (worker?.rc_pro_verified) b.push({ icon: '🛡️', label: 'RC Pro', desc: 'Validee' })
    if ((profileForm.skills || worker?.skills || []).length >= 5) b.push({ icon: '🔧', label: 'Multi-competent', desc: '5+ competences' })
    return b
  }, [worker, profileForm.skills])

  const hasApplied = (id) => data.applications.some((a) => a.mission_id === id)
  const toggleSave = (id) =>
    setSavedMissions((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('tempo_saved_missions', JSON.stringify(next))
      return next
    })

  const navigate = (target, d) => {
    if (d && target === 'mission-detail') setSelectedMission(d)
    setScreen(target)
  }

  const openCompanyProfile = async (companyId, companyData) => {
    // Résout l'id quel que soit le shape passé (string UUID, object company, object mission.companies)
    const resolvedId =
      typeof companyId === 'string' ? companyId
      : companyId?.id || companyId?.company_id
      || companyData?.id || companyData?.company_id
      || null
    if (!resolvedId) {
      logWarn('[openCompanyProfile] pas de companyId', { ctx: { companyId, companyData } })
      return
    }
    setViewCompanyId(resolvedId)
    setViewCompany(companyData || { id: resolvedId })
    setCompanyMissions([])
    setScreen('company-profile')
    const { data: m } = await supabase
      .from('missions')
      .select('id, title, hourly_rate, city, start_date, total_hours, sector, status')
      .eq('company_id', resolvedId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)
    setCompanyMissions(m || [])
  }

  const openChatNav = (pid, pn, mid) => {
    setChatTarget({ partnerId: pid, partnerName: pn, missionId: mid || null })
    setScreen('chat')
  }
  const closeChat = () => {
    setChatTarget(null)
    setScreen('messages')
  }

  if (data.loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 14,
          background: 'var(--wh)',
        }}
      >
        <div
          style={{ width: 32, height: 32, background: 'var(--or)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 1.5L10 6L2 10.5Z" fill="white" />
          </svg>
        </div>
        <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement...</div>
      </div>
    )

  const headerExtra = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'rgba(255,255,255,.08)', borderRadius: 99 }}>
        <span
          className={disponible ? 'pulse' : ''}
          style={{ width: 7, height: 7, borderRadius: '50%', background: disponible ? 'var(--gr)' : 'var(--g4)', display: 'inline-block' }}
        ></span>
        <span className="hide-mobile" style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{disponible ? 'Disponible' : 'Indisponible'}</span>
        <input
          type="checkbox"
          checked={disponible}
          onChange={(e) => {
            actions.toggleDispo(e.target.checked, setDisponible)
            if (e.target.checked) dismissDispoReminder()
          }}
          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--or)' }}
          aria-describedby={showDispoReminder ? 'dispo-reminder' : undefined}
        />
      </div>
    </div>
  )

  const tabs = [
    ['accueil', t('nav_home'), '◎'],
    ['missions', t('nav_missions'), '▤'],
    ['messages', t('nav_messages'), '✉'],
    ['suivi', t('nav_tracking'), '↗'],
    ['gains', t('nav_earnings'), '€'],
    ['profil', t('nav_profile'), '◉'],
  ]

  return (
    <DashboardLayout
      tabs={tabs}
      activeTab={screen}
      onTabChange={setScreen}
      onLogoClick={onLogoClick}
      headerExtra={headerExtra}
      unreadCount={unreadCount}
      onNotifClick={() => setScreen('notifs')}
    >
      <Toast toast={toast} onDismiss={dismissToast} />

      {showDispoReminder && !showOnboarding && (
        <div
          id="dispo-reminder"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 'calc(54px + env(safe-area-inset-top, 0px) + 8px)',
            right: 12,
            zIndex: 90,
            width: 'min(280px, calc(100vw - 24px))',
            background: 'var(--wh2)',
            border: '1px solid var(--g2)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(15,23,42,.18)',
            padding: '12px 14px',
            animation: 'fadeUp .25s ease-out',
          }}
        >
          {/* Petite pointe qui connecte visuellement la bulle au toggle au-dessus */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -6,
              right: 22,
              width: 12,
              height: 12,
              background: 'var(--wh2)',
              borderLeft: '1px solid var(--g2)',
              borderTop: '1px solid var(--g2)',
              transform: 'rotate(45deg)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 8,
                height: 8,
                marginTop: 6,
                borderRadius: '50%',
                background: 'var(--g4)',
                boxShadow: '0 0 0 4px rgba(148,163,184,.25)',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bk)', marginBottom: 2 }}>
                Tu es indisponible
              </div>
              <div style={{ fontSize: 12, color: 'var(--g5)', lineHeight: 1.5, marginBottom: 10 }}>
                Coche la case à côté du point pour passer en <strong style={{ color: 'var(--gr-d)' }}>Disponible</strong> et recevoir des missions.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    actions.toggleDispo(true, setDisponible)
                    dismissDispoReminder()
                  }}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '7px 12px', fontSize: 12 }}
                >
                  Me mettre dispo
                </button>
                <button
                  type="button"
                  onClick={dismissDispoReminder}
                  aria-label="Plus tard"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--g5)',
                    fontSize: 12,
                    padding: '7px 8px',
                    cursor: 'pointer',
                  }}
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
            padding: 20,
          }}
        >
          <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: 'var(--or)',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 14 14">
                  <path d="M2 1.5L12 7L2 12.5Z" fill="white" />
                </svg>
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Bienvenue sur TEMPO !</div>
            </div>
            {[
              ['Tu es déjà disponible', "Le point vert en haut à droite signale que tu es prêt à recevoir des missions. Coche / décoche la case quand tu veux faire une pause."],
              ['Complete ton profil', "Competences, certifications et zone d'intervention."],
              ['Parcours les missions', 'Filtres, recherche et score de matching.'],
              ['Postule et travaille', 'Contrat et paiement securises.'],
            ].map(([t, d], i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'var(--brand-l)',
                    color: 'var(--or)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--g4)', lineHeight: 1.5 }}>{d}</div>
                </div>
              </div>
            ))}
            <button type="button"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              onClick={() => {
                setShowOnboarding(false)
                localStorage.setItem('tempo_onboarding_done', '1')
              }}
            >
              C'est parti →
            </button>
          </div>
        </div>
      )}

      {actions.contractModal && (
        <Suspense fallback={null}>
          <ContractModal
            mission={actions.contractModal.mission}
            company={{ name: actions.contractModal.companyName }}
            worker={worker}
            onSign={actions.handleSignContract}
            onClose={() => actions.setContractModal(null)}
            signing={actions.signingContract}
          />
        </Suspense>
      )}
      {actions.ratingModal && (
        <RatingModal
          rateeName={actions.ratingModal.companyName}
          loading={actions.ratingLoading}
          onSubmit={actions.handleRatingSubmit}
          onClose={() => actions.setRatingModal(null)}
        />
      )}

      {screen === 'accueil' && (
        <WorkerDashboard
          worker={worker}
          displayName={displayName}
          missions={data.missions}
          allMissions={data.allMissions}
          invoices={data.invoices}
          urgentMissions={urgentMissions}
          applications={data.applications}
          onNavigate={navigate}
          onApply={actions.handleApply}
          applying={actions.applying}
          savedMissions={savedMissions}
          onToggleSave={toggleSave}
          onViewCompany={openCompanyProfile}
        />
      )}

      {/* Mission detail a son propre hero full-width */}
      {screen === 'mission-detail' && (
        <WorkerMissionDetail
          mission={selectedMission}
          hasApplied={hasApplied(selectedMission?.id)}
          applying={actions.applying[selectedMission?.id]}
          onApply={actions.handleApply}
          onBack={() => setScreen('missions')}
          isSaved={savedMissions.includes(selectedMission?.id)}
          onToggleSave={toggleSave}
          onViewCompany={openCompanyProfile}
        />
      )}

      <div className="app-main-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: (screen === 'accueil' || screen === 'mission-detail') ? 'none' : 'block' }}>

        {screen === 'missions' && (
          <WorkerMissionsList
            filters={filters}
            hasApplied={hasApplied}
            applying={actions.applying}
            onApply={actions.handleApply}
            savedMissions={savedMissions}
            onToggleSave={toggleSave}
            onNavigate={navigate}
            onViewCompany={openCompanyProfile}
            mapView={mapView}
            setMapView={setMapView}
          />
        )}

        {screen === 'favoris' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>Missions sauvegardees</div>
                <div style={{ fontSize: 13, color: 'var(--g4)' }}>
                  {savedMissions.length} mission{savedMissions.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button type="button"
                onClick={() => setScreen('missions')}
                style={{ fontSize: 13, color: 'var(--g4)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ‹ Retour
              </button>
            </div>
            {savedMissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g4)', fontSize: 13 }}>Aucune mission sauvegardee</div>
            ) : (
              data.missions
                .filter((m) => savedMissions.includes(m.id))
                .map((m) => (
                  <MissionCard
                    key={m.id}
                    mission={m}
                    applied={hasApplied(m.id)}
                    saved={true}
                    applying={actions.applying[m.id]}
                    onApply={() => actions.handleApply(m, hasApplied(m.id))}
                    onToggleSave={toggleSave}
                    onSelect={() => navigate('mission-detail', m)}
                    onViewCompany={openCompanyProfile}
                  />
                ))
            )}
          </div>
        )}

        {screen === 'suivi' && (
          <WorkerApplications
            allMissions={data.allMissions}
            signedContracts={data.signedContracts}
            ratedMissions={actions.ratedMissions}
            onWithdraw={(id) => actions.handleWithdraw(id, data.setAllMissions)}
            onSignContract={(m) =>
              actions.setContractModal({
                missionId: m.id,
                mission: m,
                companyName: m?.companies?.name || 'Entreprise',
                companyId: m?.company_id || m?.companies?.id,
              })
            }
            onOpenChat={openChatNav}
            onRate={(m) => actions.setRatingModal({ missionId: m.id, rateeId: m.companies?.id, companyName: m.companies?.name || "l'entreprise" })}
            onNavigate={navigate}
            onViewCompany={openCompanyProfile}
            t={t}
          />
        )}

        {screen === 'gains' && <WorkerEarnings worker={worker} invoices={data.invoices} allMissions={data.allMissions} t={t} />}

        {screen === 'messages' && !chatTarget && <WorkerMessages userId={user?.id} onOpenChat={openChatNav} />}

        {screen === 'chat' && chatTarget && (
          <ChatView
            userId={user?.id}
            partnerId={chatTarget.partnerId}
            partnerName={chatTarget.partnerName}
            contextMissionId={chatTarget.missionId}
            onBack={closeChat}
            onOpenMission={(m) => {
              setSelectedMission(m)
              setChatTarget(null)
              setScreen('mission-detail')
            }}
          />
        )}

        {screen === 'profil' && (
          <WorkerProfile
            worker={worker}
            profile={profile}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            onSave={actions.handleSaveProfile}
            savingProfile={actions.savingProfile}
            badges={badges}
            initials={initials}
            displayName={displayName}
            onNavigate={navigate}
            onLogout={logout}
            savedAlerts={savedAlerts}
            KycUploadSection={KycUploadSection}
            userId={user?.id}
            refreshRoleData={refreshRoleData}
            showToast={showToast}
          />
        )}

        {screen === 'notifs' && (
          <NotificationsView
            notifs={data.notifs}
            setNotifs={data.setNotifs}
            userId={user?.id}
            unreadCount={unreadCount}
            onBack={() => setScreen('accueil')}
            onNavigate={(target, payload) => {
              if (target === 'mission-detail' && payload?.missionId) {
                const m = data.missions.find(x => x.id === payload.missionId)
                  || data.allMissions.find(x => (x?.missions?.id || x?.id) === payload.missionId)
                if (m) {
                  setSelectedMission(m.missions || m)
                  setScreen('mission-detail')
                  return
                }
              }
              if (target === 'chat' && payload?.partnerId) {
                openChatNav(payload.partnerId, '', payload.missionId || null)
                return
              }
              if (target === 'disputes') {
                setScreen('suivi') // à défaut de page disputes dédiée
                return
              }
              if (['missions', 'suivi', 'gains', 'profil', 'accueil', 'messages'].includes(target)) {
                setScreen(target)
              }
            }}
          />
        )}

        {screen === 'company-profile' && (
          <PublicCompanyProfile
            companyId={viewCompanyId || viewCompany?.id || viewCompany?.company_id}
            onBack={() => setScreen('missions')}
            onSelectMission={(m) => {
              setSelectedMission(m)
              setScreen('mission-detail')
            }}
          />
        )}

        {screen === 'alertes' && (
          <WorkerAlerts
            savedAlerts={savedAlerts}
            setSavedAlerts={setSavedAlerts}
            filters={filters}
            profileForm={profileForm}
            showToast={showToast}
            onBack={() => setScreen('missions')}
          />
        )}

        {screen === 'calendrier' && <WorkerCalendar blockedDays={blockedDays} setBlockedDays={setBlockedDays} onBack={() => setScreen('profil')} />}
      </div>
    </DashboardLayout>
  )
}
