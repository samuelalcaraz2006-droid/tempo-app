
import { Search } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Search,
  title = 'Aucun resultat',
  description,
  action,
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--g4)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--g1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={26} color="var(--g4)" />
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--bk)', marginBottom: 6 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: action ? 20 : 0, lineHeight: 1.5, maxWidth: 320, margin: '0 auto' }}>{description}</div>}
      {action && (
        <button className="btn-primary" onClick={action.onClick} style={{ marginTop: 20 }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
