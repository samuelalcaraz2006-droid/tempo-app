// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────
const mockUpdateUser = vi.fn()
const mockLogout = vi.fn()
const mockOnDone = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: (...args) => mockUpdateUser(...args),
    },
  },
}))

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}))

import ResetPassword from '../pages/ResetPassword'

// ── Helpers ────────────────────────────────────────────────────
const VALID_PASSWORD = 'Secure1234!'

const renderComponent = () =>
  render(<ResetPassword onDone={mockOnDone} />)

const fillForm = (password, confirm) => {
  fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText(/confirmer le mot de passe/i), {
    target: { value: confirm },
  })
}

const submitForm = () => {
  // Submit via the form element to bypass disabled button state
  const form = document.querySelector('form')
  if (form) fireEvent.submit(form)
}

// ── Tests ──────────────────────────────────────────────────────
describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockUpdateUser.mockResolvedValue({ error: null })
    mockLogout.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendu initial', () => {
    it('affiche le formulaire par défaut', () => {
      renderComponent()
      expect(screen.getByLabelText(/nouveau mot de passe/i)).toBeDefined()
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeDefined()
      expect(screen.getByRole('button', { name: /définir le nouveau mot de passe/i })).toBeDefined()
    })

    it('affiche le logo TEMPO', () => {
      renderComponent()
      expect(screen.getByText('TEMPO')).toBeDefined()
    })
  })

  describe('Validation — mot de passe faible', () => {
    it('affiche une erreur si mot de passe < 10 chars', async () => {
      renderComponent()
      fillForm('Short1!', 'Short1!')
      await act(async () => { submitForm() })
      expect(screen.getByText(/trop faible/i)).toBeDefined()
    })

    it('affiche une erreur sans majuscule', async () => {
      renderComponent()
      fillForm('lowercase1234', 'lowercase1234')
      await act(async () => { submitForm() })
      expect(screen.getByText(/trop faible/i)).toBeDefined()
    })

    it('affiche une erreur sans chiffre', async () => {
      renderComponent()
      fillForm('NoNumberHere!!', 'NoNumberHere!!')
      await act(async () => { submitForm() })
      expect(screen.getByText(/trop faible/i)).toBeDefined()
    })

    it('ne soumet pas à Supabase si mot de passe faible', async () => {
      renderComponent()
      fillForm('weak', 'weak')
      await act(async () => { submitForm() })
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })
  })

  describe('Validation — confirmation', () => {
    it('affiche une erreur si les mots de passe ne correspondent pas', async () => {
      renderComponent()
      fillForm(VALID_PASSWORD, 'DifferentPass1!')
      await act(async () => { submitForm() })
      // L'erreur de validation s'affiche en haut du formulaire (distincte de l'indicateur inline)
      const errorEl = document.querySelector('[style*="var(--rd-l)"]')
      expect(errorEl).toBeTruthy()
      expect(errorEl.textContent).toMatch(/ne correspondent pas/i)
      expect(mockUpdateUser).not.toHaveBeenCalled()
    })
  })

  describe('Soumission réussie', () => {
    it('appelle supabase.auth.updateUser avec le bon mot de passe', async () => {
      renderComponent()
      fillForm(VALID_PASSWORD, VALID_PASSWORD)
      await act(async () => { submitForm() })
      await act(async () => { await Promise.resolve() })
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: VALID_PASSWORD })
    })

    it('affiche le message de succès après update', async () => {
      renderComponent()
      fillForm(VALID_PASSWORD, VALID_PASSWORD)
      await act(async () => {
        submitForm()
        await Promise.resolve()
      })
      expect(screen.getByText(/mot de passe mis à jour/i)).toBeDefined()
    })

    it('appelle logout + onDone après délai de 2s', async () => {
      renderComponent()
      fillForm(VALID_PASSWORD, VALID_PASSWORD)
      await act(async () => {
        submitForm()
        await Promise.resolve()
      })
      await act(async () => {
        vi.advanceTimersByTime(2000)
        await Promise.resolve()
      })
      expect(mockLogout).toHaveBeenCalled()
      expect(mockOnDone).toHaveBeenCalled()
    })
  })

  describe('Erreur Supabase', () => {
    it('affiche le message d\'erreur retourné par Supabase', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Token expiré' } })
      renderComponent()
      fillForm(VALID_PASSWORD, VALID_PASSWORD)
      await act(async () => {
        submitForm()
        await Promise.resolve()
      })
      expect(screen.getByText(/token expiré/i)).toBeDefined()
    })

    it('ne cache pas le formulaire en cas d\'erreur', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Erreur réseau' } })
      renderComponent()
      fillForm(VALID_PASSWORD, VALID_PASSWORD)
      await act(async () => {
        submitForm()
        await Promise.resolve()
      })
      expect(screen.queryByText(/mot de passe mis à jour/i)).toBeNull()
    })
  })

  describe('Affichage du mot de passe', () => {
    it('bascule entre password et text au clic sur l\'icône', () => {
      renderComponent()
      const input = screen.getByLabelText(/nouveau mot de passe/i)
      expect(input.type).toBe('password')
      const toggleBtn = screen.getByRole('button', { name: /👁️/ })
      fireEvent.click(toggleBtn)
      expect(input.type).toBe('text')
      fireEvent.click(toggleBtn)
      expect(input.type).toBe('password')
    })
  })

  describe('Indicateur de force du mot de passe', () => {
    it('affiche "Trop court" pour < 8 chars', () => {
      renderComponent()
      fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
        target: { value: 'abc' },
      })
      expect(screen.getByText('Trop court')).toBeDefined()
    })

    it('affiche "Moyen" pour 8-9 chars', () => {
      renderComponent()
      fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
        target: { value: 'Abcde123' },
      })
      expect(screen.getByText('Moyen')).toBeDefined()
    })

    it('affiche "Bon" pour 10-11 chars', () => {
      renderComponent()
      fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
        target: { value: 'Abcdefgh12' },
      })
      expect(screen.getByText('Bon')).toBeDefined()
    })

    it('affiche "Excellent" pour 12+ chars avec majuscule et chiffre', () => {
      renderComponent()
      fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), {
        target: { value: 'Abcdefghij12' },
      })
      expect(screen.getByText('Excellent')).toBeDefined()
    })

    it('n\'affiche pas l\'indicateur si le champ est vide', () => {
      renderComponent()
      expect(screen.queryByText('Trop court')).toBeNull()
      expect(screen.queryByText('Excellent')).toBeNull()
    })
  })

  describe('Indicateur de correspondance', () => {
    it('affiche "ne correspondent pas" si confirm ≠ password', () => {
      renderComponent()
      fillForm('Abcde12345', 'Different99')
      expect(screen.getAllByText(/ne correspondent pas/i).length).toBeGreaterThan(0)
    })

    it('affiche un message positif si confirm = password', () => {
      renderComponent()
      fillForm('Abcde12345', 'Abcde12345')
      expect(screen.getByText(/les mots de passe correspondent/i)).toBeDefined()
    })
  })
})
