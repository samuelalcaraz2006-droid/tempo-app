import React, { useState } from 'react'
import { formatDate } from '../../lib/formatters'
import { markNotifsRead } from '../../lib/supabase'

export default function WorkerNotifications({ notifs, setNotifs, userId, unreadCount, onBack }) {
  const [notifFilter, setNotifFilter] = useState('tous')

  let filtered = notifs
  if (notifFilter === 'unread') filtered = notifs.filter(n => !n.read_at)
  else if (notifFilter !== 'tous') filtered = notifs.filter(n => n.type === notifFilter)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <div style={{ fontSize:18, fontWeight:600 }}>Notifications</div>
        <button onClick={onBack} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        {unreadCount > 0 && (
          <button onClick={async () => { await markNotifsRead(userId); setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))) }}
            style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--g2)', background:'var(--wh)', color:'var(--g6)', fontSize:12, cursor:'pointer' }}>
            ✓ Tout marquer comme lu ({unreadCount})
          </button>
        )}
        <select className="input" value={notifFilter} onChange={e => setNotifFilter(e.target.value)}
          style={{ width:'auto', padding:'5px 10px', fontSize:12 }}>
          <option value="tous">Toutes</option>
          <option value="unread">Non lues</option>
          <option value="new_mission">Nouvelles missions</option>
          <option value="application_accepted">Acceptations</option>
          <option value="application_rejected">Refus</option>
          <option value="payment_received">Paiements</option>
          <option value="rating_received">Evaluations</option>
        </select>
      </div>

      {filtered.length === 0
        ? <div style={{ textAlign:'center', padding:'40px', color:'var(--g4)', fontSize:13 }}>Aucune notification</div>
        : filtered.map(n => (
          <div key={n.id} className="card" style={{ padding:'12px 16px', marginBottom:8, borderLeft: !n.read_at ? '3px solid var(--or)' : '3px solid transparent' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ fontSize:13, color: n.read_at ? 'var(--g4)' : 'var(--bk)', fontWeight: n.read_at ? 400 : 500 }}>{n.title}</div>
              {!n.read_at && <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--or)', flexShrink:0, marginTop:5 }}></span>}
            </div>
            {n.body && <div style={{ fontSize:12, color:'var(--g4)', marginTop:2 }}>{n.body}</div>}
            <div style={{ fontSize:11, color:'var(--g4)', marginTop:4 }}>{formatDate(n.created_at)}</div>
          </div>
        ))
      }
    </div>
  )
}
