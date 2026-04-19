import { useEffect, useMemo, useState } from 'react'
import { T } from '../../design/tokens'
import { Pill, Eyebrow, LiveDot } from '../../design/primitives'
import LoadingState from '../../components/UI/LoadingState'
import ConfirmDialog from '../../components/UI/ConfirmDialog'
import { useMissionTimeEntries } from '../../hooks/worker/useMissionTimeEntries'
import { formatDate } from '../../lib/formatters'
import { getContract } from '../../lib/supabase'

// ═══════════════════════════════════════════════════════════════
// WorkerMissionHub — tableau de bord pour UNE mission active du worker.
//
// Cœur fonctionnel : déclarer ses heures travaillées pour la mission,
// soumettre à la company pour validation, voir les actions rapides
// (message / adresse / contrat / signaler).
//
// Props :
// - mission : l'objet mission (title, city, address, hourly_rate, ...)
// - contract : le contrat signé ({ id, status, worker_id, company_id })
// - worker : { id, ... }
// - onBack, onOpenChat, onOpenContract, onViewCompany
// ═══════════════════════════════════════════════════════════════

function minutesToLabel(mins) {
  if (!mins || mins < 0) return '0h'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}` : `${h}h`
}

function combineDateTime(dateStr, timeStr) {
  // dateStr = 'YYYY-MM-DD', timeStr = 'HH:MM'
  if (!dateStr || !timeStr) return null
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

// Date du jour au format YYYY-MM-DD (pas ISO — pour input[type=date])
function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function WorkerMissionHub({
  mission,
  contract: contractProp,
  worker,
  onBack,
  onOpenChat,
  onOpenContract,
  onViewCompany,
  showToast,
}) {
  // Si le parent ne fournit pas le contrat (cas standard : il a juste
  // mission_id), on le charge nous-mêmes pour avoir contract.id.
  const [contract, setContract] = useState(contractProp || null)
  const [loadingContract, setLoadingContract] = useState(!contractProp)

  useEffect(() => {
    if (contractProp) { setContract(contractProp); setLoadingContract(false); return }
    if (!mission?.id) { setLoadingContract(false); return }
    let cancelled = false
    setLoadingContract(true)
    getContract(mission.id).then(({ data }) => {
      if (cancelled) return
      setContract(data || null)
      setLoadingContract(false)
    })
    return () => { cancelled = true }
  }, [mission?.id, contractProp])

  const {
    entries, loading: loadingEntries, create, update, remove, submit,
    totalWorkedMinutes, totalByStatus,
  } = useMissionTimeEntries(worker?.id, { contractId: contract?.id })

  const loading = loadingContract || loadingEntries

  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    date: todayISO(),
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 30,
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // entry.id or null
  const [deleting, setDeleting] = useState(false)

  const canSubmit = useMemo(() => {
    return entries.some(e => e.status === 'draft')
  }, [entries])

  const resetForm = () => {
    setEditingId(null)
    setForm({ date: todayISO(), startTime: '08:00', endTime: '16:00', breakMinutes: 30, note: '' })
  }

  const handleSave = async () => {
    if (!contract?.id || !worker?.id || !mission?.company_id) {
      showToast?.('Contrat ou mission manquant — impossible de saisir des heures', 'error')
      return
    }
    const startedAt = combineDateTime(form.date, form.startTime)
    const endedAt = combineDateTime(form.date, form.endTime)
    if (!startedAt || !endedAt || new Date(endedAt) <= new Date(startedAt)) {
      showToast?.('L\'heure de fin doit être après l\'heure de début', 'error')
      return
    }
    const payload = {
      contractId: contract.id,
      workerId: worker.id,
      companyId: mission.company_id || mission.companies?.id,
      workDate: form.date,
      startedAt,
      endedAt,
      breakMinutes: parseInt(form.breakMinutes, 10) || 0,
      note: form.note.trim() || null,
    }

    if (editingId) {
      const { error } = await update(editingId, {
        startedAt: payload.startedAt,
        endedAt: payload.endedAt,
        breakMinutes: payload.breakMinutes,
        note: payload.note,
        workDate: payload.workDate,
      })
      if (error) { showToast?.('Erreur modification', 'error'); return }
      showToast?.('Heures modifiées', 'success')
    } else {
      const { error } = await create(payload)
      if (error) { showToast?.('Erreur création', 'error'); return }
      showToast?.('Heures enregistrées en brouillon', 'success')
    }
    resetForm()
  }

  const handleEdit = (entry) => {
    const d = new Date(entry.started_at)
    const dEnd = new Date(entry.ended_at)
    setEditingId(entry.id)
    setForm({
      date: entry.work_date,
      startTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(dEnd.getHours()).padStart(2, '0')}:${String(dEnd.getMinutes()).padStart(2, '0')}`,
      breakMinutes: entry.break_minutes || 0,
      note: entry.note || '',
    })
    if (typeof window !== 'undefined') {
      // Respecte prefers-reduced-motion pour les users avec vestibular disorder
      const reduceMotion = typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    const { error } = await remove(confirmDelete)
    setDeleting(false)
    setConfirmDelete(null)
    if (error) { showToast?.('Erreur suppression', 'error'); return }
    showToast?.('Saisie supprimée', 'success')
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    const { error } = await submit(contract.id)
    setSubmitting(false)
    if (error) {
      showToast?.('Erreur lors de la soumission', 'error')
      return
    }
    showToast?.('Heures soumises à l\'entreprise', 'success')
  }

  if (!mission) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.color.g5 }}>
        Aucune mission active sélectionnée.
      </div>
    )
  }
  if (loading) return <LoadingState label="Chargement des heures" />

  const companyName = mission.companies?.name || 'Entreprise'
  const draftsCount = totalByStatus.draft || 0
  const submittedCount = totalByStatus.submitted || 0
  const validatedCount = totalByStatus.validated || 0

  return (
    <div>
      {/* Hero mission */}
      <div style={{
        background: T.color.navy, color: '#fff',
        padding: '24px 28px', borderRadius: T.radius.lg,
        marginBottom: T.space[6],
      }}>
        <Eyebrow color="rgba(255,255,255,0.55)" style={{ marginBottom: 8 }}>
          Mission en cours · {companyName}
        </Eyebrow>
        <h2 style={{
          margin: 0, fontSize: T.size.xxl, fontWeight: 800,
          lineHeight: 1.08, letterSpacing: '-0.022em',
          fontFamily: T.font.body, color: '#fff',
        }}>
          {mission.title}
        </h2>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill variant="white">{mission.city || 'Lieu à préciser'}</Pill>
          {mission.hourly_rate && <Pill variant="white">{mission.hourly_rate} €/h</Pill>}
          {mission.start_date && <Pill variant="white">Démarrée le {formatDate(mission.start_date)}</Pill>}
          <Pill variant="white" icon={<LiveDot color={T.color.green} size={6} />}>Actif</Pill>
        </div>

        {/* Résumé heures */}
        <div style={{
          marginTop: T.space[5],
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: T.space[3],
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: T.space[4],
        }} className="grid-2-mobile-1">
          <MiniStat label="Total saisi" value={minutesToLabel(totalWorkedMinutes)} />
          <MiniStat label="En brouillon" value={`${draftsCount}`} accent={draftsCount > 0 ? T.color.amber : undefined} />
          <MiniStat label="Validées" value={`${validatedCount}`} accent={T.color.green} />
        </div>
      </div>

      {/* Formulaire saisie */}
      <div className="a-card" style={{ padding: T.space[5], marginBottom: T.space[5] }}>
        <Eyebrow style={{ marginBottom: T.space[3] }}>
          {editingId ? 'Modifier la saisie' : 'Déclarer mes heures'}
        </Eyebrow>
        <div className="grid-2-mobile-1" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: T.space[3],
        }}>
          <Field label="Date">
            <input
              className="a-input"
              type="date"
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field label="Début">
            <input
              className="a-input"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
            />
          </Field>
          <Field label="Fin">
            <input
              className="a-input"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))}
            />
          </Field>
          <Field label="Pause (min)">
            <input
              className="a-input"
              type="number"
              min={0}
              max={240}
              step={5}
              value={form.breakMinutes}
              onChange={(e) => setForm(f => ({ ...f, breakMinutes: e.target.value }))}
            />
          </Field>
        </div>

        <Field label="Note (optionnel)" style={{ marginTop: T.space[3] }}>
          <input
            className="a-input"
            placeholder="Ex : retard de 15 min dû au trafic"
            value={form.note}
            onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))}
          />
        </Field>

        <div style={{ marginTop: T.space[4], display: 'flex', gap: T.space[2], flexWrap: 'wrap' }}>
          <button type="button" className="a-btn-primary" onClick={handleSave}>
            {editingId ? 'Enregistrer les modifications' : 'Enregistrer'}
          </button>
          {editingId && (
            <button type="button" className="a-btn-outline" onClick={resetForm}>
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Liste des entries */}
      <div style={{ marginBottom: T.space[5] }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: T.space[3], gap: T.space[3], flexWrap: 'wrap',
        }}>
          <div>
            <Eyebrow>Mes saisies ({entries.length})</Eyebrow>
          </div>
          {canSubmit && (
            <button
              type="button"
              className="a-btn-primary"
              onClick={handleSubmit}
              disabled={submitting}
              aria-busy={submitting ? 'true' : undefined}
            >
              {submitting ? 'Envoi…' : `Soumettre ${draftsCount} brouillon${draftsCount > 1 ? 's' : ''} à validation`}
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="a-card" style={{ padding: T.space[6], textAlign: 'center', color: T.color.g5 }}>
            Aucune saisie pour l'instant. Commencez en remplissant le formulaire ci-dessus.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: T.space[2] }}>
            {entries.map(entry => (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                onEdit={handleEdit}
                onDelete={(id) => setConfirmDelete(id)}
              />
            ))}
          </div>
        )}
        {submittedCount > 0 && (
          <div style={{ marginTop: T.space[3], fontSize: T.size.sm, color: T.color.g5, textAlign: 'center' }}>
            {submittedCount} saisie{submittedCount > 1 ? 's' : ''} en attente de validation par l'entreprise.
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div style={{ marginBottom: T.space[5] }}>
        <Eyebrow style={{ marginBottom: T.space[3] }}>Actions rapides</Eyebrow>
        <div className="grid-2-mobile-1" style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: T.space[3],
        }}>
          <QuickAction
            label={`Message à ${companyName}`}
            onClick={() => onOpenChat?.(mission.company_id || mission.companies?.id, companyName, mission.id)}
          />
          <QuickAction
            label="Voir l'adresse"
            hint={mission.address || mission.city || '—'}
            onClick={undefined}
            disabled={!mission.address && !mission.city}
          />
          <QuickAction
            label="Contrat signé"
            onClick={onOpenContract}
          />
          <QuickAction
            label={`Profil ${companyName}`}
            onClick={() => onViewCompany?.(mission.company_id || mission.companies?.id, mission.companies)}
          />
        </div>
      </div>

      {onBack && (
        <button type="button" className="a-btn-outline" onClick={onBack}>
          ← Retour
        </button>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Supprimer cette saisie ?"
        description="Le brouillon sera définitivement retiré. Les saisies déjà validées ne peuvent pas être supprimées."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        danger
        loading={deleting}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

// ── Sous-composants ─────────────────────────────────────────────

function Field({ label, children, style }) {
  // biome-ignore lint/a11y/noLabelWithoutControl: input passé via children, biome ne peut pas l'inférer
  return (
    <label style={{ display: 'block', ...style }}>
      <span style={{
        display: 'block', fontSize: T.size.sm, fontWeight: 600,
        color: T.color.g8, marginBottom: 6,
      }}>{label}</span>
      {children}
    </label>
  )
}

function MiniStat({ label, value, accent }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, fontFamily: T.font.mono, letterSpacing: 1.4,
        color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: 600,
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: T.size.xl, fontWeight: 800,
        color: accent || '#fff', letterSpacing: '-0.015em',
        lineHeight: 1.05,
      }}>{value}</div>
    </div>
  )
}

function TimeEntryRow({ entry, onEdit, onDelete }) {
  const started = new Date(entry.started_at)
  const ended = new Date(entry.ended_at)
  const timeLabel = `${String(started.getHours()).padStart(2, '0')}:${String(started.getMinutes()).padStart(2, '0')} → ${String(ended.getHours()).padStart(2, '0')}:${String(ended.getMinutes()).padStart(2, '0')}`
  const canEdit = entry.status === 'draft'
  const statusPill = {
    draft:     { label: 'Brouillon', variant: 'neutral' },
    submitted: { label: 'En attente', variant: 'amber' },
    validated: { label: 'Validée',   variant: 'green' },
    disputed:  { label: 'Contestée', variant: 'red' },
    billed:    { label: 'Facturée',  variant: 'brand' },
  }[entry.status] || { label: entry.status, variant: 'neutral' }

  return (
    <div className="a-card" style={{
      padding: T.space[3], display: 'flex', alignItems: 'center',
      gap: T.space[3], flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: T.size.base, fontWeight: 700, color: T.color.ink }}>
          {formatDate(entry.work_date)} · {timeLabel}
        </div>
        <div style={{ fontSize: T.size.sm, color: T.color.g5, marginTop: 2 }}>
          {minutesToLabel(entry.worked_minutes)}
          {entry.break_minutes > 0 ? ` · pause ${entry.break_minutes} min` : ''}
          {entry.note ? ` · ${entry.note}` : ''}
        </div>
      </div>
      <Pill variant={statusPill.variant} size="xs">{statusPill.label}</Pill>
      {canEdit && (
        <div style={{ display: 'flex', gap: T.space[1] }}>
          <button type="button" onClick={() => onEdit(entry)}
            style={iconBtnStyle(T.color.brand)}
            aria-label="Modifier">
            ✎
          </button>
          <button type="button" onClick={() => onDelete(entry.id)}
            style={iconBtnStyle(T.color.red)}
            aria-label="Supprimer">
            🗑
          </button>
        </div>
      )}
    </div>
  )
}

function QuickAction({ label, hint, onClick, disabled }) {
  const isButton = !!onClick && !disabled
  const Component = isButton ? 'button' : 'div'
  return (
    <Component
      type={isButton ? 'button' : undefined}
      onClick={isButton ? onClick : undefined}
      disabled={disabled}
      className="a-card"
      style={{
        padding: T.space[4], display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', gap: 4, textAlign: 'left',
        background: isButton ? '#fff' : T.color.g1,
        border: `1px solid ${T.color.g2}`, borderRadius: T.radius.md,
        cursor: isButton ? 'pointer' : 'default',
        color: 'inherit', font: 'inherit',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span style={{ fontSize: T.size.base, fontWeight: 600, color: T.color.ink }}>{label}</span>
      {hint && <span style={{ fontSize: T.size.sm, color: T.color.g5 }}>{hint}</span>}
    </Component>
  )
}

function iconBtnStyle(color) {
  return {
    background: 'none', border: `1px solid ${T.color.g2}`,
    color, cursor: 'pointer',
    padding: '6px 10px', borderRadius: T.radius.sm,
    fontSize: T.size.sm,
  }
}
