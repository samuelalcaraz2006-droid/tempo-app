import React, { useState, useEffect, useId } from 'react'
import SignatureCanvas from './SignatureCanvas'

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export default function ContractModal({ mission, company, worker, role, onSign, onClose, signing }) {
  const [signature, setSignature] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const titleId = useId()

  const handleSign = () => {
    if (!signature || !accepted) return
    onSign(signature)
  }

  // Fermeture par Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !signing) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [signing, onClose])

  const netEstime = mission.hourly_rate && mission.total_hours
    ? Math.round(mission.hourly_rate * mission.total_hours * (role === 'worker' ? 0.78 : 1))
    : null

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }}>
      <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 28, maxWidth: 520, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, background: 'var(--or)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white" /></svg>
          </div>
          <div>
            <div id={titleId} style={{ fontSize: 16, fontWeight: 600 }}>Contrat de mission</div>
            <div style={{ fontSize: 12, color: 'var(--g4)' }}>TEMPO · Signature électronique</div>
          </div>
        </div>

        {/* Détails du contrat */}
        <div style={{ background: 'var(--g1)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{mission.title}</div>
          {[
            ['Entreprise', company?.name || '—'],
            ['Travailleur', worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() : '—'],
            ['Taux horaire', `${mission.hourly_rate} €/h`],
            ['Durée', mission.total_hours ? `${mission.total_hours} heures` : 'À définir'],
            ['Date de début', formatDate(mission.start_date)],
            ['Lieu', mission.city || '—'],
            ...(netEstime ? [['Montant estimé', `${netEstime} €${role === 'worker' ? ' net' : ' HT'}`]] : []),
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--g2)', fontSize: 13 }}>
              <span style={{ color: 'var(--g4)' }}>{l}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Conditions */}
        <div style={{ fontSize: 12, color: 'var(--g6)', lineHeight: 1.6, marginBottom: 16, padding: '12px 14px', background: 'var(--g1)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Conditions générales</div>
          Le présent contrat est conclu entre les parties mentionnées ci-dessus via la plateforme TEMPO.
          La mission sera exécutée selon les termes convenus. Le paiement sera effectué dans un délai de 7 jours
          après validation de la mission. En cas de litige, les parties s'engagent à utiliser le système de médiation
          de TEMPO. La commission plateforme est de 12% côté entreprise et 10% côté travailleur.
        </div>

        {/* Signature */}
        <SignatureCanvas onSave={setSignature} label={`Signature ${role === 'worker' ? 'du travailleur' : 'de l\'entreprise'}`} />

        {signature && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--gr-l)', borderRadius: 8, fontSize: 12, color: 'var(--gr-d)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            Signature enregistrée
          </div>
        )}

        {/* Acceptation */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--or)' }} />
          <span style={{ fontSize: 12, color: 'var(--g6)', lineHeight: 1.5 }}>
            J'accepte les conditions du contrat et je confirme que les informations fournies sont exactes.
            Ma signature électronique a la même valeur juridique qu'une signature manuscrite (eIDAS).
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={onClose} disabled={signing}
            style={{ flex: 1, padding: '11px', border: '1px solid var(--g2)', borderRadius: 10, background: 'var(--wh)', fontSize: 13, cursor: 'pointer', color: 'var(--g6)' }}>
            Annuler
          </button>
          <button onClick={handleSign} disabled={!signature || !accepted || signing}
            style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, background: signature && accepted ? 'var(--or)' : 'var(--g2)', color: signature && accepted ? '#fff' : 'var(--g4)', fontSize: 13, fontWeight: 500, cursor: signature && accepted ? 'pointer' : 'default' }}>
            {signing ? 'Signature en cours...' : 'Signer le contrat'}
          </button>
        </div>
      </div>
    </div>
  )
}
