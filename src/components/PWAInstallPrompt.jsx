import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { T } from '../design/tokens'
import { useI18n } from '../contexts/I18nContext'

// ═══════════════════════════════════════════════════════════════
// PWAInstallPrompt — CTA discret pour installer TEMPO sur mobile.
//
// Comportement :
// - Écoute l'event `beforeinstallprompt` (Chrome/Edge/Android).
// - N'apparaît PAS en standalone mode (déjà installé).
// - Persistance : si user dismiss, on ne redemande pas avant 30 jours.
// - Sur iOS Safari (pas d'event natif), on montre un message manuel
//   expliquant la procédure « Partager → Sur l'écran d'accueil ».
// ═══════════════════════════════════════════════════════════════

const DISMISS_KEY = 'tempo_pwa_install_dismissed_at'
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours

function isStandalone() {
  try {
    return (
      (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true
    )
  } catch {
    return false
  }
}

function isIOSSafari() {
  const ua = window.navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

function wasRecentlyDismissed() {
  try {
    const t = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10)
    return t > 0 && Date.now() - t < DISMISS_DURATION_MS
  } catch {
    return false
  }
}

export default function PWAInstallPrompt() {
  const { t } = useI18n()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (wasRecentlyDismissed()) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari : pas d'event natif, on affiche après 10 s d'usage.
    // Timer toujours cleanup au unmount (même si iOS et Chrome Android
    // s'excluent via useragent, defensive pour éviter un re-set tardif).
    let iosTimer = null
    if (isIOSSafari()) {
      iosTimer = setTimeout(() => setVisible(true), 10000)
    }

    return () => {
      if (iosTimer) clearTimeout(iosTimer)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (isIOSSafari()) {
      setShowIOSInstructions(true)
      return
    }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setVisible(false)
  }

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
    setVisible(false)
    setShowIOSInstructions(false)
  }

  if (!visible) return null

  if (showIOSInstructions) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-ios-title"
        style={{
          position: 'fixed', inset: 0, zIndex: T.z.modal,
          background: 'rgba(0,0,0,0.55)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <div
          style={{
            background: '#fff', borderRadius: T.radius.lg,
            padding: 24, maxWidth: 400, width: '100%',
            boxShadow: T.shadow.lg,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div id="pwa-ios-title" style={{ fontSize: T.size.md, fontWeight: 700, color: T.color.ink }}>
              {t('pwa_install_title')}
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('close')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: T.color.g5, padding: 4, display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          </div>
          <ol style={{ paddingLeft: 20, fontSize: T.size.base, color: T.color.g8, lineHeight: 1.6 }}>
            <li><strong>{t('pwa_install_ios_step1_label')}</strong> <span aria-hidden="true">⎙</span></li>
            <li><strong>{t('pwa_install_ios_step2_label')}</strong></li>
            <li><strong>{t('pwa_install_ios_step3_label')}</strong></li>
          </ol>
          <button
            type="button"
            className="a-btn-outline"
            onClick={dismiss}
            style={{ width: '100%', marginTop: 16 }}
          >
            {t('pwa_install_got_it')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <section
      aria-label={t('pwa_install_title')}
      style={{
        position: 'fixed', bottom: 20, left: 20, right: 20,
        zIndex: T.z.toast, maxWidth: 440, margin: '0 auto',
        background: T.color.navy, color: '#fff',
        padding: '14px 16px', borderRadius: T.radius.md,
        boxShadow: T.shadow.lg,
        display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: T.size.base, fontWeight: 600, marginBottom: 2 }}>
          {t('pwa_install_title')}
        </div>
        <div style={{ fontSize: T.size.sm, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
          {t('pwa_install_body')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('pwa_install_later')}
          style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center',
          }}
        >
          <X size={16} />
        </button>
        <button
          type="button"
          onClick={handleInstall}
          style={{
            background: T.color.brand, color: '#fff', border: 'none',
            padding: '8px 14px', borderRadius: T.radius.pill,
            fontSize: T.size.sm, fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {t('pwa_install_cta')}
        </button>
      </div>
    </section>
  )
}
