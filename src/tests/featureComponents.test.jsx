// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Global mocks ────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Search: () => <svg data-testid="search-icon" />,
  Heart: ({ size, style }) => <svg data-testid="heart-icon" style={style} />,
  PenLine: () => <svg data-testid="penline-icon" />,
  MessageCircle: () => <svg data-testid="messagecircle-icon" />,
  Star: () => <svg data-testid="star-icon" />,
  X: () => <svg data-testid="x-icon" />,
  Bell: () => <svg data-testid="bell-icon" />,
  Moon: () => <svg data-testid="moon-icon" />,
  Sun: () => <svg data-testid="sun-icon" />,
  Download: () => <svg data-testid="download-icon" />,
  RefreshCw: () => <svg data-testid="refreshcw-icon" />,
  LogOut: () => <svg data-testid="logout-icon" />,
}))

vi.mock('../lib/formatters', () => ({
  formatDate: (d) => d ? '1 janv.' : '—',
  formatAmount: (n) => n != null && !isNaN(parseFloat(n)) ? `${parseFloat(n).toFixed(0)} €` : '—',
  SECTOR_LABELS: {
    logistique: 'Logistique',
    btp: 'BTP',
    industrie: 'Industrie',
    hotellerie: 'Hotellerie',
    proprete: 'Proprete',
  },
}))

vi.mock('../lib/supabase', () => ({
  supabase: {},
  markNotifsRead: vi.fn().mockResolvedValue({ error: null }),
  getConversations: vi.fn().mockResolvedValue({ data: [], error: null }),
  subscribeToMessages: vi.fn(() => ({ unsubscribe: vi.fn() })),
}))

vi.mock('../hooks/shared/useConversations', () => ({
  useConversations: () => ({ conversations: [], loading: false, refreshing: false, refresh: vi.fn(), error: null }),
}))

vi.mock('../lib/legal', () => ({
  validateSiret: vi.fn().mockResolvedValue({ valid: true, denomination: 'ACME SAS', date_creation: '01/01/2020' }),
  signAttestation: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('../contexts/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}))

vi.mock('../contexts/I18nContext', () => ({
  useI18n: () => ({ locale: 'fr', switchLocale: vi.fn() }),
}))

vi.mock('../hooks/useDarkMode', () => ({
  useDarkMode: () => ({ darkMode: false, toggleDarkMode: vi.fn() }),
}))

// Mock MissionCard for WorkerDashboard tests to avoid deep deps
vi.mock('../features/shared/MissionCard', () => ({
  default: ({ mission, applied, onApply, onSelect }) => (
    <div data-testid="mission-card">
      <span>{mission.title}</span>
      <button onClick={() => onApply?.(mission, applied)}>Postuler</button>
      <button onClick={() => onSelect?.(mission)}>Voir</button>
    </div>
  ),
}))

// ── Imports (after mocks) ───────────────────────────────────────

import WorkerDashboard from '../features/worker/WorkerDashboard'
import WorkerApplications from '../features/worker/WorkerApplications'
import WorkerEarnings from '../features/worker/WorkerEarnings'
import WorkerMissionDetail from '../features/worker/WorkerMissionDetail'
import WorkerNotifications from '../features/worker/WorkerNotifications'
import WorkerCalendar from '../features/worker/WorkerCalendar'
import WorkerAlerts from '../features/worker/WorkerAlerts'
import WorkerMessages from '../features/worker/WorkerMessages'
import WorkerCompanyProfile from '../features/worker/WorkerCompanyProfile'
import WorkerSiretValidation from '../features/worker/WorkerSiretValidation'
import WorkerAttestation from '../features/worker/WorkerAttestation'
import CompanyDashboard from '../features/company/CompanyDashboard'
import CompanyCandidates from '../features/company/CompanyCandidates'
import CompanyStats from '../features/company/CompanyStats'
import DashboardLayout from '../layouts/DashboardLayout'

// ── Shared fixtures ─────────────────────────────────────────────

const mockT = (key) => key

const baseMission = {
  id: 'm1',
  title: 'Cariste H/F',
  city: 'Lyon',
  hourly_rate: 12,
  total_hours: 40,
  start_date: '2026-05-01',
  status: 'open',
  required_skills: ['CACES 1'],
  required_certs: [],
  companies: { name: 'ACME Corp', id: 'co1' },
  company_id: 'co1',
  description: 'Mission de cariste en entrepot logistique',
  urgency: 'normal',
  created_at: '2026-04-01T10:00:00Z',
}

// ── WorkerDashboard ──────────────────────────────────────────────

describe('WorkerDashboard', () => {
  const defaultProps = {
    worker: { city: 'Paris', radius_km: 20, missions_completed: 5, rating_avg: '4.5' },
    displayName: 'Jean Dupont',
    missions: [baseMission],
    urgentMissions: [],
    applications: [],
    onNavigate: vi.fn(),
    onApply: vi.fn(),
    applying: {},
    savedMissions: [],
    onToggleSave: vi.fn(),
    t: mockT,
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders displayName in the header', () => {
    render(<WorkerDashboard {...defaultProps} />)
    expect(screen.getByText('Jean Dupont')).toBeTruthy()
  })

  it('renders stats grid with missions_completed and rating', () => {
    render(<WorkerDashboard {...defaultProps} />)
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('4.5')).toBeTruthy()
  })

  it('renders urgent missions banner when urgentMissions is not empty', () => {
    const props = { ...defaultProps, urgentMissions: [baseMission, { ...baseMission, id: 'm2' }] }
    render(<WorkerDashboard {...props} />)
    expect(screen.getByText(/2 mission/)).toBeTruthy()
  })

  it('does not render urgent banner when urgentMissions is empty', () => {
    render(<WorkerDashboard {...defaultProps} />)
    expect(screen.queryByText(/urgente/)).toBeNull()
  })

  it('renders mission cards when missions exist', () => {
    render(<WorkerDashboard {...defaultProps} />)
    expect(screen.getAllByTestId('mission-card').length).toBeGreaterThan(0)
  })

  it('renders empty state when missions is empty', () => {
    render(<WorkerDashboard {...defaultProps} missions={[]} />)
    expect(screen.getByText('Aucune mission disponible')).toBeTruthy()
  })

  it('renders Tout voir button when missions exist', () => {
    render(<WorkerDashboard {...defaultProps} />)
    expect(screen.getByText(/Tout voir/)).toBeTruthy()
  })

  it('calls onNavigate when Tout voir is clicked', () => {
    const onNavigate = vi.fn()
    render(<WorkerDashboard {...defaultProps} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText(/Tout voir/))
    expect(onNavigate).toHaveBeenCalledWith('missions')
  })

  it('calls onNavigate when urgent banner is clicked', () => {
    const onNavigate = vi.fn()
    const props = { ...defaultProps, urgentMissions: [baseMission], onNavigate }
    render(<WorkerDashboard {...props} />)
    fireEvent.click(screen.getByText(/1 mission urgente/))
    expect(onNavigate).toHaveBeenCalledWith('missions')
  })

  it('shows city and radius info', () => {
    render(<WorkerDashboard {...defaultProps} />)
    expect(screen.getByText(/Paris/)).toBeTruthy()
    expect(screen.getByText(/20 km/)).toBeTruthy()
  })
})

// ── WorkerApplications ───────────────────────────────────────────

describe('WorkerApplications', () => {
  const pendingApp = {
    id: 'app1',
    status: 'pending',
    mission_id: 'm1',
    missions: { ...baseMission, status: 'open' },
    match_score: 85,
  }
  const acceptedApp = {
    id: 'app2',
    status: 'accepted',
    mission_id: 'm2',
    missions: { ...baseMission, id: 'm2', title: 'Manutentionnaire', status: 'active' },
  }

  const defaultProps = {
    allMissions: [pendingApp, acceptedApp],
    signedContracts: [],
    ratedMissions: new Set(),
    onWithdraw: vi.fn(),
    onSignContract: vi.fn(),
    onOpenChat: vi.fn(),
    onRate: vi.fn(),
    onNavigate: vi.fn(),
    t: mockT,
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders filter tabs', () => {
    render(<WorkerApplications {...defaultProps} />)
    expect(screen.getByText('Toutes')).toBeTruthy()
    // Use getAllByText because "En attente" appears both in tab and in badge
    expect(screen.getAllByText(/En attente/).length).toBeGreaterThan(0)
    expect(screen.getByText('Acceptees')).toBeTruthy()
  })

  it('renders application cards with mission title', () => {
    render(<WorkerApplications {...defaultProps} />)
    expect(screen.getByText('Cariste H/F')).toBeTruthy()
    expect(screen.getByText('Manutentionnaire')).toBeTruthy()
  })

  it('shows withdraw button for pending applications', () => {
    render(<WorkerApplications {...defaultProps} />)
    expect(screen.getByText('Retirer ma candidature')).toBeTruthy()
  })

  it('calls onWithdraw when withdraw button is clicked', () => {
    const onWithdraw = vi.fn()
    render(<WorkerApplications {...defaultProps} onWithdraw={onWithdraw} />)
    fireEvent.click(screen.getByText('Retirer ma candidature'))
    expect(onWithdraw).toHaveBeenCalledWith('app1')
  })

  it('shows sign contract button for accepted non-completed missions', () => {
    render(<WorkerApplications {...defaultProps} />)
    expect(screen.getByText(/Signer le contrat/)).toBeTruthy()
  })

  it('shows contrat signe label when contract already signed', () => {
    render(<WorkerApplications {...defaultProps} signedContracts={['m2']} />)
    expect(screen.getByText('✓ Contrat signe')).toBeTruthy()
  })

  it('shows rate button for completed missions', () => {
    const doneApp = {
      id: 'app3',
      status: 'accepted',
      mission_id: 'm3',
      missions: { ...baseMission, id: 'm3', title: 'Mission terminee', status: 'completed' },
    }
    render(<WorkerApplications {...defaultProps} allMissions={[doneApp]} />)
    expect(screen.getByText(/Evaluer/)).toBeTruthy()
  })

  it('shows evaluated label when mission already rated', () => {
    const doneApp = {
      id: 'app3',
      status: 'accepted',
      mission_id: 'm3',
      missions: { ...baseMission, id: 'm3', title: 'Mission terminee', status: 'completed' },
    }
    render(<WorkerApplications {...defaultProps} allMissions={[doneApp]} ratedMissions={new Set(['m3'])} />)
    expect(screen.getByText(/Mission evaluee/)).toBeTruthy()
  })

  it('renders empty state when allMissions is empty', () => {
    render(<WorkerApplications {...defaultProps} allMissions={[]} />)
    expect(screen.getByText('Aucune candidature envoyee')).toBeTruthy()
  })

  it('filters by pending tab', () => {
    render(<WorkerApplications {...defaultProps} />)
    // Click "En attente" tab button (second one in the list after "Toutes")
    const buttons = screen.getAllByRole('button')
    const pendingTabBtn = buttons.find(b => b.textContent.includes('En attente') && b.tagName === 'BUTTON')
    fireEvent.click(pendingTabBtn)
    // Only pending app should show
    expect(screen.getByText('Cariste H/F')).toBeTruthy()
  })
})

// ── WorkerEarnings ───────────────────────────────────────────────

describe('WorkerEarnings', () => {
  const thisMonth = new Date().toISOString()
  const mockInvoice = {
    id: 'inv1',
    invoice_number: 'INV-001',
    created_at: thisMonth,
    worker_payout: '500',
    status: 'paid',
    total_hours: 40,
  }

  const defaultProps = {
    worker: { missions_completed: 3, rating_avg: '4.2', ca_ytd: 15000 },
    invoices: [mockInvoice],
    allMissions: [],
    t: mockT,
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders my_earnings title', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('my_earnings')).toBeTruthy()
  })

  it('renders KPI grid with this month and year totals', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('Ce mois')).toBeTruthy()
    expect(screen.getByText('Cette annee')).toBeTruthy()
  })

  it('renders monthly summary section', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('Resume du mois')).toBeTruthy()
    expect(screen.getByText('Heures travaillees')).toBeTruthy()
  })

  it('renders chart when paid invoices exist', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('Evolution des gains')).toBeTruthy()
  })

  it('renders invoices table with invoice number', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('INV-001')).toBeTruthy()
  })

  it('renders empty state when no invoices', () => {
    render(<WorkerEarnings {...defaultProps} invoices={[]} />)
    expect(screen.getByText(/Vos gains apparaitront ici/)).toBeTruthy()
  })

  it('renders CA projection when ca_ytd is present', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('Projection CA annuel')).toBeTruthy()
  })

  it('shows warning when ca_ytd > 70000', () => {
    render(<WorkerEarnings {...defaultProps} worker={{ ...defaultProps.worker, ca_ytd: 72000 }} />)
    expect(screen.getByText(/approchez du plafond/)).toBeTruthy()
  })

  it('shows paid badge for paid invoices', () => {
    render(<WorkerEarnings {...defaultProps} />)
    expect(screen.getByText('Payee')).toBeTruthy()
  })

  it('shows pending badge for non-paid invoices', () => {
    const pendingInvoice = { ...mockInvoice, id: 'inv2', invoice_number: 'INV-002', status: 'pending' }
    render(<WorkerEarnings {...defaultProps} invoices={[pendingInvoice]} />)
    expect(screen.getByText('En attente')).toBeTruthy()
  })
})

// ── WorkerMissionDetail ──────────────────────────────────────────

describe('WorkerMissionDetail', () => {
  const defaultProps = {
    mission: baseMission,
    hasApplied: false,
    applying: false,
    onApply: vi.fn(),
    onBack: vi.fn(),
    isSaved: false,
    onToggleSave: vi.fn(),
    onViewCompany: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('returns null when mission is null', () => {
    const { container } = render(<WorkerMissionDetail {...defaultProps} mission={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders mission title', () => {
    render(<WorkerMissionDetail {...defaultProps} />)
    expect(screen.getByText('Cariste H/F')).toBeTruthy()
  })

  it('renders mission description', () => {
    render(<WorkerMissionDetail {...defaultProps} />)
    expect(screen.getByText('Mission de cariste en entrepot logistique')).toBeTruthy()
  })

  it('renders company name as a clickable link', () => {
    render(<WorkerMissionDetail {...defaultProps} />)
    expect(screen.getByText('ACME Corp')).toBeTruthy()
  })

  it('renders skill tags', () => {
    render(<WorkerMissionDetail {...defaultProps} />)
    expect(screen.getByText('CACES 1')).toBeTruthy()
  })

  it('renders hourly rate info', () => {
    render(<WorkerMissionDetail {...defaultProps} />)
    expect(screen.getByText(/12 €\/h/)).toBeTruthy()
  })

  it('shows apply button when not applied', () => {
    render(<WorkerMissionDetail {...defaultProps} />)
    expect(screen.getByText('Postuler →')).toBeTruthy()
  })

  it('shows already applied state when hasApplied is true', () => {
    render(<WorkerMissionDetail {...defaultProps} hasApplied={true} />)
    expect(screen.getByText('✓ Candidature envoyee')).toBeTruthy()
  })

  it('shows Envoi when applying is true', () => {
    render(<WorkerMissionDetail {...defaultProps} applying={true} />)
    expect(screen.getByText('Envoi...')).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<WorkerMissionDetail {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText('‹ Retour'))
    expect(onBack).toHaveBeenCalled()
  })

  it('calls onToggleSave when save button clicked', () => {
    const onToggleSave = vi.fn()
    render(<WorkerMissionDetail {...defaultProps} onToggleSave={onToggleSave} />)
    fireEvent.click(screen.getByLabelText('Sauvegarder'))
    expect(onToggleSave).toHaveBeenCalledWith('m1')
  })

  it('shows Retirer des favoris label when saved', () => {
    render(<WorkerMissionDetail {...defaultProps} isSaved={true} />)
    expect(screen.getByLabelText('Retirer des favoris')).toBeTruthy()
  })
})

// ── WorkerNotifications ──────────────────────────────────────────

describe('WorkerNotifications', () => {
  const notif = {
    id: 'n1',
    title: 'Nouvelle mission disponible',
    body: 'Une mission correspond a votre profil',
    type: 'new_mission',
    read_at: null,
    created_at: '2026-04-01T08:00:00Z',
  }

  const defaultProps = {
    notifs: [notif],
    setNotifs: vi.fn(),
    userId: 'user-1',
    unreadCount: 1,
    onBack: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders Notifications heading', () => {
    render(<WorkerNotifications {...defaultProps} />)
    expect(screen.getByText('Notifications')).toBeTruthy()
  })

  it('renders notification title', () => {
    render(<WorkerNotifications {...defaultProps} />)
    expect(screen.getByText('Nouvelle mission disponible')).toBeTruthy()
  })

  it('shows mark all read button when unreadCount > 0', () => {
    render(<WorkerNotifications {...defaultProps} />)
    expect(screen.getByText(/Tout marquer comme lu/)).toBeTruthy()
  })

  it('does not show mark all read button when unreadCount is 0', () => {
    render(<WorkerNotifications {...defaultProps} unreadCount={0} />)
    expect(screen.queryByText(/Tout marquer/)).toBeNull()
  })

  it('renders filter dropdown', () => {
    render(<WorkerNotifications {...defaultProps} />)
    expect(screen.getByDisplayValue('Toutes')).toBeTruthy()
  })

  it('filters to unread notifications', () => {
    const readNotif = { ...notif, id: 'n2', title: 'Ancienne notif', read_at: '2026-04-01T07:00:00Z' }
    render(<WorkerNotifications {...defaultProps} notifs={[notif, readNotif]} />)
    fireEvent.change(screen.getByDisplayValue('Toutes'), { target: { value: 'unread' } })
    expect(screen.getByText('Nouvelle mission disponible')).toBeTruthy()
    expect(screen.queryByText('Ancienne notif')).toBeNull()
  })

  it('shows empty state when no filtered notifications', () => {
    render(<WorkerNotifications {...defaultProps} notifs={[]} unreadCount={0} />)
    expect(screen.getByText('Aucune notification')).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<WorkerNotifications {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText('‹ Retour'))
    expect(onBack).toHaveBeenCalled()
  })
})

// ── WorkerCalendar ───────────────────────────────────────────────

describe('WorkerCalendar', () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  // Pick a future day to click (today + 2, capped at 28)
  const futureDay = Math.min(today.getDate() + 2, 28)
  const futureDateStr = `${year}-${month}-${String(futureDay).padStart(2, '0')}`

  const defaultProps = {
    blockedDays: [],
    setBlockedDays: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the calendar heading', () => {
    render(<WorkerCalendar {...defaultProps} />)
    expect(screen.getByText('Calendrier de disponibilite')).toBeTruthy()
  })

  it('renders weekday labels', () => {
    render(<WorkerCalendar {...defaultProps} />)
    expect(screen.getByText('Lun')).toBeTruthy()
    expect(screen.getByText('Dim')).toBeTruthy()
  })

  it('renders day numbers in the grid', () => {
    render(<WorkerCalendar {...defaultProps} />)
    // Day 1 should always be rendered
    expect(screen.getByText('1')).toBeTruthy()
  })

  it('calls setBlockedDays when a future day is clicked', () => {
    const setBlockedDays = vi.fn()
    render(<WorkerCalendar {...defaultProps} setBlockedDays={setBlockedDays} />)
    const dayBtn = screen.getByText(String(futureDay))
    fireEvent.click(dayBtn)
    expect(setBlockedDays).toHaveBeenCalled()
  })

  it('shows blocked count in legend', () => {
    render(<WorkerCalendar {...defaultProps} blockedDays={[futureDateStr]} />)
    expect(screen.getByText(/1 jour\(s\) bloque\(s\)/)).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<WorkerCalendar {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText('‹ Retour'))
    expect(onBack).toHaveBeenCalled()
  })
})

// ── WorkerAlerts ─────────────────────────────────────────────────

describe('WorkerAlerts', () => {
  const existingAlert = {
    id: 101,
    sector: 'logistique',
    minRate: '14',
    city: 'Lyon',
    created_at: '2026-04-01T00:00:00Z',
  }

  const defaultProps = {
    savedAlerts: [existingAlert],
    setSavedAlerts: vi.fn(),
    filters: {
      filterSecteur: 'tous',
      setFilterSecteur: vi.fn(),
      filterRateMin: '',
      setFilterRateMin: vi.fn(),
    },
    profileForm: { city: 'Paris' },
    showToast: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders Alertes personnalisees heading', () => {
    render(<WorkerAlerts {...defaultProps} />)
    expect(screen.getByText('Alertes personnalisees')).toBeTruthy()
  })

  it('renders create alert form', () => {
    render(<WorkerAlerts {...defaultProps} />)
    expect(screen.getByText("Creer une alerte")).toBeTruthy()
    expect(screen.getByText("Creer l'alerte")).toBeTruthy()
  })

  it('renders existing alerts list', () => {
    render(<WorkerAlerts {...defaultProps} />)
    expect(screen.getByText('Alertes actives')).toBeTruthy()
    // "Logistique" appears in both the select option and the alert card
    expect(screen.getAllByText(/Logistique/).length).toBeGreaterThan(0)
  })

  it('calls setSavedAlerts and showToast when create alert is clicked', () => {
    const setSavedAlerts = vi.fn()
    const showToast = vi.fn()
    render(<WorkerAlerts {...defaultProps} setSavedAlerts={setSavedAlerts} showToast={showToast} />)
    fireEvent.click(screen.getByText("Creer l'alerte"))
    expect(setSavedAlerts).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Alerte sauvegardee !')
  })

  it('calls setSavedAlerts when delete button is clicked', () => {
    const setSavedAlerts = vi.fn()
    render(<WorkerAlerts {...defaultProps} setSavedAlerts={setSavedAlerts} />)
    fireEvent.click(screen.getByLabelText('Supprimer'))
    expect(setSavedAlerts).toHaveBeenCalled()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<WorkerAlerts {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText('‹ Retour'))
    expect(onBack).toHaveBeenCalled()
  })
})

// ── WorkerMessages (thin wrapper over ConversationsList) ─────────

describe('WorkerMessages', () => {
  it('renders header and empty state via ConversationsList', () => {
    render(<WorkerMessages userId="worker-1" onOpenChat={vi.fn()} />)
    expect(screen.getByText('Messages')).toBeTruthy()
    expect(screen.getByText(/entreprises/i)).toBeTruthy()
  })
})

// ── WorkerCompanyProfile ─────────────────────────────────────────

describe('WorkerCompanyProfile', () => {
  const company = {
    id: 'co1',
    name: 'ACME Corp',
    city: 'Lyon',
    rating_avg: 4.2,
    rating_count: 10,
  }

  const companyMission = {
    id: 'm1',
    title: 'Operateur logistique',
    city: 'Lyon',
    hourly_rate: 13,
    start_date: '2026-05-01',
  }

  const defaultProps = {
    company,
    companyMissions: [companyMission],
    missions: [{ ...baseMission, id: 'm1' }],
    onBack: vi.fn(),
    onSelectMission: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('returns null when company is null', () => {
    const { container } = render(<WorkerCompanyProfile {...defaultProps} company={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders company name', () => {
    render(<WorkerCompanyProfile {...defaultProps} />)
    expect(screen.getByText('ACME Corp')).toBeTruthy()
  })

  it('renders company city', () => {
    render(<WorkerCompanyProfile {...defaultProps} />)
    expect(screen.getByText('Lyon')).toBeTruthy()
  })

  it('renders company missions list', () => {
    render(<WorkerCompanyProfile {...defaultProps} />)
    expect(screen.getByText('Operateur logistique')).toBeTruthy()
  })

  it('calls onSelectMission when mission card is clicked', () => {
    const onSelectMission = vi.fn()
    render(<WorkerCompanyProfile {...defaultProps} onSelectMission={onSelectMission} />)
    fireEvent.click(screen.getByText('Operateur logistique'))
    expect(onSelectMission).toHaveBeenCalled()
  })

  it('shows empty state when no company missions', () => {
    render(<WorkerCompanyProfile {...defaultProps} companyMissions={[]} />)
    expect(screen.getByText('Aucune mission ouverte')).toBeTruthy()
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<WorkerCompanyProfile {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText('‹ Retour'))
    expect(onBack).toHaveBeenCalled()
  })
})

// ── WorkerSiretValidation ────────────────────────────────────────

describe('WorkerSiretValidation', () => {
  const defaultProps = {
    worker: { siret: '', siret_verified: false },
    showToast: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('shows verified state when siret_verified is true', () => {
    const props = {
      worker: { siret: '12345678901234', siret_verified: true, siret_denomination: 'ACME SAS' },
      showToast: vi.fn(),
    }
    render(<WorkerSiretValidation {...props} />)
    expect(screen.getByText(/SIRET verifie/)).toBeTruthy()
    expect(screen.getByText(/12345678901234/)).toBeTruthy()
  })

  it('shows SIRET denomination in verified state', () => {
    const props = {
      worker: { siret: '12345678901234', siret_verified: true, siret_denomination: 'ACME SAS' },
      showToast: vi.fn(),
    }
    render(<WorkerSiretValidation {...props} />)
    expect(screen.getByText('ACME SAS')).toBeTruthy()
  })

  it('renders SIRET input in unverified state', () => {
    render(<WorkerSiretValidation {...defaultProps} />)
    expect(screen.getByPlaceholderText('12345678901234')).toBeTruthy()
  })

  it('verify button is disabled when SIRET is not 14 digits', () => {
    render(<WorkerSiretValidation {...defaultProps} />)
    const btn = screen.getByText('Verifier')
    expect(btn.disabled).toBe(true)
  })

  it('verify button is enabled when SIRET has 14 digits', () => {
    render(<WorkerSiretValidation {...defaultProps} />)
    const input = screen.getByPlaceholderText('12345678901234')
    fireEvent.change(input, { target: { value: '12345678901234' } })
    const btn = screen.getByText('Verifier')
    expect(btn.disabled).toBe(false)
  })

  it('calls validateSiret on form submission', async () => {
    const { validateSiret } = await import('../lib/legal')
    render(<WorkerSiretValidation {...defaultProps} />)
    const input = screen.getByPlaceholderText('12345678901234')
    fireEvent.change(input, { target: { value: '12345678901234' } })
    fireEvent.click(screen.getByText('Verifier'))
    expect(validateSiret).toHaveBeenCalledWith('12345678901234')
  })
})

// ── WorkerAttestation ────────────────────────────────────────────

describe('WorkerAttestation', () => {
  const defaultProps = {
    worker: { attestation_honneur_signed_at: null },
    userId: 'user-1',
    showToast: vi.fn(),
    onUpdate: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('shows signed state when attestation_honneur_signed_at is set', () => {
    const props = {
      ...defaultProps,
      worker: { attestation_honneur_signed_at: '2026-01-15T10:00:00Z' },
    }
    render(<WorkerAttestation {...props} />)
    expect(screen.getByText(/Signee le/)).toBeTruthy()
  })

  it('renders sign form in unsigned state', () => {
    render(<WorkerAttestation {...defaultProps} />)
    expect(screen.getByText("Attestation sur l'honneur")).toBeTruthy()
    expect(screen.getByRole('checkbox')).toBeTruthy()
  })

  it('sign button is disabled when checkbox not checked', () => {
    render(<WorkerAttestation {...defaultProps} />)
    const btn = screen.getByText("Signer l'attestation")
    expect(btn.disabled).toBe(true)
  })

  it('sign button is enabled when checkbox is checked', () => {
    render(<WorkerAttestation {...defaultProps} />)
    fireEvent.click(screen.getByRole('checkbox'))
    const btn = screen.getByText("Signer l'attestation")
    expect(btn.disabled).toBe(false)
  })

  it('calls signAttestation when sign button is clicked', async () => {
    const { signAttestation } = await import('../lib/legal')
    render(<WorkerAttestation {...defaultProps} />)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText("Signer l'attestation"))
    expect(signAttestation).toHaveBeenCalledWith('user-1')
  })

  it('shows attestation content list', () => {
    render(<WorkerAttestation {...defaultProps} />)
    expect(screen.getByText(/independante/)).toBeTruthy()
    expect(screen.getByText(/URSSAF/)).toBeTruthy()
  })
})

// ── CompanyDashboard ─────────────────────────────────────────────

describe('CompanyDashboard', () => {
  const openMission = {
    id: 'm1',
    title: 'Cariste H/F',
    city: 'Paris',
    hourly_rate: 14,
    status: 'open',
    created_at: '2026-04-01T10:00:00Z',
    published_at: '2026-04-01T10:00:00Z',
    workers: null,
  }

  const defaultProps = {
    displayName: 'Entreprise ACME',
    missions: [openMission],
    invoices: [],
    company: { rating_avg: '4.3', rating_count: 5 },
    actionLoading: {},
    signedContracts: [],
    onNavigate: vi.fn(),
    onDuplicate: vi.fn(),
    onComplete: vi.fn(),
    onOpenContract: vi.fn(),
    onOpenChat: vi.fn(),
    onRepublish: vi.fn(),
    onCancelModal: vi.fn(),
    onExportMissions: vi.fn(),
    onLoadCandidates: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders dashboard title', () => {
    render(<CompanyDashboard {...defaultProps} />)
    expect(screen.getByText('Tableau de bord')).toBeTruthy()
  })

  it('renders displayName in welcome message', () => {
    render(<CompanyDashboard {...defaultProps} />)
    expect(screen.getByText(/Entreprise ACME/)).toBeTruthy()
  })

  it('renders KPI cards', () => {
    render(<CompanyDashboard {...defaultProps} />)
    expect(screen.getByText('Missions actives')).toBeTruthy()
    expect(screen.getByText('Missions terminées')).toBeTruthy()
  })

  it('renders mission list when missions exist', () => {
    render(<CompanyDashboard {...defaultProps} />)
    expect(screen.getByText('Cariste H/F')).toBeTruthy()
  })

  it('renders empty state when no missions', () => {
    render(<CompanyDashboard {...defaultProps} missions={[]} />)
    expect(screen.getByText('Aucune mission publiée')).toBeTruthy()
  })

  it('renders Publier une mission button', () => {
    render(<CompanyDashboard {...defaultProps} />)
    expect(screen.getAllByText(/Publier une mission/).length).toBeGreaterThan(0)
  })

  it('calls onDuplicate when Dupliquer button is clicked', () => {
    const onDuplicate = vi.fn()
    render(<CompanyDashboard {...defaultProps} onDuplicate={onDuplicate} />)
    fireEvent.click(screen.getByText(/Dupliquer/))
    expect(onDuplicate).toHaveBeenCalledWith(openMission)
  })

  it('calls onLoadCandidates for open missions', () => {
    const onLoadCandidates = vi.fn()
    render(<CompanyDashboard {...defaultProps} onLoadCandidates={onLoadCandidates} />)
    fireEvent.click(screen.getByText('Candidatures'))
    expect(onLoadCandidates).toHaveBeenCalledWith('m1')
  })

  it('shows Export CSV button', () => {
    render(<CompanyDashboard {...defaultProps} />)
    expect(screen.getByText(/Export CSV/)).toBeTruthy()
  })
})

// ── CompanyCandidates ────────────────────────────────────────────

describe('CompanyCandidates', () => {
  const pendingCandidate = {
    id: 'c1',
    status: 'pending',
    match_score: 90,
    workers: {
      first_name: 'Marie',
      last_name: 'Martin',
      city: 'Lyon',
      rating_avg: '4.5',
      skills: ['CACES 1', 'Logistique'],
    },
  }

  const acceptedCandidate = {
    id: 'c2',
    status: 'accepted',
    workers: {
      first_name: 'Pierre',
      last_name: 'Dubois',
      city: 'Paris',
      rating_avg: null,
      skills: [],
    },
  }

  const defaultProps = {
    candidates: [pendingCandidate, acceptedCandidate],
    actionLoading: {},
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onBack: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders Candidatures reçues heading', () => {
    render(<CompanyCandidates {...defaultProps} />)
    expect(screen.getByText('Candidatures reçues')).toBeTruthy()
  })

  it('renders candidate names', () => {
    render(<CompanyCandidates {...defaultProps} />)
    expect(screen.getByText(/Marie/)).toBeTruthy()
    expect(screen.getByText(/Pierre/)).toBeTruthy()
  })

  it('renders accept and reject buttons for pending candidate', () => {
    render(<CompanyCandidates {...defaultProps} />)
    expect(screen.getByText(/Accepter ce travailleur/)).toBeTruthy()
    expect(screen.getByText(/Refuser/)).toBeTruthy()
  })

  it('calls onAccept with candidate when accept button is clicked', () => {
    const onAccept = vi.fn()
    render(<CompanyCandidates {...defaultProps} onAccept={onAccept} />)
    fireEvent.click(screen.getByText(/Accepter ce travailleur/))
    expect(onAccept).toHaveBeenCalledWith(pendingCandidate)
  })

  it('calls onReject with candidate id when reject button is clicked', () => {
    const onReject = vi.fn()
    render(<CompanyCandidates {...defaultProps} onReject={onReject} />)
    fireEvent.click(screen.getByText(/Refuser/))
    expect(onReject).toHaveBeenCalledWith('c1')
  })

  it('renders empty state when no candidates', () => {
    render(<CompanyCandidates {...defaultProps} candidates={[]} />)
    expect(screen.getByText(/Aucune candidature pour le moment/)).toBeTruthy()
  })

  it('shows accepted contract info for accepted candidate', () => {
    render(<CompanyCandidates {...defaultProps} />)
    expect(screen.getByText(/Contrat de prestation généré/)).toBeTruthy()
  })

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn()
    render(<CompanyCandidates {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByText(/Retour/))
    expect(onBack).toHaveBeenCalled()
  })

  it('shows candidate skills as tags', () => {
    render(<CompanyCandidates {...defaultProps} />)
    expect(screen.getByText('CACES 1')).toBeTruthy()
  })
})

// ── CompanyStats ─────────────────────────────────────────────────

describe('CompanyStats', () => {
  const missions = [
    { id: 'm1', status: 'open', sector: 'logistique' },
    { id: 'm2', status: 'completed', sector: 'btp' },
    { id: 'm3', status: 'active', sector: 'logistique' },
  ]

  const invoices = [
    { id: 'inv1', created_at: '2026-04-01T00:00:00Z', amount_ttc: '1000', status: 'paid' },
    { id: 'inv2', created_at: '2026-03-01T00:00:00Z', amount_ttc: '800', status: 'paid' },
  ]

  const defaultProps = {
    missions,
    invoices,
    company: { rating_avg: '4.1', rating_count: 3 },
    onExportMissions: vi.fn(),
    onExportInvoices: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders Statistiques heading', () => {
    render(<CompanyStats {...defaultProps} />)
    expect(screen.getByText('Statistiques')).toBeTruthy()
  })

  it('renders KPI metrics', () => {
    render(<CompanyStats {...defaultProps} />)
    expect(screen.getByText('Missions publiées')).toBeTruthy()
    expect(screen.getByText('Missions terminées')).toBeTruthy()
    expect(screen.getByText('Taux de complétion')).toBeTruthy()
  })

  it('renders chart with monthly spending', () => {
    render(<CompanyStats {...defaultProps} />)
    expect(screen.getByText('Dépenses mensuelles')).toBeTruthy()
  })

  it('renders mission status breakdown', () => {
    render(<CompanyStats {...defaultProps} />)
    expect(screen.getByText('Missions par statut')).toBeTruthy()
    expect(screen.getByText('Publiée')).toBeTruthy()
  })

  it('renders sector breakdown', () => {
    render(<CompanyStats {...defaultProps} />)
    expect(screen.getByText('Répartition par secteur')).toBeTruthy()
    expect(screen.getByText('Logistique')).toBeTruthy()
    expect(screen.getByText('BTP')).toBeTruthy()
  })

  it('renders export buttons', () => {
    render(<CompanyStats {...defaultProps} />)
    expect(screen.getByText(/Exporter missions/)).toBeTruthy()
    expect(screen.getByText(/Exporter factures/)).toBeTruthy()
  })

  it('calls onExportMissions when export missions button clicked', () => {
    const onExportMissions = vi.fn()
    render(<CompanyStats {...defaultProps} onExportMissions={onExportMissions} />)
    fireEvent.click(screen.getByText(/Exporter missions/))
    expect(onExportMissions).toHaveBeenCalled()
  })

  it('calls onExportInvoices when export invoices button clicked', () => {
    const onExportInvoices = vi.fn()
    render(<CompanyStats {...defaultProps} onExportInvoices={onExportInvoices} />)
    fireEvent.click(screen.getByText(/Exporter factures/))
    expect(onExportInvoices).toHaveBeenCalled()
  })

  it('shows no data message when invoices is empty', () => {
    render(<CompanyStats {...defaultProps} invoices={[]} />)
    expect(screen.getByText('Pas encore de données')).toBeTruthy()
  })
})

// ── DashboardLayout ──────────────────────────────────────────────

describe('DashboardLayout', () => {
  const workerTabs = [
    ['dashboard', 'Accueil'],
    ['missions', 'Missions'],
    ['applications', 'Candidatures'],
  ]

  const companyTabs = [
    ['dashboard', 'Tableau de bord'],
    ['candidats', 'Candidats'],
    ['stats', 'Statistiques'],
  ]

  const defaultWorkerProps = {
    role: 'worker',
    tabs: workerTabs,
    activeTab: 'dashboard',
    onTabChange: vi.fn(),
    onLogoClick: vi.fn(),
    children: <div>Contenu</div>,
    unreadCount: 0,
    onNotifClick: vi.fn(),
  }

  const defaultCompanyProps = {
    role: 'company',
    tabs: companyTabs,
    activeTab: 'dashboard',
    onTabChange: vi.fn(),
    onLogoClick: vi.fn(),
    children: <div>Contenu entreprise</div>,
    unreadCount: 0,
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders TEMPO logo text', () => {
    render(<DashboardLayout {...defaultWorkerProps} />)
    expect(screen.getByText('TEMPO')).toBeTruthy()
  })

  it('renders worker sub-nav tabs below header for worker role', () => {
    render(<DashboardLayout {...defaultWorkerProps} />)
    expect(screen.getByText('Accueil')).toBeTruthy()
    expect(screen.getByText('Missions')).toBeTruthy()
  })

  it('renders company tabs in header for company role', () => {
    render(<DashboardLayout {...defaultCompanyProps} />)
    expect(screen.getByText('Tableau de bord')).toBeTruthy()
    expect(screen.getByText('Candidats')).toBeTruthy()
  })

  it('renders children content', () => {
    render(<DashboardLayout {...defaultWorkerProps} />)
    expect(screen.getByText('Contenu')).toBeTruthy()
  })

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<DashboardLayout {...defaultWorkerProps} onTabChange={onTabChange} />)
    fireEvent.click(screen.getByText('Missions'))
    expect(onTabChange).toHaveBeenCalledWith('missions')
  })

  it('calls onLogoClick when logo is clicked', () => {
    const onLogoClick = vi.fn()
    render(<DashboardLayout {...defaultWorkerProps} onLogoClick={onLogoClick} />)
    fireEvent.click(screen.getByText('TEMPO'))
    expect(onLogoClick).toHaveBeenCalled()
  })

  it('shows dark mode toggle button', () => {
    render(<DashboardLayout {...defaultWorkerProps} />)
    expect(screen.getByLabelText(/mode sombre/i)).toBeTruthy()
  })

  it('shows notification bell when onNotifClick is provided', () => {
    render(<DashboardLayout {...defaultWorkerProps} />)
    expect(screen.getByLabelText('Notifications')).toBeTruthy()
  })

  it('shows unread badge when unreadCount > 0', () => {
    render(<DashboardLayout {...defaultWorkerProps} unreadCount={3} />)
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('shows Espace Entreprise label for company role', () => {
    render(<DashboardLayout {...defaultCompanyProps} />)
    expect(screen.getByText('Espace Entreprise')).toBeTruthy()
  })

  it('renders Deconnexion button', () => {
    render(<DashboardLayout {...defaultWorkerProps} />)
    expect(screen.getByText('Deconnexion')).toBeTruthy()
  })
})
