// Mock centralisé pour lucide-react dans les tests vitest.
// Chaque icône est stubbée en <svg data-testid="icon-<name>"/>.
// Ajouter un nom ici dès qu'une nouvelle icône est importée en prod.
import React from 'react'

const names = [
  'ArrowRight','Award','Bell','Briefcase','Building2','Check','CheckCheck',
  'CheckCircle','ChevronDown','ChevronLeft','ChevronRight','ChevronUp','Clock',
  'DollarSign','Download','Gavel','HardHat','Heart','Info','LogOut','Map',
  'Menu','MessageCircle','Moon','Package','PenLine','Plus','Radar','Search',
  'Settings','Sparkles','Star','Sun','Timer','TrendingUp','UserCheck','Users',
  'UtensilsCrossed','X','XCircle','Zap','RefreshCw','ClipboardList',
]

const mock = {}
for (const n of names) {
  mock[n] = (props) => React.createElement('svg', {
    'data-testid': `icon-${n.toLowerCase()}`,
    ...props,
  })
}

export default mock
