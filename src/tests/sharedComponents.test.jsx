// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mock lucide-react ─────────────────────────────────────────
vi.mock('lucide-react', async () => (await import('./mocks/lucide.jsx')).default)

// ── Mock formatters ───────────────────────────────────────────
vi.mock('../lib/formatters', () => ({
  formatDate: (d) => d ? '1 janv.' : '—',
}))

// ── Mock supabase (ChatView fetches pinned mission) ─
vi.mock('../lib/supabase', () => ({
  supabase: {},
  getMissionById: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

// ── Mock useChat (ChatView uses it internally) ─
const mockSend = vi.fn()
const mockSetInput = vi.fn()
let mockUseChatReturn = {
  messages: [],
  loading: false,
  input: '',
  setInput: mockSetInput,
  sending: false,
  error: null,
  send: mockSend,
  partnerTyping: false,
}
vi.mock('../hooks/shared/useChat', () => ({
  useChat: () => mockUseChatReturn,
}))

// ── Fix jsdom missing scrollIntoView ─────────────────────────
window.HTMLElement.prototype.scrollIntoView = vi.fn()

import MissionCard from '../features/shared/MissionCard'
import ChatView from '../features/shared/ChatView'

// ────────────────────────────────────────────────────────────────
// MissionCard tests
// ────────────────────────────────────────────────────────────────

const baseMission = {
  id: 'mission-1',
  title: 'Cariste H/F',
  city: 'Lyon',
  companies: { name: 'ACME Corp' },
  required_skills: ['Chariot', 'CACES 1', 'Logistique'],
  hourly_rate: 12,
  start_date: '2026-05-01',
  total_hours: 40,
  urgency: 'normal',
  matchScore: null,
}

describe('MissionCard', () => {
  it('renders mission title, company and city', () => {
    render(<MissionCard mission={baseMission} />)
    expect(screen.getByText('Cariste H/F')).toBeTruthy()
    expect(screen.getByText(/ACME Corp/)).toBeTruthy()
    expect(screen.getByText(/Lyon/)).toBeTruthy()
  })

  it('renders up to 3 required_skills as tags', () => {
    render(<MissionCard mission={baseMission} />)
    expect(screen.getByText('Chariot')).toBeTruthy()
    expect(screen.getByText('CACES 1')).toBeTruthy()
    expect(screen.getByText('Logistique')).toBeTruthy()
  })

  it('shows Urgent badge when urgency is urgent', () => {
    render(<MissionCard mission={{ ...baseMission, urgency: 'urgent' }} />)
    expect(screen.getByText('Urgent')).toBeTruthy()
  })

  it('shows Urgent badge when urgency is immediate', () => {
    render(<MissionCard mission={{ ...baseMission, urgency: 'immediate' }} />)
    expect(screen.getByText('Urgent')).toBeTruthy()
  })

  it('does not show Urgent badge for normal urgency', () => {
    render(<MissionCard mission={baseMission} />)
    expect(screen.queryByText('Urgent')).toBeNull()
  })

  it('shows score badge when matchScore is set', () => {
    render(<MissionCard mission={{ ...baseMission, matchScore: 87 }} />)
    expect(screen.getByText('87%')).toBeTruthy()
  })

  it('hides score badge when matchScore is null', () => {
    render(<MissionCard mission={baseMission} />)
    expect(screen.queryByText(/%$/)).toBeNull()
  })

  it('calls onSelect when card is clicked', () => {
    const onSelect = vi.fn()
    const { container } = render(<MissionCard mission={baseMission} onSelect={onSelect} />)
    fireEvent.click(container.firstChild)
    expect(onSelect).toHaveBeenCalledWith(baseMission)
  })

  it('shows Postuler button and calls onApply on click', () => {
    const onApply = vi.fn()
    render(<MissionCard mission={baseMission} onApply={onApply} applied={false} applying={false} />)
    const btn = screen.getByText('Postuler')
    expect(btn).toBeTruthy()
    fireEvent.click(btn)
    expect(onApply).toHaveBeenCalledWith(baseMission)
  })

  it('shows checkmark and disables button when applied', () => {
    render(<MissionCard mission={baseMission} onApply={vi.fn()} applied={true} applying={false} />)
    const btn = screen.getByText('✓ Postulé')
    expect(btn).toBeTruthy()
    expect(btn.disabled).toBe(true)
  })

  it('shows Envoi… and disables button when applying', () => {
    render(<MissionCard mission={baseMission} onApply={vi.fn()} applied={false} applying={true} />)
    const btn = screen.getByText('Envoi…')
    expect(btn.disabled).toBe(true)
  })

  it('calls onToggleSave when heart button clicked', () => {
    const onToggleSave = vi.fn()
    render(<MissionCard mission={baseMission} onToggleSave={onToggleSave} saved={false} />)
    const saveBtn = screen.getByRole('button', { name: /Sauvegarder/i })
    fireEvent.click(saveBtn)
    expect(onToggleSave).toHaveBeenCalledWith('mission-1')
  })

  it('shows correct aria-label when saved', () => {
    render(<MissionCard mission={baseMission} onToggleSave={vi.fn()} saved={true} />)
    expect(screen.getByRole('button', { name: /Retirer des favoris/i })).toBeTruthy()
  })

  it('onSelect click does not fire when not provided', () => {
    const { container } = render(<MissionCard mission={baseMission} />)
    // Should not throw
    fireEvent.click(container.firstChild)
  })
})

// ────────────────────────────────────────────────────────────────
// ChatView tests — hook-based stateless component
// ────────────────────────────────────────────────────────────────

describe('ChatView', () => {
  const defaultProps = {
    userId: 'user-1',
    partnerId: 'partner-1',
    partnerName: 'Jean Dupont',
    contextMissionId: null,
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChatReturn = {
      messages: [],
      loading: false,
      input: '',
      setInput: mockSetInput,
      sending: false,
      error: null,
      send: mockSend,
      partnerTyping: false,
    }
  })

  it('renders empty state when no messages', () => {
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText(/Aucun message/i)).toBeTruthy()
  })

  it('renders partner name in header', () => {
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('Jean Dupont')).toBeTruthy()
  })

  it('falls back to Conversation when no partner name', () => {
    render(<ChatView {...defaultProps} partnerName={null} />)
    expect(screen.getByText('Conversation')).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<ChatView {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('Retour'))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders messages from partner', () => {
    mockUseChatReturn.messages = [
      { id: 'msg-1', content: 'Bonjour', sender_id: 'partner-1', created_at: '2026-01-01T10:00:00Z' },
    ]
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('Bonjour')).toBeTruthy()
  })

  it('renders own messages', () => {
    mockUseChatReturn.messages = [
      { id: 'msg-2', content: 'Hello moi', sender_id: 'user-1', created_at: '2026-01-01T10:01:00Z' },
    ]
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('Hello moi')).toBeTruthy()
  })

  it('send button is disabled when input is empty', () => {
    render(<ChatView {...defaultProps} />)
    const sendBtn = screen.getByText('Envoyer')
    expect(sendBtn.disabled).toBe(true)
  })

  it('send button is disabled when sending', () => {
    mockUseChatReturn.input = 'test'
    mockUseChatReturn.sending = true
    render(<ChatView {...defaultProps} />)
    const sendBtn = screen.getByText('Envoi…')
    expect(sendBtn.disabled).toBe(true)
  })

  it('send button is enabled when input has content', () => {
    mockUseChatReturn.input = 'mon message'
    render(<ChatView {...defaultProps} />)
    const sendBtn = screen.getByText('Envoyer')
    expect(sendBtn.disabled).toBe(false)
  })

  it('calls setInput on input change', () => {
    render(<ChatView {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Votre message/)
    fireEvent.change(input, { target: { value: 'nouveau message' } })
    expect(mockSetInput).toHaveBeenCalledWith('nouveau message')
  })

  it('calls send when send button clicked', () => {
    mockUseChatReturn.input = 'test'
    render(<ChatView {...defaultProps} />)
    fireEvent.click(screen.getByText('Envoyer'))
    expect(mockSend).toHaveBeenCalled()
  })

  it('shows typing indicator when partner is typing', () => {
    mockUseChatReturn.partnerTyping = true
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText(/ecrit/)).toBeTruthy()
  })
})
