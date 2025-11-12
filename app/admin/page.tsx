'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'

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
  reviews: {
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
  contributors: {
    userId: string
    name: string
    totalSubmissions: number
    eligibleCount: number
    approvedCount: number
    approvalRate: number
  }[]
  reviewers: {
    userId: string
    name: string
    tasksInStack: number
    reviewedCount: number
    currentWorkload: number
  }[]
  overview: {
    totalUsers: number
    totalSubmissions: number
    pendingReviews: number
  }
}

type MainTab = 'submissions' | 'users' | 'stats' | 'logs' | 'leaderboard'
type SubmissionFilter = 'all' | 'pending' | 'claimed' | 'eligible' | 'approved'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<MainTab>('submissions')
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('eligible')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData()
    const interval = setInterval(() => {
      fetchData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [activeTab])

  useEffect(() => {
    filterData()
  }, [submissions, users, submissionFilter, searchQuery])

  const fetchData = async () => {
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
  }

  const filterData = () => {
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
  }

  const handleApproveReviewer = async (userId: string) => {
    try {
      await apiClient.approveReviewer(userId)
      fetchData()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve reviewer')
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
      alert(err.response?.data?.error || 'Failed to switch role')
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
      alert(err.response?.data?.error || 'Failed to delete user')
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
      alert(err.response?.data?.error || 'Failed to delete submission')
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
      alert(err.response?.data?.error || 'Failed to approve submission')
    }
  }

  const handleDownload = async (submissionId: string, fileName: string) => {
    try {
      const downloadUrl = await apiClient.getDownloadURL(submissionId)

      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Download error')
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'bg-gray-100 text-gray-800',
      CLAIMED: 'bg-yellow-100 text-yellow-800',
      ELIGIBLE: 'bg-blue-500 text-white',
      APPROVED: 'bg-green-500 text-white',
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Tabs */}
        <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 mb-6 overflow-x-auto">
          {(['submissions', 'users', 'stats', 'logs', 'leaderboard'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {(activeTab === 'submissions' || activeTab === 'users') && (
          <div className="mb-6">
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-sm"
            />
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <>
            <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 mb-6 overflow-x-auto">
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

            <div className="space-y-4">
              {filteredSubmissions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">
                    {searchQuery ? 'No submissions match your search.' : `No ${submissionFilter} submissions.`}
                  </p>
                </div>
              ) : (
                filteredSubmissions.map((submission) => (
                  <div key={submission.id} className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{submission.title}</h3>
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

                    {submission.reviews.length > 0 && (
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
                ))
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
                    {stats.contributors.map((contributor) => (
                      <tr key={contributor.userId}>
                        <td className="px-4 py-3 text-sm text-gray-800">{contributor.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.totalSubmissions}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.eligibleCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.approvedCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{contributor.approvalRate}%</td>
                      </tr>
                    ))}
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
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Tasks in Stack</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Reviewed</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Current Workload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.reviewers.map((reviewer) => (
                      <tr key={reviewer.userId}>
                        <td className="px-4 py-3 text-sm text-gray-800">{reviewer.name}</td>
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
                    ))}
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
