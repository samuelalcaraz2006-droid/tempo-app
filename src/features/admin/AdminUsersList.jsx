

const ADMIN_PAGE_SIZE = 50

export default function AdminUsersList({ users, searchUser, setSearchUser, page, setPage }) {
  const filteredUsers = searchUser
    ? users.filter(u =>
        (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.worker?.first_name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.company?.name || '').toLowerCase().includes(searchUser.toLowerCase())
      )
    : users

  return (
    <div>
      <input
        className="input"
        placeholder="Rechercher par email, nom ou entreprise..."
        value={searchUser}
        onChange={e => setSearchUser(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 400 }}
      />
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
                  <span
                    className={`badge ${u.role === 'travailleur' ? 'badge-blue' : u.role === 'entreprise' ? 'badge-orange' : 'badge-gray'}`}
                    style={{ fontSize: 11 }}
                  >
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>
                  {u.worker ? `${u.worker.first_name || ''} ${u.worker.last_name || ''}`.trim() : u.company?.name || '—'}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--g4)' }}>
                  {u.worker?.city || u.company?.city || '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>
                    {u.status || 'active'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--g4)' }}>
                  {u.created_at?.split('T')[0]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, fontSize: 13, color: 'var(--g4)' }}>
        <span>Page {page + 1} — {users.length} résultats</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Préc.
          </button>
          <button
            className="btn-secondary"
            style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => setPage(p => p + 1)}
            disabled={users.length < ADMIN_PAGE_SIZE}
          >
            Suiv. →
          </button>
        </div>
      </div>
    </div>
  )
}
