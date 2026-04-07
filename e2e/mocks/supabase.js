/**
 * Helpers pour intercepter les appels Supabase dans les tests Playwright.
 * Utilise page.route() pour stub les endpoints REST, Auth et Storage.
 */

const SUPABASE_URL = 'https://ibievmxehhvdplhinher.supabase.co'

// ── Données de test ────────────────────────────────────────────────────────

export const WORKER_USER = {
  id: 'auth-worker-uuid-001',
  email: 'jean.dupont@test.com',
  role: 'authenticated',
}

export const ADMIN_USER = {
  id: 'auth-admin-uuid-099',
  email: 'admin@tempo.com',
  role: 'authenticated',
}

export const WORKER_PROFILE = {
  id: WORKER_USER.id,
  email: WORKER_USER.email,
  role: 'travailleur',
  first_name: 'Jean',
  last_name: 'Dupont',
  status: 'pending',
  created_at: '2026-01-01T00:00:00.000Z',
}

export const ADMIN_PROFILE = {
  id: ADMIN_USER.id,
  email: ADMIN_USER.email,
  role: 'admin',
  first_name: 'Admin',
  last_name: 'Tempo',
  status: 'verified',
}

export const WORKER_NO_KYC = {
  id: WORKER_USER.id,
  user_id: WORKER_USER.id,
  first_name: 'Jean',
  last_name: 'Dupont',
  id_doc_url: null,
  siret_doc_url: null,
  rc_pro_url: null,
  id_verified: false,
  siret_verified: false,
  rc_pro_verified: false,
  kyc_submitted_at: null,
  kyc_rejection_reason: null,
  kyc_completed_at: null,
  kyc_status: 'none',
}

export const WORKER_KYC_SUBMITTED = {
  ...WORKER_NO_KYC,
  id_doc_url: `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/worker-db-uuid-001/id/id.jpg?token=signed`,
  siret_doc_url: `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/worker-db-uuid-001/siret/siret.pdf?token=signed`,
  rc_pro_url: `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/worker-db-uuid-001/rcpro/rcpro.pdf?token=signed`,
  kyc_submitted_at: '2026-04-07T10:00:00.000Z',
  kyc_status: 'submitted',
}

export const WORKER_KYC_REJECTED = {
  ...WORKER_KYC_SUBMITTED,
  kyc_rejection_reason: 'Document identité illisible. Veuillez renvoyer une photo plus nette.',
  id_verified: false,
  siret_verified: false,
  rc_pro_verified: false,
  kyc_status: 'rejected',
}

export const SESSION_RESPONSE = (user) => ({
  access_token: `fake-jwt-token-${user.id}`,
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: `fake-refresh-${user.id}`,
  user: {
    id: user.id,
    email: user.email,
    role: user.role,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
  },
})

// ── Helpers d'interception ─────────────────────────────────────────────────

/**
 * Intercepte POST /auth/v1/token?grant_type=password
 * Simule un login réussi pour l'utilisateur donné.
 */
export async function mockAuthLogin(page, user) {
  await page.route(`${SUPABASE_URL}/auth/v1/token*`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SESSION_RESPONSE(user)),
    })
  })
}

/**
 * Intercepte GET /auth/v1/user (session existante)
 */
export async function mockAuthSession(page, user) {
  await page.route(`${SUPABASE_URL}/auth/v1/user`, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SESSION_RESPONSE(user).user),
    })
  })
}

/**
 * Intercepte GET /rest/v1/profiles?id=eq.{userId}
 */
export async function mockProfileFetch(page, profile) {
  await page.route(
    `${SUPABASE_URL}/rest/v1/profiles*`,
    (route) => {
      const url = route.request().url()
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([profile]),
        })
      } else {
        route.continue()
      }
    }
  )
}

/**
 * Intercepte GET /rest/v1/workers?user_id=eq.{userId}
 */
export async function mockWorkerFetch(page, worker) {
  await page.route(
    `${SUPABASE_URL}/rest/v1/workers*`,
    (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([worker]),
        })
      } else {
        // PATCH/POST → success
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ ...worker, kyc_submitted_at: new Date().toISOString() }]),
        })
      }
    }
  )
}

/**
 * Intercepte les uploads Storage (POST /storage/v1/object/kyc-documents/*)
 */
export async function mockStorageUpload(page) {
  await page.route(
    `${SUPABASE_URL}/storage/v1/object/kyc-documents*`,
    (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ Key: 'kyc-documents/worker-db-uuid-001/id/1712480000000.jpg' }),
        })
      } else {
        route.continue()
      }
    }
  )
}

/**
 * Intercepte la génération de signed URLs (POST /storage/v1/object/sign/*)
 */
export async function mockStorageSign(page) {
  await page.route(
    `${SUPABASE_URL}/storage/v1/object/sign*`,
    (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          signedURL: `${SUPABASE_URL}/storage/v1/object/sign/kyc-documents/doc.jpg?token=fake`,
        }),
      })
    }
  )
}

/**
 * Intercepte les inserts dans audit_log
 */
export async function mockAuditLog(page) {
  await page.route(
    `${SUPABASE_URL}/rest/v1/audit_log*`,
    (route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'audit-uuid-001' }]),
      })
    }
  )
}

/**
 * Intercepte les inserts dans notifications
 */
export async function mockNotifications(page) {
  await page.route(
    `${SUPABASE_URL}/rest/v1/notifications*`,
    (route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'notif-uuid-001' }]),
      })
    }
  )
}

/**
 * Setup complet pour un travailleur connecté sans KYC
 */
export async function setupWorkerSession(page, workerData = WORKER_NO_KYC) {
  await mockAuthLogin(page, WORKER_USER)
  await mockAuthSession(page, WORKER_USER)
  await mockProfileFetch(page, WORKER_PROFILE)
  await mockWorkerFetch(page, workerData)
  await mockStorageUpload(page)
  await mockStorageSign(page)
  await mockAuditLog(page)
  await mockNotifications(page)
}

/**
 * Setup complet pour un admin connecté
 */
export async function setupAdminSession(page, workers = [WORKER_KYC_SUBMITTED]) {
  await mockAuthLogin(page, ADMIN_USER)
  await mockAuthSession(page, ADMIN_USER)

  // Smart profiles mock: admin profile for auth check, worker profiles for admin panel
  await page.route(
    `${SUPABASE_URL}/rest/v1/profiles*`,
    (route) => {
      if (route.request().method() !== 'GET') { route.continue(); return }
      const url = route.request().url()
      if (url.includes(`id=eq.${ADMIN_USER.id}`)) {
        // AuthContext fetching admin's own profile
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([ADMIN_PROFILE]),
        })
      } else {
        // AdminApp fetching all profiles — return worker profiles
        const workerProfiles = workers.map(w => ({
          id: w.id,
          email: `${(w.first_name || 'worker').toLowerCase()}.${(w.last_name || 'test').toLowerCase()}@test.com`,
          role: 'travailleur',
          first_name: w.first_name,
          last_name: w.last_name,
          status: 'pending',
          created_at: '2026-01-01T00:00:00.000Z',
        }))
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(workerProfiles),
        })
      }
    }
  )

  // Workers mock — return the provided workers list
  await page.route(
    `${SUPABASE_URL}/rest/v1/workers*`,
    (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(workers),
        })
      } else {
        // PATCH → approve/reject
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: workers[0]?.id }]),
        })
      }
    }
  )

  // Companies mock (empty — no companies in test data)
  await page.route(
    `${SUPABASE_URL}/rest/v1/companies*`,
    (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      } else {
        route.continue()
      }
    }
  )

  // Missions mock (empty)
  await page.route(
    `${SUPABASE_URL}/rest/v1/missions*`,
    (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
      } else {
        route.continue()
      }
    }
  )

  await mockAuditLog(page)
  await mockNotifications(page)
}
