import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function WorkerMessages({ allMissions, onOpenChat }) {
  const eligibleApps = allMissions.filter(a => a.status === 'accepted' || a.missions?.status === 'active' || a.missions?.status === 'completed')

  // Grouper par entreprise (pas par mission) pour n'avoir qu'une conversation
  // par interlocuteur, meme si Lea a plusieurs missions chez Logistec.
  const byCompany = new Map()
  for (const app of eligibleApps) {
    const m = app.missions
    const companyId = m?.companies?.id || m?.company_id
    if (!companyId) continue
    const existing = byCompany.get(companyId)
    if (!existing) {
      byCompany.set(companyId, {
        companyId,
        companyName: m?.companies?.name || 'Entreprise',
        latestTitle: m?.title,
        count: 1,
      })
    } else {
      existing.count += 1
    }
  }
  const conversations = Array.from(byCompany.values())

  if (conversations.length === 0) {
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
      {conversations.map(c => (
        <div
          key={c.companyId}
          className="card-mission is-accepted"
          style={{ padding:14, marginBottom:8, cursor:'pointer' }}
          onClick={() => onOpenChat(c.companyId, c.companyName, null)}
        >
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--bl-l)', color:'#1D4ED8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>
              {(c.companyName || 'E')[0]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{c.companyName}</div>
              <div style={{ fontSize:12, color:'var(--g4)' }}>
                {c.count > 1 ? `${c.count} missions` : (c.latestTitle || 'Mission')}
              </div>
            </div>
            <span style={{ fontSize:16, color:'var(--g3)' }}>›</span>
          </div>
        </div>
      ))}
    </div>
  )
}
