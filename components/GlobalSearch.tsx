'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  id: string
  type: 'submission' | 'user' | 'review'
  title: string
  subtitle: string
  url: string
}

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}


function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export const GlobalSearch = ({ isOpen, onClose }: GlobalSearchProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  
  const debouncedQuery = useDebounce(query, 300)

  
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)

    
    setTimeout(() => {
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'submission',
          title: `Code Review: ${debouncedQuery}`,
          subtitle: 'Submitted by John Doe',
          url: '/contributor',
        },
        {
          id: '2',
          type: 'user',
          title: `User: ${debouncedQuery}`,
          subtitle: 'Reviewer',
          url: '/admin',
        },
      ]
      setResults(mockResults.slice(0, 5))
      setLoading(false)
    }, 200)
  }, [debouncedQuery])

  
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        router.push(results[selectedIndex].url)
        onClose()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [results, selectedIndex, router, onClose]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Search Dialog */}
      <div className="relative w-full max-w-2xl rounded-3xl shadow-2xl backdrop-blur-2xl border-2 bg-gray-800/90 border-gray-700/50 overflow-hidden animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-4 p-5 border-b border-gray-700/50">
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search submissions, users, reviews..."
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder-gray-400"
          />
          {loading && (
            <div className="w-5 h-5 border-2 border-gray-600 border-t-red-500 rounded-full animate-spin" />
          )}
          <kbd className="px-2.5 py-1 text-xs font-semibold text-gray-400 bg-gray-700/50 border border-gray-600/50 rounded-lg">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query && !loading && results.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="font-medium">No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={result.id}
              onClick={() => {
                router.push(result.url)
                onClose()
              }}
              className={`w-full text-left p-4 flex items-center gap-4 transition-colors ${
                index === selectedIndex
                  ? 'bg-gradient-to-r from-red-600/20 to-orange-600/20'
                  : 'hover:bg-gray-700/30'
              }`}
            >
              {/* Icon based on type */}
              <div className="w-10 h-10 rounded-xl bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                {result.type === 'submission' && (
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                )}
                {result.type === 'user' && (
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                )}
                {result.type === 'review' && (
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{result.title}</div>
                <div className="text-sm text-gray-400 truncate">{result.subtitle}</div>
              </div>

              {index === selectedIndex && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                  Enter
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 bg-gray-700/50 border border-gray-600/50 rounded">
                  ↵
                </kbd>
                Select
              </span>
            </div>
            <span>{results.length} results</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook to control search modal
export const useGlobalSearch = () => {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }
}
