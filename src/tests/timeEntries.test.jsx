// @vitest-environment jsdom
// Tests pour WorkerMissionHub + CompanyTimeValidation + ConfirmDialog.
// Couvre les 3 chemins critiques du flux heures (business-critical).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('lucide-react', async () => (await import('./mocks/lucide.jsx')).default)

const mockGetTimeEntries = vi.fn()
const mockCreateTimeEntry = vi.fn()
const mockUpdateTimeEntry = vi.fn()
const mockDeleteTimeEntry = vi.fn()
const mockSubmitTimeEntries = vi.fn()
const mockValidateTimeEntries = vi.fn()
const mockDisputeTimeEntries = vi.fn()
const mockGetContract = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {},
  getTimeEntries: (...args) => mockGetTimeEntries(...args),
  createTimeEntry: (...args) => mockCreateTimeEntry(...args),
  updateTimeEntry: (...args) => mockUpdateTimeEntry(...args),
  deleteTimeEntry: (...args) => mockDeleteTimeEntry(...args),
  submitTimeEntries: (...args) => mockSubmitTimeEntries(...args),
  validateTimeEntries: (...args) => mockValidateTimeEntries(...args),
  disputeTimeEntries: (...args) => mockDisputeTimeEntries(...args),
  getContract: (...args) => mockGetContract(...args),
}))
vi.mock('../lib/sentry', () => ({
  captureError: vi.fn(),
  logWarn: vi.fn(),
  trackScreen: vi.fn(),
}))
vi.mock('../contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'fr', switchLocale: vi.fn(), t: (k) => k }),
  I18nProvider: ({ children }) => children,
}))

import WorkerMissionHub from '../features/worker/WorkerMissionHub'
import CompanyTimeValidation from '../features/company/CompanyTimeValidation'
import ConfirmDialog from '../components/UI/ConfirmDialog'

// ── Fixtures ─────────────────────────────────────────────────────

const WORKER = { id: 'worker-1', first_name: 'Léa', last_name: 'Martin' }

const MISSION = {
  id: 'mission-1',
  title: 'Cariste CACES 3',
  company_id: 'company-1',
  companies: { id: 'company-1', name: 'LogisTec Express' },
  city: 'Meyzieu',
  address: '12 rue des Palettes',
  hourly_rate: 16,
  total_hours: 40,
  start_date: '2026-04-20',
}

const CONTRACT = {
  id: 'contract-1',
  mission_id: MISSION.id,
  worker_id: WORKER.id,
  company_id: MISSION.company_id,
  status: 'active',
}

const ENTRY_DRAFT = {
  id: 'entry-draft-1',
  contract_id: CONTRACT.id,
  worker_id: WORKER.id,
  company_id: MISSION.company_id,
  work_date: '2026-04-20',
  started_at: '2026-04-20T08:00:00.000Z',
  ended_at: '2026-04-20T16:00:00.000Z',
  break_minutes: 30,
  worked_minutes: 450,
  note: 'Shift normal',
  status: 'draft',
}

const ENTRY_SUBMITTED = {
  ...ENTRY_DRAFT,
  id: 'entry-submitted-1',
  status: 'submitted',
  submitted_at: '2026-04-20T17:00:00.000Z',
  contracts: {
    mission_id: MISSION.id,
    missions: { title: MISSION.title, city: MISSION.city },
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetContract.mockResolvedValue({ data: CONTRACT, error: null })
  mockGetTimeEntries.mockResolvedValue({ data: [], error: null })
})

// ─────────────────────────────────────────────────────────────────
// ConfirmDialog — composant primitif
// ─────────────────────────────────────────────────────────────────

describe('ConfirmDialog', () => {
  it('ne rend rien si open=false', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Test" onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('affiche titre et description quand open', () => {
    render(
      <ConfirmDialog open title="Supprimer cette saisie ?" description="Action définitive"
        onConfirm={vi.fn()} onCancel={vi.fn()} />
    )
    expect(screen.getByText('Supprimer cette saisie ?')).toBeTruthy()
    expect(screen.getByText('Action définitive')).toBeTruthy()
  })

  it('role="alertdialog" + aria-modal', () => {
    render(<ConfirmDialog open title="T" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('appelle onConfirm au clic sur le bouton confirm', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open title="T" confirmLabel="OK" onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('OK'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('appelle onCancel au clic sur Annuler', () => {
    const onCancel = vi.fn()
    render(<ConfirmDialog open title="T" onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('disabled pendant loading', () => {
    render(<ConfirmDialog open title="T" confirmLabel="OK" loading onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const btn = screen.getByText('Traitement…')
    expect(btn.disabled).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────
// WorkerMissionHub
// ─────────────────────────────────────────────────────────────────

describe('WorkerMissionHub', () => {
  it('fallback si mission null', () => {
    render(<WorkerMissionHub mission={null} worker={WORKER} />)
    expect(screen.getByText(/Aucune mission active sélectionnée/)).toBeTruthy()
  })

  it('charge le contrat depuis mission_id si non fourni', async () => {
    render(<WorkerMissionHub mission={MISSION} worker={WORKER} />)
    await waitFor(() => expect(mockGetContract).toHaveBeenCalledWith(MISSION.id))
  })

  it('affiche le titre de la mission et le nom de l\'entreprise', async () => {
    render(<WorkerMissionHub mission={MISSION} worker={WORKER} />)
    await waitFor(() => {
      expect(screen.getByText(MISSION.title)).toBeTruthy()
    })
    expect(screen.getAllByText(/LogisTec Express/).length).toBeGreaterThan(0)
  })

  it('affiche la saisie draft existante dans la liste', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [ENTRY_DRAFT], error: null })
    render(<WorkerMissionHub mission={MISSION} worker={WORKER} />)
    await waitFor(() => {
      // Vérifier qu'une saisie s'affiche avec son pill Brouillon
      expect(screen.getByText('Brouillon')).toBeTruthy()
    })
  })

  it('créer une saisie appelle createTimeEntry avec les bons champs', async () => {
    mockCreateTimeEntry.mockResolvedValue({ data: ENTRY_DRAFT, error: null })
    const showToast = vi.fn()
    render(<WorkerMissionHub mission={MISSION} worker={WORKER} showToast={showToast} />)

    await waitFor(() => expect(mockGetContract).toHaveBeenCalled())

    // Clic sur Enregistrer
    fireEvent.click(screen.getByText('Enregistrer'))
    await waitFor(() => {
      expect(mockCreateTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: CONTRACT.id,
          workerId: WORKER.id,
          companyId: MISSION.company_id,
          breakMinutes: 30,
        })
      )
    })
  })

  it('bouton "Soumettre N brouillons" affiché quand il y a des drafts', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [ENTRY_DRAFT], error: null })
    render(<WorkerMissionHub mission={MISSION} worker={WORKER} />)
    await waitFor(() => {
      expect(screen.getByText(/Soumettre 1 brouillon/i)).toBeTruthy()
    })
  })

  it('la suppression ouvre le ConfirmDialog et NE supprime PAS directement', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [ENTRY_DRAFT], error: null })
    render(<WorkerMissionHub mission={MISSION} worker={WORKER} />)
    await waitFor(() => expect(screen.getByText('Brouillon')).toBeTruthy())

    const deleteBtn = screen.getByLabelText('Supprimer')
    fireEvent.click(deleteBtn)

    // ConfirmDialog doit apparaître
    expect(screen.getByText('Supprimer cette saisie ?')).toBeTruthy()
    // Et deleteTimeEntry ne doit PAS avoir été appelé
    expect(mockDeleteTimeEntry).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────
// CompanyTimeValidation
// ─────────────────────────────────────────────────────────────────

describe('CompanyTimeValidation', () => {
  it('empty state quand aucune entry à valider', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [], error: null })
    render(<CompanyTimeValidation companyId="company-1" showToast={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/Tout est à jour/)).toBeTruthy()
    })
  })

  it('regroupe les entries par contrat', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [ENTRY_SUBMITTED], error: null })
    render(<CompanyTimeValidation companyId="company-1" showToast={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(MISSION.title)).toBeTruthy()
    })
    // Au moins un élément mentionne "1 saisie" (plusieurs possibles : summary + bouton)
    expect(screen.getAllByText(/1 saisie/i).length).toBeGreaterThan(0)
  })

  it('valider ouvre un ConfirmDialog (pas d\'appel direct)', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [ENTRY_SUBMITTED], error: null })
    render(<CompanyTimeValidation companyId="company-1" showToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText(MISSION.title)).toBeTruthy())

    fireEvent.click(screen.getByText(/Valider ces 1 saisie/i))

    // ConfirmDialog doit apparaître
    expect(screen.getByText('Valider ces heures ?')).toBeTruthy()
    expect(mockValidateTimeEntries).not.toHaveBeenCalled()
  })

  it('contester ouvre la modal avec note obligatoire', async () => {
    mockGetTimeEntries.mockResolvedValue({ data: [ENTRY_SUBMITTED], error: null })
    render(<CompanyTimeValidation companyId="company-1" showToast={vi.fn()} />)

    await waitFor(() => expect(screen.getByText(MISSION.title)).toBeTruthy())

    fireEvent.click(screen.getByText('Contester'))
    expect(screen.getByText('Contester les heures')).toBeTruthy()

    // Bouton disabled sans note
    const submitBtn = screen.getByText('Envoyer la contestation')
    expect(submitBtn.disabled).toBe(true)
  })
})
