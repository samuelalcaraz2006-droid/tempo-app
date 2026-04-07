import React, { useEffect, useId } from 'react'
import { STAR_LABELS } from '../lib/formatters'

export default function RatingModal({ rateeName, onSubmit, onClose, loading }) {
  const [score, setScore] = React.useState(0)
  const [hover, setHover] = React.useState(0)
  const [comment, setComment] = React.useState('')
  const titleId = useId()

  // Fermeture par Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
    >
      <div style={{ background:'var(--wh)', borderRadius:16, padding:28, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div id={titleId} style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Évaluer la mission</div>
        <div style={{ fontSize:13, color:'var(--g4)', marginBottom:24 }}>Comment s'est passée la collaboration avec <strong>{rateeName}</strong> ?</div>
        <div role="group" aria-label="Note de 1 à 5 étoiles" style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:8 }}>
          {[1,2,3,4,5].map(i => (
            <button
              key={i}
              aria-label={`${i} étoile${i > 1 ? 's' : ''} — ${STAR_LABELS[i]}`}
              aria-pressed={score === i}
              onClick={() => setScore(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              style={{ fontSize:40, background:'none', border:'none', cursor:'pointer', color: i <= (hover || score) ? 'var(--am)' : 'var(--g2)', transition:'color .1s', padding:0, lineHeight:1 }}
            >
              ★
            </button>
          ))}
        </div>
        {(hover || score) > 0 && (
          <div style={{ textAlign:'center', fontSize:13, color:'var(--or)', fontWeight:500, marginBottom:16, minHeight:20 }}>
            {STAR_LABELS[hover || score]}
          </div>
        )}
        <textarea
          className="input"
          rows={3}
          style={{ resize:'none', marginBottom:16 }}
          placeholder="Commentaire optionnel..."
          aria-label="Commentaire optionnel"
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={onClose} disabled={loading}>Plus tard</button>
          <button
            className="btn-primary"
            style={{ flex:2, justifyContent:'center' }}
            disabled={!score || loading}
            aria-disabled={!score || loading}
            title={!score ? 'Sélectionnez une note avant d\'envoyer' : undefined}
            onClick={() => onSubmit(score, comment)}
          >
            {loading ? 'Envoi...' : 'Envoyer l\'évaluation'}
          </button>
        </div>
      </div>
    </div>
  )
}
