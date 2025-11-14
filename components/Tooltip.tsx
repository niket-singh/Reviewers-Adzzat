import React from 'react'

interface TooltipProps {
  children: React.ReactNode
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, text, position = 'top' }: TooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={`absolute ${positionClasses[position]} z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none`}
      >
        <div className="bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap shadow-xl border border-gray-700">
          {text}
          <div
            className={`absolute w-2 h-2 bg-gray-900 border-gray-700 rotate-45 ${
              position === 'top'
                ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r'
                : position === 'bottom'
                ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l'
                : position === 'left'
                ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-t'
                : 'left-[-4px] top-1/2 -translate-y-1/2 border-l border-b'
            }`}
          />
        </div>
      </div>
    </div>
  )
}
