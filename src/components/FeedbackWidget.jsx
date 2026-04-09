import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'

export default function FeedbackWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!user) return null

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setSending(true)
    await supabase.from('beta_feedback').insert({
      user_id: user.id,
      page: window.location.pathname,
      comment: comment.trim(),
      rating: rating || null,
    })
    setSending(false)
    setSent(true)
    setTimeout(() => { setSent(false); setOpen(false); setComment(''); setRating(0) }, 2000)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Donner un feedback"
        style={{ position:'fixed', bottom:20, right:20, zIndex:1500, width:48, height:48, borderRadius:'50%', background:'var(--brand, #2563EB)', color:'#fff', border:'none', cursor:'pointer', boxShadow:'0 4px 16px rgba(0,0,0,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, transition:'transform .15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Feedback panel */}
      {open && (
        <div style={{ position:'fixed', bottom:80, right:20, zIndex:1500, width:320, background:'var(--wh, #fff)', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,.15)', padding:20, border:'1px solid var(--g2, #e5e5e5)' }}>
          {sent ? (
            <div style={{ textAlign:'center', padding:20 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
              <div style={{ fontSize:14, fontWeight:600 }}>Merci pour votre retour !</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Votre avis compte</div>
              <div style={{ fontSize:12, color:'var(--g4, #999)', marginBottom:12 }}>Aidez-nous a ameliorer TEMPO</div>

              {/* Star rating */}
              <div style={{ display:'flex', gap:4, marginBottom:12 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(n)} aria-label={`${n} etoile${n > 1 ? 's' : ''}`}
                    style={{ background:'none', border:'none', cursor:'pointer', fontSize:24, color: n <= rating ? '#F59E0B' : 'var(--g3, #ddd)', transition:'color .1s', padding:0 }}>
                    {n <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>

              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Qu'est-ce qui pourrait etre ameliore ?"
                style={{ width:'100%', minHeight:80, padding:'8px 12px', borderRadius:8, border:'1px solid var(--g2, #e5e5e5)', fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
              />
              <button
                onClick={handleSubmit}
                disabled={!comment.trim() || sending}
                style={{ width:'100%', marginTop:10, padding:'10px', background:'var(--brand, #2563EB)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor: comment.trim() && !sending ? 'pointer' : 'not-allowed', opacity: comment.trim() && !sending ? 1 : 0.5 }}
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
