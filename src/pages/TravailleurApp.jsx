import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Bell, Moon, Sun, Search, X, Menu, Map, Heart, PenLine, MessageCircle, Star as StarIcon } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { supabase, getMissions, applyToMission, getWorkerApplications, getWorkerInvoices, getNotifications, markNotifsRead, setWorkerAvailability, subscribeToMissions, subscribeToNotifications, getWorkerMissions, createRating, getConversations, getMessages, sendMessage, subscribeToMessages, withdrawApplication, saveContract } from '../lib/supabase'
import { computeMatchScore } from '../lib/matching'
import { isPushSupported, requestPushPermission, sendLocalNotification, getPermissionStatus } from '../lib/pushNotifications'
import { useI18n } from '../contexts/I18nContext'

const MissionsMap = lazy(() => import('../components/MissionsMap'))
const ContractModal = lazy(() => import('../components/ContractModal'))

const Star = ({ n }) => <span style={{ color:'var(--am)', fontSize:12 }}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5-Math.round(n))}</span>
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }) : '—'
const formatAmount = (n) => n ? `${parseFloat(n).toFixed(0)} €` : '—'
const SECTOR_LABELS = { logistique:'Logistique', btp:'BTP', industrie:'Industrie', hotellerie:'Hôtellerie', proprete:'Propreté' }

const STAR_LABELS = ['', 'Insuffisant', 'Passable', 'Bien', 'Très bien', 'Excellent !']
const APP_STATUS = {
  pending:  { label:'En attente', cls:'badge-blue' },
  accepted: { label:'✓ Accepté', cls:'badge-green' },
  rejected: { label:'✗ Refusé', cls:'badge-gray' },
  active:   { label:'En cours', cls:'badge-orange' },
}

const RatingModal = ({ companyName, onSubmit, onClose, loading }) => {
  const [score, setScore] = React.useState(0)
  const [hover, setHover] = React.useState(0)
  const [comment, setComment] = React.useState('')
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--wh)', borderRadius:16, padding:28, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Évaluer la mission</div>
        <div style={{ fontSize:13, color:'var(--g4)', marginBottom:24 }}>Comment s'est passée la collaboration avec <strong>{companyName}</strong> ?</div>
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

const Field = ({ label, id, form, set, ...props }) => (
  <div style={{ marginBottom:12 }}>
    <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>{label}</label>
    <input className="input" {...props} onChange={e => set(id, e.target.value)} value={form[id] || ''} />
  </div>
)

export default function TravailleurApp({ onNavigate, onLogoClick }) {
  const { user, profile, roleData, refreshRoleData } = useAuth()
  const { locale, switchLocale, t } = useI18n()
  const [screen, setScreen]             = useState('accueil')
  const [selectedMission, setSelectedMission] = useState(null)
  const [missions, setMissions]         = useState([])
  const [applications, setApplications] = useState([])
  const [invoices, setInvoices]         = useState([])
  const [notifs, setNotifs]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterSecteur, setFilterSecteur] = useState('tous')
  const [searchQuery, setSearchQuery]     = useState('')
  const [sortBy, setSortBy]               = useState('match')
  const [showFilters, setShowFilters]     = useState(false)
  const [filterRateMin, setFilterRateMin] = useState('')
  const [filterRateMax, setFilterRateMax] = useState('')
  const [filterDurationMin, setFilterDurationMin] = useState('')
  const [filterDurationMax, setFilterDurationMax] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('tous')
  const [filterPeriod, setFilterPeriod]   = useState('tous')
  const [savedMissions, setSavedMissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_saved_missions') || '[]') } catch { return [] }
  })
  const [disponible, setDisponible]     = useState(false)
  const [applying, setApplying]         = useState({})
  const [toast, setToast]               = useState(null)
  const [profileForm, setProfileForm]   = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [allMissions, setAllMissions]   = useState([])
  const [ratingModal, setRatingModal]   = useState(null)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [ratedMissions, setRatedMissions] = useState(new Set())
  const [suiviFilter, setSuiviFilter]     = useState('tous')
  const [notifFilter, setNotifFilter]     = useState('tous')
  const [newSkill, setNewSkill]           = useState('')
  const [newCert, setNewCert]             = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('tempo_onboarding_done'))
  const [conversations, setConversations] = useState([])
  const [chatMessages, setChatMessages]   = useState([])
  const [chatPartner, setChatPartner]     = useState(null)
  const [chatMissionId, setChatMissionId] = useState(null)
  const [chatInput, setChatInput]         = useState('')
  const [sendingMsg, setSendingMsg]       = useState(false)
  const [mapView, setMapView]             = useState(false)
  const [viewCompany, setViewCompany]     = useState(null)
  const [companyMissions, setCompanyMissions] = useState([])
  const [contractModal, setContractModal] = useState(null)
  const [signingContract, setSigningContract] = useState(false)
  const [signedContracts, setSignedContracts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_signed_contracts') || '[]') } catch { return [] }
  })
  const [darkMode, setDarkMode]           = useState(() => localStorage.getItem('tempo_dark_mode') === '1')
  const [savedAlerts, setSavedAlerts]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_saved_alerts') || '[]') } catch { return [] }
  })
  const [blockedDays, setBlockedDays]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('tempo_blocked_days') || '[]') } catch { return [] }
  })

  const worker = roleData
  const displayName = worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || profile?.email : profile?.email || '—'
  const initials = worker?.first_name?.[0] || profile?.email?.[0]?.toUpperCase() || '?'
  const unreadCount = notifs.filter(n => !n.read_at).length

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [mRes, aRes, iRes, nRes, wmRes] = await Promise.all([
        getMissions({ status:'open', limit:50 }),
        getWorkerApplications(user.id),
        getWorkerInvoices(user.id),
        getNotifications(user.id),
        getWorkerMissions(user.id),
      ])
      if (mRes.data) {
        const withScores = mRes.data.map(m => ({
          ...m,
          matchScore: worker ? computeMatchScore(m, worker).total_score : 50
        })).sort((a,b) => b.matchScore - a.matchScore)
        setMissions(withScores)
      }
      if (aRes.data) setApplications(aRes.data)
      if (iRes.data) setInvoices(iRes.data)
      if (nRes.data) setNotifs(nRes.data)
      if (wmRes.data) setAllMissions(wmRes.data)
    } finally {
      setLoading(false)
    }
  }, [user?.id, worker?.id])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (worker) {
      setDisponible(worker.is_available || false)
      setProfileForm({
        first_name: worker.first_name || '',
        last_name: worker.last_name || '',
        city: worker.city || '',
        siret: worker.siret || '',
        radius_km: worker.radius_km || 10,
      })
    }
  }, [worker?.id])

  // Demander la permission push au premier chargement
  useEffect(() => {
    if (isPushSupported() && getPermissionStatus() === 'default') {
      requestPushPermission()
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const mSub = subscribeToMissions(() => loadData())
    const nSub = subscribeToNotifications(user.id, (payload) => {
      setNotifs(prev => [payload.new, ...prev])
      // Envoyer une notification push locale
      sendLocalNotification(payload.new.title || 'TEMPO', {
        body: payload.new.body || 'Vous avez une nouvelle notification',
        tag: `notif-${payload.new.id}`,
      })
    })
    const msgSub = subscribeToMessages(user.id, (payload) => {
      if (chatPartner && payload.new.sender_id === chatPartner.id) {
        setChatMessages(prev => [...prev, payload.new])
      }
    })
    return () => { mSub.unsubscribe(); nSub.unsubscribe(); msgSub.unsubscribe() }
  }, [user?.id, chatPartner?.id])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const toggleDispo = async (val) => {
    setDisponible(val)
    await setWorkerAvailability(user.id, val)
  }

  const handleApply = async (mission) => {
    if (applying[mission.id] || hasApplied(mission.id)) return
    setApplying(a => ({ ...a, [mission.id]:true }))
    const { error } = await applyToMission({ missionId:mission.id, workerId:user.id, matchScore:mission.matchScore })
    setApplying(a => ({ ...a, [mission.id]:false }))
    if (error) {
      if (error.code === '23505') showToast('Vous avez déjà postulé', 'warn')
      else showToast('Erreur lors de la candidature', 'error')
    } else {
      showToast('Candidature envoyée !')
      setApplications(prev => [...prev, { mission_id:mission.id, status:'pending' }])
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const { error } = await supabase.from('workers').update(profileForm).eq('id', user.id)
    setSavingProfile(false)
    if (error) showToast('Erreur lors de la sauvegarde', 'error')
    else { showToast('Profil mis à jour !'); refreshRoleData() }
  }

  const handleRatingSubmit = async (score, comment) => {
    if (!ratingModal) return
    setRatingLoading(true)
    await createRating({
      missionId: ratingModal.missionId,
      raterId: user.id,
      ratedId: ratingModal.rateeId,
      raterRole: 'travailleur',
      score,
      comment,
    })
    setRatingLoading(false)
    setRatedMissions(prev => new Set([...prev, ratingModal.missionId]))
    setRatingModal(null)
    showToast('Évaluation envoyée — merci !')
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

  const handleWithdraw = async (applicationId) => {
    const { error } = await withdrawApplication(applicationId)
    if (error) { showToast('Erreur lors du retrait', 'error'); return }
    setAllMissions(prev => prev.map(a => a.id === applicationId ? { ...a, status: 'withdrawn' } : a))
    showToast('Candidature retirée')
  }

  const handleSignContract = async (signatureData) => {
    if (!contractModal) return
    setSigningContract(true)
    const { error: contractError } = await saveContract({
      mission_id: contractModal.missionId,
      worker_id: user.id,
      worker_signature: signatureData,
      worker_signed_at: new Date().toISOString(),
      status: 'signed_worker',
    })
    if (contractError) { showToast('Erreur lors de la signature', 'error'); setSigningContract(false); return }
    const updated = [...signedContracts, contractModal.missionId]
    setSignedContracts(updated)
    localStorage.setItem('tempo_signed_contracts', JSON.stringify(updated))
    setSigningContract(false)
    setContractModal(null)
    showToast('Contrat signé avec succès !')
  }

  const openCompanyProfile = async (companyId, companyData) => {
    setViewCompany(companyData)
    const { data } = await supabase
      .from('missions')
      .select('id, title, hourly_rate, city, start_date, total_hours, sector, status')
      .eq('company_id', companyId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(10)
    setCompanyMissions(data || [])
    setScreen('company-profile')
  }

  const saveAlert = (alert) => {
    const updated = [...savedAlerts, { id: Date.now(), ...alert, created_at: new Date().toISOString() }]
    setSavedAlerts(updated)
    localStorage.setItem('tempo_saved_alerts', JSON.stringify(updated))
    showToast('Alerte sauvegardée !')
  }

  const deleteAlert = (id) => {
    const updated = savedAlerts.filter(a => a.id !== id)
    setSavedAlerts(updated)
    localStorage.setItem('tempo_saved_alerts', JSON.stringify(updated))
  }

  const toggleBlockedDay = (dateStr) => {
    setBlockedDays(prev => {
      const next = prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
      localStorage.setItem('tempo_blocked_days', JSON.stringify(next))
      return next
    })
  }

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev
      localStorage.setItem('tempo_dark_mode', next ? '1' : '0')
      return next
    })
  }

  // Badges computation
  const badges = React.useMemo(() => {
    const b = []
    if (worker?.missions_completed >= 1) b.push({ icon: '🎯', label: 'Première mission', desc: '1 mission complétée' })
    if (worker?.missions_completed >= 5) b.push({ icon: '⭐', label: 'Travailleur confirmé', desc: '5 missions complétées' })
    if (worker?.missions_completed >= 20) b.push({ icon: '🏆', label: 'Expert', desc: '20 missions complétées' })
    if (worker?.rating_avg >= 4.5 && worker?.rating_count >= 3) b.push({ icon: '💎', label: 'Top performer', desc: 'Note ≥ 4.5/5' })
    if (worker?.siret_verified) b.push({ icon: '✓', label: 'SIRET vérifié', desc: 'Identité professionnelle confirmée' })
    if (worker?.id_verified) b.push({ icon: '🪪', label: 'Identité vérifiée', desc: 'Pièce d\'identité validée' })
    if (worker?.rc_pro_verified) b.push({ icon: '🛡️', label: 'RC Pro', desc: 'Assurance professionnelle validée' })
    if ((profileForm.skills||worker?.skills||[]).length >= 5) b.push({ icon: '🔧', label: 'Multi-compétent', desc: '5+ compétences déclarées' })
    return b
  }, [worker, profileForm.skills])

  const hasApplied = (missionId) => applications.some(a => a.mission_id === missionId)
  const isSaved = (missionId) => savedMissions.includes(missionId)
  const toggleSave = (missionId) => {
    setSavedMissions(prev => {
      const next = prev.includes(missionId) ? prev.filter(id => id !== missionId) : [...prev, missionId]
      localStorage.setItem('tempo_saved_missions', JSON.stringify(next))
      return next
    })
  }

  const filteredMissions = React.useMemo(() => {
    let result = [...missions]
    // Sector filter
    if (filterSecteur !== 'tous') result = result.filter(m => m.sector === filterSecteur)
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        (m.title||'').toLowerCase().includes(q) ||
        (m.description||'').toLowerCase().includes(q) ||
        (m.companies?.name||'').toLowerCase().includes(q) ||
        (m.city||'').toLowerCase().includes(q) ||
        (m.required_skills||[]).some(s => s.toLowerCase().includes(q))
      )
    }
    // Rate filter
    if (filterRateMin) result = result.filter(m => m.hourly_rate >= parseFloat(filterRateMin))
    if (filterRateMax) result = result.filter(m => m.hourly_rate <= parseFloat(filterRateMax))
    // Duration filter
    if (filterDurationMin) result = result.filter(m => (m.total_hours||0) >= parseFloat(filterDurationMin))
    if (filterDurationMax) result = result.filter(m => (m.total_hours||0) <= parseFloat(filterDurationMax))
    // Urgency filter
    if (filterUrgency !== 'tous') result = result.filter(m => m.urgency === filterUrgency)
    // Period filter
    if (filterPeriod !== 'tous') {
      const now = new Date()
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1); startOfWeek.setHours(0,0,0,0)
      const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      result = result.filter(m => {
        if (!m.start_date) return false
        const d = new Date(m.start_date)
        if (filterPeriod === 'semaine') return d >= startOfWeek && d < endOfWeek
        if (filterPeriod === 'mois') return d >= startOfMonth && d <= endOfMonth
        if (filterPeriod === '3mois') { const end3 = new Date(now); end3.setMonth(end3.getMonth()+3); return d >= now && d <= end3 }
        return true
      })
    }
    // Sort
    if (sortBy === 'match') result.sort((a,b) => b.matchScore - a.matchScore)
    else if (sortBy === 'date') result.sort((a,b) => new Date(a.start_date||0) - new Date(b.start_date||0))
    else if (sortBy === 'rate-desc') result.sort((a,b) => (b.hourly_rate||0) - (a.hourly_rate||0))
    else if (sortBy === 'rate-asc') result.sort((a,b) => (a.hourly_rate||0) - (b.hourly_rate||0))
    else if (sortBy === 'duration') result.sort((a,b) => (b.total_hours||0) - (a.total_hours||0))
    else if (sortBy === 'net') result.sort((a,b) => ((b.hourly_rate||0)*(b.total_hours||0)) - ((a.hourly_rate||0)*(a.total_hours||0)))
    return result
  }, [missions, filterSecteur, searchQuery, sortBy, filterRateMin, filterRateMax, filterDurationMin, filterDurationMax, filterUrgency, filterPeriod])

  const activeFilterCount = [filterRateMin, filterRateMax, filterDurationMin, filterDurationMax, filterUrgency !== 'tous', filterPeriod !== 'tous'].filter(Boolean).length

  const urgentMissions = missions.filter(m => m.urgency === 'immediate' || m.urgency === 'urgent')
  const totalMois = invoices.filter(i => new Date(i.created_at).getMonth() === new Date().getMonth()).reduce((s,i) => s + parseFloat(i.worker_payout||0), 0)
  const totalAnnee = invoices.reduce((s,i) => s + parseFloat(i.worker_payout||0), 0)

  const MissionCard = ({ m }) => {
    const applied = hasApplied(m.id)
    const saved = isSaved(m.id)
    return (
      <div className={`card-mission${(m.urgency==='urgent'||m.urgency==='immediate')?' is-urgent':''}`} style={{ marginBottom:10 }}
        onClick={() => { setSelectedMission(m); setScreen('mission-detail') }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <div style={{ flex:1, minWidth:0, marginRight:10 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{m.title}</div>
            <div style={{ fontSize:12, color:'var(--g4)' }}>{m.companies?.name} · {m.city}</div>
          </div>
          <div style={{ display:'flex', alignItems:'flex-start', gap:6, flexShrink:0 }}>
            <button onClick={e => { e.stopPropagation(); toggleSave(m.id) }}
              aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
              style={{ background:'none', border:'none', cursor:'pointer', color: saved ? 'var(--or)' : 'var(--g3)', padding:0, lineHeight:1, transition:'color .15s', display:'flex', alignItems:'center' }}
              title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              <Heart size={16} style={{ fill: saved ? 'currentColor' : 'none' }} />
            </button>
            <span className="score-badge">{m.matchScore}%</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
          {(m.required_skills||[]).slice(0,3).map(t => <span key={t} className="tag">{t}</span>)}
          {(m.urgency==='urgent'||m.urgency==='immediate') && <span className="badge badge-orange" style={{fontSize:11}}>Urgent</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:14, fontWeight:600 }}>{m.hourly_rate}€/h <span style={{ fontSize:12, color:'var(--g4)', fontWeight:400 }}>· {formatDate(m.start_date)} {m.total_hours ? `· ${m.total_hours}h` : ''}</span></span>
          <button className={applied?'btn-secondary':'btn-primary'} style={{ padding:'6px 14px', fontSize:12 }}
            onClick={e => { e.stopPropagation(); handleApply(m) }} disabled={applied||applying[m.id]}>
            {applying[m.id]?'...':applied?'✓ Postulé':'Postuler'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:14, background:'var(--wh)' }}>
      <div style={{ width:32, height:32, background:'var(--or)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1.5L10 6L2 10.5Z" fill="white"/></svg>
      </div>
      <div style={{ fontSize:13, color:'var(--g4)' }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--wh)' }}>
      {toast && (
        <div className="toast" style={{ position:'fixed', top:16, right:16, zIndex:999, background:toast.type==='error'?'var(--rd)':toast.type==='warn'?'#D97706':'var(--gr)', color:'#fff', borderRadius:10, padding:'12px 18px', fontSize:13, fontWeight:500, boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
          {toast.msg}
        </div>
      )}
      {/* Onboarding guide */}
      {showOnboarding && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1001, padding:20 }}>
          <div style={{ background:'var(--wh)', borderRadius:16, padding:28, maxWidth:440, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ width:48, height:48, background:'var(--or)', borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
                <svg width="18" height="18" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
              </div>
              <div style={{ fontSize:20, fontWeight:600, marginBottom:4 }}>Bienvenue sur TEMPO !</div>
              <div style={{ fontSize:14, color:'var(--g4)' }}>Voici comment démarrer en 3 étapes</div>
            </div>
            {[
              ['1. Complétez votre profil', 'Ajoutez vos compétences, certifications et votre zone d\'intervention pour recevoir les missions les plus pertinentes.'],
              ['2. Parcourez les missions', 'Utilisez les filtres et la recherche pour trouver les missions qui vous correspondent. Le score de matching vous aide à identifier les meilleures opportunités.'],
              ['3. Postulez et travaillez', 'Postulez en un clic. Quand vous êtes accepté, le contrat est généré automatiquement et le paiement est sécurisé.'],
            ].map(([title, desc], i) => (
              <div key={i} style={{ display:'flex', gap:12, marginBottom:14, alignItems:'flex-start' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#FFF2EE', color:'var(--or)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>{i+1}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{title.replace(/^\d+\.\s/,'')}</div>
                  <div style={{ fontSize:12, color:'var(--g4)', lineHeight:1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
            <button className="btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:8 }}
              onClick={() => { setShowOnboarding(false); localStorage.setItem('tempo_onboarding_done','1') }}>
              C'est parti →
            </button>
          </div>
        </div>
      )}

      {contractModal && (
        <Suspense fallback={null}>
          <ContractModal
            mission={contractModal.mission}
            company={{ name: contractModal.companyName }}
            worker={worker}
            role="worker"
            onSign={handleSignContract}
            onClose={() => setContractModal(null)}
            signing={signingContract}
          />
        </Suspense>
      )}
      {ratingModal && (
        <RatingModal
          companyName={ratingModal.companyName}
          loading={ratingLoading}
          onSubmit={handleRatingSubmit}
          onClose={() => setRatingModal(null)}
        />
      )}

      <div style={{ background:'var(--navy)', padding:'0 20px', display:'flex', alignItems:'center', height:54, position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:'auto', cursor: onLogoClick ? 'pointer' : 'default' }} onClick={onLogoClick}>
          <div style={{ width:24, height:24, background:'var(--or)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
          </div>
          <span style={{ color:'#fff', fontWeight:500, letterSpacing:'2px', fontSize:13 }}>TEMPO</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'rgba(255,255,255,.08)', borderRadius:99 }}>
            <span className={disponible ? 'pulse' : ''} style={{ width:7, height:7, borderRadius:'50%', background:disponible?'#10B981':'#6B7280', display:'inline-block' }}></span>
            <span style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>{disponible?'Disponible':'Indisponible'}</span>
            <input type="checkbox" checked={disponible} onChange={e => toggleDispo(e.target.checked)} style={{ width:14, height:14, cursor:'pointer', accentColor:'var(--or)' }} />
          </div>
          <button onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:8, padding:'6px 10px', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:11, fontWeight:600, letterSpacing:'0.5px' }} title="Changer de langue">
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>
          <button onClick={toggleDarkMode} aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'} style={{ background:'rgba(255,255,255,.08)', border:'none', borderRadius:8, padding:'6px 10px', color:'rgba(255,255,255,.7)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center' }} title="Mode sombre">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => { setScreen('notifs') }} aria-label="Notifications" style={{ position:'relative', background:'rgba(255,255,255,.08)', border:'none', borderRadius:8, padding:'6px 10px', color:'rgba(255,255,255,.7)', cursor:'pointer', display:'flex', alignItems:'center' }}>
            <Bell size={18} />
            {unreadCount > 0 && <span style={{ position:'absolute', top:-3, right:-3, background:'var(--or)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 }}>{unreadCount}</span>}
          </button>
        </div>
      </div>

      <div style={{ background:'var(--wh)', borderBottom:'1px solid var(--g2)', display:'flex', padding:'0 20px' }}>
        {[['accueil',t('nav_home')],['missions',t('nav_missions')],['messages',t('nav_messages')],['suivi',t('nav_tracking')],['gains',t('nav_earnings')],['profil',t('nav_profile')]].map(([s,l]) => (
          <button key={s} onClick={() => setScreen(s)} style={{ padding:'13px 12px', border:'none', background:'transparent', fontSize:13, color:screen===s?'var(--bk)':'var(--g4)', fontWeight:screen===s?500:400, borderBottom:screen===s?'2px solid var(--or)':'2px solid transparent', cursor:'pointer', position:'relative' }}>
            {l}
            {s === 'suivi' && allMissions.filter(a => a.status === 'accepted').length > 0 && (
              <span style={{ position:'absolute', top:8, right:2, width:7, height:7, borderRadius:'50%', background:'var(--or)' }}></span>
            )}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'20px 16px' }}>

        {screen === 'accueil' && (
          <div>
            <div style={{ background:'var(--navy)', borderRadius:14, padding:20, marginBottom:16, color:'#fff' }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:4 }}>{t('hello')}</div>
              <div style={{ fontSize:20, fontWeight:600, marginBottom:2 }}>{displayName}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:16 }}>{worker?.city || 'Ville non renseignée'} · {worker?.radius_km||10} km</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[[worker?.missions_completed||0,'Missions'],[worker?.rating_avg?parseFloat(worker.rating_avg).toFixed(1):'—','Note'],[missions.length,'Dispo']].map(([v,l]) => (
                  <div key={l} style={{ background:'rgba(255,255,255,.07)', borderRadius:8, padding:10, textAlign:'center' }}>
                    <div style={{ fontSize:18, fontWeight:600, color:'var(--or)' }}>{v}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            {urgentMissions.length > 0 && (
              <div style={{ background:'var(--or)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }} onClick={() => setScreen('missions')}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{urgentMissions.length} mission{urgentMissions.length>1?'s':''} urgente{urgentMissions.length>1?'s':''}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>Cliquez pour voir</div>
                </div>
                <span style={{ color:'#fff', fontSize:20 }}>›</span>
              </div>
            )}
            {missions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--g4)' }}>
                <div style={{ fontSize:32, marginBottom:12, display:'flex', justifyContent:'center' }}><Search size={32} /></div>
                <div style={{ fontSize:14, fontWeight:500 }}>Aucune mission disponible</div>
                <div style={{ fontSize:13, marginTop:4 }}>Les missions apparaissent ici en temps réel</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:15, fontWeight:600 }}>{t('recommended_for_you')}</div>
                  <button onClick={() => setScreen('missions')} style={{ fontSize:13, color:'var(--or)', background:'none', border:'none', cursor:'pointer' }}>Tout voir ({missions.length})</button>
                </div>
                {missions.slice(0,3).map(m => <MissionCard key={m.id} m={m} />)}
              </>
            )}
          </div>
        )}

        {screen === 'missions' && (
          <div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>{t('available_missions')}</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:12 }}>{filteredMissions.length} mission{filteredMissions.length!==1?'s':''} trouvée{filteredMissions.length!==1?'s':''}</div>

            {/* Search bar */}
            <div style={{ position:'relative', marginBottom:12 }}>
              <input className="input" placeholder="Rechercher par titre, entreprise, ville, compétence..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft:36, paddingRight: searchQuery ? 32 : 12 }} />
              <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--g4)', pointerEvents:'none', display:'flex', alignItems:'center' }}><Search size={16} /></span>
              {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Effacer la recherche" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--g4)', cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center' }}><X size={16} /></button>}
            </div>

            {/* Sort + filter toggle row */}
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
              <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ width:'auto', padding:'6px 10px', fontSize:12, minWidth:140 }}>
                <option value="match">Tri : Pertinence</option>
                <option value="date">Tri : Date de début</option>
                <option value="rate-desc">Tri : Taux ↓</option>
                <option value="rate-asc">Tri : Taux ↑</option>
                <option value="duration">Tri : Durée ↓</option>
                <option value="net">Tri : Net estimé ↓</option>
              </select>
              <button onClick={() => setShowFilters(!showFilters)}
                style={{ padding:'6px 12px', borderRadius:8, border: activeFilterCount > 0 ? '1.5px solid var(--or)' : '1px solid var(--g2)', background: activeFilterCount > 0 ? 'var(--or-l)' : 'var(--wh)', color: activeFilterCount > 0 ? 'var(--or-d)' : 'var(--g6)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                ⚙ Filtres {activeFilterCount > 0 && <span style={{ background:'var(--or)', color:'#fff', borderRadius:'50%', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>{activeFilterCount}</span>}
              </button>
              <button onClick={() => setMapView(!mapView)}
                style={{ padding:'6px 12px', borderRadius:8, border: mapView ? '1.5px solid var(--or)' : '1px solid var(--g2)', background: mapView ? 'var(--or-l)' : 'var(--wh)', color: mapView ? 'var(--or-d)' : 'var(--g6)', fontSize:12, cursor:'pointer' }}>
                {mapView ? <><Menu size={20} style={{ verticalAlign:'middle' }} /> Liste</> : <><Map size={16} style={{ verticalAlign:'middle' }} /> Carte</>}
              </button>
              {savedMissions.length > 0 && (
                <button onClick={() => setScreen('favoris')}
                  style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--g2)', background:'var(--wh)', color:'var(--g6)', fontSize:12, cursor:'pointer' }}>
                  <Heart size={16} style={{ verticalAlign:'middle', marginRight:4 }} /> Favoris ({savedMissions.length})
                </button>
              )}
            </div>

            {/* Advanced filters panel */}
            {showFilters && (
              <div className="card" style={{ padding:16, marginBottom:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Taux horaire min (€)</label>
                    <input className="input" type="number" placeholder="0" value={filterRateMin} onChange={e => setFilterRateMin(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Taux horaire max (€)</label>
                    <input className="input" type="number" placeholder="100" value={filterRateMax} onChange={e => setFilterRateMax(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Durée min (h)</label>
                    <input className="input" type="number" placeholder="0" value={filterDurationMin} onChange={e => setFilterDurationMin(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Durée max (h)</label>
                    <input className="input" type="number" placeholder="500" value={filterDurationMax} onChange={e => setFilterDurationMax(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Urgence</label>
                    <select className="input" value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }}>
                      <option value="tous">Toutes</option>
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                      <option value="immediate">Immédiat</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Période de début</label>
                    <select className="input" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }}>
                      <option value="tous">Toutes</option>
                      <option value="semaine">Cette semaine</option>
                      <option value="mois">Ce mois</option>
                      <option value="3mois">3 prochains mois</option>
                    </select>
                  </div>
                </div>
                <button onClick={() => { setFilterRateMin(''); setFilterRateMax(''); setFilterDurationMin(''); setFilterDurationMax(''); setFilterUrgency('tous'); setFilterPeriod('tous') }}
                  style={{ fontSize:12, color:'var(--or)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Sector pills */}
            <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
              {[['tous','Tous'],['logistique','Logistique'],['btp','BTP'],['industrie','Industrie'],['hotellerie','Hôtellerie'],['proprete','Propreté']].map(([v,l]) => (
                <button key={v} onClick={() => setFilterSecteur(v)} style={{ padding:'5px 12px', borderRadius:99, border:filterSecteur===v?'1.5px solid var(--or)':'1px solid var(--g2)', background:filterSecteur===v?'var(--or-l)':'var(--wh)', color:filterSecteur===v?'var(--or-d)':'var(--g6)', fontSize:12, cursor:'pointer', fontWeight:filterSecteur===v?500:400 }}>{l}</button>
              ))}
            </div>
            {mapView ? (
              <Suspense fallback={<div style={{ textAlign:'center', padding:40, color:'var(--g4)', fontSize:13 }}>Chargement de la carte...</div>}>
                <MissionsMap
                  missions={filteredMissions}
                  onSelectMission={(m) => { setSelectedMission(m); setScreen('mission-detail') }}
                  onApply={handleApply}
                  hasApplied={hasApplied}
                />
                <div style={{ fontSize:12, color:'var(--g4)', marginTop:8, textAlign:'center' }}>
                  {filteredMissions.length} mission{filteredMissions.length !== 1 ? 's' : ''} · cliquez sur un marqueur pour les détails
                </div>
              </Suspense>
            ) : filteredMissions.length === 0
              ? <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>Aucune mission trouvée avec ces critères</div>
              : filteredMissions.map(m => <MissionCard key={m.id} m={m} />)
            }
          </div>
        )}

        {screen === 'favoris' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:600 }}>Missions sauvegardées</div>
                <div style={{ fontSize:13, color:'var(--g4)' }}>{savedMissions.length} mission{savedMissions.length!==1?'s':''}</div>
              </div>
              <button onClick={() => setScreen('missions')} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
            </div>
            {savedMissions.length === 0
              ? <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>Aucune mission sauvegardée</div>
              : missions.filter(m => savedMissions.includes(m.id)).map(m => <MissionCard key={m.id} m={m} />)
            }
          </div>
        )}

        {screen === 'mission-detail' && selectedMission && (
          <div>
            <button onClick={() => setScreen('missions')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16 }}>‹ Retour</button>
            <div className="card" style={{ padding:20, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ fontSize:18, fontWeight:600, marginBottom:6 }}>{selectedMission.title}</div>
                <button onClick={() => toggleSave(selectedMission.id)}
                  aria-label={isSaved(selectedMission.id) ? 'Retirer des favoris' : 'Sauvegarder'}
                  style={{ background:'none', border:'none', cursor:'pointer', color: isSaved(selectedMission.id) ? 'var(--or)' : 'var(--g3)', padding:0, lineHeight:1, flexShrink:0, display:'flex', alignItems:'center' }}>
                  <Heart size={16} style={{ fill: isSaved(selectedMission.id) ? 'currentColor' : 'none' }} />
                </button>
              </div>
              <div style={{ fontSize:13, color:'var(--g4)', marginBottom:14 }}>
                <span style={{ cursor:'pointer', color:'var(--or)', fontWeight:500 }}
                  onClick={() => openCompanyProfile(selectedMission.company_id, selectedMission.companies)}>
                  {selectedMission.companies?.name}
                </span>
                {' · '}{selectedMission.city}
              </div>
              {selectedMission.description && <div style={{ fontSize:13, color:'var(--g6)', lineHeight:1.6, marginBottom:14, padding:'10px 12px', background:'var(--wh)', borderRadius:8 }}>{selectedMission.description}</div>}
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
                {(selectedMission.required_skills||[]).map(t => <span key={t} className="tag">{t}</span>)}
                {(selectedMission.required_certs||[]).map(t => <span key={t} className="tag" style={{background:'var(--bl-l)',color:'var(--bl-d)',borderColor:'#BFDBFE'}}>{t}</span>)}
              </div>
              {[
                ['Taux horaire', `${selectedMission.hourly_rate} €/h`],
                ['Durée', selectedMission.total_hours?`${selectedMission.total_hours}h`:'À définir'],
                ['Début', formatDate(selectedMission.start_date)],
                ['Lieu', selectedMission.city],
                ['Net estimé', selectedMission.total_hours?`~${Math.round(selectedMission.hourly_rate*selectedMission.total_hours*0.78)} €`:'—'],
              ].map(([l,v]) => (
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--g1)', fontSize:14 }}>
                  <span style={{ color:'var(--g4)' }}>{l}</span>
                  <span style={{ fontWeight:l.includes('Net')?600:500, color:l.includes('Net')?'var(--or)':'var(--bk)' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--gr-d)' }}>
              ✓ Contrat auto-généré par TEMPO · Signature électronique incluse
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn-secondary" style={{ flex:1 }} onClick={() => setScreen('missions')}>Retour</button>
              <button className="btn-primary" style={{ flex:2 }} disabled={hasApplied(selectedMission.id)||applying[selectedMission.id]} onClick={() => handleApply(selectedMission)}>
                {applying[selectedMission.id]?'Envoi...':hasApplied(selectedMission.id)?'✓ Candidature envoyée':'Postuler →'}
              </button>
            </div>
          </div>
        )}

        {screen === 'suivi' && (
          <div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>{t('my_missions')}</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:12 }}>{allMissions.length} candidature{allMissions.length !== 1 ? 's' : ''} au total</div>

            {/* Status filter tabs */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {[['tous','Toutes',allMissions.length],['pending','En attente',allMissions.filter(a=>a.status==='pending').length],['accepted','Acceptées',allMissions.filter(a=>a.status==='accepted').length],['rejected','Refusées',allMissions.filter(a=>a.status==='rejected').length],['completed','Terminées',allMissions.filter(a=>a.missions?.status==='completed').length]].map(([v,l,c]) => (
                <button key={v} onClick={() => setSuiviFilter(v)} style={{ padding:'5px 12px', borderRadius:99, border:suiviFilter===v?'1.5px solid var(--or)':'1px solid var(--g2)', background:suiviFilter===v?'var(--or-l)':'var(--wh)', color:suiviFilter===v?'var(--or-d)':'var(--g6)', fontSize:12, cursor:'pointer', fontWeight:suiviFilter===v?500:400 }}>
                  {l} {c > 0 && <span style={{ marginLeft:3, opacity:0.6 }}>({c})</span>}
                </button>
              ))}
            </div>

            {allMissions.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--g4)' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>Aucune candidature envoyée</div>
                <div style={{ fontSize:13, marginBottom:16 }}>Postulez à des missions pour les retrouver ici</div>
                <button className="btn-primary" onClick={() => setScreen('missions')}>Voir les missions →</button>
              </div>
            ) : (
              allMissions
                .filter(app => {
                  if (suiviFilter === 'tous') return true
                  if (suiviFilter === 'completed') return app.missions?.status === 'completed'
                  return app.status === suiviFilter
                })
                .map(app => {
                const m = app.missions
                const st = APP_STATUS[app.status] || { label: app.status, cls: 'badge-gray' }
                const isAccepted = app.status === 'accepted'
                const missionDone = m?.status === 'completed'
                const alreadyRated = ratedMissions.has(m?.id)
                const netEstime = m?.hourly_rate && m?.total_hours ? Math.round(m.hourly_rate * m.total_hours * 0.78) : null
                return (
                  <div key={app.id} className="card" style={{ padding:16, marginBottom:10, borderLeft: isAccepted ? '3px solid var(--gr)' : missionDone ? '3px solid var(--bl)' : '3px solid transparent' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{m?.title || '—'}</div>
                        <div style={{ fontSize:12, color:'var(--g4)' }}>{m?.companies?.name || '—'} · {m?.city || '—'}</div>
                      </div>
                      <span className={`badge ${missionDone ? 'badge-blue' : st.cls}`} style={{ fontSize:11, flexShrink:0 }}>{missionDone ? 'Terminée' : st.label}</span>
                    </div>
                    {/* Timeline de progression */}
                    {app.status !== 'rejected' && app.status !== 'withdrawn' && (
                      <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:10, marginBottom:4 }}>
                        {[['pending','Candidature'],['accepted','Accepté'],['active','En cours'],['completed','Terminée']].map(([step, label], i) => {
                          const currentStep = missionDone ? 3 : app.status === 'accepted' ? 1 : app.status === 'pending' ? 0 : m?.status === 'active' ? 2 : 0
                          const done = i <= currentStep
                          return (
                            <React.Fragment key={step}>
                              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                <div style={{ width:12, height:12, borderRadius:'50%', background: done ? (i === currentStep ? 'var(--or)' : 'var(--gr)') : 'var(--g2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  {done && <span style={{ color:'#fff', fontSize:7, lineHeight:1 }}>✓</span>}
                                </div>
                                <span style={{ fontSize:9, color: done ? 'var(--bk)' : 'var(--g4)', fontWeight: i === currentStep ? 600 : 400 }}>{label}</span>
                              </div>
                              {i < 3 && <div style={{ flex:1, height:2, background: i < currentStep ? 'var(--gr)' : 'var(--g2)', margin:'0 4px', borderRadius:1 }}></div>}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    )}
                    <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                      {m?.hourly_rate && <span style={{ fontSize:12, color:'var(--g6)' }}><strong>{m.hourly_rate}€/h</strong></span>}
                      {m?.total_hours && <span style={{ fontSize:12, color:'var(--g4)' }}>{m.total_hours}h</span>}
                      {m?.start_date && <span style={{ fontSize:12, color:'var(--g4)' }}>Début {formatDate(m.start_date)}</span>}
                      {m?.end_date && <span style={{ fontSize:12, color:'var(--g4)' }}>Fin {formatDate(m.end_date)}</span>}
                      {app.match_score && <span className="score-badge" style={{ fontSize:11 }}>{app.match_score}% match</span>}
                      {netEstime && <span style={{ fontSize:12, fontWeight:600, color:'var(--or)' }}>~{netEstime} € net</span>}
                    </div>
                    {app.status === 'pending' && (
                      <div style={{ marginTop:10 }}>
                        <button className="btn-secondary" style={{ padding:'6px 12px', fontSize:11, color:'var(--rd)', borderColor:'var(--rd)' }}
                          onClick={() => handleWithdraw(app.id)}>
                          Retirer ma candidature
                        </button>
                      </div>
                    )}
                    {isAccepted && !missionDone && (
                      <div style={{ marginTop:10, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                        {signedContracts.includes(m?.id) ? (
                          <div style={{ flex:1, padding:'8px 12px', background:'var(--gr-l)', borderRadius:8, fontSize:12, color:'var(--gr-d)' }}>
                            ✓ Contrat signé
                          </div>
                        ) : (
                          <button className="btn-dark" style={{ padding:'8px 14px', fontSize:12 }}
                            onClick={() => setContractModal({ missionId: m?.id, mission: m, companyName: m?.companies?.name || 'Entreprise' })}>
                            <PenLine size={16} style={{ verticalAlign:'middle', marginRight:4 }} /> Signer le contrat
                          </button>
                        )}
                        <button className="btn-primary" style={{ padding:'8px 14px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}
                          onClick={() => openChat(m?.companies?.id || m?.company_id, m?.companies?.name || 'Entreprise', m?.id)}>
                          <MessageCircle size={16} /> Contacter
                        </button>
                      </div>
                    )}
                    {missionDone && !alreadyRated && (
                      <div style={{ marginTop:10 }}>
                        <button className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'9px', fontSize:13, display:'flex', alignItems:'center', gap:6 }}
                          onClick={() => setRatingModal({ missionId: m.id, rateeId: m.companies?.id, companyName: m.companies?.name || 'l\'entreprise' })}>
                          <StarIcon size={12} fill="currentColor" /> Évaluer cette mission
                        </button>
                      </div>
                    )}
                    {missionDone && alreadyRated && (
                      <div style={{ marginTop:10, padding:'8px 12px', background:'var(--g1)', borderRadius:8, fontSize:12, color:'var(--g4)', textAlign:'center' }}>
                        ✓ Mission évaluée — merci !
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {screen === 'gains' && (
          <div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:16 }}>{t('my_earnings')}</div>

            {/* KPIs principaux */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
              {[[formatAmount(totalMois),'Ce mois'],[formatAmount(totalAnnee),'Cette année'],[worker?.missions_completed||0,'Missions'],[worker?.ca_ytd?`${Math.round((worker.ca_ytd/77700)*100)}%`:'0%','CA / plafond']].map(([v,l]) => (
                <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value" style={{fontSize:18}}>{v}</div></div>
              ))}
            </div>

            {/* Résumé mensuel détaillé */}
            <div className="card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Résumé du mois</div>
              {(() => {
                const now = new Date()
                const monthInvoices = invoices.filter(i => { const d = new Date(i.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
                const monthMissions = allMissions.filter(a => a.missions?.status === 'completed' && a.missions?.completed_at && new Date(a.missions.completed_at).getMonth() === now.getMonth())
                const totalHours = monthInvoices.reduce((s, i) => s + parseFloat(i.total_hours || i.contracts?.missions?.total_hours || 0), 0)
                const totalNet = monthInvoices.reduce((s, i) => s + parseFloat(i.worker_payout || 0), 0)
                const avgRate = monthInvoices.length > 0 ? monthInvoices.reduce((s, i) => s + parseFloat(i.contracts?.missions?.hourly_rate || 0), 0) / monthInvoices.length : 0
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                    <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:600, color:'var(--or)' }}>{monthMissions.length}</div>
                      <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Missions terminées</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:600, color:'var(--gr)' }}>{Math.round(totalHours)}h</div>
                      <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Heures travaillées</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:600, color:'var(--gr)' }}>{Math.round(totalNet)} €</div>
                      <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Revenus nets</div>
                    </div>
                    <div style={{ textAlign:'center', padding:'10px 8px', background:'var(--g1)', borderRadius:8 }}>
                      <div style={{ fontSize:18, fontWeight:600 }}>{worker?.rating_avg ? parseFloat(worker.rating_avg).toFixed(1) : '—'}</div>
                      <div style={{ fontSize:10, color:'var(--g4)', marginTop:2 }}>Note moyenne</div>
                    </div>
                  </div>
                )
              })()}
            </div>
            {/* Graphique gains mensuels */}
            {invoices.length > 0 && (() => {
              const months = {}
              invoices.filter(i => i.status === 'paid').forEach(inv => {
                const d = new Date(inv.created_at)
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
                months[key] = (months[key]||0) + parseFloat(inv.worker_payout||0)
              })
              const entries = Object.entries(months).sort().slice(-6)
              const max = Math.max(...entries.map(e => e[1]), 1)
              if (entries.length === 0) return null
              return (
                <div className="card" style={{ padding:16, marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Évolution des gains</div>
                  <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:100 }}>
                    {entries.map(([month, total]) => (
                      <div key={month} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <div style={{ fontSize:10, fontWeight:600, color:'var(--gr)' }}>{Math.round(total)}€</div>
                        <div style={{ width:'100%', background:'var(--gr)', borderRadius:4, height: Math.max(4, (total/max)*70), transition:'height .3s' }}></div>
                        <div style={{ fontSize:10, color:'var(--g4)' }}>{month.split('-')[1]}/{month.split('-')[0].slice(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Projection CA */}
            {worker?.ca_ytd > 0 && (
              <div className="card" style={{ padding:16, marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Projection CA annuel</div>
                <div className="pbar" style={{ height:8, marginBottom:6 }}>
                  <div className="pfill" style={{ width:`${Math.min(100, (worker.ca_ytd / 77700) * 100)}%`, background: worker.ca_ytd > 70000 ? 'var(--rd)' : worker.ca_ytd > 50000 ? '#D97706' : 'var(--gr)' }}></div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--g4)' }}>
                  <span>{formatAmount(worker.ca_ytd)}</span>
                  <span>Plafond AE : 77 700 €</span>
                </div>
                {worker.ca_ytd > 70000 && <div style={{ marginTop:8, padding:'8px 12px', background:'var(--rd-l)', borderRadius:8, fontSize:12, color:'var(--rd)' }}>⚠ Vous approchez du plafond auto-entrepreneur</div>}
              </div>
            )}

            {invoices.length === 0
              ? <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>Vos gains apparaîtront ici après vos premières missions</div>
              : <div className="card" style={{ padding:0, overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', minWidth:400 }}>
                    <thead><tr style={{ background:'var(--g1)' }}>
                      {['Référence','Date','Montant','Statut'].map(h => <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:12, fontWeight:500, color:'var(--g4)', borderBottom:'1px solid var(--g2)' }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{invoices.map((inv,i) => (
                      <tr key={inv.id} style={{ background:i%2===1?'var(--g1)':'var(--wh)' }}>
                        <td style={{ padding:'10px 12px', fontSize:12, fontWeight:500 }}>{inv.invoice_number}</td>
                        <td style={{ padding:'10px 12px', fontSize:12, color:'var(--g4)' }}>{formatDate(inv.created_at)}</td>
                        <td style={{ padding:'10px 12px', fontSize:13, fontWeight:600 }}>{formatAmount(inv.worker_payout)}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span className={`badge ${inv.status==='paid'?'badge-green':'badge-orange'}`} style={{fontSize:11}}>{inv.status==='paid'?'Payée':'En attente'}</span>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
            }
          </div>
        )}

        {/* ── MESSAGES ── */}
        {screen === 'messages' && !chatPartner && (
          <div>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Messages</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Vos conversations avec les entreprises</div>
            {allMissions.filter(a => a.status === 'accepted' || a.missions?.status === 'active' || a.missions?.status === 'completed').length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>
                <div style={{ fontSize:32, marginBottom:12, display:'flex', justifyContent:'center' }}><MessageCircle size={32} /></div>
                La messagerie est disponible après acceptation d'une candidature
              </div>
            ) : (
              allMissions
                .filter(a => a.status === 'accepted' || a.missions?.status === 'active' || a.missions?.status === 'completed')
                .map(app => {
                  const m = app.missions
                  return (
                    <div key={app.id} className="card-mission is-accepted" style={{ padding:14, marginBottom:8 }}
                      onClick={() => openChat(m?.companies?.id || m?.company_id, m?.companies?.name || 'Entreprise', m?.id)}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--bl-l)', color:'#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>
                          {(m?.companies?.name||'E')[0]}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600 }}>{m?.companies?.name || '—'}</div>
                          <div style={{ fontSize:12, color:'var(--g4)' }}>{m?.title || '—'}</div>
                        </div>
                        <span style={{ fontSize:16, color:'var(--g3)' }}>›</span>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        )}

        {screen === 'chat' && chatPartner && (
          <div style={{ display:'flex', flexDirection:'column', height:'calc(100dvh - 160px)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <button onClick={() => { setChatPartner(null); setScreen('messages') }} style={{ background:'none', border:'none', fontSize:13, color:'var(--g4)', cursor:'pointer' }}>‹ Retour</button>
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

        {/* ── ALERTES ── */}
        {screen === 'alertes' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:600 }}>Alertes personnalisées</div>
              <button onClick={() => setScreen('missions')} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
            </div>
            <div className="card" style={{ padding:16, marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Créer une alerte</div>
              <div style={{ fontSize:12, color:'var(--g4)', marginBottom:12 }}>Recevez une notification quand une mission correspond à vos critères</div>
              {(() => {
                const [aS, setAS] = [filterSecteur, setFilterSecteur]
                return (
                  <div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                      <div>
                        <label style={{ fontSize:11, color:'var(--g4)', display:'block', marginBottom:3 }}>Secteur</label>
                        <select className="input" value={filterSecteur} onChange={e => setFilterSecteur(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }}>
                          <option value="tous">Tous</option>
                          <option value="logistique">Logistique</option>
                          <option value="btp">BTP</option>
                          <option value="industrie">Industrie</option>
                          <option value="hotellerie">Hôtellerie</option>
                          <option value="proprete">Propreté</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, color:'var(--g4)', display:'block', marginBottom:3 }}>Taux minimum (€/h)</label>
                        <input className="input" type="number" placeholder="15" value={filterRateMin} onChange={e => setFilterRateMin(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} />
                      </div>
                    </div>
                    <button className="btn-primary" style={{ fontSize:12, padding:'8px 16px' }}
                      onClick={() => saveAlert({ sector: filterSecteur, minRate: filterRateMin, city: profileForm.city })}>
                      Créer l'alerte
                    </button>
                  </div>
                )
              })()}
            </div>
            {savedAlerts.length > 0 && (
              <div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Alertes actives</div>
                {savedAlerts.map(a => (
                  <div key={a.id} className="card" style={{ padding:12, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>
                        {a.sector !== 'tous' ? SECTOR_LABELS[a.sector] || a.sector : 'Tous secteurs'}
                        {a.minRate ? ` · ≥${a.minRate}€/h` : ''}
                        {a.city ? ` · ${a.city}` : ''}
                      </div>
                      <div style={{ fontSize:11, color:'var(--g4)' }}>Créée le {formatDate(a.created_at)}</div>
                    </div>
                    <button onClick={() => deleteAlert(a.id)} aria-label="Supprimer" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--rd)', display:'flex', alignItems:'center' }}><X size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CALENDRIER DISPONIBILITÉ ── */}
        {screen === 'calendrier' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:18, fontWeight:600 }}>Calendrier de disponibilité</div>
              <button onClick={() => setScreen('profil')} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
            </div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Cliquez sur un jour pour le bloquer/débloquer. Les entreprises verront votre disponibilité réelle.</div>
            <div className="card" style={{ padding:16 }}>
              {(() => {
                const today = new Date()
                const year = today.getFullYear()
                const month = today.getMonth()
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                const firstDay = new Date(year, month, 1).getDay()
                const monthName = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                const cells = []
                for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
                for (let d = 1; d <= daysInMonth; d++) cells.push(d)
                return (
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, textAlign:'center', marginBottom:12, textTransform:'capitalize' }}>{monthName}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
                      {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
                        <div key={d} style={{ textAlign:'center', fontSize:11, color:'var(--g4)', fontWeight:500, padding:4 }}>{d}</div>
                      ))}
                      {cells.map((d, i) => {
                        if (d === null) return <div key={`e${i}`}></div>
                        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                        const isBlocked = blockedDays.includes(dateStr)
                        const isPast = d < today.getDate()
                        const isToday = d === today.getDate()
                        return (
                          <button key={d} onClick={() => !isPast && toggleBlockedDay(dateStr)}
                            style={{ padding:8, borderRadius:8, border: isToday ? '2px solid var(--or)' : '1px solid var(--g2)', background: isBlocked ? 'var(--rd)' : isPast ? 'var(--g1)' : 'var(--wh)', color: isBlocked ? '#fff' : isPast ? 'var(--g3)' : 'var(--bk)', fontSize:13, fontWeight: isToday ? 600 : 400, cursor: isPast ? 'default' : 'pointer', textAlign:'center', transition:'all .15s' }}>
                            {d}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--g4)', marginTop:8 }}>
                      <span>⬜ Disponible</span>
                      <span style={{ color:'var(--rd)' }}>🟥 Bloqué</span>
                      <span>{blockedDays.filter(d => d.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length} jour(s) bloqué(s) ce mois</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {screen === 'profil' && (
          <div>
            <div className="card" style={{ padding:20, marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'#111', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:600 }}>{initials}</div>
                <div>
                  <div style={{ fontSize:17, fontWeight:600 }}>{displayName}</div>
                  <div style={{ fontSize:13, color:'var(--g4)' }}>{profile?.email}</div>
                  {worker?.rating_avg > 0 && <div style={{ marginTop:4 }}><Star n={worker.rating_avg} /><span style={{ fontSize:12, color:'var(--g4)', marginLeft:4 }}>{parseFloat(worker.rating_avg).toFixed(1)} · {worker.rating_count} avis</span></div>}
                </div>
              </div>

              {/* Informations personnelles */}
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Informations personnelles</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Prénom</label>
                  <input className="input" value={profileForm.first_name||''} onChange={e => setProfileForm(f=>({...f,first_name:e.target.value}))} /></div>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Nom</label>
                  <input className="input" value={profileForm.last_name||''} onChange={e => setProfileForm(f=>({...f,last_name:e.target.value}))} /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Ville</label>
                  <input className="input" value={profileForm.city||''} onChange={e => setProfileForm(f=>({...f,city:e.target.value}))} placeholder="Ex: Lyon" /></div>
                <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>SIRET</label>
                  <input className="input" value={profileForm.siret||''} onChange={e => setProfileForm(f=>({...f,siret:e.target.value}))} placeholder="12345678900012" maxLength={14} /></div>
              </div>

              {/* Rayon d'intervention */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Rayon d'intervention : <strong>{profileForm.radius_km || 10} km</strong></label>
                <input type="range" min="1" max="100" value={profileForm.radius_km || 10}
                  onChange={e => setProfileForm(f=>({...f,radius_km:parseInt(e.target.value)}))}
                  style={{ width:'100%', accentColor:'var(--or)' }} />
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--g4)' }}>
                  <span>1 km</span><span>50 km</span><span>100 km</span>
                </div>
              </div>

              {/* Compétences */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Compétences</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                  {(profileForm.skills||worker?.skills||[]).map(s => (
                    <span key={s} className="tag" style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                      {s}
                      <button onClick={() => setProfileForm(f => ({...f, skills:(f.skills||worker?.skills||[]).filter(sk=>sk!==s)}))}
                        aria-label="Supprimer"
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--g4)', padding:0, lineHeight:1, display:'flex', alignItems:'center' }}><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <input className="input" placeholder="Ajouter une compétence..." value={newSkill} onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newSkill.trim()) { setProfileForm(f => ({...f, skills:[...(f.skills||worker?.skills||[]), newSkill.trim()]})); setNewSkill('') }}}
                    style={{ flex:1 }} />
                  <button className="btn-secondary" style={{ padding:'8px 12px', fontSize:12 }}
                    onClick={() => { if (newSkill.trim()) { setProfileForm(f => ({...f, skills:[...(f.skills||worker?.skills||[]), newSkill.trim()]})); setNewSkill('') }}}>
                    +
                  </button>
                </div>
              </div>

              {/* Certifications */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Certifications</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                  {(profileForm.certifications||worker?.certifications||[]).map(c => (
                    <span key={typeof c === 'string' ? c : c.name} className="tag" style={{ background:'var(--bl-l)', color:'var(--bl-d)', borderColor:'#BFDBFE', display:'inline-flex', alignItems:'center', gap:4 }}>
                      {typeof c === 'string' ? c : c.name}
                      <button onClick={() => setProfileForm(f => ({...f, certifications:(f.certifications||worker?.certifications||[]).filter(ck => (typeof ck === 'string' ? ck : ck.name) !== (typeof c === 'string' ? c : c.name))}))}
                        aria-label="Supprimer"
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--bl-d)', padding:0, lineHeight:1, display:'flex', alignItems:'center' }}><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <input className="input" placeholder="Ajouter une certification (CACES, habilitation...)" value={newCert} onChange={e => setNewCert(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newCert.trim()) { setProfileForm(f => ({...f, certifications:[...(f.certifications||worker?.certifications||[]), newCert.trim()]})); setNewCert('') }}}
                    style={{ flex:1 }} />
                  <button className="btn-secondary" style={{ padding:'8px 12px', fontSize:12 }}
                    onClick={() => { if (newCert.trim()) { setProfileForm(f => ({...f, certifications:[...(f.certifications||worker?.certifications||[]), newCert.trim()]})); setNewCert('') }}}>
                    +
                  </button>
                </div>
              </div>

              <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile?'Sauvegarde...':'Sauvegarder mon profil'}
              </button>
            </div>

            {/* KYC / Documents status */}
            <div className="card" style={{ padding:16, marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Documents & vérifications</div>
              {[
                ['Pièce d\'identité', worker?.id_verified],
                ['SIRET', worker?.siret_verified],
                ['RC Pro', worker?.rc_pro_verified],
              ].map(([label, verified]) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--g1)' }}>
                  <span style={{ fontSize:13, color:'var(--g6)' }}>{label}</span>
                  <span className={`badge ${verified ? 'badge-green' : 'badge-orange'}`} style={{ fontSize:11 }}>
                    {verified ? '✓ Vérifié' : 'En attente'}
                  </span>
                </div>
              ))}
              {worker?.kyc_completed_at && (
                <div style={{ fontSize:11, color:'var(--g4)', marginTop:8 }}>KYC complété le {formatDate(worker.kyc_completed_at)}</div>
              )}
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="card" style={{ padding:16, marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Badges obtenus</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {badges.map(b => (
                    <div key={b.label} style={{ textAlign:'center', padding:8, background:'#FFF2EE', borderRadius:8 }} title={b.desc}>
                      <div style={{ fontSize:20, marginBottom:2 }}>{b.icon}</div>
                      <div style={{ fontSize:10, fontWeight:500, color:'var(--or-d)' }}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendrier link */}
            <button className="btn-secondary" style={{ width:'100%', justifyContent:'center', marginBottom:12 }}
              onClick={() => setScreen('calendrier')}>
              📅 Calendrier de disponibilité
            </button>

            {/* Alertes link */}
            <button className="btn-secondary" style={{ width:'100%', justifyContent:'center', marginBottom:12 }}
              onClick={() => setScreen('alertes')}>
              <Bell size={16} style={{ verticalAlign:'middle', marginRight:4 }} /> Gérer mes alertes ({savedAlerts.length})
            </button>

            <div className="card" style={{ padding:16, marginBottom:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', textAlign:'center' }}>
                {[[worker?.missions_completed||0,'Missions'],[worker?.rating_avg?parseFloat(worker.rating_avg).toFixed(1):'—','Note'],[worker?.rating_count||0,'Avis']].map(([v,l],i) => (
                  <div key={l} style={{ borderLeft:i>0?'1px solid var(--g2)':'none' }}>
                    <div style={{ fontSize:20, fontWeight:600 }}>{v}</div>
                    <div style={{ fontSize:12, color:'var(--g4)', marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-secondary" style={{ width:'100%', justifyContent:'center' }} onClick={async () => { await supabase.auth.signOut() }}>
              Se déconnecter
            </button>
          </div>
        )}

        {/* ── PAGE ENTREPRISE PUBLIQUE ── */}
        {screen === 'company-profile' && viewCompany && (
          <div>
            <button onClick={() => setScreen('missions')} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16 }}>‹ Retour</button>
            <div className="card" style={{ padding:20, marginBottom:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                <div style={{ width:52, height:52, borderRadius:12, background:'var(--or)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:600 }}>
                  {(viewCompany.name || '?')[0]}
                </div>
                <div>
                  <div style={{ fontSize:18, fontWeight:600 }}>{viewCompany.name}</div>
                  <div style={{ fontSize:13, color:'var(--g4)' }}>{viewCompany.city || 'France'}</div>
                  {viewCompany.rating_avg > 0 && (
                    <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ color:'var(--am)', fontSize:12 }}>{'★'.repeat(Math.round(viewCompany.rating_avg))}{'☆'.repeat(5-Math.round(viewCompany.rating_avg))}</span>
                      <span style={{ fontSize:12, color:'var(--g4)' }}>{parseFloat(viewCompany.rating_avg).toFixed(1)} · {viewCompany.rating_count || 0} avis</span>
                    </div>
                  )}
                </div>
              </div>
              {viewCompany.description && (
                <div style={{ fontSize:13, color:'var(--g6)', lineHeight:1.6, marginBottom:14 }}>{viewCompany.description}</div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  [viewCompany.missions_posted || 0, 'Missions publiées'],
                  [viewCompany.rating_avg ? parseFloat(viewCompany.rating_avg).toFixed(1) : '—', 'Note moyenne'],
                  [viewCompany.plan === 'premium' ? 'Premium' : 'Standard', 'Abonnement'],
                ].map(([v, l]) => (
                  <div key={l} className="metric-card" style={{ textAlign:'center' }}>
                    <div className="metric-value" style={{ fontSize:18 }}>{v}</div>
                    <div className="metric-label">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Missions ouvertes de l'entreprise */}
            <div style={{ fontSize:15, fontWeight:600, marginBottom:10 }}>Missions ouvertes</div>
            {companyMissions.length === 0 ? (
              <div style={{ textAlign:'center', padding:30, color:'var(--g4)', fontSize:13 }}>Aucune mission ouverte actuellement</div>
            ) : companyMissions.map(m => (
              <div key={m.id} className="card-mission" style={{ padding:14, marginBottom:8 }}
                onClick={() => {
                  const fullMission = missions.find(fm => fm.id === m.id) || m
                  setSelectedMission(fullMission)
                  setScreen('mission-detail')
                }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{m.title}</div>
                <div style={{ fontSize:12, color:'var(--g4)' }}>{m.city} · {m.hourly_rate}€/h · {m.total_hours ? `${m.total_hours}h` : ''} · {formatDate(m.start_date)}</div>
              </div>
            ))}
          </div>
        )}

        {screen === 'notifs' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ fontSize:18, fontWeight:600 }}>Notifications</div>
              <button onClick={() => setScreen('accueil')} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
            </div>

            {/* Actions bar */}
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
              {unreadCount > 0 && (
                <button onClick={async () => { await markNotifsRead(user.id); setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))) }}
                  style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--g2)', background:'var(--wh)', color:'var(--g6)', fontSize:12, cursor:'pointer' }}>
                  ✓ Tout marquer comme lu ({unreadCount})
                </button>
              )}
              <select className="input" value={notifFilter} onChange={e => setNotifFilter(e.target.value)}
                style={{ width:'auto', padding:'5px 10px', fontSize:12 }}>
                <option value="tous">Toutes</option>
                <option value="unread">Non lues</option>
                <option value="new_mission">Nouvelles missions</option>
                <option value="application_accepted">Acceptations</option>
                <option value="application_rejected">Refus</option>
                <option value="payment_received">Paiements</option>
                <option value="rating_received">Évaluations</option>
              </select>
            </div>

            {(() => {
              let filtered = notifs
              if (notifFilter === 'unread') filtered = notifs.filter(n => !n.read_at)
              else if (notifFilter !== 'tous') filtered = notifs.filter(n => n.type === notifFilter)
              return filtered.length === 0
                ? <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>Aucune notification</div>
                : filtered.map(n => (
                  <div key={n.id} className="card" style={{ padding:'12px 16px', marginBottom:8, borderLeft:!n.read_at?'3px solid var(--or)':'3px solid transparent' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontSize:13, color:n.read_at?'var(--g4)':'var(--bk)', fontWeight:n.read_at?400:500 }}>{n.title}</div>
                      {!n.read_at && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--or)', flexShrink:0, marginTop:5 }}></span>}
                    </div>
                    {n.body && <div style={{ fontSize:12, color:'var(--g4)', marginTop:2 }}>{n.body}</div>}
                    <div style={{ fontSize:11, color:'var(--g4)', marginTop:4 }}>{formatDate(n.created_at)}</div>
                  </div>
                ))
            })()}
          </div>
        )}

      </div>
    </div>
  )
}
