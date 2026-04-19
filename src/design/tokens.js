// Style A design tokens — éditorial, navy + blue.
// Miroir en JS des variables CSS de src/index.css, pour les primitives
// React qui ont besoin des valeurs (gradients, calculs, SVG).
// Source unique de vérité : laisser les variables CSS piloter le rendu ;
// n'utiliser ces constantes que quand on ne peut pas passer par `var(--x)`.

export const T = {
  color: {
    brand:   '#2563EB',
    brandD:  '#1E40AF',
    brandL:  '#EFF6FF',
    brandM:  '#3B82F6',
    brandXL: '#60A5FA',
    navy:    '#0D1117',
    navy2:   '#111827',
    navy3:   '#1F2937',
    ink:     '#0F172A',
    ink2:    '#1E293B',
    wh:      '#F8FAFC',
    white:   '#FFFFFF',
    g1:      '#F1F5F9',
    g2:      '#E2E8F0',
    g3:      '#CBD5E1',
    g4:      '#94A3B8',
    g5:      '#475569',
    g6:      '#64748B',
    g8:      '#334155',
    green:   '#10B981',
    greenL:  '#ECFDF5',
    greenD:  '#065F46',
    amber:   '#F59E0B',
    amberL:  '#FFFBEB',
    red:     '#EF4444',
    redL:    '#FEF2F2',
  },
  font: {
    body:  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "'Source Serif 4', 'Georgia', serif",
    mono:  "'JetBrains Mono', ui-monospace, monospace",
  },
  // Échelle typographique — à imposer progressivement à la place
  // des fontSize: 13 / 13.5 / 14 / 15… hardcodés dans le code.
  // Scale conçue pour Inter à -0.01em letter-spacing par défaut.
  size: {
    xs:      11,   // labels mono, badges
    sm:      12.5, // meta, captions
    base:    14,   // body standard
    md:      16,   // body large / boutons
    lg:      20,   // sub-titles
    xl:      24,   // H3
    xxl:     32,   // H2
    display: 48,   // H1 dashboard
    hero:    60,   // H1 mission detail
  },
  // Scale de spacing (4-based) — à utiliser à la place des padding/margin hardcodés.
  space: {
    0:   0,
    1:   4,
    2:   8,
    3:   12,
    4:   16,
    5:   20,
    6:   24,
    7:   32,
    8:   40,
    9:   48,
    10:  64,
  },
  radius: {
    xs:   6,
    sm:   8,
    md:   12,
    lg:   18,
    xl:   24,
    pill: 999,
  },
  shadow: {
    soft:  '0 2px 0 rgba(15,23,42,.04), 0 10px 30px -10px rgba(15,23,42,.10)',
    md:    '0 8px 24px rgba(15,23,42,0.08)',
    lg:    '0 20px 40px rgba(15,23,42,0.12)',
    brand: '0 10px 24px rgba(37,99,235,.28)',
  },
  // Z-index scale pour éviter les "zIndex: 1000" magic numbers
  z: {
    base:    1,
    sticky:  30,
    dropdown: 40,
    drawer:   100,
    modal:    1000,
    toast:    2000,
  },
}
