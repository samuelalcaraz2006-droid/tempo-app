import React from 'react'
import { Search } from 'lucide-react'
import MissionCard from '../shared/MissionCard'
import EmptyState from '../../components/UI/EmptyState'

export default function WorkerDashboard({ worker, displayName, missions, urgentMissions, applications, onNavigate, onApply, applying, savedMissions, onToggleSave, t }) {
  const hasApplied = (id) => applications.some(a => a.mission_id === id)

  return (
    <div>
      <div style={{ background:'var(--navy)', borderRadius:14, padding:20, marginBottom:16, color:'#fff' }}>
        <div style={{ fontSize:12, color:'rgba(255,255,255,.5)', marginBottom:4 }}>{t('hello')}</div>
        <div style={{ fontSize:20, fontWeight:600, marginBottom:2 }}>{displayName}</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,.5)', marginBottom:16 }}>{worker?.city || 'Ville non renseignee'} · {worker?.radius_km || 10} km</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[[worker?.missions_completed || 0, 'Missions'], [worker?.rating_avg ? parseFloat(worker.rating_avg).toFixed(1) : '—', 'Note'], [missions.length, 'Dispo']].map(([v, l]) => (
            <div key={l} style={{ background:'rgba(255,255,255,.07)', borderRadius:8, padding:10, textAlign:'center' }}>
              <div style={{ fontSize:18, fontWeight:600, color:'var(--or)' }}>{v}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {urgentMissions.length > 0 && (
        <div style={{ background:'var(--or)', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }} onClick={() => onNavigate('missions')}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{urgentMissions.length} mission{urgentMissions.length > 1 ? 's' : ''} urgente{urgentMissions.length > 1 ? 's' : ''}</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>Cliquez pour voir</div>
          </div>
          <span style={{ color:'#fff', fontSize:20 }}>›</span>
        </div>
      )}
      {missions.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Aucune mission disponible"
          description="Les missions apparaissent ici en temps reel"
          action={{ label: 'Voir les missions', onClick: () => onNavigate('missions') }}
        />
      ) : (
        <>
          <div style={{ marginBottom:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:15, fontWeight:600 }}>{t('recommended_for_you')}</div>
            <button onClick={() => onNavigate('missions')} style={{ fontSize:13, color:'var(--or)', background:'none', border:'none', cursor:'pointer' }}>Tout voir ({missions.length})</button>
          </div>
          {missions.slice(0, 3).map(m => (
            <MissionCard
              key={m.id}
              mission={m}
              applied={hasApplied(m.id)}
              saved={savedMissions.includes(m.id)}
              applying={applying[m.id]}
              onApply={() => onApply(m, hasApplied(m.id))}
              onToggleSave={onToggleSave}
              onSelect={() => onNavigate('mission-detail', m)}
            />
          ))}
        </>
      )}
    </div>
  )
}
