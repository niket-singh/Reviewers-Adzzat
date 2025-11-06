'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

interface LeaderboardEntry {
  userId: string
  userName: string
  email: string
  eligibleCount: number
  approvedCount: number
  totalCount: number
}

type MainTab = 'submissions' | 'review' | 'users' | 'leaderboard'
type SubmissionFilter = 'eligible' | 'all' | 'pending' | 'claimed' | 'approved'

export default function AdminDashboard() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('submissions')
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('eligible')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [selectedForReview, setSelectedForReview] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [accountPostedIn, setAccountPostedIn] = useState('')
  const [isEligible, setIsEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchUserData()
    fetchSubmissions()
    fetchUsers()
    fetchLeaderboard()
  }, [])

  useEffect(() => {
    if (activeMainTab === 'submissions' || activeMainTab === 'review') {
      fetchSubmissions()
    }
  }, [submissionFilter, activeMainTab])

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/')
        return
      }
      const data = await res.json()
      if (data.user.role !== 'ADMIN') {
        router.push('/')
        return
      }
      setUserName(data.user.name)
    } catch (err) {
      router.push('/')
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/submissions/list?status=${submissionFilter}`)
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/admin/leaderboard')
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleApproveSubmission = async (submissionId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/submissions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })

      if (res.ok) {
        fetchSubmissions()
        fetchLeaderboard()
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReviewer = async (userId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/approve-reviewer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (res.ok) {
        fetchUsers()
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimForReview = async (submissionId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/submissions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId }),
      })

      if (res.ok) {
        fetchSubmissions()
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedForReview || !feedback) return

    setLoading(true)
    try {
      const res = await fetch('/api/submissions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedForReview,
          feedback,
          isEligible,
          accountPostedIn: accountPostedIn || undefined,
        }),
      })

      if (res.ok) {
        setSelectedForReview(null)
        setFeedback('')
        setAccountPostedIn('')
        setIsEligible(false)
        fetchSubmissions()
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (submissionId: string, fileName: string) => {
    try {
      const res = await fetch(`/api/submissions/download?id=${submissionId}`)
      const data = await res.json()

      if (data.downloadUrl) {
        const link = document.createElement('a')
        link.href = data.downloadUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getStatusClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-gray-200 text-gray-800',
      CLAIMED: 'bg-yellow-200 text-yellow-800',
      ELIGIBLE: 'bg-blue-500 text-white',
      APPROVED: 'bg-green-500 text-white',
    }
    return map[status] || 'bg-gray-200 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {userName}</p>
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
        <div className="flex gap-2 bg-white rounded-lg shadow-md p-1 mb-6">
          {(['submissions', 'review', 'users', 'leaderboard'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveMainTab(tab)}
              className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all ${
                activeMainTab === tab
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {(activeMainTab === 'submissions' || activeMainTab === 'review') && (
          <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 mb-6 w-fit">
            {(['eligible', 'all', 'pending', 'claimed', 'approved'] as SubmissionFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setSubmissionFilter(filter)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  submissionFilter === filter
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        )}

        {activeMainTab === 'submissions' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {submissionFilter === 'eligible' ? 'Eligible Submissions (Pending Admin Approval)' : 'All Submissions'}
            </h2>
            <div className="space-y-4">
              {submissions.filter(s => submissionFilter !== 'eligible' || s.status === 'ELIGIBLE').length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <p className="text-gray-500 text-lg">No submissions to display.</p>
                </div>
              ) : (
                submissions.filter(s => submissionFilter !== 'eligible' || s.status === 'ELIGIBLE').map((submission) => (
                  <div
                    key={submission.id}
                    className={`rounded-xl shadow-md p-6 hover:shadow-lg transition-all ${
                      submission.status === 'ELIGIBLE' ? 'bg-blue-50 border-2 border-blue-400' :
                      submission.status === 'APPROVED' ? 'bg-green-50 border-2 border-green-400' : 'bg-white'
                    }`}
                  >
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
                        </div>
                        <p className="text-sm text-gray-600">By: {submission.contributor.name}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusClass(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(submission.id, submission.fileName)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      {submission.status === 'ELIGIBLE' && (
                        <button
                          onClick={() => handleApproveSubmission(submission.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 font-medium"
                        >
                          Approve (Turn Green)
                        </button>
                      )}
                    </div>

                    {submission.reviews.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="text-sm font-bold text-gray-700 mb-3">Reviews:</h4>
                        {submission.reviews.map((review) => (
                          <div key={review.id} className="bg-white p-4 rounded-lg mb-2 border border-gray-200">
                            <p className="text-sm text-gray-800 mb-2">{review.feedback}</p>
                            {review.accountPostedIn && (
                              <p className="text-xs text-blue-600 font-medium mb-1">
                                📍 Posted in: {review.accountPostedIn}
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
          </div>
        )}

        {activeMainTab === 'review' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Review Tasks (Admin Can Review)</h2>

            {selectedForReview && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-orange-200">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Submit Review</h3>
                <form onSubmit={handleSubmitReview} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Feedback *</label>
                    <textarea
                      required
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Provide detailed feedback..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Account Posted In (Optional)
                    </label>
                    <input
                      type="text"
                      value={accountPostedIn}
                      onChange={(e) => setAccountPostedIn(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="e.g., GitHub, LinkedIn"
                    />
                  </div>

                  <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      id="eligible-admin"
                      checked={isEligible}
                      onChange={(e) => setIsEligible(e.target.checked)}
                      className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="eligible-admin" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                      Mark as Eligible
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedForReview(null)
                        setFeedback('')
                        setAccountPostedIn('')
                        setIsEligible(false)
                      }}
                      className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="text-gray-400 text-6xl mb-4">🔍</div>
                  <p className="text-gray-500 text-lg">No tasks available for review.</p>
                </div>
              ) : (
                submissions.map((submission) => (
                  <div key={submission.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all">
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
                        </div>
                        <p className="text-sm text-gray-600">By: {submission.contributor.name}</p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusClass(submission.status)}`}>
                        {submission.status}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(submission.id, submission.fileName)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>

                      {submission.status === 'PENDING' && (
                        <button
                          onClick={() => handleClaimForReview(submission.id)}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 font-medium"
                        >
                          Claim for Review
                        </button>
                      )}

                      {submission.status === 'CLAIMED' && (
                        <button
                          onClick={() => setSelectedForReview(submission.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium"
                        >
                          Give Review
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeMainTab === 'users' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">User Management</h2>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm text-gray-800">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'REVIEWER' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.isApproved ? (
                          <span className="text-green-600 font-medium">Approved</span>
                        ) : (
                          <span className="text-yellow-600 font-medium">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {!user.isApproved && user.role === 'REVIEWER' && (
                          <button
                            onClick={() => handleApproveReviewer(user.id)}
                            disabled={loading}
                            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeMainTab === 'leaderboard' && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Contributor Leaderboard</h2>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Eligible</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.userId} className={index < 3 ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-medium">{entry.userName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{entry.email}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{entry.eligibleCount}</td>
                      <td className="px-6 py-4 text-sm text-green-600 font-semibold">{entry.approvedCount}</td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-bold">{entry.totalCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
