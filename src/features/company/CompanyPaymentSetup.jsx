import React, { useState, useEffect } from 'react'
import { getStripe, createPaymentIntent } from '../../lib/stripe'

export default function CompanyPaymentSetup({ contractId, amount, onSuccess, onError, showToast }) {
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [cardComplete, setCardComplete] = useState(false)
  const [stripe, setStripe] = useState(null)
  const [elements, setElements] = useState(null)

  useEffect(() => {
    getStripe().then(s => setStripe(s))
  }, [])

  const handleCreatePayment = async () => {
    if (!contractId) return
    setLoading(true)
    try {
      const res = await createPaymentIntent(contractId)
      setClientSecret(res.clientSecret)
      showToast?.(`Paiement de ${(res.amount / 100).toFixed(2)} EUR autorise (capture a la validation)`)
    } catch (err) {
      onError?.(err.message)
      showToast?.('Erreur : ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!stripe || !clientSecret) return
    setLoading(true)
    try {
      // For test mode, confirm with test card
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements?.getElement?.('card') || { token: 'tok_visa' }, // test fallback
        },
      })
      if (error) {
        showToast?.('Paiement refuse : ' + error.message, 'error')
      } else if (paymentIntent?.status === 'requires_capture') {
        showToast?.('Paiement autorise — sera capture a la validation du timesheet')
        onSuccess?.(paymentIntent)
      }
    } catch (err) {
      showToast?.('Erreur paiement : ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding:16, marginBottom:12 }}>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Paiement securise</div>
      <div style={{ fontSize:12, color:'var(--g4)', marginBottom:12, lineHeight:1.5 }}>
        Le montant est autorise a la signature du contrat mais n'est debite qu'apres validation du timesheet.
        Commission TEMPO : 8% TTC.
      </div>

      {!clientSecret ? (
        <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={handleCreatePayment} disabled={loading}>
          {loading ? 'Preparation...' : `Autoriser le paiement${amount ? ` (${amount} EUR)` : ''}`}
        </button>
      ) : (
        <div>
          <div style={{ background:'var(--gr-l)', border:'1px solid #D1FAE5', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:'var(--gr-d)' }}>
            ✓ Paiement autorise — le montant sera capture apres validation du timesheet
          </div>
          <div style={{ fontSize:11, color:'var(--g4)' }}>
            En mode test, utilisez la carte : 4242 4242 4242 4242
          </div>
        </div>
      )}
    </div>
  )
}
