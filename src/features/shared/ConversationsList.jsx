import React from 'react'
import { MessageCircle } from 'lucide-react'

export default function ConversationsList({ conversations, onOpenChat, emptyMessage }) {
  if (conversations.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--g4)' }}>
        <div style={{ fontSize:32, marginBottom:12, display:'flex', justifyContent:'center' }}><MessageCircle size={32} /></div>
        <div style={{ fontSize:14, fontWeight:500 }}>{emptyMessage || 'Aucune conversation'}</div>
        <div style={{ fontSize:13, marginTop:4 }}>Les messages apparaissent ici quand vous communiquez avec vos contacts</div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {conversations.map(conv => (
        <div
          key={conv.id || `${conv.partnerId}-${conv.missionId}`}
          className="card"
          style={{ padding:'12px 16px', cursor:'pointer' }}
          onClick={() => onOpenChat(conv.partnerId, conv.partnerName, conv.missionId)}
        >
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>{conv.partnerName}</div>
              <div style={{ fontSize:12, color:'var(--g4)' }}>{conv.missionTitle || 'Mission'}</div>
              {conv.lastMessage && (
                <div style={{ fontSize:12, color:'var(--g4)', marginTop:2 }}>{conv.lastMessage.slice(0, 60)}{conv.lastMessage.length > 60 ? '...' : ''}</div>
              )}
            </div>
            {conv.unread && (
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--or)', flexShrink:0 }}></span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
