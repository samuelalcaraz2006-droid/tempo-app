import React, { useState } from 'react'
import { signAttestation } from '../../lib/legal'

export default function WorkerAttestation({ worker, userId, showToast, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  if (worker?.attestation_honneur_signed_at) {
    return (
      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Attestation sur l'honneur</div>
        <div style={{ background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#065F46' }}>
          ✓ Signee le {new Date(worker.attestation_honneur_signed_at).toLocaleDateString('fr-FR')}
        </div>
      </div>
    )
  }

  const handleSign = async () => {
    setLoading(true)
    const { error } = await signAttestation(userId)
    setLoading(false)
    if (error) {
      showToast('Erreur lors de la signature', 'error')
    } else {
      showToast('Attestation signee avec succes')
      onUpdate?.()
    }
  }

  return (
    <div className="card" style={{ padding:16, marginBottom:12, borderLeft:'3px solid var(--or)' }}>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>Attestation sur l'honneur</div>
      <div style={{ fontSize:12, color:'var(--g4)', marginBottom:12, lineHeight:1.6 }}>
        Conformement a la reglementation, vous devez attester de votre statut d'independant avant de pouvoir postuler a des missions.
      </div>
      <div style={{ background:'var(--g1)', borderRadius:8, padding:14, marginBottom:12, fontSize:12, lineHeight:1.7, color:'var(--g6)' }}>
        <strong>Je soussigne(e), atteste sur l'honneur :</strong>
        <ul style={{ paddingLeft:20, marginTop:8, marginBottom:0 }}>
          <li>Exercer une activite professionnelle independante (auto-entrepreneur, micro-entreprise ou societe)</li>
          <li>Etre a jour de mes cotisations sociales (URSSAF)</li>
          <li>Disposer d'un numero SIRET actif</li>
          <li>Ne pas etre lie par un contrat de travail salarie avec les entreprises pour lesquelles j'interviens via TEMPO</li>
          <li>Etre informe(e) qu'il m'appartient de souscrire une assurance RC Professionnelle</li>
        </ul>
      </div>
      <label style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:12, cursor:'pointer' }}>
        <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop:3, accentColor:'var(--or)' }} />
        <span style={{ fontSize:12, color:'var(--g6)' }}>
          J'atteste sur l'honneur que les informations ci-dessus sont exactes. Je comprends que toute fausse declaration peut entrainer la suspension de mon compte.
        </span>
      </label>
      <button className="btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={handleSign} disabled={!confirmed || loading}>
        {loading ? 'Signature...' : 'Signer l\'attestation'}
      </button>
    </div>
  )
}
