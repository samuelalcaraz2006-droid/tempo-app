import * as Sentry from '@sentry/browser'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!SENTRY_DSN) return

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `tempo@${import.meta.env.VITE_APP_VERSION || '2.1.0'}`,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],

    // Performance: sample 20% of transactions in prod
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

    // Session Replay: 10% normal, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Don't send PII
    sendDefaultPii: false,

    // Filter out noisy errors
    beforeSend(event) {
      // Ignore ResizeObserver loop errors (browser noise)
      if (event.exception?.values?.[0]?.value?.includes('ResizeObserver loop')) return null
      // Ignore network errors from extensions
      if (event.exception?.values?.[0]?.value?.includes('chrome-extension://')) return null
      return event
    },
  })
}

export function setUser(user) {
  if (!SENTRY_DSN) return
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email })
  } else {
    Sentry.setUser(null)
  }
}

export function captureError(error, context = {}) {
  if (!SENTRY_DSN) {
    console.error('[Sentry disabled]', error, context)
    return
  }
  Sentry.captureException(error, { extra: context })
}

export function addBreadcrumb(message, category = 'app', level = 'info') {
  if (!SENTRY_DSN) return
  Sentry.addBreadcrumb({ message, category, level })
}

export { Sentry }
