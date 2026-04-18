import React, { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Info, Sparkles, X } from 'lucide-react'
import { SECTOR_LABELS } from '../../lib/formatters'
import {
  MARKET_RATES,
  MISSION_OBJECT_TEMPLATES,
  RECOURS_MOTIVES,
  RATE_WARNING_RATIO,
  detectRedFlags,
  getSkillSuggestions,
} from '../../lib/missionGuidelines'

const SECTORS = ['logistique', 'btp', 'industrie', 'hotellerie', 'proprete']

// ─────────────────────────────────────────────────────────────
// Champ compétences en mode « chips » : on tape une entrée,
// Entrée ou virgule → chip. Backspace sur champ vide → retire le
// dernier chip. Sous le champ, suggestions cliquables pour le
// secteur courant (ajoute en un clic, hide si déjà présent).
// ─────────────────────────────────────────────────────────────
function SkillsInput({ value, onChange, sector }) {
  const [draft, setDraft] = useState('')
  const suggestions = useMemo(() => getSkillSuggestions(sector), [sector])
  const current = Array.isArray(value) ? value : []

  const addSkill = (raw) => {
    const clean = (raw || '').trim()
    if (!clean) return
    if (current.some((s) => s.toLowerCase() === clean.toLowerCase())) return
    onChange([...current, clean])
  }
  const removeAt = (i) => onChange(current.filter((_, idx) => idx !== i))

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill(draft)
      setDraft('')
    } else if (e.key === 'Backspace' && !draft && current.length) {
      e.preventDefault()
      removeAt(current.length - 1)
    }
  }

  const onPaste = (e) => {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes(',') || pasted.includes('\n')) {
      e.preventDefault()
      pasted.split(/[,\n]/).forEach((s) => addSkill(s))
      setDraft('')
    }
  }

  const visibleSuggestions = suggestions.filter(
    (s) => !current.some((c) => c.toLowerCase() === s.toLowerCase())
  )

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>
        Compétences / qualifications attendues
      </label>
      <div
        className="input"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center',
          padding: '6px 8px',
          minHeight: 40,
          cursor: 'text',
        }}
        onClick={(e) => {
          const input = e.currentTarget.querySelector('input')
          if (input) input.focus()
        }}
      >
        {current.map((skill, i) => (
          <span
            key={`${skill}-${i}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 4px 3px 10px',
              background: 'var(--or-l, #fff4ea)',
              color: 'var(--or, #d96c1a)',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {skill}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeAt(i) }}
              aria-label={`Retirer ${skill}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                border: 'none',
                background: 'transparent',
                color: 'inherit',
                cursor: 'pointer',
                borderRadius: '50%',
                padding: 0,
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => { if (draft.trim()) { addSkill(draft); setDraft('') } }}
          placeholder={current.length ? '' : 'Ex : CACES R489 cat. 3, HACCP…'}
          style={{
            flex: 1,
            minWidth: 140,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            padding: '4px 2px',
            color: 'inherit',
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 3 }}>
        Tapez une compétence puis Entrée (ou virgule). Décrivez ce que le prestataire doit maîtriser, pas des conditions de travail imposées.
      </div>

      {visibleSuggestions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: 'var(--g5)', marginBottom: 4 }}>
            Suggestions pour ce secteur — cliquez pour ajouter :
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {visibleSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 14,
                  border: '1px dashed var(--g2)',
                  background: 'var(--wh)',
                  color: 'var(--g6)',
                  fontSize: 12,
                  cursor: 'pointer',
                  lineHeight: 1.4,
                }}
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Highlight des red flags sous le champ Objet : on montre chaque
// occurrence + la suggestion de reformulation. Non bloquant.
function RedFlagsInline({ flags }) {
  if (!flags.length) return null
  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {flags.map((f, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '6px 10px',
            background: 'var(--am-l)',
            border: '1px solid rgba(245,158,11,.25)',
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.4,
            color: '#92400E',
          }}
        >
          <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div>
              <strong>« {f.match} »</strong> — {f.message}
            </div>
            <div style={{ opacity: 0.85 }}>
              Suggestion : <em>{f.suggestion}</em>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConformityChecklist({ checks }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {checks.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <span
            aria-hidden="true"
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: c.ok ? 'var(--gr)' : 'var(--g2)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {c.ok ? '✓' : ''}
          </span>
          <span style={{ color: c.ok ? 'var(--bk)' : 'var(--g5)' }}>{c.label}</span>
        </div>
      ))}
    </div>
  )
}

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
  const [templateName, setTemplateName] = useState('')
  const [showTemplateSave, setShowTemplateSave] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const marketRate = MARKET_RATES[form.sector]
  const objectExamples = MISSION_OBJECT_TEMPLATES[form.sector] || []
  const redFlags = useMemo(() => detectRedFlags(form.objet_prestation || ''), [form.objet_prestation])

  // Calculette forfait ↔ horaire : les deux champs se synchronisent.
  // Source de vérité côté UI = ce que l'utilisateur édite en dernier ;
  // la valeur dérivée est recalculée à l'affichage.
  const hourlyRate = parseFloat(form.hourly_rate) || 0
  const totalHours = parseFloat(form.total_hours) || 0
  const forfaitTotal = parseFloat(form.forfait_total) || 0

  const effectiveForfait = form.pricing_mode === 'forfait'
    ? (forfaitTotal || hourlyRate * totalHours)
    : hourlyRate * totalHours

  const effectiveHourly = totalHours > 0
    ? (form.pricing_mode === 'forfait' ? forfaitTotal / totalHours : hourlyRate)
    : hourlyRate

  const rateUnderWarning = marketRate && effectiveHourly > 0
    && effectiveHourly < marketRate.hourlyMin * RATE_WARNING_RATIO

  // Checklist de conformité affichée en sidebar — gamification légère
  const checks = [
    { ok: !!form.title?.trim(), label: 'Titre renseigné' },
    { ok: (form.objet_prestation || '').trim().length >= 40, label: 'Objet précis (≥ 40 caractères)' },
    { ok: redFlags.length === 0, label: 'Aucun signal de subordination' },
    { ok: effectiveForfait > 0, label: 'Rémunération définie' },
    { ok: effectiveHourly >= (marketRate?.hourlyMin ?? 0) * RATE_WARNING_RATIO, label: 'Tarif dans la fourchette marché' },
    { ok: !!form.city?.trim(), label: 'Ville renseignée' },
    { ok: !!form.start_date, label: 'Date de début renseignée' },
    { ok: !!form.motif_recours, label: 'Motif de recours précisé' },
    { ok: !!form.legal_confirmed, label: 'Engagement juridique coché' },
  ]

  const allGood = checks.every((c) => c.ok)

  const applyExample = () => {
    const next = objectExamples[Math.floor(Math.random() * objectExamples.length)]
    if (next) setF('objet_prestation', next)
  }

  if (published) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--gr-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Mission publiée !</div>
        <div style={{ fontSize: 15, color: 'var(--g4)', marginBottom: 24 }}>Les prestataires compatibles ont été notifiés. Première candidature attendue dans 5 min.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={onNewMission}>Nouvelle mission</button>
          <button type="button" className="btn-primary" onClick={onNavigateDashboard}>Voir le tableau de bord →</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="section-title">Publier une mission</div>
        <div className="section-sub">Décrivez une prestation ponctuelle et autonome — TEMPO génère le contrat de prestation B2B.</div>
      </div>

      <div className="publish-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          {/* Templates (existant, on garde) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={() => setShowTemplates(!showTemplates)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--g2)', background: 'var(--wh)', color: 'var(--g6)', fontSize: 12, cursor: 'pointer' }}>
              📋 Templates ({templates.length})
            </button>
            {form.title && !showTemplateSave && (
              <button type="button" onClick={() => setShowTemplateSave(true)}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--g2)', background: 'var(--wh)', color: 'var(--g6)', fontSize: 12, cursor: 'pointer' }}>
                💾 Sauver comme template
              </button>
            )}
            {showTemplateSave && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" placeholder="Nom du template" value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(''); setShowTemplateSave(false) } }}
                  style={{ padding: '6px 10px', fontSize: 12, width: 180 }} autoFocus />
                <button type="button" className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => { if (templateName.trim()) { onSaveTemplate(templateName.trim()); setTemplateName(''); setShowTemplateSave(false) } }}
                  disabled={!templateName.trim()}>OK</button>
                <button type="button" className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }}
                  onClick={() => { setTemplateName(''); setShowTemplateSave(false) }}>✕</button>
              </div>
            )}
          </div>

          {showTemplates && (
            <div className="card" style={{ padding: 12, marginBottom: 14 }}>
              {templates.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--g4)', textAlign: 'center', padding: 8 }}>Aucun template sauvegardé</div>
                : templates.map((tpl) => (
                  <div key={tpl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--g1)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{tpl.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--g4)' }}>{tpl.title} · {SECTOR_LABELS[tpl.sector] || tpl.sector}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => onLoadTemplate(tpl)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--g2)', background: 'var(--wh)', fontSize: 11, cursor: 'pointer', color: 'var(--or)' }}>Utiliser</button>
                      <button type="button" onClick={() => onDeleteTemplate(tpl.id)} aria-label="Supprimer" style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--g2)', background: 'var(--wh)', cursor: 'pointer', color: 'var(--rd)', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* ─── Bloc 1 : L'essentiel ─── */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Titre de la mission *</label>
              <input
                className="input"
                placeholder="Ex: Déchargement de palettes sur site logistique"
                value={form.title}
                onChange={(e) => setF('title', e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)' }}>
                  Objet précis de la prestation *
                  <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--g4)' }}>(que doit livrer le prestataire ?)</span>
                </label>
                {objectExamples.length > 0 && (
                  <button
                    type="button"
                    onClick={applyExample}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--g2)', background: 'var(--wh)', color: 'var(--or)', fontSize: 11, cursor: 'pointer' }}
                  >
                    <Sparkles size={12} /> Utiliser un exemple
                  </button>
                )}
              </div>
              <textarea
                className="input"
                rows={4}
                style={{ resize: 'vertical' }}
                placeholder="Décrivez précisément le livrable attendu. Ex: Déchargement de 3 camions semi-remorques, rangement de 180 palettes zone B2 selon plan. Le prestataire apporte son expérience cariste et organise son intervention."
                value={form.objet_prestation}
                onChange={(e) => setF('objet_prestation', e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>
                <span>Minimum 40 caractères recommandé</span>
                <span>{(form.objet_prestation || '').length} caractères</span>
              </div>
              <RedFlagsInline flags={redFlags} />
            </div>

            {/* ─── Bloc 2 : Quand ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Date de début *</label>
                <input className="input" type="date" value={form.start_date} onChange={(e) => setF('start_date', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Durée estimée (h)</label>
                <input className="input" type="number" placeholder="8" value={form.total_hours} onChange={(e) => setF('total_hours', e.target.value)} />
              </div>
            </div>

            {/* ─── Bloc 3 : Où ─── */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Ville *</label>
              <input className="input" placeholder="Lyon" value={form.city} onChange={(e) => setF('city', e.target.value)} />
              <input
                className="input"
                placeholder="Adresse précise (facultative, communiquée après acceptation)"
                value={form.address}
                onChange={(e) => setF('address', e.target.value)}
                style={{ marginTop: 8 }}
              />
            </div>

            {/* ─── Bloc 4 : Qui ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Secteur</label>
                <select className="input" value={form.sector} onChange={(e) => setF('sector', e.target.value)}>
                  {SECTORS.map((s) => <option key={s} value={s}>{SECTOR_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Motif de recours</label>
                <select className="input" value={form.motif_recours} onChange={(e) => setF('motif_recours', e.target.value)}>
                  {RECOURS_MOTIVES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <SkillsInput
              value={form.required_skills || []}
              onChange={(next) => setF('required_skills', next)}
              sector={form.sector}
            />


            {/* ─── Bloc 5 : Rémunération ─── */}
            <div style={{ padding: 14, background: 'var(--g1)', borderRadius: 10 }}>
              {marketRate && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, fontSize: 12, color: 'var(--g5)', lineHeight: 1.4 }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--bl)' }} />
                  <div>
                    <strong style={{ color: 'var(--bk)' }}>Tarif moyen marché indépendant</strong> pour ce secteur :
                    {' '}{marketRate.hourlyMin}–{marketRate.hourlyMax} €/h HT.
                    {' '}<span style={{ color: 'var(--g4)' }}>{marketRate.note}.</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                {[
                  { value: 'forfait', label: 'Forfait', hint: 'recommandé' },
                  { value: 'horaire', label: 'Tarif horaire', hint: 'indicatif' },
                ].map((opt) => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="radio"
                      name="pricing_mode"
                      value={opt.value}
                      checked={form.pricing_mode === opt.value}
                      onChange={() => setF('pricing_mode', opt.value)}
                    />
                    <span>{opt.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--g4)' }}>({opt.hint})</span>
                  </label>
                ))}
              </div>

              {form.pricing_mode === 'forfait' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4, display: 'block' }}>Montant forfait *</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="200"
                      value={form.forfait_total}
                      onChange={(e) => setF('forfait_total', e.target.value)}
                      style={rateUnderWarning ? { borderColor: 'var(--rd)' } : undefined}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4, display: 'block' }}>Soit ≈</label>
                    <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--wh)', color: effectiveHourly > 0 ? 'var(--bk)' : 'var(--g4)' }}>
                      {effectiveHourly > 0 ? `${effectiveHourly.toFixed(1)} €/h sur ${totalHours || '?'} h` : '— €/h'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4, display: 'block' }}>Tarif horaire indicatif *</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="25"
                      value={form.hourly_rate}
                      onChange={(e) => setF('hourly_rate', e.target.value)}
                      style={rateUnderWarning ? { borderColor: 'var(--rd)' } : undefined}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--g5)', marginBottom: 4, display: 'block' }}>Forfait estimé</label>
                    <div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--wh)', color: effectiveForfait > 0 ? 'var(--bk)' : 'var(--g4)' }}>
                      {effectiveForfait > 0 ? `${effectiveForfait.toFixed(0)} €` : '— €'}
                    </div>
                  </div>
                </div>
              )}

              {rateUnderWarning && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rd)', lineHeight: 1.4 }}>
                  ⚠️ Tarif très en dessous du marché — risque caractérisé de salariat déguisé / délit de marchandage.
                </div>
              )}
            </div>

            {/* ─── Bloc 6 : Options avancées ─── */}
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, color: 'var(--g5)', fontSize: 13, cursor: 'pointer' }}
            >
              {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Options avancées
            </button>

            {advancedOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 10, borderLeft: '2px solid var(--g2)' }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Urgence</label>
                  <select className="input" value={form.urgency} onChange={(e) => setF('urgency', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="immediate">Immédiat</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--g6)', marginBottom: 5, display: 'block' }}>Informations complémentaires (facultatif)</label>
                  <textarea
                    className="input"
                    rows={3}
                    style={{ resize: 'none' }}
                    placeholder="Contexte, particularités du site, EPI apportés par l'entreprise…"
                    value={form.description}
                    onChange={(e) => setF('description', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ─── Bloc 7 : Engagement juridique ─── */}
            <div style={{ padding: 14, border: '1px solid var(--g2)', borderRadius: 10, background: 'var(--wh2)' }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!form.legal_confirmed}
                  onChange={(e) => setF('legal_confirmed', e.target.checked)}
                  style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 13, color: 'var(--bk)', lineHeight: 1.5 }}>
                  Je confirme que cette mission est une <strong>prestation ponctuelle et autonome</strong>.
                  Le prestataire organise librement son intervention et conserve la liberté
                  d'exercer pour d'autres clients.{' '}
                  <span
                    title="Cet engagement protège votre entreprise en cas de contrôle URSSAF : il atteste que la relation n'est pas un prêt de main-d'œuvre déguisé. Il est horodaté et conservé comme preuve de diligence."
                    style={{ color: 'var(--bl)', cursor: 'help', textDecoration: 'underline dotted' }}
                  >
                    Pourquoi ?
                  </span>
                </span>
              </label>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px' }}
              onClick={onPublish}
              disabled={publishing || !allGood}
              title={!allGood ? 'Complétez la checklist à droite pour publier' : undefined}
            >
              {publishing ? 'Publication en cours…' : 'Publier la mission →'}
            </button>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Checklist de conformité</div>
            <ConformityChecklist checks={checks} />
          </div>

          {effectiveForfait > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Estimation du coût</div>
              {[
                ['Montant prestation', `${effectiveForfait.toFixed(0)} €`, false],
                ['Commission TEMPO (8 %)', `${(effectiveForfait * 0.08).toFixed(0)} €`, false],
                ['Total TTC', `${(effectiveForfait * 1.08).toFixed(0)} €`, true],
              ].map(([l, v, b]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: !b ? '1px solid var(--g1)' : 'none' }}>
                  <span style={{ fontSize: 12, fontWeight: b ? 600 : 400, color: b ? 'var(--bk)' : 'var(--g5)' }}>{l}</span>
                  <span style={{ fontSize: b ? 14 : 12, fontWeight: b ? 600 : 500 }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .publish-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
