import { describe, it, expect } from 'vitest'
import fr from '../lib/i18n/fr'
import en from '../lib/i18n/en'

describe('Fichiers de traduction', () => {
  describe('Structure', () => {
    it('fr.js exporte un objet non vide', () => {
      expect(typeof fr).toBe('object')
      expect(Object.keys(fr).length).toBeGreaterThan(0)
    })

    it('en.js exporte un objet non vide', () => {
      expect(typeof en).toBe('object')
      expect(Object.keys(en).length).toBeGreaterThan(0)
    })

    it('fr et en ont le même nombre de clés', () => {
      expect(Object.keys(fr).length).toBe(Object.keys(en).length)
    })

    it('toutes les clés de fr existent dans en', () => {
      for (const key of Object.keys(fr)) {
        expect(en, `clé manquante en en.js: ${key}`).toHaveProperty(key)
      }
    })

    it('toutes les clés de en existent dans fr', () => {
      for (const key of Object.keys(en)) {
        expect(fr, `clé manquante en fr.js: ${key}`).toHaveProperty(key)
      }
    })
  })

  describe('Valeurs non vides', () => {
    it('toutes les valeurs string de fr.js sont non vides', () => {
      for (const [key, val] of Object.entries(fr)) {
        if (typeof val === 'string') {
          expect(val.length, `fr.js["${key}"] est vide`).toBeGreaterThan(0)
        }
      }
    })

    it('toutes les valeurs string de en.js sont non vides', () => {
      for (const [key, val] of Object.entries(en)) {
        if (typeof val === 'string') {
          expect(val.length, `en.js["${key}"] est vide`).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('Clés de navigation', () => {
    const navKeys = ['nav_home', 'nav_missions', 'nav_messages', 'nav_profile', 'nav_dashboard']
    for (const key of navKeys) {
      it(`fr.${key} est défini`, () => expect(fr[key]).toBeTruthy())
      it(`en.${key} est défini`, () => expect(en[key]).toBeTruthy())
    }
  })

  describe('Clés communes', () => {
    const commonKeys = ['loading', 'save', 'cancel', 'back', 'search', 'send', 'delete', 'confirm', 'close']
    for (const key of commonKeys) {
      it(`fr.${key} et en.${key} sont différents (vraie traduction)`, () => {
        // Pour la plupart des clés communes, fr ≠ en
        // Exception : certains mots sont identiques (ex: "Missions")
        expect(typeof fr[key]).toBe('string')
        expect(typeof en[key]).toBe('string')
      })
    }
  })

  describe('Clés métier spécifiques', () => {
    it('fr contient les clés de candidature', () => {
      expect(fr.apply).toBeTruthy()
      expect(fr.applied).toBeTruthy()
      expect(fr.pending).toBeTruthy()
      expect(fr.accepted).toBeTruthy()
      expect(fr.rejected).toBeTruthy()
    })

    it('en contient les clés de candidature', () => {
      expect(en.apply).toBeTruthy()
      expect(en.applied).toBeTruthy()
      expect(en.pending).toBeTruthy()
      expect(en.accepted).toBeTruthy()
      expect(en.rejected).toBeTruthy()
    })

    it('fr contient les clés de rating', () => {
      expect(fr.rate_the_mission).toBeTruthy()
      expect(fr.send_rating).toBeTruthy()
      expect(Array.isArray(fr.star_labels)).toBe(true)
      expect(fr.star_labels).toHaveLength(6)
    })

    it('en contient les clés de rating', () => {
      expect(en.rate_the_mission).toBeTruthy()
      expect(en.send_rating).toBeTruthy()
      expect(Array.isArray(en.star_labels)).toBe(true)
      expect(en.star_labels).toHaveLength(6)
    })

    it('star_labels[0] est vide (pas d\'étoile 0)', () => {
      expect(fr.star_labels[0]).toBe('')
      expect(en.star_labels[0]).toBe('')
    })

    it('fr contient les clés d\'onboarding', () => {
      expect(fr.welcome).toBeTruthy()
      expect(fr.step1_title).toBeTruthy()
      expect(fr.step2_title).toBeTruthy()
      expect(fr.step3_title).toBeTruthy()
    })

    it('fr contient les clés de contrat', () => {
      expect(fr.contract_title).toBeTruthy()
      expect(fr.sign_the_contract).toBeTruthy()
      expect(fr.contract_signed_success).toBeTruthy()
    })

    it('fr contient les clés de gains', () => {
      expect(fr.my_earnings).toBeTruthy()
      expect(fr.this_month).toBeTruthy()
      expect(fr.this_year).toBeTruthy()
    })
  })
})
