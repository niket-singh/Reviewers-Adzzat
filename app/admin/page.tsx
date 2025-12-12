'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { DOMAINS, LANGUAGES } from '@/lib/constants/options'
import { useToast } from '@/components/ToastContainer'
import Breadcrumb from '@/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import CopyToClipboard from '@/components/CopyToClipboard'
import Tooltip from '@/components/Tooltip'

interface Submission {
  id: string
  title: string
  domain: string
  language: string
  fileName: string
  status: string
  createdAt: string
  contributor: {
    name: string
    email: string
  }
  claimedBy?: {
    name: string
  }
  reviews?: {
    id: string
    feedback: string
    accountPostedIn?: string
    reviewer: {
      name: string
    }
  }[]
}

interface User {
  id: string
  name: string
  email: string
  role: string
  isApproved: boolean
  isGreenLight: boolean
  createdAt: string
}

interface ActivityLog {
  id: string
  action: string
  description: string
  userName?: string
  userRole?: string
  createdAt: string
  metadata?: string
}

interface LeaderboardEntry {
  userId: string
  userName: string
  email: string
  eligibleCount: number
  approvedCount: number
  totalCount: number
}

interface Stats {
  contributors?: {
    userId: string
    name: string
    totalSubmissions: number
    eligibleCount: number
    approvedCount: number
    approvalRate: number
  }[]
  reviewers?: {
    userId: string
    name: string
    isGreenLight: boolean
    tasksInStack: number
    reviewedCount: number
    currentWorkload: number
  }[]
  overview: {
    totalUsers: number
    totalSubmissions: number
    pendingReviews: number
    activeReviewers: number
    inactiveReviewers: number
    queuedTasks: number
  }
}

type MainTab = 'submissions' | 'users' | 'stats' | 'logs' | 'leaderboard'
type SubmissionFilter = 'all' | 'pending' | 'claimed' | 'eligible' | 'approved'
type ProjectFilter = 'X' | 'V'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<MainTab>('submissions')
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('eligible')
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('X')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    language: '',
    customLanguage: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { showToast } = useToast()

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [user, authLoading, router])

  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'submissions') {
        const data = await apiClient.getSubmissions()
        setSubmissions(data || [])
      } else if (activeTab === 'users') {
        const data = await apiClient.getUsers()
        setUsers(data || [])
      } else if (activeTab === 'logs') {
        const data = await apiClient.getLogs(50)
        setLogs(data || [])
      } else if (activeTab === 'leaderboard') {
        const data = await apiClient.getLeaderboard()
        setLeaderboard(data || [])
      } else if (activeTab === 'stats') {
        const data = await apiClient.getStats()
        setStats(data || null)
      }
    } catch (err) {
      console.error('Error fetching data:', err)
    }
  }, [activeTab])

  const filterData = useCallback(() => {
    // Filter submissions
    let filteredSubs = submissions

    if (submissionFilter !== 'all') {
      filteredSubs = filteredSubs.filter(s => s.status.toLowerCase() === submissionFilter)
    }

    if (searchQuery.trim() && activeTab === 'submissions') {
      const query = searchQuery.toLowerCase()
      filteredSubs = filteredSubs.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.domain.toLowerCase().includes(query) ||
          s.language.toLowerCase().includes(query) ||
          s.contributor.name.toLowerCase().includes(query)
      )
    }

    setFilteredSubmissions(filteredSubs)

    // Filter users
    let filteredUsr = users

    if (searchQuery.trim() && activeTab === 'users') {
      const query = searchQuery.toLowerCase()
      filteredUsr = filteredUsr.filter(
        u =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filteredUsr)
  }, [submissions, submissionFilter, searchQuery, activeTab, users])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [activeTab, fetchData])

  useEffect(() => {
    filterData()
    setCurrentPage(1) // Reset to first page when filters change
  }, [filterData])

  const handleApproveReviewer = async (userId: string) => {
    try {
      await apiClient.approveReviewer(userId)
      fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve reviewer', 'error')
    }
  }

  const handleToggleGreenLight = async (userId: string, userName: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} green light for ${userName}?`)) {
      return
    }

    try {
      const response = await apiClient.toggleGreenLight(userId)
      if (response.queuedTasksAssigned > 0) {
        alert(`Green light ${currentStatus ? 'deactivated' : 'activated'}! ${response.queuedTasksAssigned} queued tasks were assigned.`)
      }
      fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to toggle green light', 'error')
    }
  }

  const handleSwitchRole = async (userId: string, currentRole: string) => {
    const roles = ['CONTRIBUTOR', 'REVIEWER', 'ADMIN']
    const roleOptions = roles.filter(r => r !== currentRole).join(', ')

    const newRole = prompt(`Switch role to (${roleOptions}):`)?.toUpperCase()

    if (!newRole || !roles.includes(newRole)) {
      return
    }

    if (!confirm(`Switch user's role to ${newRole}?`)) {
      return
    }

    try {
      await apiClient.switchUserRole(userId, newRole)
      fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to switch role', 'error')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone and will also delete all their submissions.`)) {
      return
    }

    try {
      await apiClient.deleteUser(userId)
      fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete user', 'error')
    }
  }

  const handleDeleteSubmission = async (submissionId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete submission "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteSubmission(submissionId)
      fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete submission', 'error')
    }
  }

  const handleApproveSubmission = async (submissionId: string) => {
    if (!confirm('Approve this submission?')) {
      return
    }

    try {
      await apiClient.approveSubmission(submissionId)
      fetchData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve submission', 'error')
    }
  }

  const handleDownload = async (submissionId: string, fileName: string) => {
    try {
      const { downloadUrl } = await apiClient.getDownloadURL(submissionId)

      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up blob URL to prevent memory leaks
        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100)

        showToast('Download started!', 'success')
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to download file', 'error')
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setUploadError('Please select a file')
      return
    }

    if (!formData.domain) {
      setUploadError('Please select a domain')
      return
    }

    if (!formData.language) {
      setUploadError('Please select a language')
      return
    }

    if (formData.language === 'Other' && !formData.customLanguage.trim()) {
      setUploadError('Please specify the language')
      return
    }

    setLoading(true)
    setUploadError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('domain', formData.domain)
      uploadFormData.append('language', formData.language === 'Other' ? formData.customLanguage : formData.language)

      await apiClient.uploadSubmission(uploadFormData)

      setShowUpload(false)
      setFormData({ title: '', domain: '', language: '', customLanguage: '' })
      setFile(null)
      fetchData()
      showToast('✨ Task uploaded successfully!', 'success')
    } catch (err: any) {
      setUploadError(err.response?.data?.error || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
      CLAIMED: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white',
      ELIGIBLE: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white glow',
      APPROVED: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white glow-green',
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getRoleColor = (role: string) => {
    const roleMap: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-800',
      REVIEWER: 'bg-purple-100 text-purple-800',
      CONTRIBUTOR: 'bg-blue-100 text-blue-800',
    }
    return roleMap[role] || 'bg-gray-100 text-gray-800'
  }

  const getTabCount = (tab: SubmissionFilter) => {
    if (tab === 'all') return submissions.length
    return submissions.filter(s => s.status.toLowerCase() === tab).length
  }

  // Pagination calculations for submissions
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 relative overflow-hidden">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-orange-600 to-pink-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                  Admin Control Panel
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Welcome, {user.name}!</p>
              </div>
            </div>

            {/* Project Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 font-medium">Project:</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value as ProjectFilter)}
                className="px-3 py-2 bg-gray-700/50 text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-semibold"
              >
                <option value="X">Project X</option>
                <option value="V">Project V</option>
              </select>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3 animate-slide-in-right">
              <button
                onClick={() => router.push('/profile')}
                className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-gray-600"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu Dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 pb-4 animate-slide-up">
              <button
                onClick={() => {
                  router.push('/profile')
                  setMobileMenuOpen(false)
                }}
                className="w-full px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 transition-all duration-300 font-semibold shadow-md border border-gray-600"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-semibold shadow-md"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Main Tabs */}
        <div className="flex gap-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-xl p-1.5 mb-8 overflow-x-auto border border-gray-700/50 animate-slide-up">
          {(['submissions', 'users', 'stats', 'logs', 'leaderboard'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg scale-105 glow'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {(activeTab === 'submissions' || activeTab === 'users') && (
          <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="relative">
              <input
                type="text"
                placeholder={`🔍 Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-red-500/20 focus:border-red-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium"
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <>
            {/* Upload Form */}
            {showUpload && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Upload New Task (as Admin)</h3>
                  <button
                    onClick={() => setShowUpload(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ✕ Cancel
                  </button>
                </div>
                <form onSubmit={handleUpload} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      placeholder="Enter a descriptive title for your task"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Domain *
                    </label>
                    <select
                      required
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Select a domain...</option>
                      {DOMAINS.map((domain) => (
                        <option key={domain} value={domain}>
                          {domain}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Language *
                    </label>
                    <select
                      required
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value, customLanguage: '' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Select a language...</option>
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.language === 'Other' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Specify Language *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customLanguage}
                        onChange={(e) => setFormData({ ...formData, customLanguage: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        placeholder="e.g., Ruby, Swift, Kotlin"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload ZIP File *
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-red-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500">
                            <span>Upload a file</span>
                            <input
                              type="file"
                              accept=".zip"
                              required
                              onChange={(e) => setFile(e.target.files?.[0] || null)}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">ZIP files only</p>
                        {file && (
                          <p className="text-sm text-green-600 font-medium mt-2">✓ {file.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {uploadError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Uploading...' : 'Upload Task'}
                  </button>
                </form>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
                {(['all', 'pending', 'claimed', 'eligible', 'approved'] as SubmissionFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSubmissionFilter(filter)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      submissionFilter === filter
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} ({getTabCount(filter)})
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg font-medium whitespace-nowrap ml-4"
              >
                {showUpload ? '✕ Cancel Upload' : '+ Upload Task'}
              </button>
            </div>

            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">
                    {searchQuery ? 'No submissions match your search.' : `No ${submissionFilter} submissions.`}
                  </p>
                </div>
              ) : (
                <>
                  {paginatedSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-white rounded-xl shadow-md p-4 md:p-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 break-words">{submission.title}</h3>
                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                          <span>ID:</span>
                          <CopyToClipboard text={submission.id}>
                            <span className="font-mono text-gray-600">{submission.id.slice(0, 8)}...</span>
                          </CopyToClipboard>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {submission.domain}
                          </span>
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                            {submission.language}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            by {submission.contributor.name}
                          </span>
                          {submission.claimedBy && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                              Reviewer: {submission.claimedBy.name}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Submitted: {new Date(submission.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusClass(submission.status)}`}>
                          {submission.status}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload(submission.id, submission.fileName)}
                            className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Download
                          </button>
                          {submission.status === 'ELIGIBLE' && (
                            <button
                              onClick={() => handleApproveSubmission(submission.id)}
                              className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSubmission(submission.id, submission.title)}
                            className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {submission.reviews && submission.reviews.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Reviews</h4>
                        {submission.reviews.map((review) => (
                          <div key={review.id} className="bg-gray-50 p-4 rounded-lg mb-2">
                            <p className="text-sm text-gray-800 mb-2">{review.feedback}</p>
                            {review.accountPostedIn && (
                              <p className="text-xs text-gray-600 mb-1">
                                <span className="font-semibold">Account Posted:</span> {review.accountPostedIn}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">by {review.reviewer.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                  {/* Pagination */}
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredSubmissions.length}
                  />
                </>
              )}
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Green Light</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'REVIEWER' ? (
                          user.isApproved ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                              Approved
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                              Pending
                            </span>
                          )
                        ) : (
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'REVIEWER' && user.isApproved ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${user.isGreenLight ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                            <span className={`text-xs font-semibold ${user.isGreenLight ? 'text-green-700' : 'text-gray-600'}`}>
                              {user.isGreenLight ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-2 justify-end">
                          {user.role === 'REVIEWER' && !user.isApproved && (
                            <button
                              onClick={() => handleApproveReviewer(user.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {user.role === 'REVIEWER' && user.isApproved && (
                            <button
                              onClick={() => handleToggleGreenLight(user.id, user.name, user.isGreenLight)}
                              className={`px-3 py-1 rounded transition-colors ${
                                user.isGreenLight
                                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                            >
                              {user.isGreenLight ? '🔴 Deactivate' : '🟢 Activate'}
                            </button>
                          )}
                          <button
                            onClick={() => handleSwitchRole(user.id, user.role)}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          >
                            Switch Role
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">👥</div>
                <p className="text-gray-500 text-lg">
                  {searchQuery ? 'No users match your search.' : 'No users found.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Users</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.overview.totalUsers}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Total Submissions</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.overview.totalSubmissions}</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Pending Reviews</h3>
                <p className="text-3xl font-bold text-gray-800">{stats.overview.pendingReviews}</p>
              </div>
            </div>

            {/* Green Light Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse"></div>
                  <h3 className="text-sm font-medium text-gray-600">Active Reviewers</h3>
                </div>
                <p className="text-3xl font-bold text-green-600">{stats.overview.activeReviewers}</p>
                <p className="text-xs text-gray-500 mt-1">Accepting new tasks</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-400">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                  <h3 className="text-sm font-medium text-gray-600">Inactive Reviewers</h3>
                </div>
                <p className="text-3xl font-bold text-gray-600">{stats.overview.inactiveReviewers}</p>
                <p className="text-xs text-gray-500 mt-1">Not accepting tasks</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Queued Tasks</h3>
                <p className="text-3xl font-bold text-orange-600">{stats.overview.queuedTasks}</p>
                <p className="text-xs text-gray-500 mt-1">Waiting for active reviewers</p>
              </div>
            </div>

            {/* Contributors Stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Contributor Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Name</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Total</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Eligible</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Approved</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Approval Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.contributors && stats.contributors.length > 0 ? (
                      stats.contributors.map((contributor) => (
                        <tr key={contributor.userId}>
                          <td className="px-4 py-3 text-sm text-gray-800">{contributor.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.totalSubmissions}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.eligibleCount}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.approvedCount}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.approvalRate.toFixed(1)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No contributors found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviewers Stats */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Reviewer Statistics</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Name</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-600">Status</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Tasks in Stack</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Reviewed</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Current Workload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.reviewers && stats.reviewers.length > 0 ? (
                      stats.reviewers.map((reviewer) => (
                        <tr key={reviewer.userId} className={reviewer.isGreenLight ? '' : 'bg-gray-50'}>
                          <td className="px-4 py-3 text-sm text-gray-800">{reviewer.name}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${reviewer.isGreenLight ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                              <span className={`text-xs font-semibold ${reviewer.isGreenLight ? 'text-green-700' : 'text-gray-600'}`}>
                                {reviewer.isGreenLight ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{reviewer.tasksInStack}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">{reviewer.reviewedCount}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              reviewer.currentWorkload > 10 ? 'bg-red-100 text-red-800' :
                              reviewer.currentWorkload > 5 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {reviewer.currentWorkload} active
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                          No reviewers found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Activity Logs (Recent 50)</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📜</div>
                  <p className="text-gray-500 text-lg">No activity logs yet.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {log.action}
                        </span>
                        {log.userName && (
                          <span className="text-sm text-gray-600">
                            by <span className="font-medium">{log.userName}</span>
                            {log.userRole && ` (${log.userRole})`}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800">{log.description}</p>
                    {log.metadata && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          View metadata
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Top Contributors</h2>
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">🏆</div>
                  <p className="text-gray-500 text-lg">No leaderboard data yet.</p>
                </div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      index === 0 ? 'bg-yellow-50 border-2 border-yellow-300' :
                      index === 1 ? 'bg-gray-50 border-2 border-gray-300' :
                      index === 2 ? 'bg-orange-50 border-2 border-orange-300' :
                      'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-600' :
                        index === 1 ? 'text-gray-600' :
                        index === 2 ? 'text-orange-600' :
                        'text-gray-400'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{entry.userName}</p>
                        <p className="text-sm text-gray-600">{entry.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-gray-800">{entry.totalCount}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-blue-600">{entry.eligibleCount}</div>
                        <div className="text-xs text-gray-500">Eligible</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">{entry.approvedCount}</div>
                        <div className="text-xs text-gray-500">Approved</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
