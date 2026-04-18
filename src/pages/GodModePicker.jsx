import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/useAuth'
import { captureError } from '../lib/sentry'

// ── Styles partages (dark theme God Mode) ───────────────────
const SCREEN = {
  minHeight: '100vh',
  background: 'var(--navy)',
  padding: '32px 24px 48px',
  display: 'flex',
  justifyContent: 'center',
}
const CONTAINER = { width: '100%', maxWidth: 640 }

const HEADER = { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }

const LOGO = {
  width: 52, height: 52, borderRadius: 13,
  background: 'linear-gradient(135deg, var(--brand), var(--brand-d))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 8px 24px rgba(37,99,235,.35)',
}

const BADGE_GOD = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '3px 10px', borderRadius: 99,
  background: 'rgba(37,99,235,.18)',
  border: '1px solid rgba(37,99,235,.4)',
  fontSize: 11, fontWeight: 700, letterSpacing: '.8px',
  color: 'var(--brand-xl)',
}

const TITLE_H1 = { fontSize: 32, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.025em', lineHeight: 1.05, fontFamily: "'Inter', sans-serif" }
const _TITLE_ACCENT = { fontFamily: "'Source Serif 4', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: 'var(--brand-xl)' }
const SUBTITLE = { fontSize: 14, color: 'rgba(255,255,255,.55)', margin: '8px 0 28px', lineHeight: 1.5 }
const _EYEBROW_DARK = { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,.5)', letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }

const TILE_BASE = {
  display: 'flex', alignItems: 'center', gap: 16,
  width: '100%',
  padding: '18px 20px',
  borderRadius: 16,
  border: '1px solid',
  cursor: 'pointer',
  marginBottom: 12,
  transition: 'transform .12s, opacity .12s, filter .12s',
  textAlign: 'left',
  color: '#fff',
}

const tones = {
  brand:   { bg: 'rgba(37,99,235,.12)',  border: 'rgba(37,99,235,.45)',  iconColor: 'var(--brand-xl)' },
  info:    { bg: 'rgba(59,130,246,.10)', border: 'rgba(59,130,246,.35)', iconColor: '#60A5FA' },
  success: { bg: 'rgba(34,197,94,.12)',  border: 'rgba(34,197,94,.40)',  iconColor: '#4ADE80' },
  neutral: { bg: 'rgba(255,255,255,.05)',border: 'rgba(255,255,255,.12)',iconColor: 'rgba(255,255,255,.7)' },
}

const ICON_BOX = (color) => ({
  width: 46, height: 46, borderRadius: 12,
  background: 'rgba(255,255,255,.06)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color,
  flexShrink: 0,
})

const SEARCH_INPUT = {
  width: '100%',
  padding: '12px 14px 12px 40px',
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  marginBottom: 16,
}

const BACK_BTN = {
  width: 40, height: 40, borderRadius: 10,
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(255,255,255,.12)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
  color: '#fff',
}

const CHIP = (tone = 'neutral') => {
  const t = tones[tone] || tones.neutral
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 99,
    background: t.bg, border: `1px solid ${t.border}`, color: t.iconColor,
    fontSize: 11, fontWeight: 600,
  }
}

// ── Inline icons (SVG, decoratifs) ──────────────────────────
const I = {
  flash: (c = '#fff') => (<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill={c}><path d="M13 2L4.5 14h6L10 22l8.5-12h-6L13 2z" /></svg>),
  shield: (c) => (<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>),
  person: (c) => (<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>),
  biz: (c) => (<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M9 21V10h6v11M3 10h18"/></svg>),
  chevronR: (c) => (<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>),
  chevronL: (c) => (<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>),
  logout: (c) => (<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>),
  search: (c) => (<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>),
}

// ── Avatar (initiales) ──────────────────────────────────────
const Avatar = ({ name, email, size = 44 }) => {
  const base = (name || email || '?').trim()
  const initials = base.split(/[ @]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: 'linear-gradient(135deg, rgba(37,99,235,.35), rgba(37,99,235,.15))',
      border: '1px solid rgba(37,99,235,.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── RoleTile (identique a la version mobile) ────────────────
const RoleTile = ({ icon, title, description, tone = 'brand', onClick }) => {
  const t = tones[tone] || tones.brand
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...TILE_BASE, background: t.bg, borderColor: t.border }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)' }}
      onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)' }}
    >
      <div style={ICON_BOX(t.iconColor)}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{description}</div>
      </div>
      {I.chevronR(t.iconColor)}
    </button>
  )
}

// ── Header commun (logo + badge + titre) ────────────────────
const Header = ({ title, subtitle, onBack }) => (
  <div style={{ marginBottom: 24 }}>
    {onBack ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={BACK_BTN}>{I.chevronL('#fff')}</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...TITLE_H1, fontSize: 22 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
    ) : (
      <>
        <div style={HEADER}>
          <div style={LOGO}>{I.flash('#fff')}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '2px' }}>TEMPO</div>
            <div style={{ marginTop: 4 }}><span style={BADGE_GOD}>⚡ GOD MODE</span></div>
          </div>
        </div>
        <h1 style={TITLE_H1}>{title}</h1>
        {subtitle && <div style={SUBTITLE}>{subtitle}</div>}
      </>
    )}
  </div>
)

// ── Ecran 1 : Choix du role ─────────────────────────────────
const RolesView = ({ realProfile, onAdmin, onPickWorker, onPickCompany, onLogout }) => (
  <>
    <Header
      title="Choisis ton point de vue"
      subtitle={<>Connecté en tant que <span style={{ color: 'var(--brand-xl)', fontWeight: 600 }}>{realProfile?.email}</span></>}
    />

    <RoleTile
      icon={I.shield(tones.brand.iconColor)}
      title="Admin"
      description="Dashboard, modération, vue plateforme"
      tone="brand"
      onClick={onAdmin}
    />
    <RoleTile
      icon={I.person(tones.info.iconColor)}
      title="Travailleur"
      description="Entrer dans le compte d'un travailleur"
      tone="info"
      onClick={onPickWorker}
    />
    <RoleTile
      icon={I.biz(tones.success.iconColor)}
      title="Entreprise"
      description="Entrer dans le compte d'une entreprise"
      tone="success"
      onClick={onPickCompany}
    />

    <button
      type="button"
      onClick={onLogout}
      style={{
        marginTop: 24, width: '100%', padding: '12px 16px',
        background: 'transparent', border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 10, color: 'rgba(255,255,255,.7)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: 'pointer', fontSize: 13,
      }}
    >
      {I.logout('rgba(255,255,255,.7)')}
      Déconnexion
    </button>
  </>
)

// ── Ligne liste (worker ou company) ─────────────────────────
const AccountRow = ({ title, subtitle, chips, onClick, busy }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    style={{
      display: 'flex', alignItems: 'center', gap: 14,
      width: '100%',
      padding: 16,
      background: 'rgba(255,255,255,.04)',
      border: '1px solid rgba(255,255,255,.10)',
      borderRadius: 14,
      cursor: busy ? 'default' : 'pointer',
      marginBottom: 10,
      color: '#fff',
      textAlign: 'left',
      opacity: busy ? 0.55 : 1,
    }}
  >
    <Avatar name={title} email={subtitle} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {title || '—'}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {subtitle || '—'}
      </div>
      {chips && chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {chips.map((c, i) => (
            <span key={i} style={CHIP(c.tone)}>{c.label}</span>
          ))}
        </div>
      )}
    </div>
    {I.chevronR('rgba(255,255,255,.4)')}
  </button>
)

const SearchInput = ({ value, onChange, placeholder }) => (
  <div style={{ position: 'relative', marginBottom: 16 }}>
    <div style={{ position: 'absolute', left: 14, top: 13, color: 'rgba(255,255,255,.5)' }}>
      {I.search('rgba(255,255,255,.5)')}
    </div>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={SEARCH_INPUT}
    />
  </div>
)

const Skeleton = () => (
  <div style={{
    height: 78, borderRadius: 14, marginBottom: 10,
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,.08) 50%, rgba(255,255,255,.04) 100%)',
  }} />
)

// ── Ecran 2 : Liste des travailleurs ────────────────────────
const WorkersView = ({ onBack, impersonate }) => {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, first_name, last_name, city, sectors, is_available, kyc_completed_at, profiles(email)')
        .order('created_at', { ascending: false })
      if (error) captureError(error, { source: 'GodMode' })
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  const q = search.trim().toLowerCase()
  const filtered = rows.filter(w => {
    if (!q) return true
    return (
      `${w.first_name || ''} ${w.last_name || ''}`.toLowerCase().includes(q) ||
      (w.city || '').toLowerCase().includes(q) ||
      (w.profiles?.email || '').toLowerCase().includes(q)
    )
  })

  const pick = async (w) => {
    if (busyId) return
    setBusyId(w.id)
    await impersonate('travailleur', w.id)
  }

  return (
    <>
      <Header title="Choisir un travailleur" subtitle={`${rows.length} comptes disponibles`} onBack={onBack} />
      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, ville, email..." />

      {loading ? (
        <><Skeleton /><Skeleton /><Skeleton /></>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>Aucun travailleur</div>
      ) : (
        filtered.map(w => {
          const chips = []
          if (w.kyc_completed_at) chips.push({ label: 'KYC ✓', tone: 'success' })
          if (w.is_available)     chips.push({ label: 'Dispo',  tone: 'success' })
          if (w.city)             chips.push({ label: w.city, tone: 'info' })
          if (w.sectors?.[0])     chips.push({ label: w.sectors[0], tone: 'brand' })
          return (
            <AccountRow
              key={w.id}
              title={`${w.first_name || ''} ${w.last_name || ''}`.trim()}
              subtitle={w.profiles?.email}
              chips={chips}
              busy={busyId === w.id}
              onClick={() => pick(w)}
            />
          )
        })
      )}
    </>
  )
}

// ── Ecran 3 : Liste des entreprises ─────────────────────────
const CompaniesView = ({ onBack, impersonate }) => {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, city, sector, siret, subscription_plan, missions_posted, profiles(email)')
        .order('created_at', { ascending: false })
      if (error) captureError(error, { source: 'GodMode' })
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  const q = search.trim().toLowerCase()
  const filtered = rows.filter(c => {
    if (!q) return true
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.profiles?.email || '').toLowerCase().includes(q)
    )
  })

  const pick = async (c) => {
    if (busyId) return
    setBusyId(c.id)
    await impersonate('entreprise', c.id)
  }

  return (
    <>
      <Header title="Choisir une entreprise" subtitle={`${rows.length} comptes disponibles`} onBack={onBack} />
      <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par nom, ville, email..." />

      {loading ? (
        <><Skeleton /><Skeleton /><Skeleton /></>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,.5)' }}>Aucune entreprise</div>
      ) : (
        filtered.map(c => {
          const chips = []
          if (c.subscription_plan) chips.push({ label: `★ ${c.subscription_plan}`, tone: 'info' })
          if (c.city)              chips.push({ label: c.city, tone: 'info' })
          if (c.sector)            chips.push({ label: c.sector, tone: 'brand' })
          chips.push({ label: `${c.missions_posted || 0} missions`, tone: 'neutral' })
          return (
            <AccountRow
              key={c.id}
              title={c.name}
              subtitle={c.profiles?.email}
              chips={chips}
              busy={busyId === c.id}
              onClick={() => pick(c)}
            />
          )
        })
      )}
    </>
  )
}

// ── Page principale ─────────────────────────────────────────
export default function GodModePicker() {
  const { realProfile, viewAsAdmin, impersonate, logout } = useAuth()
  const [step, setStep] = useState('roles') // 'roles' | 'workers' | 'companies'

  return (
    <div style={SCREEN}>
      <div style={CONTAINER}>
        {step === 'roles' && (
          <RolesView
            realProfile={realProfile}
            onAdmin={viewAsAdmin}
            onPickWorker={() => setStep('workers')}
            onPickCompany={() => setStep('companies')}
            onLogout={logout}
          />
        )}
        {step === 'workers'   && <WorkersView   onBack={() => setStep('roles')} impersonate={impersonate} />}
        {step === 'companies' && <CompaniesView onBack={() => setStep('roles')} impersonate={impersonate} />}
      </div>
    </div>
  )
}
