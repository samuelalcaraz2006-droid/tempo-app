import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { T } from '../design/tokens'
import { TempoLogoA } from '../design/primitives'

export default function ResetPassword({ onDone }) {
  const { logout } = useAuth()
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)
  const [showPass, setShowPass]         = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const isStrong = password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    if (!isStrong) { setError('Mot de passe trop faible : 10 caractères minimum avec une majuscule et un chiffre.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) { setLoading(false); setError(error.message); return }

    setSuccess(true)
    // Déconnexion propre puis redirect vers login
    setTimeout(async () => {
      await logout()
      onDone()
    }, 2000)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--wh)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <TempoLogoA size={26} dark={false} />
        </div>

        <div className="a-card" style={{ padding: 32 }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.color.greenL, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, color: T.color.greenD }}>
                ✓
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: T.color.ink, letterSpacing: '-0.02em' }}>Mot de passe <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>mis à jour</span> !</div>
              <div style={{ fontSize: 13, color: T.color.g5 }}>Vous allez être redirigé vers la connexion...</div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: T.font.mono, fontSize: 11, color: T.color.g5, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Récupération</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.02em', color: T.color.ink }}>Nouveau <span style={{ fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400, color: T.color.brand }}>mot de passe</span></div>
              <div style={{ fontSize: 14, color: T.color.g5, marginBottom: 24 }}>Choisissez un mot de passe sécurisé pour votre compte TEMPO.</div>

              {error && (
                <div style={{ background: 'var(--rd-l)', border: '1px solid var(--rd-l)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--rd)', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label htmlFor="new-password" className="a-label">Nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="new-password"
                      className="a-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--g4)' }}>
                      {showPass ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Indicateur de force */}
                  {password.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1, 2, 3, 4].map(i => {
                          const strength = password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
                            : password.length >= 10 ? 3
                            : password.length >= 8 ? 2 : 1
                          return (
                            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? (strength <= 1 ? 'var(--rd)' : strength === 2 ? 'var(--am)' : strength === 3 ? 'var(--bl)' : 'var(--gr)') : 'var(--g2)', transition: 'background .2s' }} />
                          )
                        })}
                      </div>
                      <div style={{ fontSize: 11, color: password.length < 8 ? 'var(--rd)' : password.length < 10 ? 'var(--am)' : 'var(--gr)' }}>
                        {password.length < 8 ? 'Trop court' : password.length < 10 ? 'Moyen' : password.length < 12 ? 'Bon' : 'Excellent'}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label htmlFor="confirm-password" className="a-label">Confirmer le mot de passe</label>
                  <input
                    id="confirm-password"
                    className="a-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Répétez le mot de passe"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  {confirm.length > 0 && password !== confirm && (
                    <div style={{ fontSize: 12, color: 'var(--rd)', marginTop: 4 }}>Les mots de passe ne correspondent pas</div>
                  )}
                  {confirm.length > 0 && password === confirm && (
                    <div style={{ fontSize: 12, color: 'var(--gr)', marginTop: 4 }}>✓ Les mots de passe correspondent</div>
                  )}
                </div>

                <button type="submit" className="a-btn-primary"
                  style={{ width: '100%', padding: '14px' }}
                  disabled={loading || password !== confirm || password.length < 8}>
                  {loading ? 'Mise à jour...' : 'Définir le nouveau mot de passe →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
