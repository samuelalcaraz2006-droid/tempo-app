// ─────────────────────────────────────────────────────────────
// Liste standard d'EPI / équipement fourni par secteur.
// Utilisée comme fallback sur la fiche mission quand le champ
// `mission.equipment_provided` n'est pas renseigné côté DB.
// ─────────────────────────────────────────────────────────────

export const STANDARD_EQUIPMENT = {
  logistique: ['EPI complet', 'Gilet + casque', 'Chaussures sécurité'],
  btp: ['Casque + lunettes', 'Gants de chantier', 'Chaussures S3'],
  industrie: ['Blouse + gants', 'Lunettes de protection', 'Bouchons auditifs'],
  hotellerie: ['Tenue fournie', 'Tablier', 'Chaussures antidérapantes'],
  proprete: ['Blouse + gants', 'Chaussures fermées', 'Produits pro'],
}

export function equipmentFor(sector) {
  return STANDARD_EQUIPMENT[sector] || ['EPI complet']
}
