import MissionCard from '../shared/MissionCard'

// ═══════════════════════════════════════════════════════════════
// WorkerSavedMissions — écran « Missions sauvegardées ».
// Extrait de TravailleurApp.jsx (refactor split routes).
// ═══════════════════════════════════════════════════════════════
export default function WorkerSavedMissions({
  missions = [],
  savedMissions = [],
  hasApplied,
  applying = {},
  onApply,
  onToggleSave,
  onNavigate,
  onViewCompany,
  onBack,
}) {
  const savedList = missions.filter((m) => savedMissions.includes(m.id))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Missions sauvegardées</div>
          <div style={{ fontSize: 13, color: 'var(--g4)' }}>
            {savedMissions.length} mission{savedMissions.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button type="button"
          onClick={onBack}
          style={{ fontSize: 13, color: 'var(--g4)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Retour
        </button>
      </div>

      {savedList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--g4)', fontSize: 13 }}>
          Aucune mission sauvegardée
        </div>
      ) : (
        savedList.map((m) => (
          <MissionCard
            key={m.id}
            mission={m}
            applied={hasApplied(m.id)}
            saved={true}
            applying={applying[m.id]}
            onApply={() => onApply(m, hasApplied(m.id))}
            onToggleSave={onToggleSave}
            onSelect={() => onNavigate('mission-detail', m)}
            onViewCompany={onViewCompany}
          />
        ))
      )}
    </div>
  )
}
