/**
 * Page Object Model — Section KYC du dashboard Travailleur
 */
export class KycPage {
  constructor(page) {
    this.page = page

    // Login form
    this.emailInput    = page.getByLabel(/email/i).first()
    this.passwordInput = page.getByLabel(/mot de passe|password/i).first()
    this.loginButton   = page.getByRole('button', { name: /connexion|se connecter/i })

    // KYC section
    this.kycSection        = page.locator('[data-testid="kyc-section"], #kyc, .kyc-section').first()
    this.idUploadZone      = page.locator('[data-testid="upload-id"], [data-doc-type="id"]').first()
    this.siretUploadZone   = page.locator('[data-testid="upload-siret"], [data-doc-type="siret"]').first()
    this.rcproUploadZone   = page.locator('[data-testid="upload-rcpro"], [data-doc-type="rcpro"]').first()
    this.submitKycButton   = page.getByRole('button', { name: /envoyer|soumettre|déposer/i })
    this.rejectionBanner   = page.locator('[data-testid="rejection-reason"], .rejection-reason, .bg-red-50').first()
    this.successMessage    = page.locator('[data-testid="kyc-success"], .kyc-success').first()
  }

  async goto() {
    await this.page.goto('/')
  }

  async login(email = 'jean.dupont@test.com', password = 'password123') {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  /**
   * Navigue vers l'onglet ou la section KYC dans le dashboard travailleur.
   * Cherche un bouton ou lien contenant "KYC", "documents", "vérification", etc.
   */
  async openKycTab() {
    const kycNav = this.page.getByRole('button', { name: /kyc|document|vérif/i })
      .or(this.page.getByRole('link', { name: /kyc|document|vérif/i }))
    if (await kycNav.count() > 0) {
      await kycNav.first().click()
    }
  }

  /**
   * Upload un fichier fictif dans la zone d'upload désignée.
   * @param {Locator} zone - La zone d'upload cible
   * @param {string} fileName - Nom du fichier simulé
   * @param {string} mimeType - MIME type du fichier
   */
  async uploadFile(zone, fileName = 'document.jpg', mimeType = 'image/jpeg') {
    // Cherche l'input file dans ou près de la zone
    const input = zone.locator('input[type="file"]')
      .or(this.page.locator('input[type="file"]').first())

    const buffer = Buffer.from('fake-file-content')
    await input.setInputFiles({
      name: fileName,
      mimeType,
      buffer,
    })
  }

  async uploadIdDocument() {
    const fileInput = this.page.locator('input[type="file"]').nth(0)
    await fileInput.setInputFiles({
      name: 'carte-identite.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-id-content'),
    })
  }

  async uploadSiretDocument() {
    const fileInput = this.page.locator('input[type="file"]').nth(1)
    await fileInput.setInputFiles({
      name: 'kbis.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-siret-content'),
    })
  }

  async uploadRcProDocument() {
    const fileInput = this.page.locator('input[type="file"]').nth(2)
    await fileInput.setInputFiles({
      name: 'rc-pro.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-rcpro-content'),
    })
  }

  async isRejectionVisible() {
    return this.rejectionBanner.isVisible()
  }

  async getRejectionText() {
    return this.rejectionBanner.textContent()
  }
}
