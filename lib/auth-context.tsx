'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { apiClient } from './api-client'

interface User {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'TESTER' | 'REVIEWER' | 'CONTRIBUTOR'
  isApproved: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string, role: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('authToken')) {
        const data = await apiClient.getMe()
        setUser(data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const data = await apiClient.signin({ email, password })
    setUser(data.user)
  }

  const signup = async (email: string, password: string, name: string, role: string) => {
    const data = await apiClient.signup({ email, password, name, role })
    setUser(data.user)
  }

  const logout = async () => {
    await apiClient.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const data = await apiClient.getMe()
      setUser(data.user)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
