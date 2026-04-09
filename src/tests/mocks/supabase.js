import { vi } from 'vitest'

// Chainable query builder mock
function createQueryBuilder(data = [], error = null) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    then: function(resolve) {
      return resolve({ data, error, count: data.length })
    },
  }
  // Make it thenable so await works
  builder[Symbol.for('vitest:thenable')] = true
  // Override Promise resolution
  const promise = Promise.resolve({ data, error, count: data.length })
  builder.then = promise.then.bind(promise)
  builder.catch = promise.catch.bind(promise)
  return builder
}

// Realtime channel mock
function createChannelMock() {
  return {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }
}

// Storage mock
function createStorageMock() {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/file.pdf' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test/file.pdf' } }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.supabase.co/signed/test' }, error: null }),
    }),
  }
}

// Auth mock
function createAuthMock(user = null) {
  const mockUser = user || { id: 'test-user-id', email: 'test@example.com' }
  return {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test-token', user: mockUser } }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: mockUser, session: { access_token: 'test-token' } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: mockUser, session: { access_token: 'test-token' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  }
}

// RPC mock
function createRpcMock() {
  return vi.fn().mockResolvedValue({ data: null, error: null })
}

// Main supabase client mock
export function createSupabaseMock(options = {}) {
  const { data = [], error = null, user = null } = options

  const mock = {
    from: vi.fn().mockReturnValue(createQueryBuilder(data, error)),
    auth: createAuthMock(user),
    storage: createStorageMock(),
    rpc: createRpcMock(),
    channel: vi.fn().mockReturnValue(createChannelMock()),
    removeChannel: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }

  return mock
}

// Helper to mock specific table responses
export function mockTableResponse(supabaseMock, table, data, error = null) {
  const builder = createQueryBuilder(Array.isArray(data) ? data : [data], error)
  supabaseMock.from.mockImplementation((t) => {
    if (t === table) return builder
    return createQueryBuilder()
  })
  return builder
}

// Helper to set up the global vi.mock for supabase
export function setupSupabaseMock(options = {}) {
  const mock = createSupabaseMock(options)

  vi.mock('../../lib/supabase', () => ({
    supabase: mock,
    getMissions: vi.fn().mockResolvedValue({ data: [], error: null }),
    getWorkerApplications: vi.fn().mockResolvedValue({ data: [], error: null }),
    getWorkerInvoices: vi.fn().mockResolvedValue({ data: [], error: null }),
    getNotifications: vi.fn().mockResolvedValue({ data: [], error: null }),
    getWorkerMissions: vi.fn().mockResolvedValue({ data: [], error: null }),
    getSignedContractsByWorker: vi.fn().mockResolvedValue({ data: [], error: null }),
    getCompanyMissions: vi.fn().mockResolvedValue({ data: [], error: null }),
    getCompanyInvoices: vi.fn().mockResolvedValue({ data: [], error: null }),
    applyToMission: vi.fn().mockResolvedValue({ data: { id: 'app-1' }, error: null }),
    withdrawApplication: vi.fn().mockResolvedValue({ error: null }),
    saveContract: vi.fn().mockResolvedValue({ error: null }),
    createRating: vi.fn().mockResolvedValue({ error: null }),
    createMission: vi.fn().mockResolvedValue({ data: { id: 'mission-1' }, error: null }),
    updateApplicationStatus: vi.fn().mockResolvedValue({ error: null }),
    assignWorkerToMission: vi.fn().mockResolvedValue({ error: null }),
    completeMission: vi.fn().mockResolvedValue({ error: null }),
    cancelMission: vi.fn().mockResolvedValue({ error: null }),
    createInvoice: vi.fn().mockResolvedValue({ data: { id: 'inv-1' }, error: null }),
    getMissionApplications: vi.fn().mockResolvedValue({ data: [], error: null }),
    getMessages: vi.fn().mockResolvedValue({ data: [], error: null }),
    sendMessage: vi.fn().mockResolvedValue({ data: { id: 'msg-1', content: 'test' }, error: null }),
    markNotifsRead: vi.fn().mockResolvedValue({ error: null }),
    setWorkerAvailability: vi.fn().mockResolvedValue({ error: null }),
    subscribeToMissions: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    subscribeToNotifications: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    subscribeToMessages: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    uploadKycDocument: vi.fn().mockResolvedValue({ url: 'https://test.supabase.co/kyc/doc.pdf', error: null }),
    submitKycDocuments: vi.fn().mockResolvedValue({ error: null }),
    getConversations: vi.fn().mockResolvedValue({ data: [], error: null }),
    logAuditAction: vi.fn().mockResolvedValue({ error: null }),
    approveKycField: vi.fn().mockResolvedValue({ error: null }),
    rejectKyc: vi.fn().mockResolvedValue({ error: null }),
  }))

  return mock
}

export { createQueryBuilder, createChannelMock, createStorageMock, createAuthMock }
