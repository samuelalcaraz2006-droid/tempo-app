import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import { I18nProvider } from './contexts/I18nContext'
import { captureError, setUser as setSentryUser } from './lib/sentry'
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--wh)', padding: 24 }}>
        <div style={{ width: 48, height: 48, background: 'var(--rd)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v4m0 4h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--bk)', marginBottom: 8 }}>Une erreur est survenue</div>
          <div style={{ fontSize: 13, color: 'var(--g6)', marginBottom: 12, lineHeight: 1.6 }}>
            {this.state.error?.message || 'Erreur inattendue. Rechargez la page.'}
          </div>
          {this.state.error?.stack && (
            <details style={{ marginBottom: 20, textAlign: 'left' }}>
              <summary style={{ fontSize: 11, color: 'var(--g6)', cursor: 'pointer' }}>Détails techniques</summary>
              <pre style={{ fontSize: 10, color: 'var(--g6)', background: 'var(--g1)', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 200, marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {String(this.state.error.stack).slice(0, 1500)}
              </pre>
            </details>
          )}
          <button type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{ padding: '10px 24px', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Recharger l'application
          </button>
          <button type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
            style={{ marginTop: 8, padding: '8px 20px', background: 'transparent', color: 'var(--g6)', border: '1px solid var(--g2)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Retour a l'accueil
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
const GodModePicker  = React.lazy(() => import('./pages/GodModePicker.jsx'))
import CookieBanner from './components/CookieBanner'
import FeedbackWidget from './components/FeedbackWidget'
import ImpersonationBanner from './components/ImpersonationBanner'
import { useUpdateChecker } from './hooks/useUpdateChecker'

// ── Router principal ──────────────────────────────────────────
const AppRouter = () => {
  const {
    user, profile, loading, recovering,
    isWorker, isCompany, isAdmin,
    realProfile, viewAs, resetView,
  } = useAuth()
  const [forcedPage, setForcedPage] = React.useState(null)
  const [showLoginAfterReset, setShowLoginAfterReset] = React.useState(false)

  React.useEffect(() => { setSentryUser(user || null) }, [user?.id])

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
      <div style={{ width: 36, height: 36, background: 'var(--brand)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
      </div>
      <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement TEMPO...</div>
    </div>
  )

  // ── Utilisateur connecté mais profil pas encore chargé ───
  if (user && !profile) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, background:'var(--wh)' }}>
        <div style={{ width:36, height:36, background:'var(--brand)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
        </div>
        <div style={{ fontSize:13, color:'var(--g4)' }}>Chargement du profil...</div>
      </div>
    )
  }

  // ── Utilisateur connecté ──────────────────────────────────
  if (user && profile) {

    // God Mode : admin pas encore choisi son point de vue
    if (realProfile?.role === 'admin' && viewAs === null) {
      return <GodModePicker />
    }

    // Vue effective (admin en impersonation a isWorker / isCompany vrais)
    const view = (
      <>
        <ImpersonationBanner />
        {isWorker  && <TravailleurApp onNavigate={setForcedPage} onLogoClick={realProfile?.role === 'admin' ? resetView : undefined} />}
        {isCompany && <EntrepriseApp  onNavigate={setForcedPage} onLogoClick={realProfile?.role === 'admin' ? resetView : undefined} />}
        {isAdmin   && <AdminApp       onLogoClick={resetView} />}
      </>
    )
    if (isWorker || isCompany || isAdmin) return view
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
      <nav className="app-landing-nav hide-mobile" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, background: 'rgba(17,17,17,.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '0 24px', display: 'flex', alignItems: 'center', height: 54 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
            <div style={{ width: 26, height: 26, background: 'var(--brand)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
            </div>
            <span style={{ fontWeight: 600, letterSpacing: '2px', fontSize: 13, color: '#fff' }}>TEMPO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => setForcedPage('auth')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }}>Connexion</button>
            <button type="button" onClick={() => setForcedPage('travailleur')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,.75)', cursor: 'pointer' }}>Espace Travailleur</button>
            <button type="button" onClick={() => setForcedPage('entreprise')} style={{ padding: '8px 18px', background: 'var(--brand)', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Espace Entreprise</button>
          </div>
        </div>
      </nav>
      <div className="app-landing-pad">
        <Landing onNavigate={setForcedPage} />
      </div>
    </div>
  )
}

const LazyFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--wh)' }}>
    <div style={{ width: 36, height: 36, background: 'var(--brand)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white"/></svg>
    </div>
    <div style={{ fontSize: 13, color: 'var(--g4)' }}>Chargement...</div>
  </div>
)

export default function App() {
  useUpdateChecker()
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AuthProvider>
          <React.Suspense fallback={<LazyFallback />}>
            <AppRouter />
            <CookieBanner />
            <FeedbackWidget />
          </React.Suspense>
        </AuthProvider>
      </I18nProvider>
    </ErrorBoundary>
  )
}
