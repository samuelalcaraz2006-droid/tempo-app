import { createClient } from '@supabase/supabase-js'
import { captureError, logWarn } from './sentry'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  // Intentionnel : erreur de config au module-load, avant même que Sentry
  // soit initialisé. Si on arrive ici en prod c'est que le build Vercel
  // a raté les env vars → signal visible dans la console du navigateur.
  // biome-ignore lint/suspicious/noConsole: config-time error
  console.error(
    'TEMPO: Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes. Ajoutez-les dans .env ou dans Vercel Dashboard > Settings > Environment Variables',
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ── Helpers auth ──────────────────────────────
export const signUp = async ({ email, password, role, firstName, lastName, companyName, phone, siret, city, radiusKm }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        phone: phone || null,
        siret: siret || null,
        city: city || null,
        radius_km: radiusKm ? parseInt(radiusKm, 10) : 10,
      },
    },
  })
  return { data, error }
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

// ── Helpers workers ───────────────────────────
export const getWorkerProfile = async (userId) => {
  const { data, error } = await supabase.from('workers').select('*, profiles(*)').eq('id', userId).single()
  return { data, error }
}

export const updateWorkerProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('workers')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

export const setWorkerAvailability = async (userId, isAvailable) => {
  const { data, error } = await supabase.from('workers').update({ is_available: isAvailable }).eq('id', userId)
  return { data, error }
}

// ── Helpers companies ─────────────────────────
export const getCompanyProfile = async (userId) => {
  const { data, error } = await supabase.from('companies').select('*, profiles(*)').eq('id', userId).single()
  return { data, error }
}

export const updateCompanyProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('companies')
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

// ── Helpers missions ──────────────────────────
export const getMissions = async ({
  status = 'open',
  sector,
  urgency,
  rateMin,
  rateMax,
  durationMin,
  durationMax,
  startAfter,
  startBefore,
  limit = 20,
  offset = 0,
} = {}) => {
  let query = supabase
    .from('missions')
    .select('*, companies(name, city, rating_avg, rating_count)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (sector) query = query.eq('sector', sector)
  if (urgency && urgency !== 'tous') query = query.eq('urgency', urgency)
  if (rateMin) query = query.gte('hourly_rate', parseFloat(rateMin))
  if (rateMax) query = query.lte('hourly_rate', parseFloat(rateMax))
  if (durationMin) query = query.gte('total_hours', parseFloat(durationMin))
  if (durationMax) query = query.lte('total_hours', parseFloat(durationMax))
  if (startAfter) query = query.gte('start_date', startAfter)
  if (startBefore) query = query.lte('start_date', startBefore)

  const { data, error } = await query
  return { data, error }
}

export const getMissionById = async (id) => {
  const { data, error } = await supabase.from('missions').select('*, companies(name, city, rating_avg, rating_count, lat, lng)').eq('id', id).single()
  return { data, error }
}

export const createMission = async (mission) => {
  const { data, error } = await supabase
    .from('missions')
    .insert({ ...mission, status: 'open', published_at: new Date().toISOString() })
    .select()
    .single()
  return { data, error }
}

export const getCompanyMissions = async (companyId) => {
  // Hint FK explicite : missions.assigned_worker_id → workers(id)
  const { data, error } = await supabase
    .from('missions')
    .select('*, workers!assigned_worker_id(id, first_name, last_name, rating_avg)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ── Helpers candidatures ──────────────────────
export const applyToMission = async ({ missionId, workerId, matchScore }) => {
  const { data, error } = await supabase
    .from('applications')
    .insert({ mission_id: missionId, worker_id: workerId, match_score: matchScore })
    .select()
    .single()
  return { data, error }
}

export const getWorkerApplications = async (workerId) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*, missions(title, hourly_rate, start_date, city, companies(name))')
    .eq('worker_id', workerId)
    .order('applied_at', { ascending: false })
  return { data, error }
}

export const getMissionApplications = async (missionId) => {
  // matching_scores n'a pas de FK depuis applications → jointure séparée impossible ici
  const { data, error } = await supabase
    .from('applications')
    .select('*, workers(id, first_name, last_name, rating_avg, rating_count, skills, certifications, city)')
    .eq('mission_id', missionId)
    .order('applied_at', { ascending: false })
  return { data, error }
}

// ── Helpers ratings ───────────────────────────
export const createRating = async ({ missionId, raterId, ratedId, raterRole, score, scoreDetail, comment }) => {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ mission_id: missionId, rater_id: raterId, rated_id: ratedId, rater_role: raterRole, score, score_detail: scoreDetail, comment })
    .select()
    .single()
  return { data, error }
}

export const getWorkerRatings = async (workerId) => {
  const { data, error } = await supabase
    .from('ratings')
    .select('*, companies(name)')
    .eq('rated_id', workerId)
    .eq('rater_role', 'company')
    .order('created_at', { ascending: false })
  return { data, error }
}

// ── Helpers notifications ─────────────────────
export const getNotifications = async (userId) => {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)
  return { data, error }
}

export const markNotifsRead = async (userId) => {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
  return { error }
}

export const createNotification = async ({ userId, type, title, body, payload = {} }) => {
  const { data, error } = await supabase.from('notifications').insert({ user_id: userId, type, title, body, payload }).select().single()
  return { data, error }
}

// ── Helpers matching scores ───────────────────
export const saveMatchingScores = async (scores) => {
  const { data, error } = await supabase.from('matching_scores').upsert(scores, { onConflict: 'mission_id,worker_id' })
  return { data, error }
}

export const getMatchingScoresForMission = async (missionId) => {
  const { data, error } = await supabase
    .from('matching_scores')
    .select('*, workers(first_name, last_name, rating_avg, city, is_available, skills, certifications)')
    .eq('mission_id', missionId)
    .order('total_score', { ascending: false })
    .limit(10)
  return { data, error }
}

// ── Helpers gains ─────────────────────────────
export const getWorkerInvoices = async (workerId) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, contracts(missions(title, start_date, end_date, companies(name)))')
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false })
  return { data, error }
}

export const getCompanyInvoices = async (companyId) => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, contracts(missions(title), workers(first_name, last_name))')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ── Realtime subscriptions ────────────────────
export const subscribeToMissions = (callback) => {
  return supabase
    .channel('missions_channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'missions', filter: `status=eq.open` }, callback)
    .subscribe()
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const subscribeToNotifications = (userId, callback) => {
  if (!userId || !UUID_RE.test(userId)) {
    captureError(userId, { source: 'subscribeToNotifications' })
    return null
  }
  return supabase
    .channel(`notifs_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
    .subscribe()
}

// ── Helpers candidatures — actions ────────────────────────────
export const updateApplicationStatus = async (applicationId, status) => {
  const { data, error } = await supabase.from('applications').update({ status }).eq('id', applicationId).select().single()
  return { data, error }
}

export const assignWorkerToMission = async (missionId, workerId) => {
  const { data, error } = await supabase
    .from('missions')
    .update({ status: 'matched', assigned_worker_id: workerId })
    .eq('id', missionId)
    .select()
    .single()
  return { data, error }
}

export const completeMission = async (missionId) => {
  const { data, error } = await supabase
    .from('missions')
    .update({ status: 'completed', end_date: new Date().toISOString() })
    .eq('id', missionId)
    .select()
    .single()
  return { data, error }
}

// ── Helpers messages (chat) ──────────────────
// Retourne les conversations groupees par partenaire (un interlocuteur = une conversation,
// quelle que soit la mission). Enrichit avec le nom du partenaire et le titre de la dernière mission.
export const getConversations = async (userId) => {
  if (!userId) return { data: [], error: null }
  const { data: msgs, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) {
    logWarn('[getConversations] select error:', { ctx: error.message })
    return { data: [], error }
  }
  if (!msgs || msgs.length === 0) return { data: [], error: null }

  // Groupe par partenaire. msgs sont du plus recent au plus ancien,
  // la premiere occurrence gagne pour "dernier message".
  const map = new Map()
  for (const m of msgs) {
    const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id
    if (!map.has(partnerId)) {
      map.set(partnerId, {
        partnerId,
        missionId: m.mission_id || null,
        lastMessage: m.content,
        lastAt: m.created_at,
        lastSenderId: m.sender_id,
        unreadCount: 0,
      })
    }
    const conv = map.get(partnerId)
    // Fallback : si le dernier message n'a pas de mission, prendre la plus recente qui en a une.
    if (!conv.missionId && m.mission_id) conv.missionId = m.mission_id
    if (m.receiver_id === userId && !m.read_at) conv.unreadCount += 1
  }

  const conversations = Array.from(map.values())
  const partnerIds = [...new Set(conversations.map((c) => c.partnerId))]
  const missionIds = [...new Set(conversations.map((c) => c.missionId).filter(Boolean))]

  // Batch enrichissement (noms partenaires + titres missions)
  const [profilesRes, workersRes, companiesRes, missionsRes] = await Promise.all([
    supabase.from('profiles').select('id, email, role').in('id', partnerIds),
    supabase.from('workers').select('id, first_name, last_name').in('id', partnerIds),
    supabase.from('companies').select('id, name').in('id', partnerIds),
    missionIds.length ? supabase.from('missions').select('id, title').in('id', missionIds) : Promise.resolve({ data: [] }),
  ])

  const profileById = new Map((profilesRes.data || []).map((p) => [p.id, p]))
  const workerById = new Map((workersRes.data || []).map((w) => [w.id, w]))
  const companyById = new Map((companiesRes.data || []).map((c) => [c.id, c]))
  const missionById = new Map((missionsRes.data || []).map((m) => [m.id, m]))

  for (const conv of conversations) {
    const prof = profileById.get(conv.partnerId)
    if (prof?.role === 'travailleur') {
      const w = workerById.get(conv.partnerId)
      conv.partnerName = w ? `${w.first_name || ''} ${w.last_name || ''}`.trim() || prof.email : prof.email
      conv.partnerRole = 'travailleur'
    } else if (prof?.role === 'entreprise') {
      const c = companyById.get(conv.partnerId)
      conv.partnerName = c?.name || prof.email
      conv.partnerRole = 'entreprise'
    } else {
      conv.partnerName = prof?.email || 'Utilisateur'
      conv.partnerRole = prof?.role || null
    }
    const mission = conv.missionId ? missionById.get(conv.missionId) : null
    conv.missionTitle = mission?.title || null
  }

  return { data: conversations, error: null }
}

export const getMessages = async (userId, partnerId, missionId) => {
  let query = supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true })
  if (missionId) query = query.eq('mission_id', missionId)
  const { data, error } = await query
  return { data, error }
}

export const sendMessage = async ({ senderId, receiverId, missionId, content }) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, mission_id: missionId, content })
    .select()
    .single()
  return { data, error }
}

// Marque comme lus tous les messages recus de partnerId (optionnellement scope a une mission).
export const markMessagesRead = (userId, partnerId, missionId) => {
  if (!userId || !partnerId) return Promise.resolve({ data: null, error: null })
  let q = supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', userId)
    .eq('sender_id', partnerId)
    .is('read_at', null)
  if (missionId) q = q.eq('mission_id', missionId)
  return q
}

export const countUnreadMessages = (userId) =>
  supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiver_id', userId).is('read_at', null)

// Ecoute :
//   - INSERT des messages recus par userId              → onInsert(payload)
//   - UPDATE des messages ENVOYES par userId            → onUpdate(payload)
//     (la transition `read_at` cote destinataire arrive ici — permet au sender d'afficher ✓✓ en live)
export const subscribeToMessages = (userId, onInsert, onUpdate) => {
  if (!userId) return { unsubscribe: () => {} }
  const channelName = `messages_${userId}_${Math.random().toString(36).slice(2, 10)}`
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, onInsert)
  if (typeof onUpdate === 'function') {
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${userId}` }, onUpdate)
  }
  channel.subscribe()
  return {
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
    channel,
  }
}

// Canal broadcast realtime pour l'indicateur "est en train d'ecrire" entre deux utilisateurs.
// Le nom de canal est canonicalise a partir de la paire triee, les deux cotes rejoignent la même room.
// Retourne { sendTyping, unsubscribe }. onTyping est declenche uniquement pour les events du partenaire.
export const subscribeToChatPresence = (userId, partnerId, onTyping) => {
  if (!userId || !partnerId) {
    return { sendTyping: () => {}, unsubscribe: () => {} }
  }
  const pair = [userId, partnerId].sort().join(':')
  const channelName = `chat:${pair}`
  const channel = supabase.channel(channelName, { config: { broadcast: { self: false } } })
  channel.on('broadcast', { event: 'typing' }, (payload) => {
    const fromId = payload?.payload?.userId
    if (!fromId || fromId === userId) return
    onTyping?.(payload.payload)
  })
  let subscribed = false
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') subscribed = true
  })
  const sendTyping = (state = 'start') => {
    if (!subscribed) return
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, state, at: Date.now() },
    })
  }
  return {
    sendTyping,
    unsubscribe: () => {
      supabase.removeChannel(channel)
    },
  }
}

// ── Helpers cancellation / disputes ──────────
export const cancelMission = async (missionId, reason) => {
  const updates = { status: 'cancelled' }
  if (reason) updates.cancellation_reason = reason // ne pas écraser description
  const { data, error } = await supabase.from('missions').update(updates).eq('id', missionId).select().single()
  return { data, error }
}

export const withdrawApplication = async (applicationId) => {
  const { data, error } = await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', applicationId).select().single()
  return { data, error }
}

export const getWorkerMissions = async (workerId) => {
  // company_id inclus dans missions pour le chat et la signature de contrat
  const { data, error } = await supabase
    .from('applications')
    .select(
      'id, status, applied_at, match_score, missions(id, title, hourly_rate, total_hours, start_date, end_date, city, status, sector, company_id, companies(id, name))',
    )
    .eq('worker_id', workerId)
    .order('applied_at', { ascending: false })
  return { data, error }
}

// ── Helpers contrats ──────────────────────────
export const saveContract = async (contractData) => {
  const { data, error } = await supabase
    .from('contracts')
    .upsert({ ...contractData, updated_at: new Date().toISOString() }, { onConflict: 'mission_id' })
    .select()
    .single()
  return { data, error }
}

export const getContract = async (missionId) => {
  const { data, error } = await supabase.from('contracts').select('*').eq('mission_id', missionId).maybeSingle()
  return { data, error }
}

// Récupère les avis récents d'une entreprise (limit configurable).
// Fallback défensif : data toujours un tableau, jamais null.
export const getCompanyReviews = async (companyId, limit = 2) => {
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('id, score, comment, created_at, rater:rater_id(first_name, last_name)')
      .eq('rated_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data || [], error }
  } catch (e) {
    return { data: [], error: e }
  }
}

// Carte de visite publique — worker vu par une entreprise
// Retourne le worker + ses ratings récents + ses missions passées
// (completed) pour calculer les badges et le taux de retour.
// `viewerCompanyId` permet de déterminer le niveau de visibilité
// (preview si aucune candidature, contextual si ≥ 1 candidature).
export const getPublicWorkerProfile = async (workerId, viewerCompanyId = null) => {
  if (!workerId) return { data: null, error: new Error('workerId missing') }

  const safe = async (q, fallback) => {
    try { const r = await q; return r.error ? fallback : r.data } catch { return fallback }
  }

  // hasApplication : count des applications du worker sur les missions de la company
  let hasApplication = false
  if (viewerCompanyId) {
    try {
      const { data: myMissions } = await supabase.from('missions').select('id').eq('company_id', viewerCompanyId)
      const missionIds = (myMissions || []).map(m => m.id)
      if (missionIds.length > 0) {
        const { count } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', workerId)
          .in('mission_id', missionIds)
        hasApplication = (count || 0) > 0
      }
    } catch {
      hasApplication = false
    }
  }

  const [worker, profile, ratings, missions] = await Promise.all([
    safe(supabase.from('workers').select('*').eq('id', workerId).maybeSingle(), null),
    safe(supabase.from('profiles').select('email, created_at').eq('id', workerId).maybeSingle(), null),
    safe(
      supabase.from('ratings')
        .select('id, score, comment, created_at, rater:rater_id(first_name, last_name)')
        .eq('rated_id', workerId).order('created_at', { ascending: false }).limit(5),
      [],
    ),
    safe(
      supabase.from('missions')
        .select('id, status, sector, company_id, companies:company_id(name)')
        .eq('assigned_worker_id', workerId).order('created_at', { ascending: false }).limit(50),
      [],
    ),
  ])

  return {
    data: {
      worker: worker || null,
      profile: profile || null,
      ratings: ratings || [],
      missions: (missions || []).map(m => ({ missions: m })),
      hasApplication,
    },
    error: null,
  }
}

// Carte de visite publique — entreprise vue par un worker
// Défensif : chaque request est isolée, si une échoue (RLS, etc.)
// les autres continuent. La carte s'affiche avec empty states.
export const getPublicCompanyProfile = async (companyId) => {
  if (!companyId) return { data: null, error: new Error('companyId missing') }

  const safe = async (q, fallback) => {
    try { const r = await q; return r.error ? fallback : r.data } catch { return fallback }
  }

  const [company, profile, ratings, missions, invoices] = await Promise.all([
    safe(supabase.from('companies').select('*').eq('id', companyId).maybeSingle(), null),
    safe(supabase.from('profiles').select('email, created_at').eq('id', companyId).maybeSingle(), null),
    safe(
      supabase.from('ratings')
        .select('id, score, comment, created_at, rater:rater_id(first_name, last_name)')
        .eq('rated_id', companyId).order('created_at', { ascending: false }).limit(5),
      [],
    ),
    safe(
      supabase.from('missions')
        .select('id, title, status, sector, assigned_worker_id, created_at')
        .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      [],
    ),
    safe(
      supabase.from('invoices')
        .select('id, status, created_at, paid_at, amount_ttc')
        .eq('company_id', companyId).order('created_at', { ascending: false }).limit(50),
      [],
    ),
  ])

  // Calcul rebookings : workers ayant fait ≥ 2 missions completed
  const completed = (missions || []).filter(m => m.status === 'completed' && m.assigned_worker_id)
  const byWorker = {}
  completed.forEach(m => { byWorker[m.assigned_worker_id] = (byWorker[m.assigned_worker_id] || 0) + 1 })
  const loyalWorkers = Object.values(byWorker).filter(n => n >= 2).length

  return {
    data: {
      company: company || null,
      profile: profile || null,
      ratings: ratings || [],
      missions: missions || [],
      invoices: invoices || [],
      rebookingStats: { loyalWorkers, totalWorkers: Object.keys(byWorker).length },
    },
    error: null,
  }
}

// Récupère les candidatures d'une mission (avec nom worker) — pour
// afficher la count + initiales sur la fiche mission côté worker.
export const getMissionApplicationsCount = async (missionId, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('id, status, created_at, workers:worker_id(first_name, last_name)')
      .eq('mission_id', missionId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data: data || [], error }
  } catch (e) {
    return { data: [], error: e }
  }
}

export const getSignedContractsByWorker = async (workerId) => {
  const { data, error } = await supabase.from('contracts').select('mission_id').eq('worker_id', workerId).not('signed_worker_at', 'is', null)
  return { data: data?.map((c) => c.mission_id) || [], error }
}

export const getSignedContractsByCompany = async (companyId) => {
  const { data, error } = await supabase.from('contracts').select('mission_id').eq('company_id', companyId).not('signed_company_at', 'is', null)
  return { data: data?.map((c) => c.mission_id) || [], error }
}

// ── Helpers facturation ───────────────────────────────────────
// Note : `amountHt` explicite depuis v2026.04 (avant on re-déduisait
// de `amountTtc / 1.2`, ce qui corrompait le montant pour les factures
// B2B auto-liquidation TVA = 0). `contract_id` est NOT NULL (trigger DB).
export const createInvoice = async ({
  workerPayout, amountTtc, amountHt, workerId, companyId,
  contractId, missionId, totalHours,
}) => {
  const ht = amountHt != null
    ? Math.round(amountHt * 100) / 100
    : (amountTtc ? Math.round((amountTtc / 1.2) * 100) / 100 : 0)
  const commission = ht
    ? Math.round((ht - (workerPayout || 0)) * 100) / 100
    : 0
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      worker_id: workerId,
      company_id: companyId,
      contract_id: contractId, // NOT NULL — doit être fourni
      mission_id: missionId || null,
      worker_payout: workerPayout,
      amount_ht: ht,
      amount_ttc: amountTtc ?? ht,
      commission: commission,
      total_hours: totalHours || null,
      status: 'draft',
    })
    .select()
    .single()
  return { data, error }
}

export const updateInvoiceStatus = async (invoiceId, status) => {
  const update = { status }
  if (status === 'paid') update.paid_at = new Date().toISOString()
  const { data, error } = await supabase.from('invoices').update(update).eq('id', invoiceId).select().single()
  return { data, error }
}

// ── KYC Documents ────────────────────────────────────────────
/**
 * Upload un document KYC dans Supabase Storage.
 * Chemin : kyc-documents/{userId}/{docType}/{timestamp}_{filename}
 * Retourne l'URL publique signée valable 1h (pour affichage admin).
 */
export const uploadKycDocument = async (userId, docType, file) => {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${docType}/${Date.now()}.${ext}`
  const { error: upErr } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true })
  if (upErr) return { url: null, path: null, error: upErr }

  // Générer une URL signée longue durée (7 jours) pour le stockage en DB
  const { data: signed, error: signErr } = await supabase.storage.from('kyc-documents').createSignedUrl(path, 60 * 60 * 24 * 7)
  return { url: signed?.signedUrl || null, path, error: signErr }
}

/**
 * Générer une URL signée courte durée pour qu'un admin consulte un document.
 */
export const getKycSignedUrl = async (path, expiresIn = 3600) => {
  const { data, error } = await supabase.storage.from('kyc-documents').createSignedUrl(path, expiresIn)
  return { url: data?.signedUrl || null, error }
}

/**
 * Extraire le chemin de storage depuis une signed URL stockée en DB.
 * Les signed URLs Supabase contiennent le path après /object/sign/kyc-documents/
 */
export const extractKycStoragePath = (signedUrl) => {
  if (!signedUrl) return null
  try {
    const u = new URL(signedUrl)
    const match = u.pathname.match(/\/object\/sign\/kyc-documents\/(.+)/)
    return match ? match[1].split('?')[0] : null
  } catch {
    return null
  }
}

/**
 * Mettre à jour les URLs de documents KYC du travailleur + marquer la soumission.
 */
export const submitKycDocuments = async (userId, docs) => {
  // docs = { id_doc_url?, siret_doc_url?, rc_pro_url? }
  const hasAny = Object.values(docs).some(Boolean)
  const { data, error } = await supabase
    .from('workers')
    .update({
      ...docs,
      ...(hasAny ? { kyc_submitted_at: new Date().toISOString() } : {}),
      kyc_rejection_reason: null, // reset si re-soumission
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

/**
 * Approuver un champ KYC spécifique (admin seulement).
 * field : 'id_verified' | 'siret_verified' | 'rc_pro_verified'
 */
export const approveKycField = async (workerId, field, actorId) => {
  const update = { [field]: true, updated_at: new Date().toISOString() }

  // Si les 3 champs seront vérifiés après cette action, marquer kyc_completed_at
  const { data: w } = await supabase.from('workers').select('id_verified,siret_verified,rc_pro_verified').eq('id', workerId).single()
  const willComplete =
    (field === 'id_verified' || w?.id_verified) &&
    (field === 'siret_verified' || w?.siret_verified) &&
    (field === 'rc_pro_verified' || w?.rc_pro_verified)
  if (willComplete) update.kyc_completed_at = new Date().toISOString()

  const { data, error } = await supabase.from('workers').update(update).eq('id', workerId).select().single()

  if (!error) {
    await logAuditAction({
      actorId,
      action: `kyc_approve_${field}`,
      targetId: workerId,
      targetType: 'worker',
      payload: { field, kyc_completed: willComplete },
    })
    if (willComplete) {
      await supabase.rpc('notify_kyc_decision', { p_worker_id: workerId, p_approved: true })
    }
  }
  return { data, error }
}

/**
 * Rejeter le KYC d'un travailleur avec une raison (admin seulement).
 */
export const rejectKyc = async (workerId, reason, actorId) => {
  const { data, error } = await supabase
    .from('workers')
    .update({
      id_verified: false,
      siret_verified: false,
      rc_pro_verified: false,
      kyc_completed_at: null,
      kyc_rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workerId)
    .select()
    .single()

  if (!error) {
    await logAuditAction({
      actorId,
      action: 'kyc_reject',
      targetId: workerId,
      targetType: 'worker',
      payload: { reason },
    })
    await supabase.rpc('notify_kyc_decision', { p_worker_id: workerId, p_approved: false, p_reason: reason })
  }
  return { data, error }
}

// ── Journal d'audit ───────────────────────────────────────────
export const logAuditAction = async ({ actorId, action, targetId, targetType, payload = {} }) => {
  const { data, error } = await supabase
    .from('audit_log')
    .insert({ actor_id: actorId, action, target_id: targetId, target_type: targetType, payload })
    .select()
    .single()
  return { data, error }
}

// ═══════════════════════════════════════════════════════════════
// Time entries — saisie des heures réellement travaillées.
// Table mission_time_entries (migration 018). RLS : worker voit +
// modifie ses drafts, company voit celles de ses contrats, admin
// voit tout. Submit / validate / dispute passent par des RPCs.
// ═══════════════════════════════════════════════════════════════

export const getTimeEntries = async ({ contractId, workerId, companyId, statuses } = {}) => {
  let q = supabase
    .from('mission_time_entries')
    .select('*, contracts:contract_id(mission_id, missions:mission_id(title, city))')
    .order('work_date', { ascending: false })
    .order('started_at', { ascending: false })
  if (contractId) q = q.eq('contract_id', contractId)
  if (workerId) q = q.eq('worker_id', workerId)
  if (companyId) q = q.eq('company_id', companyId)
  if (statuses?.length) q = q.in('status', statuses)
  const { data, error } = await q
  return { data: data || [], error }
}

export const createTimeEntry = async ({
  contractId, workerId, companyId,
  workDate, startedAt, endedAt, breakMinutes = 0, note,
}) => {
  const { data, error } = await supabase
    .from('mission_time_entries')
    .insert({
      contract_id: contractId,
      worker_id: workerId,
      company_id: companyId,
      work_date: workDate,
      started_at: startedAt,
      ended_at: endedAt,
      break_minutes: breakMinutes,
      note: note || null,
      declared_by: 'worker',
      status: 'draft',
    })
    .select()
    .single()
  return { data, error }
}

export const updateTimeEntry = async (id, { startedAt, endedAt, breakMinutes, note, workDate }) => {
  const patch = { updated_at: new Date().toISOString() }
  if (startedAt !== undefined) patch.started_at = startedAt
  if (endedAt !== undefined) patch.ended_at = endedAt
  if (breakMinutes !== undefined) patch.break_minutes = breakMinutes
  if (note !== undefined) patch.note = note
  if (workDate !== undefined) patch.work_date = workDate
  const { data, error } = await supabase
    .from('mission_time_entries')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export const deleteTimeEntry = async (id) => {
  const { error } = await supabase.from('mission_time_entries').delete().eq('id', id)
  return { error }
}

// Bascule toutes les drafts du contrat → submitted + notif company (via RPC).
export const submitTimeEntries = async (contractId) => {
  const { data, error } = await supabase.rpc('submit_time_entries', { p_contract_id: contractId })
  return { data, error }
}

// Company valide explicitement toutes les entries submitted d'un contrat.
export const validateTimeEntries = async (contractId) => {
  const { data, error } = await supabase.rpc('validate_time_entries', { p_contract_id: contractId })
  return { data, error }
}

// Company conteste — note obligatoire.
export const disputeTimeEntries = async (contractId, note) => {
  const { data, error } = await supabase.rpc('dispute_time_entries', {
    p_contract_id: contractId,
    p_note: note,
  })
  return { data, error }
}
