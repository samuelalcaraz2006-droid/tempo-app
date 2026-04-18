import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function DisputeModal({ contractId, missionId, userId, onClose, showToast }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    const { error } = await supabase.from('disputes').insert({
      contract_id: contractId,
      mission_id: missionId,
      opened_by: userId,
      reason: reason.trim(),
    })
    setLoading(false)
    if (error) {
      showToast?.('Erreur lors de l\'ouverture du litige', 'error')
    } else {
      showToast?.('Litige ouvert — un administrateur va examiner votre demande')
      onClose()
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'var(--wh)', borderRadius:16, padding:28, maxWidth:420, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Ouvrir un litige</div>
        <div style={{ fontSize:13, color:'var(--g4)', marginBottom:16, lineHeight:1.6 }}>
          Decrivez le probleme rencontre. Un administrateur examinera votre demande et le paiement sera gele en attendant la resolution.
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Ex : travail non conforme, heures non effectuees, probleme de qualite..."
          style={{ width:'100%', minHeight:80, padding:'8px 12px', borderRadius:8, border:'1px solid var(--g2)', fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }}
        />
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button type="button" className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button type="button"
            style={{ flex:2, background:'var(--rd)', color:'white', border:'none', borderRadius:8, padding:'10px 0', fontWeight:600, cursor: reason.trim() && !loading ? 'pointer' : 'not-allowed', opacity: reason.trim() && !loading ? 1 : 0.5 }}
            onClick={handleSubmit}
            disabled={!reason.trim() || loading}
          >
            {loading ? 'Envoi...' : 'Confirmer le litige'}
          </button>
        </div>
      </div>
    </div>
  )
}
