import { useMemo, useState } from 'react'
import { T } from '../../design/tokens'
import { Pill, Eyebrow, LiveDot } from '../../design/primitives'
import { markNotifsRead } from '../../lib/supabase'

// ═══════════════════════════════════════════════════════════════
// NotificationsView — liste unifiée pour worker ET entreprise.
// Style A : eyebrow mono · H1 éditorial · filter pills · rows par
// type avec icône + couleur + deep-link d'action.
// ═══════════════════════════════════════════════════════════════

// Map type → { label, icon, color, targetScreen, targetExtractor }
// targetExtractor(payload) → string opaque passé au callback onNavigate
const TYPE_META = {
  // Côté worker
  new_mission: { label: 'Nouvelle mission', icon: '▤', color: T.color.brand },
  mission_matched: { label: 'Mission confirmée', icon: '✦', color: T.color.green },
  application_accepted: { label: 'Candidature acceptée', icon: '✓', color: T.color.green },
  application_rejected: { label: 'Candidature refusée', icon: '✗', color: T.color.red },
  contract_generated: { label: 'Contrat à signer', icon: '✍', color: T.color.brand },
  contract_signed: { label: 'Contrat signé', icon: '✓', color: T.color.green },
  payment_received: { label: 'Paiement reçu', icon: '€', color: T.color.green },
  invoice_paid: { label: 'Facture payée', icon: '€', color: T.color.green },
  rating_received: { label: 'Avis reçu', icon: '★', color: T.color.amber },
  kyc_validated: { label: 'KYC validé', icon: '✓', color: T.color.green },
  kyc_rejected: { label: 'KYC refusé', icon: '!', color: T.color.red },
  mission_reminder: { label: 'Rappel mission', icon: '⏰', color: T.color.amber },
  mission_closed: { label: 'Mission clôturée', icon: '●', color: T.color.g5 },
  mission_completed: { label: 'Mission terminée', icon: '✓', color: T.color.green },
  invoice_created: { label: 'Facture émise', icon: '€', color: T.color.brand },
  invoice_overdue: { label: 'Facture en retard', icon: '!', color: T.color.red },
  new_message: { label: 'Nouveau message', icon: '✉', color: T.color.brand },

  // Côté entreprise
  application_received: { label: 'Nouvelle candidature', icon: '↗', color: T.color.brand },
  application_withdrawn: { label: 'Candidature retirée', icon: '←', color: T.color.g5 },

  // Disputes / fraud
  fraud_case_opened: { label: 'Litige ouvert', icon: '!', color: T.color.red },
  fraud_case_updated: { label: 'Litige mis à jour', icon: '●', color: T.color.amber },
  fraud_case_resolved: { label: 'Litige clôturé', icon: '✓', color: T.color.green },
  fraud_case_escalated: { label: 'Litige escaladé', icon: '!', color: T.color.red },
  fraud_signal_detected: { label: 'Signal de fraude', icon: '!', color: T.color.amber },

  // Amendments
  amendment_proposed: { label: 'Avenant proposé', icon: '✎', color: T.color.brand },
  amendment_approved: { label: 'Avenant accepté', icon: '✓', color: T.color.green },
  amendment_rejected: { label: 'Avenant refusé', icon: '✗', color: T.color.red },
  amendment_cancelled: { label: 'Avenant annulé', icon: '←', color: T.color.g5 },

  // Account
  account_suspended: { label: 'Compte suspendu', icon: '!', color: T.color.red },
  account_unsuspended: { label: 'Compte réactivé', icon: '✓', color: T.color.green },

  // Requalification / trust
  requalification_level_changed: { label: 'Statut de risque modifié', icon: '●', color: T.color.amber },
  trust_score_critical: { label: 'Score de confiance critique', icon: '!', color: T.color.red },

  // Ca threshold
  ca_threshold_alert: { label: 'Seuil CA atteint', icon: '●', color: T.color.amber },
  dispute_escalated: { label: 'Litige escaladé', icon: '!', color: T.color.red },
  time_entries_submitted: { label: 'Heures soumises', icon: '⏱', color: T.color.brand },
  time_entries_validated: { label: 'Heures validées', icon: '✓', color: T.color.green },
  time_entries_disputed: { label: 'Heures contestées', icon: '!', color: T.color.amber },
  time_entries_reminder: { label: 'Rappel pointage', icon: '⏱', color: T.color.amber },
}

// Catégorisation pour les filter pills
const CATEGORIES = [
  { key: 'all', label: 'Toutes', match: () => true },
  { key: 'unread', label: 'Non lues', match: n => !n.read_at },
  { key: 'missions', label: 'Missions', match: n => /^(new_mission|mission_|application_)/.test(n.type) },
  { key: 'contracts', label: 'Contrats', match: n => /^(contract_|amendment_)/.test(n.type) },
  { key: 'payments', label: 'Paiements', match: n => /^(payment_|invoice_|ca_)/.test(n.type) },
  { key: 'fraud', label: 'Litiges', match: n => /^(fraud_|dispute_|trust_|account_)/.test(n.type) },
]

// Routing du clic — dépend du rôle (worker/company) + type + payload
function resolveTarget(notif, role) {
  const payload = notif.payload || {}
  const type = notif.type

  // Cas communs
  if (/^fraud_case_/.test(type) && payload.case_id) {
    return { screen: 'disputes', payload: { caseId: payload.case_id } }
  }
  if (type === 'new_message' && payload.partner_id) {
    return { screen: 'chat', payload: { partnerId: payload.partner_id, missionId: payload.mission_id || null } }
  }

  // Worker
  if (role === 'worker') {
    if (type === 'mission_matched' || type === 'contract_generated' || type === 'new_mission') {
      return { screen: 'mission-detail', payload: { missionId: payload.mission_id } }
    }
    if (type === 'application_accepted' || type === 'application_rejected') {
      return { screen: 'suivi', payload: {} }
    }
    if (type === 'invoice_paid' || type === 'invoice_created' || type === 'payment_received') {
      return { screen: 'gains', payload: {} }
    }
    if (type === 'kyc_validated' || type === 'kyc_rejected') {
      return { screen: 'profil', payload: {} }
    }
    if (type === 'rating_received') {
      return { screen: 'profil', payload: {} }
    }
    if (type === 'mission_reminder') {
      return { screen: 'mission-detail', payload: { missionId: payload.mission_id } }
    }
  }

  // Entreprise
  if (role === 'company') {
    if (type === 'application_received' && payload.mission_id) {
      return { screen: 'candidatures', payload: { missionId: payload.mission_id } }
    }
    if (type === 'contract_signed' || type === 'contract_generated') {
      return { screen: 'contrats', payload: {} }
    }
    if (type === 'invoice_paid' || type === 'invoice_created') {
      return { screen: 'contrats', payload: {} }
    }
    if (type === 'mission_completed' || type === 'mission_closed') {
      return { screen: 'dashboard', payload: {} }
    }
  }

  return { screen: null, payload: {} }
}

export default function NotificationsView({ notifs = [], setNotifs, userId, unreadCount = 0, role = 'worker', onBack, onNavigate }) {
  const [category, setCategory] = useState('all')

  const filtered = useMemo(() => {
    const cat = CATEGORIES.find(c => c.key === category) || CATEGORIES[0]
    return (notifs || []).filter(cat.match)
  }, [notifs, category])

  const markAllRead = async () => {
    await markNotifsRead(userId)
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
  }

  const handleClickNotif = async (n) => {
    // Marque la notif comme lue (optimiste)
    if (!n.read_at) {
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
    }
    const target = resolveTarget(n, role)
    if (target.screen && onNavigate) {
      onNavigate(target.screen, target.payload)
    }
  }

  // Group par "aujourd'hui / hier / plus anciens"
  const groups = useMemo(() => {
    const g = { today: [], yesterday: [], older: [] }
    const now = new Date()
    const todayIso = now.toISOString().slice(0, 10)
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
    const yesterdayIso = yesterday.toISOString().slice(0, 10)
    filtered.forEach(n => {
      const d = new Date(n.created_at).toISOString().slice(0, 10)
      if (d === todayIso) g.today.push(n)
      else if (d === yesterdayIso) g.yesterday.push(n)
      else g.older.push(n)
    })
    return g
  }, [filtered])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <Eyebrow style={{ fontSize: T.size.xs, letterSpacing: 1.6, marginBottom: 8 }}>Notifications</Eyebrow>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.color.ink, letterSpacing: '-0.025em', lineHeight: 1.05 }}>
            {unreadCount > 0
              ? <><span className="font-serif-italic" style={{ color: T.color.brand }}>{unreadCount}</span> {unreadCount > 1 ? 'nouvelles' : 'nouvelle'}.</>
              : <>Tout est <span className="font-serif-italic" style={{ color: T.color.brand }}>à jour</span>.</>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <button type="button" className="a-btn-outline" onClick={markAllRead} style={{ padding: '8px 14px', fontSize: 12 }}>
              ✓ Tout marquer comme lu
            </button>
          )}
          {onBack && (
            <button type="button" className="a-btn-outline" onClick={onBack} style={{ padding: '8px 14px', fontSize: 12 }}>
              ← Retour
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: T.color.g1, borderRadius: 999, marginBottom: 20, flexWrap: 'wrap', maxWidth: '100%' }}>
        {CATEGORIES.map(c => {
          const count = c.key === 'all' ? notifs.length : notifs.filter(c.match).length
          const active = category === c.key
          return (
            <button key={c.key} type="button"
              onClick={() => setCategory(c.key)}
              style={{
                padding: '8px 14px', border: 'none',
                background: active ? '#fff' : 'transparent',
                color: active ? T.color.ink : T.color.g5,
                fontSize: T.size.sm, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
                boxShadow: active ? '0 1px 3px rgba(15,23,42,.08)' : 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              {c.label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, fontFamily: T.font.mono,
                  background: active ? T.color.g1 : 'rgba(255,255,255,0.7)',
                  color: active ? T.color.g5 : T.color.g6,
                  padding: '1px 6px', borderRadius: 99,
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="a-card" style={{ padding: '60px 20px', textAlign: 'center', color: T.color.g5 }}>
          <div style={{ fontSize: T.size.xxl, marginBottom: 12 }}>✉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.color.ink, marginBottom: 6 }}>Aucune notification</div>
          <div style={{ fontSize: 13 }}>
            {category === 'unread' ? 'Vous êtes à jour.' : 'Les événements apparaîtront ici en temps réel.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {groups.today.length > 0 && (
            <NotifGroup title="Aujourd'hui" notifs={groups.today} onClick={handleClickNotif} role={role} />
          )}
          {groups.yesterday.length > 0 && (
            <NotifGroup title="Hier" notifs={groups.yesterday} onClick={handleClickNotif} role={role} />
          )}
          {groups.older.length > 0 && (
            <NotifGroup title="Plus ancien" notifs={groups.older} onClick={handleClickNotif} role={role} />
          )}
        </div>
      )}
    </div>
  )
}

function NotifGroup({ title, notifs, onClick, role }) {
  return (
    <section>
      <Eyebrow style={{ fontSize: 10.5, letterSpacing: 1.6, marginBottom: 10 }}>{title}</Eyebrow>
      <div className="a-card" style={{ padding: 8, display: 'flex', flexDirection: 'column' }}>
        {notifs.map(n => {
          const meta = TYPE_META[n.type] || { label: n.type, icon: '•', color: T.color.g5 }
          const unread = !n.read_at
          const target = resolveTarget(n, role)
          const hasAction = !!target.screen
          return (
            <button key={n.id} type="button"
              onClick={() => onClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '14px 14px', border: 'none', borderRadius: 12,
                background: unread ? T.color.brandL : 'transparent',
                cursor: hasAction ? 'pointer' : 'default',
                textAlign: 'left', width: '100%',
                transition: 'background .12s',
              }}
              onMouseEnter={e => { if (!unread) e.currentTarget.style.background = T.color.g1 }}
              onMouseLeave={e => { if (!unread) e.currentTarget.style.background = 'transparent' }}
            >
              {/* Dot coloré / icône */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: unread ? '#fff' : T.color.g1,
                border: `1px solid ${unread ? 'rgba(37,99,235,0.18)' : T.color.g2}`,
                display: 'grid', placeItems: 'center',
                color: meta.color, fontSize: T.size.base, fontWeight: 800,
                fontFamily: T.font.mono,
              }}>{meta.icon}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Pill variant={unread ? 'brand' : 'neutral'} size="xs">{meta.label}</Pill>
                  {unread && <LiveDot color={T.color.brand} size={5} />}
                </div>
                <div style={{
                  fontSize: T.size.base, fontWeight: unread ? 700 : 500,
                  color: unread ? T.color.ink : T.color.g8,
                  marginTop: 6, lineHeight: 1.4,
                }}>{n.title || meta.label}</div>
                {n.body && (
                  <div style={{ fontSize: T.size.sm, color: T.color.g5, marginTop: 4, lineHeight: 1.5 }}>{n.body}</div>
                )}
              </div>

              <div style={{
                fontSize: T.size.xs, color: T.color.g5, fontFamily: T.font.mono,
                flexShrink: 0, textAlign: 'right', paddingTop: 2,
              }}>
                {formatRelative(n.created_at)}
                {hasAction && (
                  <div style={{ marginTop: 6, color: T.color.brand, fontFamily: T.font.body, fontSize: 11.5, fontWeight: 600 }}>
                    Ouvrir →
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function formatRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
