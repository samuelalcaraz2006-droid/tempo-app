export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'

export const formatAmount = (n) => {
  const parsed = parseFloat(n)
  return (!n && n !== 0) || isNaN(parsed) ? '—' : `${parsed.toFixed(0)} €`
}

export const SECTOR_LABELS = {
  logistique: 'Logistique',
  btp: 'BTP',
  industrie: 'Industrie',
  hotellerie: 'Hôtellerie',
  proprete: 'Propreté',
}

export const STAR_LABELS = ['', 'Insuffisant', 'Passable', 'Bien', 'Très bien', 'Excellent !']
