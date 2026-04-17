import React, { useState, useEffect } from 'react'
import { Moon, Sun, Bell, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useI18n } from '../contexts/I18nContext'
import { useDarkMode } from '../hooks/useDarkMode'

export default function DashboardLayout({ role, tabs, activeTab, onTabChange, onLogoClick, children, headerExtra, unreadCount = 0, onNotifClick }) {
  const { logout } = useAuth()
  const { locale, switchLocale } = useI18n()
  const { darkMode, toggleDarkMode } = useDarkMode()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isWorker = role === 'worker'
  const headerBg = isWorker ? 'var(--navy)' : 'var(--wh2)'
  const headerColor = isWorker ? 'rgba(255,255,255,.7)' : 'var(--g4)'
  const headerBorder = isWorker ? 'none' : '1px solid var(--g2)'
  const roleLabel = role === 'worker' ? '' : role === 'company' ? 'Espace Entreprise' : 'Panel Admin'
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const handleTabClick = (key) => {
    onTabChange(key)
    setDrawerOpen(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--wh)', display:'flex', flexDirection:'column' }}>
      {/* Skip to content link (a11y) */}
      <a href="#main-content" style={{ position:'absolute', top:-40, left:0, background:'var(--or)', color:'#fff', padding:'8px 16px', zIndex:200, fontSize:13, fontWeight:600, transition:'top .2s' }} onFocus={e => { e.target.style.top = '0' }} onBlur={e => { e.target.style.top = '-40px' }}>
        Aller au contenu principal
      </a>

      {/* Header */}
      <header role="banner" className="app-header" style={{ background: headerBg, borderBottom: headerBorder, padding:'0 20px', display:'flex', alignItems:'center', height: isWorker ? 54 : 48, position:'sticky', top:0, zIndex:100, gap:8 }}>
        {/* Burger menu (mobile only) */}
        <button
          type="button"
          aria-label="Ouvrir le menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="show-mobile app-burger-btn"
          style={{ display:'none', background:'none', border:'none', color: isWorker ? '#fff' : 'var(--bk)', cursor:'pointer', padding:6, alignItems:'center', justifyContent:'center', flexShrink:0 }}
        >
          <Menu size={20} />
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight: isWorker ? 'auto' : 20, cursor: onLogoClick ? 'pointer' : 'default', flexShrink:0 }} onClick={onLogoClick} role={onLogoClick ? 'button' : undefined} tabIndex={onLogoClick ? 0 : undefined} aria-label={onLogoClick ? 'Retour a l\'accueil' : undefined} onKeyDown={e => { if (onLogoClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onLogoClick() } }}>
          <div style={{ width:24, height:24, background:'var(--or)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }} aria-hidden="true">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
          </div>
          <span style={{ fontWeight:600, letterSpacing: isWorker ? '2px' : '1.5px', fontSize:13, color: isWorker ? '#fff' : 'var(--bk)' }}>TEMPO</span>
          {roleLabel && <span className="app-header-logo-role" style={{ fontSize:12, color: headerColor, borderLeft:'1px solid var(--g2)', paddingLeft:8, marginLeft:4 }}>{roleLabel}</span>}
        </div>

        {headerExtra}

        {!isWorker && (
          <nav role="navigation" aria-label="Navigation principale" className="app-header-nav hide-mobile" style={{ display:'flex', gap:0, marginRight:'auto', minWidth:0 }}>
            {tabs.map(([key, label]) => (
              <button type="button" key={key} onClick={() => onTabChange(key)} aria-current={activeTab === key ? 'page' : undefined} style={{ padding:'0 14px', height: isWorker ? 54 : 48, border:'none', background:'transparent', fontSize:13, color: activeTab === key ? 'var(--bk)' : 'var(--g4)', fontWeight: activeTab === key ? 500 : 400, borderBottom: activeTab === key ? '2px solid var(--or)' : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>{label}</button>
            ))}
          </nav>
        )}

        <div className="app-header-actions" style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0, marginLeft: isWorker ? 0 : 'auto' }} role="toolbar" aria-label="Actions rapides">
          <button type="button" onClick={() => switchLocale(locale === 'fr' ? 'en' : 'fr')} aria-label={locale === 'fr' ? 'Switch to English' : 'Passer en francais'} className="hide-mobile" style={{ background: isWorker ? 'rgba(255,255,255,.08)' : 'none', border: isWorker ? 'none' : '1px solid var(--g2)', borderRadius: isWorker ? 8 : 6, padding: isWorker ? '6px 10px' : '4px 8px', color: headerColor, cursor:'pointer', fontSize:11, fontWeight:600, letterSpacing:'0.5px' }}>
            {locale === 'fr' ? 'EN' : 'FR'}
          </button>
          <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'} className="hide-mobile" style={{ background: isWorker ? 'rgba(255,255,255,.08)' : 'none', border:'none', borderRadius:8, padding:'6px 10px', color: headerColor, cursor:'pointer', display:'flex', alignItems:'center' }}>
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {onNotifClick && (
            <button type="button" onClick={onNotifClick} aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`} style={{ position:'relative', background: isWorker ? 'rgba(255,255,255,.08)' : 'none', border:'none', borderRadius:8, padding:'6px 10px', color: headerColor, cursor:'pointer', display:'flex', alignItems:'center' }}>
              <Bell size={18} />
              {unreadCount > 0 && <span aria-hidden="true" style={{ position:'absolute', top:2, right:2, background:'var(--or)', color:'#fff', borderRadius:'50%', minWidth:14, height:14, padding:'0 3px', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, lineHeight:1 }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          )}
          <button type="button" onClick={async () => { await logout() }} aria-label="Se deconnecter" style={{ fontSize:12, color: headerColor, background:'none', border:'none', cursor:'pointer', padding:'6px 8px', display:'flex', alignItems:'center', gap:4 }}>
            <LogOut size={14} className="show-mobile" style={{ display:'none' }} />
            <span className="logout-label">Deconnexion</span>
          </button>
        </div>
      </header>

      {/* Worker sub-nav (desktop only — mobile uses drawer) */}
      {isWorker && (
        <nav role="navigation" aria-label="Navigation principale" className="app-header-nav hide-mobile" style={{ background:'var(--wh)', borderBottom:'1px solid var(--g2)', display:'flex', padding:'0 20px', minWidth:0 }}>
          {tabs.map(([key, label]) => (
            <button type="button" key={key} onClick={() => onTabChange(key)} aria-current={activeTab === key ? 'page' : undefined} style={{ padding:'13px 12px', border:'none', background:'transparent', fontSize:13, color: activeTab === key ? 'var(--bk)' : 'var(--g4)', fontWeight: activeTab === key ? 500 : 400, borderBottom: activeTab === key ? '2px solid var(--or)' : '2px solid transparent', cursor:'pointer', whiteSpace:'nowrap' }}>{label}</button>
          ))}
        </nav>
      )}

      {/* Drawer menu (mobile) */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:199, animation:'backdropIn .2s ease-out' }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="app-drawer"
            style={{ position:'fixed', top:0, left:0, bottom:0, width:'78%', maxWidth:300, background:'var(--wh2)', zIndex:200, display:'flex', flexDirection:'column', boxShadow:'2px 0 24px rgba(0,0,0,.2)', paddingTop:'env(safe-area-inset-top, 0px)' }}
          >
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--g2)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:24, height:24, background:'var(--or)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }} aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 1L8.5 5L1.5 9Z" fill="white"/></svg>
                </div>
                <span style={{ fontWeight:600, letterSpacing:'2px', fontSize:13, color:'var(--bk)' }}>TEMPO</span>
                {roleLabel && <span style={{ fontSize:11, color:'var(--g4)' }}>{roleLabel}</span>}
              </div>
              <button type="button" aria-label="Fermer le menu" onClick={() => setDrawerOpen(false)} style={{ background:'none', border:'none', color:'var(--g5)', cursor:'pointer', padding:6, display:'flex' }}>
                <X size={20} />
              </button>
            </div>
            <nav role="navigation" aria-label="Sections" style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
              {tabs.map(([key, label]) => {
                const active = activeTab === key
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => handleTabClick(key)}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      display:'flex', alignItems:'center', width:'100%',
                      padding:'14px 20px', border:'none', background: active ? 'var(--brand-l)' : 'transparent',
                      borderLeft: active ? '3px solid var(--brand)' : '3px solid transparent',
                      color: active ? 'var(--brand-d)' : 'var(--bk)',
                      fontSize:15, fontWeight: active ? 600 : 500,
                      cursor:'pointer', textAlign:'left',
                      transition:'background .15s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </nav>
          </aside>
        </>
      )}

      {/* Content */}
      <main id="main-content" role="main">
        {children}
      </main>
    </div>
  )
}
