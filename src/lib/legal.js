import { supabase } from './supabase'

// Call the validate-siret Edge Function
export async function validateSiret(siret) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-siret`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ siret }),
    }
  )

  return res.json()
}

// Sign attestation sur l'honneur
export async function signAttestation(userId) {
  const { error } = await supabase
    .from('workers')
    .update({ attestation_honneur_signed_at: new Date().toISOString() })
    .eq('id', userId)
  return { error }
}

// Request personal data export (RGPD art. 15)
export async function requestDataExport(userId) {
  const { data, error } = await supabase
    .from('data_export_requests')
    .insert({ user_id: userId })
    .select()
    .single()
  return { data, error }
}

// Request account deletion (RGPD art. 17)
export async function requestAccountDeletion(userId, reason) {
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .insert({ user_id: userId, reason })
    .select()
    .single()
  return { data, error }
}

// Save cookie consent
export async function saveCookieConsent(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({
      cookie_consent_at: new Date().toISOString(),
      cookie_consent_version: '1.0',
    })
    .eq('id', userId)
  return { error }
}
