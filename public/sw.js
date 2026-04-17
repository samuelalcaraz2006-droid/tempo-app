// Service worker minimaliste : PAS de cache applicatif.
// Les assets Vite ont déjà un hash unique dans leur filename (immutable
// via Cache-Control dans vercel.json), donc le cache HTTP du navigateur
// gère tout correctement. Un cache SW custom était la source des bugs
// de mise à jour où les clients restaient bloqués sur d'anciens assets.
//
// Ce SW ne sert plus qu'aux push notifications. Au premier chargement
// d'une version récente de l'app, on purge tous les anciens caches
// (tempo-v2, tempo-v3, etc.) et on désinscrit les stratégies fetch.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

// Pas de handler fetch : toutes les requêtes passent directement au réseau
// (et au cache HTTP natif du navigateur). Un handler vide empêche même
// le SW d'intercepter la moindre requête, éliminant toute source de bug.

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
