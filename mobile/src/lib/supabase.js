import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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
        first_name: firstName || '',
        last_name: lastName || '',
        company_name: companyName || '',
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

// ── Helpers workers ───────────────────────────
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

// ── Helpers missions ──────────────────────────
export const getMissions = async ({ status = 'open', sector, urgency, limit = 30, offset = 0 } = {}) => {
  let query = supabase
    .from('missions')
    .select('*, companies(name, city, rating_avg, rating_count)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (sector) query = query.eq('sector', sector)
  if (urgency && urgency !== 'tous') query = query.eq('urgency', urgency)

  const { data, error } = await query
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

export const completeMission = async (missionId) => {
  const { data, error } = await supabase
    .from('missions')
    .update({ status: 'completed', end_date: new Date().toISOString() })
    .eq('id', missionId)
    .select()
    .single()
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
    .select('*, missions(id, title, hourly_rate, start_date, end_date, city, status, companies(id, name))')
    .eq('worker_id', workerId)
    .order('applied_at', { ascending: false })
  return { data, error }
}

export const getMissionApplications = async (missionId) => {
  const { data, error } = await supabase
    .from('applications')
    .select('*, workers(first_name, last_name, rating_avg, rating_count, skills, certifications, city)')
    .eq('mission_id', missionId)
    .order('applied_at', { ascending: false })
  return { data, error }
}

export const updateApplicationStatus = async (applicationId, status) => {
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
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

// ── Helpers messages ──────────────────────────
export const getConversations = async (userId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, mission_id, content, created_at, read_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(200)
  if (!data) return { data: [], error }
  const convMap = {}
  data.forEach((m) => {
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
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${userId}` },
      callback
    )
    .subscribe()
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

// ── KYC ───────────────────────────────────────
export const submitKycDocuments = async (userId, docs) => {
  const hasAny = Object.values(docs).some(Boolean)
  const { data, error } = await supabase
    .from('workers')
    .update({
      ...docs,
      ...(hasAny ? { kyc_submitted_at: new Date().toISOString() } : {}),
      kyc_rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

// ── Ratings ───────────────────────────────────
export const createRating = async ({ missionId, raterId, ratedId, raterRole, score, comment }) => {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ mission_id: missionId, rater_id: raterId, rated_id: ratedId, rater_role: raterRole, score, comment })
    .select()
    .single()
  return { data, error }
}

// ── Contrats ──────────────────────────────────
export const getSignedContractsByWorker = async (workerId) => {
  const { data, error } = await supabase
    .from('contracts')
    .select('mission_id')
    .eq('worker_id', workerId)
    .not('signed_worker_at', 'is', null)
  return { data: data?.map((c) => c.mission_id) || [], error }
}
