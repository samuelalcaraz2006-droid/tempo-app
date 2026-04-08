// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock SignatureCanvas pour isoler ContractModal
vi.mock('../components/SignatureCanvas', () => ({
  default: ({ onSave, label }) => (
    <div data-testid="signature-canvas">
      <span>{label}</span>
      <button onClick={() => onSave('data:image/jpeg;base64,mock-sig')}>
        Simuler signature
      </button>
    </div>
  ),
}))

import ContractModal from '../components/ContractModal'

const mission = {
  title: 'Mission logistique',
  hourly_rate: 20,
  total_hours: 8,
  start_date: '2026-05-01',
  city: 'Lyon',
}

const company = { name: 'Acme Corp' }
const worker = { first_name: 'Marie', last_name: 'Martin' }

const defaultProps = {
  mission,
  company,
  worker,
  role: 'worker',
  onSign: vi.fn(),
  onClose: vi.fn(),
  signing: false,
}

describe('ContractModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le titre de la mission', () => {
    render(<ContractModal {...defaultProps} />)
    expect(screen.getByText('Mission logistique')).toBeInTheDocument()
  })

  it('affiche le nom de l\'entreprise', () => {
    render(<ContractModal {...defaultProps} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('affiche le nom du travailleur', () => {
    render(<ContractModal {...defaultProps} />)
    expect(screen.getByText('Marie Martin')).toBeInTheDocument()
  })

  it('affiche le taux horaire', () => {
    render(<ContractModal {...defaultProps} />)
    expect(screen.getByText('20 €/h')).toBeInTheDocument()
  })

  it('affiche la durée en heures', () => {
    render(<ContractModal {...defaultProps} />)
    expect(screen.getByText('8 heures')).toBeInTheDocument()
  })

  it('affiche la ville', () => {
    render(<ContractModal {...defaultProps} />)
    expect(screen.getByText('Lyon')).toBeInTheDocument()
  })

  it('calcule le montant net pour le worker (78%)', () => {
    render(<ContractModal {...defaultProps} role="worker" />)
    // 20 * 8 * 0.78 = 124.8 → 125
    expect(screen.getByText('125 € net')).toBeInTheDocument()
  })

  it('calcule le montant HT pour l\'entreprise (100%)', () => {
    render(<ContractModal {...defaultProps} role="company" />)
    // 20 * 8 = 160
    expect(screen.getByText('160 € HT')).toBeInTheDocument()
  })

  it('n\'affiche pas le montant si hourly_rate ou total_hours est absent', () => {
    const missionNoHours = { ...mission, total_hours: null }
    render(<ContractModal {...defaultProps} mission={missionNoHours} />)
    expect(screen.queryByText(/net|HT/)).not.toBeInTheDocument()
  })

  it('affiche — quand company est null', () => {
    render(<ContractModal {...defaultProps} company={null} />)
    // Le champ Entreprise doit afficher —
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('le bouton Signer est désactivé sans signature et sans checkbox', () => {
    render(<ContractModal {...defaultProps} />)
    const signBtn = screen.getByRole('button', { name: /signer le contrat/i })
    expect(signBtn).toBeDisabled()
  })

  it('le bouton Signer reste désactivé avec signature mais sans checkbox', () => {
    render(<ContractModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /simuler signature/i }))
    const signBtn = screen.getByRole('button', { name: /signer le contrat/i })
    expect(signBtn).toBeDisabled()
  })

  it('le bouton Signer reste désactivé avec checkbox mais sans signature', () => {
    render(<ContractModal {...defaultProps} />)
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    const signBtn = screen.getByRole('button', { name: /signer le contrat/i })
    expect(signBtn).toBeDisabled()
  })

  it('active le bouton Signer avec signature + checkbox cochée', () => {
    render(<ContractModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /simuler signature/i }))
    fireEvent.click(screen.getByRole('checkbox'))
    const signBtn = screen.getByRole('button', { name: /signer le contrat/i })
    expect(signBtn).not.toBeDisabled()
  })

  it('appelle onSign avec la signature lors du clic', () => {
    render(<ContractModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /simuler signature/i }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /signer le contrat/i }))
    expect(defaultProps.onSign).toHaveBeenCalledWith('data:image/jpeg;base64,mock-sig')
  })

  it('affiche confirmation après signature enregistrée', () => {
    render(<ContractModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /simuler signature/i }))
    expect(screen.getByText(/Signature enregistrée/)).toBeInTheDocument()
  })

  it('appelle onClose sur le bouton Annuler', () => {
    render(<ContractModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('ferme sur la touche Escape', () => {
    render(<ContractModal {...defaultProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('ne ferme pas sur Escape quand signing=true', () => {
    render(<ContractModal {...defaultProps} signing={true} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('affiche "Signature en cours..." quand signing=true', () => {
    render(<ContractModal {...defaultProps} signing={true} />)
    expect(screen.getByText('Signature en cours...')).toBeInTheDocument()
  })

  it('a le role dialog avec aria-modal', () => {
    render(<ContractModal {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('affiche le label du canvas pour le worker', () => {
    render(<ContractModal {...defaultProps} role="worker" />)
    expect(screen.getByText('Signature du travailleur')).toBeInTheDocument()
  })

  it('affiche le label du canvas pour l\'entreprise', () => {
    render(<ContractModal {...defaultProps} role="company" />)
    expect(screen.getByText("Signature de l'entreprise")).toBeInTheDocument()
  })
})
