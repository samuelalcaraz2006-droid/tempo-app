import React from 'react'

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin .6s linear infinite' }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity=".25" />
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const SIZE_MAP = {
  sm: { padding: '5px 12px', fontSize: 12, gap: 6 },
  md: { padding: '10px 22px', fontSize: 14, gap: 8 },
  lg: { padding: '12px 28px', fontSize: 15, gap: 8 },
}

const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  dark: 'btn-dark',
  inline: 'btn-inline',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  children,
  className = '',
  style,
  ...props
}) {
  const sizeStyle = SIZE_MAP[size] || SIZE_MAP.md
  const cls = VARIANT_CLASS[variant] || 'btn-primary'

  return (
    <button
      className={`${cls} ${className}`}
      disabled={disabled || loading}
      style={{
        ...sizeStyle,
        width: fullWidth ? '100%' : undefined,
        justifyContent: fullWidth ? 'center' : undefined,
        ...style,
      }}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}
