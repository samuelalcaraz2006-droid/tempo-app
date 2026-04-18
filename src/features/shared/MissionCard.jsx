
import { Heart } from 'lucide-react'
import { formatDate } from '../../lib/formatters'

export default function MissionCard({ mission, applied, saved, applying, onApply, onToggleSave, onSelect, onViewCompany }) {
  const companyId = mission.company_id || mission.companies?.id
  return (
    <div
      className={`card-mission${(mission.urgency === 'urgent' || mission.urgency === 'immediate') ? ' is-urgent' : ''}`}
      style={{ marginBottom:10 }}
      onClick={() => onSelect?.(mission)}
    >
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ flex:1, minWidth:0, marginRight:10 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{mission.title}</div>
          <div style={{ fontSize:12, color:'var(--g4)' }}>
            {onViewCompany && companyId && mission.companies?.name ? (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onViewCompany(companyId, mission.companies) }}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--brand)', fontWeight: 600, fontSize: 'inherit', fontFamily: 'inherit',
                  textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: 'rgba(37,99,235,.3)',
                }}
              >{mission.companies.name}</button>
            ) : (
              <span>{mission.companies?.name || '—'}</span>
            )}
            {' · '}{mission.city}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'flex-start', gap:6, flexShrink:0 }}>
          {onToggleSave && (
            <button type="button"
              onClick={e => { e.stopPropagation(); onToggleSave(mission.id) }}
              aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
              style={{ background:'none', border:'none', cursor:'pointer', color: saved ? 'var(--or)' : 'var(--g3)', padding:0, lineHeight:1, transition:'color .15s', display:'flex', alignItems:'center' }}
              title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart size={16} style={{ fill: saved ? 'currentColor' : 'none' }} />
            </button>
          )}
          {mission.matchScore != null && <span className="score-badge">{mission.matchScore}%</span>}
        </div>
      </div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:10 }}>
        {(mission.required_skills || []).slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
        {(mission.urgency === 'urgent' || mission.urgency === 'immediate') && <span className="badge badge-orange" style={{ fontSize:11 }}>Urgent</span>}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:14, fontWeight:600 }}>
          {mission.hourly_rate}€/h{' '}
          <span style={{ fontSize:12, color:'var(--g4)', fontWeight:400 }}>
            · {formatDate(mission.start_date)} {mission.total_hours ? `· ${mission.total_hours}h` : ''}
          </span>
        </span>
        {onApply && (
          <button type="button"
            className={applied ? 'btn-secondary' : 'btn-primary'}
            style={{ padding:'6px 14px', fontSize:12 }}
            onClick={e => { e.stopPropagation(); onApply(mission) }}
            disabled={applied || applying}
          >
            {applying ? '...' : applied ? '✓ Postulé' : 'Postuler'}
          </button>
        )}
      </div>
    </div>
  )
}
