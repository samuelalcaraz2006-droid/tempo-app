# Réparer Claude Code desktop — OAuth & erreur 503

Ce guide résout les problèmes d'authentification de **Claude Code desktop**
(l'application Mac/Windows/Linux d'Anthropic), en particulier :

- écran « Sign in with Claude » qui ne passe jamais
- **erreur 503** au moment du login OAuth
- « OAuth introuvable » / « impossible de trouver une clé OAuth »
- jeton expiré, Keychain verrouillé, navigateur qui ne s'ouvre pas

> ℹ️ Ce document concerne **l'app desktop d'Anthropic**, pas le projet TEMPO.
> Il est stocké ici parce que l'équipe utilise massivement Claude Code au
> quotidien et que la question revient souvent.

---

## 0. TL;DR — j'ai une erreur 503

Une erreur **503 Service Unavailable** au moment du login **n'est PAS un
problème de vos credentials**. C'est un souci côté serveur Anthropic ou sur
le chemin réseau (Cloudflare, VPN, proxy). Donc :

1. **N'effacez pas vos credentials tout de suite** — ça ne sert à rien.
2. Lancez le script de diagnostic :
   ```bash
   bash scripts/fix-claude-code-oauth.sh
   ```
3. Suivez ses recommandations dans l'ordre (status page → réseau → horloge).
4. **En dernier recours uniquement**, relancez avec `--reset` :
   ```bash
   bash scripts/fix-claude-code-oauth.sh --reset
   ```

---

## 1. Comment fonctionne l'auth Claude Code desktop

- L'app utilise **OAuth 2.0 exclusivement** — il n'y a pas d'option « clé API »
  pour l'application desktop.
- Au premier lancement, Claude Code ouvre votre navigateur vers
  `https://claude.ai/oauth/authorize`, vous approuvez, et l'app échange un
  code contre des jetons (access + refresh).
- Les jetons sont stockés :
  - **macOS** : dans le Keychain, entrée `Claude Code-credentials`
  - **Linux / Windows** : dans `~/.claude/.credentials.json`
  - Métadonnées (projet, config) : `~/.claude.json` et `~/.claude/`

**Abonnement requis** : Claude Pro, Max, Teams ou Enterprise — vérifiez
[claude.ai/settings](https://claude.ai/settings) que votre abonnement est
toujours actif.

---

## 2. Diagnostiquer l'erreur 503

Une 503 au login peut venir de 5 endroits :

| # | Cause                               | Comment vérifier                                      |
|---|-------------------------------------|-------------------------------------------------------|
| 1 | Incident Anthropic                  | <https://status.anthropic.com>                        |
| 2 | Cloudflare bloque votre IP          | Désactivez VPN, Tor, proxy résidentiel                |
| 3 | Proxy d'entreprise intercepte HTTPS | `env \| grep -i proxy`                                |
| 4 | DNS filtré (FAI, Pi-hole, parental) | `nslookup claude.ai 1.1.1.1`                          |
| 5 | IPv6 cassé sur votre réseau         | `curl -4 -I https://claude.ai/oauth/authorize`        |

Test manuel rapide :

```bash
curl -I https://claude.ai/oauth/authorize
```

- `HTTP/2 200` ou `HTTP/2 302` → OAuth accessible, le problème est ailleurs.
- `HTTP/2 503` → côté serveur, attendez 5–30 min et réessayez.
- `Could not resolve host` → DNS ou pas d'Internet.
- `Connection refused` → firewall ou proxy.

---

## 3. Solutions selon la cause

### 3.1 Incident Anthropic

Rien à faire côté client. Vérifiez <https://status.anthropic.com>, attendez
la résolution (en général < 30 min), relancez Claude Code.

### 3.2 VPN / Cloudflare

Cloudflare peut vous servir une 503 si votre IP a un score « bot » élevé
(VPN commerciaux, Tor, IP datacenter). Solution :

```bash
# Coupez votre VPN / Warp / Tailscale, puis :
curl -I https://claude.ai/oauth/authorize
```

Si le 503 disparaît → c'est bien votre VPN. Connectez-vous une fois sans VPN,
puis réactivez-le.

### 3.3 Proxy d'entreprise

```bash
env | grep -i proxy
```

Si `HTTPS_PROXY` ou `HTTP_PROXY` sont positionnés, Claude Code les utilise.
Votre proxy d'entreprise doit :

- autoriser `claude.ai`, `*.anthropic.com`, `console.anthropic.com`
- ne PAS intercepter HTTPS (sinon le certificat OAuth casse)
- ne PAS réécrire le `User-Agent`

Testez sans proxy :

```bash
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY curl -I https://claude.ai/oauth/authorize
```

### 3.4 DNS filtré

```bash
nslookup claude.ai 1.1.1.1
```

Si ça répond mais que votre DNS par défaut échoue, changez temporairement
vers `1.1.1.1` (Cloudflare) ou `8.8.8.8` (Google).

### 3.5 Horloge système décalée

OAuth valide les jetons sur l'horloge. Un décalage de plus de ~60 s casse le
flow.

- **macOS** : *Préférences Système → Date et heure → Régler automatiquement*
- **Linux** : `sudo timedatectl set-ntp true`
- **Windows** : *Paramètres → Heure et langue → Régler l'heure automatiquement*

---

## 4. Si le navigateur ne s'ouvre pas

Claude Code essaie d'ouvrir votre navigateur par défaut. S'il n'y arrive pas
(WSL, SSH, headless), il affiche l'URL OAuth dans le terminal.

- Appuyez sur la touche **`c`** dans Claude Code → l'URL est copiée dans votre
  presse-papier.
- Collez-la manuellement dans Chrome / Firefox / Safari.
- Approuvez la demande.
- Claude Code détecte l'approbation automatiquement via un callback local.

---

## 5. Reset complet des credentials (dernier recours)

**À ne faire QUE si la connectivité est OK et que la 503 a disparu**, mais
que l'app continue à refuser de se connecter.

### Avec le script (recommandé)

```bash
bash scripts/fix-claude-code-oauth.sh --reset
```

Il sauvegarde vos credentials dans `~/.claude-backup-YYYYMMDD-HHMMSS/` avant
de les supprimer.

### À la main

```bash
# macOS : supprimer du Keychain
security delete-generic-password -s "Claude Code-credentials"

# Tous OS : supprimer les fichiers de credentials
rm -f ~/.claude.json
rm -f ~/.claude/.credentials.json
rm -f ~/.claude/auth.json
```

Relancez Claude Code → il affichera à nouveau l'écran de login OAuth.

---

## 6. Commande `/logout` intégrée

Si vous arrivez à ouvrir Claude Code mais qu'il est dans un état incohérent,
vous pouvez aussi taper la commande slash suivante dans l'app :

```
/logout
```

Puis relancez Claude Code et refaites le flow OAuth.

---

## 7. Aide supplémentaire

- Documentation officielle : <https://docs.claude.com/en/docs/claude-code>
- Authentification : <https://docs.claude.com/en/docs/claude-code/setup#authentication>
- Statut : <https://status.anthropic.com>
- Issues GitHub : <https://github.com/anthropics/claude-code/issues>
- Dans l'app : commande `/feedback` pour remonter un bug à Anthropic.
