// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import React from 'react'

import CookieBanner from '../components/CookieBanner'

describe('CookieBanner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('shows banner when no consent in localStorage', () => {
    render(<CookieBanner />)
    expect(screen.getByText('Compris')).toBeTruthy()
  })

  it('does not show banner when consent already set', () => {
    localStorage.setItem('tempo_cookie_consent', JSON.stringify({ accepted: true }))
    render(<CookieBanner />)
    expect(screen.queryByText('Compris')).toBeNull()
  })

  it('hides banner after clicking Compris', async () => {
    render(<CookieBanner />)
    const btn = screen.getByText('Compris')
    await act(async () => {
      fireEvent.click(btn)
    })
    expect(screen.queryByText('Compris')).toBeNull()
  })

  it('saves consent to localStorage when Compris is clicked', async () => {
    render(<CookieBanner />)
    await act(async () => {
      fireEvent.click(screen.getByText('Compris'))
    })
    const stored = JSON.parse(localStorage.getItem('tempo_cookie_consent'))
    expect(stored).toBeTruthy()
    expect(stored.accepted).toBe(true)
    expect(stored.version).toBe('1.0')
    expect(stored.date).toBeTruthy()
  })

  it('shows the cookie policy text', () => {
    render(<CookieBanner />)
    expect(screen.getByText(/cookies strictement necessaires/i)).toBeTruthy()
  })

  it('contains a link to /legal', () => {
    render(<CookieBanner />)
    const link = screen.getByText(/En savoir plus/i)
    expect(link.getAttribute('href')).toBe('/legal')
  })

  it('renders nothing when localStorage key is any truthy string', () => {
    localStorage.setItem('tempo_cookie_consent', 'yes')
    render(<CookieBanner />)
    expect(screen.queryByText('Compris')).toBeNull()
  })
})
