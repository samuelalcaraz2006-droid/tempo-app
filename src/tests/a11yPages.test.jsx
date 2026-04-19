// @vitest-environment jsdom
// Suite axe-core pour les pages publiques (Legal + Auth + Landing).
// Complète src/tests/a11y.test.jsx qui couvre primitives + composants.

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import React from 'react'

// Helper (identique à a11y.test.jsx — pas moyen de le partager sans setup)
async function expectNoA11yViolations(container) {
  const result = await axe(container)
  const violations = result.violations || []
  if (violations.length > 0) {
    const summary = violations.map(v => `${v.id}: ${v.help} (${v.nodes.length} noeuds)`).join('\n')
    throw new Error(`${violations.length} violation(s) a11y :\n${summary}`)
  }
  expect(violations).toHaveLength(0)
}

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('lucide-react', async () => (await import('./mocks/lucide.jsx')).default)

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
  signUp: vi.fn(),
}))
vi.mock('../lib/sentry', () => ({
  captureError: vi.fn(), logWarn: vi.fn(), trackScreen: vi.fn(),
  initSentry: vi.fn(), setUser: vi.fn(), addBreadcrumb: vi.fn(),
}))
vi.mock('../lib/legal', () => ({
  validateSiret: vi.fn().mockResolvedValue({ valid: true, denomination: 'ACME' }),
  signAttestation: vi.fn(),
}))
vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ user: null, profile: null, loading: false, logout: vi.fn() }),
}))
vi.mock('../contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'fr', switchLocale: vi.fn(), t: (k) => k }),
  I18nProvider: ({ children }) => children,
}))

// Mock framer-motion pour éviter les animations complexes dans jsdom
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_t, tag) => {
      const Comp = ({ children, ...props }) => React.createElement(tag, props, children)
      Comp.displayName = `motion.${String(tag)}`
      return Comp
    },
  }),
  AnimatePresence: ({ children }) => children,
}))

// ── Imports après mocks ─────────────────────────────────────────

import Legal from '../pages/Legal'
import Auth from '../pages/Auth'

// ────────────────────────────────────────────────────────────────

describe('A11y · Pages publiques', () => {
  it('Legal page — par défaut CGU', async () => {
    const { container } = render(<Legal onBack={vi.fn()} />)
    await expectNoA11yViolations(container)
  })

  it('Auth — connexion (mode par défaut)', async () => {
    const { container } = render(<Auth onNavigate={vi.fn()} />)
    await expectNoA11yViolations(container)
  })
})
