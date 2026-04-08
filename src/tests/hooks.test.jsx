// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '../hooks/useToast'
import { useDarkMode } from '../hooks/useDarkMode'

// ── useToast ──────────────────────────────────────────────────
describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toast est null au départ', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast).toBeNull()
  })

  it('showToast définit un message et un type', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('Opération réussie', 'success')
    })
    expect(result.current.toast).toEqual({ msg: 'Opération réussie', type: 'success' })
  })

  it('type par défaut est success', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('msg')
    })
    expect(result.current.toast?.type).toBe('success')
  })

  it('toast disparaît après la durée (3000 ms par défaut)', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('test')
    })
    expect(result.current.toast).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.toast).toBeNull()
  })

  it('toast disparaît après la durée personnalisée', () => {
    const { result } = renderHook(() => useToast(1000))
    act(() => {
      result.current.showToast('test')
    })
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current.toast).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.toast).toBeNull()
  })

  it('un second showToast remplace le premier et repart le timer', () => {
    const { result } = renderHook(() => useToast(2000))
    act(() => { result.current.showToast('premier') })
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { result.current.showToast('second') })
    expect(result.current.toast?.msg).toBe('second')
    // le timer repart depuis 0 → toujours affiché à 1999 ms
    act(() => { vi.advanceTimersByTime(1999) })
    expect(result.current.toast).not.toBeNull()
    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current.toast).toBeNull()
  })
})

// ── useDarkMode ───────────────────────────────────────────────
describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('mode clair par défaut si rien en localStorage', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(false)
  })

  it('mode sombre si localStorage contient "1"', () => {
    localStorage.setItem('tempo_dark_mode', '1')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(true)
  })

  it('toggleDarkMode bascule entre clair et sombre', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(false)
    act(() => { result.current.toggleDarkMode() })
    expect(result.current.darkMode).toBe(true)
    act(() => { result.current.toggleDarkMode() })
    expect(result.current.darkMode).toBe(false)
  })

  it('data-theme sur documentElement est mis à jour', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.toggleDarkMode() })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    act(() => { result.current.toggleDarkMode() })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('persiste la valeur dans localStorage', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.toggleDarkMode() })
    expect(localStorage.getItem('tempo_dark_mode')).toBe('1')
    act(() => { result.current.toggleDarkMode() })
    expect(localStorage.getItem('tempo_dark_mode')).toBe('0')
  })
})
