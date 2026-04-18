// ─────────────────────────────────────────────────────────────
// Guidelines statiques pour la publication d'une mission.
//
// Objectifs :
//  - donner aux entreprises des points de repère tarifaires
//    réalistes (prix marché indépendant, pas grille salariale)
//  - fournir des exemples d'objet de prestation par secteur
//    pour réduire la friction du champ libre
//  - lister les motifs de recours légitimes
//  - détecter automatiquement les signaux de subordination
//    dans le texte (risque de prêt de main-d'œuvre illicite)
//
// Pas d'appel externe, pas d'IA, pas de données qui bougent.
// ─────────────────────────────────────────────────────────────

// Fourchettes tarifaires indépendantes observées sur le marché
// français 2026 (€/h HT pour auto-entrepreneur).
// Ces valeurs sont indicatives et affichées comme telles à
// l'entreprise — elles ne constituent pas un tarif imposé.
export const MARKET_RATES = {
  logistique: {
    label: 'Logistique',
    hourlyMin: 18,
    hourlyMax: 28,
    note: 'Cariste CACES, préparation de commandes, manutention',
  },
  btp: {
    label: 'BTP',
    hourlyMin: 22,
    hourlyMax: 45,
    note: 'Manœuvre, ouvrier qualifié, conducteur d\'engin',
  },
  industrie: {
    label: 'Industrie',
    hourlyMin: 20,
    hourlyMax: 38,
    note: 'Opérateur, régleur, contrôle qualité',
  },
  hotellerie: {
    label: 'Hôtellerie',
    hourlyMin: 18,
    hourlyMax: 32,
    note: 'Cuisine, service, réception',
  },
  proprete: {
    label: 'Propreté',
    hourlyMin: 16,
    hourlyMax: 25,
    note: 'Agent de surface, interventions express',
  },
}

// Seuil en dessous duquel on avertit l'entreprise d'un risque
// caractérisé (tarif anormalement bas = signal de salariat déguisé).
export const RATE_WARNING_RATIO = 0.7

export function getMarketRate(sector) {
  return MARKET_RATES[sector] || null
}

// Exemples prêts à coller pour l'objet de prestation.
// L'entreprise clique "Utiliser un exemple" → le texte est pré-rempli
// et elle l'ajuste. Ça réduit drastiquement la friction du champ libre
// tout en orientant vers des formulations juridiquement saines.
export const MISSION_OBJECT_TEMPLATES = {
  logistique: [
    "Déchargement de 3 camions semi-remorques et rangement de 180 palettes sur les zones B2 et C1 selon plan de stockage fourni. Le prestataire apporte son expérience de cariste CACES 3 et organise l'exécution en autonomie dans la plage horaire convenue.",
    "Préparation de 120 commandes e-commerce (picking + emballage + étiquetage) selon bordereau fourni. Livrable : commandes prêtes à expédier avant 18h. Le prestataire est libre de son organisation et apporte son expérience.",
  ],
  btp: [
    "Réalisation de la démolition d'une cloison plâtre de 12 m² et évacuation des gravats en benne. Le prestataire apporte son outillage et ses EPI, et définit sa méthode d'intervention dans le respect des règles de sécurité du site.",
    "Pose de placo sur ossature métallique pour 40 m² de cloisons en pièce sèche. Livrable : cloisons montées, jointées et prêtes à peindre. Le prestataire apporte son expertise et son outillage.",
  ],
  industrie: [
    "Réglage et mise en route de 4 presses hydrauliques selon cahier des charges joint, avec production de la première série conforme. Le prestataire apporte son expertise de régleur et organise son intervention.",
    "Contrôle qualité visuel et dimensionnel de 500 pièces usinées avec rédaction du rapport de non-conformité. Livrable : lot validé ou écarté, rapport signé.",
  ],
  hotellerie: [
    "Service en salle pour un événement privé de 60 couverts (mise en place, accueil, service à l'assiette, débarrassage). Le prestataire apporte son expérience, sa tenue noire/blanche, et s'organise avec le maître d'hôtel du site.",
    "Mission de plonge batterie et office pour un service du soir (80 couverts). Livrable : vaisselle et batterie propres et rangées en fin de service.",
  ],
  proprete: [
    "Nettoyage complet d'un local commercial de 250 m² après travaux : dépoussiérage, lessivage des sols, nettoyage vitres intérieures. Le prestataire apporte son matériel et ses produits.",
    "Intervention de remise en état après sinistre dégât des eaux sur 80 m² : aspiration, séchage, nettoyage désinfectant. Livrable : zone saine et sèche, PV de fin d'intervention signé.",
  ],
}

// Motifs de recours. On affiche par défaut "accroissement_temporaire"
// qui couvre la majorité des cas réels de ce secteur.
export const RECOURS_MOTIVES = [
  {
    value: 'accroissement_temporaire',
    label: 'Accroissement temporaire d\'activité',
    description: 'Pic d\'activité ponctuel, commande exceptionnelle.',
    isDefault: true,
  },
  {
    value: 'tache_ponctuelle',
    label: 'Tâche ponctuelle non reconductible',
    description: 'Intervention délimitée dans le temps sans caractère récurrent.',
  },
  {
    value: 'remplacement',
    label: 'Remplacement d\'un absent',
    description: 'Congé, maladie, départ avant embauche du remplaçant.',
  },
  {
    value: 'saisonnier',
    label: 'Activité saisonnière',
    description: 'Saisons touristiques, récoltes, fêtes de fin d\'année, etc.',
  },
  {
    value: 'expertise_technique',
    label: 'Expertise technique spécifique',
    description: 'Compétence pointue non présente dans l\'équipe.',
  },
]

export const DEFAULT_RECOURS_MOTIVE = 'accroissement_temporaire'

export function getRecoursLabel(value) {
  return RECOURS_MOTIVES.find((m) => m.value === value)?.label || value
}

// Suggestions de compétences / qualifications les plus demandées
// par secteur. L'entreprise clique pour ajouter, ça évite d'avoir
// à saisir le texte exact et ça normalise les intitulés.
export const SKILL_SUGGESTIONS = {
  logistique: [
    'CACES R489 cat. 1', 'CACES R489 cat. 3', 'CACES R489 cat. 5',
    'CACES R485 (gerbeur)', 'CACES R486 (nacelle)',
    'Préparation de commandes', 'Picking / packing', 'Scan code-barres',
    'Gestion WMS', 'Port de charges lourdes', 'Inventaire tournant',
  ],
  btp: [
    'Habilitation électrique B0/H0', 'Habilitation B1V / B2V',
    'AIPR opérateur', 'Travail en hauteur', 'Port EPI complet',
    'Lecture de plans', 'Pose placo', 'Carrelage', 'Peinture',
    'Maçonnerie traditionnelle', 'Démolition', 'Conduite engin (CACES R482)',
  ],
  industrie: [
    'Réglage machine-outil', 'Commande numérique (CN)', 'Lecture de plans',
    'Contrôle qualité dimensionnel', 'Contrôle visuel', 'Métrologie',
    'Soudure TIG', 'Soudure MIG/MAG', 'Maintenance niveau 1',
    'Sécurité atelier', 'Port EPI', '5S',
  ],
  hotellerie: [
    'Service en salle', 'Accueil clientèle', 'Connaissance HACCP',
    'Plonge batterie', 'Mise en place', 'Dressage assiettes',
    'Cuisson (chaud)', 'Cuisson (froid)', 'Pâtisserie de base',
    'Bar / cocktails', 'Anglais conversationnel', 'Tenue noire/blanche',
  ],
  proprete: [
    'Nettoyage tertiaire', 'Remise en état après travaux', 'Vitres',
    'Lavage mécanisé (auto-laveuse)', 'Décapage sol', 'Cristallisation',
    'Nettoyage après sinistre', 'Désinfection', 'Produits professionnels',
    'Port EPI', 'Autonomie d\'intervention',
  ],
}

export function getSkillSuggestions(sector) {
  return SKILL_SUGGESTIONS[sector] || []
}

// ─────────────────────────────────────────────────────────────
// Détecteur de red flags dans le texte.
// Non bloquant : on affiche une suggestion de reformulation
// sous le champ, l'entreprise reste libre.
//
// Règle de conception : faux positifs acceptables tant que les
// suggestions restent courtes et pédagogiques. Faux négatifs
// inacceptables sur les formulations de subordination les plus
// classiques.
// ─────────────────────────────────────────────────────────────

const RED_FLAG_RULES = [
  {
    pattern: /\bposte\s+(de|d[''])\b/gi,
    message: '« poste de » évoque un emploi. Préférez décrire la prestation.',
    suggestion: 'Mission de… / Prestation de…',
  },
  {
    pattern: /\bsous\s+(la\s+)?(responsabilité|autorité|direction)\s+de\b/gi,
    message: 'Un lien hiérarchique évoque la subordination (risque de requalification).',
    suggestion: 'En coordination avec le référent site',
  },
  {
    pattern: /\bencadré[e]?\s+par\b/gi,
    message: '« encadré par » évoque un rapport hiérarchique.',
    suggestion: 'En lien fonctionnel avec',
  },
  {
    pattern: /\bintégration\s+(à|dans)\s+(l['']?\s*équipe|notre\s+équipe)\b/gi,
    message: 'L\'intégration à l\'équipe est un signal fort de salariat déguisé.',
    suggestion: 'Collaboration ponctuelle avec l\'équipe en place',
  },
  {
    pattern: /\bformation\s+(interne|d['']accueil)\b/gi,
    message: 'La formation dispensée par l\'entreprise évoque un employeur.',
    suggestion: 'Briefing de prise de connaissance du site',
  },
  {
    pattern: /\bhoraires?\s+(fixes|imposés|stricts)\b/gi,
    message: 'Des horaires imposés retirent l\'autonomie du prestataire.',
    suggestion: 'Plage horaire de réalisation : 8h–17h (souple)',
  },
  {
    pattern: /\buniforme\s+(fourni|de\s+l['']?entreprise|imposé)\b/gi,
    message: 'Porter l\'uniforme de l\'entreprise évoque une subordination.',
    suggestion: 'Tenue professionnelle sobre apportée par le prestataire',
  },
  {
    pattern: /\b(tous\s+les|chaque)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|jour|semaine|mois)\b/gi,
    message: 'La récurrence régulière est un marqueur de salariat déguisé.',
    suggestion: 'Mission ponctuelle du [date] au [date]',
  },
  {
    pattern: /\bquotidien(ne|nement)?\b/gi,
    message: 'Une prestation quotidienne risque la requalification.',
    suggestion: 'Intervention ponctuelle',
  },
  {
    pattern: /\brespect(er)?\s+(les\s+)?(procédures?|règlement|protocoles?)\s+intern(e|es)\b/gi,
    message: 'Imposer les procédures internes traduit une subordination.',
    suggestion: 'Dans le respect des règles de sécurité du site',
  },
  {
    pattern: /\bparticip(er|ation)\s+aux?\s+réunions?\b/gi,
    message: 'Participer aux réunions internes évoque l\'intégration salariale.',
    suggestion: 'Échange de calage en début et fin d\'intervention',
  },
]

/**
 * Détecte les red flags dans un texte.
 * @param {string} text
 * @returns {Array<{index:number, length:number, match:string, message:string, suggestion:string}>}
 */
export function detectRedFlags(text) {
  if (!text) return []
  const flags = []
  for (const rule of RED_FLAG_RULES) {
    // Nouvelle RegExp à chaque appel pour réinitialiser lastIndex
    const re = new RegExp(rule.pattern.source, rule.pattern.flags)
    let m
    while ((m = re.exec(text)) !== null) {
      flags.push({
        index: m.index,
        length: m[0].length,
        match: m[0],
        message: rule.message,
        suggestion: rule.suggestion,
      })
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }
  // Dédupliquer les overlaps (garder le plus long match sur chaque zone)
  flags.sort((a, b) => a.index - b.index || b.length - a.length)
  const deduped = []
  for (const f of flags) {
    const last = deduped[deduped.length - 1]
    if (last && f.index < last.index + last.length) continue
    deduped.push(f)
  }
  return deduped
}
