// ============================================================
// TEMPO — Algorithme de matching IA
// Calcule un score 0-100 pour chaque couple (mission, travailleur)
// ============================================================

const WEIGHTS = {
  skills:     0.30,  // Compétences métier
  rating:     0.25,  // Note & réputation
  distance:   0.20,  // Proximité géographique
  history:    0.15,  // Historique avec l'entreprise
  avail:      0.07,  // Disponibilité
  reactivity: 0.03,  // Réactivité passée
}

// ── Distance en km entre deux coords (Haversine) ─────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Score compétences (0–100) ─────────────────────────────────
const scoreSkills = (mission, worker) => {
  const required = [
    ...(mission.required_skills || []).map(s => s.toLowerCase()),
    ...(mission.required_certs || []).map(s => s.toLowerCase()),
  ]
  if (required.length === 0) return 70 // pas d'exigence = score neutre

  const workerSkills = [
    ...(worker.skills || []).map(s => s.toLowerCase()),
    ...((worker.certifications || []).map(c => (c.name || c).toLowerCase())),
  ]

  let matched = 0
  let certBonus = 0

  for (const req of required) {
    const found = workerSkills.some(ws => ws.includes(req) || req.includes(ws))
    if (found) {
      matched++
      // Bonus si c'est une certification exacte
      if ((worker.certifications || []).some(c => (c.name || c).toLowerCase().includes(req))) {
        certBonus += 0.15
      }
    }
  }

  const base = (matched / required.length) * 100
  return Math.min(100, Math.round(base + certBonus * 100))
}

// ── Score réputation (0–100) ──────────────────────────────────
const scoreRating = (worker) => {
  if (!worker.rating_count || worker.rating_count === 0) return 50 // nouveau = score neutre
  const r = parseFloat(worker.rating_avg) || 0
  // 5 étoiles = 100, 4 = 80, 3 = 60, etc.
  // Pondération par le volume : plus de missions = plus fiable
  const volumeBonus = Math.min(20, Math.floor(worker.rating_count / 10) * 2)
  const base = ((r - 1) / 4) * 80
  // Pénalité si missions annulées
  const cancelRate = worker.missions_cancelled / Math.max(1, worker.missions_completed + worker.missions_cancelled)
  const cancelPenalty = cancelRate * 20
  return Math.max(0, Math.min(100, Math.round(base + volumeBonus - cancelPenalty)))
}

// ── Score distance (0–100) ────────────────────────────────────
const scoreDistance = (mission, worker) => {
  if (!worker.lat || !worker.lng || !mission.lat || !mission.lng) return 50
  const km = haversineKm(worker.lat, worker.lng, mission.lat, mission.lng)
  const radius = worker.radius_km || 10
  if (km <= 2) return 100
  if (km >= radius) return 0
  // Décroissance linéaire
  return Math.round((1 - (km - 2) / (radius - 2)) * 100)
}

// ── Score historique client (0–100) ───────────────────────────
const scoreHistory = (mission, worker, pastMissions = []) => {
  // Vérifier si le worker a déjà travaillé pour cette entreprise
  const sameCompany = pastMissions.filter(m =>
    m.company_id === mission.company_id && m.status === 'completed'
  )
  if (sameCompany.length === 0) return 30 // pas d'historique = score bas
  if (sameCompany.length >= 3) return 100
  if (sameCompany.length >= 1) return 70
  return 50
}

// ── Score disponibilité (0–100) ───────────────────────────────
const scoreAvailability = (worker, missionDate) => {
  if (!worker.is_available) return 0
  // Si on a la date de mission, vérifier les plages
  return worker.is_available ? 100 : 0
}

// ── Score réactivité (0–100) ──────────────────────────────────
const scoreReactivity = (worker) => {
  // Basé sur le taux de réponse historique (à enrichir avec vraies données)
  if (!worker.missions_completed) return 50
  const completionRate = worker.missions_completed /
    Math.max(1, (worker.missions_completed || 0) + (worker.missions_cancelled || 0))
  return Math.round(completionRate * 100)
}

// ── SCORE TOTAL (0–100) ───────────────────────────────────────
export const computeMatchScore = (mission, worker, pastMissions = []) => {
  const s = {
    skills:     scoreSkills(mission, worker),
    rating:     scoreRating(worker),
    distance:   scoreDistance(mission, worker),
    history:    scoreHistory(mission, worker, pastMissions),
    avail:      scoreAvailability(worker, mission.start_date),
    reactivity: scoreReactivity(worker),
  }

  const total = Math.round(
    s.skills     * WEIGHTS.skills +
    s.rating     * WEIGHTS.rating +
    s.distance   * WEIGHTS.distance +
    s.history    * WEIGHTS.history +
    s.avail      * WEIGHTS.avail +
    s.reactivity * WEIGHTS.reactivity
  )

  return {
    total_score:      total,
    score_skills:     s.skills,
    score_rating:     s.rating,
    score_distance:   s.distance,
    score_history:    s.history,
    score_avail:      s.avail,
    score_reactivity: s.reactivity,
    breakdown: s,
    weights: WEIGHTS,
  }
}

// ── Classer une liste de workers pour une mission ─────────────
export const rankWorkers = (mission, workers, pastMissionsMap = {}) => {
  return workers
    .map(worker => ({
      worker,
      ...computeMatchScore(mission, worker, pastMissionsMap[worker.id] || [])
    }))
    .filter(r => r.total_score > 0)
    .sort((a, b) => b.total_score - a.total_score)
}

// ── Explication lisible du score ──────────────────────────────
export const explainScore = (scoreResult) => {
  const { breakdown, weights } = scoreResult
  const lines = []

  if (breakdown.skills >= 80) lines.push('Compétences parfaitement adaptées')
  else if (breakdown.skills >= 50) lines.push('Compétences partiellement compatibles')
  else lines.push('Compétences à compléter')

  if (breakdown.rating >= 80) lines.push('Excellente réputation sur la plateforme')
  else if (breakdown.rating >= 50) lines.push('Bonne réputation')
  else if (breakdown.rating === 50) lines.push('Nouveau travailleur')

  if (breakdown.distance >= 80) lines.push('Très proche du lieu de mission')
  else if (breakdown.distance >= 50) lines.push('Distance raisonnable')
  else lines.push('Un peu éloigné')

  if (breakdown.history >= 70) lines.push('A déjà travaillé pour cette entreprise')

  return lines
}

// ── Recalibration des poids (apprentissage) ───────────────────
// À appeler périodiquement avec les données de feedback
export const recalibrateWeights = (completedMissions) => {
  // Algorithme de recalibration basique :
  // Si les missions avec score_skills élevé ont plus de succès → augmenter le poids skills
  const successByFactor = {
    skills: [], rating: [], distance: [], history: [], avail: [], reactivity: []
  }

  for (const m of completedMissions) {
    const success = m.status === 'completed' && !m.disputed
    for (const factor of Object.keys(successByFactor)) {
      if (m.breakdown?.[factor] !== undefined) {
        successByFactor[factor].push({ score: m.breakdown[factor], success })
      }
    }
  }

  // Calcul de la corrélation succès/score pour chaque facteur
  const correlations = {}
  for (const [factor, data] of Object.entries(successByFactor)) {
    if (data.length < 10) continue
    const avg = data.reduce((s, d) => s + d.score, 0) / data.length
    const successRate = data.filter(d => d.success).length / data.length
    const highScore = data.filter(d => d.score > avg)
    const highSuccessRate = highScore.filter(d => d.success).length / Math.max(1, highScore.length)
    correlations[factor] = highSuccessRate - successRate
  }

  return { correlations, note: 'Recalibration manuelle requise pour appliquer les nouveaux poids' }
}
