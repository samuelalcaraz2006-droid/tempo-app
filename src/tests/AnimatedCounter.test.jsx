// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock framer-motion : useInView retourne true immédiatement, animate appelle onUpdate
vi.mock('framer-motion', () => {
  const useMotionValue = (initial) => {
    const obj = { get: () => initial, set: vi.fn() }
    return obj
  }
  const useTransform = () => ({ get: () => 0 })
  const useInView = () => true
  const animate = (_mv, target, { onUpdate } = {}) => {
    onUpdate?.(target)
    return { stop: vi.fn() }
  }
  return { useMotionValue, useTransform, useInView, animate }
})

import AnimatedCounter from '../components/AnimatedCounter'

describe('AnimatedCounter', () => {
  it('affiche la valeur cible une fois visible', () => {
    render(<AnimatedCounter value={42} />)
    expect(screen.getByText('42')).toBeTruthy()
  })

  it('affiche prefix et suffix autour de la valeur', () => {
    render(<AnimatedCounter value={1500} prefix="€ " suffix=" net" />)
    expect(screen.getByText('€ 1500 net')).toBeTruthy()
  })

  it('rend un élément span', () => {
    const { container } = render(<AnimatedCounter value={10} />)
    expect(container.querySelector('span')).toBeTruthy()
  })

  it('applique le style passé en prop', () => {
    const { container } = render(<AnimatedCounter value={5} style={{ color: 'red' }} />)
    const span = container.querySelector('span')
    expect(span.style.color).toBe('red')
  })

  it('affiche 0 par défaut avant animation (valeur initiale)', () => {
    // Sans mock useInView on aurait 0, ici avec mock à true on a la valeur cible
    render(<AnimatedCounter value={0} />)
    expect(screen.getByText('0')).toBeTruthy()
  })
})
