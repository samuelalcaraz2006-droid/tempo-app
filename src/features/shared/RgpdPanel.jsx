import React, { useState } from 'react'
import { requestDataExport, requestAccountDeletion } from '../../lib/legal'

export default function RgpdPanel({ userId, showToast }) {
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  const handleExport = async () => {
    setExportLoading(true)
    const { error } = await requestDataExport(userId)
    setExportLoading(false)
    if (error) {
      showToast('Erreur lors de la demande d\'export', 'error')
    } else {
      showToast('Demande d\'export recue — vous recevrez un lien de telechargement par email sous 48h')
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    const { error } = await requestAccountDeletion(userId, deleteReason)
    setDeleteLoading(false)
    if (error) {
      showToast('Erreur lors de la demande de suppression', 'error')
    } else {
      showToast('Demande de suppression enregistree — votre compte sera anonymise sous 30 jours')
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="card" style={{ padding:16, marginBottom:12 }}>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Mes donnees personnelles (RGPD)</div>
      <div style={{ fontSize:12, color:'var(--g4)', marginBottom:12, lineHeight:1.5 }}>
        Conformement au RGPD, vous pouvez telecharger ou supprimer vos donnees a tout moment.
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <button className="btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:12 }} onClick={handleExport} disabled={exportLoading}>
          {exportLoading ? 'Demande...' : '📥 Telecharger mes donnees'}
        </button>
      </div>

      {!showDeleteConfirm ? (
        <button onClick={() => setShowDeleteConfirm(true)} style={{ width:'100%', padding:'8px', border:'1px solid var(--rd)', borderRadius:8, background:'transparent', color:'var(--rd)', fontSize:12, cursor:'pointer' }}>
          Supprimer mon compte
        </button>
      ) : (
        <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#991B1B', marginBottom:8 }}>Confirmer la suppression</div>
          <div style={{ fontSize:12, color:'#991B1B', marginBottom:8, lineHeight:1.5 }}>
            Cette action est irreversible. Vos donnees personnelles seront anonymisees sous 30 jours. Les factures seront conservees 10 ans (obligation legale).
          </div>
          <textarea
            className="input"
            rows={2}
            placeholder="Raison (optionnel)..."
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            style={{ marginBottom:8, fontSize:12 }}
          />
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn-secondary" style={{ flex:1, fontSize:12 }} onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
            <button onClick={handleDelete} disabled={deleteLoading} style={{ flex:1, padding:'8px', border:'none', borderRadius:8, background:'#DC2626', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {deleteLoading ? 'Suppression...' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop:12, fontSize:11, color:'var(--g4)' }}>
        <a href="/legal" style={{ color:'var(--or)' }}>Politique de confidentialite</a> · Contact DPO : dpo@tempo-app.fr
      </div>
    </div>
  )
}
