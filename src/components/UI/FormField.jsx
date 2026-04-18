

export default function FormField({
  label,
  error,
  required,
  hint,
  children,
  style,
}) {
  return (
    <div style={style}>
      {label && (
        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {required && <span style={{ color: 'var(--rd)', fontWeight: 600 }}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <div style={{ fontSize: 12, color: 'var(--rd)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5.5" stroke="currentColor" /><path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
          {error}
        </div>
      )}
      {hint && !error && (
        <div style={{ fontSize: 12, color: 'var(--g4)', marginTop: 4 }}>{hint}</div>
      )}
    </div>
  )
}
