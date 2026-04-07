/**
 * Page Object Model — Panel Admin (onglet KYC)
 */
export class AdminPage {
  constructor(page) {
    this.page = page

    // Login
    this.emailInput    = page.getByLabel(/email/i).first()
    this.passwordInput = page.getByLabel(/mot de passe|password/i).first()
    this.loginButton   = page.getByRole('button', { name: /connexion|se connecter/i })

    // Navigation admin
    this.kycTab = page
      .getByRole('button', { name: /kyc/i })
      .or(page.getByRole('tab', { name: /kyc/i }))
      .first()

    // Liste KYC
    this.kycList = page.locator('[data-testid="kyc-list"], .kyc-list, table').first()

    // Boutons de validation par champ
    this.validateIdButton    = page.getByRole('button', { name: /valider.*id|valider.*identit/i }).first()
    this.validateSiretButton = page.getByRole('button', { name: /valider.*siret/i }).first()
    this.validateRcProButton = page.getByRole('button', { name: /valider.*rc|valider.*pro/i }).first()
    this.validateAllButton   = page.getByRole('button', { name: /tout valider|valider tout/i }).first()

    // Bouton refuser
    this.rejectButton = page.getByRole('button', { name: /refuser|rejeter/i }).first()

    // Modal de refus
    this.rejectModal       = page.locator('[data-testid="reject-modal"], .modal, [role="dialog"]').first()
    this.rejectReasonInput = page.getByRole('textbox', { name: /raison|motif|reason/i })
      .or(page.locator('textarea')).first()
    this.confirmRejectBtn  = page.getByRole('button', { name: /confirmer|valider le refus|refuser/i }).last()

    // Modal de validation
    this.confirmModal    = page.locator('[data-testid="confirm-modal"], [role="dialog"]').last()
    this.confirmValidBtn = page.getByRole('button', { name: /confirmer|oui|valider/i }).last()

    // Toast / notifications
    this.toast = page.locator('[data-testid="toast"], .toast, [role="alert"]').first()
  }

  async goto() {
    await this.page.goto('/')
    // La page d'accueil (Landing) s'affiche — cliquer "Connexion" pour atteindre Auth
    const connexionBtn = this.page.getByRole('button', { name: /^connexion$/i })
    await connexionBtn.click()
  }

  async login(email = 'admin@tempo.com', password = 'adminpass') {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  /**
   * Après login admin, AdminRoleSelector s'affiche.
   * Cliquer "Panel Admin" (⚙️) pour accéder à AdminApp.
   */
  async selectAdminPanel() {
    const adminPanelBtn = this.page.getByRole('button', { name: /panel admin/i })
    await adminPanelBtn.click()
  }

  async openKycTab() {
    await this.kycTab.click()
  }

  async clickValidateAll() {
    await this.validateAllButton.click()
  }

  async clickValidateId() {
    await this.validateIdButton.click()
  }

  async clickReject() {
    await this.rejectButton.click()
  }

  async fillRejectionReason(reason) {
    await this.rejectReasonInput.fill(reason)
  }

  async confirmRejection() {
    await this.confirmRejectBtn.click()
  }

  async confirmValidation() {
    await this.confirmValidBtn.click()
  }

  /**
   * Ouvre le document dans un nouvel onglet (signed URL)
   */
  async openDocument(docName) {
    const link = this.page.getByRole('link', { name: new RegExp(docName, 'i') })
    return link
  }
}
