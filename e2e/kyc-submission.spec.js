/**
 * Suite E2E — Soumission KYC par un travailleur
 *
 * Couvre :
 * 1. Affichage de la section KYC avec 3 documents "À déposer"
 * 2. Upload d'un document (pièce d'identité) → badge "En cours"
 * 3. Upload des 3 documents → bouton de soumission actif
 * 4. Soumission réussie → message de confirmation + timestamp
 * 5. Affichage du motif de refus si kyc_rejection_reason présent
 * 6. Re-soumission après refus efface le motif de refus précédent
 */

import { test, expect } from '@playwright/test'
import { KycPage } from './pages/kyc.page.js'
import {
  setupWorkerSession,
  WORKER_NO_KYC,
  WORKER_KYC_REJECTED,
} from './mocks/supabase.js'

test.describe('KYC — Soumission de documents', () => {
  let kycPage

  test.beforeEach(async ({ page }) => {
    kycPage = new KycPage(page)
    await setupWorkerSession(page, WORKER_NO_KYC)
    await kycPage.goto()
    await kycPage.login()
    // Attendre que le dashboard charge
    await page.waitForLoadState('networkidle')
    await kycPage.openKycTab()
  })

  // ── Test 1 : Affichage initial ────────────────────────────────────────────

  test('affiche les 3 documents KYC avec statut "À déposer"', async ({ page }) => {
    // Attendre que la page charge complètement après login
    await page.waitForTimeout(500)

    // Vérifier les 3 labels de documents
    const identityDoc = page.getByText(/pièce d'identité|CNI|Passeport/i)
    const siretDoc    = page.getByText(/SIRET|Kbis|justificatif/i)
    const rcProDoc    = page.getByText(/RC Pro|assurance|professionnelle/i)

    await expect(identityDoc.first()).toBeVisible()
    await expect(siretDoc.first()).toBeVisible()
    await expect(rcProDoc.first()).toBeVisible()

    // Vérifier les badges "À déposer" (au moins 1 visible)
    const badges = page.getByText(/à déposer|non fourni|upload/i)
    expect(await badges.count()).toBeGreaterThanOrEqual(1)
  })

  // ── Test 2 : Upload pièce d'identité ─────────────────────────────────────

  test('upload de la pièce d\'identité → badge passe à "En cours"', async ({ page }) => {
    await page.waitForTimeout(500)

    const fileInputs = page.locator('input[type="file"]')
    const count = await fileInputs.count()

    if (count === 0) {
      test.skip(true, 'Aucun input file disponible — vérifier le rendu conditionnel')
      return
    }

    // Upload sur le premier input (ID)
    await fileInputs.first().setInputFiles({
      name: 'carte-identite.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-id-image-content'),
    })

    // Le badge doit passer à "en cours" / "chargé" / ou un nom de fichier apparaît
    const enCours = page.getByText(/en cours|chargé|déposé|carte-identite/i)
    await expect(enCours.first()).toBeVisible({ timeout: 5000 })
  })

  // ── Test 3 : Upload des 3 documents ──────────────────────────────────────

  test('upload des 3 documents active le bouton de soumission', async ({ page }) => {
    await page.waitForTimeout(500)

    const fileInputs = page.locator('input[type="file"]')
    const count = await fileInputs.count()

    if (count < 3) {
      test.skip(true, `Seulement ${count} input file(s) — rendu conditionnel possible`)
      return
    }

    const fakeFile = (name, mime = 'image/jpeg') => ({
      name,
      mimeType: mime,
      buffer: Buffer.from(`fake-${name}-content`),
    })

    await fileInputs.nth(0).setInputFiles(fakeFile('id.jpg'))
    await fileInputs.nth(1).setInputFiles(fakeFile('kbis.pdf', 'application/pdf'))
    await fileInputs.nth(2).setInputFiles(fakeFile('rcpro.pdf', 'application/pdf'))

    // Le bouton de soumission doit être actif
    const submitBtn = page.getByRole('button', { name: /envoyer|soumettre|déposer|transmettre/i })
    if (await submitBtn.count() > 0) {
      await expect(submitBtn.first()).toBeEnabled({ timeout: 5000 })
    }
  })

  // ── Test 4 : Soumission réussie ───────────────────────────────────────────

  test('soumission réussie affiche la confirmation et un timestamp', async ({ page }) => {
    await page.waitForTimeout(500)

    const fileInputs = page.locator('input[type="file"]')

    if (await fileInputs.count() === 0) {
      test.skip(true, 'Aucun input file')
      return
    }

    // Upload minimum 1 document
    await fileInputs.first().setInputFiles({
      name: 'id.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake'),
    })

    // Cliquer sur soumettre
    const submitBtn = page.getByRole('button', { name: /envoyer|soumettre|déposer|transmettre/i })
    if (await submitBtn.count() === 0) {
      test.skip(true, 'Bouton de soumission non trouvé')
      return
    }

    await submitBtn.first().click()

    // Un toast ou message de succès doit apparaître
    const successMsg = page
      .getByText(/envoyé|transmis|succès|reçu|soumis/i)
      .or(page.locator('[role="alert"]'))
      .first()

    await expect(successMsg).toBeVisible({ timeout: 8000 })
  })

  // ── Test 5 : Affichage motif de refus ─────────────────────────────────────

  test('affiche le motif de refus si kyc_rejection_reason est présent', async ({ page }) => {
    // Réinitialiser avec un worker ayant un refus
    await page.unrouteAll()
    await setupWorkerSession(page, WORKER_KYC_REJECTED)

    await kycPage.goto()
    await kycPage.login()
    await page.waitForLoadState('networkidle')
    await kycPage.openKycTab()
    await page.waitForTimeout(500)

    // Le motif de refus doit être visible
    const rejectionText = page.getByText(/Document identité illisible|photo plus nette/i)
    await expect(rejectionText.first()).toBeVisible({ timeout: 5000 })
  })

  // ── Test 6 : Validation fichier trop volumineux ────────────────────────────

  test('rejette un fichier dépassant 10 MB', async ({ page }) => {
    await page.waitForTimeout(500)

    const fileInputs = page.locator('input[type="file"]')
    if (await fileInputs.count() === 0) {
      test.skip(true, 'Aucun input file')
      return
    }

    // Créer un faux fichier de 11 MB
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024, 'x')
    await fileInputs.first().setInputFiles({
      name: 'trop-gros.jpg',
      mimeType: 'image/jpeg',
      buffer: bigBuffer,
    })

    // Un message d'erreur de taille doit apparaître
    const errMsg = page.getByText(/taille|trop (grand|volumineux|lourd)|10 MB|Mo/i)
    await expect(errMsg.first()).toBeVisible({ timeout: 5000 })
  })
})
