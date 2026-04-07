import React, { useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'

const Logo = ({ onBack }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:28, cursor: onBack ? 'pointer' : 'default' }} onClick={onBack}>
    <div style={{ width:32, height:32, background:'var(--or)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="13" height="13" viewBox="0 0 13 13"><path d="M2 1.5L11 6.5L2 11.5Z" fill="white"/></svg>
    </div>
    <span style={{ fontWeight:600, letterSpacing:'2.5px', fontSize:16, color:'var(--bk)' }}>TEMPO</span>
  </div>
)

const SECTORS = ['Logistique','BTP','Industrie','Hôtellerie','Propreté']

// ⚠️ Défini EN DEHORS de Auth pour éviter le recréation à chaque frappe
const Field = ({ label, id, form, set, ...props }) => (
  <div style={{ marginBottom:12 }}>
    <label className="label" htmlFor={id}>{label}</label>
    <input id={id} className="input" {...props} onChange={e => set(id, e.target.value)} value={form[id] || ''} />
  </div>
)

export default function Auth({ onNavigate }) {
  const { login, register } = useAuth()
  const [mode, setMode]         = useState('login')     // 'login' | 'register' | 'reset'
  const [role, setRole]         = useState(null)        // 'travailleur' | 'entreprise'
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const [form, setForm] = useState({
    email:'', password:'', confirmPassword:'',
    firstName:'', lastName:'', phone:'',
    companyName:'', siret:'', sector:'',
    city:'', radiusKm: 10,
  })

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await login({ email: form.email, password: form.password })
    setLoading(false)
    if (error) {
      const isCredentialError = error.message.includes('Invalid login') || error.message.includes('invalid_credentials')
      setError(isCredentialError ? 'Email ou mot de passe incorrect.' : 'Erreur d\'authentification. Veuillez réessayer.')
      if (!isCredentialError) console.error('[Auth] login error:', error.message)
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
      console.error('[Auth] reset error:', error.message)
      setError('Impossible d\'envoyer l\'email. Vérifiez l\'adresse ou réessayez.')
    } else {
      setSuccess('Email envoyé ! Vérifiez votre boîte mail pour réinitialiser votre mot de passe.')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (form.password.length < 8) { setError('Mot de passe : 8 caractères minimum.'); return }
    setLoading(true)
    const { error } = await register({
      email: form.email,
      password: form.password,
      role,
      firstName: form.firstName,
      lastName: form.lastName,
      companyName: form.companyName,
    })
    setLoading(false)
    if (error) {
      console.error('[Auth] register error:', error.message)
      setError('Impossible de créer le compte. Vérifiez vos informations ou réessayez.')
    } else {
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--wh)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <button onClick={() => onNavigate(null)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'var(--g4)', fontSize:13, marginBottom:16, padding:0 }}>
          ← Retour à l'accueil
        </button>
        <Logo onBack={() => onNavigate(null)} />

        {/* Toggle login/register — masqué en mode reset ou choix de rôle */}
        {mode !== 'reset' && !(mode === 'register' && !role) && (
          <div style={{ display:'flex', gap:0, background:'var(--g1)', borderRadius:10, padding:3, marginBottom:24 }}>
            {[['login','Connexion'],['register','Inscription']].map(([m,l]) => (
              <button key={m} onClick={() => { setMode(m); setRole(null); setStep(1); setError(''); setSuccess('') }}
                style={{ flex:1, padding:'9px 0', border:'none', borderRadius:7, fontSize:14, fontWeight: mode===m ? 500 : 400, background: mode===m ? 'var(--wh)' : 'transparent', color: mode===m ? 'var(--bk)' : 'var(--g4)', cursor:'pointer', transition:'all .15s', boxShadow: mode===m ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* ── CONNEXION ── */}
        {mode === 'login' && (
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:20 }}>Connexion à TEMPO</div>
            {success && <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--gr-d)', marginBottom:14 }}>{success}</div>}
            {error && <div style={{ background:'var(--rd-l)', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--rd)', marginBottom:14 }}>{error}</div>}
            <form onSubmit={handleLogin}>
              <Field form={form} set={set} label="Email" id="email" type="email" placeholder="votre@email.fr" required />
              <Field form={form} set={set} label="Mot de passe" id="password" type="password" placeholder="••••••••" required />
              <button type="submit" className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', marginTop:6 }} disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter →'}
              </button>
            </form>
            <div style={{ textAlign:'center', marginTop:10, fontSize:13 }}>
              <button type="button" style={{ color:'var(--or)', cursor:'pointer', background:'none', border:'none', font:'inherit', fontSize:13 }} onClick={() => { setMode('reset'); setError(''); setSuccess('') }}>
                Mot de passe oublié ?
              </button>
            </div>
            <div style={{ textAlign:'center', marginTop:8, fontSize:13, color:'var(--g4)' }}>
              Pas encore de compte ?{' '}
              <button type="button" style={{ color:'var(--or)', cursor:'pointer', fontWeight:500, background:'none', border:'none', font:'inherit', fontSize:13 }} onClick={() => setMode('register')}>Créer un compte</button>
            </div>
          </div>
        )}

        {/* ── INSCRIPTION ÉTAPE 0 : choix du rôle ── */}
        {mode === 'register' && !role && (
          <div>
            <div style={{ textAlign:'center', fontSize:18, fontWeight:600, marginBottom:8 }}>Je suis...</div>
            <div style={{ fontSize:14, color:'var(--g4)', textAlign:'center', marginBottom:20 }}>Choisissez votre profil pour commencer</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <button onClick={() => setRole('travailleur')} style={{ border:'1.5px solid var(--g2)', borderRadius:14, padding:'24px 16px', background:'var(--wh)', cursor:'pointer', transition:'all .15s', textAlign:'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--or)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(255,85,0,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--g2)'; e.currentTarget.style.boxShadow='none' }}
                onFocus={e => { e.currentTarget.style.borderColor='var(--or)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(255,85,0,.15)' }}
                onBlur={e => { e.currentTarget.style.borderColor='var(--g2)'; e.currentTarget.style.boxShadow='none' }}
                aria-label="Je suis travailleur — auto-entrepreneur cherchant des missions">
                <div style={{ fontSize:28, marginBottom:8 }}>👷</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Travailleur</div>
                <div style={{ fontSize:12, color:'var(--g4)', lineHeight:1.5 }}>Je cherche des missions en tant qu'auto-entrepreneur</div>
              </button>
              <button onClick={() => setRole('entreprise')} style={{ border:'1.5px solid var(--g2)', borderRadius:14, padding:'24px 16px', background:'var(--wh)', cursor:'pointer', transition:'all .15s', textAlign:'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--or)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(255,85,0,.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--g2)'; e.currentTarget.style.boxShadow='none' }}
                onFocus={e => { e.currentTarget.style.borderColor='var(--or)'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(255,85,0,.15)' }}
                onBlur={e => { e.currentTarget.style.borderColor='var(--g2)'; e.currentTarget.style.boxShadow='none' }}
                aria-label="Je suis entreprise — je publie des missions et cherche des talents">
                <div style={{ fontSize:28, marginBottom:8 }}>🏢</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Entreprise</div>
                <div style={{ fontSize:12, color:'var(--g4)', lineHeight:1.5 }}>Je publie des missions et cherche des talents qualifiés</div>
              </button>
            </div>
            <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--g4)' }}>
              Déjà inscrit ?{' '}
              <button type="button" style={{ color:'var(--or)', cursor:'pointer', fontWeight:500, background:'none', border:'none', font:'inherit', fontSize:13 }} onClick={() => setMode('login')}>Se connecter</button>
            </div>
          </div>
        )}

        {/* ── INSCRIPTION TRAVAILLEUR ── */}
        {mode === 'register' && role === 'travailleur' && (
          <div className="card" style={{ padding:24 }}>
            <button onClick={() => setRole(null)} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:4 }}>‹ Retour</button>
            <div style={{ display:'flex', gap:3, marginBottom:20 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ flex:1, height:4, borderRadius:2, background: i <= step ? 'var(--or)' : 'var(--g2)', transition:'background .2s' }}></div>
              ))}
            </div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>
              {step === 1 && 'Informations personnelles'}
              {step === 2 && 'SIRET & localisation'}
              {step === 3 && 'Accès & finalisation'}
            </div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:18 }}>
              {step === 1 && 'Votre identité pour le profil TEMPO'}
              {step === 2 && 'Vérification de votre statut auto-entrepreneur'}
              {step === 3 && 'Créez vos identifiants de connexion'}
            </div>
            {error && <div style={{ background:'var(--rd-l)', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--rd)', marginBottom:14 }}>{error}</div>}
            {success && <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--gr-d)', marginBottom:14 }}>{success}</div>}
            <form onSubmit={step < 3 ? (e) => { e.preventDefault(); setStep(s => s+1) } : handleRegister}>
              {step === 1 && <>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <Field form={form} set={set} label="Prénom" id="firstName" placeholder="Marc" required />
                  <Field form={form} set={set} label="Nom" id="lastName" placeholder="Rousseau" required />
                </div>
                <Field form={form} set={set} label="Téléphone" id="phone" type="tel" placeholder="06 12 34 56 78" />
                <div style={{ marginBottom:12 }}>
                  <label className="label">Secteur principal</label>
                  <select className="input" value={form.sector} onChange={e => set('sector', e.target.value)}>
                    <option value="">Choisir...</option>
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </>}
              {step === 2 && <>
                <Field form={form} set={set} label="Numéro SIRET" id="siret" placeholder="837 204 918 00021" maxLength={14} />
                <div style={{ background:'var(--bl-l)', border:'1px solid #BFDBFE', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--bl-d)', marginBottom:12 }}>
                  Vérification automatique via API INSEE. Votre statut auto-entrepreneur sera confirmé en temps réel.
                </div>
                <Field form={form} set={set} label="Ville" id="city" placeholder="Lyon" required />
                <div style={{ marginBottom:12 }}>
                  <label className="label">Rayon de recherche missions : <strong>{form.radiusKm} km</strong></label>
                  <input type="range" min={5} max={50} step={5} value={form.radiusKm} onChange={e => set('radiusKm', e.target.value)} style={{ width:'100%' }} aria-label={`Rayon de recherche : ${form.radiusKm} km`} aria-valuenow={form.radiusKm} aria-valuemin={5} aria-valuemax={50} />
                </div>
              </>}
              {step === 3 && <>
                <Field form={form} set={set} label="Email" id="email" type="email" placeholder="marc@email.fr" required />
                <Field form={form} set={set} label="Mot de passe" id="password" type="password" placeholder="8 caractères minimum" required minLength={8} />
                <Field form={form} set={set} label="Confirmer le mot de passe" id="confirmPassword" type="password" placeholder="••••••••" required />
                <div style={{ background:'var(--or-l)', border:'1px solid var(--or-ll, #FED7AA)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--or-d)', marginBottom:12, lineHeight:1.5 }}>
                  Après inscription, vous devrez uploader votre pièce d'identité et certifications pour activer votre profil TEMPO Vérifié.
                </div>
              </>}
              <button type="submit" className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', marginTop:4 }} disabled={loading}>
                {loading ? 'Création...' : step < 3 ? 'Continuer →' : 'Créer mon compte TEMPO →'}
              </button>
            </form>
          </div>
        )}

        {/* ── INSCRIPTION ENTREPRISE ── */}
        {mode === 'register' && role === 'entreprise' && (
          <div className="card" style={{ padding:24 }}>
            <button onClick={() => setRole(null)} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:4 }}>‹ Retour</button>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Créer un compte Entreprise</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:18 }}>Accès gratuit · Commission 8% par mission réalisée</div>
            {error && <div style={{ background:'var(--rd-l)', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--rd)', marginBottom:14 }}>{error}</div>}
            {success && <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--gr-d)', marginBottom:14 }}>{success}</div>}
            <form onSubmit={handleRegister}>
              <Field form={form} set={set} label="Nom de l'entreprise" id="companyName" placeholder="Amazon Logistics" required />
              <Field form={form} set={set} label="SIRET" id="siret" placeholder="123 456 789 00012" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <Field form={form} set={set} label="Prénom contact" id="firstName" placeholder="Jean" required />
                <Field form={form} set={set} label="Nom contact" id="lastName" placeholder="Dupont" required />
              </div>
              <Field form={form} set={set} label="Email professionnel" id="email" type="email" placeholder="rh@entreprise.fr" required />
              <Field form={form} set={set} label="Mot de passe" id="password" type="password" placeholder="8 caractères minimum" required minLength={8} />
              <Field form={form} set={set} label="Confirmer" id="confirmPassword" type="password" placeholder="••••••••" required />
              <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--gr-d)', marginBottom:12, lineHeight:1.5 }}>
                TEMPO génère automatiquement les contrats de prestation et factures. Aucune gestion administrative requise.
              </div>
              <button type="submit" className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px' }} disabled={loading}>
                {loading ? 'Création...' : 'Créer mon espace entreprise →'}
              </button>
            </form>
          </div>
        )}

        {/* ── RÉINITIALISATION MOT DE PASSE ── */}
        {mode === 'reset' && (
          <div className="card" style={{ padding:24 }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ fontSize:13, color:'var(--g4)', background:'none', border:'none', cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:4 }}>‹ Retour</button>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Mot de passe oublié</div>
            <div style={{ fontSize:13, color:'var(--g4)', marginBottom:18 }}>Entrez votre email pour recevoir un lien de réinitialisation</div>
            {error   && <div style={{ background:'var(--rd-l)', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--rd)', marginBottom:14 }}>{error}</div>}
            {success && <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--gr-d)', marginBottom:14 }}>{success}</div>}
            {!success && (
              <form onSubmit={handleReset}>
                <Field form={form} set={set} label="Email" id="email" type="email" placeholder="votre@email.fr" required />
                <button type="submit" className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', marginTop:6 }} disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le lien →'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
