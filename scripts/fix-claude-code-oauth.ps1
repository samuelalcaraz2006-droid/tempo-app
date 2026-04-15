<#
.SYNOPSIS
    Diagnostique et répare les problèmes d'authentification OAuth de
    Claude Code desktop sur Windows (erreur 503, jeton expiré, etc.)

.DESCRIPTION
    Équivalent PowerShell de scripts/fix-claude-code-oauth.sh pour les
    utilisateurs Windows qui n'ont ni bash ni WSL.

    Le script :
      1. Teste la connectivité vers les serveurs Anthropic
      2. Vérifie https://status.anthropic.com
      3. Contrôle l'horloge système (OAuth casse si décalage > 60s)
      4. Inventorie les credentials locaux (%USERPROFILE%\.claude*)
      5. (avec -Reset) Sauvegarde puis supprime les credentials

.PARAMETER Reset
    Si présent : sauvegarde les credentials dans
    %USERPROFILE%\.claude-backup-YYYYMMDD-HHMMSS puis les supprime
    pour forcer un nouveau flow OAuth.

    À n'utiliser QUE si la connectivité est OK mais que le login échoue
    quand même. Pour une erreur 503, laisser ce flag désactivé.

.EXAMPLE
    PS> .\scripts\fix-claude-code-oauth.ps1

    Lance le diagnostic sans rien supprimer.

.EXAMPLE
    PS> .\scripts\fix-claude-code-oauth.ps1 -Reset

    Lance le diagnostic puis efface les credentials après sauvegarde.
#>

[CmdletBinding()]
param(
    [switch]$Reset
)

$ErrorActionPreference = 'Continue'

function Write-Info  { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "[OK]   $Msg" -ForegroundColor Green }
function Write-Warn2 { param([string]$Msg) Write-Host "[WARN] $Msg" -ForegroundColor Yellow }
function Write-Err   { param([string]$Msg) Write-Host "[ERR]  $Msg" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# 0. Environnement
# ---------------------------------------------------------------------------
Write-Info "Windows PowerShell $($PSVersionTable.PSVersion) — utilisateur : $env:USERNAME"

# Force TLS 1.2 pour Invoke-WebRequest sur PowerShell 5.x
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {
    # Ignoré si déjà configuré ou PowerShell 7+
}

# ---------------------------------------------------------------------------
# 1. Connectivité vers les endpoints Anthropic (cause principale des 503)
# ---------------------------------------------------------------------------
Write-Info "Test de connectivité vers les serveurs Anthropic"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        $code = [int]$resp.StatusCode
    } catch [System.Net.WebException] {
        $code = 0
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
        }
    } catch {
        $code = 0
    }

    switch ($code) {
        { $_ -in 200, 301, 302, 401, 403 } {
            Write-Ok "$Name -> HTTP $code (serveur joignable)"
            return $true
        }
        503 {
            Write-Err "$Name -> HTTP 503 (service indisponible cote Anthropic ou Cloudflare)"
            return $false
        }
        0 {
            Write-Err "$Name -> pas de reponse (DNS, firewall, proxy, ou pas d'Internet)"
            return $false
        }
        default {
            Write-Warn2 "$Name -> HTTP $code (inattendu)"
            return $false
        }
    }
}

$netOk = $true
if (-not (Test-Endpoint -Name "claude.ai"             -Url "https://claude.ai/"                    )) { $netOk = $false }
if (-not (Test-Endpoint -Name "console.anthropic.com" -Url "https://console.anthropic.com/"        )) { $netOk = $false }
if (-not (Test-Endpoint -Name "api.anthropic.com"     -Url "https://api.anthropic.com/v1/messages" )) { $netOk = $false }
if (-not (Test-Endpoint -Name "OAuth authorize"       -Url "https://claude.ai/oauth/authorize"     )) { $netOk = $false }

Write-Host ""
if (-not $netOk) {
    Write-Err "Probleme de connectivite detecte."
    Write-Host @"

Causes les plus probables d'une erreur 503 sur Windows :

  1. Incident Anthropic en cours -> https://status.anthropic.com
     (attendre 5 a 30 minutes, reessayer)

  2. Cloudflare bloque votre IP (VPN / Tor / proxy residentiel)
     -> deconnectez votre VPN et reessayez

  3. Proxy d'entreprise qui intercepte HTTPS
     -> verifiez avec :
         netsh winhttp show proxy
         Get-ChildItem Env: | Where-Object Name -match 'PROXY'
     -> demandez a votre IT d'ajouter a la liste blanche :
         claude.ai, *.anthropic.com, console.anthropic.com

  4. DNS filtre (FAI, controle parental, Pi-hole)
     -> testez :
         Resolve-DnsName claude.ai -Server 1.1.1.1
     -> si ca repond, votre DNS local filtre -> changez pour 1.1.1.1
        (Panneau de configuration -> Reseau -> proprietes IPv4 -> DNS)

  5. IPv6 casse sur votre reseau
     -> forcez IPv4 dans un navigateur / desactivez IPv6 sur l'adaptateur

  6. Windows Defender Firewall / antivirus bloque Claude Code
     -> verifiez les regles sortantes pour "claude.exe" / "Claude.exe"

"@
}

# ---------------------------------------------------------------------------
# 2. Status officiel Anthropic
# ---------------------------------------------------------------------------
Write-Info "Verification du statut Anthropic (status.anthropic.com)"
try {
    $status = Invoke-RestMethod -Uri "https://status.anthropic.com/api/v2/status.json" -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    if ($status.status.indicator -eq "none") {
        Write-Ok "Anthropic status : all systems operational"
    } else {
        Write-Warn2 ("Anthropic status : {0} - {1}" -f $status.status.indicator, $status.status.description)
        Write-Warn2 "Voir https://status.anthropic.com pour les details"
    }
} catch {
    Write-Warn2 "Impossible de joindre status.anthropic.com"
}

# ---------------------------------------------------------------------------
# 3. Horloge systeme (crucial pour OAuth)
# ---------------------------------------------------------------------------
Write-Info "Verification de l'horloge systeme"

try {
    $resp = Invoke-WebRequest -Uri "https://claude.ai" -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
    $netDate = $resp.Headers["Date"]
    if ($netDate) {
        $netTime = [DateTime]::Parse($netDate).ToUniversalTime()
        $sysTime = (Get-Date).ToUniversalTime()
        $diff    = [Math]::Abs(($sysTime - $netTime).TotalSeconds)
        if ($diff -gt 60) {
            Write-Err ("Horloge systeme decalee de {0:N0}s vs claude.ai - l'OAuth echouera." -f $diff)
            Write-Err "Reglez : Parametres -> Heure et langue -> Regler l'heure automatiquement"
        } else {
            Write-Ok ("Horloge systeme OK (decalage {0:N0}s)" -f $diff)
        }
    }
} catch {
    Write-Warn2 "Impossible de verifier l'horloge (pas de reponse de claude.ai)"
}

# ---------------------------------------------------------------------------
# 4. Inventaire des credentials Claude Code
# ---------------------------------------------------------------------------
Write-Info "Etat des credentials Claude Code locaux"

$claudeJson = Join-Path $env:USERPROFILE ".claude.json"
$claudeDir  = Join-Path $env:USERPROFILE ".claude"
$credFile   = Join-Path $claudeDir ".credentials.json"
$authFile   = Join-Path $claudeDir "auth.json"

$found = $false
if (Test-Path $claudeJson) { Write-Ok "Trouve : $claudeJson"; $found = $true }
if (Test-Path $credFile)   { Write-Ok "Trouve : $credFile";   $found = $true }
if (Test-Path $authFile)   { Write-Ok "Trouve : $authFile";   $found = $true }
if (Test-Path $claudeDir)  { Write-Ok "Trouve : $claudeDir" }

if (-not $found) {
    Write-Warn2 "Aucun credential local trouve - Claude Code va forcement redemander une connexion OAuth."
}

# ---------------------------------------------------------------------------
# 5. Reset (uniquement si -Reset)
# ---------------------------------------------------------------------------
if ($Reset) {
    Write-Host ""
    Write-Info "Mode -Reset : sauvegarde puis suppression des credentials"

    $ts        = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupDir = Join-Path $env:USERPROFILE ".claude-backup-$ts"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    if (Test-Path $claudeJson) {
        Copy-Item $claudeJson (Join-Path $backupDir ".claude.json") -Force
        Write-Ok "Sauvegarde : $claudeJson"
    }
    if (Test-Path $claudeDir) {
        Copy-Item $claudeDir (Join-Path $backupDir ".claude") -Recurse -Force
        Write-Ok "Sauvegarde : $claudeDir"
    }

    if (Test-Path $claudeJson) { Remove-Item $claudeJson -Force -ErrorAction SilentlyContinue }
    if (Test-Path $credFile)   { Remove-Item $credFile   -Force -ErrorAction SilentlyContinue }
    if (Test-Path $authFile)   { Remove-Item $authFile   -Force -ErrorAction SilentlyContinue }

    Write-Ok "Fichiers de credentials supprimes"
    Write-Host ""
    Write-Ok "Sauvegarde complete : $backupDir"
} else {
    Write-Host ""
    Write-Warn2 "Les credentials n'ont PAS ete supprimes (par defaut)."
    Write-Warn2 "Une erreur 503 vient du serveur Anthropic - effacer vos tokens ne la resout pas."
    Write-Warn2 "Si apres avoir corrige la connectivite l'erreur persiste, relancez avec : -Reset"
}

# ---------------------------------------------------------------------------
# 6. Prochaines etapes
# ---------------------------------------------------------------------------
Write-Host ""
Write-Info "Prochaines etapes :"
Write-Host @"

  1. Consultez https://status.anthropic.com - si un incident est signale,
     attendez la resolution (5-30 min en general).

  2. Coupez VPN / Warp / Tailscale / Tor temporairement et relancez :
         Invoke-WebRequest https://claude.ai/oauth/authorize -Method Head

     -> HTTP 200 ou 302 : OAuth est accessible
     -> HTTP 503        : cote serveur, attendez
     -> Timeout         : firewall / proxy / DNS

  3. Fermez completement Claude Code desktop (menu Fichier -> Quitter,
     ou clic droit sur la tray icon -> Quit) puis relancez-le.

  4. Si le navigateur ne s'ouvre pas tout seul pour l'OAuth :
     tapez la touche 'c' dans Claude Code pour copier l'URL,
     puis collez-la dans Edge / Chrome / Firefox.

  5. Si rien ne marche apres 30 min et que la connectivite est OK,
     relancez ce script avec -Reset pour repartir de zero :
         .\scripts\fix-claude-code-oauth.ps1 -Reset

"@

Write-Ok "Diagnostic termine."
