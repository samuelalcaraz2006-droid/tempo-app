// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMissionFilters } from '../hooks/worker/useMissionFilters'

// ── Fixtures ────────────────────────────────────────────────────────────────

const now = new Date()

function makeDate(offsetDays) {
  const d = new Date(now)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString()
}

const MISSIONS = [
  {
    id: '1', title: 'Dev React', description: 'Frontend job', sector: 'tech',
    hourly_rate: 60, total_hours: 40, urgency: 'high',
    start_date: makeDate(2), matchScore: 90,
    companies: { name: 'Acme Corp' }, city: 'Paris',
    required_skills: ['react', 'javascript'],
  },
  {
    id: '2', title: 'Chef de chantier', description: 'Construction', sector: 'btp',
    hourly_rate: 35, total_hours: 80, urgency: 'normal',
    start_date: makeDate(45), matchScore: 70,
    companies: { name: 'BTP Solutions' }, city: 'Lyon',
    required_skills: ['management'],
  },
  {
    id: '3', title: 'Infirmière', description: 'Soins hospitaliers', sector: 'sante',
    hourly_rate: 28, total_hours: 120, urgency: 'high',
    start_date: makeDate(10), matchScore: 55,
    companies: { name: 'Clinique du Nord' }, city: 'Lille',
    required_skills: ['nursing'],
  },
  {
    id: '4', title: 'Livreur', description: 'Livraison express', sector: 'logistique',
    hourly_rate: 15, total_hours: 20, urgency: 'normal',
    start_date: makeDate(5), matchScore: 40,
    companies: { name: 'FastDeliv' }, city: 'Marseille',
    required_skills: ['permis-b'],
  },
]

describe('useMissionFilters', () => {
  // ── Sector filter ──────────────────────────────────────────────────────────

  it('filterSecteur=tous returns all missions', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    expect(result.current.filteredMissions).toHaveLength(4)
  })

  it('filterSecteur filters by exact sector', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterSecteur('tech'))
    expect(result.current.filteredMissions).toHaveLength(1)
    expect(result.current.filteredMissions[0].id).toBe('1')
  })

  it('filterSecteur with no matching sector returns empty array', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterSecteur('agriculture'))
    expect(result.current.filteredMissions).toHaveLength(0)
  })

  // ── Search query ───────────────────────────────────────────────────────────

  it('searchQuery matches title (case-insensitive)', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSearchQuery('react'))
    expect(result.current.filteredMissions).toHaveLength(1)
    expect(result.current.filteredMissions[0].id).toBe('1')
  })

  it('searchQuery matches city', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSearchQuery('Lyon'))
    expect(result.current.filteredMissions).toHaveLength(1)
    expect(result.current.filteredMissions[0].id).toBe('2')
  })

  it('searchQuery matches required_skills', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSearchQuery('nursing'))
    expect(result.current.filteredMissions).toHaveLength(1)
    expect(result.current.filteredMissions[0].id).toBe('3')
  })

  it('searchQuery matches company name', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSearchQuery('Acme'))
    expect(result.current.filteredMissions).toHaveLength(1)
    expect(result.current.filteredMissions[0].id).toBe('1')
  })

  it('searchQuery with whitespace-only string returns all', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSearchQuery('   '))
    expect(result.current.filteredMissions).toHaveLength(4)
  })

  // ── Rate filter ────────────────────────────────────────────────────────────

  it('filterRateMin excludes missions below threshold', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterRateMin('30'))
    // 60, 35 pass; 28 and 15 don't
    expect(result.current.filteredMissions).toHaveLength(2)
    expect(result.current.filteredMissions.map(m => m.id)).toEqual(expect.arrayContaining(['1', '2']))
  })

  it('filterRateMax excludes missions above threshold', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterRateMax('30'))
    // 28 and 15 pass
    expect(result.current.filteredMissions).toHaveLength(2)
    expect(result.current.filteredMissions.map(m => m.id)).toEqual(expect.arrayContaining(['3', '4']))
  })

  it('filterRateMin + filterRateMax combined range', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => {
      result.current.setFilterRateMin('25')
      result.current.setFilterRateMax('40')
    })
    // 35 and 28 pass
    expect(result.current.filteredMissions).toHaveLength(2)
  })

  // ── Duration filter ────────────────────────────────────────────────────────

  it('filterDurationMin filters by total_hours', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterDurationMin('50'))
    // 80 and 120 pass
    expect(result.current.filteredMissions).toHaveLength(2)
    expect(result.current.filteredMissions.map(m => m.id)).toEqual(expect.arrayContaining(['2', '3']))
  })

  it('filterDurationMax filters by total_hours', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterDurationMax('30'))
    // only 20 passes
    expect(result.current.filteredMissions).toHaveLength(1)
    expect(result.current.filteredMissions[0].id).toBe('4')
  })

  // ── Urgency filter ─────────────────────────────────────────────────────────

  it('filterUrgency=high returns only urgent missions', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterUrgency('high'))
    expect(result.current.filteredMissions).toHaveLength(2)
    expect(result.current.filteredMissions.map(m => m.urgency)).toEqual(['high', 'high'])
  })

  it('filterUrgency=normal returns only normal missions', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterUrgency('normal'))
    expect(result.current.filteredMissions).toHaveLength(2)
    expect(result.current.filteredMissions.map(m => m.urgency)).toEqual(['normal', 'normal'])
  })

  // ── Period filter ──────────────────────────────────────────────────────────

  it('filterPeriod=3mois keeps missions starting within 3 months', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setFilterPeriod('3mois'))
    // makeDate(2), makeDate(10), makeDate(5) are within 3 months; makeDate(45) also is
    const ids = result.current.filteredMissions.map(m => m.id)
    expect(ids).toContain('1')
  })

  it('filterPeriod mission with no start_date is excluded', () => {
    const noDate = [{ ...MISSIONS[0], start_date: null }]
    const { result } = renderHook(() => useMissionFilters(noDate))
    act(() => result.current.setFilterPeriod('3mois'))
    expect(result.current.filteredMissions).toHaveLength(0)
  })

  // ── Sorting ────────────────────────────────────────────────────────────────

  it('sortBy=match sorts by matchScore descending', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    // Default is 'match'
    const scores = result.current.filteredMissions.map(m => m.matchScore)
    expect(scores).toEqual([90, 70, 55, 40])
  })

  it('sortBy=rate-desc sorts by hourly_rate descending', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSortBy('rate-desc'))
    const rates = result.current.filteredMissions.map(m => m.hourly_rate)
    expect(rates).toEqual([60, 35, 28, 15])
  })

  it('sortBy=rate-asc sorts by hourly_rate ascending', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSortBy('rate-asc'))
    const rates = result.current.filteredMissions.map(m => m.hourly_rate)
    expect(rates).toEqual([15, 28, 35, 60])
  })

  it('sortBy=duration sorts by total_hours descending', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSortBy('duration'))
    const hours = result.current.filteredMissions.map(m => m.total_hours)
    expect(hours).toEqual([120, 80, 40, 20])
  })

  it('sortBy=net sorts by hourly_rate * total_hours descending', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSortBy('net'))
    // 60*40=2400, 35*80=2800, 28*120=3360, 15*20=300 → 3360, 2800, 2400, 300
    const ids = result.current.filteredMissions.map(m => m.id)
    expect(ids).toEqual(['3', '2', '1', '4'])
  })

  it('sortBy=date sorts by start_date ascending', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => result.current.setSortBy('date'))
    const ids = result.current.filteredMissions.map(m => m.id)
    // makeDate(2)=id1, makeDate(5)=id4, makeDate(10)=id3, makeDate(45)=id2
    expect(ids).toEqual(['1', '4', '3', '2'])
  })

  // ── Active filter count ────────────────────────────────────────────────────

  it('activeFilterCount is 0 when no filters active', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    expect(result.current.activeFilterCount).toBe(0)
  })

  it('activeFilterCount increments with each active filter', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => {
      result.current.setFilterRateMin('20')
      result.current.setFilterRateMax('60')
      result.current.setFilterUrgency('high')
      result.current.setFilterPeriod('3mois')
    })
    // rateMin, rateMax, urgency!==tous, period!==tous → 4
    expect(result.current.activeFilterCount).toBe(4)
  })

  // ── Reset filters ──────────────────────────────────────────────────────────

  it('resetFilters clears all advanced filters', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => {
      result.current.setFilterRateMin('10')
      result.current.setFilterRateMax('50')
      result.current.setFilterDurationMin('10')
      result.current.setFilterDurationMax('100')
      result.current.setFilterUrgency('high')
      result.current.setFilterPeriod('mois')
    })
    expect(result.current.activeFilterCount).toBeGreaterThan(0)

    act(() => result.current.resetFilters())

    expect(result.current.filterRateMin).toBe('')
    expect(result.current.filterRateMax).toBe('')
    expect(result.current.filterDurationMin).toBe('')
    expect(result.current.filterDurationMax).toBe('')
    expect(result.current.filterUrgency).toBe('tous')
    expect(result.current.filterPeriod).toBe('tous')
    expect(result.current.activeFilterCount).toBe(0)
  })

  // ── Empty results ──────────────────────────────────────────────────────────

  it('returns empty array when all filters combined match nothing', () => {
    const { result } = renderHook(() => useMissionFilters(MISSIONS))
    act(() => {
      result.current.setFilterSecteur('tech')
      result.current.setFilterRateMax('10') // no tech mission ≤ 10
    })
    expect(result.current.filteredMissions).toHaveLength(0)
  })

  it('handles empty missions array gracefully', () => {
    const { result } = renderHook(() => useMissionFilters([]))
    expect(result.current.filteredMissions).toHaveLength(0)
    expect(result.current.activeFilterCount).toBe(0)
  })
})
