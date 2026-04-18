import React from 'react'
import { T } from './tokens'

// ═══════════════════════════════════════════════════════════════
// Style A — Primitives réutilisables sur toutes les pages.
// Direction : éditorial, navy + blue, accents serif italiques,
// mono sur les eyebrows/metrics, souffle généreux.
// ═══════════════════════════════════════════════════════════════

// Logo avec point centré et wordmark tracking — version compacte
export function TempoLogoA({ size = 28, dark = true }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: size, height: size, background: T.color.brand,
        borderRadius: size * 0.26, display: 'grid', placeItems: 'center',
        boxShadow: '0 0 14px rgba(37,99,235,.5)', flexShrink: 0,
      }}>
        <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 13 13">
          <path d="M2 1.5L11 6.5L2 11.5Z" fill="#fff" />
        </svg>
      </div>
      <span style={{
        fontWeight: 800, letterSpacing: size * 0.08, fontSize: size * 0.48,
        color: dark ? '#fff' : T.color.ink, fontFamily: T.font.body,
      }}>TEMPO</span>
    </div>
  )
}

// Avatar avec gradient déterministe (seed)
export function Avatar({ name = 'AB', size = 36, seed = 0, ring = false, ringColor }) {
  const palettes = [
    ['#60A5FA', '#2563EB'], ['#6366F1', '#4F46E5'], ['#06B6D4', '#0891B2'],
    ['#8B5CF6', '#6D28D9'], ['#10B981', '#059669'], ['#F59E0B', '#D97706'],
  ]
  const [a, b] = palettes[seed % palettes.length]
  const initials = String(name).split(' ').map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${a}, ${b})`,
      color: '#fff', fontFamily: T.font.body, fontWeight: 700,
      fontSize: size * 0.36, letterSpacing: 0.4,
      display: 'grid', placeItems: 'center', flexShrink: 0,
      boxShadow: ring ? `0 0 0 3px ${ringColor || '#fff'}` : 'none',
    }}>{initials || '·'}</div>
  )
}

export function AvatarStack({ names = [], size = 28, ringColor = '#fff' }) {
  return (
    <div style={{ display: 'flex' }}>
      {names.map((n, i) => (
        <div key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.32 }}>
          <Avatar name={n} size={size} seed={i + 1} ring ringColor={ringColor} />
        </div>
      ))}
    </div>
  )
}

// Point animé pulsant — pour signaler du temps réel
export function LiveDot({ color, size = 8 }) {
  const c = color || T.color.green
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: c,
        opacity: 0.4, animation: 'livePulse 1.8s ease-out infinite',
      }} />
      <span style={{
        position: 'absolute', inset: size * 0.2, borderRadius: '50%', background: c,
      }} />
    </span>
  )
}

// Pill standard — 7 variants, 3 tailles
export function Pill({ children, variant = 'brand', size = 'sm', icon, style }) {
  const V = {
    brand:   { bg: T.color.brandL, fg: T.color.brandD, bd: 'rgba(37,99,235,.15)' },
    white:   { bg: 'rgba(255,255,255,.08)', fg: '#fff', bd: 'rgba(255,255,255,.15)' },
    dark:    { bg: T.color.ink, fg: '#fff', bd: 'transparent' },
    green:   { bg: T.color.greenL, fg: T.color.greenD, bd: 'transparent' },
    amber:   { bg: T.color.amberL, fg: '#92400E', bd: 'transparent' },
    red:     { bg: T.color.redL, fg: '#B91C1C', bd: 'transparent' },
    neutral: { bg: T.color.g1, fg: T.color.g5, bd: T.color.g2 },
    outline: { bg: 'transparent', fg: T.color.ink, bd: T.color.g3 },
  }[variant] || { bg: T.color.g1, fg: T.color.g5, bd: T.color.g2 }
  const S = { xs: { p: '3px 8px', fs: 10 }, sm: { p: '5px 12px', fs: 11 }, md: { p: '7px 14px', fs: 12 } }[size]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: S.p, fontSize: S.fs, fontWeight: 700, fontFamily: T.font.body,
      background: V.bg, color: V.fg, border: `1px solid ${V.bd}`,
      borderRadius: T.radius.pill, letterSpacing: 0.3, whiteSpace: 'nowrap',
      textTransform: 'uppercase',
      ...style,
    }}>{icon}{children}</span>
  )
}

// Grille subtile pour fond sombre éditorial
export function GridBg({ opacity = 0.28, size = 56 }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, opacity, pointerEvents: 'none',
      backgroundImage: `linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)`,
      backgroundSize: `${size}px ${size}px`,
    }} />
  )
}

// Eyebrow mono uppercase — signature du style A
export function Eyebrow({ children, style, color }) {
  return (
    <div style={{
      fontFamily: T.font.mono, fontSize: 10.5,
      color: color || T.color.g5, letterSpacing: 1.4,
      textTransform: 'uppercase', fontWeight: 600,
      ...style,
    }}>{children}</div>
  )
}

// H1 / H2 avec accent serif italique sur un ou plusieurs mots.
// Usage : <HeadlineA>Bonjour, <em>2 missions</em> en cours.</HeadlineA>
// Le <em> est automatiquement stylé.
export function HeadlineA({ children, size = 'lg', color, style }) {
  const sizes = {
    xl: { fs: 64, lh: 0.98, tr: '-0.035em' },
    lg: { fs: 36, lh: 1.02, tr: '-0.025em' },
    md: { fs: 24, lh: 1.15, tr: '-0.02em' },
  }
  const s = sizes[size] || sizes.lg
  return (
    <h1 style={{
      margin: 0, fontSize: s.fs, fontWeight: 800, lineHeight: s.lh,
      color: color || '#fff', letterSpacing: s.tr, fontFamily: T.font.body,
      ...style,
    }}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === 'em') {
          return React.cloneElement(child, {
            style: {
              fontFamily: T.font.serif, fontStyle: 'italic',
              fontWeight: 400, color: T.color.brandXL, ...child.props.style,
            },
          })
        }
        return child
      })}
    </h1>
  )
}

// KPI card — pattern standard Style A
export function KpiCard({ label, value, sub, accentColor }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.color.g2}`,
      borderRadius: T.radius.lg, padding: 22, boxShadow: T.shadow.soft,
      position: 'relative', overflow: 'hidden',
    }}>
      <Eyebrow>{label}</Eyebrow>
      <div style={{
        marginTop: 14, fontSize: 34, fontWeight: 800,
        color: accentColor || T.color.ink, letterSpacing: '-0.02em',
        fontFamily: T.font.body, lineHeight: 1,
      }}>{value}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 11.5, color: T.color.g5 }}>{sub}</div>}
    </div>
  )
}
