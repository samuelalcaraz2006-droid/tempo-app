import { useState, useEffect, useId } from 'react'
import SignatureCanvas from './SignatureCanvas'
import { getRecoursLabel } from '../lib/missionGuidelines'

// Affichage long pour les contrats (ex: "7 avril 2026")
const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
const formatAmount = (n) => Number.isFinite(n) ? `${n.toFixed(0)} €` : '—'

function Clause({ title, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
      <div style={{ opacity: 0.9 }}>{children}</div>
    </div>
  )
}

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

  // Normalisation du montant : on privilégie le forfait. Pour les
  // anciennes missions antérieures à la migration 014, on retombe
  // sur hourly_rate × total_hours.
  const hourlyRate = parseFloat(mission.hourly_rate) || 0
  const totalHours = parseFloat(mission.total_hours) || 0
  const forfaitTotal = parseFloat(mission.forfait_total) || (hourlyRate * totalHours)
  const pricingMode = mission.pricing_mode || 'forfait'
  const netWorker = forfaitTotal * 0.78

  const rows = [
    ['Donneur d\'ordre', company?.name || '—'],
    ['Prestataire', worker ? `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || '—' : '—'],
    ['Date de début', formatDate(mission.start_date)],
    ['Lieu', mission.city || '—'],
    mission.motif_recours && ['Motif de recours', getRecoursLabel(mission.motif_recours)],
    pricingMode === 'forfait'
      ? ['Rémunération', `Forfait ${formatAmount(forfaitTotal)} HT`]
      : ['Rémunération', `Tarif indicatif ${hourlyRate} €/h × ${totalHours}h ≈ ${formatAmount(forfaitTotal)} HT`],
    role === 'worker' && Number.isFinite(netWorker) && ['Net estimé prestataire', `${netWorker.toFixed(0)} € après commission`],
  ].filter(Boolean)

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20, overflowY: 'auto' }}>
      <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 28, maxWidth: 560, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, background: 'var(--or)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M2 1.5L12 7L2 12.5Z" fill="white" /></svg>
          </div>
          <div>
            <div id={titleId} style={{ fontSize: 16, fontWeight: 600 }}>Contrat de prestation de service</div>
            <div style={{ fontSize: 12, color: 'var(--g4)' }}>TEMPO · B2B · Signature électronique eIDAS</div>
          </div>
        </div>

        {/* Titre de la mission */}
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{mission.title}</div>

        {/* Objet précis de la prestation — le cœur juridique */}
        {mission.objet_prestation ? (
          <div style={{ background: 'var(--brand-l)', border: '1px solid rgba(37,99,235,.18)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-d)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>
              Objet de la prestation
            </div>
            <div style={{ fontSize: 13, color: 'var(--bk)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {mission.objet_prestation}
            </div>
          </div>
        ) : null}

        {/* Détails contractuels */}
        <div style={{ background: 'var(--g1)', borderRadius: 10, padding: 16, marginBottom: 14 }}>
          {rows.map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--g2)', fontSize: 13 }}>
              <span style={{ color: 'var(--g5)' }}>{l}</span>
              <span style={{ fontWeight: 500, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Clauses essentielles — rédigées B2B, anti-requalification */}
        <div style={{ fontSize: 12, color: 'var(--g6)', lineHeight: 1.55, marginBottom: 16, padding: '14px 16px', background: 'var(--g1)', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--bk)', marginBottom: 10 }}>Clauses essentielles</div>

          <Clause title="1. Objet et livrable">
            Le prestataire s'engage à réaliser la prestation décrite ci-dessus selon ses propres méthodes et son organisation. Le résultat attendu est la seule mesure de bonne exécution.
          </Clause>

          <Clause title="2. Autonomie du prestataire">
            Le prestataire exerce son activité en toute indépendance. Il organise librement son travail, ses horaires et sa méthode d'exécution, dans le respect des règles de sécurité du site.
          </Clause>

          <Clause title="3. Absence de lien de subordination">
            Les présentes relations sont exclusivement commerciales. Aucun lien hiérarchique n'est établi entre les parties. Le prestataire conserve le statut d'indépendant.
          </Clause>

          <Clause title="4. Non-exclusivité">
            Le prestataire conserve l'entière liberté d'exercer pour d'autres clients, y compris pendant la durée de la présente mission, sans restriction sectorielle.
          </Clause>

          <Clause title="5. Rémunération & facturation">
            {pricingMode === 'forfait'
              ? `Forfait de ${formatAmount(forfaitTotal)} HT pour la prestation complète. `
              : `Tarif indicatif de ${hourlyRate} €/h, facturation forfaitaire au rendu de la prestation. `}
            Le prestataire émet sa facture auto-entrepreneur à la fin de la mission avec les mentions légales obligatoires.
          </Clause>

          <Clause title="6. Délais de paiement">
            Paiement sous 7 jours calendaires après validation de la prestation, via la plateforme TEMPO. La commission plateforme est prélevée à la source.
          </Clause>

          <Clause title="7. Responsabilité">
            Le prestataire est seul responsable des moyens qu'il met en œuvre et garantit le résultat attendu. Il dispose de sa propre assurance responsabilité civile professionnelle.
          </Clause>

          <Clause title="8. Durée & résiliation">
            Mission ponctuelle et non reconductible automatiquement. Chaque partie peut y mettre fin en cas de manquement grave dûment notifié.
          </Clause>

          <Clause title="9. Médiation">
            En cas de litige, les parties s'engagent à saisir le service de médiation TEMPO avant toute action judiciaire.
          </Clause>
        </div>

        {/* Signature */}
        <SignatureCanvas onSave={setSignature} label={`Signature ${role === 'worker' ? 'du prestataire' : 'du donneur d\'ordre'}`} />

        {signature && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--gr-l)', borderRadius: 8, fontSize: 12, color: 'var(--gr-d)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✓</span>
            Signature enregistrée
          </div>
        )}

        {/* Acceptation */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)}
            style={{ marginTop: 2, accentColor: 'var(--or)' }} />
          <span style={{ fontSize: 12, color: 'var(--g6)', lineHeight: 1.5 }}>
            {role === 'worker'
              ? "J'accepte les conditions du contrat de prestation et je confirme exercer en qualité d'indépendant, en toute autonomie. Ma signature électronique a la même valeur juridique qu'une signature manuscrite (eIDAS)."
              : "J'accepte les conditions du contrat de prestation et confirme qu'il s'agit d'une prestation ponctuelle et autonome, sans lien de subordination avec le prestataire. Ma signature électronique a valeur eIDAS."}
          </span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" onClick={onClose} disabled={signing}
            style={{ flex: 1, padding: '11px', border: '1px solid var(--g2)', borderRadius: 10, background: 'var(--wh)', fontSize: 13, color: 'var(--g6)' }}>
            Annuler
          </button>
          <button type="button" onClick={handleSign} disabled={!signature || !accepted || signing}
            aria-label={signing ? 'Signature en cours' : 'Signer le contrat'}
            style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, background: 'var(--or)', color: '#fff', fontSize: 13, fontWeight: 500, opacity: (!signature || !accepted || signing) ? 0.45 : 1, cursor: (!signature || !accepted || signing) ? 'not-allowed' : 'pointer', transition: 'opacity .15s' }}>
            {signing ? 'Signature en cours…' : 'Signer le contrat'}
          </button>
        </div>
      </div>
    </div>
  )
}
