// ── Notifications push navigateur ──────────────────

export const isPushSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator

export const getPermissionStatus = () =>
  isPushSupported() ? Notification.permission : 'unsupported'

export const requestPushPermission = async () => {
  if (!isPushSupported()) return 'unsupported'
  const permission = await Notification.requestPermission()
  return permission
}

export const sendLocalNotification = (title, options = {}) => {
  if (getPermissionStatus() !== 'granted') return
  if (!title || typeof title !== 'string') return

  // Sanitiser : ne conserver que des champs scalaires de confiance
  const notifOptions = {
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    body: typeof options.body === 'string' ? options.body.slice(0, 200) : undefined,
    // tag généré côté client pour éviter toute injection via data externe
    tag: `tempo-notif-${Date.now()}`,
  }

  const safeTitle = title.slice(0, 100)

  try {
    new Notification(safeTitle, notifOptions)
  } catch {
    // Fallback : via service worker (mobile Safari, etc.)
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(
      (reg) => reg.showNotification(safeTitle, notifOptions),
      (err) => console.warn('[Push] Service worker indisponible:', err)
    )
  }
}
