import React from 'react'
import { PenLine, MessageCircle, Star as StarIcon } from 'lucide-react'
import { formatDate } from '../../lib/formatters'

const APP_STATUS = {
  pending:  { label:'En attente', cls:'badge-blue' },
  accepted: { label:'✓ Accepte', cls:'badge-green' },
  rejected: { label:'✗ Refuse', cls:'badge-gray' },
  active:   { label:'En cours', cls:'badge-orange' },
}

export default function WorkerApplications({ allMissions, signedContracts, ratedMissions, onWithdraw, onSignContract, onOpenChat, onRate, onNavigate, onViewCompany, t }) {
  const [suiviFilter, setSuiviFilter] = React.useState('tous')

  const filtered = allMissions.filter(app => {
    if (suiviFilter === 'tous') return true
    if (suiviFilter === 'completed') return app.missions?.status === 'completed'
    return app.status === suiviFilter
  })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>{t('my_missions')}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>{allMissions.length}</span> candidature{allMissions.length !== 1 ? 's' : ''} suivies.
        </div>
        <div style={{ fontSize: 14, color: 'var(--g5)', marginTop: 6 }}>Votre historique et vos missions en cours.</div>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
        {[['tous', 'Toutes', allMissions.length], ['pending', 'En attente', allMissions.filter(a => a.status === 'pending').length], ['accepted', 'Acceptees', allMissions.filter(a => a.status === 'accepted').length], ['rejected', 'Refusees', allMissions.filter(a => a.status === 'rejected').length], ['completed', 'Terminees', allMissions.filter(a => a.missions?.status === 'completed').length]].map(([v, l, c]) => (
          <button type="button" key={v} onClick={() => setSuiviFilter(v)} style={{ padding:'5px 12px', borderRadius:99, border: suiviFilter === v ? '1.5px solid var(--or)' : '1px solid var(--g2)', background: suiviFilter === v ? 'var(--or-l)' : 'var(--wh)', color: suiviFilter === v ? 'var(--or-d)' : 'var(--g6)', fontSize:12, cursor:'pointer', fontWeight: suiviFilter === v ? 500 : 400 }}>
            {l} {c > 0 && <span style={{ marginLeft:3, opacity:0.6 }}>({c})</span>}
          </button>
        ))}
      </div>

      {allMissions.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--g4)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
          <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>Aucune candidature envoyee</div>
          <div style={{ fontSize:13, marginBottom:16 }}>Postulez a des missions pour les retrouver ici</div>
          <button type="button" className="btn-primary" onClick={() => onNavigate('missions')}>Voir les missions →</button>
        </div>
      ) : (
        filtered.map(app => {
          const m = app.missions
          const st = APP_STATUS[app.status] || { label: app.status, cls: 'badge-gray' }
          const isAccepted = app.status === 'accepted'
          const missionDone = m?.status === 'completed'
          const alreadyRated = ratedMissions.has(m?.id)
          const netEstime = m?.hourly_rate && m?.total_hours ? Math.round(m.hourly_rate * m.total_hours * 0.78) : null

          return (
            <div key={app.id} className="card" style={{ padding:16, marginBottom:10, borderLeft: isAccepted ? '3px solid var(--gr)' : missionDone ? '3px solid var(--bl)' : '3px solid transparent' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{m?.title || '—'}</div>
                  <div style={{ fontSize:12, color:'var(--g4)' }}>
                    {onViewCompany && m?.companies?.name && (m?.company_id || m?.companies?.id) ? (
                      <button
                        type="button"
                        onClick={() => onViewCompany(m.company_id || m.companies.id, m.companies)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          color: 'var(--brand)', fontWeight: 600, fontSize: 'inherit', fontFamily: 'inherit',
                          textDecoration: 'underline', textUnderlineOffset: 2, textDecorationColor: 'rgba(37,99,235,.3)',
                        }}
                      >{m.companies.name}</button>
                    ) : (
                      <span>{m?.companies?.name || '—'}</span>
                    )}
                    {' · '}{m?.city || '—'}
                  </div>
                </div>
                <span className={`badge ${missionDone ? 'badge-blue' : st.cls}`} style={{ fontSize:11, flexShrink:0 }}>{missionDone ? 'Terminee' : st.label}</span>
              </div>

              {/* Timeline */}
              {app.status !== 'rejected' && app.status !== 'withdrawn' && (
                <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:10, marginBottom:4 }}>
                  {[['pending', 'Candidature'], ['accepted', 'Accepte'], ['active', 'En cours'], ['completed', 'Terminee']].map(([step, label], i) => {
                    const currentStep = missionDone ? 3 : app.status === 'accepted' ? 1 : app.status === 'pending' ? 0 : m?.status === 'active' ? 2 : 0
                    const done = i <= currentStep
                    return (
                      <React.Fragment key={step}>
                        <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <div style={{ width:12, height:12, borderRadius:'50%', background: done ? (i === currentStep ? 'var(--or)' : 'var(--gr)') : 'var(--g2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            {done && <span style={{ color:'#fff', fontSize:7, lineHeight:1 }}>✓</span>}
                          </div>
                          <span style={{ fontSize:9, color: done ? 'var(--bk)' : 'var(--g4)', fontWeight: i === currentStep ? 600 : 400 }}>{label}</span>
                        </div>
                        {i < 3 && <div style={{ flex:1, height:2, background: i < currentStep ? 'var(--gr)' : 'var(--g2)', margin:'0 4px', borderRadius:1 }}></div>}
                      </React.Fragment>
                    )
                  })}
                </div>
              )}

              <div style={{ display:'flex', gap:16, marginTop:10, flexWrap:'wrap' }}>
                {m?.hourly_rate && <span style={{ fontSize:12, color:'var(--g6)' }}><strong>{m.hourly_rate}€/h</strong></span>}
                {m?.total_hours && <span style={{ fontSize:12, color:'var(--g4)' }}>{m.total_hours}h</span>}
                {m?.start_date && <span style={{ fontSize:12, color:'var(--g4)' }}>Debut {formatDate(m.start_date)}</span>}
                {app.match_score && <span className="score-badge" style={{ fontSize:11 }}>{app.match_score}% match</span>}
                {netEstime && <span style={{ fontSize:12, fontWeight:600, color:'var(--or)' }}>~{netEstime} € net</span>}
              </div>

              {app.status === 'pending' && (
                <div style={{ marginTop:10 }}>
                  <button type="button" className="btn-secondary" style={{ padding:'6px 12px', fontSize:11, color:'var(--rd)', borderColor:'var(--rd)' }}
                    onClick={() => onWithdraw(app.id)}>
                    Retirer ma candidature
                  </button>
                </div>
              )}

              {isAccepted && !missionDone && (
                <div style={{ marginTop:10, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  {signedContracts.includes(m?.id) ? (
                    <div style={{ flex:1, padding:'8px 12px', background:'var(--gr-l)', borderRadius:8, fontSize:12, color:'var(--gr-d)' }}>✓ Contrat signe</div>
                  ) : (
                    <button type="button" className="btn-dark" style={{ padding:'8px 14px', fontSize:12 }}
                      onClick={() => onSignContract(m)}>
                      <PenLine size={16} style={{ verticalAlign:'middle', marginRight:4 }} /> Signer le contrat
                    </button>
                  )}
                  <button type="button" className="btn-primary" style={{ padding:'8px 14px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}
                    onClick={() => onOpenChat(m?.companies?.id || m?.company_id, m?.companies?.name || 'Entreprise', m?.id)}>
                    <MessageCircle size={16} /> Contacter
                  </button>
                </div>
              )}

              {missionDone && (
                <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button type="button" className="btn-secondary" style={{ padding:'8px 14px', fontSize:12, display:'flex', alignItems:'center', gap:4 }}
                    onClick={() => onSignContract(m)}
                    title="Voir le contrat signé">
                    <PenLine size={14} /> Voir le contrat
                  </button>
                  {!alreadyRated && (
                    <button type="button" className="btn-primary" style={{ flex:1, minWidth:180, justifyContent:'center', padding:'8px 14px', fontSize:12, display:'flex', alignItems:'center', gap:6 }}
                      onClick={() => onRate(m)}>
                      <StarIcon size={12} fill="currentColor" /> Évaluer cette mission
                    </button>
                  )}
                  {alreadyRated && (
                    <div style={{ flex:1, padding:'8px 12px', background:'var(--gr-l)', borderRadius:8, fontSize:12, color:'var(--gr-d)', textAlign:'center' }}>
                      ✓ Mission évaluée — merci !
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
