import React, { useEffect, useRef, useId } from 'react'
import { X } from 'lucide-react'

const SIZE_MAP = {
  sm: 360,
  md: 480,
  lg: 560,
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  closable = true,
  loading = false,
}) {
  const titleId = useId()
  const contentRef = useRef(null)

  // ESC to close
  useEffect(() => {
    if (!open || !closable || loading) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closable, loading, onClose])

  // Focus first focusable on open
  useEffect(() => {
    if (!open || !contentRef.current) return
    const focusable = contentRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    focusable?.focus()
  }, [open])

  // Prevent body scroll
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20,
        animation: 'backdropIn .15s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && closable && !loading) onClose() }}
    >
      <div
        ref={contentRef}
        style={{
          background: 'var(--wh2)',
          borderRadius: 16,
          padding: 28,
          maxWidth: SIZE_MAP[size] || SIZE_MAP.md,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,.2)',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'fadeUp .2s ease-out',
        }}
      >
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div id={titleId} style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
            {closable && !loading && (
              <button
                onClick={onClose}
                aria-label="Fermer"
                style={{ background: 'none', border: 'none', color: 'var(--g4)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
