// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

// ── Hoisted mock refs ─────────────────────────────────────────
const { mockFrom, mockRequestDataExport, mockRequestAccountDeletion } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRequestDataExport: vi.fn().mockResolvedValue({ data: {}, error: null }),
  mockRequestAccountDeletion: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))

// ── Mock supabase ─────────────────────────────────────────────
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}))

// ── Mock legal lib (for RgpdPanel tests) ─────────────────────
vi.mock('../lib/legal', () => ({
  requestDataExport: (...args) => mockRequestDataExport(...args),
  requestAccountDeletion: (...args) => mockRequestAccountDeletion(...args),
  validateSiret: vi.fn(),
  signAttestation: vi.fn(),
  saveCookieConsent: vi.fn(),
}))

import Legal from '../pages/Legal'
import DisputeModal from '../features/shared/DisputeModal'
import RgpdPanel from '../features/shared/RgpdPanel'

// ────────────────────────────────────────────────────────────────
// Legal page tests
// ────────────────────────────────────────────────────────────────

describe('Legal page', () => {
  it('renders all 6 tabs', () => {
    render(<Legal />)
    expect(screen.getByText('CGU')).toBeTruthy()
    expect(screen.getByText('CGV')).toBeTruthy()
    expect(screen.getByText('Mentions legales')).toBeTruthy()
    expect(screen.getByText('Politique RGPD')).toBeTruthy()
    expect(screen.getByText('Cookies')).toBeTruthy()
    expect(screen.getByText('Charte travailleur')).toBeTruthy()
  })

  it('shows CGU content by default', () => {
    render(<Legal />)
    expect(screen.getByText("Conditions Generales d'Utilisation")).toBeTruthy()
  })

  it('switches to CGV tab on click', () => {
    render(<Legal />)
    fireEvent.click(screen.getByText('CGV'))
    expect(screen.getByText('Conditions Generales de Vente')).toBeTruthy()
  })

  it('switches to Mentions legales tab on click', () => {
    render(<Legal />)
    fireEvent.click(screen.getByText('Mentions legales'))
    expect(screen.getByText('Mentions legales', { selector: 'h2' })).toBeTruthy()
  })

  it('switches to Politique RGPD tab on click', () => {
    render(<Legal />)
    fireEvent.click(screen.getByText('Politique RGPD'))
    expect(screen.getByText(/Politique de confidentialite/i)).toBeTruthy()
  })

  it('switches to Cookies tab on click', () => {
    render(<Legal />)
    fireEvent.click(screen.getByText('Cookies'))
    expect(screen.getByText('Politique cookies')).toBeTruthy()
  })

  it('switches to Charte travailleur tab on click', () => {
    render(<Legal />)
    fireEvent.click(screen.getByText('Charte travailleur'))
    expect(screen.getByText('Charte du travailleur independant')).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<Legal onBack={onBack} />)
    fireEvent.click(screen.getByText('← Retour'))
    expect(onBack).toHaveBeenCalled()
  })

  it('does not render back button when onBack is not provided', () => {
    render(<Legal />)
    expect(screen.queryByText('← Retour')).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────
// DisputeModal tests
// ────────────────────────────────────────────────────────────────

describe('DisputeModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })
  })

  const defaultProps = {
    contractId: 'contract-1',
    missionId: 'mission-1',
    userId: 'user-1',
    onClose: vi.fn(),
    showToast: vi.fn(),
  }

  it('renders the modal with textarea and buttons', () => {
    render(<DisputeModal {...defaultProps} />)
    expect(screen.getByText('Ouvrir un litige')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Ex : travail non conforme/i)).toBeTruthy()
    expect(screen.getByText('Confirmer le litige')).toBeTruthy()
    expect(screen.getByText('Annuler')).toBeTruthy()
  })

  it('submit button is disabled when reason is empty', () => {
    render(<DisputeModal {...defaultProps} />)
    const submitBtn = screen.getByText('Confirmer le litige')
    expect(submitBtn.disabled).toBe(true)
  })

  it('submit button is enabled when reason has content', () => {
    render(<DisputeModal {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/Ex : travail non conforme/i)
    fireEvent.change(textarea, { target: { value: 'Problème qualité' } })
    const submitBtn = screen.getByText('Confirmer le litige')
    expect(submitBtn.disabled).toBe(false)
  })

  it('calls onClose when Annuler is clicked', () => {
    const onClose = vi.fn()
    render(<DisputeModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Annuler'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls supabase.from on submit with reason filled', async () => {
    const showToast = vi.fn()
    const onClose = vi.fn()

    render(<DisputeModal {...defaultProps} showToast={showToast} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/Ex : travail non conforme/i), { target: { value: 'Problème qualité' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer le litige'))
    })

    expect(mockFrom).toHaveBeenCalledWith('disputes')
  })

  it('calls onClose after successful submit', async () => {
    const onClose = vi.fn()
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })

    render(<DisputeModal {...defaultProps} onClose={onClose} />)
    fireEvent.change(screen.getByPlaceholderText(/Ex : travail non conforme/i), { target: { value: 'Raison valide' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer le litige'))
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('shows error toast on supabase error', async () => {
    const showToast = vi.fn()
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    })

    render(<DisputeModal {...defaultProps} showToast={showToast} />)
    fireEvent.change(screen.getByPlaceholderText(/Ex : travail non conforme/i), { target: { value: 'Raison' } })

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer le litige'))
    })

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
  })
})

// ────────────────────────────────────────────────────────────────
// RgpdPanel tests
// ────────────────────────────────────────────────────────────────

describe('RgpdPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequestDataExport.mockResolvedValue({ data: {}, error: null })
    mockRequestAccountDeletion.mockResolvedValue({ data: {}, error: null })
  })

  const defaultProps = {
    userId: 'user-1',
    showToast: vi.fn(),
  }

  it('renders the panel with export and delete buttons', () => {
    render(<RgpdPanel {...defaultProps} />)
    expect(screen.getByText(/Telecharger mes donnees/i)).toBeTruthy()
    expect(screen.getByText('Supprimer mon compte')).toBeTruthy()
  })

  it('calls requestDataExport when export button clicked', async () => {
    const showToast = vi.fn()
    render(<RgpdPanel userId="user-1" showToast={showToast} />)

    await act(async () => {
      fireEvent.click(screen.getByText(/Telecharger mes donnees/i))
    })

    expect(mockRequestDataExport).toHaveBeenCalledWith('user-1')
  })

  it('shows toast on successful data export', async () => {
    const showToast = vi.fn()
    render(<RgpdPanel userId="user-1" showToast={showToast} />)

    await act(async () => {
      fireEvent.click(screen.getByText(/Telecharger mes donnees/i))
    })

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('export'))
  })

  it('shows delete confirmation when Supprimer mon compte is clicked', () => {
    render(<RgpdPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('Supprimer mon compte'))
    expect(screen.getByText('Confirmer la suppression')).toBeTruthy()
  })

  it('hides delete confirmation when Annuler is clicked', () => {
    render(<RgpdPanel {...defaultProps} />)
    fireEvent.click(screen.getByText('Supprimer mon compte'))
    fireEvent.click(screen.getByText('Annuler'))
    expect(screen.queryByText('Confirmer la suppression')).toBeNull()
  })

  it('calls requestAccountDeletion when Confirmer is clicked', async () => {
    const showToast = vi.fn()
    render(<RgpdPanel userId="user-1" showToast={showToast} />)

    fireEvent.click(screen.getByText('Supprimer mon compte'))

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer'))
    })

    expect(mockRequestAccountDeletion).toHaveBeenCalledWith('user-1', '')
  })

  it('hides confirmation panel after successful deletion', async () => {
    const showToast = vi.fn()
    render(<RgpdPanel userId="user-1" showToast={showToast} />)
    fireEvent.click(screen.getByText('Supprimer mon compte'))

    await act(async () => {
      fireEvent.click(screen.getByText('Confirmer'))
    })

    expect(screen.queryByText('Confirmer la suppression')).toBeNull()
  })

  it('shows error toast when export fails', async () => {
    mockRequestDataExport.mockResolvedValueOnce({ data: null, error: { message: 'fail' } })
    const showToast = vi.fn()
    render(<RgpdPanel userId="user-1" showToast={showToast} />)

    await act(async () => {
      fireEvent.click(screen.getByText(/Telecharger mes donnees/i))
    })

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Erreur'), 'error')
  })
})
