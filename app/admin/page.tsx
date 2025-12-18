'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { DOMAINS, LANGUAGES } from '@/lib/constants/options'
import { useToast } from '@/components/ToastContainer'
import Breadcrumb from '@/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import CopyToClipboard from '@/components/CopyToClipboard'
import { BarChart, DonutChart, StatCard } from '@/components/StatCharts'

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
    tester: {
      name: string
    }
  }[]
}

interface ProjectVSubmission {
  id: string
  title: string
  language: string
  category: string
  difficulty: string
  description: string
  status: string
  createdAt: string
  contributor?: { id: string; name: string; email: string }
  tester?: { id: string; name: string; email: string }
  reviewer?: { id: string; name: string; email: string }
  reviewerFeedback?: string
  testerFeedback?: string
  accountPostedIn?: string
  taskLink?: string
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

interface Review {
  id: string
  feedback: string
  accountPostedIn?: string
  createdAt: string
  tester: {
    id: string
    name: string
    email: string
  }
  submission: {
    id: string
    title: string
    domain: string
    status: string
    contributor: {
      id: string
      name: string
      email: string
    }
  }
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

type MainSection = 'overview' | 'projectx' | 'projectv' | 'users' | 'logs' | 'leaderboard' | 'feedback'
type SubmissionFilter = 'all' | 'pending' | 'claimed' | 'eligible' | 'approved'

export default function UnifiedAdminDashboard() {
  const [activeSection, setActiveSection] = useState<MainSection>('overview')
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('eligible')

  const [projectXSubmissions, setProjectXSubmissions] = useState<Submission[]>([])
  const [projectVSubmissions, setProjectVSubmissions] = useState<ProjectVSubmission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([])

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [user, authLoading, router])

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true)

      const [
        projectXData,
        projectVData,
        usersData,
        statsData,
        logsData,
        leaderboardData,
        reviewsData
      ] = await Promise.all([
        apiClient.getSubmissions(),
        apiClient.getAllProjectVSubmissions({ limit: 500 }),
        apiClient.getUsers(),
        apiClient.getStats(),
        apiClient.getLogs(100),
        apiClient.getLeaderboard(),
        apiClient.getAllReviews({ limit: 500 })
      ])

      setProjectXSubmissions(projectXData || [])
      setProjectVSubmissions(projectVData.submissions || [])
      setUsers(usersData || [])
      setStats(statsData || null)
      setLogs(logsData || [])
      setLeaderboard(leaderboardData || [])
      setReviews(reviewsData.reviews || [])
    } catch (err) {
      console.error('Error fetching admin data:', err)
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const filterData = useCallback(() => {
    let filteredSubs = projectXSubmissions

    if (submissionFilter !== 'all') {
      filteredSubs = filteredSubs.filter(s => s.status.toLowerCase() === submissionFilter)
    }

    if (searchQuery.trim() && activeSection === 'projectx') {
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

    let filteredUsr = users

    if (searchQuery.trim() && activeSection === 'users') {
      const query = searchQuery.toLowerCase()
      filteredUsr = filteredUsr.filter(
        u =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query)
      )
    }

    setFilteredUsers(filteredUsr)

    let filteredRevs = reviews

    if (searchQuery.trim() && activeSection === 'feedback') {
      const query = searchQuery.toLowerCase()
      filteredRevs = filteredRevs.filter(
        r =>
          r.feedback.toLowerCase().includes(query) ||
          r.tester.name.toLowerCase().includes(query) ||
          r.tester.email.toLowerCase().includes(query) ||
          r.submission.title.toLowerCase().includes(query) ||
          r.submission.contributor.name.toLowerCase().includes(query)
      )
    }

    setFilteredReviews(filteredRevs)
  }, [projectXSubmissions, submissionFilter, searchQuery, activeSection, users, reviews])

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAllData()
    }
  }, [user, fetchAllData])

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && user.role === 'ADMIN') {
        fetchAllData()
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [user, fetchAllData])

  useEffect(() => {
    filterData()
    setCurrentPage(1)
  }, [filterData])

  const handleApproveReviewer = async (userId: string) => {
    try {
      await apiClient.approveTester(userId)
      fetchAllData()
      showToast('User approved successfully', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to approve user', 'error')
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
        showToast(`Green light ${currentStatus ? 'deactivated' : 'activated'}! ${response.queuedTasksAssigned} queued tasks assigned.`, 'success')
      } else {
        showToast(`Green light ${currentStatus ? 'deactivated' : 'activated'} successfully!`, 'success')
      }
      fetchAllData()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to toggle green light', 'error')
    }
  }

  const handleSwitchRole = async (userId: string, currentRole: string) => {
    const roles = ['CONTRIBUTOR', 'TESTER', 'ADMIN']
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
      fetchAllData()
      showToast('Role switched successfully', 'success')
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
      fetchAllData()
      showToast('User deleted successfully', 'success')
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
      fetchAllData()
      showToast('Submission deleted successfully', 'success')
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
      fetchAllData()
      showToast('Submission approved successfully', 'success')
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
      fetchAllData()
      showToast('Task uploaded successfully!', 'success')
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
      TESTER: 'bg-green-100 text-green-800',
      CONTRIBUTOR: 'bg-blue-100 text-blue-800',
    }
    return roleMap[role] || 'bg-gray-100 text-gray-800'
  }

  const getTabCount = (tab: SubmissionFilter) => {
    if (tab === 'all') return projectXSubmissions.length
    return projectXSubmissions.filter(s => s.status.toLowerCase() === tab).length
  }

  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPlatformSubmissions = projectXSubmissions.length + projectVSubmissions.length
  const totalPlatformUsers = users.length
  const projectVSubmittedTasks = projectVSubmissions.filter(s => s.status === 'TASK_SUBMITTED_TO_PLATFORM')
  const projectVEligibleTasks = projectVSubmissions.filter(s => s.status === 'ELIGIBLE_FOR_MANUAL_REVIEW')
  const projectVFinalChecksTasks = projectVSubmissions.filter(s => s.status === 'FINAL_CHECKS')
  const projectVApprovedTasks = projectVSubmissions.filter(s => s.status === 'APPROVED')

  const detailedLeaderboard = React.useMemo(() => {
    const contributorMap = new Map<string, {
      userId: string
      userName: string
      email: string
      uploaded: number
      submitted: number
      eligible: number
      finalChecks: number
      approved: number
      total: number
    }>()

    projectXSubmissions.forEach(sub => {
      const userId = sub.contributor.email
      if (!contributorMap.has(userId)) {
        contributorMap.set(userId, {
          userId,
          userName: sub.contributor.name,
          email: sub.contributor.email,
          uploaded: 0,
          submitted: 0,
          eligible: 0,
          finalChecks: 0,
          approved: 0,
          total: 0
        })
      }
      const entry = contributorMap.get(userId)!
      entry.total++
      if (sub.status === 'PENDING') entry.uploaded++
      if (sub.status === 'ELIGIBLE') entry.eligible++
      if (sub.status === 'APPROVED') entry.approved++
    })

    projectVSubmissions.forEach(sub => {
      if (!sub.contributor) return
      const userId = sub.contributor.email
      if (!contributorMap.has(userId)) {
        contributorMap.set(userId, {
          userId,
          userName: sub.contributor.name,
          email: sub.contributor.email,
          uploaded: 0,
          submitted: 0,
          eligible: 0,
          finalChecks: 0,
          approved: 0,
          total: 0
        })
      }
      const entry = contributorMap.get(userId)!
      entry.total++
      if (sub.status === 'TASK_SUBMITTED_TO_PLATFORM') entry.submitted++
      if (sub.status === 'ELIGIBLE_FOR_MANUAL_REVIEW') entry.eligible++
      if (sub.status === 'FINAL_CHECKS') entry.finalChecks++
      if (sub.status === 'APPROVED') entry.approved++
    })

    return Array.from(contributorMap.values())
      .sort((a, b) => b.approved - a.approved || b.total - a.total)
  }, [projectXSubmissions, projectVSubmissions])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading Platform Control Center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">
                  Platform Control Center
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Unified Admin Dashboard - All Projects</p>
              </div>
            </div>

            <div className="hidden md:flex gap-3 animate-slide-in-right">
              <button
                onClick={() => router.push('/profile')}
                className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-gray-600"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl"
              >
                Logout
              </button>
            </div>

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
                className="w-full px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-semibold shadow-md"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-8 relative z-10">
        <Breadcrumb />

        <div className="flex gap-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-xl p-1.5 mb-8 overflow-x-auto border border-gray-700/50 animate-slide-up">
          {(['overview', 'projectx', 'projectv', 'users', 'logs', 'leaderboard', 'feedback'] as MainSection[]).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                activeSection === section
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105 glow'
                  : 'text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {section === 'overview' && '🌐 Overview'}
              {section === 'projectx' && '📊 Project X'}
              {section === 'projectv' && '🚀 Project V'}
              {section === 'users' && '👥 Users'}
              {section === 'logs' && '📜 Activity Logs'}
              {section === 'leaderboard' && '🏆 Leaderboard'}
              {section === 'feedback' && '💬 All Feedback'}
            </button>
          ))}
        </div>

        {activeSection === 'overview' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🌐</div>
                <div>
                  <h2 className="text-3xl font-black text-purple-300 mb-2">Platform Overview</h2>
                  <p className="text-gray-300">Unified statistics across all projects and systems</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <StatCard
                title="Total Platform Users"
                value={totalPlatformUsers}
                icon="👥"
                color="blue"
              />
              <StatCard
                title="Total Submissions"
                value={totalPlatformSubmissions}
                icon="📊"
                color="purple"
              />
              <StatCard
                title="Project X Tasks"
                value={projectXSubmissions.length}
                icon="📝"
                color="cyan"
              />
              <StatCard
                title="Project V Tasks"
                value={projectVSubmissions.length}
                icon="🚀"
                color="green"
              />
            </div>

            {stats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <StatCard
                    title="Active Reviewers"
                    value={stats.overview.activeReviewers}
                    icon="🟢"
                    color="green"
                  />
                  <StatCard
                    title="Inactive Reviewers"
                    value={stats.overview.inactiveReviewers}
                    icon="⚫"
                    color="red"
                  />
                  <StatCard
                    title="Pending Reviews"
                    value={stats.overview.pendingReviews}
                    icon="⏳"
                    color="yellow"
                  />
                  <StatCard
                    title="Queued Tasks"
                    value={stats.overview.queuedTasks}
                    icon="📋"
                    color="orange"
                  />
                  <StatCard
                    title="Total Reviews"
                    value={reviews.length}
                    icon="💬"
                    color="purple"
                  />
                  <StatCard
                    title="Activity Logs"
                    value={logs.length}
                    icon="📜"
                    color="cyan"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <BarChart
                    title="Project X - Task Status"
                    data={[
                      {
                        label: 'Uploaded',
                        value: projectXSubmissions.filter(s => s.status === 'PENDING').length,
                        color: 'bg-gradient-to-r from-blue-500 to-blue-600'
                      },
                      {
                        label: 'Claimed',
                        value: projectXSubmissions.filter(s => s.status === 'CLAIMED').length,
                        color: 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      },
                      {
                        label: 'Eligible',
                        value: projectXSubmissions.filter(s => s.status === 'ELIGIBLE').length,
                        color: 'bg-gradient-to-r from-cyan-500 to-cyan-600'
                      },
                      {
                        label: 'Approved',
                        value: projectXSubmissions.filter(s => s.status === 'APPROVED').length,
                        color: 'bg-gradient-to-r from-green-500 to-green-600'
                      }
                    ]}
                  />

                  <BarChart
                    title="Project V - Task Pipeline"
                    data={[
                      {
                        label: 'Submitted',
                        value: projectVSubmittedTasks.length,
                        color: 'bg-gradient-to-r from-blue-500 to-cyan-600'
                      },
                      {
                        label: 'Eligible',
                        value: projectVEligibleTasks.length,
                        color: 'bg-gradient-to-r from-purple-500 to-pink-600'
                      },
                      {
                        label: 'Final Checks',
                        value: projectVFinalChecksTasks.length,
                        color: 'bg-gradient-to-r from-cyan-500 to-blue-600'
                      },
                      {
                        label: 'Approved',
                        value: projectVApprovedTasks.length,
                        color: 'bg-gradient-to-r from-green-500 to-emerald-600'
                      }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <DonutChart
                    title="Project X Distribution"
                    data={[
                      {
                        label: 'Uploaded',
                        value: projectXSubmissions.filter(s => s.status === 'PENDING').length,
                        color: 'fill-blue-500'
                      },
                      {
                        label: 'Claimed',
                        value: projectXSubmissions.filter(s => s.status === 'CLAIMED').length,
                        color: 'fill-yellow-500'
                      },
                      {
                        label: 'Eligible',
                        value: projectXSubmissions.filter(s => s.status === 'ELIGIBLE').length,
                        color: 'fill-cyan-500'
                      },
                      {
                        label: 'Approved',
                        value: projectXSubmissions.filter(s => s.status === 'APPROVED').length,
                        color: 'fill-green-500'
                      }
                    ]}
                  />

                  <DonutChart
                    title="Project V Distribution"
                    data={[
                      {
                        label: 'Submitted',
                        value: projectVSubmittedTasks.length,
                        color: 'fill-blue-500'
                      },
                      {
                        label: 'Eligible',
                        value: projectVEligibleTasks.length,
                        color: 'fill-purple-500'
                      },
                      {
                        label: 'Final Checks',
                        value: projectVFinalChecksTasks.length,
                        color: 'fill-cyan-500'
                      },
                      {
                        label: 'Approved',
                        value: projectVApprovedTasks.length,
                        color: 'fill-green-500'
                      }
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">User Distribution by Role</h3>
                    <div className="space-y-3">
                      {[
                        { role: 'CONTRIBUTOR', count: users.filter(u => u.role === 'CONTRIBUTOR').length, color: 'bg-blue-500' },
                        { role: 'REVIEWER', count: users.filter(u => u.role === 'REVIEWER').length, color: 'bg-purple-500' },
                        { role: 'TESTER', count: users.filter(u => u.role === 'TESTER').length, color: 'bg-green-500' },
                        { role: 'ADMIN', count: users.filter(u => u.role === 'ADMIN').length, color: 'bg-red-500' },
                      ].map((item) => {
                        const maxCount = Math.max(...users.reduce((acc, u) => {
                          const roleCount = users.filter(user => user.role === u.role).length
                          return acc.includes(roleCount) ? acc : [...acc, roleCount]
                        }, [] as number[]), 1)

                        return (
                          <div key={item.role}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold text-gray-700">{item.role}</span>
                              <span className="text-lg font-bold text-gray-900">{item.count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full ${item.color} rounded-full transition-all duration-500`}
                                style={{ width: `${(item.count / maxCount) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Reviewer Status</h3>
                    <div className="flex items-center justify-center h-48">
                      <div className="text-center">
                        <div className="text-6xl font-black text-green-600 mb-2">{stats.overview.activeReviewers}</div>
                        <div className="text-sm text-gray-500 mb-4">Active Reviewers</div>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-600">Ready to review</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeSection === 'projectx' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="text-5xl">📊</div>
                <div>
                  <h2 className="text-3xl font-black text-blue-300 mb-2">Project X</h2>
                  <p className="text-gray-300">Manage all Project X submissions and reviews</p>
                </div>
              </div>
            </div>

            <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search submissions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium"
                />
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {showUpload && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200 animate-slide-up">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="e.g., Ruby, Swift, Kotlin"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Upload ZIP File *
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-purple-400 transition-colors">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500">
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
                    className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {loading ? 'Uploading...' : 'Upload Task'}
                  </button>
                </form>
              </div>
            )}

            <div className="flex justify-between items-center mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
                {(['all', 'pending', 'claimed', 'eligible', 'approved'] as SubmissionFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSubmissionFilter(filter)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                      submissionFilter === filter
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} ({getTabCount(filter)})
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowUpload(!showUpload)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all shadow-md hover:shadow-lg font-medium whitespace-nowrap ml-4"
              >
                {showUpload ? '✕ Cancel Upload' : '+ Upload Task'}
              </button>
            </div>

            <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
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
                              <p className="text-xs text-gray-500">by {review.tester.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

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
          </div>
        )}

        {activeSection === 'projectv' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🚀</div>
                <div>
                  <h2 className="text-3xl font-black text-green-300 mb-2">Project V</h2>
                  <p className="text-gray-300">View and manage all Project V submissions</p>
                  <button
                    onClick={() => router.push('/project-v/admin')}
                    className="mt-3 px-4 py-2 bg-green-600/80 hover:bg-green-700/80 text-white rounded-lg font-semibold transition-all duration-300"
                  >
                    Open Project V Admin Dashboard →
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <StatCard
                title="Total Submissions"
                value={projectVSubmissions.length}
                icon="📊"
                color="blue"
              />
              <StatCard
                title="Submitted to Platform"
                value={projectVSubmittedTasks.length}
                icon="📥"
                color="cyan"
              />
              <StatCard
                title="Eligible for Review"
                value={projectVEligibleTasks.length}
                icon="🔍"
                color="purple"
              />
              <StatCard
                title="Approved Tasks"
                value={projectVApprovedTasks.length}
                icon="✅"
                color="green"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <BarChart
                title="Project V Task Pipeline"
                data={[
                  {
                    label: 'Submitted to Platform',
                    value: projectVSubmittedTasks.length,
                    color: 'bg-gradient-to-r from-blue-500 to-cyan-600'
                  },
                  {
                    label: 'Eligible for Manual Review',
                    value: projectVEligibleTasks.length,
                    color: 'bg-gradient-to-r from-purple-500 to-pink-600'
                  },
                  {
                    label: 'Final Checks',
                    value: projectVFinalChecksTasks.length,
                    color: 'bg-gradient-to-r from-cyan-500 to-blue-600'
                  },
                  {
                    label: 'Approved',
                    value: projectVApprovedTasks.length,
                    color: 'bg-gradient-to-r from-green-500 to-emerald-600'
                  }
                ]}
              />

              <DonutChart
                title="Task Status Distribution"
                data={[
                  {
                    label: 'Submitted',
                    value: projectVSubmittedTasks.length,
                    color: 'fill-blue-500'
                  },
                  {
                    label: 'Eligible',
                    value: projectVEligibleTasks.length,
                    color: 'fill-purple-500'
                  },
                  {
                    label: 'Final Checks',
                    value: projectVFinalChecksTasks.length,
                    color: 'fill-cyan-500'
                  },
                  {
                    label: 'Approved',
                    value: projectVApprovedTasks.length,
                    color: 'fill-green-500'
                  }
                ]}
              />
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Project V Submissions</h3>
              <div className="space-y-3">
                {projectVSubmissions.slice(0, 10).map((submission) => (
                  <div key={submission.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 mb-2">{submission.title}</h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                            {submission.language}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                            {submission.difficulty}
                          </span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            {submission.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          By: {submission.contributor?.name || 'Unknown'}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'users' && (
          <div className="animate-slide-up">
            <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-2 border-indigo-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">👥</div>
                <div>
                  <h2 className="text-3xl font-black text-indigo-300 mb-2">User Management</h2>
                  <p className="text-gray-300">Manage all platform users across both projects</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium"
                />
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

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
                          {(user.role === 'TESTER' || user.role === 'REVIEWER') ? (
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
                          {(user.role === 'TESTER' || user.role === 'REVIEWER') && user.isApproved ? (
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
                            {(user.role === 'TESTER' || user.role === 'REVIEWER') && !user.isApproved && (
                              <button
                                onClick={() => handleApproveReviewer(user.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {(user.role === 'TESTER' || user.role === 'REVIEWER') && user.isApproved && (
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

            {stats && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Contributor Statistics</h2>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      {stats.contributors?.length || 0} Contributors
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Total</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Eligible</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Approved</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.contributors && stats.contributors.length > 0 ? (
                          stats.contributors.slice(0, 10).map((contributor) => (
                            <tr key={contributor.userId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{contributor.name}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                <span className="px-2 py-1 bg-gray-100 rounded font-semibold">{contributor.totalSubmissions}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded font-semibold">{contributor.eligibleCount}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-semibold">{contributor.approvedCount}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                <span className={`px-2 py-1 rounded font-semibold ${
                                  contributor.approvalRate >= 75 ? 'bg-green-100 text-green-800' :
                                  contributor.approvalRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {contributor.approvalRate.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center">
                              <div className="text-gray-400 text-4xl mb-2">📊</div>
                              <p className="text-gray-500">No contributors found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Reviewer Statistics</h2>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        {stats.overview.activeReviewers} Active
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                        {stats.overview.inactiveReviewers} Inactive
                      </span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                          <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Status</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">In Stack</th>
                          <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Reviewed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stats.reviewers && stats.reviewers.length > 0 ? (
                          stats.reviewers.slice(0, 10).map((reviewer) => (
                            <tr key={reviewer.userId} className={`transition-colors ${reviewer.isGreenLight ? 'hover:bg-green-50' : 'hover:bg-gray-50'}`}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">{reviewer.name}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${reviewer.isGreenLight ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                    reviewer.isGreenLight ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {reviewer.isGreenLight ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold">{reviewer.tasksInStack}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-semibold">{reviewer.reviewedCount}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center">
                              <div className="text-gray-400 text-4xl mb-2">👥</div>
                              <p className="text-gray-500">No reviewers found</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'logs' && (
          <div className="animate-slide-up">
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-2 border-orange-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">📜</div>
                <div>
                  <h2 className="text-3xl font-black text-orange-300 mb-2">Activity Logs</h2>
                  <p className="text-gray-300">Monitor all platform activity and user actions</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-xl font-bold text-gray-800">Recent Activity (Last 100)</h3>
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
          </div>
        )}

        {activeSection === 'leaderboard' && (
          <div className="animate-slide-up">
            <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-2 border-yellow-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🏆</div>
                <div>
                  <h2 className="text-3xl font-black text-yellow-300 mb-2">Leaderboard</h2>
                  <p className="text-gray-300">Top contributors ranked by performance</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                {detailedLeaderboard.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-gray-400 text-6xl mb-4">🏆</div>
                    <p className="text-gray-500 text-lg">No leaderboard data yet.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b-2 border-yellow-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Rank</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Contributor</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">📤 Uploaded</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">📥 Submitted</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">🔍 Eligible</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">🔧 Final Checks</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">✅ Approved</th>
                        <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">📊 Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {detailedLeaderboard.map((entry, index) => (
                        <tr
                          key={entry.userId}
                          className={`transition-colors ${
                            index === 0 ? 'bg-yellow-50 hover:bg-yellow-100' :
                            index === 1 ? 'bg-gray-50 hover:bg-gray-100' :
                            index === 2 ? 'bg-orange-50 hover:bg-orange-100' :
                            'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`text-xl font-bold ${
                                index === 0 ? 'text-yellow-600' :
                                index === 1 ? 'text-gray-600' :
                                index === 2 ? 'text-orange-600' :
                                'text-gray-400'
                              }`}>
                                #{index + 1}
                              </div>
                              {index < 3 && (
                                <span className="text-xl">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-gray-800">{entry.userName}</p>
                              <p className="text-sm text-gray-600">{entry.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                              {entry.uploaded}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-bold">
                              {entry.submitted}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">
                              {entry.eligible}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                              {entry.finalChecks}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
                              {entry.approved}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-bold">
                              {entry.total}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'feedback' && (
          <div className="animate-slide-up">
            <div className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-2 border-pink-500/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">💬</div>
                <div>
                  <h2 className="text-3xl font-black text-pink-300 mb-2">All Reviews & Feedback</h2>
                  <p className="text-gray-300">Complete visibility of all feedback given by testers</p>
                  <div className="mt-2 text-sm">
                    <span className="font-semibold">Total Reviews:</span> {reviews.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium"
                />
                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">💬</div>
                  <p className="text-gray-500 text-lg">
                    {searchQuery ? 'No reviews match your search.' : 'No reviews found.'}
                  </p>
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                          Submission: {review.submission.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                          <span>Review ID:</span>
                          <CopyToClipboard text={review.id}>
                            <span className="font-mono text-gray-600">{review.id.slice(0, 8)}...</span>
                          </CopyToClipboard>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            {review.submission.domain}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            review.submission.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            review.submission.status === 'ELIGIBLE' ? 'bg-blue-100 text-blue-800' :
                            review.submission.status === 'CLAIMED' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {review.submission.status}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(review.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h4 className="text-sm font-bold text-gray-700 mb-2">Feedback</h4>
                      <p className="text-gray-800 whitespace-pre-wrap">{review.feedback}</p>
                      {review.accountPostedIn && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs font-semibold text-gray-600">Account Posted In: </span>
                          <span className="text-xs text-gray-700">{review.accountPostedIn}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-blue-800 mb-1">Tester/Reviewer</h5>
                        <p className="text-gray-800">{review.tester.name}</p>
                        <p className="text-gray-600">{review.tester.email}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="font-semibold text-green-800 mb-1">Contributor</h5>
                        <p className="text-gray-800">{review.submission.contributor.name}</p>
                        <p className="text-gray-600">{review.submission.contributor.email}</p>
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
