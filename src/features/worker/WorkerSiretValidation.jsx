import { useState } from 'react'
import { validateSiret } from '../../lib/legal'

export default function WorkerSiretValidation({ worker, showToast }) {
  const [siret, setSiret] = useState(worker?.siret || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleValidate = async () => {
    if (!siret.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await validateSiret(siret.replace(/\s/g, ''))
      setResult(res)
      if (res.valid) {
        showToast('SIRET valide — verifie aupres de l\'INSEE')
      } else {
        showToast(res.error || 'SIRET invalide', 'error')
      }
    } catch (_err) {
      showToast('Erreur de verification', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (worker?.siret_verified) {
    return (
      <div className="card" style={{ padding:16, marginBottom:12 }}>
        <div style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>SIRET professionnel</div>
        <div style={{ background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#065F46' }}>
          <div style={{ fontWeight:600 }}>✓ SIRET verifie : {worker.siret}</div>
          {worker.siret_denomination && <div style={{ marginTop:4 }}>{worker.siret_denomination}</div>}
          {worker.siret_code_ape && <div>Code APE : {worker.siret_code_ape}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding:16, marginBottom:12, borderLeft:'3px solid var(--or)' }}>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Verification SIRET</div>
      <div style={{ fontSize:12, color:'var(--g4)', marginBottom:12 }}>
        Votre SIRET est verifie automatiquement aupres de la base INSEE/Sirene.
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <input
          className="input"
          style={{ flex:1 }}
          placeholder="12345678901234"
          value={siret}
          onChange={e => setSiret(e.target.value.replace(/[^\d\s]/g, ''))}
          maxLength={17}
        />
        <button className="btn-primary" style={{ padding:'8px 16px', fontSize:12 }} onClick={handleValidate} disabled={loading || siret.replace(/\s/g, '').length !== 14}>
          {loading ? 'Verification...' : 'Verifier'}
        </button>
      </div>
      {result && !result.valid && (
        <div style={{ background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#991B1B' }}>
          {result.error}
        </div>
      )}
      {result?.valid && (
        <div style={{ background:'#ECFDF5', border:'1px solid #6EE7B7', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#065F46' }}>
          ✓ {result.denomination} — Actif depuis {result.date_creation}
        </div>
      )}
    </div>
  )
}
