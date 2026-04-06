import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Moon, Sun, Download, PenLine, MessageCircle, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { supabase, getCompanyMissions, createMission, getMissionApplications, getCompanyInvoices, getNotifications, updateApplicationStatus, assignWorkerToMission, completeMission, createRating, cancelMission, getMessages, sendMessage, subscribeToMessages, saveContract } from '../lib/supabase'

import { isPushSupported, requestPushPermission, sendLocalNotification, getPermissionStatus } from '../lib/pushNotifications'
import { useI18n } from '../contexts/I18nContext'

const ContractModal = lazy(() => import('../components/ContractModal'))

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : '—'
const formatAmount = (n) => n ? `${parseFloat(n).toFixed(0)} €` : '—'

const STAR_LABELS = ['', 'Insuffisant', 'Passable', 'Bien', 'Très bien', 'Excellent !']

const RatingModal = ({ rateeName, onSubmit, onClose, loading }) => {
  const [score, setScore] = React.useState(0)
  const [hover, setHover] = React.useState(0)
  const [comment, setComment] = React.useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--wh)', borderRadius:16, padding:28, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Évaluer la mission</div>
        <div style={{ fontSize:13, color:'var(--g4)', marginBottom:24 }}>Comment s'est passée la collaboration avec <strong>{rateeName}</strong> ?</div>
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:8 }}>
          {[1,2,3,4,5].map(i => (
            <button key={i} onClick={() => setScore(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(0)}
              style={{ fontSize:40, background:'none', border:'none', cursor:'pointer', color: i <= (hover || score) ? 'var(--am)' : 'var(--g2)', transition:'color .1s', padding:0, lineHeight:1 }}>
              ★
            </button>
          ))}
        </div>
        {(hover || score) > 0 && (
          <div style={{ textAlign:'center', fontSize:13, color:'var(--or)', fontWeight:500, marginBottom:16, minHeight:20 }}>
            {STAR_LABELS[hover || score]}
          </div>
        )}
        <textarea className="input" rows={3} style={{ resize:'none', marginBottom:16 }}
          placeholder="Commentaire optionnel..." value={comment} onChange={e => setComment(e.target.value)} />
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={onClose} disabled={loading}>Plus tard</button>
          <button className="btn-primary" style={{ flex:2, justifyContent:'center' }} disabled={!score || loading} onClick={() => onSubmit(score, comment)}>
            {loading ? 'Envoi...' : 'Envoyer l\'évaluation'}
          </button>
        </div>
      </div>
    </div>
  )
}
const SECTORS = ['logistique','btp','industrie','hotellerie','proprete']
const SECTOR_LABELS = { logistique:'Logistique', btp:'BTP', industrie:'Industrie', hotellerie:'Hôtellerie', proprete:'Propreté' }
const STATUS_STYLES = {
  draft:     ['badge-gray','Brouillon'],
  open:      ['badge-blue','Publiée'],
  matched:   ['badge-orange','Matchée'],
  active:    ['badge-orange','En cours'],
  completed: ['badge-green','Terminée'],
  cancelled: ['badge-gray','Annulée'],
}
const INV_STYLES = {
  draft:     ['badge-gray','Brouillon'],
  sent:      ['badge-blue','Envoyée'],
  paid:      ['badge-green','Payée'],
  overdue:   ['badge-red','En retard'],
  cancelled: ['badge-gray','Annulée'],
}

export default function EntrepriseApp({ onNavigate, onLogoClick }) {
  const { user, profile, roleData, refreshRoleData } = useAuth()
  const { locale, switchLocale, t } = useI18n()
  const [screen, setScreen]       = useState('dashboard')
  const [missions, setMissions]   = useState([])
  const [invoices, setInvoices]   = useState([])
  const [notifs, setNotifs]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [toast, setToast]         = useState(null)
  const [selectedMissionId, setSelectedMissionId] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [actionLoading, setActionLoading] = useState({})
  const [ratingModal, setRatingModal] = useState(null)   // { missionId, workerId, workerName }
  const [ratingLoading, setRatingLoading] = useState(false)
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_mission_templates') || '[]') } catch { return [] }
  })
  const [showTemplates, setShowTemplates] = useState(false)
  const [cancelModal, setCancelModal]     = useState(null)
  const [cancelReason, setCancelReason]   = useState('')
  const [chatMessages, setChatMessages]   = useState([])
  const [chatPartner, setChatPartner]     = useState(null)
  const [chatMissionId, setChatMissionId] = useState(null)
  const [chatInput, setChatInput]         = useState('')
  const [sendingMsg, setSendingMsg]       = useState(false)
  const [contractModal, setContractModal] = useState(null)
  const [signingContract, setSigningContract] = useState(false)
  const [signedContracts, setSignedContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_signed_contracts_e') || '[]') } catch { return [] }
  })
  const [darkMode, setDarkMode]           = useState(() => localStorage.getItem('tempo_dark_mode') === '1')

  const company = roleData
  const displayName = company?.name || profile?.email || '—'
  const initials = displayName.slice(0,2).toUpperCase()

  const [form, setForm] = useState({
    title:'', sector:'logistique', hourly_rate:'', total_hours:'',
    start_date:'', city:'', address:'', description:'',
    required_skills:[], required_certs:[], urgency:'normal'
  })
  const setF = (k,v) => setForm(f => ({...f,[k]:v}))

  const showToast = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [mRes, iRes, nRes] = await Promise.all([
        getCompanyMissions(user.id),
        getCompanyInvoices(user.id),
        getNotifications(user.id),
      ])
      if (mRes.data) setMissions(mRes.data)
      if (iRes.data) setInvoices(iRes.data)
      if (nRes.data) setNotifs(nRes.data)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { loadData() }, [loadData])

  // Demander la permission push au premier chargement
  useEffect(() => {
    if (isPushSupported() && getPermissionStatus() === 'default') {
      requestPushPermission()
    }
  }, [])

  // Abonnement realtime messages + notifications push
  useEffect(() => {
    if (!user?.id) return
    const msgSub = subscribeToMessages(user.id, (payload) => {
      if (chatPartner && payload.new.sender_id === chatPartner.id) {
        setChatMessages(prev => [...prev, payload.new])
      }
      sendLocalNotification('Nouveau message', {
        body: payload.new.content?.slice(0, 80) || 'Vous avez reçu un message',
        tag: `msg-${payload.new.id}`,
      })
    })
    return () => { msgSub.unsubscribe() }
  }, [user?.id, chatPartner?.id])

  const handlePublish = async () => {
    if (!form.title || !form.hourly_rate || !form.city || !form.start_date) {
      showToast('Veuillez remplir tous les champs obligatoires', 'error')
      return
    }
    setPublishing(true)
    const { data, error } = await createMission({
      company_id: user.id,
      title: form.title,
      sector: form.sector,
      hourly_rate: parseFloat(form.hourly_rate),
      total_hours: form.total_hours ? parseFloat(form.total_hours) : null,
      start_date: new Date(form.start_date).toISOString(),
      city: form.city,
      address: form.address,
      description: form.description,
      required_skills: form.required_skills,
      required_certs: form.required_certs,
      urgency: form.urgency,
    })
    setPublishing(false)
    if (error) {
      showToast('Erreur lors de la publication : ' + error.message, 'error')
    } else {
      setPublished(true)
      setMissions(prev => [data, ...prev])
      showToast('Mission publiée — les travailleurs sont notifiés !')
    }
  }

  const loadCandidates = async (missionId) => {
    setSelectedMissionId(missionId)
    const { data } = await getMissionApplications(missionId)
    if (data) setCandidates(data)
    setScreen('candidatures')
  }

  const handleAccept = async (candidate) => {
    const key = candidate.id
    setActionLoading(s => ({ ...s, [key]: 'accepting' }))
    const [appRes] = await Promise.all([
      updateApplicationStatus(candidate.id, 'accepted'),
      assignWorkerToMission(selectedMissionId, candidate.workers?.id || candidate.worker_id),
    ])
    setActionLoading(s => ({ ...s, [key]: null }))
    if (appRes.error) { showToast('Erreur lors de l\'acceptation', 'error'); return }
    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'accepted' } : c))
    setMissions(prev => prev.map(m => m.id === selectedMissionId ? { ...m, status: 'matched' } : m))
    showToast(`${candidate.workers?.first_name} accepté — contrat en cours de génération !`)
  }

  const handleReject = async (applicationId) => {
    setActionLoading(s => ({ ...s, [applicationId]: 'rejecting' }))
    const { error } = await updateApplicationStatus(applicationId, 'rejected')
    setActionLoading(s => ({ ...s, [applicationId]: null }))
    if (error) { showToast('Erreur lors du refus', 'error'); return }
    setCandidates(prev => prev.map(c => c.id === applicationId ? { ...c, status: 'rejected' } : c))
  }

  const handleCompleteMission = async (missionId, workerId, workerName) => {
    setActionLoading(s => ({ ...s, [missionId]: 'completing' }))
    const { error } = await completeMission(missionId)
    setActionLoading(s => ({ ...s, [missionId]: null }))
    if (error) { showToast('Erreur lors de la complétion', 'error'); return }
    setMissions(prev => prev.map(m => m.id === missionId ? { ...m, status: 'completed' } : m))
    showToast('Mission marquée comme terminée !')
    setRatingModal({ missionId, rateeId: workerId, rateeName: workerName })
  }

  const handleRatingSubmit = async (score, comment) => {
    if (!ratingModal) return
    setRatingLoading(true)
    await createRating({
      missionId: ratingModal.missionId,
      raterId: user.id,
      ratedId: ratingModal.rateeId,
      raterRole: 'company',
      score,
      comment,
    })
    setRatingLoading(false)
    setRatingModal(null)
    showToast('Évaluation envoyée — merci !')
  }

  const duplicateMission = (m) => {
    setForm({
      title: m.title || '', sector: m.sector || 'logistique', hourly_rate: m.hourly_rate?.toString() || '',
      total_hours: m.total_hours?.toString() || '', start_date: '', city: m.city || '',
      address: m.address || '', description: m.description || '',
      required_skills: m.required_skills || [], required_certs: m.required_certs || [],
      urgency: m.urgency || 'normal'
    })
    setPublished(false)
    setScreen('publier')
    showToast('Mission dupliquée — modifiez et publiez')
  }

  const saveAsTemplate = (name) => {
    const tpl = { id: Date.now(), name, ...form, created_at: new Date().toISOString() }
    const updated = [...templates, tpl]
    setTemplates(updated)
    localStorage.setItem('tempo_mission_templates', JSON.stringify(updated))
    showToast('Template sauvegardé !')
  }

  const loadTemplate = (tpl) => {
    setForm({
      title: tpl.title || '', sector: tpl.sector || 'logistique', hourly_rate: tpl.hourly_rate?.toString() || '',
      total_hours: tpl.total_hours?.toString() || '', start_date: '', city: tpl.city || '',
      address: tpl.address || '', description: tpl.description || '',
      required_skills: tpl.required_skills || [], required_certs: tpl.required_certs || [],
      urgency: tpl.urgency || 'normal'
    })
    setShowTemplates(false)
    showToast('Template chargé — complétez les informations')
  }

  const deleteTemplate = (id) => {
    const updated = templates.filter(t => t.id !== id)
    setTemplates(updated)
    localStorage.setItem('tempo_mission_templates', JSON.stringify(updated))
  }

  const exportCSV = (data, filename) => {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [headers.join(';'), ...data.map(row => headers.map(h => `"${(row[h]??'').toString().replace(/"/g,'""')}"`).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const exportInvoicesCSV = () => {
    const data = invoices.map(inv => ({
      Référence: inv.invoice_number, Travailleur: `${inv.contracts?.workers?.first_name||''} ${inv.contracts?.workers?.last_name||''}`.trim(),
      Date: inv.created_at?.split('T')[0], Montant_HT: inv.amount_ht, Montant_TTC: inv.amount_ttc,
      Commission: inv.commission, Statut: inv.status
    }))
    exportCSV(data, `tempo_factures_${new Date().toISOString().split('T')[0]}.csv`)
    showToast('Export CSV téléchargé')
  }

  const exportMissionsCSV = () => {
    const data = missions.map(m => ({
      Titre: m.title, Secteur: SECTOR_LABELS[m.sector]||m.sector, Ville: m.city,
      Taux_horaire: m.hourly_rate, Heures: m.total_hours, Statut: STATUS_STYLES[m.status]?.[1]||m.status,
      Date_début: m.start_date?.split('T')[0], Date_publication: (m.published_at||m.created_at)?.split('T')[0]
    }))
    exportCSV(data, `tempo_missions_${new Date().toISOString().split('T')[0]}.csv`)
    showToast('Export CSV téléchargé')
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(prev => { const n = !prev; localStorage.setItem('tempo_dark_mode', n ? '1' : '0'); return n })
  }

  const handleCancel = async () => {
    if (!cancelModal) return
    setActionLoading(s => ({ ...s, [cancelModal]: 'cancelling' }))
    const { error } = await cancelMission(cancelModal, cancelReason)
    setActionLoading(s => ({ ...s, [cancelModal]: null }))
    if (error) { showToast('Erreur lors de l\'annulation', 'error'); return }
    setMissions(prev => prev.map(m => m.id === cancelModal ? { ...m, status: 'cancelled' } : m))
    setCancelModal(null)
    setCancelReason('')
    showToast('Mission annulée')
  }

  const openChat = async (partnerId, partnerName, missionId) => {
    setChatPartner({ id: partnerId, name: partnerName })
    setChatMissionId(missionId)
    const { data } = await getMessages(user.id, partnerId, missionId)
    setChatMessages(data || [])
    setScreen('chat')
  }

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatPartner) return
    setSendingMsg(true)
    const { data } = await sendMessage({ senderId: user.id, receiverId: chatPartner.id, missionId: chatMissionId, content: chatInput.trim() })
    if (data) setChatMessages(prev => [...prev, data])
    setChatInput('')
    setSendingMsg(false)
  }

  const handleSignContract = async (signatureData) => {
    if (!contractModal) return
    setSigningContract(true)
    const { error: contractError } = await saveContract({
      mission_id: contractModal.missionId,
      company_id: user.id,
      company_signature: signatureData,
      company_signed_at: new Date().toISOString(),
      status: 'signed_company',
    })
    if (contractError) { showToast('Erreur lors de la signature', 'error'); setSigningContract(false); return }
    const updated = [...signedContracts, contractModal.missionId]
    setSignedContracts(updated)
    localStorage.setItem('tempo_signed_contracts_e', JSON.stringify(updated))
    setSigningContract(false)
    setContractModal(null)
    showToast('Contrat signé avec succès !')
  }

  const handleRepublishRecurring = (m) => {
    setForm({
      title: m.title || '', sector: m.sector || 'logistique', hourly_rate: m.hourly_rate?.toString() || '',
      total_hours: m.total_hours?.toString() || '', start_date: '', city: m.city || '',
      address: m.address || '', description: m.description || '',
      required_skills: m.required_skills || [], required_certs: m.required_certs || [],
      urgency: m.urgency || 'normal'
    })
    setPublished(false)
    setScreen('publier')
    showToast('Mission récurrente — ajustez la date et publiez')
  }

  const activeMissions   = missions.filter(m => ['open','matched','active'].includes(m.status))
  const completedMissions = missions.filter(m => m.status === 'completed')
  const totalMois = invoices.filter(i => new Date(i.created_at).getMonth() === new Date().getMonth()).reduce((s,i) => s + parseFloat(i.amount_ttc||0), 0)
  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'draft')

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, background:'var(--wh)' }}>
      <div style={{ width:32, height:32, background:'var(--or)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1.5L10 6L2 10.5Z" fill="white"/></svg>
      </div>
      <div style={{ fontSize:13, color:'var(--g4)' }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--wh)', display:'flex', flexDirection:'column' }}>
      {toast && (
        <div className="toast" style={{ position:'fixed', top:16, right:16, zIndex:999, background:toast.type==='error'?'var(--rd)':'var(--gr)', color:'#fff', borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
          {toast.msg}
        </div>
      )}
      {contractModal && (
        <Suspense fallback={null}>
          <ContractModal
            mission={contractModal.mission}
            company={company}
            worker={{ first_name: contractModal.workerName }}
            role="company"
            onSign={handleSignContract}
            onClose={() => setContractModal(null)}
            signing={signingContract}
          />
        </Suspense>
      )}
      {ratingModal && (
        <RatingModal
          rateeName={ratingModal.rateeName}
          loading={ratingLoading}
          onSubmit={handleRatingSubmit}
          onClose={() => setRatingModal(null)}
        />
      )}

      {/* Header */}
      <div style={{ background:'var(--wh2)', borderBottom:'1px solid var(--g2)', padding:'0 24px', display:'flex', alignItems:'center', height:48, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:32, cursor: onLogoClick ? 'pointer' : 'default' }} onClick={onLogoClick}>
          <div style={{ width:24, height:24, background:'var(--or)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
          </div>
          <span style={{ fontWeight:600, letterSpacing:'1.5px', fontSize:13 }}>TEMPO</span>
          <span style={{ fontSize:12, color:'var(--g4)', borderLeft:'1px solid var(--g2)', paddingLeft:8, marginLeft:4 }}>Espace Entreprise</span>
        </div>
        <div style={{ display:'flex', gap:0, marginRight:'auto' }}>
          {[['dashboard',t('nav_dashboard')],['publier',t('nav_publish')],['messages-e',t('nav_messages')],['stats',t('nav_stats')],['contrats',t('nav_contracts')]].map(([s,l]) => (
            <button key={s} onClick={() => setScreen(s)} style={{ padding:'0 14px', height:54, border:'none', background:'transparent', fontSize:13, color:screen===s?'var(--bk)':'var(--g4)', fontWeight:screen===s?500:400, borderBottom:screen===s?'2px solid var(--or)':'2px solid transparent', cursor:'pointer' }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')} style={{ background:'none', border:'1px solid var(--g2)', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:11, fontWeight:600, color:'var(--g6)', letterSpacing:'0.5px' }} title="Changer de langue">
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>
          <button onClick={toggleDarkMode} aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--g4)', display:'flex', alignItems:'center' }} title="Mode sombre">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--g1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600 }}>{initials}</div>
          <span style={{ fontSize:13, fontWeight:500 }}>{displayName}</span>
          <button onClick={async () => { await supabase.auth.signOut() }} style={{ fontSize:12, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>Déconnexion</button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 20px', width:'100%' }}>

        {/* ── DASHBOARD ── */}
        {screen === 'dashboard' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div className="section-title">Tableau de bord</div>
              <div className="section-sub">Bienvenue, {displayName} · <button onClick={() => setScreen('profil-e')} style={{ background:'none', border:'none', color:'var(--or)', fontSize:14, cursor:'pointer' }}>Voir mon profil public</button></div>
            </div>

            {/* KPIs principaux */}
            <div className="grid-4-mobile-2" style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:16 }}>
              {[
                [activeMissions.length,'Missions actives', activeMissions.length > 0 ? `${missions.filter(m=>m.status==='open').length} en recherche` : '', 'var(--brand)'],
                [formatAmount(totalMois),'Dépenses ce mois', (() => { const lastMonth = invoices.filter(i => { const d = new Date(i.created_at); const now = new Date(); return d.getMonth() === (now.getMonth()-1+12)%12 && (now.getMonth()===0 ? d.getFullYear()===now.getFullYear()-1 : d.getFullYear()===now.getFullYear()) }).reduce((s,i) => s + parseFloat(i.amount_ttc||0), 0); return lastMonth > 0 ? (totalMois >= lastMonth ? `↑ vs mois dernier` : `↓ vs mois dernier`) : '' })(), 'var(--am)'],
                [completedMissions.length,'Missions terminées', missions.length > 0 ? `${Math.round((completedMissions.length / missions.length) * 100)}% taux complétion` : '', 'var(--gr)'],
                [company?.rating_avg ? parseFloat(company.rating_avg).toFixed(1)+'/5' : '—','Note moyenne', company?.rating_count ? `${company.rating_count} avis` : '', '#F59E0B'],
              ].map(([v,l,d,accent]) => (
                <div key={l} className="metric-card" style={{ '--metric-accent': accent }}>
                  <div className="metric-label">{l}</div>
                  <div className="metric-value">{v}</div>
                  {d && <div className="metric-delta" style={{ color:'var(--g4)' }}>{d}</div>}
                </div>
              ))}
            </div>

            {/* KPIs secondaires */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
              <div className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--bl-l)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⏱</div>
                <div>
                  <div style={{ fontSize:11, color:'var(--g4)' }}>Temps moyen de match</div>
                  <div style={{ fontSize:16, fontWeight:600 }}>{(() => {
                    const matched = missions.filter(m => m.status !== 'open' && m.status !== 'draft' && m.status !== 'cancelled' && m.matched_at && m.created_at)
                    if (matched.length === 0) return '< 24h'
                    const avgHours = matched.reduce((s, m) => s + (new Date(m.matched_at) - new Date(m.created_at)) / 3600000, 0) / matched.length
                    return avgHours < 1 ? `${Math.round(avgHours*60)} min` : avgHours < 24 ? `${Math.round(avgHours)}h` : `${Math.round(avgHours/24)}j`
                  })()}</div>
                </div>
              </div>
              <div className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--gr-l)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>📊</div>
                <div>
                  <div style={{ fontSize:11, color:'var(--g4)' }}>Taux de remplissage</div>
                  <div style={{ fontSize:16, fontWeight:600 }}>{missions.length > 0 ? `${Math.round(((missions.filter(m=>['matched','active','completed'].includes(m.status)).length) / missions.filter(m=>m.status!=='cancelled'&&m.status!=='draft').length || 1) * 100)}%` : '—'}</div>
                </div>
              </div>
              <div className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--or-l)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>💰</div>
                <div>
                  <div style={{ fontSize:11, color:'var(--g4)' }}>Budget total dépensé</div>
                  <div style={{ fontSize:16, fontWeight:600 }}>{formatAmount(invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+parseFloat(i.amount_ttc||0),0))}</div>
                </div>
              </div>
            </div>

            {/* Mini graphique tendance sur 4 dernières semaines */}
            {invoices.length > 0 && (
              <div className="card" style={{ padding:16, marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>Activité récente</div>
                  <button onClick={() => setScreen('stats')} style={{ fontSize:12, color:'var(--or)', background:'none', border:'none', cursor:'pointer' }}>Voir les stats détaillées →</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {(() => {
                    const weeks = []
                    const now = new Date()
                    for (let w = 3; w >= 0; w--) {
                      const start = new Date(now); start.setDate(now.getDate() - (w+1)*7); start.setHours(0,0,0,0)
                      const end = new Date(start); end.setDate(start.getDate() + 7)
                      const weekMissions = missions.filter(m => { const d = new Date(m.created_at); return d >= start && d < end })
                      const weekInvoices = invoices.filter(i => { const d = new Date(i.created_at); return d >= start && d < end })
                      weeks.push({ label: w === 0 ? 'Cette sem.' : w === 1 ? 'Sem. -1' : `Sem. -${w}`, missions: weekMissions.length, spent: weekInvoices.reduce((s,i) => s + parseFloat(i.amount_ttc||0), 0) })
                    }
                    return weeks.map((w,i) => (
                      <div key={i} style={{ background:'var(--g1)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                        <div style={{ fontSize:10, color:'var(--g4)', marginBottom:6 }}>{w.label}</div>
                        <div style={{ fontSize:16, fontWeight:600, color:'var(--or)' }}>{w.missions}</div>
                        <div style={{ fontSize:10, color:'var(--g4)' }}>missions</div>
                        <div style={{ fontSize:12, fontWeight:500, marginTop:4 }}>{Math.round(w.spent)}€</div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            )}

            {/* Actions rapides */}
            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
              <button className="btn-primary" onClick={() => setScreen('publier')} style={{ flex:1, justifyContent:'center' }}>+ Publier une mission</button>
              <button className="btn-secondary" onClick={exportMissionsCSV} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Download size={16} /> Export CSV</button>
            </div>

            {missions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--g4)' }}>
                <div style={{ fontSize:40, marginBottom:16 }}>📋</div>
                <div style={{ fontSize:16, fontWeight:600, color:'var(--bk)', marginBottom:8 }}>Aucune mission publiée</div>
                <div style={{ fontSize:14, marginBottom:20 }}>Publiez votre première mission et recevez des candidatures en moins de 30 minutes</div>
                <button className="btn-primary" onClick={() => setScreen('publier')}>Publier une mission →</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>Vos missions</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {missions.map(m => {
                    const TIMELINE_STEPS = ['open','matched','active','completed']
                    const stepIndex = TIMELINE_STEPS.indexOf(m.status)
                    const isCancelled = m.status === 'cancelled'
                    return (
                    <div key={m.id} className="card" style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: !isCancelled && stepIndex >= 0 ? 10 : 0 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:500 }}>{m.title}</div>
                        <div style={{ fontSize:12, color:'var(--g4)' }}>
                          {m.city} · {m.hourly_rate}€/h · Publiée le {formatDate(m.published_at||m.created_at)}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                        <span className={`badge ${STATUS_STYLES[m.status]?.[0]||'badge-gray'}`} style={{fontSize:11}}>
                          {STATUS_STYLES[m.status]?.[1]||m.status}
                        </span>
                        <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:11 }} onClick={() => duplicateMission(m)}
                          title="Dupliquer cette mission">⧉ Dupliquer</button>
                        {m.status === 'open' && (
                          <button className="btn-secondary" style={{ padding:'5px 12px', fontSize:12 }} onClick={() => loadCandidates(m.id)}>
                            Candidatures
                          </button>
                        )}
                        {(m.status === 'matched' || m.status === 'active') && (
                          <>
                            {signedContracts.includes(m.id) ? (
                              <span className="badge badge-green" style={{ fontSize:10 }}>Contrat signé</span>
                            ) : (
                              <button className="btn-dark" style={{ padding:'5px 10px', fontSize:11, display:'flex', alignItems:'center', gap:4 }}
                                onClick={() => setContractModal({ missionId: m.id, mission: m, workerName: `${m.workers?.first_name||''} ${m.workers?.last_name||''}`.trim() || 'Travailleur' })}>
                                <PenLine size={16} /> Signer
                              </button>
                            )}
                            <button className="btn-primary" style={{ padding:'5px 12px', fontSize:12 }}
                              disabled={actionLoading[m.id] === 'completing'}
                              onClick={() => handleCompleteMission(m.id, m.workers?.id, `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'le travailleur')}>
                              {actionLoading[m.id] === 'completing' ? '...' : '✓ Terminer'}
                            </button>
                            <button className="btn-secondary" aria-label="Ouvrir le chat" style={{ padding:'5px 10px', fontSize:11, display:'flex', alignItems:'center' }}
                              onClick={() => openChat(m.assigned_worker_id || m.workers?.id, `${m.workers?.first_name||''} ${m.workers?.last_name||''}`.trim() || 'Travailleur', m.id)}>
                              <MessageCircle size={16} />
                            </button>
                          </>
                        )}
                        {m.status === 'completed' && (
                          <button className="btn-secondary" style={{ padding:'5px 10px', fontSize:11, display:'flex', alignItems:'center', gap:4 }} onClick={() => handleRepublishRecurring(m)}
                            title="Republier comme mission récurrente"><RefreshCw size={16} /> Récurrente</button>
                        )}
                        {(m.status === 'open' || m.status === 'matched') && (
                          <button aria-label="Annuler la mission" style={{ padding:'5px 8px', border:'1px solid var(--g2)', borderRadius:6, background:'var(--wh)', fontSize:11, cursor:'pointer', color:'var(--rd)', display:'flex', alignItems:'center' }}
                            onClick={() => setCancelModal(m.id)}><X size={16} /></button>
                        )}
                      </div>
                      </div>
                      {/* Timeline de progression */}
                      {!isCancelled && stepIndex >= 0 && (
                        <div style={{ display:'flex', alignItems:'center', gap:0 }}>
                          {TIMELINE_STEPS.map((step, i) => {
                            const done = i <= stepIndex
                            const labels = { open:'Publiée', matched:'Matchée', active:'En cours', completed:'Terminée' }
                            return (
                              <React.Fragment key={step}>
                                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                  <div style={{ width:14, height:14, borderRadius:'50%', background: done ? (i === stepIndex ? 'var(--or)' : 'var(--gr)') : 'var(--g2)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background .2s' }}>
                                    {done && <span style={{ color:'#fff', fontSize:8, lineHeight:1 }}>✓</span>}
                                  </div>
                                  <span style={{ fontSize:10, color: done ? 'var(--bk)' : 'var(--g4)', fontWeight: i === stepIndex ? 600 : 400 }}>{labels[step]}</span>
                                </div>
                                {i < TIMELINE_STEPS.length - 1 && (
                                  <div style={{ flex:1, height:2, background: i < stepIndex ? 'var(--gr)' : 'var(--g2)', margin:'0 6px', borderRadius:1, transition:'background .2s' }}></div>
                                )}
                              </React.Fragment>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PUBLIER ── */}
        {screen === 'publier' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div className="section-title">Publier une mission</div>
              <div className="section-sub">L'algorithme TEMPO notifie immédiatement les meilleurs profils</div>
            </div>
            {!published ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
                <div>
                  {/* Templates bar */}
                  <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
                    <button onClick={() => setShowTemplates(!showTemplates)}
                      style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--g2)', background:'var(--wh)', color:'var(--g6)', fontSize:12, cursor:'pointer' }}>
                      📋 Templates ({templates.length})
                    </button>
                    {form.title && (
                      <button onClick={() => {
                        const name = prompt('Nom du template :')
                        if (name) saveAsTemplate(name)
                      }}
                        style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--g2)', background:'var(--wh)', color:'var(--g6)', fontSize:12, cursor:'pointer' }}>
                        💾 Sauver comme template
                      </button>
                    )}
                  </div>
                  {showTemplates && (
                    <div className="card" style={{ padding:12, marginBottom:14 }}>
                      {templates.length === 0
                        ? <div style={{ fontSize:12, color:'var(--g4)', textAlign:'center', padding:8 }}>Aucun template sauvegardé</div>
                        : templates.map(tpl => (
                          <div key={tpl.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid var(--g1)' }}>
                            <div>
                              <div style={{ fontSize:13, fontWeight:500 }}>{tpl.name}</div>
                              <div style={{ fontSize:11, color:'var(--g4)' }}>{tpl.title} · {SECTOR_LABELS[tpl.sector]||tpl.sector}</div>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button onClick={() => loadTemplate(tpl)} style={{ padding:'4px 10px', borderRadius:6, border:'1px solid var(--g2)', background:'var(--wh)', fontSize:11, cursor:'pointer', color:'var(--or)' }}>Utiliser</button>
                              <button onClick={() => deleteTemplate(tpl.id)} aria-label="Supprimer" style={{ padding:'4px 8px', borderRadius:6, border:'1px solid var(--g2)', background:'var(--wh)', cursor:'pointer', color:'var(--rd)', display:'flex', alignItems:'center' }}><X size={16} /></button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div>
                      <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Intitulé du poste *</label>
                      <input className="input" placeholder="Ex: Opérateur logistique CACES 3" value={form.title} onChange={e => setF('title',e.target.value)} />
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Secteur</label>
                        <select className="input" value={form.sector} onChange={e => setF('sector',e.target.value)}>
                          {SECTORS.map(s => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Urgence</label>
                        <select className="input" value={form.urgency} onChange={e => setF('urgency',e.target.value)}>
                          <option value="normal">Normal</option>
                          <option value="urgent">Urgent</option>
                          <option value="immediate">Immédiat</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Taux horaire (€) *</label>
                        <input className="input" type="number" placeholder="14.50" value={form.hourly_rate} onChange={e => setF('hourly_rate',e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Heures estimées</label>
                        <input className="input" type="number" placeholder="40" value={form.total_hours} onChange={e => setF('total_hours',e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Date de début *</label>
                        <input className="input" type="date" value={form.start_date} onChange={e => setF('start_date',e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Ville *</label>
                        <input className="input" placeholder="Lyon" value={form.city} onChange={e => setF('city',e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Adresse complète</label>
                      <input className="input" placeholder="12 rue des entrepôts" value={form.address} onChange={e => setF('address',e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Compétences requises (séparées par des virgules)</label>
                      <input className="input" placeholder="CACES 3, Travail de nuit, Port de charges" onChange={e => setF('required_skills', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
                    </div>
                    <div>
                      <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Description</label>
                      <textarea className="input" rows={3} style={{ resize:'none' }} placeholder="Décrivez la mission, les conditions de travail..." value={form.description} onChange={e => setF('description',e.target.value)} />
                    </div>
                    <div style={{ background:'#FFF2EE', border:'1px solid #FED7AA', borderRadius:10, padding:'10px 14px', fontSize:13, color:'var(--or-d)', lineHeight:1.5 }}>
                      Protection TEMPO — Contrat de prestation auto-généré. RC Pro, URSSAF et facturation incluses.
                    </div>
                    <button className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px' }} onClick={handlePublish} disabled={publishing}>
                      {publishing ? 'Publication en cours...' : 'Publier la mission →'}
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>Estimation</div>
                  <div style={{ background:'var(--navy)', borderRadius:14, padding:20, marginBottom:16, color:'#fff' }}>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:8 }}>Délai moyen de pourvoi</div>
                    <div style={{ fontSize:36, fontWeight:600, color:'var(--or)', marginBottom:2 }}>30 min</div>
                    <div style={{ fontSize:13, color:'#10B981', marginBottom:16 }}>Taux de réussite 98%</div>
                    {[['Délai 1ère candidature','< 5 min'],['Mission pourvue','< 30 min'],['Contrat généré','Automatique'],['Paiement','J+2 après mission']].map(([l,v]) => (
                      <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderTop:'1px solid rgba(255,255,255,.06)', fontSize:13 }}>
                        <span style={{ color:'rgba(255,255,255,.5)' }}>{l}</span>
                        <span style={{ fontWeight:600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {form.hourly_rate && form.total_hours && (
                    <div className="card" style={{ padding:16 }}>
                      <div style={{ fontSize:15, fontWeight:600, marginBottom:12 }}>Coût estimé</div>
                      {[
                        [`Rémunération (${form.total_hours}h × ${form.hourly_rate}€)`, `${(parseFloat(form.total_hours)*parseFloat(form.hourly_rate)).toFixed(0)} €`, false],
                        ['Commission TEMPO (8%)', `${(parseFloat(form.total_hours)*parseFloat(form.hourly_rate)*0.08).toFixed(0)} €`, false],
                        ['Total TTC', `${(parseFloat(form.total_hours)*parseFloat(form.hourly_rate)*1.08).toFixed(0)} €`, true],
                      ].map(([l,v,b]) => (
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:!b?'1px solid #F4F4F2':'none' }}>
                          <span style={{ fontSize:13, fontWeight:b?600:400, color:b?'var(--bk)':'var(--g4)' }}>{l}</span>
                          <span style={{ fontSize:b?15:13, fontWeight:b?600:500 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ width:60, height:60, borderRadius:'50%', background:'var(--gr-l)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:24 }}>✓</div>
                <div style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>Mission publiée !</div>
                <div style={{ fontSize:15, color:'var(--g4)', marginBottom:24 }}>Les travailleurs compatibles ont été notifiés. Première candidature attendue dans 5 min.</div>
                <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                  <button className="btn-secondary" onClick={() => { setPublished(false); setForm({ title:'', sector:'logistique', hourly_rate:'', total_hours:'', start_date:'', city:'', address:'', description:'', required_skills:[], required_certs:[], urgency:'normal' }) }}>Nouvelle mission</button>
                  <button className="btn-primary" onClick={() => setScreen('dashboard')}>Voir le tableau de bord →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CANDIDATURES ── */}
        {screen === 'candidatures' && (
          <div>
            <button onClick={() => setScreen('dashboard')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16 }}>‹ Retour au tableau de bord</button>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Candidatures reçues</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>{candidates.length} candidat{candidates.length!==1?'s':''}</div>
            {candidates.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
                Aucune candidature pour le moment — les travailleurs compatibles ont été notifiés
              </div>
            ) : (
              candidates.map(c => {
                const isLoading = actionLoading[c.id]
                const isPending = c.status === 'pending'
                const isAccepted = c.status === 'accepted'
                const isRejected = c.status === 'rejected'
                return (
                  <div key={c.id} className="card" style={{ padding:16, marginBottom:10, borderLeft: isAccepted ? '3px solid var(--gr)' : isRejected ? '3px solid var(--rd)' : '3px solid transparent', transition:'border-color .2s' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                      <div style={{ width:44, height:44, borderRadius:'50%', background: isAccepted ? 'var(--gr-l)' : 'var(--bl-l)', color: isAccepted ? 'var(--gr-d)' : '#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, flexShrink:0 }}>
                        {(c.workers?.first_name?.[0]||'?')}{c.workers?.last_name?.[0]||''}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                          <span style={{ fontSize:14, fontWeight:600 }}>{c.workers?.first_name} {c.workers?.last_name}</span>
                          {c.match_score && <span className="score-badge">{c.match_score}% match</span>}
                          <span className={`badge ${isAccepted?'badge-green':isRejected?'badge-red':'badge-blue'}`} style={{fontSize:11}}>
                            {isPending?'En attente':isAccepted?'✓ Accepté':'✗ Refusé'}
                          </span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--g4)', marginTop:2 }}>
                          {c.workers?.city || '—'} · Note {c.workers?.rating_avg ? parseFloat(c.workers.rating_avg).toFixed(1) : 'Nouveau'}/5
                        </div>
                        {c.workers?.skills?.length > 0 && (
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                            {c.workers.skills.slice(0,4).map(s => <span key={s} className="tag" style={{fontSize:11}}>{s}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                    {isPending && (
                      <div style={{ display:'flex', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid #F4F4F2' }}>
                        <button style={{ flex:1, padding:'8px', border:'1.5px solid var(--g2)', borderRadius:8, background:'var(--wh)', fontSize:13, color:'var(--g6)', cursor:'pointer', fontWeight:500, transition:'all .15s' }}
                          disabled={!!isLoading}
                          onClick={() => handleReject(c.id)}
                          onMouseEnter={e => { e.currentTarget.style.borderColor='var(--rd)'; e.currentTarget.style.color='var(--rd)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor='var(--g2)'; e.currentTarget.style.color='var(--g6)' }}>
                          {isLoading === 'rejecting' ? '...' : '✗ Refuser'}
                        </button>
                        <button style={{ flex:2, padding:'8px', border:'none', borderRadius:8, background:'var(--gr)', color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', transition:'opacity .15s' }}
                          disabled={!!isLoading}
                          onClick={() => handleAccept(c)}
                          onMouseEnter={e => e.currentTarget.style.opacity='.9'}
                          onMouseLeave={e => e.currentTarget.style.opacity='1'}>
                          {isLoading === 'accepting' ? 'Acceptation...' : '✓ Accepter ce travailleur'}
                        </button>
                      </div>
                    )}
                    {isAccepted && (
                      <div style={{ marginTop:10, padding:'8px 12px', background:'var(--gr-l)', borderRadius:8, fontSize:12, color:'var(--gr-d)' }}>
                        ✓ Contrat de prestation généré automatiquement — signature en attente
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── STATISTIQUES ── */}
        {screen === 'stats' && (
          <div>
            <div style={{ marginBottom:20 }}>
              <div className="section-title">Statistiques</div>
              <div className="section-sub">Vue d'ensemble de votre activité</div>
            </div>

            <div className="grid-4-mobile-2" style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:24 }}>
              {[
                [missions.length, 'Missions publiées'],
                [completedMissions.length, 'Missions terminées'],
                [missions.length > 0 ? `${Math.round((completedMissions.length / missions.length) * 100)}%` : '—', 'Taux de complétion'],
                [company?.rating_avg ? parseFloat(company.rating_avg).toFixed(1) + '/5' : '—', 'Note moyenne'],
              ].map(([v,l]) => (
                <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value">{v}</div></div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
              {/* Spending over time */}
              <div className="card" style={{ padding:16 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Dépenses mensuelles</div>
                {(() => {
                  const months = {}
                  invoices.forEach(inv => {
                    const d = new Date(inv.created_at)
                    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                    months[key] = (months[key]||0) + parseFloat(inv.amount_ttc||0)
                  })
                  const entries = Object.entries(months).sort().slice(-6)
                  const max = Math.max(...entries.map(e => e[1]), 1)
                  return entries.length === 0
                    ? <div style={{ fontSize:12, color:'var(--g4)', textAlign:'center', padding:20 }}>Pas encore de données</div>
                    : <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
                        {entries.map(([month, total]) => (
                          <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                            <div style={{ fontSize:10, fontWeight:600, color:'var(--g6)' }}>{Math.round(total)}€</div>
                            <div style={{ width:'100%', background:'var(--or)', borderRadius:4, height: Math.max(4, (total/max)*80), transition:'height .3s' }}></div>
                            <div style={{ fontSize:10, color:'var(--g4)' }}>{month.split('-')[1]}/{month.split('-')[0].slice(2)}</div>
                          </div>
                        ))}
                      </div>
                })()}
              </div>

              {/* Missions by status */}
              <div className="card" style={{ padding:16 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Missions par statut</div>
                {['open','matched','active','completed','cancelled'].map(status => {
                  const count = missions.filter(m => m.status === status).length
                  const pct = missions.length > 0 ? (count / missions.length) * 100 : 0
                  return (
                    <div key={status} style={{ marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                        <span style={{ color:'var(--g6)' }}>{STATUS_STYLES[status]?.[1]||status}</span>
                        <span style={{ fontWeight:500 }}>{count}</span>
                      </div>
                      <div className="pbar"><div className="pfill" style={{ width:`${pct}%`, background: status==='completed'?'var(--gr)':status==='open'?'var(--bl)':'var(--or)' }}></div></div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sector breakdown */}
            <div className="card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Répartition par secteur</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                {SECTORS.map(s => {
                  const count = missions.filter(m => m.sector === s).length
                  return (
                    <div key={s} style={{ textAlign:'center', padding:10, background:'var(--g1)', borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:600, color:'var(--or)' }}>{count}</div>
                      <div style={{ fontSize:11, color:'var(--g4)', marginTop:2 }}>{SECTOR_LABELS[s]}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Export buttons */}
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" onClick={exportMissionsCSV} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Download size={16} /> Exporter missions (CSV)</button>
              <button className="btn-secondary" onClick={exportInvoicesCSV} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Download size={16} /> Exporter factures (CSV)</button>
            </div>
          </div>
        )}

        {/* ── CONTRATS ── */}
        {screen === 'contrats' && (
          <div>
            <div style={{ marginBottom:16 }}>
              <div className="section-title">Contrats & factures</div>
              <div className="section-sub">Gestion juridique 100% automatisée par TEMPO</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12, marginBottom:20 }}>
              {[
                [invoices.length,'Factures totales',''],
                [invoices.filter(i=>i.status==='paid').length,'Factures payées',''],
                [formatAmount(pendingInvoices.reduce((s,i)=>s+parseFloat(i.amount_ttc||0),0)),'Montant en attente',''],
              ].map(([v,l,d]) => (
                <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value">{v}</div></div>
              ))}
            </div>
            {invoices.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:12 }}>📄</div>
                Les factures apparaissent automatiquement à la fin de chaque mission
              </div>
            ) : (
              <div className="card" style={{ padding:0, overflowX:'auto', marginBottom:16 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
                  <thead>
                    <tr style={{ background:'var(--navy)' }}>
                      {['Référence','Travailleur','Date','Montant','Statut'].map(h => (
                        <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:12, fontWeight:500, color:'rgba(255,255,255,.7)', borderBottom:'1px solid #333' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv,i) => (
                      <tr key={inv.id} style={{ background:i%2===1?'var(--g1)':'var(--wh)' }}>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:500 }}>{inv.invoice_number}</td>
                        <td style={{ padding:'11px 14px', fontSize:13, color:'var(--g6)' }}>
                          {inv.contracts?.workers?.first_name} {inv.contracts?.workers?.last_name}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'var(--g4)' }}>{formatDate(inv.created_at)}</td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:600 }}>{formatAmount(inv.amount_ttc)}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <span className={`badge ${INV_STYLES[inv.status]?.[0]||'badge-gray'}`} style={{fontSize:11}}>
                            {INV_STYLES[inv.status]?.[1]||inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              <button className="btn-secondary" onClick={exportInvoicesCSV} style={{ fontSize:12, display:'flex', alignItems:'center', gap:4 }}><Download size={16} /> Exporter les factures (CSV)</button>
            </div>
            <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:10, padding:'12px 16px', fontSize:13, color:'var(--gr-d)', lineHeight:1.6 }}>
              TEMPO est mandataire de facturation. Chaque contrat est conforme au statut auto-entrepreneur. Archivage légal 10 ans garanti.
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        {screen === 'messages-e' && !chatPartner && (
          <div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Messages</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Vos conversations avec les travailleurs</div>
            {missions.filter(m => m.assigned_worker_id || m.workers).length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:12, display:'flex', justifyContent:'center' }}><MessageCircle size={32} /></div>
                La messagerie est disponible après avoir accepté un travailleur
              </div>
            ) : (
              missions
                .filter(m => m.assigned_worker_id || m.workers)
                .map(m => (
                  <div key={m.id} className="card-mission is-accepted" style={{ padding:14, marginBottom:8 }}
                    onClick={() => openChat(m.assigned_worker_id || m.workers?.id, `${m.workers?.first_name||''} ${m.workers?.last_name||''}`.trim() || 'Travailleur', m.id)}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--gr-l)', color:'var(--gr-d)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>
                        {(m.workers?.first_name||'T')[0]}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600 }}>{`${m.workers?.first_name||''} ${m.workers?.last_name||''}`.trim() || 'Travailleur'}</div>
                        <div style={{ fontSize:12, color:'var(--g4)' }}>{m.title}</div>
                      </div>
                      <span style={{ fontSize:16, color:'var(--g3)' }}>›</span>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {screen === 'chat' && chatPartner && (
          <div style={{ display:'flex', flexDirection:'column', height:'calc(100dvh - 140px)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <button onClick={() => { setChatPartner(null); setScreen('messages-e') }} style={{ background:'none', border:'none', fontSize:13, color:'var(--g4)', cursor:'pointer' }}>‹ Retour</button>
              <div style={{ fontSize:15, fontWeight:600 }}>{chatPartner.name}</div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:8, background:'var(--g1)', borderRadius:10, marginBottom:12 }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign:'center', padding:20, color:'var(--g4)', fontSize:13 }}>Démarrez la conversation</div>
              ) : chatMessages.map((msg, i) => {
                const isMine = msg.sender_id === user.id
                return (
                  <div key={msg.id || i} style={{ display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom:8 }}>
                    <div style={{ maxWidth:'75%', padding:'8px 12px', borderRadius: isMine ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: isMine ? 'var(--or)' : 'var(--wh)', color: isMine ? '#fff' : 'var(--bk)', fontSize:13, boxShadow:'0 1px 3px rgba(0,0,0,.08)' }}>
                      {msg.content}
                      <div style={{ fontSize:10, marginTop:4, opacity:0.6 }}>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="input" placeholder="Votre message..." value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }} style={{ flex:1 }} />
              <button className="btn-primary" style={{ padding:'10px 18px' }} onClick={handleSendMessage} disabled={sendingMsg || !chatInput.trim()}>
                {sendingMsg ? '...' : '→'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Cancel modal */}
      {cancelModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'var(--wh)', borderRadius:16, padding:24, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Annuler cette mission ?</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Cette action est irréversible. Les travailleurs ayant postulé seront notifiés.</div>
            <textarea className="input" rows={3} style={{ resize:'none', marginBottom:16 }} placeholder="Raison de l'annulation (optionnel)..."
              value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={() => { setCancelModal(null); setCancelReason('') }}>Retour</button>
              <button style={{ flex:1, padding:'10px', border:'none', borderRadius:8, background:'var(--rd)', color:'#fff', fontSize:14, fontWeight:500, cursor:'pointer' }}
                onClick={handleCancel} disabled={actionLoading[cancelModal] === 'cancelling'}>
                {actionLoading[cancelModal] === 'cancelling' ? '...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
