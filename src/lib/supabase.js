import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// ── Helpers auth ──────────────────────────────
export const signUp = async ({ email, password, role, firstName, lastName, companyName }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, first_name: firstName, last_name: lastName, company_name: companyName }
    }
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
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Helpers workers ───────────────────────────
export const getWorkerProfile = async (userId) => {
  const { data, error } = await supabase
    .from('workers')
    .select('*, profiles(*)')
    .eq('id', userId)
    .single()
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
  const { data, error } = await supabase
    .from('workers')
    .update({ is_available: isAvailable })
    .eq('id', userId)
  return { data, error }
}

// ── Helpers companies ─────────────────────────
export const getCompanyProfile = async (userId) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*, profiles(*)')
    .eq('id', userId)
    .single()
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
  const { data, error } = await supabase
    .from('missions')
    .select('*, companies(name, city, rating_avg, rating_count, lat, lng)')
    .eq('id', id)
    .single()
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
  const { data, error } = await supabase
    .from('missions')
    .select('*, workers(first_name, last_name, rating_avg)')
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
  const { data, error } = await supabase
    .from('applications')
    .select('*, workers(first_name, last_name, rating_avg, rating_count, skills, certifications, city), matching_scores(total_score, breakdown)')
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
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  return { data, error }
}

export const markNotifsRead = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  return { error }
}

export const createNotification = async ({ userId, type, title, body, payload = {} }) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: userId, type, title, body, payload })
    .select()
    .single()
  return { data, error }
}

// ── Helpers matching scores ───────────────────
export const saveMatchingScores = async (scores) => {
  const { data, error } = await supabase
    .from('matching_scores')
    .upsert(scores, { onConflict: 'mission_id,worker_id' })
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
    console.error('[subscribeToNotifications] userId invalide:', userId)
    return null
  }
  return supabase
    .channel(`notifs_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
    .subscribe()
}

// ── Helpers candidatures — actions ────────────────────────────
export const updateApplicationStatus = async (applicationId, status) => {
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select()
    .single()
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
export const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, mission_id, content, created_at, read_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(200)
  if (!data) return { data: [], error }
  // Group by conversation partner — keep only the latest message per conversation
  const convMap = {}
  data.forEach(m => {
    const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id
    const key = [m.mission_id, partnerId].join('_')
    if (!convMap[key]) convMap[key] = { partnerId, missionId: m.mission_id, lastMessage: m }
  })
  return { data: Object.values(convMap), error }
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

export const subscribeToMessages = (userId, callback) => {
  return supabase
    .channel(`messages_${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` }, callback)
    .subscribe()
}

// ── Helpers cancellation / disputes ──────────
export const cancelMission = async (missionId, reason) => {
  const updates = { status: 'cancelled' }
  if (reason) updates.description = `[ANNULÉE] ${reason}`
  const { data, error } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', missionId)
    .select()
    .single()
  return { data, error }
}

export const withdrawApplication = async (applicationId) => {
  const { data, error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId)
    .select()
    .single()
  return { data, error }
}

export const getWorkerMissions = async (workerId) => {
  const { data, error } = await supabase
    .from('applications')
    .select('id, status, applied_at, match_score, missions(id, title, hourly_rate, total_hours, start_date, end_date, city, status, sector, companies(name))')
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
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('mission_id', missionId)
    .maybeSingle()
  return { data, error }
}

export const getSignedContractsByWorker = async (workerId) => {
  const { data, error } = await supabase
    .from('contracts')
    .select('mission_id')
    .eq('worker_id', workerId)
    .not('worker_signed_at', 'is', null)
  return { data: data?.map(c => c.mission_id) || [], error }
}

export const getSignedContractsByCompany = async (companyId) => {
  const { data, error } = await supabase
    .from('contracts')
    .select('mission_id')
    .eq('company_id', companyId)
    .not('company_signed_at', 'is', null)
  return { data: data?.map(c => c.mission_id) || [], error }
}

// ── Helpers facturation ───────────────────────────────────────
export const createInvoice = async ({ workerPayout, amountTtc, workerId, companyId, contractId, missionId }) => {
  const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      worker_id: workerId,
      company_id: companyId,
      contract_id: contractId || null,
      mission_id: missionId || null,
      worker_payout: workerPayout,
      amount_ttc: amountTtc,
      status: 'draft',
    })
    .select()
    .single()
  return { data, error }
}

export const updateInvoiceStatus = async (invoiceId, status) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .select()
    .single()
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
  const { error: upErr } = await supabase.storage
    .from('kyc-documents')
    .upload(path, file, { upsert: true })
  if (upErr) return { url: null, path: null, error: upErr }

  // Générer une URL signée longue durée (7 jours) pour le stockage en DB
  const { data: signed, error: signErr } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(path, 60 * 60 * 24 * 7)
  return { url: signed?.signedUrl || null, path, error: signErr }
}

/**
 * Générer une URL signée courte durée pour qu'un admin consulte un document.
 */
export const getKycSignedUrl = async (path, expiresIn = 3600) => {
  const { data, error } = await supabase.storage
    .from('kyc-documents')
    .createSignedUrl(path, expiresIn)
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
