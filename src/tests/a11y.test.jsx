// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'vitest-axe'
import React from 'react'

// Helper — évite le expect.extend() qui n'est pas supporté en top-level
async function expectNoA11yViolations(container) {
  const result = await axe(container)
  const violations = result.violations || []
  if (violations.length > 0) {
    const summary = violations.map(v => `${v.id}: ${v.help} (${v.nodes.length} noeuds)`).join('\n')
    throw new Error(`${violations.length} violation(s) a11y :\n${summary}`)
  }
  expect(violations).toHaveLength(0)
}

// Mock lucide pour que les tests se concentrent sur les vrais composants
vi.mock('lucide-react', async () => (await import('./mocks/lucide.jsx')).default)

// Mock supabase / hooks pour isoler
vi.mock('../lib/supabase', () => ({
  supabase: {},
  getPublicWorkerProfile: vi.fn().mockResolvedValue({ data: null }),
  getPublicCompanyProfile: vi.fn().mockResolvedValue({ data: null }),
  getMissionById: vi.fn().mockResolvedValue({ data: null, error: null }),
  markNotifsRead: vi.fn().mockResolvedValue({ error: null }),
}))
vi.mock('../lib/sentry', () => ({
  captureError: vi.fn(), logWarn: vi.fn(), trackScreen: vi.fn(),
}))
vi.mock('../hooks/shared/useChat', () => ({
  useChat: () => ({ messages: [], loading: false, input: '', setInput: vi.fn(), sending: false, error: null, send: vi.fn(), partnerTyping: false }),
}))
vi.mock('../contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'fr', switchLocale: vi.fn(), t: (k) => k }),
  I18nProvider: ({ children }) => children,
}))

// ── Composants à tester ─────────────────────────────────────────

import MissionCard from '../features/shared/MissionCard'
import LoadingState from '../components/UI/LoadingState'
import { Pill, Eyebrow, Avatar, KpiCard, HeadlineA } from '../design/primitives'
import EmptyState from '../components/UI/EmptyState'
import Button from '../components/UI/Button'

const baseMission = {
  id: 'm1',
  title: 'Cariste H/F',
  city: 'Lyon',
  hourly_rate: 14,
  total_hours: 40,
  start_date: '2026-06-01',
  companies: { name: 'LogisTec', id: 'c1' },
  required_skills: ['CACES 3', 'Manutention'],
  urgency: 'normal',
}

// ────────────────────────────────────────────────────────────────
// Tests axe-core sur les primitives et composants UI
// ────────────────────────────────────────────────────────────────

describe('A11y · Design primitives', () => {
  it('Pill — brand variant', async () => {
    const { container } = render(<Pill variant="brand">TEMPO Vérifié</Pill>)
    await expectNoA11yViolations(container)
  })

  it('Eyebrow', async () => {
    const { container } = render(<Eyebrow>Mission en cours</Eyebrow>)
    await expectNoA11yViolations(container)
  })

  it('Avatar avec name', async () => {
    const { container } = render(<Avatar name="Léa Martin" />)
    await expectNoA11yViolations(container)
  })

  it('KpiCard avec sub', async () => {
    const { container } = render(<KpiCard label="MISSIONS" value="2" sub="+1 cette semaine" />)
    await expectNoA11yViolations(container)
  })

  it('HeadlineA avec <em>', async () => {
    const { container } = render(
      <HeadlineA size="md" color="#000">
        Bonjour Léa, <em>2 missions</em> vous attendent.
      </HeadlineA>
    )
    await expectNoA11yViolations(container)
  })
})

describe('A11y · UI components', () => {
  it('LoadingState default', async () => {
    const { container } = render(<LoadingState label="Chargement du profil" />)
    await expectNoA11yViolations(container)
  })

  it('LoadingState inline', async () => {
    const { container } = render(<LoadingState inline />)
    await expectNoA11yViolations(container)
  })

  it('EmptyState avec CTA', async () => {
    const { container } = render(
      <EmptyState title="Aucune mission disponible" description="Revenez plus tard." />
    )
    await expectNoA11yViolations(container)
  })

  it('Button primary', async () => {
    const { container } = render(<Button>Postuler</Button>)
    await expectNoA11yViolations(container)
  })

  it('Button disabled', async () => {
    const { container } = render(<Button disabled>Envoi…</Button>)
    await expectNoA11yViolations(container)
  })
})

describe('A11y · MissionCard (feed worker)', () => {
  it('rendu standard', async () => {
    const { container } = render(
      <MissionCard mission={baseMission} onSelect={vi.fn()} onApply={vi.fn()} onToggleSave={vi.fn()} />
    )
    await expectNoA11yViolations(container)
  })

  it('état appliqué', async () => {
    const { container } = render(
      <MissionCard mission={baseMission} onApply={vi.fn()} applied applying={false} />
    )
    await expectNoA11yViolations(container)
  })

  it('état en cours d\'envoi', async () => {
    const { container } = render(
      <MissionCard mission={baseMission} onApply={vi.fn()} applied={false} applying />
    )
    await expectNoA11yViolations(container)
  })

  it('mission urgente', async () => {
    const { container } = render(
      <MissionCard mission={{ ...baseMission, urgency: 'urgent' }} onSelect={vi.fn()} />
    )
    await expectNoA11yViolations(container)
  })
})
