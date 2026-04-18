
import { CheckCircle, XCircle, X } from 'lucide-react'

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null

  const isError = toast.type === 'error'

  return (
    <div
      className="toast"
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: isError ? 'var(--rd)' : 'var(--gr)',
        color: '#fff', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,.18)',
        maxWidth: 380, fontSize: 13, fontWeight: 500,
        lineHeight: 1.4,
      }}
    >
      {isError ? <XCircle size={18} style={{ flexShrink: 0 }} /> : <CheckCircle size={18} style={{ flexShrink: 0 }} />}
      <span style={{ flex: 1 }}>{toast.msg}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Fermer la notification"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 2, display: 'flex', opacity: 0.7 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
