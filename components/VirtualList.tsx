'use client'

import { useRef, useState, useEffect, useCallback, ReactNode } from 'react'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
  className?: string
  emptyMessage?: string
  loading?: boolean
  onScrollEnd?: () => void
}


export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  emptyMessage = 'No items to display',
  loading = false,
  onScrollEnd,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  
  const totalHeight = items.length * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * itemHeight

  
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement
    setScrollTop(target.scrollTop)

    
    if (onScrollEnd) {
      const isBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < itemHeight * 2
      if (isBottom) {
        onScrollEnd()
      }
    }
  }, [itemHeight, onScrollEnd])

  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  
  if (items.length === 0 && !loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <div className="text-center p-8">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-lg font-semibold text-gray-400 dark:text-gray-500">
            {emptyMessage}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, relativeIndex) => {
            const absoluteIndex = startIndex + relativeIndex
            return (
              <div key={absoluteIndex} style={{ height: itemHeight }}>
                {renderItem(item, absoluteIndex)}
              </div>
            )
          })}
        </div>

        {/* Loading indicator at bottom */}
        {loading && (
          <div
            className="absolute bottom-0 left-0 right-0 flex justify-center p-4"
            style={{ transform: `translateY(${totalHeight}px)` }}
          >
            <div className="flex items-center gap-3 bg-gray-800/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 py-3 rounded-xl shadow-lg">
              <svg
                className="w-5 h-5 text-purple-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-semibold text-white">Loading more...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to calculate dynamic item heights
 * Useful when items have variable heights
 */
export function useVirtualList<T>(items: T[], estimatedItemHeight: number = 100) {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map())
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map())

  const measureItem = useCallback((index: number, element: HTMLElement | null) => {
    if (!element) {
      itemRefs.current.delete(index)
      return
    }

    itemRefs.current.set(index, element)
    const height = element.getBoundingClientRect().height

    setItemHeights(prev => {
      if (prev.get(index) === height) return prev
      const next = new Map(prev)
      next.set(index, height)
      return next
    })
  }, [])

  const getItemHeight = useCallback(
    (index: number) => itemHeights.get(index) || estimatedItemHeight,
    [itemHeights, estimatedItemHeight]
  )

  return { measureItem, getItemHeight }
}
