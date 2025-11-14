'use client'

import { useState } from 'react'
import Tooltip from './Tooltip'

interface CopyToClipboardProps {
  text: string
  children?: React.ReactNode
  className?: string
}

export default function CopyToClipboard({ text, children, className = '' }: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Tooltip text={copied ? 'Copied!' : 'Copy to clipboard'}>
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-2 transition-all ${
          copied ? 'copy-success' : ''
        } ${className}`}
      >
        {children || text}
        <svg
          className={`w-4 h-4 transition-colors ${
            copied ? 'text-green-400' : 'text-gray-400 hover:text-white'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {copied ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          )}
        </svg>
      </button>
    </Tooltip>
  )
}
