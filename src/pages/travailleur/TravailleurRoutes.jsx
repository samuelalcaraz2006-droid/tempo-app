// ═══════════════════════════════════════════════════════════════
// TravailleurRoutes — routeur interne de l'espace travailleur.
//
// Extrait de TravailleurApp.jsx pour réduire la taille du parent
// (762 → ~400 lignes). Orchestration + état restent dans
// TravailleurApp ; ce composant ne fait QUE le rendu conditionnel
// selon `screen`.
//
// Toutes les props arrivent du parent — pas de state ici.
// ═══════════════════════════════════════════════════════════════

import ChatView from '../../features/shared/ChatView'
import PublicCompanyProfile from '../../features/shared/PublicCompanyProfile'
import NotificationsView from '../../features/shared/NotificationsView'
import WorkerAlerts from '../../features/worker/WorkerAlerts'
import WorkerApplications from '../../features/worker/WorkerApplications'
import WorkerCalendar from '../../features/worker/WorkerCalendar'
import WorkerDashboard from '../../features/worker/WorkerDashboard'
import WorkerEarnings from '../../features/worker/WorkerEarnings'
import WorkerMessages from '../../features/worker/WorkerMessages'
import WorkerMissionDetail from '../../features/worker/WorkerMissionDetail'
import WorkerMissionHub from '../../features/worker/WorkerMissionHub'
import WorkerMissionsList from '../../features/worker/WorkerMissionsList'
import WorkerProfile from '../../features/worker/WorkerProfile'
import WorkerSavedMissions from '../../features/worker/WorkerSavedMissions'

export default function TravailleurRoutes({
  // Écran actuel
  screen,
  // Données
  worker,
  profile,
  data,
  displayName,
  initials,
  badges,
  urgentMissions,
  // État local parent
  selectedMission,
  chatTarget,
  viewCompany,
  viewCompanyId,
  profileForm,
  savedMissions,
  savedAlerts,
  blockedDays,
  mapView,
  unreadCount,
  // Hooks
  filters,
  actions,
  // Helpers parent
  user,
  t,
  hasApplied,
  navigate,
  toggleSave,
  openCompanyProfile,
  openChatNav,
  closeChat,
  setScreen,
  setSelectedMission,
  setChatTarget,
  setProfileForm,
  setSavedAlerts,
  setBlockedDays,
  setMapView,
  logout,
  refreshRoleData,
  showToast,
  handleNotifNavigate,
  KycUploadSection,
}) {
  // Dashboard (full width hero)
  if (screen === 'accueil') {
    return (
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
    )
  }

  // Mission detail (full width hero)
  if (screen === 'mission-detail') {
    return (
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
    )
  }

  // Écrans dans un conteneur maxWidth 1100
  return (
    <div className="app-main-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
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
        <WorkerSavedMissions
          missions={data.missions}
          savedMissions={savedMissions}
          hasApplied={hasApplied}
          applying={actions.applying}
          onApply={actions.handleApply}
          onToggleSave={toggleSave}
          onNavigate={navigate}
          onViewCompany={openCompanyProfile}
          onBack={() => setScreen('missions')}
        />
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
          onRate={(m) => actions.setRatingModal({
            missionId: m.id,
            rateeId: m.companies?.id,
            companyName: m.companies?.name || "l'entreprise",
          })}
          onNavigate={navigate}
          onViewCompany={openCompanyProfile}
          t={t}
        />
      )}

      {screen === 'gains' && (
        <WorkerEarnings worker={worker} invoices={data.invoices} allMissions={data.allMissions} t={t} />
      )}

      {screen === 'messages' && !chatTarget && (
        <WorkerMessages userId={user?.id} onOpenChat={openChatNav} />
      )}

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
          onNavigate={handleNotifNavigate}
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

      {screen === 'calendrier' && (
        <WorkerCalendar
          blockedDays={blockedDays}
          setBlockedDays={setBlockedDays}
          onBack={() => setScreen('profil')}
        />
      )}

      {screen === 'mission-hub' && selectedMission && (
        <WorkerMissionHub
          mission={selectedMission}
          worker={worker}
          onBack={() => setScreen('accueil')}
          onOpenChat={openChatNav}
          onOpenContract={() => {
            actions.setContractModal?.({
              missionId: selectedMission.id,
              mission: selectedMission,
              companyName: selectedMission?.companies?.name || 'Entreprise',
              companyId: selectedMission?.company_id || selectedMission?.companies?.id,
            })
          }}
          onViewCompany={openCompanyProfile}
          showToast={showToast}
        />
      )}
    </div>
  )
}
