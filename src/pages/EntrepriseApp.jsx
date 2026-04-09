import React, { useState, lazy, Suspense } from 'react'
import { useAuth } from '../contexts/useAuth'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../hooks/useToast'
import { useCompanyData } from '../hooks/company/useCompanyData'
import { useCompanyActions } from '../hooks/company/useCompanyActions'
import { useChat } from '../hooks/shared/useChat'
import DashboardLayout from '../layouts/DashboardLayout'
import RatingModal from '../components/RatingModal'
import CompanyDashboard from '../features/company/CompanyDashboard'
import CompanyPublishMission from '../features/company/CompanyPublishMission'
import CompanyCandidates from '../features/company/CompanyCandidates'
import CompanyStats from '../features/company/CompanyStats'
import CompanyContracts from '../features/company/CompanyContracts'
import CompanyMessages from '../features/company/CompanyMessages'

const ContractModal = lazy(() => import('../components/ContractModal'))

const EMPTY_FORM = {
  title: '', sector: 'logistique', hourly_rate: '', total_hours: '',
  start_date: '', city: '', address: '', description: '',
  required_skills: [], required_certs: [], urgency: 'normal',
}

export default function EntrepriseApp({ onLogoClick }) {
  const { user, profile, roleData } = useAuth()
  const { t } = useI18n()
  const { toast, showToast } = useToast()

  const [screen, setScreen] = useState('dashboard')
  const [form, setForm] = useState(EMPTY_FORM)
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const data = useCompanyData(user?.id)
  const actions = useCompanyActions(user?.id, {
    showToast,
    setMissions: data.setMissions,
    setInvoices: data.setInvoices,
    missions: data.missions,
  })
  const chat = useChat(user?.id, { onError: msg => showToast(msg, 'error') })

  const company = roleData
  const displayName = company?.name || profile?.email || '—'
  const initials = displayName.slice(0, 2).toUpperCase()

  const tabs = [
    ['dashboard', t('nav_dashboard')],
    ['publier', t('nav_publish')],
    ['messages-e', t('nav_messages')],
    ['stats', t('nav_stats')],
    ['contrats', t('nav_contracts')],
  ]

  const openChatNav = async (pid, pn, mid) => {
    await chat.openChat(pid, pn, mid)
    setScreen('chat')
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

  if (data.loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: 'var(--wh)' }}>
      <div style={{ width: 32, height: 32, background: 'var(--or)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1.5L10 6L2 10.5Z" fill="white" /></svg>
      </div>
      <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement...</div>
    </div>
  )

  return (
    <DashboardLayout role="company" tabs={tabs} activeTab={screen} onTabChange={setScreen} onLogoClick={onLogoClick}>
      {/* Toast */}
      {toast && (
        <div className="toast" style={{ position: 'fixed', top: 16, right: 16, zIndex: 999, background: toast.type === 'error' ? 'var(--rd)' : toast.type === 'warn' ? '#D97706' : 'var(--gr)', color: '#fff', borderRadius: 10, padding: '12px 18px', fontSize: 13, fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,.15)' }}>
          {toast.msg}
        </div>
      )}

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Annuler cette mission ?</div>
            <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 16 }}>Cette action est irréversible. Les travailleurs ayant postulé seront notifiés.</div>
            <textarea className="input" rows={3} style={{ resize: 'none', marginBottom: 16 }} placeholder="Raison de l'annulation (optionnel)..."
              value={actions.cancelReason} onChange={e => actions.setCancelReason(e.target.value)} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { actions.setCancelModal(null); actions.setCancelReason('') }}>Retour</button>
              <button style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 8, background: 'var(--rd)', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                onClick={actions.handleCancel} disabled={actions.actionLoading[actions.cancelModal] === 'cancelling'}>
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

        {screen === 'contrats' && (
          <CompanyContracts
            invoices={data.invoices}
            onExportInvoices={() => actions.exportInvoicesCSV(data.invoices)}
          />
        )}

        {screen === 'messages-e' && !chat.chatPartner && (
          <CompanyMessages
            missions={data.missions}
            onOpenChat={openChatNav}
          />
        )}

        {screen === 'chat' && chat.chatPartner && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 140px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <button onClick={() => { chat.closeChat(); setScreen('messages-e') }} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--g4)', cursor: 'pointer' }}>‹ Retour</button>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{chat.chatPartner.name}</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, background: 'var(--g1)', borderRadius: 10, marginBottom: 12 }}>
              {chat.chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--g4)', fontSize: 13 }}>Démarrez la conversation</div>
              ) : chat.chatMessages.map((msg, i) => {
                const isMine = msg.sender_id === user.id
                return (
                  <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                    <div style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isMine ? 'var(--or)' : 'var(--wh)', color: isMine ? '#fff' : 'var(--bk)', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
                      {msg.content}
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Votre message..." value={chat.chatInput} onChange={e => chat.setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') chat.handleSendMessage() }} style={{ flex: 1 }} />
              <button className="btn-primary" style={{ padding: '10px 18px' }} onClick={chat.handleSendMessage} disabled={chat.sendingMsg || !chat.chatInput.trim()}>
                {chat.sendingMsg ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
