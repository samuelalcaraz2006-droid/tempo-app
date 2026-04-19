import { Heart } from 'lucide-react'
import MissionCard from '../shared/MissionCard'
import EmptyState from '../../components/UI/EmptyState'

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
        <EmptyState
          icon={Heart}
          title="Aucune mission sauvegardée"
          description="Appuyez sur ♡ dans une mission pour la retrouver ici plus tard."
          action={onNavigate ? { label: 'Voir les missions', onClick: () => onNavigate('missions') } : undefined}
        />
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
