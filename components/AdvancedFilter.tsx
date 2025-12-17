'use client'

import { useState } from 'react'

export interface FilterOptions {
  domains: string[]
  languages: string[]
  statuses: string[]
  dateRange?: {
    from: Date | null
    to: Date | null
  }
  sortBy: 'newest' | 'oldest' | 'title'
}

interface AdvancedFilterProps {
  availableDomains: string[]
  availableLanguages: string[]
  availableStatuses: string[]
  onFilterChange: (filters: FilterOptions) => void
  initialFilters?: Partial<FilterOptions>
}

export default function AdvancedFilter({
  availableDomains,
  availableLanguages,
  availableStatuses,
  onFilterChange,
  initialFilters,
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    domains: initialFilters?.domains || [],
    languages: initialFilters?.languages || [],
    statuses: initialFilters?.statuses || [],
    dateRange: initialFilters?.dateRange || { from: null, to: null },
    sortBy: initialFilters?.sortBy || 'newest',
  })

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleArrayFilter = (key: 'domains' | 'languages' | 'statuses', value: string) => {
    const currentArray = filters[key]
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value]
    handleFilterChange(key, newArray)
  }

  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      domains: [],
      languages: [],
      statuses: [],
      dateRange: { from: null, to: null },
      sortBy: 'newest',
    }
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
  }

  const activeFilterCount =
    filters.domains.length + filters.languages.length + filters.statuses.length +
    (filters.dateRange?.from || filters.dateRange?.to ? 1 : 0)

  return (
    <div className="relative">
      {}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 rounded-xl bg-gray-800/60 text-white font-bold flex items-center gap-2 hover:bg-gray-700/60 transition-all duration-300 hover:scale-105 shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className="bg-purple-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {}
      {isOpen && (
        <>
          {}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute top-full mt-2 right-0 z-50 w-96 max-w-[calc(100vw-2rem)] bg-gray-800/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl shadow-2xl p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white">Advanced Filters</h3>
              <button
                onClick={clearAllFilters}
                className="text-sm text-purple-400 hover:text-purple-300 font-semibold"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto smooth-scroll">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-gray-900/50 border border-gray-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>

              {/* Domains */}
              {availableDomains.length > 0 && (
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-300">Domains</label>
                  <div className="flex flex-wrap gap-2">
                    {availableDomains.map((domain) => (
                      <button
                        key={domain}
                        onClick={() => toggleArrayFilter('domains', domain)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          filters.domains.includes(domain)
                            ? 'bg-purple-600 text-white shadow-lg scale-105'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {domain}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {availableLanguages.length > 0 && (
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-300">Languages</label>
                  <div className="flex flex-wrap gap-2">
                    {availableLanguages.map((language) => (
                      <button
                        key={language}
                        onClick={() => toggleArrayFilter('languages', language)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          filters.languages.includes(language)
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Statuses */}
              {availableStatuses.length > 0 && (
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-300">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {availableStatuses.map((status) => (
                      <button
                        key={status}
                        onClick={() => toggleArrayFilter('statuses', status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          filters.statuses.includes(status)
                            ? 'bg-green-600 text-white shadow-lg scale-105'
                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-300">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateRange?.from?.toISOString().split('T')[0] || ''}
                      onChange={(e) =>
                        handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          from: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateRange?.to?.toISOString().split('T')[0] || ''}
                      onChange={(e) =>
                        handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          to: e.target.value ? new Date(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Apply Filters
            </button>
          </div>
        </>
      )}
    </div>
  )
}
