import { MessageCircle, Search } from 'lucide-react'
import { useState } from 'react'
import { useConversations } from '../../hooks/shared/useConversations'

function formatRelative(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function Avatar({ name, role }) {
  const initial = (name || '?')[0]?.toUpperCase() || '?'
  const isCompany = role === 'entreprise'
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: isCompany ? 'var(--bl-l)' : 'var(--gr-l)',
        color: isCompany ? '#1D4ED8' : 'var(--gr-d)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 15,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  )
}

export default function ConversationsList({
  userId,
  onOpenChat,
  title = 'Messages',
  subtitle,
  emptyTitle = 'Aucune conversation',
  emptyDescription = "La messagerie s'ouvre quand une candidature est acceptée.",
}) {
  const { conversations, loading, error, refresh } = useConversations(userId)
  const [search, setSearch] = useState('')

  const q = search.trim().toLowerCase()
  const filtered = conversations.filter((c) => {
    if (!q) return true
    return (
      (c.partnerName || '').toLowerCase().includes(q) ||
      (c.missionTitle || '').toLowerCase().includes(q) ||
      (c.lastMessage || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div className="a-eyebrow" style={{ marginBottom: 8, fontSize: 11 }}>{title}</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--bk)', letterSpacing: '-0.025em', lineHeight: 1.05 }}>
          Vos <span className="font-serif-italic" style={{ color: 'var(--brand)' }}>conversations</span>.
        </div>
        <div style={{ fontSize: 14, color: 'var(--g5)', marginTop: 6 }}>
          {subtitle ||
            (conversations.length > 0
              ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`
              : 'Vos conversations apparaîtront ici')}
        </div>
      </div>

      {conversations.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--g4)' }} />
          <input
            className="input"
            type="text"
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ padding: 14, height: 64, opacity: 0.4 }}>
              <div style={{ height: 14, background: 'var(--g2)', borderRadius: 4, width: '60%', marginBottom: 6 }} />
              <div style={{ height: 10, background: 'var(--g2)', borderRadius: 4, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--g4)', fontSize: 13 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Impossible de charger les messages</div>
          <button type="button" className="btn-secondary" onClick={refresh} style={{ padding: '6px 14px', fontSize: 12 }}>
            Reessayer
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--g4)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <MessageCircle size={32} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--g6)' }}>{conversations.length === 0 ? emptyTitle : 'Aucun resultat'}</div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5, maxWidth: 320, margin: '6px auto 0' }}>
            {conversations.length === 0 ? emptyDescription : 'Essaie un autre terme de recherche.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((conv) => {
            const isUnread = conv.unreadCount > 0
            const prefix = conv.lastSenderId === conv.partnerId ? '' : 'Vous : '
            return (
              <button
                type="button"
                key={conv.partnerId}
                className="card"
                onClick={() => onOpenChat(conv.partnerId, conv.partnerName, conv.missionId || null)}
                style={{
                  padding: 14,
                  cursor: 'pointer',
                  border: isUnread ? '1px solid var(--or)' : '1px solid var(--g2)',
                  textAlign: 'left',
                  width: '100%',
                  background: 'var(--wh)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Avatar name={conv.partnerName} role={conv.partnerRole} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--bk)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.partnerName || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--g4)', flexShrink: 0 }}>{formatRelative(conv.lastAt)}</div>
                  </div>
                  {conv.missionTitle && (
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--g4)',
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {conv.missionTitle}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: isUnread ? 'var(--bk)' : 'var(--g4)',
                        fontWeight: isUnread ? 600 : 400,
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {prefix}
                      {conv.lastMessage}
                    </div>
                    {isUnread && (
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 5px',
                          borderRadius: 9,
                          background: 'var(--or)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
