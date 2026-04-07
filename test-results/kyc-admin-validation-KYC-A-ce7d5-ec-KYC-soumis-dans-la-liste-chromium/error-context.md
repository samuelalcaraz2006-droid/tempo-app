# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kyc-admin-validation.spec.js >> KYC Admin — Validation de documents >> affiche le travailleur avec KYC soumis dans la liste
- Location: e2e\kyc-admin-validation.spec.js:36:7

# Error details

```
Test timeout of 60000ms exceeded while running "beforeEach" hook.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^connexion$/i })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:esbuild] The service is no longer running"
  - generic [ref=e5]: C:/Users/samsam/Downloads/tempo-app-v4_1/tempo-app/src/main.jsx
  - generic [ref=e6]: at C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:737:38 at sendRequest (C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:618:36) at start (C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:736:9) at Object.transform2 [as transform] (C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:797:5) at C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:2040:77 at new Promise (<anonymous>) at Object.transform (C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:2040:36) at transform (C:\Users\samsam\Downloads\tempo-app-v4_1\tempo-app\node_modules\esbuild\lib\main.js:1875:62) at transformWithEsbuild (file:///C:/Users/samsam/Downloads/tempo-app-v4_1/tempo-app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:19232:26) at TransformPluginContext.transform (file:///C:/Users/samsam/Downloads/tempo-app-v4_1/tempo-app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:19297:30) at PluginContainer.transform (file:///C:/Users/samsam/Downloads/tempo-app-v4_1/tempo-app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:49100:19) at async loadAndTransform (file:///C:/Users/samsam/Downloads/tempo-app-v4_1/tempo-app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:51978:27) at async viteTransformMiddleware (file:///C:/Users/samsam/Downloads/tempo-app-v4_1/tempo-app/node_modules/vite/dist/node/chunks/dep-BK3b2jBa.js:62106:24
  - generic [ref=e7]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e8]: server.hmr.overlay
    - text: to
    - code [ref=e9]: "false"
    - text: in
    - code [ref=e10]: vite.config.js
    - text: .
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
      |                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
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