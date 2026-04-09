import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function CompanyMessages({ missions, onOpenChat }) {
  const activeMissions = missions.filter(m => m.assigned_worker_id || m.workers)

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Messages</div>
      <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 16 }}>Vos conversations avec les travailleurs</div>

      {activeMissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g4)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12, display: 'flex', justifyContent: 'center' }}><MessageCircle size={32} /></div>
          La messagerie est disponible après avoir accepté un travailleur
        </div>
      ) : (
        activeMissions.map(m => (
          <div key={m.id} className="card-mission is-accepted" style={{ padding: 14, marginBottom: 8, cursor: 'pointer' }}
            onClick={() => onOpenChat(m.assigned_worker_id || m.workers?.id, `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'Travailleur', m.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gr-l)', color: 'var(--gr-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {(m.workers?.first_name || 'T')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{`${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'Travailleur'}</div>
                <div style={{ fontSize: 12, color: 'var(--g4)' }}>{m.title}</div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--g3)' }}>›</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
