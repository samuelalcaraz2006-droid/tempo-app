// Cache busté à chaque déploiement pour éviter que les clients restent
// coincés sur d'anciens assets (bug: UI mobile qui revient en arrière).
// Bump le suffixe quand le SW lui-même change.
const CACHE_NAME = 'tempo-v3'

self.addEventListener('install', () => {
  // Active immédiatement le nouveau SW sans attendre la fermeture des onglets
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Supprime tous les anciens caches (purge complète à chaque nouveau SW)
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  if (url.hostname.includes('supabase')) return

  const isNavigate = e.request.mode === 'navigate'
  const isHTML = isNavigate || e.request.headers.get('accept')?.includes('text/html')

  if (isHTML) {
    // Network-first pour les pages HTML : garantit que le client récupère
    // toujours la dernière version (qui référence les bons hash d'assets).
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/'))),
    )
    return
  }

  // Pour tout le reste (JS/CSS/fonts avec hash Vite dans le filename),
  // on laisse faire le cache HTTP (Cache-Control immutable dans vercel.json).
})

// Push notification handler
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  const title = data.title || 'TEMPO'
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    data: { url: data.url || '/' },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil(clients.openWindow(url))
})
