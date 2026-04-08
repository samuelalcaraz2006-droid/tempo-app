import { describe, it, expect } from 'vitest'
import { formatDate, formatAmount, SECTOR_LABELS, STAR_LABELS } from '../lib/formatters'

describe('formatDate', () => {
  it('retourne — pour une valeur falsy', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('formate une date ISO en français', () => {
    const result = formatDate('2024-07-15')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/juil\.?/i)
  })

  it('accepte un objet Date', () => {
    const result = formatDate(new Date('2024-01-01'))
    expect(result).toMatch(/1/)
    expect(result).toMatch(/janv\.?/i)
  })
})

describe('formatAmount', () => {
  it('retourne — pour null, undefined, string vide', () => {
    expect(formatAmount(null)).toBe('—')
    expect(formatAmount(undefined)).toBe('—')
    expect(formatAmount('')).toBe('—')
  })

  it('retourne — pour une valeur non-numérique', () => {
    expect(formatAmount('abc')).toBe('—')
  })

  it('formate 0 correctement (cas limite falsy)', () => {
    expect(formatAmount(0)).toBe('0 €')
  })

  it('formate un entier', () => {
    expect(formatAmount(1500)).toBe('1500 €')
  })

  it('arrondit les décimales', () => {
    expect(formatAmount(99.7)).toBe('100 €')
    expect(formatAmount(99.4)).toBe('99 €')
  })

  it('accepte une string numérique', () => {
    expect(formatAmount('250')).toBe('250 €')
  })
})

describe('SECTOR_LABELS', () => {
  it('contient les 5 secteurs attendus', () => {
    expect(Object.keys(SECTOR_LABELS)).toHaveLength(5)
    expect(SECTOR_LABELS.logistique).toBe('Logistique')
    expect(SECTOR_LABELS.btp).toBe('BTP')
  })
})

describe('STAR_LABELS', () => {
  it('a 6 entrées (index 0 vide, 1-5 pour les étoiles)', () => {
    expect(STAR_LABELS).toHaveLength(6)
    expect(STAR_LABELS[0]).toBe('')
    expect(STAR_LABELS[5]).toBe('Excellent !')
  })
})
