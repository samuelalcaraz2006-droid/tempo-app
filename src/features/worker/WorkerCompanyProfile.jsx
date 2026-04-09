import React from 'react'
import { formatDate } from '../../lib/formatters'

export default function WorkerCompanyProfile({ company, companyMissions, missions, onBack, onSelectMission }) {
  if (!company) return null

  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16 }}>‹ Retour</button>
      <div className="card" style={{ padding:20, marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'var(--or)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:600 }}>
            {(company.name || '?')[0]}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>{company.name}</div>
            <div style={{ fontSize:13, color:'var(--g4)' }}>{company.city || 'France'}</div>
            {company.rating_avg > 0 && (
              <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ color:'var(--am)', fontSize:12 }}>{'★'.repeat(Math.round(company.rating_avg))}{'☆'.repeat(5 - Math.round(company.rating_avg))}</span>
                <span style={{ fontSize:12, color:'var(--g4)' }}>{parseFloat(company.rating_avg).toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize:15, fontWeight:600, marginBottom:10 }}>Missions ouvertes</div>
      {companyMissions.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'var(--g4)', fontSize:13 }}>Aucune mission ouverte</div>
      ) : companyMissions.map(m => (
        <div key={m.id} className="card-mission" style={{ padding:14, marginBottom:8 }}
          onClick={() => onSelectMission(missions.find(fm => fm.id === m.id) || m)}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>{m.title}</div>
          <div style={{ fontSize:12, color:'var(--g4)' }}>{m.city} · {m.hourly_rate}€/h · {formatDate(m.start_date)}</div>
        </div>
      ))}
    </div>
  )
}
