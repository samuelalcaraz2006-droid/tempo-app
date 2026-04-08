// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import SignatureCanvas from '../components/SignatureCanvas'

// Mock canvas context
const mockCtx = {
  lineWidth: 0,
  lineCap: '',
  strokeStyle: '',
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  clearRect: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx)
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,abc123')
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
    left: 0, top: 0, width: 360, height: 140,
  }))
})

describe('SignatureCanvas', () => {
  it('affiche le label', () => {
    render(<SignatureCanvas onSave={vi.fn()} label="Ma signature" />)
    expect(screen.getByText('Ma signature')).toBeInTheDocument()
  })

  it('utilise le label par défaut "Signature"', () => {
    render(<SignatureCanvas onSave={vi.fn()} />)
    expect(screen.getByText('Signature')).toBeInTheDocument()
  })

  it('affiche le canvas avec role img', () => {
    render(<SignatureCanvas onSave={vi.fn()} label="Signature test" />)
    const canvas = screen.getByRole('img')
    expect(canvas).toBeInTheDocument()
  })

  it('le bouton "Valider" est désactivé au départ', () => {
    render(<SignatureCanvas onSave={vi.fn()} />)
    const validateBtn = screen.getByRole('button', { name: /valider la signature/i })
    expect(validateBtn).toBeDisabled()
  })

  it('le bouton "Effacer" est toujours présent', () => {
    render(<SignatureCanvas onSave={vi.fn()} />)
    expect(screen.getByRole('button', { name: /effacer/i })).toBeInTheDocument()
  })

  it('active le bouton Valider après mouseDown + mouseMove', () => {
    render(<SignatureCanvas onSave={vi.fn()} />)
    const canvas = screen.getByRole('img')

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 })
    fireEvent.mouseUp(canvas)

    const validateBtn = screen.getByRole('button', { name: /valider la signature/i })
    expect(validateBtn).not.toBeDisabled()
  })

  it('affiche le message de statut après avoir dessiné', () => {
    render(<SignatureCanvas onSave={vi.fn()} />)
    const canvas = screen.getByRole('img')

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 30 })
    fireEvent.mouseUp(canvas)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('appelle onSave avec la dataUrl lors du clic sur Valider', () => {
    const onSave = vi.fn()
    render(<SignatureCanvas onSave={onSave} />)
    const canvas = screen.getByRole('img')

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 30 })
    fireEvent.mouseUp(canvas)

    fireEvent.click(screen.getByRole('button', { name: /valider la signature/i }))
    expect(onSave).toHaveBeenCalledWith('data:image/jpeg;base64,abc123')
  })

  it('n\'appelle pas onSave si rien n\'a été dessiné', () => {
    const onSave = vi.fn()
    render(<SignatureCanvas onSave={onSave} />)
    // Clic direct sur Valider sans avoir dessiné (bouton désactivé)
    const validateBtn = screen.getByRole('button', { name: /valider la signature/i })
    fireEvent.click(validateBtn)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('remet hasDrawn à false après Effacer', () => {
    render(<SignatureCanvas onSave={vi.fn()} />)
    const canvas = screen.getByRole('img')

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 30 })
    fireEvent.mouseUp(canvas)

    // Valider est actif
    expect(screen.getByRole('button', { name: /valider la signature/i })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: /effacer/i }))

    // Valider est de nouveau désactivé
    expect(screen.getByRole('button', { name: /valider la signature/i })).toBeDisabled()
  })

  it('n\'appelle pas onSave si dataUrl dépasse 200000 chars', () => {
    const onSave = vi.fn()
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'A'.repeat(200001))
    render(<SignatureCanvas onSave={onSave} />)
    const canvas = screen.getByRole('img')

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 30 })
    fireEvent.mouseUp(canvas)

    fireEvent.click(screen.getByRole('button', { name: /valider la signature/i }))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('stoppe le dessin sur mouseLeave', () => {
    const onSave = vi.fn()
    render(<SignatureCanvas onSave={onSave} />)
    const canvas = screen.getByRole('img')

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseLeave(canvas)
    // Après mouseLeave, drawing = false, donc mouseMove ne devrait pas dessiner
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 })

    // Comme hasDrawn peut rester false car le mouseMove après mouseLeave ne dessine pas
    // Le bouton Valider reste désactivé
    expect(screen.getByRole('button', { name: /valider la signature/i })).toBeDisabled()
  })
})
