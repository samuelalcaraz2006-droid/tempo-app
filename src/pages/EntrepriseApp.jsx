import React, { lazy, Suspense, useEffect, useState } from 'react'
import RatingModal from '../components/RatingModal'
import Toast from '../components/UI/Toast'
import { useI18n } from '../contexts/I18nContext'
import { useAuth } from '../contexts/useAuth'
import CompanyCandidates from '../features/company/CompanyCandidates'
import CompanyContracts from '../features/company/CompanyContracts'
import CompanyDashboard from '../features/company/CompanyDashboard'
import CompanyMessages from '../features/company/CompanyMessages'
import CompanyProfile from '../features/company/CompanyProfile'
import CompanyPublishMission from '../features/company/CompanyPublishMission'
import CompanyStats from '../features/company/CompanyStats'
import ChatView from '../features/shared/ChatView'
import { useCompanyActions } from '../hooks/company/useCompanyActions'
import { useCompanyData } from '../hooks/company/useCompanyData'
import { useToast } from '../hooks/useToast'
import DashboardLayout from '../layouts/DashboardLayout'

const ContractModal = lazy(() => import('../components/ContractModal'))

const EMPTY_FORM = {
  title: '',
  sector: 'logistique',
  hourly_rate: '',
  total_hours: '',
  start_date: '',
  city: '',
  address: '',
  description: '',
  required_skills: [],
  required_certs: [],
  urgency: 'normal',
}

export default function EntrepriseApp({ onLogoClick }) {
  const { user, profile, roleData, refreshRoleData, logout } = useAuth()
  const { t } = useI18n()
  const { toast, showToast, dismissToast } = useToast()

  const [screen, setScreen] = useState('dashboard')
  const [form, setForm] = useState(EMPTY_FORM)
  const [profileForm, setProfileForm] = useState({})
  const [chatTarget, setChatTarget] = useState(null)
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const data = useCompanyData(user?.id)
  const actions = useCompanyActions(user?.id, {
    showToast,
    setMissions: data.setMissions,
    setInvoices: data.setInvoices,
    missions: data.missions,
    refreshRoleData,
  })

  const company = roleData
  const displayName = company?.name || profile?.email || '—'
  const initials = displayName.slice(0, 2).toUpperCase()

  // Initialiser le formulaire profil quand les données entreprise chargent
  useEffect(() => {
    if (company) {
      setProfileForm({
        name: company.name || '',
        siret: company.siret || '',
        city: company.city || '',
        address: company.address || '',
        sector: company.sector || '',
        contact_name: company.contact_name || '',
        contact_phone: company.contact_phone || '',
      })
    }
  }, [company?.id])

  const tabs = [
    ['dashboard', t('nav_dashboard')],
    ['publier', t('nav_publish')],
    ['messages-e', t('nav_messages')],
    ['stats', t('nav_stats')],
    ['contrats', t('nav_contracts')],
    ['profil-e', t('nav_profile')],
  ]

  const openChatNav = (pid, pn, mid) => {
    setChatTarget({ partnerId: pid, partnerName: pn, missionId: mid || null })
    setScreen('chat')
  }
  const closeChat = () => {
    setChatTarget(null)
    setScreen('messages-e')
  }

  const handleLoadCandidates = async (missionId) => {
    await actions.loadCandidates(missionId)
    setScreen('candidatures')
  }

  const handleDuplicate = (m) => actions.duplicateMission(m, setForm, setScreen)
  const handleRepublish = (m) => actions.handleRepublishRecurring(m, setForm, setScreen)
  const handleLoadTemplate = (tpl) => actions.loadTemplate(tpl, setForm)

  const handleNewMission = () => {
    actions.setPublished(false)
    setForm(EMPTY_FORM)
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
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M2 1.5L10 6L2 10.5Z" fill="white" />
          </svg>
        </div>
        <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement...</div>
      </div>
    )

  return (
    <DashboardLayout role="company" tabs={tabs} activeTab={screen} onTabChange={setScreen} onLogoClick={onLogoClick}>
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Contract modal */}
      {actions.contractModal && (
        <Suspense fallback={null}>
          <ContractModal
            mission={actions.contractModal.mission}
            company={company}
            worker={{ first_name: actions.contractModal.workerName }}
            role="company"
            onSign={actions.handleSignContract}
            onClose={() => actions.setContractModal(null)}
            signing={actions.signingContract}
          />
        </Suspense>
      )}

      {/* Rating modal */}
      {actions.ratingModal && (
        <RatingModal
          rateeName={actions.ratingModal.rateeName}
          loading={actions.ratingLoading}
          onSubmit={actions.handleRatingSubmit}
          onClose={() => actions.setRatingModal(null)}
        />
      )}

      {/* Cancel modal */}
      {actions.cancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{ background: 'var(--wh)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Annuler cette mission ?</div>
            <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 16 }}>
              Cette action est irréversible. Les travailleurs ayant postulé seront notifiés.
            </div>
            <textarea
              className="input"
              rows={3}
              style={{ resize: 'none', marginBottom: 16 }}
              placeholder="Raison de l'annulation (optionnel)..."
              value={actions.cancelReason}
              onChange={(e) => actions.setCancelReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => {
                  actions.setCancelModal(null)
                  actions.setCancelReason('')
                }}
              >
                Retour
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'var(--rd)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                onClick={actions.handleCancel}
                disabled={actions.actionLoading[actions.cancelModal] === 'cancelling'}
              >
                {actions.actionLoading[actions.cancelModal] === 'cancelling' ? '...' : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', width: '100%' }}>
        {screen === 'dashboard' && (
          <CompanyDashboard
            displayName={displayName}
            missions={data.missions}
            invoices={data.invoices}
            company={company}
            actionLoading={actions.actionLoading}
            signedContracts={actions.signedContracts}
            onNavigate={setScreen}
            onDuplicate={handleDuplicate}
            onComplete={(missionId, workerId, workerName) => actions.handleCompleteMission(missionId, workerId, workerName, data.missions)}
            onOpenContract={actions.setContractModal}
            onOpenChat={openChatNav}
            onRepublish={handleRepublish}
            onCancelModal={actions.setCancelModal}
            onExportMissions={() => actions.exportMissionsCSV(data.missions)}
            onLoadCandidates={handleLoadCandidates}
          />
        )}

        {screen === 'publier' && (
          <CompanyPublishMission
            form={form}
            setF={setF}
            publishing={actions.publishing}
            published={actions.published}
            templates={actions.templates}
            showTemplates={actions.showTemplates}
            setShowTemplates={actions.setShowTemplates}
            onPublish={() => actions.handlePublish(form)}
            onSaveTemplate={(name) => actions.saveAsTemplate(name, form)}
            onLoadTemplate={handleLoadTemplate}
            onDeleteTemplate={actions.deleteTemplate}
            onNewMission={handleNewMission}
            onNavigateDashboard={() => setScreen('dashboard')}
          />
        )}

        {screen === 'candidatures' && (
          <CompanyCandidates
            candidates={actions.candidates}
            actionLoading={actions.actionLoading}
            onAccept={actions.handleAccept}
            onReject={actions.handleReject}
            onBack={() => setScreen('dashboard')}
          />
        )}

        {screen === 'stats' && (
          <CompanyStats
            missions={data.missions}
            invoices={data.invoices}
            company={company}
            onExportMissions={() => actions.exportMissionsCSV(data.missions)}
            onExportInvoices={() => actions.exportInvoicesCSV(data.invoices)}
          />
        )}

        {screen === 'contrats' && <CompanyContracts invoices={data.invoices} onExportInvoices={() => actions.exportInvoicesCSV(data.invoices)} />}

        {screen === 'profil-e' && (
          <CompanyProfile
            company={company}
            profile={profile}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            onSave={actions.handleSaveCompanyProfile}
            saving={actions.savingProfile}
            displayName={displayName}
            initials={initials}
            onLogout={logout}
          />
        )}

        {screen === 'messages-e' && !chatTarget && <CompanyMessages userId={user?.id} onOpenChat={openChatNav} />}

        {screen === 'chat' && chatTarget && (
          <ChatView
            userId={user?.id}
            partnerId={chatTarget.partnerId}
            partnerName={chatTarget.partnerName}
            contextMissionId={chatTarget.missionId}
            onBack={closeChat}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
