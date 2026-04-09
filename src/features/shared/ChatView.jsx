import React from 'react'

export default function ChatView({ chatMessages, chatPartner, chatInput, setChatInput, sendingMsg, onSend, onBack, userId }) {
  const messagesEndRef = React.useRef(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--g4)' }}>‹ Retour</button>
        <div style={{ fontSize:15, fontWeight:600 }}>{chatPartner?.name || 'Conversation'}</div>
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ height:400, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:8 }}>
          {chatMessages.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px 20px', color:'var(--g4)', fontSize:13 }}>
              Aucun message — commencez la conversation
            </div>
          ) : (
            chatMessages.map((msg, i) => {
              const isMine = msg.sender_id === userId
              return (
                <div key={msg.id || i} style={{ display:'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth:'75%',
                    padding:'8px 14px',
                    borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMine ? 'var(--or)' : 'var(--g1)',
                    color: isMine ? '#fff' : 'var(--bk)',
                    fontSize:13,
                    lineHeight:1.5,
                  }}>
                    {msg.content}
                    <div style={{ fontSize:10, marginTop:4, opacity:0.6, textAlign:'right' }}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ borderTop:'1px solid var(--g2)', padding:12, display:'flex', gap:8 }}>
          <input
            className="input"
            style={{ flex:1 }}
            placeholder="Votre message..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }}
          />
          <button className="btn-primary" style={{ padding:'8px 16px', fontSize:13 }} onClick={onSend} disabled={sendingMsg || !chatInput.trim()}>
            {sendingMsg ? '...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}
