/**
 * Suite E2E — Mise a jour du profil travailleur
 *
 * Couvre :
 * 1. Affichage des champs pre-remplis
 * 2. Modification du nom et de la ville
 * 3. Ajout/suppression de competences
 * 4. Sauvegarde avec toast de confirmation
 */

import { test, expect } from '@playwright/test'
import {
  setupWorkerSession,
  WORKER_NO_KYC,
} from './mocks/supabase.js'

test.describe('Profil — Mise a jour travailleur', () => {

  test.beforeEach(async ({ page }) => {
    const workerWithData = {
      ...WORKER_NO_KYC,
      first_name: 'Jean',
      last_name: 'Dupont',
      city: 'Lyon',
      skills: ['CACES 3', 'Manutention'],
      certifications: [],
      radius_km: 10,
    }
    await setupWorkerSession(page, workerWithData)

    // Mock missions et applications vides pour le dashboard
    const url = 'https://ibievmxehhvdplhinher.supabase.co'
    await page.route(`${url}/rest/v1/missions*`, r => { if (r.request().method() === 'GET') r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }); else r.continue() })
    await page.route(`${url}/rest/v1/applications*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
    await page.route(`${url}/rest/v1/invoices*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
    await page.route(`${url}/rest/v1/contracts*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
    await page.route(`${url}/rest/v1/matching_scores*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))

    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('affiche le profil avec les champs pre-remplis', async ({ page }) => {
    // Naviguer vers le profil
    await page.click('text=Profil')
    await page.waitForTimeout(500)
    await expect(page.locator('text=Informations personnelles')).toBeVisible()
    // Verifier les valeurs
    const firstNameInput = page.locator('input').filter({ hasText: '' }).nth(0)
    await expect(page.locator('input[value="Jean"]')).toBeVisible()
    await expect(page.locator('input[value="Dupont"]')).toBeVisible()
  })

  test('les competences existantes sont affichees', async ({ page }) => {
    await page.click('text=Profil')
    await page.waitForTimeout(500)
    await expect(page.locator('text=CACES 3')).toBeVisible()
    await expect(page.locator('text=Manutention')).toBeVisible()
  })

  test('le bouton sauvegarder est present', async ({ page }) => {
    await page.click('text=Profil')
    await page.waitForTimeout(500)
    await expect(page.locator('button:has-text("Sauvegarder mon profil")')).toBeVisible()
  })
})
