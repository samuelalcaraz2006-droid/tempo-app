import { useState, useMemo } from 'react'

export function useMissionFilters(missions) {
  const [filterSecteur, setFilterSecteur] = useState('tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('match')
  const [showFilters, setShowFilters] = useState(false)
  const [filterRateMin, setFilterRateMin] = useState('')
  const [filterRateMax, setFilterRateMax] = useState('')
  const [filterDurationMin, setFilterDurationMin] = useState('')
  const [filterDurationMax, setFilterDurationMax] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('tous')
  const [filterPeriod, setFilterPeriod] = useState('tous')

  const filteredMissions = useMemo(() => {
    let result = [...missions]
    if (filterSecteur !== 'tous') result = result.filter(m => m.sector === filterSecteur)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m =>
        (m.title || '').toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q) ||
        (m.companies?.name || '').toLowerCase().includes(q) ||
        (m.city || '').toLowerCase().includes(q) ||
        (m.required_skills || []).some(s => s.toLowerCase().includes(q))
      )
    }
    if (filterRateMin) result = result.filter(m => m.hourly_rate >= parseFloat(filterRateMin))
    if (filterRateMax) result = result.filter(m => m.hourly_rate <= parseFloat(filterRateMax))
    if (filterDurationMin) result = result.filter(m => (m.total_hours || 0) >= parseFloat(filterDurationMin))
    if (filterDurationMax) result = result.filter(m => (m.total_hours || 0) <= parseFloat(filterDurationMax))
    if (filterUrgency !== 'tous') result = result.filter(m => m.urgency === filterUrgency)
    if (filterPeriod !== 'tous') {
      const now = new Date()
      const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay() + 1); startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      result = result.filter(m => {
        if (!m.start_date) return false
        const d = new Date(m.start_date)
        if (filterPeriod === 'semaine') return d >= startOfWeek && d < endOfWeek
        if (filterPeriod === 'mois') return d >= startOfMonth && d <= endOfMonth
        if (filterPeriod === '3mois') { const end3 = new Date(now); end3.setMonth(end3.getMonth() + 3); return d >= now && d <= end3 }
        return true
      })
    }
    if (sortBy === 'match') result.sort((a, b) => b.matchScore - a.matchScore)
    else if (sortBy === 'date') result.sort((a, b) => new Date(a.start_date || 0) - new Date(b.start_date || 0))
    else if (sortBy === 'rate-desc') result.sort((a, b) => (b.hourly_rate || 0) - (a.hourly_rate || 0))
    else if (sortBy === 'rate-asc') result.sort((a, b) => (a.hourly_rate || 0) - (b.hourly_rate || 0))
    else if (sortBy === 'duration') result.sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0))
    else if (sortBy === 'net') result.sort((a, b) => ((b.hourly_rate || 0) * (b.total_hours || 0)) - ((a.hourly_rate || 0) * (a.total_hours || 0)))
    return result
  }, [missions, filterSecteur, searchQuery, sortBy, filterRateMin, filterRateMax, filterDurationMin, filterDurationMax, filterUrgency, filterPeriod])

  const activeFilterCount = [filterRateMin, filterRateMax, filterDurationMin, filterDurationMax, filterUrgency !== 'tous', filterPeriod !== 'tous'].filter(Boolean).length

  const resetFilters = () => {
    setFilterRateMin('')
    setFilterRateMax('')
    setFilterDurationMin('')
    setFilterDurationMax('')
    setFilterUrgency('tous')
    setFilterPeriod('tous')
  }

  return {
    filterSecteur, setFilterSecteur,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    showFilters, setShowFilters,
    filterRateMin, setFilterRateMin,
    filterRateMax, setFilterRateMax,
    filterDurationMin, setFilterDurationMin,
    filterDurationMax, setFilterDurationMax,
    filterUrgency, setFilterUrgency,
    filterPeriod, setFilterPeriod,
    filteredMissions,
    activeFilterCount,
    resetFilters,
  }
}
