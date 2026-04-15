// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChat } from '../hooks/shared/useChat'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUnsubscribe = vi.fn()
const mockPresenceUnsubscribe = vi.fn()

vi.mock('../lib/supabase', () => ({
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  subscribeToMessages: vi.fn(() => ({ unsubscribe: mockUnsubscribe })),
  subscribeToChatPresence: vi.fn(() => ({ sendTyping: vi.fn(), unsubscribe: mockPresenceUnsubscribe })),
  markMessagesRead: vi.fn(() => Promise.resolve({ data: null, error: null })),
}))

import {
  getMessages,
  sendMessage,
  subscribeToMessages,
  subscribeToChatPresence,
} from '../lib/supabase'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_MESSAGES = [
  { id: 'msg1', content: 'Bonjour', sender_id: 'partner-1', mission_id: 'miss-1' },
  { id: 'msg2', content: 'Salut',   sender_id: 'user-1',    mission_id: 'miss-1' },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useChat (stateless)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMessages.mockResolvedValue({ data: FAKE_MESSAGES, error: null })
    sendMessage.mockResolvedValue({ data: { id: 'msg3', content: 'New', sender_id: 'user-1' }, error: null })
  })

  it('does not fetch when userId or partnerId is missing', () => {
    renderHook(() => useChat(null, 'partner-1', 'miss-1'))
    expect(getMessages).not.toHaveBeenCalled()
    expect(subscribeToMessages).not.toHaveBeenCalled()
  })

  it('loads messages on mount with full arguments', async () => {
    const { result } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getMessages).toHaveBeenCalledWith('user-1', 'partner-1', 'miss-1')
    expect(result.current.messages).toEqual(FAKE_MESSAGES)
  })

  it('calls onError when getMessages fails', async () => {
    getMessages.mockResolvedValue({ data: null, error: new Error('fail') })
    const onError = vi.fn()
    const { result } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1', { onError }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(onError).toHaveBeenCalledWith('Erreur lors du chargement des messages')
    expect(result.current.messages).toEqual([])
  })

  it('send does nothing when input is empty', async () => {
    const { result } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.send() })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('send inserts message and clears input', async () => {
    const { result } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setInput('Bonjour !'))
    await act(async () => { await result.current.send() })
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      senderId: 'user-1',
      receiverId: 'partner-1',
      missionId: 'miss-1',
      content: 'Bonjour !',
    }))
    expect(result.current.messages).toHaveLength(FAKE_MESSAGES.length + 1)
    expect(result.current.input).toBe('')
  })

  it('send calls onError when sendMessage fails', async () => {
    sendMessage.mockResolvedValue({ data: null, error: new Error('network') })
    const onError = vi.fn()
    const { result } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1', { onError }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setInput('Test'))
    await act(async () => { await result.current.send() })
    expect(onError).toHaveBeenCalledWith("Erreur lors de l'envoi du message")
  })

  it('realtime subscription is created when userId and partnerId provided', async () => {
    const { result } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeToMessages).toHaveBeenCalled()
    expect(subscribeToChatPresence).toHaveBeenCalled()
  })

  it('subscription is unsubscribed on unmount', async () => {
    const { result, unmount } = renderHook(() => useChat('user-1', 'partner-1', 'miss-1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
    expect(mockPresenceUnsubscribe).toHaveBeenCalled()
  })
})
