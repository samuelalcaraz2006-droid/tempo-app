import { useState, useEffect } from 'react'
import { createConnectAccount, getStripeAccountStatus } from '../../lib/stripe'

export default function WorkerStripeOnboarding({ worker, showToast }) {
  const [status, setStatus] = useState(null) // null | 'loading' | 'not_created' | 'pending' | 'active'
  const [onboardingUrl, setOnboardingUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [worker?.stripe_account_id])

  const checkStatus = async () => {
    setStatus('loading')
    try {
      const res = await getStripeAccountStatus()
      setStatus(res.status)
    } catch {
      setStatus(worker?.stripe_account_id ? 'pending' : 'not_created')
    }
  }

  const handleSetup = async () => {
    setLoading(true)
    try {
      const res = await createConnectAccount()
      if (res.onboardingUrl) {
        setOnboardingUrl(res.onboardingUrl)
        window.open(res.onboardingUrl, '_blank')
        showToast('Redirection vers Stripe pour configurer vos paiements')
      }
    } catch (err) {
      showToast(`Erreur lors de la configuration Stripe : ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Configuration des paiements</div>
        <div style={{ fontSize:13, color:'var(--g4)' }}>Verification en cours...</div>
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Paiements</div>
        <div style={{ background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#065F46', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>✓</span>
          <div>
            <div style={{ fontWeight:600 }}>Compte Stripe actif</div>
            <div>Vous pouvez recevoir des paiements pour vos missions</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding:16, marginBottom:12, borderLeft:'3px solid var(--or)' }}>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Configurer vos paiements</div>
      <div style={{ fontSize:13, color:'var(--g4)', marginBottom:12, lineHeight:1.5 }}>
        Pour recevoir vos revenus, vous devez configurer votre compte de paiement via Stripe.
        C'est rapide (2 min) et securise.
      </div>

      {status === 'pending' && (
        <div style={{ background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#92400E' }}>
          Votre configuration Stripe est en cours. Completez-la pour commencer a recevoir des paiements.
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <button className="btn-primary" style={{ flex:1, justifyContent:'center', fontSize:13 }} onClick={handleSetup} disabled={loading}>
          {loading ? 'Chargement...' : status === 'pending' ? 'Completer la configuration' : 'Configurer mes paiements'}
        </button>
        {status === 'pending' && (
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={checkStatus}>
            Verifier le statut
          </button>
        )}
      </div>

      {onboardingUrl && (
        <div style={{ marginTop:10, fontSize:12, color:'var(--g4)' }}>
          Si la fenetre ne s'est pas ouverte :{' '}
          <a href={onboardingUrl} target="_blank" rel="noreferrer" style={{ color:'var(--or)' }}>cliquez ici</a>
        </div>
      )}
    </div>
  )
}
