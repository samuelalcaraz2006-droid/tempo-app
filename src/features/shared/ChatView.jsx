import { Briefcase, Check, CheckCheck, ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/shared/useChat'
import { getMissionById } from '../../lib/supabase'
import LoadingState from '../../components/UI/LoadingState'

const MISSION_STATUS = {
  open: { label: 'Ouverte', color: 'var(--gr-d)', bg: 'var(--gr-l)' },
  matched: { label: 'En cours', color: '#B45309', bg: '#FEF3C7' },
  active: { label: 'En cours', color: '#B45309', bg: '#FEF3C7' },
  completed: { label: 'Terminée', color: '#1D4ED8', bg: 'var(--bl-l)' },
  cancelled: { label: 'Annulée', color: '#B91C1C', bg: '#FEE2E2' },
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ name, size = 40 }) {
  const initial = (name || '?')[0]?.toUpperCase() || '?'
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--g1)',
        color: 'var(--g6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

function MessageBubble({ content, createdAt, mine, readAt }) {
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
      <div
        style={{
          maxWidth: '75%',
          padding: '8px 12px',
          borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: mine ? 'var(--or)' : 'var(--wh)',
          color: mine ? '#fff' : 'var(--bk)',
          fontSize: 13,
          lineHeight: 1.5,
          boxShadow: '0 1px 2px rgba(0,0,0,.06)',
          wordBreak: 'break-word',
        }}
      >
        <div>{content}</div>
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            opacity: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
          }}
        >
          <span>{formatTime(createdAt)}</span>
          {mine && (readAt ? <CheckCheck size={12} aria-hidden="true" /> : <Check size={12} aria-hidden="true" />)}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ name }) {
  return (
    <div
      style={{
        padding: '6px 14px',
        fontSize: 12,
        color: 'var(--g4)',
        fontStyle: 'italic',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--g4)',
          animation: 'pulse 1.2s infinite',
        }}
      />
      {name} ecrit...
    </div>
  )
}

// Composant de chat autonome : consomme useChat directement.
// Props : userId, partnerId, partnerName, contextMissionId, onBack, onOpenMission.
export default function ChatView({ userId, partnerId, partnerName, contextMissionId = null, onBack, onOpenMission }) {
  const { messages, loading, input, setInput, sending, send, partnerTyping } = useChat(userId, partnerId, contextMissionId || null)

  const [contextMission, setContextMission] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!contextMissionId) {
      setContextMission(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data } = await getMissionById(contextMissionId)
      if (!cancelled) setContextMission(data || null)
    })()
    return () => {
      cancelled = true
    }
  }, [contextMissionId])

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
      }, 50)
    }
  }, [messages.length])

  const pinnedStatus = contextMission?.status ? MISSION_STATUS[contextMission.status] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 160px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--g1)' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'var(--g1)',
            border: 'none',
            cursor: 'pointer',
            width: 34,
            height: 34,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Retour"
        >
          <ChevronLeft size={18} />
        </button>
        <Avatar name={partnerName} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partnerName || 'Conversation'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--g4)' }}>Marketplace Tempo</div>
        </div>
      </div>

      {/* Pinned mission */}
      {contextMission && (
        <button
          type="button"
          onClick={() => onOpenMission?.(contextMission)}
          disabled={!onOpenMission}
          style={{
            marginBottom: 10,
            padding: 12,
            borderRadius: 10,
            background: 'var(--brand-l)',
            border: '1px solid rgba(234,88,12,0.24)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: onOpenMission ? 'pointer' : 'default',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(234,88,12,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Briefcase size={16} color="var(--or)" aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--or)', marginBottom: 1, fontWeight: 500 }}>Mission en contexte</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bk)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contextMission.title}
            </div>
            {(contextMission.city || contextMission.hourly_rate) && (
              <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 1 }}>
                {[contextMission.city, contextMission.hourly_rate ? `${contextMission.hourly_rate}€/h` : null].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          {pinnedStatus && (
            <span
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 10,
                background: pinnedStatus.bg,
                color: pinnedStatus.color,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {pinnedStatus.label}
            </span>
          )}
        </button>
      )}

      {/* Messages list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px',
          background: 'var(--g1)',
          borderRadius: 10,
          marginBottom: 10,
        }}
      >
        {loading ? (
          <LoadingState compact />
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--g4)', fontSize: 13 }}>Aucun message — commencez la conversation</div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble key={msg.id || i} content={msg.content} createdAt={msg.created_at} mine={msg.sender_id === userId} readAt={msg.read_at} />
          ))
        )}
        {partnerTyping && <TypingIndicator name={partnerName || 'Votre contact'} />}
      </div>

      {/* Quick actions (suggestions contextuelles) */}
      {messages.length === 0 && contextMission && (
        <QuickActionsBar
          mission={contextMission}
          onPick={(text) => setInput((prev) => prev ? `${prev}\n${text}` : text)}
        />
      )}

      {/* Input (textarea auto-resize pour multi-lignes) */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <textarea
          className="input"
          placeholder="Votre message…  (Shift+Entrée pour retour à la ligne)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          rows={1}
          style={{
            flex: 1, resize: 'none', minHeight: 42, maxHeight: 140,
            // hauteur dynamique : on recalcule via scrollHeight au rendu
            // (géré via onInput + ref pour éviter un re-render additionnel)
          }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto'
              el.style.height = `${Math.min(140, el.scrollHeight)}px`
            }
          }}
        />
        <button type="button" className="btn-primary"
          style={{ padding: '10px 18px', alignSelf: 'flex-end' }}
          onClick={send}
          disabled={sending || !input.trim()}
          aria-busy={sending ? 'true' : undefined}
        >
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

// ── Quick actions (templates contextuels) ───────────────────────
function QuickActionsBar({ mission, onPick }) {
  if (!mission) return null

  const actions = [
    {
      label: '📅 Proposer un créneau',
      text: `Bonjour ! Je propose de démarrer ${formatMissionStart(mission)}. Ça vous convient ?`,
    },
    mission.address ? {
      label: '📍 Confirmer l\'adresse',
      text: `Bonjour, je confirme pour ${formatMissionStart(mission)}. Adresse : ${mission.address}${mission.city ? `, ${mission.city}` : ''}. Je serai à l\'heure.`,
    } : {
      label: '📍 Demander l\'adresse précise',
      text: 'Bonjour, pourriez-vous me confirmer l\'adresse précise du lieu de mission ? Merci.',
    },
    {
      label: '🕐 Je serai en retard',
      text: 'Bonjour, je vais avoir un léger retard — je vous tiens informé dès que je suis en route.',
    },
  ]

  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap',
      marginBottom: 10,
    }}>
      {actions.map((a, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(a.text)}
          style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'var(--g1)', border: '1px solid var(--g2)',
            color: 'var(--g8)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >{a.label}</button>
      ))}
    </div>
  )
}

function formatMissionStart(mission) {
  if (!mission?.start_date) return 'à la date prévue'
  const d = new Date(mission.start_date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const isoDay = d.toISOString().slice(0, 10)
  if (isoDay === today.toISOString().slice(0, 10)) return 'aujourd\'hui'
  if (isoDay === tomorrow.toISOString().slice(0, 10)) return 'demain'
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  return days[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0')
}
