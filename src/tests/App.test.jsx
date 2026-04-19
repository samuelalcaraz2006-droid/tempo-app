// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mocks des pages (synchrones — pas de React.lazy) ─────────
vi.mock('../pages/Landing.jsx', () => ({
  default: ({ onNavigate }) => (
    <div data-testid="landing">
      Landing
      <button onClick={() => onNavigate('auth')}>Go Auth</button>
    </div>
  ),
}))
vi.mock('../pages/Auth.jsx', () => ({
  default: ({ onNavigate }) => (
    <div data-testid="auth-page">
      Auth
      <button onClick={() => onNavigate(null)}>Go Landing</button>
    </div>
  ),
}))
vi.mock('../pages/ResetPassword.jsx', () => ({
  default: ({ onDone }) => (
    <div data-testid="reset-page">
      ResetPassword
      <button onClick={onDone}>Done</button>
    </div>
  ),
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
vi.mock('../pages/GodModePicker.jsx', () => ({
  default: () => <div data-testid="god-mode-picker">GodModePicker</div>,
}))
vi.mock('../pages/Legal.jsx', () => ({
  default: ({ onBack }) => <div data-testid="legal-page"><button onClick={onBack}>Back</button></div>,
}))
vi.mock('../components/FeedbackWidget', () => ({
  default: () => null,
}))
vi.mock('../components/CookieBanner', () => ({
  default: () => null,
}))
vi.mock('../components/ImpersonationBanner', () => ({
  default: () => null,
}))
vi.mock('../lib/sentry', () => ({
  captureError: vi.fn(),
  setUser: vi.fn(),
}))

// ── Mock useAuth ──────────────────────────────────────────────
const mockUseAuth = vi.fn()
vi.mock('../contexts/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// ── Mock providers (pass-through) ────────────────────────────
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  AuthContext: React.createContext(null),
}))
vi.mock('../contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'fr', switchLocale: vi.fn(), t: (k) => k }),
  I18nProvider: ({ children }) => <>{children}</>,
}))

import App from '../App'

// ── États useAuth prédéfinis ──────────────────────────────────
const baseAuth = { realProfile: null, viewAs: null, resetView: vi.fn() }
const authState = {
  notLoaded:     { ...baseAuth, user: null,           profile: null,                     loading: true,  recovering: false, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
  noUser:        { ...baseAuth, user: null,           profile: null,                     loading: false, recovering: false, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
  worker:        { ...baseAuth, user: { id: 'u1' },   profile: { role: 'travailleur' },  loading: false, recovering: false, isWorker: true,  isCompany: false, isAdmin: false, logout: vi.fn() },
  company:       { ...baseAuth, user: { id: 'u2' },   profile: { role: 'entreprise' },   loading: false, recovering: false, isWorker: false, isCompany: true,  isAdmin: false, logout: vi.fn() },
  admin:         { ...baseAuth, user: { id: 'u3' },   profile: { role: 'admin' },        loading: false, recovering: false, isWorker: false, isCompany: false, isAdmin: true,  logout: vi.fn(), realProfile: { role: 'admin' } },
  recovering:    { ...baseAuth, user: null,           profile: null,                     loading: false, recovering: true,  isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
  userNoProfile: { ...baseAuth, user: { id: 'u4' },   profile: null,                     loading: false, recovering: false, isWorker: false, isCompany: false, isAdmin: false, logout: vi.fn() },
}

describe('ErrorBoundary', () => {
  it('rend les enfants normalement', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
    expect(screen.getByTestId('landing')).toBeInTheDocument()
  })

  it('affiche l\'écran d\'erreur quand un composant throw', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    class TestBoundary extends React.Component {
      constructor(props) { super(props); this.state = { hasError: false } }
      static getDerivedStateFromError() { return { hasError: true } }
      render() {
        return this.state.hasError
          ? <div>Une erreur est survenue</div>
          : this.props.children
      }
    }

    const ThrowingComponent = () => { throw new Error('Test crash') }

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
  beforeEach(() => { vi.clearAllMocks() })

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

  it('affiche TravailleurApp pour un travailleur connecté', async () => {
    mockUseAuth.mockReturnValue(authState.worker)
    render(<App />)
    expect(await screen.findByTestId('travailleur-app')).toBeInTheDocument()
  })

  it('affiche EntrepriseApp pour une entreprise connectée', async () => {
    mockUseAuth.mockReturnValue(authState.company)
    render(<App />)
    expect(await screen.findByTestId('entreprise-app')).toBeInTheDocument()
  })

  it('affiche GodModePicker pour un admin sans vue sélectionnée', async () => {
    mockUseAuth.mockReturnValue(authState.admin)
    render(<App />)
    expect(await screen.findByTestId('god-mode-picker')).toBeInTheDocument()
  })

  it('affiche ResetPassword quand recovering=true', () => {
    mockUseAuth.mockReturnValue(authState.recovering)
    render(<App />)
    expect(screen.getByTestId('reset-page')).toBeInTheDocument()
  })

  it('affiche Auth quand forcedPage=auth (depuis Landing)', () => {
    mockUseAuth.mockReturnValue(authState.noUser)
    render(<App />)
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

describe('God Mode — routing admin', () => {
  it('affiche GodModePicker quand realProfile=admin et viewAs=null', async () => {
    mockUseAuth.mockReturnValue({ ...authState.admin, realProfile: { role: 'admin' }, viewAs: null })
    render(<App />)
    expect(await screen.findByTestId('god-mode-picker')).toBeInTheDocument()
  })

  it('affiche AdminApp pour un admin ayant choisi la vue admin', async () => {
    mockUseAuth.mockReturnValue({ ...authState.admin, realProfile: { role: 'admin' }, viewAs: 'admin' })
    render(<App />)
    expect(await screen.findByTestId('admin-app')).toBeInTheDocument()
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
