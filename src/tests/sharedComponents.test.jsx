// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mock lucide-react ─────────────────────────────────────────
vi.mock('lucide-react', () => ({
  Heart: ({ size, style }) => <svg data-testid="heart-icon" style={style} />,
}))

// ── Mock formatters ───────────────────────────────────────────
vi.mock('../lib/formatters', () => ({
  formatDate: (d) => d ? '1 janv.' : '—',
}))

// ── Mock supabase (not used in MissionCard/ChatView directly) ─
vi.mock('../lib/supabase', () => ({
  supabase: {},
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

  it('shows ... and disables button when applying', () => {
    render(<MissionCard mission={baseMission} onApply={vi.fn()} applied={false} applying={true} />)
    const btn = screen.getByText('...')
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
// ChatView tests
// ────────────────────────────────────────────────────────────────

describe('ChatView', () => {
  const defaultProps = {
    chatMessages: [],
    chatPartner: { name: 'Jean Dupont' },
    chatInput: '',
    setChatInput: vi.fn(),
    sendingMsg: false,
    onSend: vi.fn(),
    onBack: vi.fn(),
    userId: 'user-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no messages', () => {
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText(/Aucun message/i)).toBeTruthy()
  })

  it('renders chat partner name', () => {
    render(<ChatView {...defaultProps} />)
    expect(screen.getByText('Jean Dupont')).toBeTruthy()
  })

  it('falls back to Conversation when no partner', () => {
    render(<ChatView {...defaultProps} chatPartner={null} />)
    expect(screen.getByText('Conversation')).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<ChatView {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText('‹ Retour'))
    expect(onBack).toHaveBeenCalled()
  })

  it('renders messages from other users aligned left', () => {
    const messages = [{ id: 'msg-1', content: 'Bonjour', sender_id: 'other-user', created_at: '2026-01-01T10:00:00Z' }]
    render(<ChatView {...defaultProps} chatMessages={messages} />)
    expect(screen.getByText('Bonjour')).toBeTruthy()
  })

  it('renders own messages', () => {
    const messages = [{ id: 'msg-2', content: 'Hello moi', sender_id: 'user-1', created_at: '2026-01-01T10:01:00Z' }]
    render(<ChatView {...defaultProps} chatMessages={messages} />)
    expect(screen.getByText('Hello moi')).toBeTruthy()
  })

  it('send button is disabled when chatInput is empty', () => {
    render(<ChatView {...defaultProps} chatInput="" />)
    const sendBtn = screen.getByText('Envoyer')
    expect(sendBtn.disabled).toBe(true)
  })

  it('send button is disabled when sendingMsg is true', () => {
    render(<ChatView {...defaultProps} chatInput="test" sendingMsg={true} />)
    const sendBtn = screen.getByText('...')
    expect(sendBtn.disabled).toBe(true)
  })

  it('send button is enabled when chatInput has content', () => {
    render(<ChatView {...defaultProps} chatInput="mon message" />)
    const sendBtn = screen.getByText('Envoyer')
    expect(sendBtn.disabled).toBe(false)
  })

  it('calls setChatInput on input change', () => {
    const setChatInput = vi.fn()
    render(<ChatView {...defaultProps} setChatInput={setChatInput} />)
    const input = screen.getByPlaceholderText('Votre message...')
    fireEvent.change(input, { target: { value: 'nouveau message' } })
    expect(setChatInput).toHaveBeenCalledWith('nouveau message')
  })

  it('calls onSend when send button clicked', () => {
    const onSend = vi.fn()
    render(<ChatView {...defaultProps} chatInput="test" onSend={onSend} />)
    fireEvent.click(screen.getByText('Envoyer'))
    expect(onSend).toHaveBeenCalled()
  })
})
