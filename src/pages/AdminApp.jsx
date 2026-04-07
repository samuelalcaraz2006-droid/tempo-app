import React from 'react'
import { supabase, logAuditAction, approveKycField, rejectKyc } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'

// Requête count sans données (HEAD)
const countQuery = (table, filter) => {
  let q = supabase.from(table).select('id', { count: 'exact', head: true })
  if (filter) q = filter(q)
  return q
}

const ADMIN_PAGE_SIZE = 50

export default function AdminApp({ onLogoClick }) {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = React.useState('users')
  const [users, setUsers] = React.useState([])
  const [stats, setStats] = React.useState({})
  const [loading, setLoading] = React.useState(true)
  const [searchUser, setSearchUser] = React.useState('')
  const [page, setPage] = React.useState(0)
  const [kycConfirm, setKycConfirm] = React.useState(null)
  const [kycLoading, setKycLoading] = React.useState(false)
  const [kycReject, setKycReject] = React.useState(null)   // { user }
  const [kycRejectReason, setKycRejectReason] = React.useState('')
  const [kycFieldLoading, setKycFieldLoading] = React.useState(null) // 'id'|'siret'|'rcpro'

  React.useEffect(() => {
    // Guard: ne pas charger si pas admin authentifié
    if (!user || !isAdmin) return
    const load = async () => {
      setLoading(true)
      const offset = page * ADMIN_PAGE_SIZE
      const [pRes, wRes, cRes, mRes, totalUsers, totalWorkers, totalCompanies] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('workers').select('id, first_name, last_name, city, is_available, siret_verified, id_verified, rc_pro_verified, id_doc_url, siret_doc_url, rc_pro_url, kyc_submitted_at, kyc_rejection_reason, rating_avg, missions_completed').range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('companies').select('id, name, city, plan, rating_avg, missions_posted').range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('missions').select('id, status, sector').limit(500),
        countQuery('profiles'),
        countQuery('profiles', q => q.eq('role', 'travailleur')),
        countQuery('profiles', q => q.eq('role', 'entreprise')),
      ])
      setUsers((pRes.data || []).map(p => {
        const w = (wRes.data || []).find(w => w.id === p.id)
        const c = (cRes.data || []).find(c => c.id === p.id)
        return { ...p, worker: w, company: c }
      }))
      const allMissions = mRes.data || []
      setStats({
        totalUsers: totalUsers.count ?? (pRes.data || []).length,
        workers: totalWorkers.count ?? (pRes.data || []).filter(p => p.role === 'travailleur').length,
        companies: totalCompanies.count ?? (pRes.data || []).filter(p => p.role === 'entreprise').length,
        totalMissions: allMissions.length,
        openMissions: allMissions.filter(m => m.status === 'open').length,
        completedMissions: allMissions.filter(m => m.status === 'completed').length,
        kycPending: (wRes.data || []).filter(w => !w.id_verified || !w.siret_verified).length,
      })
      setLoading(false)
    }
    load()
  }, [page, user, isAdmin])

  const filteredUsers = searchUser
    ? users.filter(u =>
        (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.worker?.first_name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.company?.name || '').toLowerCase().includes(searchUser.toLowerCase())
      )
    : users

  const handleKycConfirm = async () => {
    if (!kycConfirm || !user) return
    setKycLoading(true)
    const { error } = await supabase
      .from('workers')
      .update({ id_verified: true, siret_verified: true, rc_pro_verified: true, kyc_completed_at: new Date().toISOString() })
      .eq('id', kycConfirm.id)

    if (!error) {
      await Promise.all([
        logAuditAction({
          actorId: user.id,
          action: 'kyc_approve_all',
          targetId: kycConfirm.id,
          targetType: 'worker',
          payload: {
            worker_name: `${kycConfirm.worker?.first_name || ''} ${kycConfirm.worker?.last_name || ''}`.trim(),
            worker_email: kycConfirm.email,
            verified_fields: ['id_verified', 'siret_verified', 'rc_pro_verified'],
          },
        }),
        supabase.rpc('notify_kyc_decision', { p_worker_id: kycConfirm.id, p_approved: true }),
      ])
      setUsers(prev => prev.map(p =>
        p.id === kycConfirm.id
          ? { ...p, worker: { ...p.worker, id_verified: true, siret_verified: true, rc_pro_verified: true } }
          : p
      ))
    }
    setKycLoading(false)
    setKycConfirm(null)
  }

  const handleKycApproveField = async (u, fieldKey) => {
    // fieldKey: 'id' | 'siret' | 'rcpro'
    const fieldMap = { id: 'id_verified', siret: 'siret_verified', rcpro: 'rc_pro_verified' }
    const field = fieldMap[fieldKey]
    setKycFieldLoading(`${u.id}_${fieldKey}`)
    const { error } = await approveKycField(u.id, field, user.id)
    if (!error) {
      setUsers(prev => prev.map(p =>
        p.id === u.id
          ? { ...p, worker: { ...p.worker, [field]: true } }
          : p
      ))
    }
    setKycFieldLoading(null)
  }

  const handleKycRejectConfirm = async () => {
    if (!kycReject || !kycRejectReason.trim()) return
    setKycLoading(true)
    const { error } = await rejectKyc(kycReject.id, kycRejectReason.trim(), user.id)
    if (!error) {
      setUsers(prev => prev.map(p =>
        p.id === kycReject.id
          ? { ...p, worker: { ...p.worker, id_verified: false, siret_verified: false, rc_pro_verified: false, kyc_rejection_reason: kycRejectReason.trim() } }
          : p
      ))
    }
    setKycLoading(false)
    setKycReject(null)
    setKycRejectReason('')
  }

  // Guard côté client (belt-and-suspenders — RLS fait le vrai contrôle)
  if (!user || !isAdmin) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'red', fontSize: 14 }}>Accès refusé — réservé aux administrateurs</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wh)', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div onClick={onLogoClick} style={{ width: 28, height: 28, background: '#FF5500', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onLogoClick ? 'pointer' : 'default' }}>
            <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1.5 1L9.5 5.5L1.5 10Z" fill="white"/></svg>
          </div>
          <span onClick={onLogoClick} style={{ fontWeight: 600, letterSpacing: '2px', fontSize: 14, cursor: onLogoClick ? 'pointer' : 'default' }}>TEMPO</span>
          <span style={{ fontSize: 12, color: 'var(--g4)', borderLeft: '1px solid #E8E8E5', paddingLeft: 8, marginLeft: 4 }}>Panel Admin</span>
        </div>

        {/* Admin tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--g2)', marginBottom: 20 }}>
          {[['users', 'Utilisateurs'], ['kyc', 'KYC'], ['stats', 'Statistiques']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: tab === k ? 500 : 400, color: tab === k ? 'var(--bk)' : 'var(--g4)', borderBottom: tab === k ? '2px solid #FF5500' : '2px solid transparent', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--g4)' }}>Chargement...</div>
        ) : (
          <>
            {tab === 'stats' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
                  {[
                    [stats.totalUsers, 'Utilisateurs'],
                    [stats.workers, 'Travailleurs'],
                    [stats.companies, 'Entreprises'],
                    [stats.totalMissions, 'Missions totales'],
                    [stats.openMissions, 'Missions ouvertes'],
                    [stats.completedMissions, 'Missions terminées'],
                    [stats.kycPending, 'KYC en attente'],
                    [`${stats.totalMissions > 0 ? Math.round((stats.completedMissions / stats.totalMissions) * 100) : 0}%`, 'Taux complétion'],
                  ].map(([v, l]) => (
                    <div key={l} className="metric-card"><div className="metric-label">{l}</div><div className="metric-value">{v}</div></div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'users' && (
              <div>
                <input className="input" placeholder="Rechercher par email, nom ou entreprise..." value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} />
                <div style={{ background: 'var(--wh)', border: '1px solid var(--g2)', borderRadius: 14, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#111' }}>
                        {['Email', 'Rôle', 'Nom', 'Ville', 'Statut', 'Inscrit le'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.7)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.slice(0, 50).map((u, i) => (
                        <tr key={u.id} style={{ background: i % 2 === 1 ? 'var(--g1)' : 'var(--wh)' }}>
                          <td style={{ padding: '10px 14px', fontSize: 12 }}>{u.email}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${u.role === 'travailleur' ? 'badge-blue' : u.role === 'entreprise' ? 'badge-orange' : 'badge-gray'}`} style={{ fontSize: 11 }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12 }}>
                            {u.worker ? `${u.worker.first_name || ''} ${u.worker.last_name || ''}`.trim() : u.company?.name || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--g4)' }}>{u.worker?.city || u.company?.city || '—'}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{u.status || 'active'}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--g4)' }}>{u.created_at?.split('T')[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: 'var(--g4)' }}>
                  <span>Page {page + 1} — {users.length} résultats</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Préc.</button>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setPage(p => p + 1)} disabled={users.length < ADMIN_PAGE_SIZE}>Suiv. →</button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'kyc' && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Travailleurs — Vérifications KYC</div>
                {users.filter(u => u.worker && (!u.worker.id_verified || !u.worker.siret_verified || !u.worker.rc_pro_verified)).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--g4)', fontSize: 13 }}>Toutes les vérifications sont à jour</div>
                ) : (
                  users.filter(u => u.worker && (!u.worker.id_verified || !u.worker.siret_verified || !u.worker.rc_pro_verified)).map(u => {
                    const w = u.worker
                    const docs = [
                      { key: 'id',    label: 'Pièce d\'identité', verified: w.id_verified,    url: w.id_doc_url },
                      { key: 'siret', label: 'SIRET',             verified: w.siret_verified,  url: w.siret_doc_url },
                      { key: 'rcpro', label: 'RC Pro',            verified: w.rc_pro_verified, url: w.rc_pro_url },
                    ]
                    const hasAnyDoc = docs.some(d => d.url)
                    return (
                      <div key={u.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
                        {/* En-tête travailleur */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{w.first_name} {w.last_name}</div>
                            <div style={{ fontSize: 12, color: 'var(--g4)' }}>{u.email} · {w.city || '—'}</div>
                            {w.kyc_submitted_at && (
                              <div style={{ fontSize: 11, color: 'var(--g4)', marginTop: 2 }}>
                                Soumis le {w.kyc_submitted_at.split('T')[0]}
                              </div>
                            )}
                            {w.kyc_rejection_reason && (
                              <div style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>
                                Refus précédent : {w.kyc_rejection_reason}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {hasAnyDoc && (
                              <button className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}
                                onClick={() => setKycConfirm(u)}>
                                ✓ Tout valider
                              </button>
                            )}
                            <button style={{ padding: '4px 10px', fontSize: 11, background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                              onClick={() => { setKycReject(u); setKycRejectReason('') }}>
                              ✗ Refuser
                            </button>
                          </div>
                        </div>

                        {/* Ligne par document */}
                        {docs.map(doc => (
                          <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid var(--g1)' }}>
                            <span style={{ fontSize: 12, color: 'var(--g6)', width: 120, flexShrink: 0 }}>{doc.label}</span>
                            {doc.url ? (
                              <a href={doc.url} target="_blank" rel="noreferrer"
                                style={{ fontSize: 11, color: '#2563EB', textDecoration: 'underline', flex: 1 }}>
                                Voir le document
                              </a>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--g4)', flex: 1 }}>Non déposé</span>
                            )}
                            {doc.verified ? (
                              <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Vérifié</span>
                            ) : doc.url ? (
                              <button
                                className="btn-secondary"
                                style={{ padding: '3px 8px', fontSize: 10, opacity: kycFieldLoading === `${u.id}_${doc.key}` ? 0.5 : 1 }}
                                disabled={!!kycFieldLoading}
                                onClick={() => handleKycApproveField(u, doc.key)}
                              >
                                {kycFieldLoading === `${u.id}_${doc.key}` ? '...' : '✓ Valider'}
                              </button>
                            ) : (
                              <span className="badge badge-orange" style={{ fontSize: 10 }}>En attente</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modale rejet KYC */}
      {kycReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Refuser le KYC</div>
            <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 16, lineHeight: 1.6 }}>
              Indiquez la raison du refus pour{' '}
              <strong>{kycReject.worker?.first_name} {kycReject.worker?.last_name}</strong>.
              Le travailleur en sera notifié.
            </div>
            <textarea
              value={kycRejectReason}
              onChange={e => setKycRejectReason(e.target.value)}
              placeholder="Ex : Photo d'identité illisible, SIRET expiré..."
              style={{ width: '100%', minHeight: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--g2)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setKycReject(null); setKycRejectReason('') }} disabled={kycLoading}>
                Annuler
              </button>
              <button
                style={{ flex: 2, background: '#DC2626', color: 'white', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: kycRejectReason.trim() && !kycLoading ? 'pointer' : 'not-allowed', opacity: kycRejectReason.trim() && !kycLoading ? 1 : 0.5 }}
                onClick={handleKycRejectConfirm} disabled={!kycRejectReason.trim() || kycLoading}>
                {kycLoading ? 'Envoi...' : '✗ Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation KYC */}
      {kycConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Confirmer la validation KYC</div>
            <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 20, lineHeight: 1.6 }}>
              Valider l'identité, le SIRET et la RC Pro de{' '}
              <strong>{kycConfirm.worker?.first_name} {kycConfirm.worker?.last_name}</strong>{' '}
              ({kycConfirm.email}) ?
              <br />
              <span style={{ color: '#FF5500', fontSize: 12 }}>Cette action est irréversible et sera enregistrée dans le journal d'audit.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setKycConfirm(null)} disabled={kycLoading}>
                Annuler
              </button>
              <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleKycConfirm} disabled={kycLoading}>
                {kycLoading ? 'Validation...' : '✓ Confirmer la validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
