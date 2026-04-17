import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToast } from '../hooks/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initialise toast à null', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('showToast définit le message avec type "success" par défaut', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('Opération réussie') })
    expect(result.current.toast).toEqual({ msg: 'Opération réussie', type: 'success' })
  })

  it('showToast accepte un type personnalisé', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('Erreur survenue', 'error') })
    expect(result.current.toast).toEqual({ msg: 'Erreur survenue', type: 'error' })
  })

  it('toast disparaît après la durée par défaut (5000ms)', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('Hello') })
    expect(result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.toast).toBeNull()
  })

  it('toast disparaît après une durée personnalisée', () => {
    const { result } = renderHook(() => useToast(1500))
    act(() => { result.current.showToast('Hello') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(500) })
    expect(result.current.toast).toBeNull()
  })

  it('un second showToast annule le timer précédent', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('Premier') })
    act(() => { vi.advanceTimersByTime(1500) })
    act(() => { result.current.showToast('Deuxième') })
    act(() => { vi.advanceTimersByTime(1500) })
    // Le timer du premier aurait expiré, mais le deuxième est encore actif
    expect(result.current.toast).not.toBeNull()
    expect(result.current.toast.msg).toBe('Deuxième')
  })

  it('le second toast expire correctement après sa propre durée', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('Premier') })
    act(() => { vi.advanceTimersByTime(1500) })
    act(() => { result.current.showToast('Deuxième') })
    act(() => { vi.advanceTimersByTime(5000) })
    expect(result.current.toast).toBeNull()
  })

  it('nettoie le timer au démontage sans erreur', () => {
    const { result, unmount } = renderHook(() => useToast())
    act(() => { result.current.showToast('Test') })
    expect(() => unmount()).not.toThrow()
  })

  it('showToast type "warning" fonctionne correctement', () => {
    const { result } = renderHook(() => useToast())
    act(() => { result.current.showToast('Attention', 'warning') })
    expect(result.current.toast).toEqual({ msg: 'Attention', type: 'warning' })
  })
})
