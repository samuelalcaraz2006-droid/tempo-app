// ═══════════════════════════════════════════════════════════
// Profils publics — calcul des badges automatiques et métriques
// dérivées (phase 1). Source de vérité : données DB déjà
// existantes (workers, companies, missions, ratings, invoices).
// Pas de persistance — tout est recalculé à l'ouverture du profil.
// ═══════════════════════════════════════════════════════════

// ── Workers ───────────────────────────────────────────────

export function workerBadges(worker, recentMissions = []) {
  const badges = []

  // 1. TEMPO Vérifié : triple KYC
  if (worker?.id_verified && worker?.siret_verified && worker?.rc_pro_verified) {
    badges.push({ key: 'verified', variant: 'green', label: 'TEMPO Vérifié', sub: 'Identité, SIRET et RC Pro confirmés' })
  }

  // 2. Profil fidélisé : ≥ 3 companies distinctes rebooké ≥ 2 fois
  if (recentMissions.length > 0) {
    const completed = recentMissions.filter(m => (m?.missions?.status || m?.status) === 'completed')
    const byCompany = {}
    completed.forEach(a => {
      const cid = a?.missions?.company_id || a?.company_id
      if (cid) byCompany[cid] = (byCompany[cid] || 0) + 1
    })
    const loyal = Object.values(byCompany).filter(n => n >= 2).length
    if (loyal >= 3) {
      badges.push({ key: 'loyal', variant: 'brand', label: 'Profil fidélisé', sub: `${loyal} entreprises l'ont rebooké` })
    }
  }

  // 3. Top [secteur] : rating élevé + historique solide
  const rating = parseFloat(worker?.rating_avg || 0)
  const done = worker?.missions_completed || 0
  const sectorKey = worker?.sectors?.[0]
  if (rating >= 4.7 && done >= 10) {
    const label = sectorKey ? `Top ${sectorKey}` : 'Top profil'
    badges.push({ key: 'top', variant: 'amber', label, sub: `★ ${rating.toFixed(1).replace('.', ',')} sur ${done} missions` })
  }

  // 4. Fiable : très peu d'annulations sur historique solide
  const cancelled = worker?.missions_cancelled || 0
  const total = done + cancelled
  if (done >= 10 && (total === 0 || cancelled / total < 0.05)) {
    badges.push({
      key: 'reliable',
      variant: 'brand',
      label: 'Fiable',
      sub: cancelled === 0 ? '0 annulation' : `${Math.round((cancelled / total) * 100)} % d'annulation`,
    })
  }

  return badges
}

// Taux de retour : % entreprises distinctes ayant fait ≥ 2 missions completed
export function workerReturnRate(recentMissions = []) {
  const completed = (recentMissions || []).filter(m => (m?.missions?.status || m?.status) === 'completed')
  if (completed.length === 0) return null
  const byCompany = {}
  completed.forEach(a => {
    const cid = a?.missions?.company_id || a?.company_id
    if (cid) byCompany[cid] = (byCompany[cid] || 0) + 1
  })
  const total = Object.keys(byCompany).length
  if (total === 0) return null
  const repeat = Object.values(byCompany).filter(n => n >= 2).length
  return Math.round((repeat / total) * 100)
}

// Entreprises fidèles : liste des companies avec ≥ 2 missions completed
export function workerLoyalCompanies(recentMissions = []) {
  const byCompany = {}
  ;(recentMissions || []).forEach(a => {
    const status = a?.missions?.status || a?.status
    if (status !== 'completed') return
    const cid = a?.missions?.company_id || a?.company_id
    if (!cid) return
    byCompany[cid] = byCompany[cid] || { id: cid, name: a?.missions?.companies?.name || a?.companies?.name || '—', count: 0 }
    byCompany[cid].count += 1
  })
  return Object.values(byCompany).filter(c => c.count >= 2)
}

// ── Companies ─────────────────────────────────────────────

export function companyBadges(company, invoices = [], rebookingStats = null, missions = []) {
  const badges = []

  // 1. TEMPO Vérifié : SIRET validé
  if (company?.siret_verified) {
    badges.push({ key: 'verified', variant: 'green', label: 'TEMPO Vérifié', sub: 'SIRET et documents légaux confirmés' })
  }

  // 2. Paiement éclair : moyenne < 48h sur ≥ 5 factures payées
  const paid = (invoices || []).filter(i => i.status === 'paid' && i.paid_at && i.created_at)
  if (paid.length >= 5) {
    const avgHours = paid.reduce((s, i) => s + (new Date(i.paid_at) - new Date(i.created_at)) / 3600000, 0) / paid.length
    if (avgHours < 48) {
      badges.push({ key: 'fast-pay', variant: 'brand', label: 'Paiement éclair', sub: `Moyenne ${Math.round(avgHours)}h` })
    }
  }

  // 3. Client fidèle : ≥ 3 workers distincts ayant fait ≥ 2 missions completed
  if (rebookingStats && rebookingStats.loyalWorkers >= 3) {
    badges.push({ key: 'loyal', variant: 'amber', label: 'Client fidèle', sub: `${rebookingStats.loyalWorkers} prestataires rebookés` })
  }

  // 4. Engagement tenu : ≥ 10 missions, 0 annulation
  const cancelled = (missions || []).filter(m => m.status === 'cancelled').length
  const done = (missions || []).filter(m => m.status === 'completed').length
  const totalMissions = done + cancelled
  if (done >= 10 && cancelled === 0) {
    badges.push({ key: 'reliable', variant: 'brand', label: 'Engagement tenu', sub: '0 mission annulée' })
  } else if (totalMissions >= 10 && (cancelled / totalMissions) < 0.05) {
    badges.push({ key: 'reliable', variant: 'brand', label: 'Engagement tenu', sub: `${Math.round((cancelled / totalMissions) * 100)} % d'annulation` })
  }

  return badges
}

// Délai moyen de paiement (en heures)
export function companyAvgPaymentDelay(invoices = []) {
  const paid = (invoices || []).filter(i => i.status === 'paid' && i.paid_at && i.created_at)
  if (paid.length === 0) return null
  const avg = paid.reduce((s, i) => s + (new Date(i.paid_at) - new Date(i.created_at)) / 3600000, 0) / paid.length
  return Math.round(avg)
}

// % missions honorées (non annulées)
export function companyHonoredRate(missions = []) {
  if (!missions || missions.length === 0) return null
  const finished = missions.filter(m => m.status === 'completed')
  const cancelled = missions.filter(m => m.status === 'cancelled')
  const total = finished.length + cancelled.length
  if (total === 0) return null
  return Math.round((finished.length / total) * 100)
}

// ── Helpers communs ───────────────────────────────────────

export function formatMemberSince(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const months = ['janv.', 'févr.', 'mars', 'avril', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

// Visibility gating : retourne 'preview' | 'contextual' | 'own'
export function resolveProfileVisibility(_viewerRole, viewerId, targetId, { hasApplication = false, isAdmin = false } = {}) {
  if (viewerId && targetId && viewerId === targetId) return 'own'
  if (isAdmin) return 'contextual'
  if (hasApplication) return 'contextual'
  return 'preview'
}

// Formate le nom selon le niveau de visibilité
export function formatName(firstName, lastName, visibility) {
  const f = firstName || ''
  const l = lastName || ''
  if (visibility === 'preview') {
    return `${f} ${l ? `${l[0]}.` : ''}`.trim() || '—'
  }
  return `${f} ${l}`.trim() || '—'
}
