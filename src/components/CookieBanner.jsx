import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('tempo_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  if (!visible) return null

  const accept = () => {
    localStorage.setItem('tempo_cookie_consent', JSON.stringify({ accepted: true, date: new Date().toISOString(), version: '1.0' }))
    setVisible(false)
  }

  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:2000, background:'var(--navy)', color:'#fff', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', fontSize:13, boxShadow:'0 -4px 20px rgba(0,0,0,.2)' }}>
      <div style={{ flex:1, minWidth:250, lineHeight:1.5 }}>
        TEMPO utilise uniquement des <strong>cookies strictement necessaires</strong> au fonctionnement du service (authentification, preferences). Aucun cookie publicitaire ou tracker tiers.{' '}
        <a href="/legal" style={{ color:'var(--or)', textDecoration:'underline' }}>En savoir plus</a>
      </div>
      <button onClick={accept} style={{ background:'var(--or)', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
        Compris
      </button>
    </div>
  )
}
