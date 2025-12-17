'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ToastContainer'
import Breadcrumb from '@/components/Breadcrumb'

interface AnalyticsData {
  totalSubmissions: number
  totalUsers: number
  submissionsThisWeek: number
  submissionsThisMonth: number
  avgReviewTime: number 
  approvalRate: number 
  topContributors: Array<{
    userId: string
    name: string
    submissionCount: number
  }>
  domainBreakdown: Array<{
    domain: string
    count: number
  }>
  languageBreakdown: Array<{
    language: string
    count: number
  }>
}

interface ChartDataPoint {
  date: string
  total: number
  approved: number
  rejected: number
  pending: number
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { showToast } = useToast()

  
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const setMockData = useCallback(() => {
    
    const mockAnalytics: AnalyticsData = {
      totalSubmissions: 247,
      totalUsers: 89,
      submissionsThisWeek: 32,
      submissionsThisMonth: 124,
      avgReviewTime: 4.5,
      approvalRate: 78.3,
      topContributors: [
        { userId: '1', name: 'John Doe', submissionCount: 45 },
        { userId: '2', name: 'Jane Smith', submissionCount: 38 },
        { userId: '3', name: 'Bob Johnson', submissionCount: 29 },
        { userId: '4', name: 'Alice Williams', submissionCount: 24 },
        { userId: '5', name: 'Charlie Brown', submissionCount: 19 },
      ],
      domainBreakdown: [
        { domain: 'Technology', count: 98 },
        { domain: 'Design', count: 75 },
        { domain: 'Marketing', count: 42 },
        { domain: 'Business', count: 32 },
      ],
      languageBreakdown: [
        { language: 'JavaScript', count: 85 },
        { language: 'Python', count: 67 },
        { language: 'TypeScript', count: 52 },
        { language: 'Java', count: 43 },
      ],
    }

    const mockChart: ChartDataPoint[] = Array.from({ length: parseInt(timeRange) }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        total: Math.floor(Math.random() * 15) + 5,
        approved: Math.floor(Math.random() * 10) + 3,
        rejected: Math.floor(Math.random() * 3),
        pending: Math.floor(Math.random() * 5),
      }
    }).reverse()

    setAnalytics(mockAnalytics)
    setChartData(mockChart)
  }, [timeRange])

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      
      const [analyticsData, chartDataResponse] = await Promise.all([
        apiClient.getAnalytics(),
        apiClient.getAnalyticsChartData(timeRange),
      ])

      setAnalytics(analyticsData)
      setChartData(chartDataResponse.data || [])
    } catch (error: any) {
      console.error('Error fetching analytics:', error)
      showToast('Failed to load analytics', 'error')
      
      setMockData()
    } finally {
      setLoading(false)
    }
  }, [timeRange, showToast, setMockData])

  
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchAnalytics()
    }
  }, [user, fetchAnalytics])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  const StatCard = ({ title, value, change, icon, color }: any) => (
    <div className={`rounded-3xl shadow-xl p-6 backdrop-blur-2xl border-2 hover-lift animate-slide-up bg-gray-800/40 border-gray-700/50`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-2">{title}</p>
          <h3 className={`text-4xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
            {value}
          </h3>
          {change && (
            <p className={`text-sm font-bold mt-2 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change > 0 ? '↑' : '↓'} {Math.abs(change)}% from last month
            </p>
          )}
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-red-900 to-orange-900">
      {/* Animated Background */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-orange-400 to-pink-400">
                  Analytics Dashboard
                </h1>
                <p className="text-sm font-medium text-gray-400">Platform insights & metrics</p>
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white text-lg">Loading analytics...</div>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Submissions"
                value={analytics.totalSubmissions}
                change={12}
                color="from-blue-500 to-cyan-500"
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatCard
                title="Total Users"
                value={analytics.totalUsers}
                change={8}
                color="from-purple-500 to-pink-500"
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              <StatCard
                title="Approval Rate"
                value={`${analytics.approvalRate}%`}
                change={3}
                color="from-green-500 to-emerald-500"
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                title="Avg Review Time"
                value={`${analytics.avgReviewTime}h`}
                change={-5}
                color="from-orange-500 to-red-500"
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Submission Trends */}
            <div className="rounded-3xl shadow-xl p-6 backdrop-blur-2xl border-2 bg-gray-800/40 border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white">Submission Trends</h2>
                <div className="flex gap-2">
                  {(['7d', '30d', '90d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        timeRange === range
                          ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                      }`}
                    >
                      {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple Bar Chart */}
              <div className="h-64 flex items-end gap-2 overflow-x-auto pb-4">
                {chartData.map((point, index) => {
                  const maxValue = Math.max(...chartData.map((d) => d.total))
                  const height = (point.total / maxValue) * 100

                  return (
                    <div key={index} className="flex flex-col items-center gap-2 min-w-[40px]">
                      <div className="flex-1 flex items-end">
                        <div
                          className="w-full bg-gradient-to-t from-red-600 to-orange-500 rounded-t-lg hover:from-red-500 hover:to-orange-400 transition-all relative group cursor-pointer"
                          style={{ height: `${height}%` }}
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block">
                            <div className="bg-gray-900 text-white text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                              <div>Total: {point.total}</div>
                              <div className="text-green-400">Approved: {point.approved}</div>
                              <div className="text-red-400">Rejected: {point.rejected}</div>
                              <div className="text-yellow-400">Pending: {point.pending}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-semibold transform -rotate-45 origin-top-left">
                        {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Contributors & Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Contributors */}
              <div className="rounded-3xl shadow-xl p-6 backdrop-blur-2xl border-2 bg-gray-800/40 border-gray-700/50">
                <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Top Contributors
                </h3>
                <div className="space-y-3">
                  {analytics.topContributors.map((contributor, index) => (
                    <div
                      key={contributor.userId}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 hover:bg-gray-900/70 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          #{index + 1}
                        </span>
                        <span className="text-white font-semibold">{contributor.name}</span>
                      </div>
                      <span className="text-purple-400 font-bold">{contributor.submissionCount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Domain Breakdown */}
              <div className="rounded-3xl shadow-xl p-6 backdrop-blur-2xl border-2 bg-gray-800/40 border-gray-700/50">
                <h3 className="text-xl font-black text-white mb-4">Domain Breakdown</h3>
                <div className="space-y-3">
                  {analytics.domainBreakdown.map((domain) => {
                    const percentage = (domain.count / analytics.totalSubmissions) * 100
                    return (
                      <div key={domain.domain}>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 font-semibold text-sm">{domain.domain}</span>
                          <span className="text-gray-400 font-bold text-sm">{domain.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Language Breakdown */}
              <div className="rounded-3xl shadow-xl p-6 backdrop-blur-2xl border-2 bg-gray-800/40 border-gray-700/50">
                <h3 className="text-xl font-black text-white mb-4">Language Breakdown</h3>
                <div className="space-y-3">
                  {analytics.languageBreakdown.map((language) => {
                    const percentage = (language.count / analytics.totalSubmissions) * 100
                    return (
                      <div key={language.language}>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-300 font-semibold text-sm">{language.language}</span>
                          <span className="text-gray-400 font-bold text-sm">{language.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-3xl shadow-xl p-6 backdrop-blur-2xl border-2 bg-gray-800/40 border-gray-700/50">
              <h3 className="text-xl font-black text-white mb-4">This Month</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="text-blue-400 font-bold text-sm mb-1">This Week</div>
                  <div className="text-white font-black text-3xl">{analytics.submissionsThisWeek}</div>
                  <div className="text-gray-400 text-xs">submissions</div>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="text-purple-400 font-bold text-sm mb-1">This Month</div>
                  <div className="text-white font-black text-3xl">{analytics.submissionsThisMonth}</div>
                  <div className="text-gray-400 text-xs">submissions</div>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="text-green-400 font-bold text-sm mb-1">Approval Rate</div>
                  <div className="text-white font-black text-3xl">{analytics.approvalRate}%</div>
                  <div className="text-gray-400 text-xs">of submissions</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-gray-400">No analytics data available</div>
          </div>
        )}
      </div>
    </div>
  )
}
