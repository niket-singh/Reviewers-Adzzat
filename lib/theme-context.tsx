'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { ReactNode } from 'react'

/**
 * Enhanced Theme Provider with next-themes
 * Features:
 * - System-aware dark mode detection
 * - Persistent theme preference
 * - Smooth transitions without flash
 * - SSR-safe
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
      storageKey="reviewers-theme"
    >
      {children}
    </NextThemesProvider>
  )
}

// Re-export useTheme from next-themes for consistency
export { useTheme } from 'next-themes'
