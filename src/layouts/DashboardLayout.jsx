import React from 'react'
import { Moon, Sun, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useI18n } from '../contexts/I18nContext'
import { useDarkMode } from '../hooks/useDarkMode'

export default function DashboardLayout({ role, tabs, activeTab, onTabChange, onLogoClick, children, headerExtra, unreadCount = 0, onNotifClick }) {
  const { logout } = useAuth()
  const { locale, switchLocale } = useI18n()
  const { darkMode, toggleDarkMode } = useDarkMode()

  const isWorker = role === 'worker'
  const headerBg = isWorker ? 'var(--navy)' : 'var(--wh2)'
  const headerColor = isWorker ? 'rgba(255,255,255,.7)' : 'var(--g4)'
  const headerBorder = isWorker ? 'none' : '1px solid var(--g2)'
  const roleLabel = role === 'worker' ? '' : role === 'company' ? 'Espace Entreprise' : 'Panel Admin'

  return (
    <div style={{ minHeight:'100vh', background:'var(--wh)', display:'flex', flexDirection:'column' }}>
      {/* Skip to content link (a11y) */}
      <a href="#main-content" style={{ position:'absolute', top:-40, left:0, background:'var(--or)', color:'#fff', padding:'8px 16px', zIndex:200, fontSize:13, fontWeight:600, transition:'top .2s' }} onFocus={e => { e.target.style.top = '0' }} onBlur={e => { e.target.style.top = '-40px' }}>
        Aller au contenu principal
      </a>

      {/* Header */}
      <header role="banner" className="app-header" style={{ background: headerBg, borderBottom: headerBorder, padding:'0 20px', display:'flex', alignItems:'center', height: isWorker ? 54 : 48, position:'sticky', top:0, zIndex:100, gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight: isWorker ? 'auto' : 20, cursor: onLogoClick ? 'pointer' : 'default', flexShrink:0 }} onClick={onLogoClick} role={onLogoClick ? 'button' : undefined} tabIndex={onLogoClick ? 0 : undefined} aria-label={onLogoClick ? 'Retour a l\'accueil' : undefined} onKeyDown={e => { if (onLogoClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onLogoClick() } }}>
          <div style={{ width:24, height:24, background:'var(--or)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }} aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
          </div>
          <span style={{ fontWeight:600, letterSpacing: isWorker ? '2px' : '1.5px', fontSize:13, color: isWorker ? '#fff' : 'var(--bk)' }}>TEMPO</span>
          {roleLabel && <span className="app-header-logo-role" style={{ fontSize:12, color: headerColor, borderLeft:'1px solid var(--g2)', paddingLeft:8, marginLeft:4 }}>{roleLabel}</span>}
        </div>

        {headerExtra}

        {!isWorker && (
          <nav role="navigation" aria-label="Navigation principale" className="app-header-nav" style={{ display:'flex', gap:0, marginRight:'auto', minWidth:0 }}>
            {tabs.map(([key, label]) => (
              <button key={key} onClick={() => onTabChange(key)} aria-current={activeTab === key ? 'page' : undefined} style={{ padding:'0 14px', height: isWorker ? 54 : 48, border:'none', background:'transparent', fontSize:13, color: activeTab === key ? 'var(--bk)' : 'var(--g4)', fontWeight: activeTab === key ? 500 : 400, borderBottom: activeTab === key ? '2px solid var(--or)' : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>{label}</button>
            ))}
          </nav>
        )}

        <div className="app-header-actions" style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }} role="toolbar" aria-label="Actions rapides">
          <button onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')} aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en francais'} style={{ background: isWorker ? 'rgba(255,255,255,.08)' : 'none', border: isWorker ? 'none' : '1px solid var(--g2)', borderRadius: isWorker ? 8 : 6, padding: isWorker ? '6px 10px' : '4px 8px', color: headerColor, cursor:'pointer', fontSize:11, fontWeight:600, letterSpacing:'0.5px' }}>
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>
          <button onClick={toggleDarkMode} aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'} style={{ background: isWorker ? 'rgba(255,255,255,.08)' : 'none', border:'none', borderRadius:8, padding:'6px 10px', color: headerColor, cursor:'pointer', display:'flex', alignItems:'center' }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {onNotifClick && (
            <button onClick={onNotifClick} aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`} style={{ position:'relative', background: isWorker ? 'rgba(255,255,255,.08)' : 'none', border:'none', borderRadius:8, padding:'6px 10px', color: headerColor, cursor:'pointer', display:'flex', alignItems:'center' }}>
              <Bell size={18} />
              {unreadCount > 0 && <span aria-hidden="true" style={{ position:'absolute', top:-3, right:-3, background:'var(--or)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600 }}>{unreadCount}</span>}
            </button>
          )}
          <button onClick={async () => { await logout() }} aria-label="Se deconnecter" style={{ fontSize:12, color: headerColor, background:'none', border:'none', cursor:'pointer', padding:'6px 8px', display:'flex', alignItems:'center', gap:4 }}>
            <LogOut size={14} className="show-mobile" style={{ display:'none' }} />
            <span className="logout-label">Deconnexion</span>
          </button>
        </div>
      </header>

      {/* Worker sub-nav (tabs below header) */}
      {isWorker && (
        <nav role="navigation" aria-label="Navigation principale" className="app-header-nav" style={{ background:'var(--wh)', borderBottom:'1px solid var(--g2)', display:'flex', padding:'0 20px', minWidth:0 }}>
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => onTabChange(key)} aria-current={activeTab === key ? 'page' : undefined} style={{ padding:'13px 12px', border:'none', background:'transparent', fontSize:13, color: activeTab === key ? 'var(--bk)' : 'var(--g4)', fontWeight: activeTab === key ? 500 : 400, borderBottom: activeTab === key ? '2px solid var(--or)' : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>{label}</button>
          ))}
        </nav>
      )}

      {/* Content */}
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  )
}
