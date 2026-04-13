/**
 * Suite E2E — Flux d'authentification
 *
 * Couvre :
 * 1. Affichage du formulaire de connexion
 * 2. Toggle connexion / inscription
 * 3. Selection du role (travailleur / entreprise)
 * 4. Formulaire d'inscription travailleur multi-etapes
 * 5. Validation mot de passe (strength meter)
 * 6. Formulaire d'inscription entreprise
 * 7. Mot de passe oublie
 */

import { test, expect } from '@playwright/test'

test.describe('Auth — Connexion & Inscription', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Cliquer sur Connexion dans la nav
    await page.click('nav button:has-text("Connexion")')
  })

  test('affiche le formulaire de connexion par defaut', async ({ page }) => {
    await expect(page.locator('text=Connexion a TEMPO')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.locator('button:has-text("Se connecter")')).toBeVisible()
  })

  test('toggle vers inscription affiche le choix de role', async ({ page }) => {
    await page.click('button:has-text("Inscription")')
    await expect(page.locator('text=Je suis...')).toBeVisible()
    await expect(page.locator('button:has-text("Travailleur")')).toBeVisible()
    await expect(page.locator('button:has-text("Entreprise")')).toBeVisible()
  })

  test('inscription travailleur — etape 1 affiche les champs personnels', async ({ page }) => {
    await page.click('button:has-text("Inscription")')
    await page.click('button:has-text("Travailleur")')
    await expect(page.locator('text=Informations personnelles')).toBeVisible()
    await expect(page.locator('#firstName')).toBeVisible()
    await expect(page.locator('#lastName')).toBeVisible()
  })

  test('inscription travailleur — navigation entre etapes', async ({ page }) => {
    await page.click('button:has-text("Inscription")')
    await page.click('button:has-text("Travailleur")')
    // Etape 1 → remplir et continuer
    await page.fill('#firstName', 'Jean')
    await page.fill('#lastName', 'Test')
    await page.click('button:has-text("Continuer")')
    // Etape 2 — SIRET & localisation
    await expect(page.locator('text=SIRET & localisation')).toBeVisible()
    await page.fill('#city', 'Lyon')
    await page.click('button:has-text("Continuer")')
    // Etape 3 — Acces & finalisation
    await expect(page.locator('text=finalisation')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('inscription — password strength meter visible', async ({ page }) => {
    await page.click('button:has-text("Inscription")')
    await page.click('button:has-text("Travailleur")')
    await page.fill('#firstName', 'Jean')
    await page.fill('#lastName', 'Test')
    await page.click('button:has-text("Continuer")')
    await page.fill('#city', 'Lyon')
    await page.click('button:has-text("Continuer")')
    // Taper un mot de passe
    await page.fill('#password', 'Test1234!')
    // La barre de force doit etre visible
    await expect(page.locator('.strength-bar').first()).toBeVisible()
  })

  test('inscription entreprise — affiche le formulaire direct', async ({ page }) => {
    await page.click('button:has-text("Inscription")')
    await page.click('button:has-text("Entreprise")')
    await expect(page.locator('text=Creer un compte Entreprise')).toBeVisible()
    await expect(page.locator('#companyName')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
  })

  test('mot de passe oublie — affiche le formulaire de reset', async ({ page }) => {
    await page.click('button:has-text("Mot de passe oublie")')
    await expect(page.locator('text=Mot de passe oublie')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('button:has-text("Envoyer le lien")')).toBeVisible()
  })

  test('retour a l accueil depuis auth', async ({ page }) => {
    await page.click('text=Retour')
    await expect(page.locator('text=Staffing on-demand')).toBeVisible()
  })
})
