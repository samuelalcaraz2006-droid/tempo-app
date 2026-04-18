import { lazy, Suspense } from 'react'
import { Search, X, Menu, Map, Heart } from 'lucide-react'
import MissionCard from '../shared/MissionCard'
import EmptyState from '../../components/UI/EmptyState'

const MissionsMap = lazy(() => import('../../components/MissionsMap'))

export default function WorkerMissionsList({ filters, missions, hasApplied, applying, onApply, savedMissions, onToggleSave, onNavigate, onViewCompany, mapView, setMapView }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>Missions disponibles</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>{filters.filteredMissions.length}</span> mission{filters.filteredMissions.length !== 1 ? 's' : ''} près de chez vous.
        </div>
        <div style={{ fontSize: 14, color: 'var(--g5)', marginTop: 6 }}>Triez, filtrez, postulez en 1 clic.</div>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:12 }}>
        <input className="input" placeholder="Rechercher par titre, entreprise, ville, competence..." value={filters.searchQuery} onChange={e => filters.setSearchQuery(e.target.value)} style={{ paddingLeft:36, paddingRight: filters.searchQuery ? 32 : 12 }} />
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--g4)', pointerEvents:'none', display:'flex', alignItems:'center' }}><Search size={16} /></span>
        {filters.searchQuery && <button onClick={() => filters.setSearchQuery('')} aria-label="Effacer" style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--g4)', cursor:'pointer', lineHeight:1, display:'flex', alignItems:'center' }}><X size={16} /></button>}
      </div>

      {/* Sort + view toggle */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
        <select className="input" value={filters.sortBy} onChange={e => filters.setSortBy(e.target.value)} style={{ width:'auto', padding:'6px 10px', fontSize:12, minWidth:140 }}>
          <option value="match">Tri : Pertinence</option><option value="date">Tri : Date</option><option value="rate-desc">Tri : Taux ↓</option><option value="rate-asc">Tri : Taux ↑</option><option value="duration">Tri : Duree ↓</option><option value="net">Tri : Net ↓</option>
        </select>
        <button onClick={() => filters.setShowFilters(!filters.showFilters)} style={{ padding:'6px 12px', borderRadius:8, border: filters.activeFilterCount > 0 ? '1.5px solid var(--or)' : '1px solid var(--g2)', background: filters.activeFilterCount > 0 ? 'var(--or-l)' : 'var(--wh)', color: filters.activeFilterCount > 0 ? 'var(--or-d)' : 'var(--g6)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
          ⚙ Filtres {filters.activeFilterCount > 0 && <span style={{ background:'var(--or)', color:'#fff', borderRadius:'50%', width:16, height:16, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600 }}>{filters.activeFilterCount}</span>}
        </button>
        <button onClick={() => setMapView(!mapView)} style={{ padding:'6px 12px', borderRadius:8, border: mapView ? '1.5px solid var(--or)' : '1px solid var(--g2)', background: mapView ? 'var(--or-l)' : 'var(--wh)', color: mapView ? 'var(--or-d)' : 'var(--g6)', fontSize:12, cursor:'pointer' }}>
          {mapView ? <><Menu size={20} style={{ verticalAlign:'middle' }} /> Liste</> : <><Map size={16} style={{ verticalAlign:'middle' }} /> Carte</>}
        </button>
        {savedMissions.length > 0 && <button onClick={() => onNavigate('favoris')} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--g2)', background:'var(--wh)', color:'var(--g6)', fontSize:12, cursor:'pointer' }}><Heart size={16} style={{ verticalAlign:'middle', marginRight:4 }} /> Favoris ({savedMissions.length})</button>}
      </div>

      {/* Advanced filters */}
      {filters.showFilters && (
        <div className="card" style={{ padding:16, marginBottom:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div><label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Taux min (€)</label><input className="input" type="number" placeholder="0" value={filters.filterRateMin} onChange={e => filters.setFilterRateMin(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} /></div>
            <div><label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Taux max (€)</label><input className="input" type="number" placeholder="100" value={filters.filterRateMax} onChange={e => filters.setFilterRateMax(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} /></div>
            <div><label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Duree min (h)</label><input className="input" type="number" placeholder="0" value={filters.filterDurationMin} onChange={e => filters.setFilterDurationMin(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} /></div>
            <div><label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Duree max (h)</label><input className="input" type="number" placeholder="500" value={filters.filterDurationMax} onChange={e => filters.setFilterDurationMax(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} /></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div><label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Urgence</label><select className="input" value={filters.filterUrgency} onChange={e => filters.setFilterUrgency(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }}><option value="tous">Toutes</option><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="immediate">Immediat</option></select></div>
            <div><label style={{ fontSize:11, fontWeight:500, color:'var(--g4)', marginBottom:3, display:'block' }}>Periode</label><select className="input" value={filters.filterPeriod} onChange={e => filters.setFilterPeriod(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }}><option value="tous">Toutes</option><option value="semaine">Cette semaine</option><option value="mois">Ce mois</option><option value="3mois">3 prochains mois</option></select></div>
          </div>
          <button onClick={filters.resetFilters} style={{ fontSize:12, color:'var(--or)', background:'none', border:'none', cursor:'pointer', fontWeight:500 }}>Reinitialiser les filtres</button>
        </div>
      )}

      {/* Sector pills */}
      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:14 }}>
        {[['tous', 'Tous'], ['logistique', 'Logistique'], ['btp', 'BTP'], ['industrie', 'Industrie'], ['hotellerie', 'Hotellerie'], ['proprete', 'Proprete']].map(([v, l]) => (
          <button key={v} onClick={() => filters.setFilterSecteur(v)} style={{ padding:'5px 12px', borderRadius:99, border: filters.filterSecteur === v ? '1.5px solid var(--or)' : '1px solid var(--g2)', background: filters.filterSecteur === v ? 'var(--or-l)' : 'var(--wh)', color: filters.filterSecteur === v ? 'var(--or-d)' : 'var(--g6)', fontSize:12, cursor:'pointer', fontWeight: filters.filterSecteur === v ? 500 : 400 }}>{l}</button>
        ))}
      </div>

      {/* Results */}
      {mapView ? (
        <Suspense fallback={<div style={{ textAlign:'center', padding:40, color:'var(--g4)', fontSize:13 }}>Chargement de la carte...</div>}>
          <MissionsMap missions={filters.filteredMissions} onSelectMission={m => onNavigate('mission-detail', m)} onApply={m => onApply(m, hasApplied(m.id))} hasApplied={hasApplied} />
        </Suspense>
      ) : filters.filteredMissions.length === 0
        ? <EmptyState icon={Search} title="Aucune mission trouvee" description="Essayez d'ajuster vos filtres ou revenez plus tard" />
        : filters.filteredMissions.map(m => <MissionCard key={m.id} mission={m} applied={hasApplied(m.id)} saved={savedMissions.includes(m.id)} applying={applying[m.id]} onApply={() => onApply(m, hasApplied(m.id))} onToggleSave={onToggleSave} onSelect={() => onNavigate('mission-detail', m)} onViewCompany={onViewCompany} />)
      }
    </div>
  )
}
