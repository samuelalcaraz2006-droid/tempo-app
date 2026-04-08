// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock react-leaflet pour éviter les appels à L et MapContainer
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => (
    <div data-testid="map-container">
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position, children }) => (
    <div data-testid={`marker-${position[0]}`}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}))

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}))

// Mock le CSS
vi.mock('leaflet/dist/leaflet.css', () => ({}))

import MissionsMap from '../components/MissionsMap'

const baseMission = {
  id: 'm1',
  title: 'Mission logistique',
  city: 'Paris',
  lat: null,
  lng: null,
  companies: { name: 'Acme Corp' },
  hourly_rate: 15,
}

describe('MissionsMap', () => {
  const onSelectMission = vi.fn()
  const onApply = vi.fn()
  const hasApplied = vi.fn((id) => false)

  beforeEach(() => {
    vi.clearAllMocks()
    hasApplied.mockReturnValue(false)
  })

  it('affiche le message vide quand pas de missions', () => {
    render(
      <MissionsMap
        missions={[]}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByText(/aucune mission/i)).toBeInTheDocument()
  })

  it('affiche le message vide quand aucune mission n\'a de coordonnées', () => {
    const missions = [
      { ...baseMission, city: 'VilleInconnue' },
    ]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByText(/aucune mission localisable/i)).toBeInTheDocument()
  })

  it('affiche la carte avec MapContainer', () => {
    const missions = [{ ...baseMission, city: 'Paris' }]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('rend TileLayer', () => {
    const missions = [{ ...baseMission, city: 'Paris' }]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument()
  })

  it('affiche le titre de la mission', () => {
    const missions = [
      { ...baseMission, id: 'm1', title: 'Manutention express', city: 'Paris' },
    ]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByText('Manutention express')).toBeInTheDocument()
  })

  it('appelle onSelectMission au clic sur le bouton Détails', () => {
    const missions = [{ ...baseMission, id: 'm1', city: 'Paris' }]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    const detailsBtn = screen.getByRole('button', { name: /détails/i })
    fireEvent.click(detailsBtn)
    expect(onSelectMission).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', city: 'Paris' }))
  })

  it('affiche Postuler quand hasApplied retourne false', () => {
    const missions = [{ ...baseMission, id: 'm1', city: 'Paris' }]
    hasApplied.mockReturnValue(false)
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByRole('button', { name: /postuler/i })).toBeInTheDocument()
  })

  it('affiche ✓ Postulé et désactive le bouton quand hasApplied retourne true', () => {
    const missions = [{ ...baseMission, id: 'm1', city: 'Paris' }]
    hasApplied.mockReturnValue(true)
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    const applyBtn = screen.getByRole('button', { name: /postulé/i })
    expect(applyBtn).toBeDisabled()
  })

  it('appelle onApply avec la mission au clic sur Postuler', () => {
    const missions = [{ ...baseMission, id: 'm1', city: 'Paris' }]
    hasApplied.mockReturnValue(false)
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    const postulBtn = screen.getByRole('button', { name: /postuler/i })
    fireEvent.click(postulBtn)
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1', city: 'Paris' }))
  })

  it('accepte une ville avec majuscules/minuscules mélangées', () => {
    const missions = [{ ...baseMission, city: 'PaRiS' }]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('tolère les espaces avant/après la ville', () => {
    const missions = [{ ...baseMission, city: '  Paris  ' }]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('crée un marker par mission mappable', () => {
    const missions = [
      { ...baseMission, id: 'm1', city: 'Paris' },
      { ...baseMission, id: 'm2', city: 'Lyon' },
    ]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getAllByTestId(/marker-/)).toHaveLength(2)
  })

  it('rend le composant avec entreprise et détails', () => {
    const missions = [
      {
        ...baseMission,
        city: 'Paris',
        companies: { name: 'SuperCorp' },
        hourly_rate: 25,
        total_hours: 8,
      },
    ]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('résout les coordonnées depuis mission.lat/lng', () => {
    const missions = [
      { ...baseMission, lat: 45.0, lng: 3.0 },
    ]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('filtre les missions sans coordonnées', () => {
    const missions = [
      { ...baseMission, id: 'm1', city: 'VilleInconnue' },
      { ...baseMission, id: 'm2', city: 'Paris' },
    ]
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    // Seulement une mission affichée
    expect(screen.getAllByTestId(/marker-/)).toHaveLength(1)
  })

  it('affiche plusieurs missions sans erreur', () => {
    const missions = Array.from({ length: 5 }, (_, i) => ({
      ...baseMission,
      id: `m${i}`,
      city: i % 2 === 0 ? 'Paris' : 'Lyon',
    }))
    render(
      <MissionsMap
        missions={missions}
        onSelectMission={onSelectMission}
        onApply={onApply}
        hasApplied={hasApplied}
      />
    )
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })
})
