#!/usr/bin/env bash
#
# fix-claude-code-oauth.sh
# ------------------------
# Diagnostique et répare les problèmes d'authentification OAuth de
# Claude Code desktop (erreurs 503, jetons expirés, keychain verrouillé…).
#
# Usage :
#   bash scripts/fix-claude-code-oauth.sh             # diagnostic uniquement
#   bash scripts/fix-claude-code-oauth.sh --reset     # diagnostic + reset credentials
#
# Le script ne supprime JAMAIS vos credentials sans --reset, parce qu'une
# erreur 503 est côté serveur : effacer vos tokens ne la résout pas.

set -euo pipefail

BLUE="\033[0;34m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
NC="\033[0m"

log()  { printf "${BLUE}[INFO]${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}[OK]${NC}   %s\n" "$*"; }
warn() { printf "${YELLOW}[WARN]${NC} %s\n" "$*"; }
err()  { printf "${RED}[ERR]${NC}  %s\n" "$*" >&2; }

RESET=false
if [[ "${1:-}" == "--reset" ]]; then
  RESET=true
fi

# ---------------------------------------------------------------------------
# 1. Détection de l'OS
# ---------------------------------------------------------------------------
detect_os() {
  case "$(uname -s)" in
    Darwin*)  echo "macos" ;;
    Linux*)   echo "linux" ;;
    CYGWIN*|MINGW*|MSYS*) echo "windows" ;;
    *)        echo "unknown" ;;
  esac
}

OS="$(detect_os)"
log "OS détecté : ${OS}"

if [[ "${OS}" == "unknown" ]]; then
  err "OS non supporté : $(uname -s)"
  exit 1
fi

# ---------------------------------------------------------------------------
# 2. Test de connectivité vers les endpoints Anthropic (cause principale du 503)
# ---------------------------------------------------------------------------
log "Test de connectivité vers les serveurs Anthropic"

if ! command -v curl >/dev/null 2>&1; then
  err "curl est requis pour diagnostiquer la connectivité. Installez-le et relancez."
  exit 1
fi

check_endpoint() {
  local name="$1"
  local url="$2"
  local code
  code="$(curl -s -o /dev/null -w "%{http_code}" -m 10 "${url}" 2>/dev/null || echo "000")"

  case "${code}" in
    200|301|302|401|403)
      ok "${name} → HTTP ${code} (serveur joignable)"
      return 0
      ;;
    503)
      err "${name} → HTTP 503 (service indisponible côté Anthropic ou Cloudflare)"
      return 1
      ;;
    000)
      err "${name} → pas de réponse (DNS bloqué, firewall, proxy, ou pas d'Internet)"
      return 1
      ;;
    *)
      warn "${name} → HTTP ${code} (inattendu)"
      return 1
      ;;
  esac
}

NET_OK=true
check_endpoint "claude.ai"             "https://claude.ai/"                          || NET_OK=false
check_endpoint "console.anthropic.com" "https://console.anthropic.com/"              || NET_OK=false
check_endpoint "api.anthropic.com"     "https://api.anthropic.com/v1/messages"       || NET_OK=false
check_endpoint "OAuth authorize"       "https://claude.ai/oauth/authorize"           || NET_OK=false

echo
if ! ${NET_OK}; then
  err "Problème de connectivité détecté."
  cat <<'EOF'

Causes les plus probables d'une erreur 503 :

  1. Incident Anthropic en cours → https://status.anthropic.com
     (attendre 5–15 min, réessayer)

  2. Cloudflare vous bloque (challenge anti-bot, IP suspecte)
     → désactivez VPN / Tor / proxy résidentiel et réessayez

  3. Proxy d'entreprise qui intercepte HTTPS
     → vérifiez HTTPS_PROXY / HTTP_PROXY dans votre shell :
         env | grep -i proxy
     → ajoutez claude.ai et *.anthropic.com à la liste blanche

  4. DNS bloqué (FAI, Pi-hole, contrôle parental)
     → testez : nslookup claude.ai 1.1.1.1
     → si ça répond, votre DNS local filtre → changez pour 1.1.1.1

  5. IPv6 cassé sur votre réseau
     → forcez IPv4 : export CURL_IPV4=1

EOF
fi

# ---------------------------------------------------------------------------
# 3. Vérification du statut officiel Anthropic
# ---------------------------------------------------------------------------
log "Vérification du statut Anthropic (status.anthropic.com)"
STATUS_JSON="$(curl -sf -m 10 "https://status.anthropic.com/api/v2/status.json" 2>/dev/null || echo "")"

if [[ -n "${STATUS_JSON}" ]]; then
  if echo "${STATUS_JSON}" | grep -q '"indicator":"none"'; then
    ok "Anthropic status : all systems operational"
  else
    warn "Anthropic status page signale un incident — vérifiez https://status.anthropic.com"
    echo "${STATUS_JSON}" | head -c 500
    echo
  fi
else
  warn "Impossible de joindre status.anthropic.com"
fi

# ---------------------------------------------------------------------------
# 4. Vérification de l'horloge système (crucial pour OAuth)
# ---------------------------------------------------------------------------
log "Vérification de l'horloge système"

SYS_EPOCH="$(date +%s)"
NET_DATE="$(curl -sI -m 10 https://claude.ai 2>/dev/null | awk -F': ' '/^[Dd]ate: / { sub(/\r$/, "", $2); print $2; exit }')"

if [[ -n "${NET_DATE:-}" ]]; then
  if NET_EPOCH="$(date -d "${NET_DATE}" +%s 2>/dev/null)"; then
    :
  elif NET_EPOCH="$(date -j -f "%a, %d %b %Y %H:%M:%S %Z" "${NET_DATE}" +%s 2>/dev/null)"; then
    :
  else
    NET_EPOCH=""
  fi

  if [[ -n "${NET_EPOCH}" ]]; then
    DIFF=$(( SYS_EPOCH > NET_EPOCH ? SYS_EPOCH - NET_EPOCH : NET_EPOCH - SYS_EPOCH ))
    if (( DIFF > 60 )); then
      err "Horloge système décalée de ${DIFF}s — l'OAuth échouera. Activez la synchro automatique (NTP)."
    else
      ok "Horloge système OK (décalage ${DIFF}s)"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 5. État des credentials locaux
# ---------------------------------------------------------------------------
log "État des credentials Claude Code locaux"

FOUND=false
[[ -f "${HOME}/.claude.json"              ]] && { ok "Trouvé : ~/.claude.json";              FOUND=true; }
[[ -f "${HOME}/.claude/.credentials.json" ]] && { ok "Trouvé : ~/.claude/.credentials.json"; FOUND=true; }
[[ -d "${HOME}/.claude"                   ]] && ok "Trouvé : ~/.claude/"

if [[ "${OS}" == "macos" ]]; then
  if security find-generic-password -s "Claude Code-credentials" >/dev/null 2>&1; then
    ok "Trouvé : Keychain 'Claude Code-credentials'"
    FOUND=true
  fi
fi

if ! ${FOUND}; then
  warn "Aucun credential local trouvé — Claude Code va forcément demander une connexion OAuth."
fi

# ---------------------------------------------------------------------------
# 6. Reset des credentials (uniquement si --reset)
# ---------------------------------------------------------------------------
if ${RESET}; then
  echo
  log "Mode --reset : sauvegarde puis suppression des credentials"

  TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
  BACKUP_DIR="${HOME}/.claude-backup-${TIMESTAMP}"
  mkdir -p "${BACKUP_DIR}"

  [[ -f "${HOME}/.claude.json" ]] && cp "${HOME}/.claude.json" "${BACKUP_DIR}/.claude.json" && ok "Sauvegardé ~/.claude.json"
  [[ -d "${HOME}/.claude"      ]] && cp -R "${HOME}/.claude" "${BACKUP_DIR}/.claude"          && ok "Sauvegardé ~/.claude/"

  if [[ "${OS}" == "macos" ]]; then
    security delete-generic-password -s "Claude Code-credentials" >/dev/null 2>&1 || true
    ok "Credentials Keychain supprimés (si présents)"
  fi

  rm -f "${HOME}/.claude.json"              || true
  rm -f "${HOME}/.claude/.credentials.json" || true
  rm -f "${HOME}/.claude/auth.json"         || true
  ok "Fichiers de credentials supprimés"

  echo
  ok "Sauvegarde : ${BACKUP_DIR}"
else
  echo
  warn "Les credentials n'ont PAS été supprimés (par défaut)."
  warn "Comme votre erreur est un 503, le problème est côté serveur Anthropic — effacer vos tokens ne la résout pas."
  warn "Si après avoir corrigé la connectivité l'erreur persiste, relancez avec : --reset"
fi

# ---------------------------------------------------------------------------
# 7. Résumé et prochaines étapes
# ---------------------------------------------------------------------------
echo
log "Prochaines étapes :"
cat <<'EOF'

  1. Allez sur https://status.anthropic.com — si un incident est signalé,
     attendez que la coche verte revienne (5–30 min en général).

  2. Si votre réseau a un VPN / proxy / firewall d'entreprise : désactivez-le
     temporairement et relancez Claude Code.

  3. Testez la connectivité manuellement :
        curl -I https://claude.ai/oauth/authorize

     → Si vous voyez "HTTP/2 200" ou "HTTP/2 302" : OAuth est accessible.
     → Si vous voyez "HTTP/2 503" : le problème est bien côté serveur, attendez.

  4. Fermez complètement Claude Code (Cmd+Q ou Alt+F4) puis relancez-le.

  5. Si le navigateur ne s'ouvre pas automatiquement sur l'OAuth :
     tapez la touche 'c' dans Claude Code pour copier l'URL, et collez-la
     manuellement dans Chrome ou Firefox.

  6. Si rien ne fonctionne après 30 min, relancez ce script avec --reset
     pour forcer un nouveau flow OAuth depuis zéro.
EOF

echo
ok "Diagnostic terminé."
