
import { T } from './tokens'
import { TempoLogoA, Avatar } from './primitives'

// Sidebar Style A — navy 240px avec items actifs en bleu outline.
// items: [{ id, label, icon, badge? }]
// Usage côté wrapper (EntrepriseApp, TravailleurApp, AdminApp) :
//   <SidebarA roleLabel="Entreprise" items={items} active={tab} onNavigate={setTab}
//             userName="Jean D." userSub="Ops · Amazon" />
export default function SidebarA({
  roleLabel = '',
  items = [],
  active,
  onNavigate,
  userName = 'Utilisateur',
  userSub = '',
  onBrandClick,
  footer,
}) {
  return (
    <aside
      className="sidebar-a hide-mobile"
      style={{
        width: 240, background: T.color.navy,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '22px 14px', display: 'flex', flexDirection: 'column',
        gap: 2, color: '#fff', flexShrink: 0,
        position: 'sticky', top: 0, alignSelf: 'flex-start',
        height: '100vh',
      }}
    >
      <button
        type="button"
        onClick={onBrandClick}
        disabled={!onBrandClick}
        style={{
          padding: '0 10px 16px', cursor: onBrandClick ? 'pointer' : 'default',
          background: 'none', border: 'none', textAlign: 'left',
        }}
      >
        <TempoLogoA size={24} />
      </button>

      {roleLabel && (
        <div style={{
          fontSize: 10.5, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.4,
          textTransform: 'uppercase', fontWeight: 700, padding: '14px 10px 10px',
          fontFamily: T.font.mono,
        }}>
          {roleLabel}
        </div>
      )}

      {items.map(({ id, label, icon, badge }) => {
        const isActive = active === id
        return (
          <button
            type="button"
            key={id}
            onClick={() => onNavigate?.(id)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 10,
              background: isActive ? 'rgba(37,99,235,0.18)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(37,99,235,0.3)' : 'transparent'}`,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.68)',
              fontSize: 13.5, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
              transition: 'background .15s, color .15s',
              textAlign: 'left', width: '100%',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.88)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'rgba(255,255,255,0.68)'
              }
            }}
          >
            <span style={{
              width: 18, textAlign: 'center', fontSize: 14,
              opacity: isActive ? 1 : 0.8,
            }}>{icon}</span>
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

      <div style={{ flex: 1 }} />

      {footer}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 10, borderRadius: 10,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <Avatar name={userName} seed={1} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12.5, fontWeight: 700, color: '#fff',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{userName}</div>
          {userSub && (
            <div style={{
              fontSize: 10.5, color: 'rgba(255,255,255,0.5)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{userSub}</div>
          )}
        </div>
      </div>
    </aside>
  )
}
