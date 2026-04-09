import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import { I18nProvider } from './contexts/I18nContext'
import { captureError, setUser } from './lib/sentry'
import Auth from './pages/Auth.jsx'
import Landing from './pages/Landing.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

// ── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    captureError(error, { componentStack: errorInfo?.componentStack })
  }
  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#F8FAFC', padding: 24 }}>
        <div style={{ width: 48, height: 48, background: '#EF4444', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>Une erreur est survenue</div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
            {this.state.error?.message || 'Erreur inattendue. Rechargez la page.'}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{ padding: '10px 24px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Recharger l'application
          </button>
        </div>
      </div>
    )
  }
}

const TravailleurApp = React.lazy(() => import('./pages/TravailleurApp.jsx'))
const EntrepriseApp  = React.lazy(() => import('./pages/EntrepriseApp.jsx'))
const AdminApp       = React.lazy(() => import('./pages/AdminApp.jsx'))
const Legal          = React.lazy(() => import('./pages/Legal.jsx'))
import CookieBanner from './components/CookieBanner'

// ── Écran de sélection de rôle pour l'admin ───────────────────
const AdminRoleSelector = ({ onSelect, onLogout }) => (
  <div style={{
    minHeight: '100vh', background: '#0A0A0A', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  }}>
    <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, background: '#FF5500', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
        </div>
        <span style={{ fontWeight: 700, letterSpacing: '2.5px', fontSize: 18, color: '#fff' }}>TEMPO</span>
      </div>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,85,0,.15)', border: '1px solid rgba(255,85,0,.3)', borderRadius: 99, padding: '4px 14px', marginBottom: 24 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5500', display: 'inline-block' }}></span>
        <span style={{ fontSize: 12, color: '#FF8844' }}>Mode Administrateur</span>
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 600, color: '#fff', marginBottom: 8, letterSpacing: '-0.5px' }}>
        Choisir une vue
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,.4)', marginBottom: 36 }}>
        Navigue entre les différents espaces de l'application
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {[
          { role: 'travailleur', icon: '👷', title: 'Espace Travailleur', desc: 'Missions, candidatures, gains, profil' },
          { role: 'entreprise',  icon: '🏢', title: 'Espace Entreprise',  desc: 'Tableau de bord, publication, contrats' },
        ].map(({ role, icon, title, desc }) => (
          <button key={role} onClick={() => onSelect(role)} style={{
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 14, padding: '20px 16px', cursor: 'pointer', textAlign: 'center',
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,85,0,.12)'; e.currentTarget.style.borderColor = 'rgba(255,85,0,.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)' }}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.4 }}>{desc}</div>
          </button>
        ))}
      </div>

      <button onClick={() => onSelect('admin')} style={{
        width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 14, padding: '16px', cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>⚙️</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Panel Admin</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>Gestion utilisateurs, KYC, statistiques globales</div>
      </button>

      <button onClick={onLogout} style={{
        marginTop: 24, background: 'none', border: 'none', fontSize: 13,
        color: 'rgba(255,255,255,.3)', cursor: 'pointer',
      }}>
        Se déconnecter
      </button>
    </div>
  </div>
)

// ── Router principal ──────────────────────────────────────────
const AppRouter = () => {
  const { user, profile, loading, recovering, isWorker, isCompany, isAdmin, logout } = useAuth()
  const [forcedPage, setForcedPage] = React.useState(null)
  const [adminView, setAdminView] = React.useState(null)
  const [showLoginAfterReset, setShowLoginAfterReset] = React.useState(false)

  // Track user in Sentry
  React.useEffect(() => { setUser(user || null) }, [user?.id])

  // Lien de réinitialisation de mot de passe cliqué dans l'email
  if (recovering) {
    return <ResetPassword onDone={() => setShowLoginAfterReset(true)} />
  }

  // Après reset réussi → forcer la page de connexion
  if (showLoginAfterReset && !user) {
    return <Auth onNavigate={(p) => { setShowLoginAfterReset(false); setForcedPage(p) }} />
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--wh)' }}>
      <div style={{ width: 36, height: 36, background: '#FF5500', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
      </div>
      <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement TEMPO...</div>
    </div>
  )

  // ── Utilisateur connecté mais profil pas encore chargé ───
  if (user && !profile) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'var(--wh)' }}>
        <div style={{ width:36, height:36, background:'#FF5500', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
        </div>
        <div style={{ fontSize:13, color:'var(--g4)' }}>Chargement du profil...</div>
      </div>
    )
  }

  // ── Utilisateur connecté ──────────────────────────────────
  if (user && profile) {

    // Admin : sélecteur de vue + switch barre flottante
    if (isAdmin) {
      if (!adminView) {
        return <AdminRoleSelector onSelect={setAdminView} onLogout={logout} />
      }
      return (
        <>
          {adminView === 'travailleur' && <TravailleurApp onNavigate={setForcedPage} onLogoClick={() => setAdminView(null)} />}
          {adminView === 'entreprise'  && <EntrepriseApp  onNavigate={setForcedPage} onLogoClick={() => setAdminView(null)} />}
          {adminView === 'admin'       && <AdminApp onLogoClick={() => setAdminView(null)} />}
        </>
      )
    }

    if (isWorker)  return <TravailleurApp onNavigate={setForcedPage} />
    if (isCompany) return <EntrepriseApp  onNavigate={setForcedPage} />
  }

  // ── Pages legales ────────────────────────────────────────
  if (forcedPage === 'legal') {
    return <Legal onBack={() => setForcedPage(null)} />
  }

  // ── Pages forcées (depuis landing) ───────────────────────
  if (forcedPage === 'auth' || forcedPage === 'travailleur' || forcedPage === 'entreprise') {
    return <Auth onNavigate={setForcedPage} />
  }

  // ── Landing ───────────────────────────────────────────────
  return (
    <div>
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(17,17,17,.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 54 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
            <div style={{ width: 26, height: 26, background: '#FF5500', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
            </div>
            <span style={{ fontWeight: 600, letterSpacing: '2px', fontSize: 13, color: '#fff' }}>TEMPO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setForcedPage('auth')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }}>Connexion</button>
            <button onClick={() => setForcedPage('travailleur')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }}>Espace Travailleur</button>
            <button onClick={() => setForcedPage('entreprise')} style={{ padding: '8px 18px', background: '#FF5500', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Espace Entreprise</button>
          </div>
        </div>
      </nav>
      <div style={{ paddingTop: 54 }}>
        <Landing onNavigate={setForcedPage} />
      </div>
    </div>
  )
}

const LazyFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--wh)' }}>
    <div style={{ width: 36, height: 36, background: '#FF5500', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
    </div>
    <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement...</div>
  </div>
)

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <React.Suspense fallback={<LazyFallback />}>
            <AppRouter />
            <CookieBanner />
          </React.Suspense>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}
