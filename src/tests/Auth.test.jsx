// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// ── Mocks ──────────────────────────────────────────────────────
const mockLogin = vi.fn()
const mockRegister = vi.fn()

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, register: mockRegister }),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

import Auth from '../pages/Auth'
import { supabase } from '../lib/supabase'

describe('Auth', () => {
  const onNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Rendu initial ───────────────────────────────────────────
  it('affiche le formulaire de connexion par défaut', () => {
    render(<Auth onNavigate={onNavigate} />)
    expect(screen.getByText('Connexion à TEMPO')).toBeInTheDocument()
  })

  it('affiche les boutons Connexion et Inscription', () => {
    render(<Auth onNavigate={onNavigate} />)
    expect(screen.getByRole('button', { name: /^connexion$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^inscription$/i })).toBeInTheDocument()
  })

  it('affiche le lien retour à l\'accueil', () => {
    render(<Auth onNavigate={onNavigate} />)
    expect(screen.getByText(/retour à l'accueil/i)).toBeInTheDocument()
  })

  it('appelle onNavigate(null) sur retour à l\'accueil', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText(/retour à l'accueil/i))
    expect(onNavigate).toHaveBeenCalledWith(null)
  })

  // ── Connexion ───────────────────────────────────────────────
  it('login réussi : pas de message d\'erreur', async () => {
    mockLogin.mockResolvedValue({ error: null })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.fr' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'Password1' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form'))
    })

    expect(screen.queryByText(/email ou mot de passe incorrect/i)).not.toBeInTheDocument()
  })

  it('login avec credentials incorrects : affiche erreur', async () => {
    mockLogin.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.fr' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'wrong' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form'))
    })

    expect(screen.getByText(/email ou mot de passe incorrect/i)).toBeInTheDocument()
  })

  it('login avec autre erreur : affiche message générique', async () => {
    mockLogin.mockResolvedValue({ error: { message: 'Network error' } })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.fr' } })
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'pass' } })
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form'))
    })

    expect(screen.getByText(/erreur d'authentification/i)).toBeInTheDocument()
  })

  it('bloque le login après 5 tentatives', async () => {
    mockLogin.mockResolvedValue({ error: { message: 'invalid_credentials' } })
    render(<Auth onNavigate={onNavigate} />)

    const form = screen.getByRole('button', { name: /se connecter/i }).closest('form')
    for (let i = 0; i < 5; i++) {
      await act(async () => { fireEvent.submit(form) })
    }

    // 6ème tentative → message de blocage
    await act(async () => { fireEvent.submit(form) })
    expect(screen.getByText(/trop de tentatives/i)).toBeInTheDocument()
  })

  it('affiche "Connexion..." pendant le chargement', async () => {
    let resolve
    mockLogin.mockReturnValue(new Promise(r => { resolve = r }))
    render(<Auth onNavigate={onNavigate} />)

    act(() => {
      fireEvent.submit(screen.getByRole('button', { name: /se connecter/i }).closest('form'))
    })

    expect(screen.getByText('Connexion...')).toBeInTheDocument()
    resolve({ error: null })
  })

  // ── Navigation vers inscription ─────────────────────────────
  it('bascule vers le mode inscription', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    expect(screen.getByText(/je suis.../i)).toBeInTheDocument()
  })

  it('affiche la sélection de rôle en mode inscription', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    expect(screen.getByText('Travailleur')).toBeInTheDocument()
    expect(screen.getByText('Entreprise')).toBeInTheDocument()
  })

  // ── Inscription Travailleur ────────────────────────────────
  it('affiche formulaire travailleur après sélection du rôle', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    expect(screen.getByText('Informations personnelles')).toBeInTheDocument()
  })

  it('passe à l\'étape 2 lors du clic Continuer (étape 1)', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    expect(screen.getByText(/siret & localisation/i)).toBeInTheDocument()
  })

  it('passe à l\'étape 3 lors du clic Continuer (étape 2)', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    expect(screen.getByText(/accès & finalisation/i)).toBeInTheDocument()
  })

  it('affiche erreur si les mots de passe ne correspondent pas (travailleur étape 3)', async () => {
    mockRegister.mockResolvedValue({ error: null })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    // Étape 1 → 2 → 3
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))

    fireEvent.change(screen.getByLabelText(/^mot de passe$/i), { target: { value: 'Password1!' } })
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'DifferentPass1!' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /créer mon compte/i }).closest('form'))
    })

    expect(screen.getByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('affiche erreur si mot de passe trop faible (travailleur étape 3)', async () => {
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))

    fireEvent.change(screen.getByLabelText(/^mot de passe$/i), { target: { value: 'weak' } })
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'weak' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /créer mon compte/i }).closest('form'))
    })

    expect(screen.getByText(/mot de passe trop faible/i)).toBeInTheDocument()
  })

  it('inscription travailleur réussie : affiche message de succès', async () => {
    mockRegister.mockResolvedValue({ error: null })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@test.fr' } })
    fireEvent.change(screen.getByLabelText(/^mot de passe$/i), { target: { value: 'ValidPass10' } })
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'ValidPass10' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /créer mon compte/i }).closest('form'))
    })

    expect(screen.getByText(/compte créé/i)).toBeInTheDocument()
  })

  // ── Inscription Entreprise ─────────────────────────────────
  it('affiche formulaire entreprise après sélection du rôle', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis entreprise/i))
    expect(screen.getByText(/créer un compte entreprise/i)).toBeInTheDocument()
  })

  it('inscription entreprise réussie : affiche message de succès', async () => {
    mockRegister.mockResolvedValue({ error: null })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis entreprise/i))

    fireEvent.change(screen.getByLabelText(/nom de l'entreprise/i), { target: { value: 'My Corp' } })
    fireEvent.change(screen.getByLabelText(/prénom contact/i), { target: { value: 'Jean' } })
    fireEvent.change(screen.getByLabelText(/^nom contact$/i), { target: { value: 'Dupont' } })
    fireEvent.change(screen.getByLabelText(/email professionnel/i), { target: { value: 'rh@corp.fr' } })
    fireEvent.change(screen.getByLabelText(/^mot de passe$/i), { target: { value: 'ValidPass1' } })
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'ValidPass1' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /créer mon espace entreprise/i }).closest('form'))
    })

    expect(screen.getByText(/compte créé/i)).toBeInTheDocument()
  })

  // ── Réinitialisation mot de passe ──────────────────────────
  it('bascule vers le mode reset sur "Mot de passe oublié ?"', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText(/mot de passe oublié/i))
    expect(screen.getByText('Mot de passe oublié')).toBeInTheDocument()
  })

  it('reset réussi : affiche message succès', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.click(screen.getByText(/mot de passe oublié/i))
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.fr' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))
    })

    expect(screen.getByText(/email envoyé/i)).toBeInTheDocument()
  })

  it('reset échoué : affiche erreur', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'fail' } })
    render(<Auth onNavigate={onNavigate} />)

    fireEvent.click(screen.getByText(/mot de passe oublié/i))
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'bad@test.fr' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }))
    })

    expect(screen.getByText(/impossible d'envoyer l'email/i)).toBeInTheDocument()
  })

  it('retour depuis reset vers login', () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText(/mot de passe oublié/i))
    fireEvent.click(screen.getByText(/‹ retour/i))
    expect(screen.getByText('Connexion à TEMPO')).toBeInTheDocument()
  })

  // ── isStrongPassword ────────────────────────────────────────
  it('rejette un mot de passe sans majuscule', async () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))

    fireEvent.change(screen.getByLabelText(/^mot de passe$/i), { target: { value: 'nouppercase1!' } })
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'nouppercase1!' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /créer mon compte/i }).closest('form'))
    })

    expect(screen.getByText(/mot de passe trop faible/i)).toBeInTheDocument()
  })

  it('rejette un mot de passe sans chiffre', async () => {
    render(<Auth onNavigate={onNavigate} />)
    fireEvent.click(screen.getByRole('button', { name: /^inscription$/i }))
    fireEvent.click(screen.getByLabelText(/je suis travailleur/i))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))
    fireEvent.submit(screen.getByRole('button', { name: /continuer/i }).closest('form'))

    fireEvent.change(screen.getByLabelText(/^mot de passe$/i), { target: { value: 'NoDigitPwdLong' } })
    fireEvent.change(screen.getByLabelText(/confirmer/i), { target: { value: 'NoDigitPwdLong' } })

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /créer mon compte/i }).closest('form'))
    })

    expect(screen.getByText(/mot de passe trop faible/i)).toBeInTheDocument()
  })
})
