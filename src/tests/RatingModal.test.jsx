// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import RatingModal from '../components/RatingModal'

describe('RatingModal', () => {
  const defaultProps = {
    rateeName: 'Jean Dupont',
    onSubmit: vi.fn(),
    onClose: vi.fn(),
    loading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('affiche le nom de la personne évaluée', () => {
    render(<RatingModal {...defaultProps} />)
    expect(screen.getByText(/Jean Dupont/)).toBeInTheDocument()
  })

  it('affiche 5 boutons étoiles', () => {
    render(<RatingModal {...defaultProps} />)
    const stars = screen.getAllByRole('button', { name: /étoile/i })
    expect(stars).toHaveLength(5)
  })

  it('le bouton Envoyer est désactivé sans note', () => {
    render(<RatingModal {...defaultProps} />)
    const sendBtn = screen.getByRole('button', { name: /envoyer/i })
    expect(sendBtn).toBeDisabled()
  })

  it('active le bouton Envoyer après avoir sélectionné une note', () => {
    render(<RatingModal {...defaultProps} />)
    const star3 = screen.getByRole('button', { name: /3 étoiles/i })
    fireEvent.click(star3)
    const sendBtn = screen.getByRole('button', { name: /envoyer/i })
    expect(sendBtn).not.toBeDisabled()
  })

  it('affiche le label STAR_LABELS après sélection', () => {
    render(<RatingModal {...defaultProps} />)
    const star5 = screen.getByRole('button', { name: /5 étoiles/i })
    fireEvent.click(star5)
    // STAR_LABELS[5] devrait apparaître
    expect(screen.getByText(/Excellent/i)).toBeInTheDocument()
  })

  it('appelle onSubmit avec le score et le commentaire', () => {
    render(<RatingModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /4 étoiles/i }))

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'Très bonne collaboration' } })

    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(4, 'Très bonne collaboration')
  })

  it('appelle onSubmit avec commentaire vide si non renseigné', () => {
    render(<RatingModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /1 étoile/i }))
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }))
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(1, '')
  })

  it('appelle onClose sur "Plus tard"', () => {
    render(<RatingModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /plus tard/i }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('ferme sur la touche Escape', () => {
    render(<RatingModal {...defaultProps} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('ne ferme pas sur Escape quand loading=true', () => {
    render(<RatingModal {...defaultProps} loading={true} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('désactive les boutons quand loading=true', () => {
    render(<RatingModal {...defaultProps} loading={true} />)
    expect(screen.getByRole('button', { name: /plus tard/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /envoi/i })).toBeDisabled()
  })

  it('affiche "Envoi..." quand loading=true', () => {
    render(<RatingModal {...defaultProps} loading={true} />)
    expect(screen.getByText('Envoi...')).toBeInTheDocument()
  })

  it('a le role dialog et aria-modal', () => {
    render(<RatingModal {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('affiche le label du score au hover', () => {
    render(<RatingModal {...defaultProps} />)
    const star2 = screen.getByRole('button', { name: /2 étoiles/i })
    fireEvent.mouseEnter(star2)
    // STAR_LABELS[2] = 'Passable' (index 2, 2e étoile)
    expect(screen.getByText(/Passable/i)).toBeInTheDocument()
  })

  it('cache le label après mouseLeave sans sélection', () => {
    render(<RatingModal {...defaultProps} />)
    const star2 = screen.getByRole('button', { name: /2 étoiles/i })
    fireEvent.mouseEnter(star2)
    fireEvent.mouseLeave(star2)
    // hover=0, score=0 → pas de label affiché
    expect(screen.queryByText(/Bien/i)).not.toBeInTheDocument()
  })
})
