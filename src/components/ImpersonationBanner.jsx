import { useAuth } from '../contexts/useAuth'

export default function ImpersonationBanner() {
  const { realProfile, viewAs, isImpersonating, resetView } = useAuth()

  if (realProfile?.role !== 'admin') return null
  if (viewAs === null) return null

  let label = 'Admin'
  let icon = '🛡️'
  if (isImpersonating) {
    const v = viewAs
    const name = v.role === 'travailleur'
      ? [v.profile?.first_name, v.profile?.last_name].filter(Boolean).join(' ') || v.profile?.email
      : v.roleData?.name || v.profile?.email
    label = `${v.role === 'travailleur' ? 'Travailleur' : 'Entreprise'} · ${name || '—'}`
    icon = v.role === 'travailleur' ? '👷' : '🏢'
  }

  return (
    <button
      type="button"
      onClick={resetView}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '8px 20px',
        background: 'linear-gradient(90deg, rgba(37,99,235,.20), rgba(37,99,235,.10))',
        border: 'none',
        borderBottom: '1px solid rgba(37,99,235,.45)',
        color: 'var(--brand-xl, #60A5FA)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '.3px',
        cursor: 'pointer',
        userSelect: 'none',
        backdropFilter: 'blur(10px)',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 14 }}>⚡</span>
      <span>GOD MODE ·</span>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{
        flex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {label}
      </span>
      <span style={{ opacity: .85 }}>Changer</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Changer de vue">
        <title>Changer de vue</title>
        <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l-4-4M17 20l4-4"/>
      </svg>
    </button>
  )
}
