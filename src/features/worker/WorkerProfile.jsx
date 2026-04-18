import React, { useState } from 'react'
import { X, Bell } from 'lucide-react'
import WorkerStripeOnboarding from './WorkerStripeOnboarding'
import WorkerSiretValidation from './WorkerSiretValidation'
import WorkerAttestation from './WorkerAttestation'
import RgpdPanel from '../shared/RgpdPanel'

const Star = ({ n }) => <span style={{ color:'var(--am)', fontSize:12 }}>{'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}</span>

export default function WorkerProfile({ worker, profile, profileForm, setProfileForm, onSave, savingProfile, badges, initials, displayName, onNavigate, onLogout, savedAlerts, KycUploadSection, userId, refreshRoleData, showToast }) {
  const [newSkill, setNewSkill] = useState('')
  const [newCert, setNewCert] = useState('')

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>Profil & disponibilités</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          {displayName ? <>Votre <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>profil</span>, {displayName.split(' ')[0]}.</> : <>Votre <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>profil</span>.</>}
        </div>
      </div>
      <div className="a-card" style={{ padding: 24, marginBottom: 14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg, #60A5FA, #2563EB)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700 }}>{initials}</div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color: 'var(--bk)' }}>{displayName}</div>
            <div style={{ fontSize:13, color:'var(--g5)' }}>{profile?.email}</div>
            {worker?.rating_avg > 0 && <div style={{ marginTop:4 }}><Star n={worker.rating_avg} /><span style={{ fontSize:12, color:'var(--g5)', marginLeft:4 }}>{parseFloat(worker.rating_avg).toFixed(1)} · {worker.rating_count} avis</span></div>}
          </div>
        </div>

        <div className="a-eyebrow" style={{ marginBottom: 12, fontSize: 10.5 }}>Informations personnelles</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Prenom</label>
            <input className="input" value={profileForm.first_name || ''} onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))} /></div>
          <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Nom</label>
            <input className="input" value={profileForm.last_name || ''} onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))} /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Ville</label>
            <input className="input" value={profileForm.city || ''} onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))} placeholder="Ex: Lyon" /></div>
          <div><label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>SIRET</label>
            <input className="input" value={profileForm.siret || ''} onChange={e => setProfileForm(f => ({ ...f, siret: e.target.value }))} placeholder="12345678900012" maxLength={14} /></div>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)', marginBottom:5, display:'block' }}>Rayon d'intervention : <strong>{profileForm.radius_km || 10} km</strong></label>
          <input type="range" min="1" max="100" value={profileForm.radius_km || 10}
            onChange={e => setProfileForm(f => ({ ...f, radius_km: parseInt(e.target.value) }))}
            style={{ width:'100%', accentColor:'var(--or)' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--g4)' }}>
            <span>1 km</span><span>50 km</span><span>100 km</span>
          </div>
        </div>

        {/* À propos (bio) — visible sur la carte de visite publique */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
            <label style={{ fontSize:13, fontWeight:500, color:'var(--g6)' }}>À propos</label>
            <span style={{ fontSize:11, color:'var(--g4)', fontFamily:"'JetBrains Mono', monospace" }}>
              {(profileForm.bio || worker?.bio || '').length} / 280
            </span>
          </div>
          <textarea
            className="input"
            rows={3}
            maxLength={280}
            style={{ resize:'vertical', fontFamily:'inherit', lineHeight:1.5 }}
            placeholder="Présentez-vous en 2-3 phrases. Pas d'email, pas de téléphone — ils restent privés."
            value={profileForm.bio || worker?.bio || ''}
            onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
          />
          <div style={{ fontSize:11, color:'var(--g4)', marginTop:4, lineHeight:1.5 }}>
            Affiché sur votre carte de visite publique. Évitez emails, téléphones et URLs — ils seront masqués automatiquement.
          </div>
        </div>

        {/* Skills */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Competences</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
            {(profileForm.skills || worker?.skills || []).map(s => (
              <span key={s} className="tag" style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                {s}
                <button onClick={() => setProfileForm(f => ({ ...f, skills: (f.skills || worker?.skills || []).filter(sk => sk !== s) }))}
                  aria-label="Supprimer" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--g4)', padding:0, lineHeight:1, display:'flex', alignItems:'center' }}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input className="input" placeholder="Ajouter une competence..." value={newSkill} onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newSkill.trim()) { setProfileForm(f => ({ ...f, skills: [...(f.skills || worker?.skills || []), newSkill.trim()] })); setNewSkill('') } }}
              style={{ flex:1 }} />
            <button className="btn-secondary" style={{ padding:'8px 12px', fontSize:12 }}
              onClick={() => { if (newSkill.trim()) { setProfileForm(f => ({ ...f, skills: [...(f.skills || worker?.skills || []), newSkill.trim()] })); setNewSkill('') } }}>+</button>
          </div>
        </div>

        {/* Certifications */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Certifications</div>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
            {(profileForm.certifications || worker?.certifications || []).map(c => (
              <span key={typeof c === 'string' ? c : c.name} className="tag" style={{ background:'var(--bl-l)', color:'var(--bl-d)', borderColor:'#BFDBFE', display:'inline-flex', alignItems:'center', gap:4 }}>
                {typeof c === 'string' ? c : c.name}
                <button onClick={() => setProfileForm(f => ({ ...f, certifications: (f.certifications || worker?.certifications || []).filter(ck => (typeof ck === 'string' ? ck : ck.name) !== (typeof c === 'string' ? c : c.name)) }))}
                  aria-label="Supprimer" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--bl-d)', padding:0, lineHeight:1, display:'flex', alignItems:'center' }}><X size={10} /></button>
              </span>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input className="input" placeholder="Ajouter une certification..." value={newCert} onChange={e => setNewCert(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newCert.trim()) { setProfileForm(f => ({ ...f, certifications: [...(f.certifications || worker?.certifications || []), newCert.trim()] })); setNewCert('') } }}
              style={{ flex:1 }} />
            <button className="btn-secondary" style={{ padding:'8px 12px', fontSize:12 }}
              onClick={() => { if (newCert.trim()) { setProfileForm(f => ({ ...f, certifications: [...(f.certifications || worker?.certifications || []), newCert.trim()] })); setNewCert('') } }}>+</button>
          </div>
        </div>

        <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={() => onSave(profileForm)} disabled={savingProfile}>
          {savingProfile ? 'Sauvegarde...' : 'Sauvegarder mon profil'}
        </button>
      </div>

      <WorkerSiretValidation worker={worker} showToast={showToast} />

      <WorkerAttestation worker={worker} userId={userId} showToast={showToast} onUpdate={refreshRoleData} />

      <KycUploadSection worker={worker} userId={userId} onUpdate={refreshRoleData} showToast={showToast} />

      <WorkerStripeOnboarding worker={worker} showToast={showToast} />

      <RgpdPanel userId={userId} showToast={showToast} />

      {badges.length > 0 && (
        <div className="card" style={{ padding:16, marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:10 }}>Badges obtenus</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {badges.map(b => (
              <div key={b.label} style={{ textAlign:'center', padding:8, background:'#FFF2EE', borderRadius:8 }} title={b.desc}>
                <div style={{ fontSize:20, marginBottom:2 }}>{b.icon}</div>
                <div style={{ fontSize:10, fontWeight:500, color:'var(--or-d)' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn-secondary" style={{ width:'100%', justifyContent:'center', marginBottom:12 }} onClick={() => onNavigate('calendrier')}>
        📅 Calendrier de disponibilite
      </button>
      <button className="btn-secondary" style={{ width:'100%', justifyContent:'center', marginBottom:12 }} onClick={() => onNavigate('alertes')}>
        <Bell size={16} style={{ verticalAlign:'middle', marginRight:4 }} /> Gerer mes alertes ({savedAlerts.length})
      </button>

      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', textAlign:'center' }}>
          {[[worker?.missions_completed || 0, 'Missions'], [worker?.rating_avg ? parseFloat(worker.rating_avg).toFixed(1) : '—', 'Note'], [worker?.rating_count || 0, 'Avis']].map(([v, l], i) => (
            <div key={l} style={{ borderLeft: i > 0 ? '1px solid var(--g2)' : 'none' }}>
              <div style={{ fontSize:20, fontWeight:600 }}>{v}</div>
              <div style={{ fontSize:12, color:'var(--g4)', marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <button className="btn-secondary" style={{ width:'100%', justifyContent:'center' }} onClick={onLogout}>Se deconnecter</button>
    </div>
  )
}
