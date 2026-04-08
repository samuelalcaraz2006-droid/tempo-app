import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useDarkMode } from '../hooks/useDarkMode'

const STORAGE_KEY = 'tempo_dark_mode'

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('initialise à false quand localStorage est vide', () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(false)
  })

  it('initialise à true quand localStorage contient "1"', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(true)
  })

  it('initialise à false quand localStorage contient "0"', () => {
    localStorage.setItem(STORAGE_KEY, '0')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.darkMode).toBe(false)
  })

  it('toggleDarkMode bascule de false à true', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.toggleDarkMode() })
    expect(result.current.darkMode).toBe(true)
  })

  it('toggleDarkMode bascule de true à false', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.toggleDarkMode() })
    expect(result.current.darkMode).toBe(false)
  })

  it('setDarkMode permet de définir directement la valeur', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.setDarkMode(true) })
    expect(result.current.darkMode).toBe(true)
    act(() => { result.current.setDarkMode(false) })
    expect(result.current.darkMode).toBe(false)
  })

  it('met à jour data-theme à "dark" quand darkMode est true', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.setDarkMode(true) })
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('met à jour data-theme à "light" quand darkMode est false', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.setDarkMode(false) })
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('persiste "1" dans localStorage quand darkMode est true', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.setDarkMode(true) })
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1')
  })

  it('persiste "0" dans localStorage quand darkMode est false', () => {
    localStorage.setItem(STORAGE_KEY, '1')
    const { result } = renderHook(() => useDarkMode())
    act(() => { result.current.setDarkMode(false) })
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0')
  })
})
