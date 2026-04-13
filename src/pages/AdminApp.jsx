import React from 'react'
import { supabase, logAuditAction, approveKycField, rejectKyc } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import AdminUsersList from '../features/admin/AdminUsersList'
import AdminKycPanel from '../features/admin/AdminKycPanel'
import AdminStats from '../features/admin/AdminStats'

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
  const [kycReject, setKycReject] = React.useState(null)
  const [kycRejectReason, setKycRejectReason] = React.useState('')
  const [kycFieldLoading, setKycFieldLoading] = React.useState(null)

  React.useEffect(() => {
    if (!user || !isAdmin) return
    const load = async () => {
      setLoading(true)
      const offset = page * ADMIN_PAGE_SIZE
      const [pRes, wRes, cRes, mRes, totalUsers, totalWorkers, totalCompanies] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('workers').select('id, first_name, last_name, city, is_available, siret_verified, id_verified, rc_pro_verified, id_doc_url, siret_doc_url, rc_pro_url, kyc_submitted_at, kyc_rejection_reason, rating_avg, missions_completed').range(offset, offset + ADMIN_PAGE_SIZE - 1),
        supabase.from('companies').select('id, name, city, subscription_plan, rating_avg, missions_posted').range(offset, offset + ADMIN_PAGE_SIZE - 1),
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

  const handleKycConfirm = async () => {
    if (!kycConfirm || !user) return
    setKycLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('workers')
        .update({ id_verified: true, siret_verified: true, rc_pro_verified: true, kyc_completed_at: new Date().toISOString() })
        .eq('id', kycConfirm.id)

      if (updateError) {
        console.error('[KYC] update error:', updateError.message)
        return
      }

      const [auditRes, notifRes] = await Promise.allSettled([
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

      if (auditRes.status === 'rejected') console.error('[KYC] audit log failed:', auditRes.reason)
      if (notifRes.status === 'rejected') console.error('[KYC] notification failed:', notifRes.reason)

      setUsers(prev => prev.map(p =>
        p.id === kycConfirm.id
          ? { ...p, worker: { ...p.worker, id_verified: true, siret_verified: true, rc_pro_verified: true } }
          : p
      ))
    } catch (err) {
      console.error('[KYC] handleKycConfirm error:', err)
    } finally {
      setKycLoading(false)
      setKycConfirm(null)
    }
  }

  const handleKycApproveField = async (u, fieldKey) => {
    const fieldMap = { id: 'id_verified', siret: 'siret_verified', rcpro: 'rc_pro_verified' }
    const field = fieldMap[fieldKey]
    setKycFieldLoading(`${u.id}_${fieldKey}`)
    const { error } = await approveKycField(u.id, field, user.id)
    if (!error) {
      setUsers(prev => prev.map(p =>
        p.id === u.id ? { ...p, worker: { ...p.worker, [field]: true } } : p
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

  if (!user || !isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'red', fontSize: 14 }}>
        Accès refusé — réservé aux administrateurs
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--wh)', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            onClick={onLogoClick}
            style={{ width: 28, height: 28, background: 'var(--brand)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onLogoClick ? 'pointer' : 'default' }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11"><path d="M1.5 1L9.5 5.5L1.5 10Z" fill="white"/></svg>
          </div>
          <span onClick={onLogoClick} style={{ fontWeight: 600, letterSpacing: '2px', fontSize: 14, cursor: onLogoClick ? 'pointer' : 'default' }}>TEMPO</span>
          <span style={{ fontSize: 12, color: 'var(--g4)', borderLeft: '1px solid var(--g2)', paddingLeft: 8, marginLeft: 4 }}>Panel Admin</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--g2)', marginBottom: 20 }}>
          {[['users', 'Utilisateurs'], ['kyc', 'KYC'], ['stats', 'Statistiques']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{ padding: '10px 16px', border: 'none', background: 'transparent', fontSize: 13, fontWeight: tab === k ? 500 : 400, color: tab === k ? 'var(--bk)' : 'var(--g4)', borderBottom: tab === k ? '2px solid var(--brand)' : '2px solid transparent', cursor: 'pointer' }}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--g4)' }}>Chargement...</div>
        ) : (
          <>
            {tab === 'stats' && <AdminStats stats={stats} />}

            {tab === 'users' && (
              <AdminUsersList
                users={users}
                searchUser={searchUser}
                setSearchUser={setSearchUser}
                page={page}
                setPage={setPage}
              />
            )}

            {tab === 'kyc' && (
              <AdminKycPanel
                users={users}
                onApproveAll={u => setKycConfirm(u)}
                onApproveField={handleKycApproveField}
                onReject={u => { setKycReject(u); setKycRejectReason('') }}
                kycFieldLoading={kycFieldLoading}
              />
            )}
          </>
        )}
      </div>

      {/* Modal — Reject KYC */}
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
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setKycReject(null); setKycRejectReason('') }}
                disabled={kycLoading}
              >
                Annuler
              </button>
              <button
                style={{ flex: 2, background: 'var(--rd)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 0', fontWeight: 600, cursor: kycRejectReason.trim() && !kycLoading ? 'pointer' : 'not-allowed', opacity: kycRejectReason.trim() && !kycLoading ? 1 : 0.5 }}
                onClick={handleKycRejectConfirm}
                disabled={!kycRejectReason.trim() || kycLoading}
              >
                {kycLoading ? 'Envoi...' : '✗ Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Confirm KYC */}
      {kycConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--wh)', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Confirmer la validation KYC</div>
            <div style={{ fontSize: 13, color: 'var(--g4)', marginBottom: 20, lineHeight: 1.6 }}>
              Valider l'identité, le SIRET et la RC Pro de{' '}
              <strong>{kycConfirm.worker?.first_name} {kycConfirm.worker?.last_name}</strong>{' '}
              ({kycConfirm.email}) ?
              <br />
              <span style={{ color: 'var(--brand)', fontSize: 12 }}>Cette action est irréversible et sera enregistrée dans le journal d'audit.</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setKycConfirm(null)}
                disabled={kycLoading}
              >
                Annuler
              </button>
              <button
                className="btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
                onClick={handleKycConfirm}
                disabled={kycLoading}
              >
                {kycLoading ? 'Validation...' : '✓ Confirmer la validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
