import { useEffect, useRef } from 'react'

// BUILD_ID injecté au build par vite.config.js. En dev, la valeur est 'dev'
// et le check est désactivé.
const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 min
const RELOAD_ATTEMPT_KEY = 'tempo_update_reload_attempts'
const RELOAD_ATTEMPT_MAX = 3

/**
 * Détecte qu'une nouvelle version a été déployée et recharge la page.
 * Indépendant du service worker, du bfcache et du cache HTTP :
 * on fetch /version.json en `no-store` et on compare le buildId.
 *
 * Triggers :
 *  - au montage (une fois)
 *  - à chaque retour de visibilité (onglet repassé en foreground)
 *  - toutes les POLL_INTERVAL_MS tant que l'onglet est actif
 *
 * Garde-fou anti-boucle : au-delà de RELOAD_ATTEMPT_MAX tentatives
 * dans une même session (sessionStorage), on arrête d'essayer pour
 * ne pas recharger en boucle si le déploiement est bancal.
 */
export function useUpdateChecker() {
  const reloadingRef = useRef(false)

  useEffect(() => {
    if (CURRENT_BUILD_ID === 'dev') return

    let cancelled = false

    const readAttempts = () => {
      const raw = sessionStorage.getItem(RELOAD_ATTEMPT_KEY)
      const n = Number.parseInt(raw || '0', 10)
      return Number.isFinite(n) ? n : 0
    }

    const check = async () => {
      if (reloadingRef.current) return
      if (readAttempts() >= RELOAD_ATTEMPT_MAX) return
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'omit',
        })
        if (!res.ok) return
        const { buildId } = await res.json()
        if (cancelled || !buildId) return
        if (buildId !== CURRENT_BUILD_ID) {
          reloadingRef.current = true
          sessionStorage.setItem(RELOAD_ATTEMPT_KEY, String(readAttempts() + 1))
          // Petit délai pour laisser une éventuelle navigation en cours se finir
          setTimeout(() => window.location.reload(), 50)
        } else {
          // Versions alignées : on peut remettre le compteur à zéro.
          sessionStorage.removeItem(RELOAD_ATTEMPT_KEY)
        }
      } catch {
        // Offline ou erreur réseau — on retente au prochain cycle
      }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
}
