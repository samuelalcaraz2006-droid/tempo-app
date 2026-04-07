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

  const notifOptions = {
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    ...options,
  }

  try {
    new Notification(title, notifOptions)
  } catch {
    // Fallback : via service worker (mobile Safari, etc.)
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready.then(
      (reg) => reg.showNotification(title, notifOptions),
      (err) => console.warn('[Push] Service worker indisponible:', err)
    )
  }
}
