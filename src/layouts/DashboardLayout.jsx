import { useEffect, useState } from 'react'
import { Bell, LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useI18n } from '../contexts/I18nContext'
import { useDarkMode } from '../hooks/useDarkMode'
import SidebarA from '../design/Sidebar'
import { TempoLogoA } from '../design/primitives'
import { T } from '../design/tokens'

// Map pour tabs : accepte [key, label] ou [key, label, icon, badge?]
function normalizeTab(t) {
  if (!Array.isArray(t)) return null
  const [id, label, icon, badge] = t
  return { id, label, icon: icon || '·', badge }
}

// Icônes de secours par clé habituelle (si la page ne fournit pas d'icône).
const DEFAULT_ICONS = {
  dashboard: '◎', missions: '▤', candidatures: '☰', candidats: '☰',
  publier: '✦', messages: '✉', 'messages-e': '✉', planning: '▦',
  paiements: '€', factures: '€', contrats: '€', stats: '▦',
  profil: '◉', 'profil-e': '◉', alertes: '⚠', applications: '↗',
  equipe: '◉', kyc: '✓', audit: '▤', users: '◉',
}

export default function DashboardLayout({
  role, tabs, activeTab, onTabChange, onLogoClick, children,
  headerExtra, unreadCount = 0, onNotifClick,
}) {
  const { profile, roleData, logout } = useAuth()
  const { locale, switchLocale } = useI18n()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // Role → label + user block
  const roleLabel = role === 'worker' ? 'Travailleur' : role === 'company' ? 'Entreprise' : role === 'admin' ? 'Admin' : ''
  const userName = (role === 'worker' && roleData?.first_name)
    ? `${roleData.first_name} ${roleData.last_name?.[0] || ''}.`.trim()
    : roleData?.name || profile?.email?.split('@')[0] || 'Utilisateur'
  const userSub = role === 'worker'
    ? (roleData?.sector || 'Travailleur')
    : role === 'company'
    ? (roleData?.sector ? `Ops · ${roleData.sector}` : 'Entreprise')
    : 'Administrateur'

  // Items sidebar : [key, label, icon, badge?]
  const sidebarItems = (tabs || []).map(normalizeTab).filter(Boolean).map(({ id, label, icon, badge }) => ({
    id, label, badge,
    icon: (!icon || icon === '·') ? (DEFAULT_ICONS[id] || '·') : icon,
  }))

  const handleTabClick = (key) => {
    onTabChange(key)
    setDrawerOpen(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.color.wh,
      display: 'flex', fontFamily: T.font.body,
    }}>
      {/* Skip to content (a11y) */}
      <a href="#main-content" style={{
        position: 'absolute', top: -40, left: 0, background: T.color.brand,
        color: '#fff', padding: '8px 16px', zIndex: 200,
        fontSize: 13, fontWeight: 600, transition: 'top .2s',
      }} onFocus={e => (e.target.style.top = '0')} onBlur={e => (e.target.style.top = '-40px')}>
        Aller au contenu principal
      </a>

      {/* ═══ Sidebar Style A (desktop) ═══ */}
      <SidebarA
        roleLabel={roleLabel}
        items={sidebarItems}
        active={activeTab}
        onNavigate={onTabChange}
        userName={userName}
        userSub={userSub}
        onBrandClick={onLogoClick}
      />

      {/* ═══ Main content ═══ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, minHeight: '100vh',
      }}>
        {/* Slim utility bar — langue / thème / notifs / logout
           (remplace l'ancienne header barre pleine largeur) */}
        <div className="app-header" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderBottom: `1px solid ${T.color.g2}`,
          background: T.color.wh,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          {/* Burger menu mobile */}
          <button
            type="button"
            aria-label="Ouvrir le menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="show-mobile app-burger-btn"
            style={{
              display: 'none', background: 'none', border: 'none',
              color: T.color.ink, cursor: 'pointer', padding: 6,
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          ><Menu size={20} /></button>

          {/* Brand mobile only (sidebar masquée) */}
          <button
            type="button"
            className="show-mobile"
            onClick={onLogoClick}
            disabled={!onLogoClick}
            style={{
              display: 'none', alignItems: 'center', gap: 8,
              cursor: onLogoClick ? 'pointer' : 'default',
              marginRight: 'auto', flexShrink: 0,
              background: 'none', border: 'none', padding: 0,
            }}
          >
            <TempoLogoA size={20} dark={false} />
          </button>

          {headerExtra}

          <div className="app-header-actions" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginLeft: 'auto', flexShrink: 0,
          }} role="toolbar" aria-label="Actions rapides">
            <button
              type="button"
              onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')}
              aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en français'}
              style={{
                background: 'none', border: `1px solid ${T.color.g2}`,
                borderRadius: 8, padding: '5px 10px', color: T.color.g5,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                letterSpacing: '0.5px', fontFamily: T.font.mono,
              }}
            >{locale === 'fr' ? 'EN' : 'FR'}</button>
            <button
              type="button" onClick={toggleDarkMode}
              aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
              style={{
                background: 'none', border: 'none', borderRadius: 8,
                padding: '6px 8px', color: T.color.g5, cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >{darkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
            {onNotifClick && (
              <button
                type="button" onClick={onNotifClick}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
                style={{
                  position: 'relative', background: 'none', border: 'none',
                  borderRadius: 8, padding: '6px 8px', color: T.color.g5,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span aria-hidden="true" style={{
                    position: 'absolute', top: 2, right: 2,
                    background: T.color.brand, color: '#fff', borderRadius: '50%',
                    minWidth: 14, height: 14, padding: '0 3px',
                    fontSize: 9, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: 700, lineHeight: 1,
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            )}
            <button
              type="button" onClick={async () => { await logout() }}
              aria-label="Se déconnecter"
              style={{
                fontSize: 12, color: T.color.g5, background: 'none', border: 'none',
                cursor: 'pointer', padding: '6px 8px',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <LogOut size={14} className="show-mobile" style={{ display: 'none' }} />
              <span className="logout-label">Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Drawer mobile */}
        {drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              aria-hidden="true"
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
                zIndex: 199, animation: 'backdropIn .2s ease-out',
              }}
            />
            <aside
              role="dialog" aria-modal="true" aria-label="Menu de navigation"
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: '78%', maxWidth: 300, background: T.color.navy,
                zIndex: 200, display: 'flex', flexDirection: 'column',
                boxShadow: '2px 0 24px rgba(0,0,0,.2)',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                color: '#fff',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.08)',
              }}>
                <TempoLogoA size={22} />
                <button
                  type="button" aria-label="Fermer le menu"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    background: 'none', border: 'none', color: '#fff',
                    cursor: 'pointer', padding: 6, display: 'flex',
                  }}
                ><X size={20} /></button>
              </div>
              {roleLabel && (
                <div style={{
                  fontSize: 10.5, color: 'rgba(255,255,255,0.62)', letterSpacing: 1.4,
                  textTransform: 'uppercase', fontWeight: 700,
                  padding: '14px 20px 10px', fontFamily: T.font.mono,
                }}>{roleLabel}</div>
              )}
              <nav aria-label="Sections" style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 20px' }}>
                {sidebarItems.map(({ id, label, icon, badge }) => {
                  const isActive = activeTab === id
                  return (
                    <button
                      type="button" key={id}
                      onClick={() => handleTabClick(id)}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                        padding: '12px 14px', borderRadius: 10, border: 'none',
                        background: isActive ? 'rgba(37,99,235,0.18)' : 'transparent',
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                        fontSize: 14.5, fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                        margin: '2px 0',
                      }}
                    >
                      <span style={{ width: 18, textAlign: 'center', fontSize: 14, opacity: isActive ? 1 : 0.8 }}>{icon}</span>
                      <span style={{ flex: 1 }}>{label}</span>
                      {badge != null && badge !== 0 && (
                        <span style={{
                          background: T.color.brand, color: '#fff', fontSize: 10,
                          fontWeight: 700, borderRadius: 99, padding: '2px 7px',
                          fontFamily: T.font.mono,
                        }}>{badge}</span>
                      )}
                    </button>
                  )
                })}
              </nav>
            </aside>
          </>
        )}

        {/* Content */}
        <main id="main-content" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
