

export default function WorkerCalendar({ blockedDays, setBlockedDays, onBack }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const monthName = today.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const cells = []
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const toggleDay = (dateStr) => {
    setBlockedDays(prev => {
      const next = prev.includes(dateStr) ? prev.filter(x => x !== dateStr) : [...prev, dateStr]
      localStorage.setItem('tempo_blocked_days', JSON.stringify(next))
      return next
    })
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:18, fontWeight:600 }}>Calendrier de disponibilite</div>
        <button onClick={onBack} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
      </div>
      <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16 }}>Cliquez sur un jour pour le bloquer/debloquer.</div>
      <div className="card" style={{ padding:16 }}>
        <div style={{ fontSize:15, fontWeight:600, textAlign:'center', marginBottom:12, textTransform:'capitalize' }}>{monthName}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} style={{ textAlign:'center', fontSize:11, color:'var(--g4)', fontWeight:500, padding:4 }}>{d}</div>)}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`}></div>
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const isBlocked = blockedDays.includes(dateStr)
            const isPast = d < today.getDate()
            const isToday = d === today.getDate()
            return (
              <button key={d} onClick={() => !isPast && toggleDay(dateStr)}
                style={{ padding:8, borderRadius:8, border: isToday ? '2px solid var(--or)' : '1px solid var(--g2)', background: isBlocked ? 'var(--rd)' : isPast ? 'var(--g1)' : 'var(--wh)', color: isBlocked ? '#fff' : isPast ? 'var(--g3)' : 'var(--bk)', fontSize:13, fontWeight: isToday ? 600 : 400, cursor: isPast ? 'default' : 'pointer', textAlign:'center' }}>
                {d}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--g4)', marginTop:8 }}>
          <span>⬜ Disponible</span>
          <span style={{ color:'var(--rd)' }}>🟥 Bloque</span>
          <span>{blockedDays.filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} jour(s) bloque(s)</span>
        </div>
      </div>
    </div>
  )
}
