import { describe, it, expect } from 'vitest'
import {
  fadeUp, fadeDown, fadeIn,
  slideLeft, slideRight,
  scaleIn,
  stagger, staggerFast, staggerSlow,
  viewportOnce,
} from '../lib/animations'

describe('animations', () => {
  describe('fadeUp', () => {
    it('hidden a opacity 0 et y positif', () => {
      expect(fadeUp.hidden.opacity).toBe(0)
      expect(fadeUp.hidden.y).toBeGreaterThan(0)
    })
    it('visible a opacity 1 et y 0', () => {
      expect(fadeUp.visible.opacity).toBe(1)
      expect(fadeUp.visible.y).toBe(0)
    })
    it('transition avec duration et ease', () => {
      expect(fadeUp.visible.transition).toMatchObject({ ease: 'easeOut' })
      expect(fadeUp.visible.transition.duration).toBeGreaterThan(0)
    })
  })

  describe('fadeDown', () => {
    it('hidden a y negatif', () => {
      expect(fadeDown.hidden.y).toBeLessThan(0)
      expect(fadeDown.hidden.opacity).toBe(0)
    })
    it('visible a y 0', () => {
      expect(fadeDown.visible.y).toBe(0)
      expect(fadeDown.visible.opacity).toBe(1)
    })
  })

  describe('fadeIn', () => {
    it('hidden a opacity 0 sans x/y', () => {
      expect(fadeIn.hidden.opacity).toBe(0)
      expect(fadeIn.hidden.x).toBeUndefined()
      expect(fadeIn.hidden.y).toBeUndefined()
    })
    it('visible a opacity 1', () => {
      expect(fadeIn.visible.opacity).toBe(1)
    })
  })

  describe('slideLeft', () => {
    it('hidden a x negatif', () => {
      expect(slideLeft.hidden.x).toBeLessThan(0)
      expect(slideLeft.hidden.opacity).toBe(0)
    })
    it('visible a x 0', () => {
      expect(slideLeft.visible.x).toBe(0)
      expect(slideLeft.visible.opacity).toBe(1)
    })
  })

  describe('slideRight', () => {
    it('hidden a x positif', () => {
      expect(slideRight.hidden.x).toBeGreaterThan(0)
      expect(slideRight.hidden.opacity).toBe(0)
    })
    it('visible a x 0', () => {
      expect(slideRight.visible.x).toBe(0)
      expect(slideRight.visible.opacity).toBe(1)
    })
  })

  describe('scaleIn', () => {
    it('hidden a scale inferieur a 1', () => {
      expect(scaleIn.hidden.scale).toBeLessThan(1)
      expect(scaleIn.hidden.opacity).toBe(0)
    })
    it('visible a scale 1', () => {
      expect(scaleIn.visible.scale).toBe(1)
      expect(scaleIn.visible.opacity).toBe(1)
    })
  })

  describe('variantes stagger', () => {
    it('stagger a staggerChildren de 0.1', () => {
      expect(stagger.visible.transition.staggerChildren).toBe(0.1)
    })
    it('staggerFast a staggerChildren plus petit que stagger', () => {
      expect(staggerFast.visible.transition.staggerChildren).toBeLessThan(
        stagger.visible.transition.staggerChildren
      )
    })
    it('staggerSlow a staggerChildren plus grand que stagger', () => {
      expect(staggerSlow.visible.transition.staggerChildren).toBeGreaterThan(
        stagger.visible.transition.staggerChildren
      )
    })
    it('les hidden sont des objets vides', () => {
      expect(Object.keys(stagger.hidden)).toHaveLength(0)
      expect(Object.keys(staggerFast.hidden)).toHaveLength(0)
      expect(Object.keys(staggerSlow.hidden)).toHaveLength(0)
    })
  })

  describe('viewportOnce', () => {
    it('once est true', () => {
      expect(viewportOnce.once).toBe(true)
    })
    it('amount est un nombre entre 0 et 1', () => {
      expect(viewportOnce.amount).toBeGreaterThan(0)
      expect(viewportOnce.amount).toBeLessThanOrEqual(1)
    })
  })
})
