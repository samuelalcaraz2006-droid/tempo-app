import { useEffect, useRef } from 'react'

// BUILD_ID injecté au build par vite.config.js. En dev, la valeur est 'dev'
// et le check est désactivé.
const CURRENT_BUILD_ID = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 min

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
 * Si le build côté serveur ≠ build embarqué, on recharge tout de suite.
 */
export function useUpdateChecker() {
  const reloadingRef = useRef(false)

  useEffect(() => {
    if (CURRENT_BUILD_ID === 'dev') return

    let cancelled = false

    const check = async () => {
      if (reloadingRef.current) return
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
          // Petit délai pour laisser une éventuelle navigation en cours se finir
          setTimeout(() => window.location.reload(), 50)
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
