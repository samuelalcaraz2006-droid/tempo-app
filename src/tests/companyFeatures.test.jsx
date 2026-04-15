// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Download: (props) => <svg data-testid="icon-download" {...props} />,
  MessageCircle: (props) => <svg data-testid="icon-message-circle" {...props} />,
  X: (props) => <svg data-testid="icon-x" {...props} />,
  Search: (props) => <svg data-testid="icon-search" {...props} />,
}))

vi.mock('../hooks/shared/useConversations', () => ({
  useConversations: () => ({ conversations: [], loading: false, refreshing: false, refresh: vi.fn(), error: null }),
}))

vi.mock('../lib/formatters', () => ({
  formatDate: (d) => (d ? '01 jan.' : '—'),
  formatAmount: (n) => (n !== undefined && n !== null ? `${n} €` : '—'),
  SECTOR_LABELS: {
    logistique: 'Logistique',
    btp: 'BTP',
    industrie: 'Industrie',
    hotellerie: 'Hôtellerie',
    proprete: 'Propreté',
  },
}))

import CompanyContracts from '../features/company/CompanyContracts'
import CompanyMessages from '../features/company/CompanyMessages'
import CompanyPublishMission from '../features/company/CompanyPublishMission'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_INVOICES = [
  {
    id: 'inv1',
    invoice_number: 'F-001',
    amount_ttc: 580,
    status: 'paid',
    created_at: '2025-03-01T10:00:00Z',
    contracts: { workers: { first_name: 'Marie', last_name: 'Dupont' } },
  },
  {
    id: 'inv2',
    invoice_number: 'F-002',
    amount_ttc: 320,
    status: 'sent',
    created_at: '2025-03-15T10:00:00Z',
    contracts: { workers: { first_name: 'Jean', last_name: 'Martin' } },
  },
]

const FAKE_MISSIONS_WITH_WORKER = [
  { id: 'm1', title: 'Opérateur logistique', assigned_worker_id: 'w1', workers: { id: 'w1', first_name: 'Marc', last_name: 'Leroy' } },
]

const DEFAULT_FORM = {
  title: '',
  sector: 'logistique',
  hourly_rate: '',
  total_hours: '',
  start_date: '',
  city: '',
  address: '',
  description: '',
  required_skills: [],
  required_certs: [],
  urgency: 'normal',
}

// ── CompanyContracts ──────────────────────────────────────────────────────────

describe('CompanyContracts', () => {
  it('renders empty state when no invoices', () => {
    render(<CompanyContracts invoices={[]} onExportInvoices={vi.fn()} />)
    expect(screen.getByText(/factures apparaissent/i)).toBeInTheDocument()
  })

  it('renders invoice table with data', () => {
    render(<CompanyContracts invoices={FAKE_INVOICES} onExportInvoices={vi.fn()} />)
    expect(screen.getByText('F-001')).toBeInTheDocument()
    expect(screen.getByText('F-002')).toBeInTheDocument()
    expect(screen.getByText('Marie Dupont')).toBeInTheDocument()
    expect(screen.getByText('Jean Martin')).toBeInTheDocument()
  })

  it('shows correct metric counts', () => {
    render(<CompanyContracts invoices={FAKE_INVOICES} onExportInvoices={vi.fn()} />)
    // Total invoices = 2
    expect(screen.getByText('2')).toBeInTheDocument()
    // Paid invoices = 1
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('export button calls onExportInvoices', () => {
    const onExport = vi.fn()
    render(<CompanyContracts invoices={FAKE_INVOICES} onExportInvoices={onExport} />)
    fireEvent.click(screen.getByText(/exporter les factures/i))
    expect(onExport).toHaveBeenCalled()
  })

  it('shows TEMPO legal disclaimer', () => {
    render(<CompanyContracts invoices={[]} onExportInvoices={vi.fn()} />)
    expect(screen.getByText(/mandataire de facturation/i)).toBeInTheDocument()
  })

  it('renders table headers when invoices present', () => {
    render(<CompanyContracts invoices={FAKE_INVOICES} onExportInvoices={vi.fn()} />)
    expect(screen.getByText('Référence')).toBeInTheDocument()
    expect(screen.getByText('Travailleur')).toBeInTheDocument()
    expect(screen.getByText('Montant')).toBeInTheDocument()
  })
})

// ── CompanyMessages (thin wrapper over ConversationsList) ───────────────────

describe('CompanyMessages', () => {
  it('renders header and empty state via ConversationsList', () => {
    render(<CompanyMessages userId="company-1" onOpenChat={vi.fn()} />)
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText(/travailleurs/i)).toBeInTheDocument()
  })
})

// ── CompanyPublishMission ─────────────────────────────────────────────────────

describe('CompanyPublishMission', () => {
  const defaultProps = {
    form: DEFAULT_FORM,
    setF: vi.fn(),
    publishing: false,
    published: false,
    templates: [],
    showTemplates: false,
    setShowTemplates: vi.fn(),
    onPublish: vi.fn(),
    onSaveTemplate: vi.fn(),
    onLoadTemplate: vi.fn(),
    onDeleteTemplate: vi.fn(),
    onNewMission: vi.fn(),
    onNavigateDashboard: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the publish form when not published', () => {
    render(<CompanyPublishMission {...defaultProps} />)
    expect(screen.getByText('Publier une mission')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/opérateur logistique/i)).toBeInTheDocument()
  })

  it('shows publish button in default state', () => {
    render(<CompanyPublishMission {...defaultProps} />)
    expect(screen.getByText('Publier la mission →')).toBeInTheDocument()
  })

  it('disables publish button when publishing=true', () => {
    render(<CompanyPublishMission {...defaultProps} publishing={true} />)
    const btn = screen.getByText('Publication en cours...')
    expect(btn).toBeDisabled()
  })

  it('calls onPublish when publish button clicked', () => {
    const onPublish = vi.fn()
    render(<CompanyPublishMission {...defaultProps} onPublish={onPublish} />)
    fireEvent.click(screen.getByText('Publier la mission →'))
    expect(onPublish).toHaveBeenCalled()
  })

  it('renders success screen when published=true', () => {
    render(<CompanyPublishMission {...defaultProps} published={true} />)
    expect(screen.getByText('Mission publiée !')).toBeInTheDocument()
    expect(screen.getByText('Nouvelle mission')).toBeInTheDocument()
    expect(screen.getByText('Voir le tableau de bord →')).toBeInTheDocument()
  })

  it('calls onNewMission when Nouvelle mission button clicked', () => {
    const onNewMission = vi.fn()
    render(<CompanyPublishMission {...defaultProps} published={true} onNewMission={onNewMission} />)
    fireEvent.click(screen.getByText('Nouvelle mission'))
    expect(onNewMission).toHaveBeenCalled()
  })

  it('calls onNavigateDashboard when dashboard button clicked', () => {
    const onNavigateDashboard = vi.fn()
    render(<CompanyPublishMission {...defaultProps} published={true} onNavigateDashboard={onNavigateDashboard} />)
    fireEvent.click(screen.getByText('Voir le tableau de bord →'))
    expect(onNavigateDashboard).toHaveBeenCalled()
  })

  it('shows templates count button', () => {
    render(<CompanyPublishMission {...defaultProps} />)
    expect(screen.getByText(/templates \(0\)/i)).toBeInTheDocument()
  })

  it('calls setShowTemplates when templates button clicked', () => {
    const setShowTemplates = vi.fn()
    render(<CompanyPublishMission {...defaultProps} setShowTemplates={setShowTemplates} />)
    fireEvent.click(screen.getByText(/templates \(0\)/i))
    expect(setShowTemplates).toHaveBeenCalledWith(true)
  })

  it('shows cost estimation when hourly_rate and total_hours provided', () => {
    render(<CompanyPublishMission {...defaultProps} form={{ ...DEFAULT_FORM, hourly_rate: '15', total_hours: '40' }} />)
    expect(screen.getByText('Coût estimé')).toBeInTheDocument()
  })

  // i18n locale objects
  it('fr.js exports required navigation keys', async () => {
    const fr = (await import('../lib/i18n/fr.js')).default
    expect(fr.nav_home).toBe('Accueil')
    expect(fr.nav_missions).toBe('Missions')
    expect(fr.nav_messages).toBe('Messages')
    expect(fr.nav_contracts).toBe('Contrats')
    expect(fr.nav_dashboard).toBe('Tableau de bord')
  })

  it('en.js exports required navigation keys', async () => {
    const en = (await import('../lib/i18n/en.js')).default
    expect(en.nav_home).toBe('Home')
    expect(en.nav_missions).toBe('Missions')
    expect(en.nav_messages).toBe('Messages')
    expect(en.nav_contracts).toBe('Contracts')
    expect(en.nav_dashboard).toBe('Dashboard')
  })

  it('fr.js and en.js have matching key sets', async () => {
    const fr = (await import('../lib/i18n/fr.js')).default
    const en = (await import('../lib/i18n/en.js')).default
    const frKeys = Object.keys(fr).sort()
    const enKeys = Object.keys(en).sort()
    expect(frKeys).toEqual(enKeys)
  })
})
