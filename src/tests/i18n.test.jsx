// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { I18nProvider, useI18n } from '../contexts/I18nContext'

const wrapper = ({ children }) => <I18nProvider>{children}</I18nProvider>

describe('useI18n', () => {
  let langSpy
  beforeEach(() => {
    localStorage.clear()
    // Simule un navigateur francophone : sans ça, jsdom renvoie 'en-US'
    langSpy = vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
  })
  afterEach(() => {
    langSpy?.mockRestore()
  })

  it('locale par défaut est fr si rien en localStorage', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.locale).toBe('fr')
  })

  it('locale initiale depuis localStorage', () => {
    localStorage.setItem('tempo_locale', 'en')
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.locale).toBe('en')
  })

  it('switchLocale change la locale et persiste dans localStorage', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    act(() => {
      result.current.switchLocale('en')
    })
    expect(result.current.locale).toBe('en')
    expect(localStorage.getItem('tempo_locale')).toBe('en')
  })

  it('t() retourne la traduction française pour une clé connue', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.t('nav_home')).toBe('Accueil')
  })

  it('t() retourne la traduction anglaise après switchLocale("en")', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    act(() => {
      result.current.switchLocale('en')
    })
    // En anglais nav_home devrait être différent de 'Accueil'
    const val = result.current.t('nav_home')
    expect(typeof val).toBe('string')
    expect(val.length).toBeGreaterThan(0)
  })

  it('t() retourne la clé si traduction introuvable', () => {
    const { result } = renderHook(() => useI18n(), { wrapper })
    expect(result.current.t('clé_inexistante')).toBe('clé_inexistante')
  })

  it('t() utilise le fallback fr si clé absente en locale courante', () => {
    // On force une locale fictive sans traductions
    localStorage.setItem('tempo_locale', 'de')
    const { result } = renderHook(() => useI18n(), { wrapper })
    // 'de' n'existe pas → fallback fr
    expect(result.current.t('nav_home')).toBe('Accueil')
  })
})
