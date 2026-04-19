import { T } from '../../design/tokens'

// ════════════════════════════════════════════════════════════════
// LoadingState — composant partagé pour les états de chargement.
//
// Remplace les 6 variations ad hoc trouvées dans l'app :
//  « Chargement… », « Chargement... », « Chargement du profil… »,
//  « Chargement de la carte... », etc.
//
// Usage :
//   <LoadingState />                                → "Chargement…"
//   <LoadingState label="Chargement des candidats" />
//   <LoadingState compact />                        → inline, taille réduite
//   <LoadingState fullscreen />                     → plein écran (Suspense)
// ════════════════════════════════════════════════════════════════

export default function LoadingState({
  label = 'Chargement',
  compact = false,
  fullscreen = false,
  inline = false,
}) {
  const text = label.endsWith('…') ? label : `${label}…`

  if (fullscreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column', gap: 16,
          background: 'var(--wh)',
        }}
      >
        <Spinner />
        <div style={{ fontSize: T.size.sm, color: T.color.g5 }}>{text}</div>
      </div>
    )
  }

  if (inline) {
    return (
      <span role="status" aria-live="polite" aria-busy="true"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.color.g5, fontSize: T.size.sm }}>
        <Spinner size={14} /> {text}
      </span>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        padding: compact ? '20px 14px' : '60px 20px',
        textAlign: 'center', color: T.color.g5,
        fontSize: compact ? T.size.xs + 1 : T.size.base,
      }}
    >
      {text}
    </div>
  )
}

// Petit spinner circulaire animé.
function Spinner({ size = 20 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `2.5px solid ${T.color.g2}`,
        borderTopColor: T.color.brand,
        display: 'inline-block',
        animation: 'tempo-spin .7s linear infinite',
      }}
    />
  )
}
