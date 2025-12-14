'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from './auth-context'
import { useToast } from '@/components/ToastContainer'

interface WebSocketMessage {
  type: 'SUBMISSION_CREATED' | 'SUBMISSION_REVIEWED' | 'SUBMISSION_APPROVED' | 'TESTER_APPROVED' | 'NOTIFICATION'
  data: any
  timestamp: string
}

interface WebSocketContextType {
  isConnected: boolean
  lastMessage: WebSocketMessage | null
  subscribe: (eventType: string, callback: (data: any) => void) => () => void
  sendMessage: (message: any) => void
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  lastMessage: null,
  subscribe: () => () => {},
  sendMessage: () => {},
})

export function useWebSocket() {
  return useContext(WebSocketContext)
}

interface WebSocketProviderProps {
  children: React.ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const { user } = useAuth()
  const { showToast } = useToast()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!user || typeof window === 'undefined') return

    // Get WebSocket URL from environment or construct it
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws') + '/ws' ||
       'ws://localhost:8080/api/ws')

    try {
      const token = localStorage.getItem('authToken')
      const ws = new WebSocket(`${wsUrl}?token=${token}`)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0

        // Send initial connection message
        ws.send(JSON.stringify({
          type: 'CONNECT',
          userId: user.id,
          role: user.role,
        }))
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          setLastMessage(message)

          // Notify subscribers
          const subscribers = subscribersRef.current.get(message.type)
          if (subscribers) {
            subscribers.forEach((callback) => callback(message.data))
          }

          // Show toast notification for important events
          if (message.type === 'NOTIFICATION') {
            showToast(message.data.message, message.data.type || 'info')
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        } else {
          console.log('Max reconnection attempts reached')
          showToast('Lost connection to server. Please refresh the page.', 'error')
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Error creating WebSocket:', error)
    }
  }, [user, showToast])

  useEffect(() => {
    if (user) {
      connect()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [user, connect])

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!subscribersRef.current.has(eventType)) {
      subscribersRef.current.set(eventType, new Set())
    }
    subscribersRef.current.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const subscribers = subscribersRef.current.get(eventType)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          subscribersRef.current.delete(eventType)
        }
      }
    }
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        lastMessage,
        subscribe,
        sendMessage,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

// Custom hook for real-time submission updates
export function useRealtimeSubmissions(onUpdate: (data: any) => void) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribeCreated = subscribe('SUBMISSION_CREATED', onUpdate)
    const unsubscribeReviewed = subscribe('SUBMISSION_REVIEWED', onUpdate)
    const unsubscribeApproved = subscribe('SUBMISSION_APPROVED', onUpdate)

    return () => {
      unsubscribeCreated()
      unsubscribeReviewed()
      unsubscribeApproved()
    }
  }, [subscribe, onUpdate])
}

// Custom hook for notification events
export function useRealtimeNotifications(onNotification: (data: any) => void) {
  const { subscribe } = useWebSocket()

  useEffect(() => {
    const unsubscribe = subscribe('NOTIFICATION', onNotification)
    return unsubscribe
  }, [subscribe, onNotification])
}

// Connection status indicator component
export function WebSocketStatus() {
  const { isConnected } = useWebSocket()

  if (!isConnected) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-yellow-500/90 text-white rounded-xl shadow-lg animate-pulse">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-sm font-semibold">Reconnecting...</span>
      </div>
    )
  }

  return null
}
