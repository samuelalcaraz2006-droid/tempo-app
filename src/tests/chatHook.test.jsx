// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChat } from '../hooks/shared/useChat'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUnsubscribe = vi.fn()

vi.mock('../lib/supabase', () => ({
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  subscribeToMessages: vi.fn(() => ({ unsubscribe: mockUnsubscribe })),
}))

vi.mock('../lib/pushNotifications', () => ({
  sendLocalNotification: vi.fn(),
  getPermissionStatus: vi.fn().mockReturnValue('denied'),
}))

import { getMessages, sendMessage, subscribeToMessages } from '../lib/supabase'
import { sendLocalNotification } from '../lib/pushNotifications'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_MESSAGES = [
  { id: 'msg1', content: 'Bonjour', sender_id: 'partner-1', mission_id: 'miss-1' },
  { id: 'msg2', content: 'Salut', sender_id: 'user-1', mission_id: 'miss-1' },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMessages.mockResolvedValue({ data: FAKE_MESSAGES, error: null })
    sendMessage.mockResolvedValue({ data: { id: 'msg3', content: 'New' }, error: null })
  })

  it('initial state has empty messages and no chat partner', () => {
    const { result } = renderHook(() => useChat('user-1'))
    expect(result.current.chatMessages).toEqual([])
    expect(result.current.chatPartner).toBeNull()
    expect(result.current.chatMissionId).toBeNull()
    expect(result.current.chatInput).toBe('')
    expect(result.current.sendingMsg).toBe(false)
    expect(result.current.unreadMessages).toBe(0)
  })

  it('openChat loads messages and sets partner', async () => {
    const { result } = renderHook(() => useChat('user-1'))
    await act(async () => {
      await result.current.openChat('partner-1', 'Marie Dupont', 'miss-1')
    })
    expect(getMessages).toHaveBeenCalledWith('user-1', 'partner-1', 'miss-1')
    expect(result.current.chatMessages).toEqual(FAKE_MESSAGES)
    expect(result.current.chatPartner).toEqual({ id: 'partner-1', name: 'Marie Dupont' })
    expect(result.current.chatMissionId).toBe('miss-1')
  })

  it('openChat calls onError when getMessages fails', async () => {
    getMessages.mockResolvedValue({ data: null, error: new Error('fail') })
    const onError = vi.fn()
    const { result } = renderHook(() => useChat('user-1', { onError }))
    await act(async () => {
      await result.current.openChat('partner-1', 'Jean', 'miss-1')
    })
    expect(onError).toHaveBeenCalledWith('Erreur lors du chargement des messages')
    expect(result.current.chatMessages).toEqual([])
  })

  it('handleSendMessage does nothing when input is empty', async () => {
    const { result } = renderHook(() => useChat('user-1'))
    await act(async () => {
      await result.current.openChat('partner-1', 'Marie', 'miss-1')
    })
    // chatInput is empty by default
    await act(async () => {
      await result.current.handleSendMessage()
    })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('handleSendMessage does nothing when chatPartner is null', async () => {
    const { result } = renderHook(() => useChat('user-1'))
    act(() => result.current.setChatInput('Hello'))
    await act(async () => {
      await result.current.handleSendMessage()
    })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('handleSendMessage sends message, appends to list and clears input', async () => {
    const { result } = renderHook(() => useChat('user-1'))
    await act(async () => {
      await result.current.openChat('partner-1', 'Marie', 'miss-1')
    })
    act(() => result.current.setChatInput('Bonjour !'))
    await act(async () => {
      await result.current.handleSendMessage()
    })
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      senderId: 'user-1',
      receiverId: 'partner-1',
      missionId: 'miss-1',
      content: 'Bonjour !',
    }))
    expect(result.current.chatMessages).toHaveLength(FAKE_MESSAGES.length + 1)
    expect(result.current.chatInput).toBe('')
  })

  it('handleSendMessage calls onError when sendMessage fails', async () => {
    sendMessage.mockResolvedValue({ data: null, error: new Error('network') })
    const onError = vi.fn()
    const { result } = renderHook(() => useChat('user-1', { onError }))
    await act(async () => {
      await result.current.openChat('partner-1', 'Marie', 'miss-1')
    })
    act(() => result.current.setChatInput('Test'))
    await act(async () => {
      await result.current.handleSendMessage()
    })
    expect(onError).toHaveBeenCalledWith("Erreur lors de l'envoi du message")
  })

  it('closeChat resets all chat state', async () => {
    const { result } = renderHook(() => useChat('user-1'))
    await act(async () => {
      await result.current.openChat('partner-1', 'Marie', 'miss-1')
    })
    act(() => result.current.setChatInput('Draft'))
    act(() => result.current.closeChat())
    expect(result.current.chatPartner).toBeNull()
    expect(result.current.chatMissionId).toBeNull()
    expect(result.current.chatMessages).toEqual([])
    expect(result.current.chatInput).toBe('')
  })

  it('realtime subscription is created when userId is provided', () => {
    renderHook(() => useChat('user-1'))
    expect(subscribeToMessages).toHaveBeenCalledWith('user-1', expect.any(Function))
  })

  it('realtime subscription is NOT created when userId is null', () => {
    renderHook(() => useChat(null))
    expect(subscribeToMessages).not.toHaveBeenCalled()
  })

  it('subscription is unsubscribed on unmount', () => {
    const { unmount } = renderHook(() => useChat('user-1'))
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
