import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function WorkerMessages({ allMissions, onOpenChat }) {
  const eligibleApps = allMissions.filter(a => a.status === 'accepted' || a.missions?.status === 'active' || a.missions?.status === 'completed')

  if (eligibleApps.length === 0) {
    return (
      <div>
        <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Messages</div>
        <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Vos conversations avec les entreprises</div>
        <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>
          <div style={{ fontSize:32, marginBottom:12, display:'flex', justifyContent:'center' }}><MessageCircle size={32} /></div>
          La messagerie est disponible apres acceptation d'une candidature
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Messages</div>
      <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Vos conversations avec les entreprises</div>
      {eligibleApps.map(app => {
        const m = app.missions
        return (
          <div key={app.id} className="card-mission is-accepted" style={{ padding:14, marginBottom:8 }}
            onClick={() => onOpenChat(m?.companies?.id || m?.company_id, m?.companies?.name || 'Entreprise', m?.id)}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--bl-l)', color:'#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>
                {(m?.companies?.name || 'E')[0]}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{m?.companies?.name || '—'}</div>
                <div style={{ fontSize:12, color:'var(--g4)' }}>{m?.title || '—'}</div>
              </div>
              <span style={{ fontSize:16, color:'var(--g3)' }}>›</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
