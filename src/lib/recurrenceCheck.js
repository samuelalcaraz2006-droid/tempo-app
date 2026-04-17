// Check de récurrence entre une entreprise et un prestataire.
//
// Objectif juridique : détecter les relations qui deviennent trop
// régulières pour rester légalement qualifiées de "prestations de
// service ponctuelles". Au-delà de certains seuils, la relation risque
// d'être requalifiée en CDI (art. L.1221-1 du Code du travail) ou pire,
// considérée comme du prêt de main-d'œuvre illicite (art. L.8241-1).
//
// Règle de décision :
//  - 0 à 2 missions sur 3 mois         : pas d'alerte
//  - 3 à 5 missions sur 3 mois         : alerte "soft"   (information)
//  - 6+ missions sur 3 mois            : alerte "hard"   (risque fort)
//  - 10+ missions cumulées tous temps  : alerte "critical" (requalif quasi certaine)
//
// Les seuils sont conservateurs — un juge français considère
// généralement qu'une relation "régulière" au-delà de ~6 missions
// sur 3 mois chez un même client est du salariat déguisé.

import { supabase } from './supabase.js'

export const RECURRENCE_WINDOW_DAYS = 90

export const RECURRENCE_THRESHOLDS = {
  soft: 3,
  hard: 6,
  critical: 10,
}

/**
 * Récupère en une requête le nombre de missions effectuées entre une
 * entreprise et une liste de prestataires sur les N derniers jours.
 *
 * @param {string} companyId
 * @param {string[]} workerIds
 * @returns {Promise<{ data: Record<string, number>, error: any }>}
 *          data[workerId] = nombre de missions matched/completed dans la fenêtre
 */
export async function getRecurrenceCounts(companyId, workerIds) {
  if (!companyId || !workerIds?.length) return { data: {}, error: null }

  const since = new Date()
  since.setDate(since.getDate() - RECURRENCE_WINDOW_DAYS)

  const { data, error } = await supabase
    .from('missions')
    .select('assigned_worker_id')
    .eq('company_id', companyId)
    .in('assigned_worker_id', workerIds)
    .in('status', ['matched', 'completed'])
    .gte('start_date', since.toISOString())

  if (error) return { data: {}, error }

  const counts = {}
  for (const row of data || []) {
    const id = row.assigned_worker_id
    if (!id) continue
    counts[id] = (counts[id] || 0) + 1
  }
  return { data: counts, error: null }
}

/**
 * @typedef {'soft'|'hard'|'critical'|null} RecurrenceLevel
 */

/** @returns {RecurrenceLevel} */
export function getRecurrenceLevel(count) {
  if (!count) return null
  if (count >= RECURRENCE_THRESHOLDS.critical) return 'critical'
  if (count >= RECURRENCE_THRESHOLDS.hard) return 'hard'
  if (count >= RECURRENCE_THRESHOLDS.soft) return 'soft'
  return null
}

/**
 * Texte à afficher à l'entreprise selon la sévérité. Formulation
 * pédagogique, pas accusatoire — on informe du risque juridique.
 */
export function getRecurrenceMessage(count, level) {
  if (!level || !count) return null
  const plural = count > 1 ? 's' : ''
  switch (level) {
    case 'soft':
      return {
        title: `${count} mission${plural} déjà réalisée${plural} ensemble ces 3 derniers mois`,
        body: 'La régularité peut évoquer une relation suivie. Restez vigilant sur la nature ponctuelle de chaque prestation.',
        tone: 'info',
      }
    case 'hard':
      return {
        title: `Relation récurrente : ${count} mission${plural} sur 3 mois`,
        body: 'Au-delà de ce rythme, un juge peut requalifier la relation en CDI. Envisagez un contrat de travail si le besoin est durable.',
        tone: 'warn',
      }
    case 'critical':
      return {
        title: `Risque de requalification quasi certain (${count} missions)`,
        body: 'Cette régularité est caractéristique d\'un salariat déguisé (risque de délit de marchandage et de prêt de main-d\'œuvre illicite). Basculez en CDI ou interrompez la relation.',
        tone: 'danger',
      }
    default:
      return null
  }
}
