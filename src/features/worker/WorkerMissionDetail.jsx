import React from 'react'
import { Heart } from 'lucide-react'
import { formatDate } from '../../lib/formatters'

export default function WorkerMissionDetail({ mission, hasApplied, applying, onApply, onBack, isSaved, onToggleSave, onViewCompany }) {
  if (!mission) return null

  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16 }}>‹ Retour</button>
      <div className="card" style={{ padding:20, marginBottom:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:6 }}>{mission.title}</div>
          <button onClick={() => onToggleSave(mission.id)}
            aria-label={isSaved ? 'Retirer des favoris' : 'Sauvegarder'}
            style={{ background:'none', border:'none', cursor:'pointer', color: isSaved ? 'var(--or)' : 'var(--g3)', padding:0, lineHeight:1, flexShrink:0, display:'flex', alignItems:'center' }}>
            <Heart size={16} style={{ fill: isSaved ? 'currentColor' : 'none' }} />
          </button>
        </div>
        <div style={{ fontSize:13, color:'var(--g4)', marginBottom:14 }}>
          <span style={{ cursor:'pointer', color:'var(--or)', fontWeight:500 }}
            onClick={() => onViewCompany(mission.company_id, mission.companies)}>
            {mission.companies?.name}
          </span>
          {' · '}{mission.city}
        </div>
        {mission.description && <div style={{ fontSize:13, color:'var(--g6)', lineHeight:1.6, marginBottom:14, padding:'10px 12px', background:'var(--wh)', borderRadius:8 }}>{mission.description}</div>}
        <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
          {(mission.required_skills || []).map(t => <span key={t} className="tag">{t}</span>)}
          {(mission.required_certs || []).map(t => <span key={t} className="tag" style={{ background:'var(--bl-l)', color:'var(--bl-d)', borderColor:'#BFDBFE' }}>{t}</span>)}
        </div>
        {[
          ['Taux horaire', `${mission.hourly_rate} €/h`],
          ['Duree', mission.total_hours ? `${mission.total_hours}h` : 'A definir'],
          ['Debut', formatDate(mission.start_date)],
          ['Lieu', mission.city],
          ['Net estime', mission.total_hours ? `~${Math.round(mission.hourly_rate * mission.total_hours * 0.78)} €` : '—'],
        ].map(([l, v]) => (
          <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--g1)', fontSize:14 }}>
            <span style={{ color:'var(--g4)' }}>{l}</span>
            <span style={{ fontWeight: l.includes('Net') ? 600 : 500, color: l.includes('Net') ? 'var(--or)' : 'var(--bk)' }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--gr-d)' }}>
        ✓ Contrat auto-genere par TEMPO · Signature electronique incluse
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button className="btn-secondary" style={{ flex:1 }} onClick={onBack}>Retour</button>
        <button className="btn-primary" style={{ flex:2 }} disabled={hasApplied || applying} onClick={() => onApply(mission, hasApplied)}>
          {applying ? 'Envoi...' : hasApplied ? '✓ Candidature envoyee' : 'Postuler →'}
        </button>
      </div>
    </div>
  )
}
