import { useEffect, useMemo, useState } from 'react'
import { T } from '../../design/tokens'
import { Pill, Eyebrow } from '../../design/primitives'
import LoadingState from '../../components/UI/LoadingState'
import ConfirmDialog from '../../components/UI/ConfirmDialog'
import {
  getTimeEntries,
  validateTimeEntries,
  disputeTimeEntries,
} from '../../lib/supabase'
import { captureError } from '../../lib/sentry'
import { formatDate } from '../../lib/formatters'

// ═══════════════════════════════════════════════════════════════
// CompanyTimeValidation — écran company pour valider/contester les
// heures soumises par les workers.
//
// Regroupe les time_entries par contract_id (= par worker × mission).
// Pour chaque groupe, actions : Valider (toutes) ou Contester (note obligatoire).
//
// Props :
// - companyId : auth user id
// - showToast : callback feedback
// - onNavigate : pour redirection après action
// ═══════════════════════════════════════════════════════════════

function minutesToLabel(mins) {
  if (!mins || mins < 0) return '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`
}

export default function CompanyTimeValidation({ companyId, showToast }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingContract, setActionLoadingContract] = useState(null)
  const [disputeModal, setDisputeModal] = useState(null) // { contractId, workerName }
  const [disputeNote, setDisputeNote] = useState('')
  const [validateConfirm, setValidateConfirm] = useState(null) // contractId or null

  const load = async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    // On filtre côté serveur : entries de cette company en statut submitted
    const { data, error } = await getTimeEntries({
      companyId,
      statuses: ['submitted', 'disputed'],
    })
    if (error) {
      captureError(error, { source: 'CompanyTimeValidation.load' })
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [companyId])

  // Group by contract_id
  const grouped = useMemo(() => {
    const g = {}
    for (const e of entries) {
      const key = e.contract_id
      if (!g[key]) {
        g[key] = {
          contractId: e.contract_id,
          missionTitle: e.contracts?.missions?.title || 'Mission',
          missionCity: e.contracts?.missions?.city || '',
          workerId: e.worker_id,
          entries: [],
          totalMinutes: 0,
          latestStatus: e.status,
          latestSubmittedAt: e.submitted_at,
        }
      }
      g[key].entries.push(e)
      g[key].totalMinutes += e.worked_minutes || 0
      if (new Date(e.submitted_at || 0) > new Date(g[key].latestSubmittedAt || 0)) {
        g[key].latestSubmittedAt = e.submitted_at
      }
      if (e.status === 'disputed') g[key].latestStatus = 'disputed'
    }
    return Object.values(g).sort((a, b) =>
      new Date(b.latestSubmittedAt || 0) - new Date(a.latestSubmittedAt || 0)
    )
  }, [entries])

  const handleValidateConfirmed = async () => {
    const contractId = validateConfirm
    if (!contractId) return
    setActionLoadingContract(contractId)
    const { error } = await validateTimeEntries(contractId)
    setActionLoadingContract(null)
    setValidateConfirm(null)
    if (error) {
      showToast?.('Erreur lors de la validation', 'error')
      return
    }
    showToast?.('Heures validées', 'success')
    await load()
  }

  const openDispute = (contractId, workerName) => {
    setDisputeModal({ contractId, workerName })
    setDisputeNote('')
  }

  const handleDispute = async () => {
    if (!disputeModal || !disputeNote.trim()) return
    setActionLoadingContract(disputeModal.contractId)
    const { error } = await disputeTimeEntries(disputeModal.contractId, disputeNote.trim())
    setActionLoadingContract(null)
    if (error) {
      showToast?.('Erreur lors de la contestation', 'error')
      return
    }
    showToast?.('Heures contestées — admin notifié', 'success')
    setDisputeModal(null)
    setDisputeNote('')
    await load()
  }

  if (loading) return <LoadingState label="Chargement des heures à valider" />

  return (
    <div>
      <div style={{ marginBottom: T.space[6] }}>
        <Eyebrow style={{ marginBottom: 8 }}>Heures à valider</Eyebrow>
        <h2 style={{
          margin: 0, fontSize: T.size.xxl, fontWeight: 800,
          letterSpacing: '-0.022em', color: T.color.ink,
          lineHeight: 1.08,
        }}>
          {grouped.length === 0
            ? <>Aucune heure <span className="font-serif-italic" style={{ color: T.color.brand }}>à valider</span>.</>
            : <>{grouped.length} contrat{grouped.length > 1 ? 's' : ''} <span className="font-serif-italic" style={{ color: T.color.brand }}>en attente</span>.</>
          }
        </h2>
        {grouped.length > 0 && (
          <div style={{ marginTop: 8, fontSize: T.size.base, color: T.color.g5 }}>
            Validation sous 7 jours ou acceptation tacite automatique (L.3171-4).
          </div>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="a-card" style={{ padding: T.space[7], textAlign: 'center', color: T.color.g5 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
          <div style={{ fontSize: T.size.md, fontWeight: 600, color: T.color.ink, marginBottom: 6 }}>
            Tout est à jour
          </div>
          <div style={{ fontSize: T.size.sm }}>
            Les workers pourront soumettre leurs heures ici pour validation.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[4] }}>
          {grouped.map(group => (
            <ContractGroup
              key={group.contractId}
              group={group}
              disabled={actionLoadingContract === group.contractId}
              onValidate={(cid) => setValidateConfirm(cid)}
              onDispute={openDispute}
            />
          ))}
        </div>
      )}

      {/* Dispute modal */}
      {disputeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispute-title"
          style={{
            position: 'fixed', inset: 0, zIndex: T.z.modal,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: T.space[5],
          }}
        >
          <div className="a-card" style={{
            maxWidth: 480, width: '100%', padding: T.space[6],
          }}>
            <div id="dispute-title" style={{
              fontSize: T.size.lg, fontWeight: 700, color: T.color.ink,
              marginBottom: T.space[2],
            }}>
              Contester les heures
            </div>
            <div style={{ fontSize: T.size.sm, color: T.color.g5, marginBottom: T.space[4] }}>
              Décrivez précisément le désaccord. Un admin sera notifié
              pour arbitrer le litige sous 48 h.
            </div>
            <textarea
              className="a-input"
              rows={4}
              placeholder="Ex : La pause déjeuner déclarée de 30 min semble plus proche de 60 min selon les caméras du site."
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              style={{ resize: 'vertical', width: '100%' }}
            />
            <div style={{
              marginTop: T.space[4], display: 'flex', gap: T.space[2],
              justifyContent: 'flex-end', flexWrap: 'wrap',
            }}>
              <button
                type="button"
                className="a-btn-outline"
                onClick={() => { setDisputeModal(null); setDisputeNote('') }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="a-btn-primary"
                onClick={handleDispute}
                disabled={!disputeNote.trim() || actionLoadingContract === disputeModal.contractId}
              >
                {actionLoadingContract === disputeModal.contractId ? 'Envoi…' : 'Envoyer la contestation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!validateConfirm}
        title="Valider ces heures ?"
        description="Les heures seront figées et servent de base à la facturation. Cette action est définitive."
        confirmLabel="Valider"
        cancelLabel="Annuler"
        loading={actionLoadingContract === validateConfirm}
        onConfirm={handleValidateConfirmed}
        onCancel={() => setValidateConfirm(null)}
      />
    </div>
  )
}

function ContractGroup({ group, disabled, onValidate, onDispute }) {
  const { contractId, missionTitle, missionCity, entries, totalMinutes, latestStatus } = group
  const isDisputed = latestStatus === 'disputed'

  return (
    <div className="a-card" style={{ padding: T.space[5] }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: T.space[3], flexWrap: 'wrap', marginBottom: T.space[3],
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: T.size.base, fontWeight: 700, color: T.color.ink,
            marginBottom: 2,
          }}>
            {missionTitle}
          </div>
          <div style={{ fontSize: T.size.sm, color: T.color.g5 }}>
            {missionCity ? `${missionCity} · ` : ''}
            {entries.length} saisie{entries.length > 1 ? 's' : ''} · {minutesToLabel(totalMinutes)} total
          </div>
        </div>
        <Pill variant={isDisputed ? 'red' : 'amber'} size="xs">
          {isDisputed ? 'Contestées' : 'En attente'}
        </Pill>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: T.space[2],
        padding: T.space[3],
        background: T.color.g1, borderRadius: T.radius.sm,
        marginBottom: T.space[3],
      }}>
        {entries.map(e => {
          const started = new Date(e.started_at)
          const ended = new Date(e.ended_at)
          const timeLabel = `${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')} → ${String(ended.getHours()).padStart(2, '0')}:${String(ended.getMinutes()).padStart(2, '0')}`
          return (
            <div key={e.id} style={{ display: 'flex', gap: T.space[3], fontSize: T.size.sm, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, color: T.color.ink, minWidth: 80 }}>
                {formatDate(e.work_date)}
              </div>
              <div style={{ color: T.color.g8 }}>{timeLabel}</div>
              <div style={{ color: T.color.g5 }}>
                {minutesToLabel(e.worked_minutes)}
                {e.break_minutes > 0 ? ` (pause ${e.break_minutes} min)` : ''}
              </div>
              {e.note && (
                <div style={{ color: T.color.g5, fontStyle: 'italic', flex: '1 1 100%', paddingLeft: 80 }}>
                  « {e.note} »
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!isDisputed && (
        <div style={{ display: 'flex', gap: T.space[2], flexWrap: 'wrap' }}>
          <button
            type="button"
            className="a-btn-primary"
            onClick={() => onValidate(contractId)}
            disabled={disabled}
          >
            {disabled ? 'Traitement…' : `✓ Valider ces ${entries.length} saisie${entries.length > 1 ? 's' : ''}`}
          </button>
          <button
            type="button"
            className="a-btn-outline"
            onClick={() => onDispute(contractId, missionTitle)}
            disabled={disabled}
          >
            Contester
          </button>
        </div>
      )}
      {isDisputed && (
        <div style={{
          padding: T.space[3],
          background: `${T.color.red}10`,
          border: `1px solid ${T.color.red}30`,
          borderRadius: T.radius.sm,
          fontSize: T.size.sm, color: T.color.red,
        }}>
          Contestation envoyée à l'admin. Arbitrage sous 48 h.
        </div>
      )}
    </div>
  )
}
