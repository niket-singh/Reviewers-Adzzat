'use client'

import { AuthProvider } from '@/lib/auth-context'
import { ThemeProvider } from '@/lib/theme-context'
import { ToastProvider } from '@/components/ToastContainer'
import { WebSocketProvider } from '@/lib/websocket-context'
import { QueryProvider } from '@/providers/QueryProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  )
}
