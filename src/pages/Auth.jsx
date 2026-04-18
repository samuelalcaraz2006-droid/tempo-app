import React, { useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'
import { T } from '../design/tokens'
import { TempoLogoA, Avatar, Pill, LiveDot, GridBg } from '../design/primitives'
import { captureError } from '../lib/sentry'

const SECTORS = ['Logistique', 'BTP', 'Industrie', 'Hôtellerie', 'Propreté']

// Field gardé EN DEHORS d'Auth pour éviter la recréation à chaque frappe.
const Field = ({ label, id, form, set, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    <label className="a-label" htmlFor={id}>{label}</label>
    <input id={id} className="a-input" {...props} onChange={e => set(id, e.target.value)} value={form[id] || ''} />
  </div>
)

const isStrongPassword = (pwd) =>
  pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)

const PasswordStrength = ({ password }) => {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent']
  const colors = [T.color.red, T.color.red, T.color.amber, T.color.brand, T.color.green]
  const level = Math.min(score, 4)
  return (
    <div style={{ marginTop: 6, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= level ? colors[level] : T.color.g2,
            transition: 'background .2s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, color: colors[level], fontWeight: 500 }}>{labels[level]}</div>
    </div>
  )
}

const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin .6s linear infinite' }}>
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity=".25" />
    <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const ErrorBox = ({ children }) => (
  <div style={{
    background: T.color.redL, border: '1px solid #FECACA',
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13, color: T.color.red, marginBottom: 14,
  }}>{children}</div>
)

const SuccessBox = ({ children }) => (
  <div style={{
    background: T.color.greenL, border: '1px solid #D1FAE5',
    borderRadius: 12, padding: '10px 14px',
    fontSize: 13, color: T.color.greenD, marginBottom: 14,
  }}>{children}</div>
)

const InfoBox = ({ tone = 'brand', children }) => {
  const colors = {
    brand: { bg: T.color.brandL, bd: 'rgba(37,99,235,0.15)', fg: T.color.brandD },
    green: { bg: T.color.greenL, bd: '#BBF7D0', fg: T.color.greenD },
  }[tone]
  return (
    <div style={{
      marginTop: 8, padding: '11px 14px', background: colors.bg,
      border: `1px solid ${colors.bd}`, borderRadius: 12,
      fontSize: 12, color: colors.fg, lineHeight: 1.55,
    }}>{children}</div>
  )
}

export default function Auth({ onNavigate }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [role, setRole] = useState(null)    // 'travailleur' | 'entreprise'
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(null)

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', phone: '',
    companyName: '', siret: '', sector: '',
    city: '', radiusKm: 10,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
      setError(`Trop de tentatives. Réessayez dans ${secs}s.`)
      return
    }
    setLoading(true)
    const { error } = await login({ email: form.email, password: form.password })
    setLoading(false)
    if (error) {
      const isCredentialError = error.message.includes('Invalid login') || error.message.includes('invalid_credentials')
      setError(isCredentialError ? 'Email ou mot de passe incorrect.' : 'Erreur d\'authentification. Veuillez réessayer.')
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)
      if (newAttempts >= 5) {
        setLockedUntil(Date.now() + 30_000)
        setLoginAttempts(0)
      }
    } else {
      setLoginAttempts(0)
      setLockedUntil(null)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: window.location.origin,
    })
    setLoading(false)
    if (error) {
      captureError(error.message, { source: 'Auth' })
      setError('Impossible d\'envoyer l\'email. Vérifiez l\'adresse ou réessayez.')
    } else {
      setSuccess('Email envoyé ! Vérifiez votre boîte mail pour réinitialiser votre mot de passe.')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (!isStrongPassword(form.password)) { setError('Mot de passe trop faible : 10 caractères minimum avec une majuscule et un chiffre.'); return }
    setLoading(true)
    const { error } = await register({
      email: form.email,
      password: form.password,
      role,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName,
      phone: form.phone,
      siret: form.siret,
      city: form.city,
      radiusKm: form.radiusKm,
    })
    setLoading(false)
    if (error) {
      captureError(error.message, { source: 'Auth' })
      setError('Impossible de créer le compte. Vérifiez vos informations ou réessayez.')
    } else {
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
    }
  }

  // ─── Calcule l'eyebrow + titre éditorial selon le mode ───
  const eyebrow = (() => {
    if (mode === 'login') return '01 / Connexion'
    if (mode === 'reset') return 'Récupération'
    if (mode === 'register' && !role) return '01 / Profil'
    if (mode === 'register' && role === 'travailleur') return `${step === 1 ? '01' : step === 2 ? '02' : '03'} / 03 · Inscription travailleur`
    if (mode === 'register' && role === 'entreprise') return 'Inscription entreprise'
    return ''
  })()

  const headline = (() => {
    if (mode === 'login') return <>Bon retour <em>parmi nous</em>.</>
    if (mode === 'reset') return <>Récupérez votre <em>accès</em>.</>
    if (mode === 'register' && !role) return <>Rejoignez <em>TEMPO</em>.</>
    if (mode === 'register' && role === 'travailleur') return <>Votre profil <em>travailleur</em>.</>
    if (mode === 'register' && role === 'entreprise') return <>Votre espace <em>entreprise</em>.</>
    return null
  })()

  const subHeadline = (() => {
    if (mode === 'login') return 'Accédez à votre tableau de bord et à vos missions en cours.'
    if (mode === 'reset') return 'Entrez votre email pour recevoir un lien de réinitialisation.'
    if (mode === 'register' && !role) return 'Choisissez votre profil pour commencer.'
    if (mode === 'register' && role === 'travailleur') {
      if (step === 1) return 'Votre identité pour le profil TEMPO Vérifié.'
      if (step === 2) return 'Vérification de votre statut auto-entrepreneur.'
      return 'Créez vos identifiants de connexion.'
    }
    if (mode === 'register' && role === 'entreprise') return 'Commission 8 % par mission réalisée. Aucun engagement.'
    return ''
  })()

  return (
    <div className="auth-a-root" style={{
      display: 'grid', gridTemplateColumns: '1.05fr 1fr',
      minHeight: '100vh', background: T.color.wh,
      fontFamily: T.font.body,
    }}>
      {/* ═══ LEFT — Navy editorial panel ═══ */}
      <div className="auth-a-left" style={{
        position: 'relative', background: T.color.navy,
        padding: '56px 56px 48px', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <GridBg opacity={0.22} />
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%', width: 540, height: 540,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-25%', right: '-10%', width: 500, height: 500,
          borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
        }} />

        <div style={{ position: 'relative' }}>
          <TempoLogoA size={26} />
        </div>

        <div style={{ position: 'relative', marginTop: 'auto', marginBottom: 32 }}>
          <Pill variant="white" icon={<LiveDot color={T.color.brandXL} size={7} />}>Staffing on‑demand</Pill>

          <h1 style={{
            marginTop: 24, fontSize: 64, lineHeight: 0.98, fontWeight: 800,
            color: '#fff', letterSpacing: '-0.035em', fontFamily: T.font.body,
          }}>
            Reprenez la <br />
            <span style={{
              fontFamily: T.font.serif, fontStyle: 'italic', fontWeight: 400,
              color: T.color.brandXL,
            }}>main</span> sur votre <br />
            prochaine mission.
          </h1>

          <p style={{
            marginTop: 24, fontSize: 16, lineHeight: 1.6,
            color: 'rgba(255,255,255,0.68)', maxWidth: 440,
          }}>
            Connectez‑vous pour accéder à votre tableau de bord et reprendre où vous en étiez.
          </p>

          <div style={{
            marginTop: 40, padding: '20px 22px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            borderRadius: 18, maxWidth: 440,
          }}>
            <div style={{
              fontFamily: T.font.serif, fontSize: 40, lineHeight: 0.4,
              color: T.color.brandXL, height: 16,
            }}>“</div>
            <div style={{
              marginTop: 4, fontSize: 15, lineHeight: 1.55,
              color: 'rgba(255,255,255,0.88)', fontWeight: 400,
            }}>
              On a staffé un shift critique un dimanche soir en moins de 30 minutes.
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar name="Nadia Lefèvre" seed={3} size={34} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>Nadia Lefèvre</div>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Responsable Ops · Entrepôt régional</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 36, marginTop: 40, flexWrap: 'wrap' }}>
            {[['2 400+', 'actifs'], ['98%', 'pourvues'], ['< 30 min', 'matching']].map(([v, l]) => (
              <div key={l}>
                <div style={{
                  fontSize: 24, fontWeight: 800, color: '#fff',
                  letterSpacing: '-0.02em', fontFamily: T.font.body,
                }}>{v}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT — Form area ═══ */}
      <div style={{
        padding: '40px 56px 48px', display: 'flex',
        flexDirection: 'column', overflow: 'hidden',
        background: T.color.wh,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => onNavigate(null)}
            style={{
              background: 'none', border: 'none', color: T.color.g5,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >← Retour à l'accueil</button>
          {mode !== 'reset' && (
            <div style={{ fontSize: 12.5, color: T.color.g5 }}>
              {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà inscrit ? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setRole(null); setStep(1); setError(''); setSuccess('') }}
                style={{
                  background: 'none', border: 'none', color: T.color.brand,
                  fontWeight: 600, cursor: 'pointer', fontSize: 12.5, padding: 0,
                }}
              >{mode === 'login' ? 'Créer un compte' : 'Se connecter'}</button>
            </div>
          )}
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          maxWidth: 440, margin: '0 auto', width: '100%', padding: '24px 0',
        }}>
          {eyebrow && (
            <div style={{
              fontFamily: T.font.mono, fontSize: 11, color: T.color.g5,
              letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
            }}>{eyebrow}</div>
          )}
          {headline && (
            <h2 style={{
              marginTop: 10, fontSize: 40, fontWeight: 800, lineHeight: 1.03,
              color: T.color.ink, letterSpacing: '-0.03em', fontFamily: T.font.body,
            }}>
              {React.Children.map(headline.props?.children || headline, (child) => {
                if (React.isValidElement(child) && child.type === 'em') {
                  return React.cloneElement(child, {
                    style: {
                      fontFamily: T.font.serif, fontStyle: 'italic',
                      fontWeight: 400, color: T.color.brand,
                    },
                  })
                }
                return child
              })}
            </h2>
          )}
          {subHeadline && (
            <p style={{ marginTop: 12, fontSize: 15, color: T.color.g5, lineHeight: 1.55 }}>
              {subHeadline}
            </p>
          )}

          {/* Toggle Connexion / Inscription (sauf mode reset et rôle-picker) */}
          {mode !== 'reset' && !(mode === 'register' && !role) && (
            <div style={{
              marginTop: 28, display: 'flex', gap: 4, padding: 4,
              background: T.color.g1, borderRadius: 999,
            }}>
              {[['login', 'Connexion'], ['register', 'Inscription']].map(([m, l]) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setRole(null); setStep(1); setError(''); setSuccess('') }}
                  style={{
                    flex: 1, padding: '10px 0', border: 'none',
                    borderRadius: 999, fontSize: 13.5, fontWeight: 600,
                    background: mode === m ? '#fff' : 'transparent',
                    color: mode === m ? T.color.ink : T.color.g5, cursor: 'pointer',
                    boxShadow: mode === m ? '0 1px 3px rgba(15,23,42,.08)' : 'none',
                    transition: 'background .15s, color .15s',
                  }}
                >{l}</button>
              ))}
            </div>
          )}

          {/* ─── LOGIN ─── */}
          {mode === 'login' && (
            <div style={{ marginTop: 28 }}>
              {success && <SuccessBox>{success}</SuccessBox>}
              {error && <ErrorBox>{error}</ErrorBox>}
              <form onSubmit={handleLogin}>
                <Field form={form} set={set} label="Email" id="email" type="email" placeholder="votre@email.fr" required />
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="a-label" htmlFor="password">Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
                      style={{
                        background: 'none', border: 'none', color: T.color.brand,
                        fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0,
                      }}
                    >Oublié ?</button>
                  </div>
                  <input id="password" className="a-input" type="password" placeholder="••••••••"
                    value={form.password} onChange={e => set('password', e.target.value)} required />
                </div>
                <button type="submit" className="a-btn-primary"
                  style={{ width: '100%', marginTop: 20, padding: '15px 22px' }}
                  disabled={loading}>
                  {loading ? <><Spinner /> Connexion...</> : 'Se connecter →'}
                </button>
              </form>
            </div>
          )}

          {/* ─── ROLE PICKER ─── */}
          {mode === 'register' && !role && (
            <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
              {[
                { id: 'travailleur', t: 'Je suis travailleur', d: 'Je cherche des missions en tant qu\'auto‑entrepreneur.', icon: '◉' },
                { id: 'entreprise', t: 'Je suis une entreprise', d: 'Je publie des missions et cherche des profils vérifiés.', icon: '▤' },
              ].map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 18, padding: '20px 22px',
                    background: '#fff', border: `1.5px solid ${T.color.g2}`,
                    borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s', fontFamily: 'inherit',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = T.color.brand; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37,99,235,.08)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = T.color.g2; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: T.color.brandL, color: T.color.brand,
                    fontSize: 18, fontWeight: 700,
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                    border: '1px solid rgba(37,99,235,0.15)',
                  }}>{r.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: T.color.ink, letterSpacing: '-0.01em' }}>{r.t}</div>
                    <div style={{ fontSize: 12.5, color: T.color.g5, marginTop: 4, lineHeight: 1.5 }}>{r.d}</div>
                  </div>
                  <div style={{ color: T.color.g4, fontSize: 18 }}>→</div>
                </button>
              ))}
            </div>
          )}

          {/* ─── WORKER REGISTER ─── */}
          {mode === 'register' && role === 'travailleur' && (
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 22 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= step ? T.color.brand : T.color.g2,
                    transition: 'background .2s',
                  }} />
                ))}
              </div>
              {error && <ErrorBox>{error}</ErrorBox>}
              {success && <SuccessBox>{success}</SuccessBox>}
              <form onSubmit={step < 3 ? (e) => { e.preventDefault(); setStep(s => s + 1) } : handleRegister}>
                {step === 1 && <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field form={form} set={set} label="Prénom" id="firstName" placeholder="Marc" required />
                    <Field form={form} set={set} label="Nom" id="lastName" placeholder="Rousseau" required />
                  </div>
                  <Field form={form} set={set} label="Téléphone" id="phone" type="tel" placeholder="06 12 34 56 78" />
                  <div style={{ marginBottom: 14 }}>
                    <label className="a-label">Secteur principal</label>
                    <select className="a-input" value={form.sector} onChange={e => set('sector', e.target.value)}>
                      <option value="">Choisir...</option>
                      {SECTORS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </>}
                {step === 2 && <>
                  <Field form={form} set={set} label="Numéro SIRET" id="siret" placeholder="837 204 918 00021" maxLength={14} />
                  <InfoBox tone="brand">
                    Vérification automatique via API INSEE. Votre statut auto‑entrepreneur sera confirmé en temps réel.
                  </InfoBox>
                  <div style={{ marginTop: 14 }}>
                    <Field form={form} set={set} label="Ville" id="city" placeholder="Lyon" required />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="a-label">Rayon de recherche missions : <strong>{form.radiusKm} km</strong></label>
                    <input type="range" min={5} max={50} step={5} value={form.radiusKm}
                      onChange={e => set('radiusKm', e.target.value)}
                      style={{ width: '100%' }}
                      aria-label={`Rayon de recherche : ${form.radiusKm} km`}
                      aria-valuenow={form.radiusKm} aria-valuemin={5} aria-valuemax={50} />
                  </div>
                </>}
                {step === 3 && <>
                  <Field form={form} set={set} label="Email" id="email" type="email" placeholder="marc@email.fr" required />
                  <Field form={form} set={set} label="Mot de passe" id="password" type="password" placeholder="10 caractères min. avec majuscule + chiffre" required minLength={10} />
                  <PasswordStrength password={form.password} />
                  <Field form={form} set={set} label="Confirmer le mot de passe" id="confirmPassword" type="password" placeholder="••••••••" required />
                  <InfoBox tone="brand">
                    Après inscription, vous devrez uploader votre pièce d'identité et certifications pour activer votre profil TEMPO Vérifié.
                  </InfoBox>
                </>}
                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button type="button" className="a-btn-outline"
                    onClick={() => step > 1 ? setStep(s => s - 1) : setRole(null)}
                    style={{ flex: 0 }}>← Retour</button>
                  <button type="submit" className="a-btn-primary"
                    style={{ flex: 1 }} disabled={loading}>
                    {loading ? <><Spinner /> Création...</> : step < 3 ? `Continuer — Étape ${step + 1} / 3 →` : 'Créer mon compte TEMPO →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── COMPANY REGISTER ─── */}
          {mode === 'register' && role === 'entreprise' && (
            <div style={{ marginTop: 28 }}>
              {error && <ErrorBox>{error}</ErrorBox>}
              {success && <SuccessBox>{success}</SuccessBox>}
              <form onSubmit={handleRegister}>
                <Field form={form} set={set} label="Nom de l'entreprise" id="companyName" placeholder="Amazon Logistics" required />
                <Field form={form} set={set} label="SIRET" id="siret" placeholder="123 456 789 00012" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field form={form} set={set} label="Prénom contact" id="firstName" placeholder="Jean" required />
                  <Field form={form} set={set} label="Nom contact" id="lastName" placeholder="Dupont" required />
                </div>
                <Field form={form} set={set} label="Email professionnel" id="email" type="email" placeholder="rh@entreprise.fr" required />
                <Field form={form} set={set} label="Mot de passe" id="password" type="password" placeholder="10 caractères min. avec majuscule + chiffre" required minLength={10} />
                <PasswordStrength password={form.password} />
                <Field form={form} set={set} label="Confirmer" id="confirmPassword" type="password" placeholder="••••••••" required />
                <InfoBox tone="green">
                  TEMPO génère automatiquement contrats et factures. Aucune gestion administrative.
                </InfoBox>
                <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                  <button type="button" className="a-btn-outline"
                    onClick={() => setRole(null)}
                    style={{ flex: 0 }}>← Retour</button>
                  <button type="submit" className="a-btn-primary"
                    style={{ flex: 1 }} disabled={loading}>
                    {loading ? <><Spinner /> Création...</> : 'Créer mon espace →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─── RESET PASSWORD ─── */}
          {mode === 'reset' && (
            <div style={{ marginTop: 28 }}>
              {error && <ErrorBox>{error}</ErrorBox>}
              {success && <SuccessBox>{success}</SuccessBox>}
              {!success && (
                <form onSubmit={handleReset}>
                  <Field form={form} set={set} label="Email" id="email" type="email" placeholder="votre@email.fr" required />
                  <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                    <button type="button" className="a-btn-outline"
                      onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                      style={{ flex: 0 }}>← Retour</button>
                    <button type="submit" className="a-btn-primary"
                      style={{ flex: 1 }} disabled={loading}>
                      {loading ? <><Spinner /> Envoi...</> : 'Envoyer le lien →'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        <div style={{
          marginTop: 'auto', paddingTop: 24,
          fontSize: 11, color: T.color.g4,
          display: 'flex', gap: 16, flexWrap: 'wrap',
        }}>
          <span>© 2026 TEMPO</span>
          <span>· Mentions légales</span>
          <span>· CGU</span>
          <span>· RGPD</span>
        </div>
      </div>

      {/* ─── Responsive: collapse left panel sur mobile ─── */}
      <style>{`
        @media (max-width: 820px) {
          .auth-a-root { grid-template-columns: 1fr !important; }
          .auth-a-left {
            padding: 32px 28px !important;
            min-height: auto !important;
          }
          .auth-a-left h1 { font-size: 40px !important; }
        }
      `}</style>
    </div>
  )
}
