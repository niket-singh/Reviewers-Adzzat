'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ToastContainer'
import Breadcrumb from '@/components/Breadcrumb'
import Pagination from '@/components/Pagination'

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const itemsPerPage = 20
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { showToast } = useToast()

  
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const setMockLogs = useCallback(() => {
    
    const actions = ['UPLOAD', 'REVIEW', 'APPROVE', 'DELETE', 'LOGIN', 'LOGOUT', 'UPDATE_PROFILE', 'CREATE_USER']
    const entityTypes = ['SUBMISSION', 'USER', 'REVIEW', 'PROFILE']
    const users = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown']

    const mockData: AuditLog[] = Array.from({ length: 85 }, (_, i) => {
      const action = actions[Math.floor(Math.random() * actions.length)]
      const timestamp = new Date()
      timestamp.setMinutes(timestamp.getMinutes() - i * 15)

      return {
        id: `log-${i}`,
        userId: `user-${Math.floor(Math.random() * 5)}`,
        userName: users[Math.floor(Math.random() * users.length)],
        action,
        entityType: entityTypes[Math.floor(Math.random() * entityTypes.length)],
        entityId: `entity-${Math.floor(Math.random() * 100)}`,
        metadata: {
          method: 'POST',
          path: `/api/${action.toLowerCase()}`,
        },
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: timestamp.toISOString(),
      }
    })

    setLogs(mockData)
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAuditLogs({ limit: 1000 })
      setLogs(response.logs || [])
    } catch (error: any) {
      console.error('Error fetching audit logs:', error)
      showToast('Failed to load audit logs', 'error')
      
      setMockLogs()
    } finally {
      setLoading(false)
    }
  }, [showToast, setMockLogs])

  
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchLogs()
    }
  }, [user, fetchLogs])

  
  useEffect(() => {
    let filtered = logs

    
    if (filterAction !== 'all') {
      filtered = filtered.filter((log) => log.action === filterAction)
    }

    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.userName.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          log.entityType.toLowerCase().includes(query) ||
          log.ipAddress.includes(query)
      )
    }

    setFilteredLogs(filtered)
    setCurrentPage(1) 
  }, [logs, filterAction, searchQuery])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      UPLOAD: 'text-blue-400 bg-blue-500/10',
      REVIEW: 'text-purple-400 bg-purple-500/10',
      APPROVE: 'text-green-400 bg-green-500/10',
      DELETE: 'text-red-400 bg-red-500/10',
      LOGIN: 'text-cyan-400 bg-cyan-500/10',
      LOGOUT: 'text-gray-400 bg-gray-500/10',
      UPDATE_PROFILE: 'text-yellow-400 bg-yellow-500/10',
      CREATE_USER: 'text-pink-400 bg-pink-500/10',
    }
    return colors[action] || 'text-gray-400 bg-gray-500/10'
  }

  const getActionIcon = (action: string) => {
    const icons: Record<string, React.ReactElement> = {
      UPLOAD: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      REVIEW: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      APPROVE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      DELETE: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      LOGIN: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
      LOGOUT: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
    }
    return icons[action] || (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-red-500"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-orange-500" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b shadow-lg bg-gray-800/40 border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse-glow bg-gradient-to-br from-red-600 via-orange-600 to-pink-600">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-orange-400 to-pink-400">
                  Audit Logs
                </h1>
                <p className="text-sm font-medium text-gray-400">Security & activity monitoring</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => router.push('/admin')}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg bg-gray-700/50 text-gray-200 hover:bg-gray-600/60"
              >
                Back to Admin
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 text-gray-300 hover:bg-gray-700/50"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 animate-slide-up">
              <button
                onClick={() => router.push('/admin')}
                className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-gray-200 font-semibold"
              >
                Back to Admin
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 rounded-xl bg-gray-700/50 text-gray-200 font-semibold"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 relative z-10">
        <Breadcrumb />

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative animate-slide-up">
            <svg className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by user, action, IP address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 transition-all duration-300 backdrop-blur-xl bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 focus:glow"
            />
          </div>

          {/* Action Filters */}
          <div className="flex flex-wrap gap-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => setFilterAction('all')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filterAction === 'all'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg scale-105'
                  : 'bg-gray-800/40 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              All ({logs.length})
            </button>
            {uniqueActions.map((action) => (
              <button
                key={action}
                onClick={() => setFilterAction(action)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                  filterAction === action
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg scale-105'
                    : 'bg-gray-800/40 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                {getActionIcon(action)}
                {action}
                <span className="opacity-60">({logs.filter((l) => l.action === action).length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audit Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white text-lg">Loading audit logs...</div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl shadow-xl backdrop-blur-2xl border-2 bg-gray-800/40 border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-wider">Action</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-wider">Entity</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-wider">IP Address</th>
                      <th className="px-6 py-4 text-left text-xs font-black text-gray-300 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {paginatedLogs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-gray-900/30 transition-colors" style={{ animationDelay: `${index * 0.03}s` }}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                          {log.userName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold ${getActionColor(log.action)}`}>
                            {getActionIcon(log.action)}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          <div>{log.entityType}</div>
                          {log.entityId && (
                            <div className="text-xs text-gray-500">ID: {log.entityId.substring(0, 8)}...</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">
                          {log.ipAddress}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.metadata && (
                            <button
                              onClick={() => {
                                showToast('Metadata: ' + JSON.stringify(log.metadata), 'info')
                              }}
                              className="text-blue-400 hover:text-blue-300 font-semibold"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredLogs.length}
              />
            )}

            {/* Empty State */}
            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-8xl mb-4">🔍</div>
                <p className="text-gray-400 text-lg">No audit logs found matching your filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
