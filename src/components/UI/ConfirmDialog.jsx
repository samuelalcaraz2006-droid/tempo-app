import { useEffect, useRef } from 'react'
import { T } from '../../design/tokens'

// ═══════════════════════════════════════════════════════════════
// ConfirmDialog — remplace `window.confirm()` avec un modal stylé,
// a11y (role=alertdialog, focus trap basique, ESC ferme), cohérent
// avec le design system.
//
// Usage :
//   const [confirm, setConfirm] = useState(null)
//   <ConfirmDialog
//     open={!!confirm}
//     title="Supprimer cette saisie ?"
//     description="Cette action est définitive."
//     confirmLabel="Supprimer"
//     danger
//     onConfirm={() => { action(); setConfirm(null) }}
//     onCancel={() => setConfirm(null)}
//   />
// ═══════════════════════════════════════════════════════════════

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)

  // ESC ferme. Focus auto sur le bouton de confirmation à l'ouverture.
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape' && !loading) onCancel?.()
    }
    window.addEventListener('keydown', handleKey)
    // Focus après rendu pour que le screen reader annonce le dialog
    // avant de déplacer le focus.
    const t = setTimeout(() => { confirmRef.current?.focus() }, 50)
    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(t)
    }
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-desc' : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: T.z.modal,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: T.space[5],
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel?.() }}
    >
      <div
        className="a-card"
        style={{ maxWidth: 420, width: '100%', padding: T.space[6] }}
      >
        <h2
          id="confirm-dialog-title"
          style={{
            margin: 0, fontSize: T.size.lg, fontWeight: 700,
            color: T.color.ink, letterSpacing: '-0.015em', lineHeight: 1.3,
            marginBottom: description ? T.space[2] : T.space[4],
          }}
        >{title}</h2>
        {description && (
          <p
            id="confirm-dialog-desc"
            style={{
              margin: 0, fontSize: T.size.base, color: T.color.g5,
              lineHeight: 1.5, marginBottom: T.space[4],
            }}
          >{description}</p>
        )}
        <div style={{
          display: 'flex', gap: T.space[2], justifyContent: 'flex-end',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            className="a-btn-outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="a-btn-primary"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading ? 'true' : undefined}
            style={danger ? {
              background: T.color.red,
              boxShadow: '0 10px 24px rgba(239,68,68,.28)',
            } : undefined}
          >
            {loading ? 'Traitement…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
