# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kyc-admin-rejection.spec.js >> KYC Admin — Rejet avec motif >> confirmer le rejet sans motif affiche une erreur de validation
- Location: e2e\kyc-admin-rejection.spec.js:59:7

# Error details

```
Error: locator.click: Page crashed
Call log:
  - waiting for getByRole('button', { name: /^connexion$/i })

```

# Test source

```ts
  1   | /**
  2   |  * Page Object Model — Panel Admin (onglet KYC)
  3   |  */
  4   | export class AdminPage {
  5   |   constructor(page) {
  6   |     this.page = page
  7   | 
  8   |     // Login
  9   |     this.emailInput    = page.getByLabel(/email/i).first()
  10  |     this.passwordInput = page.getByLabel(/mot de passe|password/i).first()
  11  |     this.loginButton   = page.getByRole('button', { name: /connexion|se connecter/i })
  12  | 
  13  |     // Navigation admin
  14  |     this.kycTab = page
  15  |       .getByRole('button', { name: /kyc/i })
  16  |       .or(page.getByRole('tab', { name: /kyc/i }))
  17  |       .first()
  18  | 
  19  |     // Liste KYC
  20  |     this.kycList = page.locator('[data-testid="kyc-list"], .kyc-list, table').first()
  21  | 
  22  |     // Boutons de validation par champ
  23  |     this.validateIdButton    = page.getByRole('button', { name: /valider.*id|valider.*identit/i }).first()
  24  |     this.validateSiretButton = page.getByRole('button', { name: /valider.*siret/i }).first()
  25  |     this.validateRcProButton = page.getByRole('button', { name: /valider.*rc|valider.*pro/i }).first()
  26  |     this.validateAllButton   = page.getByRole('button', { name: /tout valider|valider tout/i }).first()
  27  | 
  28  |     // Bouton refuser
  29  |     this.rejectButton = page.getByRole('button', { name: /refuser|rejeter/i }).first()
  30  | 
  31  |     // Modal de refus
  32  |     this.rejectModal       = page.locator('[data-testid="reject-modal"], .modal, [role="dialog"]').first()
  33  |     this.rejectReasonInput = page.getByRole('textbox', { name: /raison|motif|reason/i })
  34  |       .or(page.locator('textarea')).first()
  35  |     this.confirmRejectBtn  = page.getByRole('button', { name: /confirmer|valider le refus|refuser/i }).last()
  36  | 
  37  |     // Modal de validation
  38  |     this.confirmModal    = page.locator('[data-testid="confirm-modal"], [role="dialog"]').last()
  39  |     this.confirmValidBtn = page.getByRole('button', { name: /confirmer|oui|valider/i }).last()
  40  | 
  41  |     // Toast / notifications
  42  |     this.toast = page.locator('[data-testid="toast"], .toast, [role="alert"]').first()
  43  |   }
  44  | 
  45  |   async goto() {
  46  |     await this.page.goto('/')
  47  |     // La page d'accueil (Landing) s'affiche — cliquer "Connexion" pour atteindre Auth
  48  |     const connexionBtn = this.page.getByRole('button', { name: /^connexion$/i })
> 49  |     await connexionBtn.click()
      |                        ^ Error: locator.click: Page crashed
  50  |   }
  51  | 
  52  |   async login(email = 'admin@tempo.com', password = 'adminpass') {
  53  |     await this.emailInput.fill(email)
  54  |     await this.passwordInput.fill(password)
  55  |     await this.loginButton.click()
  56  |   }
  57  | 
  58  |   /**
  59  |    * Après login admin, AdminRoleSelector s'affiche.
  60  |    * Cliquer "Panel Admin" (⚙️) pour accéder à AdminApp.
  61  |    */
  62  |   async selectAdminPanel() {
  63  |     const adminPanelBtn = this.page.getByRole('button', { name: /panel admin/i })
  64  |     await adminPanelBtn.click()
  65  |   }
  66  | 
  67  |   async openKycTab() {
  68  |     await this.kycTab.click()
  69  |   }
  70  | 
  71  |   async clickValidateAll() {
  72  |     await this.validateAllButton.click()
  73  |   }
  74  | 
  75  |   async clickValidateId() {
  76  |     await this.validateIdButton.click()
  77  |   }
  78  | 
  79  |   async clickReject() {
  80  |     await this.rejectButton.click()
  81  |   }
  82  | 
  83  |   async fillRejectionReason(reason) {
  84  |     await this.rejectReasonInput.fill(reason)
  85  |   }
  86  | 
  87  |   async confirmRejection() {
  88  |     await this.confirmRejectBtn.click()
  89  |   }
  90  | 
  91  |   async confirmValidation() {
  92  |     await this.confirmValidBtn.click()
  93  |   }
  94  | 
  95  |   /**
  96  |    * Ouvre le document dans un nouvel onglet (signed URL)
  97  |    */
  98  |   async openDocument(docName) {
  99  |     const link = this.page.getByRole('link', { name: new RegExp(docName, 'i') })
  100 |     return link
  101 |   }
  102 | }
  103 | 
```