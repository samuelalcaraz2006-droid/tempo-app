import React from 'react'
import { T } from './tokens'
import { GridBg, HeadlineA, Eyebrow } from './primitives'

// TopBar Style A — bandeau navy avec eyebrow mono + H1 gros avec accent
// serif italique + actions à droite.
// Usage : <TopBarA subtitle="Dashboard · Amazon" title={<>Bonjour, <em>2 missions</em>.</>} actions={...} />
export default function TopBarA({ subtitle, title, actions, children, size = 'lg' }) {
  return (
    <div style={{
      padding: '28px 48px 32px', background: T.color.navy,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'relative', overflow: 'hidden',
    }}>
      <GridBg opacity={0.2} />
      <div style={{
        position: 'absolute', top: '-50%', right: '-5%', width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {subtitle && (
            <Eyebrow
              color="rgba(255,255,255,0.55)"
              style={{ marginBottom: 14, fontSize: 11, letterSpacing: 1.6 }}
            >{subtitle}</Eyebrow>
          )}
          {title && <HeadlineA size={size} color="#fff">{title}</HeadlineA>}
          {children}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div>
        )}
      </div>
    </div>
  )
}
