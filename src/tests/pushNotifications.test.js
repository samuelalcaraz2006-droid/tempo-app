// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Les fonctions sont importées après que le mock de l'environnement soit en place
let isPushSupported, getPermissionStatus, requestPushPermission, sendLocalNotification

describe('pushNotifications', () => {
  let NotificationMock
  let serviceWorkerMock

  beforeEach(async () => {
    vi.resetModules()

    NotificationMock = vi.fn()
    NotificationMock.permission = 'granted'
    NotificationMock.requestPermission = vi.fn().mockResolvedValue('granted')

    serviceWorkerMock = {
      ready: Promise.resolve({
        showNotification: vi.fn(),
      }),
    }

    Object.defineProperty(window, 'Notification', {
      value: NotificationMock,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerMock,
      writable: true,
      configurable: true,
    })

    const mod = await import('../lib/pushNotifications')
    isPushSupported = mod.isPushSupported
    getPermissionStatus = mod.getPermissionStatus
    requestPushPermission = mod.requestPushPermission
    sendLocalNotification = mod.sendLocalNotification
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isPushSupported', () => {
    it('retourne true quand Notification et serviceWorker sont disponibles', () => {
      expect(isPushSupported()).toBe(true)
    })

    it('retourne false si Notification est absent', () => {
      const original = window.Notification
      delete window.Notification
      expect(isPushSupported()).toBe(false)
      window.Notification = original
    })
  })

  describe('getPermissionStatus', () => {
    it('retourne le statut de permission quand supporté', () => {
      NotificationMock.permission = 'granted'
      expect(getPermissionStatus()).toBe('granted')
    })

    it('retourne denied quand permission refusee', () => {
      NotificationMock.permission = 'denied'
      expect(getPermissionStatus()).toBe('denied')
    })

    it('retourne unsupported quand non supporté', () => {
      const original = window.Notification
      delete window.Notification
      expect(getPermissionStatus()).toBe('unsupported')
      window.Notification = original
    })
  })

  describe('requestPushPermission', () => {
    it('retourne unsupported si pas supporté', async () => {
      const original = window.Notification
      delete window.Notification
      const result = await requestPushPermission()
      expect(result).toBe('unsupported')
      window.Notification = original
    })

    it('demande la permission et retourne le résultat', async () => {
      NotificationMock.requestPermission = vi.fn().mockResolvedValue('granted')
      const result = await requestPushPermission()
      expect(result).toBe('granted')
      expect(NotificationMock.requestPermission).toHaveBeenCalled()
    })

    it('retourne denied si l\'utilisateur refuse', async () => {
      NotificationMock.requestPermission = vi.fn().mockResolvedValue('denied')
      const result = await requestPushPermission()
      expect(result).toBe('denied')
    })
  })

  describe('sendLocalNotification', () => {
    it('ne fait rien si la permission n\'est pas granted', () => {
      NotificationMock.permission = 'denied'
      sendLocalNotification('Test')
      expect(NotificationMock).not.toHaveBeenCalled()
    })

    it('ne fait rien si le titre est vide', () => {
      NotificationMock.permission = 'granted'
      sendLocalNotification('')
      expect(NotificationMock).not.toHaveBeenCalled()
    })

    it('ne fait rien si le titre n\'est pas une string', () => {
      NotificationMock.permission = 'granted'
      sendLocalNotification(42)
      expect(NotificationMock).not.toHaveBeenCalled()
    })

    it('crée une notification avec le titre tronqué à 100 chars', () => {
      NotificationMock.permission = 'granted'
      const longTitle = 'A'.repeat(200)
      sendLocalNotification(longTitle)
      expect(NotificationMock).toHaveBeenCalledWith(
        'A'.repeat(100),
        expect.any(Object)
      )
    })

    it('tronque le body à 200 chars', () => {
      NotificationMock.permission = 'granted'
      const longBody = 'B'.repeat(300)
      sendLocalNotification('Titre', { body: longBody })
      const callArgs = NotificationMock.mock.calls[0][1]
      expect(callArgs.body).toHaveLength(200)
    })

    it('ignore les options body non-string', () => {
      NotificationMock.permission = 'granted'
      sendLocalNotification('Titre', { body: 42 })
      const callArgs = NotificationMock.mock.calls[0][1]
      expect(callArgs.body).toBeUndefined()
    })

    it('utilise les icônes par défaut', () => {
      NotificationMock.permission = 'granted'
      sendLocalNotification('Titre')
      const callArgs = NotificationMock.mock.calls[0][1]
      expect(callArgs.icon).toBe('/icons/icon-192.svg')
      expect(callArgs.badge).toBe('/icons/icon-192.svg')
    })

    it('génère un tag unique avec le préfixe tempo-notif', () => {
      NotificationMock.permission = 'granted'
      sendLocalNotification('Titre')
      const callArgs = NotificationMock.mock.calls[0][1]
      expect(callArgs.tag).toMatch(/^tempo-notif-\d+$/)
    })
  })
})
