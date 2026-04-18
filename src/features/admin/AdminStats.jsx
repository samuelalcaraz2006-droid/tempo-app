

export default function AdminStats({ stats }) {
  const metrics = [
    [stats.totalUsers, 'Utilisateurs'],
    [stats.workers, 'Travailleurs'],
    [stats.companies, 'Entreprises'],
    [stats.totalMissions, 'Missions totales'],
    [stats.openMissions, 'Missions ouvertes'],
    [stats.completedMissions, 'Missions terminées'],
    [stats.kycPending, 'KYC en attente'],
    [
      `${stats.totalMissions > 0 ? Math.round((stats.completedMissions / stats.totalMissions) * 100) : 0}%`,
      'Taux complétion',
    ],
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {metrics.map(([v, l]) => (
          <div key={l} className="metric-card">
            <div className="metric-label">{l}</div>
            <div className="metric-value">{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
