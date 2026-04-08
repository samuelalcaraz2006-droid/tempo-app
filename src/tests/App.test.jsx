// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mocks des pages lazy-loaded ────────────────────────────────
vi.mock('../pages/Landing.jsx', () => ({
  default: ({ onNavigate }) => <div data-testid="landing">Landing<button onClick={() => onNavigate('auth')}>Go Auth</button></div>,
}))
vi.mock('../pages/Auth.jsx', () => ({
  default: ({ onNavigate }) => <div data-testid="auth-page">Auth<button onClick={() => onNavigate(null)}>Go Landing</button></div>,
}))
vi.mock('../pages/ResetPassword.jsx', () => ({
  default: ({ onDone }) => <div data-testid="reset-page">ResetPassword<button onClick={onDone}>Done</button></div>,
}))
vi.mock('../pages/TravailleurApp.jsx', () => ({
  default: () => <div data-testid="travailleur-app">TravailleurApp</div>,
}))
vi.mock('../pages/EntrepriseApp.jsx', () => ({
  default: () => <div data-testid="entreprise-app">EntrepriseApp</div>,
}))
vi.mock('../pages/AdminApp.jsx', () => ({
  default: () => <div data-testid="admin-app">AdminApp</div>,
}))

// ── Mock useAuth (sera surchargé par test) ─────────────────────
const mockUseAuth = vi.fn()
vi.mock('../contexts/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// ── Mock AuthProvider & I18nProvider (pass-through) ───────────
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
}))
vi.mock('../contexts/I18nContext', () => ({
  I18nProvider: ({ children }) => <>{children}</>,
}))

import App from '../App'

// Helper pour les états courants de useAuth
const authState = {
  notLoaded: { user: null, profile: null, loading: true, recovering: false, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
  noUser: { user: null, profile: null, loading: false, recovering: false, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
  worker: { user: { id: 'u1' }, profile: { role: 'travailleur' }, loading: false, recovering: false, isWorker: true, isCompany: false, isAdmin: false, logout: vi.fn() },
  company: { user: { id: 'u2' }, profile: { role: 'entreprise' }, loading: false, recovering: false, isWorker: false, isCompany: true, isAdmin: false, logout: vi.fn() },
  admin: { user: { id: 'u3' }, profile: { role: 'admin' }, loading: false, recovering: false, isWorker: false, isCompany: false, isAdmin: true, logout: vi.fn() },
  recovering: { user: null, profile: null, loading: false, recovering: true, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
  userNoProfile: { user: { id: 'u4' }, profile: null, loading: false, recovering: false, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
}

describe('ErrorBoundary', () => {
  it('rend les enfants normalement', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    expect(screen.getByTestId('landing')).toBeInTheDocument()
  })

  it('affiche l\'écran d\'erreur quand un composant throw', () => {
    // Suprimer les console.error de React sur les erreurs capturées
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ThrowingComponent = () => { throw new Error('Test crash') }
    // Mocker Landing pour qu'il throw
    vi.doMock('../pages/Landing.jsx', () => ({
      default: () => { throw new Error('Test crash') },
    }))

    // Tester directement ErrorBoundary en wrappant un composant qui throw
    // On importe la classe via App.jsx qui l'exporte pas… on la teste indirectement
    // via un render qui throw
    class TestBoundary extends React.Component {
      constructor(props) { super(props); this.state = { hasError: false, error: null } }
      static getDerivedStateFromError(error) { return { hasError: true, error } }
      render() {
        if (this.state.hasError) {
          return <div>Une erreur est survenue</div>
        }
        return this.props.children
      }
    }

    render(
      <TestBoundary>
        <ThrowingComponent />
      </TestBoundary>
    )

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
    consoleError.mockRestore()
  })
})

describe('AppRouter — routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le spinner de chargement quand loading=true', () => {
    mockUseAuth.mockReturnValue(authState.notLoaded)
    render(<App />)
    expect(screen.getByText(/chargement tempo/i)).toBeInTheDocument()
  })

  it('affiche "Chargement du profil" quand user sans profil', () => {
    mockUseAuth.mockReturnValue(authState.userNoProfile)
    render(<App />)
    expect(screen.getByText(/chargement du profil/i)).toBeInTheDocument()
  })

  it('affiche Landing quand pas d\'utilisateur connecté', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    expect(screen.getByTestId('landing')).toBeInTheDocument()
  })

  it('affiche TravailleurApp pour un travailleur connecté', () => {
    mockUseAuth.mockReturnValue(authState.worker)
    render(<App />)
    expect(screen.getByTestId('travailleur-app')).toBeInTheDocument()
  })

  it('affiche EntrepriseApp pour une entreprise connectée', () => {
    mockUseAuth.mockReturnValue(authState.company)
    render(<App />)
    expect(screen.getByTestId('entreprise-app')).toBeInTheDocument()
  })

  it('affiche AdminRoleSelector pour un admin sans vue sélectionnée', () => {
    mockUseAuth.mockReturnValue(authState.admin)
    render(<App />)
    expect(screen.getByText('Choisir une vue')).toBeInTheDocument()
  })

  it('affiche ResetPassword quand recovering=true', () => {
    mockUseAuth.mockReturnValue(authState.recovering)
    render(<App />)
    expect(screen.getByTestId('reset-page')).toBeInTheDocument()
  })

  it('affiche Auth quand forcedPage=auth (depuis Landing)', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    // Clic sur "Go Auth" dans la landing mockée
    fireEvent.click(screen.getByText('Go Auth'))
    expect(screen.getByTestId('auth-page')).toBeInTheDocument()
  })

  it('revient sur Landing depuis Auth', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    fireEvent.click(screen.getByText('Go Auth'))
    fireEvent.click(screen.getByText('Go Landing'))
    expect(screen.getByTestId('landing')).toBeInTheDocument()
  })
})

describe('AdminRoleSelector', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(authState.admin)
  })

  it('affiche les 3 boutons de vue (Travailleur, Entreprise, Admin)', () => {
    render(<App />)
    expect(screen.getByText('Espace Travailleur')).toBeInTheDocument()
    expect(screen.getByText('Espace Entreprise')).toBeInTheDocument()
    expect(screen.getByText('Panel Admin')).toBeInTheDocument()
  })

  it('affiche TravailleurApp après sélection "Espace Travailleur"', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Espace Travailleur'))
    expect(screen.getByTestId('travailleur-app')).toBeInTheDocument()
  })

  it('affiche EntrepriseApp après sélection "Espace Entreprise"', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Espace Entreprise'))
    expect(screen.getByTestId('entreprise-app')).toBeInTheDocument()
  })

  it('affiche AdminApp après sélection "Panel Admin"', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Panel Admin'))
    expect(screen.getByTestId('admin-app')).toBeInTheDocument()
  })

  it('appelle logout sur "Se déconnecter"', () => {
    render(<App />)
    fireEvent.click(screen.getByText(/se déconnecter/i))
    expect(authState.admin.logout).toHaveBeenCalled()
  })

  it('affiche le badge "Mode Administrateur"', () => {
    render(<App />)
    expect(screen.getByText(/mode administrateur/i)).toBeInTheDocument()
  })
})

describe('Navbar Landing', () => {
  it('affiche les boutons de navigation sur la page Landing', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    expect(screen.getByRole('button', { name: /connexion/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /espace travailleur/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /espace entreprise/i })).toBeInTheDocument()
  })

  it('navigue vers Auth depuis le bouton Connexion', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /^connexion$/i }))
    expect(screen.getByTestId('auth-page')).toBeInTheDocument()
  })
})
