import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function CompanyMessages({ missions, onOpenChat }) {
  const activeMissions = missions.filter(m => m.assigned_worker_id || m.workers)

  // Grouper par travailleur pour avoir une seule conversation par interlocuteur,
  // meme si le travailleur a ete assigne a plusieurs missions.
  const byWorker = new Map()
  for (const m of activeMissions) {
    const workerId = m.assigned_worker_id || m.workers?.id
    if (!workerId) continue
    const name = `${m.workers?.first_name || ''} ${m.workers?.last_name || ''}`.trim() || 'Travailleur'
    const existing = byWorker.get(workerId)
    if (!existing) {
      byWorker.set(workerId, {
        workerId,
        workerName: name,
        firstInitial: (m.workers?.first_name || 'T')[0],
        latestTitle: m.title,
        count: 1,
      })
    } else {
      existing.count += 1
    }
  }
  const conversations = Array.from(byWorker.values())

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Messages</div>
      <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 16 }}>Vos conversations avec les travailleurs</div>

      {conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g4)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12, display: 'flex', justifyContent: 'center' }}><MessageCircle size={32} /></div>
          La messagerie est disponible après avoir accepté un travailleur
        </div>
      ) : (
        conversations.map(c => (
          <div
            key={c.workerId}
            className="card-mission is-accepted"
            style={{ padding: 14, marginBottom: 8, cursor: 'pointer' }}
            onClick={() => onOpenChat(c.workerId, c.workerName, null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gr-l)', color: 'var(--gr-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {c.firstInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.workerName}</div>
                <div style={{ fontSize: 12, color: 'var(--g4)' }}>
                  {c.count > 1 ? `${c.count} missions` : (c.latestTitle || 'Mission')}
                </div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--g3)' }}>›</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
