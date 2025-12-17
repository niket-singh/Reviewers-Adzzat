'use client'

import { useState } from 'react'

interface BulkActionsProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  actions: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    variant?: 'primary' | 'danger' | 'success'
    disabled?: boolean
  }[]
}

export default function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  actions,
}: BulkActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (selectedCount === 0) return null

  const getVariantClasses = (variant: 'primary' | 'danger' | 'success' = 'primary') => {
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white',
    }
    return variants[variant]
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-gray-800/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-2xl shadow-2xl px-6 py-4">
        <div className="flex items-center gap-6">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">
              {selectedCount}
            </div>
            <div className="text-sm">
              <p className="font-bold text-white">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </p>
              <button
                onClick={selectedCount === totalCount ? onDeselectAll : onSelectAll}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                {selectedCount === totalCount ? 'Deselect all' : `Select all ${totalCount}`}
              </button>
            </div>
          </div>

          <div className="h-10 w-px bg-gray-700" />

          <div className="hidden md:flex items-center gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${getVariantClasses(
                  action.variant
                )}`}
              >
                {action.icon}
                <span className="hidden lg:inline">{action.label}</span>
              </button>
            ))}
          </div>

          <div className="md:hidden relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-all"
            >
              Actions
              <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="absolute bottom-full mb-2 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-2 min-w-[200px] z-50">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick()
                        setIsOpen(false)
                      }}
                      disabled={action.disabled}
                      className={`w-full px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        action.variant === 'danger'
                          ? 'hover:bg-red-600/20 text-red-400'
                          : action.variant === 'success'
                          ? 'hover:bg-green-600/20 text-green-400'
                          : 'hover:bg-blue-600/20 text-blue-400'
                      }`}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onDeselectAll}
            className="w-8 h-8 rounded-lg hover:bg-gray-700/50 flex items-center justify-center transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
