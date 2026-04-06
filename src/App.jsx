import React from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './contexts/useAuth'
import { I18nProvider } from './contexts/I18nContext'
import Auth from './pages/Auth.jsx'
import Landing from './pages/Landing.jsx'
import TravailleurApp from './pages/TravailleurApp.jsx'
import EntrepriseApp from './pages/EntrepriseApp.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

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

// ── Panel Admin minimal (placeholder) ────────────────────────
const ADMIN_PAGE_SIZE = 50

const AdminPanel = ({ onLogoClick }) => {
  const [tab, setTab] = React.useState('users')
  const [users, setUsers] = React.useState([])
  const [stats, setStats] = React.useState({})
  const [loading, setLoading] = React.useState(true)
  const [searchUser, setSearchUser] = React.useState('')
  const [page, setPage] = React.useState(0)

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      const offset = page * ADMIN_PAGE_SIZE
      const [pRes, wRes, cRes, mRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('workers').select('id, first_name, last_name, city, is_available, siret_verified, id_verified, rc_pro_verified, rating_avg, missions_completed').range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('companies').select('id, name, city, plan, rating_avg, missions_posted').range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('missions').select('id, status, sector').limit(500),
      ])
      setUsers((pRes.data||[]).map(p => {
        const w = (wRes.data||[]).find(w => w.id === p.id)
        const c = (cRes.data||[]).find(c => c.id === p.id)
        return { ...p, worker: w, company: c }
      }))
      const allMissions = mRes.data || []
      setStats({
        totalUsers: (pRes.data||[]).length,
        workers: (pRes.data||[]).filter(p => p.role === 'travailleur').length,
        companies: (pRes.data||[]).filter(p => p.role === 'entreprise').length,
        totalMissions: allMissions.length,
        openMissions: allMissions.filter(m => m.status === 'open').length,
        completedMissions: allMissions.filter(m => m.status === 'completed').length,
        kycPending: (wRes.data||[]).filter(w => !w.id_verified || !w.siret_verified).length,
      })
      setLoading(false)
    }
    load()
  }, [page])

  const filteredUsers = searchUser
    ? users.filter(u => (u.email||'').toLowerCase().includes(searchUser.toLowerCase()) || (u.worker?.first_name||'').toLowerCase().includes(searchUser.toLowerCase()) || (u.company?.name||'').toLowerCase().includes(searchUser.toLowerCase()))
    : users

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wh)', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div onClick={onLogoClick} style={{ width: 28, height: 28, background: '#FF5500', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onLogoClick ? 'pointer' : 'default' }}>
            <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1.5 1L9.5 5.5L1.5 10Z" fill="white"/></svg>
          </div>
          <span onClick={onLogoClick} style={{ fontWeight: 600, letterSpacing: '2px', fontSize: 14, cursor: onLogoClick ? 'pointer' : 'default' }}>TEMPO</span>
          <span style={{ fontSize: 12, color: 'var(--g4)', borderLeft: '1px solid #E8E8E5', paddingLeft: 8, marginLeft: 4 }}>Panel Admin</span>
        </div>

        {/* Admin tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--g2)', marginBottom: 20 }}>
          {[['users', 'Utilisateurs'], ['kyc', 'KYC'], ['stats', 'Statistiques']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: tab === k ? 500 : 400, color: tab === k ? 'var(--bk)' : 'var(--g4)', borderBottom: tab === k ? '2px solid #FF5500' : '2px solid transparent', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--g4)' }}>Chargement...</div>
        ) : (
          <>
            {tab === 'stats' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    [stats.totalUsers, 'Utilisateurs'],
                    [stats.workers, 'Travailleurs'],
                    [stats.companies, 'Entreprises'],
                    [stats.totalMissions, 'Missions totales'],
                    [stats.openMissions, 'Missions ouvertes'],
                    [stats.completedMissions, 'Missions terminées'],
                    [stats.kycPending, 'KYC en attente'],
                    [`${stats.totalMissions > 0 ? Math.round((stats.completedMissions/stats.totalMissions)*100) : 0}%`, 'Taux complétion'],
                  ].map(([v, l]) => (
                    <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value">{v}</div></div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div>
                <input className="input" placeholder="Rechercher par email, nom ou entreprise..." value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} />
                <div style={{ background: 'var(--wh)', border: '1px solid var(--g2)', borderRadius: 14, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#111' }}>
                        {['Email', 'Rôle', 'Nom', 'Ville', 'Statut', 'Inscrit le'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.7)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.slice(0, 50).map((u, i) => (
                        <tr key={u.id} style={{ background: i % 2 === 1 ? 'var(--g1)' : 'var(--wh)' }}>
                          <td style={{ padding: '10px 14px', fontSize: 12 }}>{u.email}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${u.role === 'travailleur' ? 'badge-blue' : u.role === 'entreprise' ? 'badge-orange' : 'badge-gray'}`} style={{ fontSize: 11 }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12 }}>
                            {u.worker ? `${u.worker.first_name||''} ${u.worker.last_name||''}`.trim() : u.company?.name || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--g4)' }}>{u.worker?.city || u.company?.city || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{u.status || 'active'}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--g4)' }}>{u.created_at?.split('T')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, fontSize:13, color:'var(--g4)' }}>
                  <span>Page {page + 1} — {users.length} résultats</span>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn-secondary" style={{ padding:'6px 14px', fontSize:12 }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Préc.</button>
                    <button className="btn-secondary" style={{ padding:'6px 14px', fontSize:12 }} onClick={() => setPage(p => p + 1)} disabled={users.length < ADMIN_PAGE_SIZE}>Suiv. →</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'kyc' && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Travailleurs — Vérifications en attente</div>
                {users.filter(u => u.worker && (!u.worker.id_verified || !u.worker.siret_verified || !u.worker.rc_pro_verified)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--g4)', fontSize: 13 }}>Toutes les vérifications sont à jour</div>
                ) : (
                  users.filter(u => u.worker && (!u.worker.id_verified || !u.worker.siret_verified || !u.worker.rc_pro_verified)).map(u => (
                    <div key={u.id} className="card" style={{ padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.worker.first_name} {u.worker.last_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--g4)' }}>{u.email} · {u.worker.city || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!u.worker.id_verified && <span className="badge badge-orange" style={{ fontSize: 10 }}>ID</span>}
                        {!u.worker.siret_verified && <span className="badge badge-orange" style={{ fontSize: 10 }}>SIRET</span>}
                        {!u.worker.rc_pro_verified && <span className="badge badge-orange" style={{ fontSize: 10 }}>RC Pro</span>}
                        <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={async () => {
                            await supabase.from('workers').update({ id_verified: true, siret_verified: true, rc_pro_verified: true, kyc_completed_at: new Date().toISOString() }).eq('id', u.id)
                            setUsers(prev => prev.map(p => p.id === u.id ? { ...p, worker: { ...p.worker, id_verified: true, siret_verified: true, rc_pro_verified: true } } : p))
                          }}>
                          ✓ Valider tout
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Router principal ──────────────────────────────────────────
const AppRouter = () => {
  const { user, profile, loading, recovering, isWorker, isCompany, isAdmin, logout } = useAuth()
  const [forcedPage, setForcedPage] = React.useState(null)
  const [adminView, setAdminView] = React.useState(null)
  const [showLoginAfterReset, setShowLoginAfterReset] = React.useState(false)

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
          {adminView === 'admin'       && <AdminPanel onLogoClick={() => setAdminView(null)} />}
        </>
      )
    }

    if (isWorker)  return <TravailleurApp onNavigate={setForcedPage} />
    if (isCompany) return <EntrepriseApp  onNavigate={setForcedPage} />
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

export default function App() {
  return <I18nProvider><AuthProvider><AppRouter /></AuthProvider></I18nProvider>
}
