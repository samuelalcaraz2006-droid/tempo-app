import React from 'react'
import { X } from 'lucide-react'
import { formatDate, SECTOR_LABELS } from '../../lib/formatters'

export default function WorkerAlerts({ savedAlerts, setSavedAlerts, filters, profileForm, showToast, onBack }) {
  const saveAlert = () => {
    const updated = [...savedAlerts, { id: Date.now(), sector: filters.filterSecteur, minRate: filters.filterRateMin, city: profileForm.city, created_at: new Date().toISOString() }]
    setSavedAlerts(updated)
    localStorage.setItem('tempo_saved_alerts', JSON.stringify(updated))
    showToast('Alerte sauvegardee !')
  }

  const deleteAlert = (id) => {
    const updated = savedAlerts.filter(x => x.id !== id)
    setSavedAlerts(updated)
    localStorage.setItem('tempo_saved_alerts', JSON.stringify(updated))
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ fontSize:18, fontWeight:600 }}>Alertes personnalisees</div>
        <button onClick={onBack} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer' }}>‹ Retour</button>
      </div>
      <div className="card" style={{ padding:16, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Creer une alerte</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:11, color:'var(--g4)', display:'block', marginBottom:3 }}>Secteur</label>
            <select className="input" value={filters.filterSecteur} onChange={e => filters.setFilterSecteur(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }}>
              <option value="tous">Tous</option><option value="logistique">Logistique</option><option value="btp">BTP</option><option value="industrie">Industrie</option><option value="hotellerie">Hotellerie</option><option value="proprete">Proprete</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, color:'var(--g4)', display:'block', marginBottom:3 }}>Taux min (€/h)</label>
            <input className="input" type="number" placeholder="15" value={filters.filterRateMin} onChange={e => filters.setFilterRateMin(e.target.value)} style={{ padding:'6px 10px', fontSize:12 }} />
          </div>
        </div>
        <button className="btn-primary" style={{ fontSize:12, padding:'8px 16px' }} onClick={saveAlert}>Creer l'alerte</button>
      </div>
      {savedAlerts.length > 0 && (
        <div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Alertes actives</div>
          {savedAlerts.map(a => (
            <div key={a.id} className="card" style={{ padding:12, marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{a.sector !== 'tous' ? SECTOR_LABELS[a.sector] || a.sector : 'Tous secteurs'}{a.minRate ? ` · >=${a.minRate}€/h` : ''}{a.city ? ` · ${a.city}` : ''}</div>
                <div style={{ fontSize:11, color:'var(--g4)' }}>Creee le {formatDate(a.created_at)}</div>
              </div>
              <button onClick={() => deleteAlert(a.id)} aria-label="Supprimer" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--rd)', display:'flex', alignItems:'center' }}><X size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
