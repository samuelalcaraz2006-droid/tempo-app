import React from 'react'
import { X } from 'lucide-react'
import { SECTOR_LABELS } from '../../lib/formatters'

const SECTORS = ['logistique', 'btp', 'industrie', 'hotellerie', 'proprete']

export default function CompanyPublishMission({
  form,
  setF,
  publishing,
  published,
  templates,
  showTemplates,
  setShowTemplates,
  onPublish,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  onNewMission,
  onNavigateDashboard,
}) {
  const [templateName, setTemplateName] = React.useState('')
  const [showTemplateSave, setShowTemplateSave] = React.useState(false)
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Publier une mission</div>
        <div className="section-sub">L'algorithme TEMPO notifie immédiatement les meilleurs profils</div>
      </div>

      {!published ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            {/* Templates bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setShowTemplates(!showTemplates)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--g2)', background: 'var(--wh)', color: 'var(--g6)', fontSize: 12, cursor: 'pointer' }}>
                📋 Templates ({templates.length})
              </button>
              {form.title && !showTemplateSave && (
                <button onClick={() => setShowTemplateSave(true)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--g2)', background: 'var(--wh)', color: 'var(--g6)', fontSize: 12, cursor: 'pointer' }}>
                  💾 Sauver comme template
                </button>
              )}
              {showTemplateSave && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="input" placeholder="Nom du template" value={templateName} onChange={e => setTemplateName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(''); setShowTemplateSave(false) } }}
                    style={{ padding: '6px 10px', fontSize: 12, width: 180 }} autoFocus />
                  <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => { if (templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(''); setShowTemplateSave(false) } }}
                    disabled={!templateName.trim()}>OK</button>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => { setTemplateName(''); setShowTemplateSave(false) }}>✕</button>
                </div>
              )}
            </div>

            {showTemplates && (
              <div className="card" style={{ padding: 12, marginBottom: 14 }}>
                {templates.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--g4)', textAlign: 'center', padding: 8 }}>Aucun template sauvegardé</div>
                  : templates.map(tpl => (
                    <div key={tpl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--g1)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{tpl.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--g4)' }}>{tpl.title} · {SECTOR_LABELS[tpl.sector] || tpl.sector}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => onLoadTemplate(tpl)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--g2)', background: 'var(--wh)', fontSize: 11, cursor: 'pointer', color: 'var(--or)' }}>Utiliser</button>
                        <button onClick={() => onDeleteTemplate(tpl.id)} aria-label="Supprimer" style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--g2)', background: 'var(--wh)', cursor: 'pointer', color: 'var(--rd)', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Intitulé du poste *</label>
                <input className="input" placeholder="Ex: Opérateur logistique CACES 3" value={form.title} onChange={e => setF('title', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Secteur</label>
                  <select className="input" value={form.sector} onChange={e => setF('sector', e.target.value)}>
                    {SECTORS.map(s => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Urgence</label>
                  <select className="input" value={form.urgency} onChange={e => setF('urgency', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="immediate">Immédiat</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Taux horaire (€) *</label>
                  <input className="input" type="number" placeholder="14.50" value={form.hourly_rate} onChange={e => setF('hourly_rate', e.target.value)} />
                  <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>Recommande : 14-80 EUR/h</div>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Heures estimées</label>
                  <input className="input" type="number" placeholder="40" value={form.total_hours} onChange={e => setF('total_hours', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Date de début *</label>
                  <input className="input" type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Ville *</label>
                  <input className="input" placeholder="Lyon" value={form.city} onChange={e => setF('city', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Adresse complète</label>
                <input className="input" placeholder="12 rue des entrepôts" value={form.address} onChange={e => setF('address', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Compétences requises (séparées par des virgules)</label>
                <input className="input" placeholder="CACES 3, Travail de nuit, Port de charges"
                  onChange={e => setF('required_skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Description</label>
                <textarea className="input" rows={3} style={{ resize: 'none' }} placeholder="Décrivez la mission, les conditions de travail..."
                  value={form.description} onChange={e => setF('description', e.target.value)} />
                {form.description && <div style={{ fontSize: 11, color: form.description.length > 500 ? 'var(--rd)' : 'var(--g4)', textAlign: 'right', marginTop: 2 }}>{form.description.length}/500</div>}
              </div>
              <div style={{ background: 'var(--brand-l)', border: '1px solid var(--am-l)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--or-d)', lineHeight: 1.5 }}>
                Protection TEMPO — Contrat de prestation auto-généré. RC Pro, URSSAF et facturation incluses.
              </div>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} onClick={onPublish} disabled={publishing}>
                {publishing ? 'Publication en cours...' : 'Publier la mission →'}
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Estimation</div>
            <div style={{ background: 'var(--navy)', borderRadius: 14, padding: 20, marginBottom: 16, color: '#fff' }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>Délai moyen de pourvoi</div>
              <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--or)', marginBottom: 2 }}>30 min</div>
              <div style={{ fontSize: 13, color: 'var(--gr)', marginBottom: 16 }}>Taux de réussite 98%</div>
              {[['Délai 1ère candidature', '< 5 min'], ['Mission pourvue', '< 30 min'], ['Contrat généré', 'Automatique'], ['Paiement', 'J+2 après mission']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 13 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            {form.hourly_rate && form.total_hours && (
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Coût estimé</div>
                {[
                  [`Rémunération (${form.total_hours}h × ${form.hourly_rate}€)`, `${(parseFloat(form.total_hours) * parseFloat(form.hourly_rate)).toFixed(0)} €`, false],
                  ['Commission TEMPO (8%)', `${(parseFloat(form.total_hours) * parseFloat(form.hourly_rate) * 0.08).toFixed(0)} €`, false],
                  ['Total TTC', `${(parseFloat(form.total_hours) * parseFloat(form.hourly_rate) * 1.08).toFixed(0)} €`, true],
                ].map(([l, v, b]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: !b ? '1px solid #F4F4F2' : 'none' }}>
                    <span style={{ fontSize: 13, fontWeight: b ? 600 : 400, color: b ? 'var(--bk)' : 'var(--g4)' }}>{l}</span>
                    <span style={{ fontSize: b ? 15 : 13, fontWeight: b ? 600 : 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gr-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Mission publiée !</div>
          <div style={{ fontSize: 15, color: 'var(--g4)', marginBottom: 24 }}>Les travailleurs compatibles ont été notifiés. Première candidature attendue dans 5 min.</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={onNewMission}>Nouvelle mission</button>
            <button className="btn-primary" onClick={onNavigateDashboard}>Voir le tableau de bord →</button>
          </div>
        </div>
      )}
    </div>
  )
}
