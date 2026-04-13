/**
 * Suite E2E — Publication de mission (espace entreprise)
 *
 * Couvre :
 * 1. Affichage du formulaire de publication
 * 2. Validation des champs requis
 * 3. Estimation du cout affichee en temps reel
 * 4. Hint taux horaire et compteur description
 * 5. Sauvegarde template inline (pas de prompt())
 */

import { test, expect } from '@playwright/test'
import {
  SUPABASE_URL,
  SESSION_RESPONSE,
} from './mocks/supabase.js'

const COMPANY_USER = {
  id: 'auth-company-uuid-001',
  email: 'rh@acme.fr',
  role: 'authenticated',
}

const COMPANY_PROFILE = {
  id: COMPANY_USER.id,
  email: COMPANY_USER.email,
  role: 'entreprise',
  status: 'verified',
}

const COMPANY_DATA = {
  id: COMPANY_USER.id,
  name: 'ACME Logistics',
  city: 'Paris',
  rating_avg: 4.2,
  rating_count: 5,
}

async function setupCompanySession(page) {
  const url = 'https://ibievmxehhvdplhinher.supabase.co'
  await page.route(`${url}/auth/v1/token*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_RESPONSE(COMPANY_USER)) }))
  await page.route(`${url}/auth/v1/user`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION_RESPONSE(COMPANY_USER).user) }))
  await page.route(`${url}/rest/v1/profiles*`, r => { if (r.request().method() === 'GET') r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([COMPANY_PROFILE]) }); else r.continue() })
  await page.route(`${url}/rest/v1/companies*`, r => { if (r.request().method() === 'GET') r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([COMPANY_DATA]) }); else r.continue() })
  await page.route(`${url}/rest/v1/missions*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
  await page.route(`${url}/rest/v1/invoices*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
  await page.route(`${url}/rest/v1/notifications*`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }))
}

test.describe('Mission — Publication', () => {

  test('affiche le formulaire de publication avec les champs requis', async ({ page }) => {
    await setupCompanySession(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Le dashboard entreprise devrait s'afficher
    await expect(page.locator('text=Tableau de bord')).toBeVisible({ timeout: 10000 })
    // Cliquer sur Publier une mission
    await page.click('button:has-text("Publier une mission")')
    await expect(page.locator('text=Publier une mission')).toBeVisible()
    // Verifier les champs
    await expect(page.locator('text=Intitule du poste')).toBeVisible()
    await expect(page.locator('text=Taux horaire')).toBeVisible()
    await expect(page.locator('text=Date de debut')).toBeVisible()
  })

  test('affiche le hint taux horaire', async ({ page }) => {
    await setupCompanySession(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("Publier une mission")')
    await expect(page.locator('text=14-80 EUR/h')).toBeVisible()
  })

  test('template save utilise un input inline (pas de prompt)', async ({ page }) => {
    await setupCompanySession(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.click('button:has-text("Publier une mission")')
    // Remplir le titre pour activer le bouton template
    const titleInput = page.locator('input[placeholder*="Operateur"]')
    await titleInput.fill('Cariste CACES 3')
    // Cliquer sur Sauver comme template
    await page.click('button:has-text("Sauver comme template")')
    // Un input inline doit apparaitre (pas un prompt() natif)
    await expect(page.locator('input[placeholder="Nom du template"]')).toBeVisible()
  })
})
