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
  try {
    new Notification(title, {
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      ...options,
    })
  } catch {
    // Fallback : via service worker (mobile)
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        ...options,
      })
    })
  }
}
