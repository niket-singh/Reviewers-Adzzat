'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Submission {
  id: string
  title: string
  domain: string
  language: string
  status: string
  createdAt: string
  contributor: {
    name: string
    email: string
  }
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'users' | 'leaderboard'>('submissions')
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchUserData()
    fetchSubmissions()
    fetchUsers()
    fetchLeaderboard()
  }, [])

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
      const res = await fetch('/api/submissions/list?status=all')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Error fetching users:', err)
    }
  }

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/admin/leaderboard')
      const data = await res.json()
      setLeaderboard(data.leaderboard || [])
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
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
      console.error('Error approving submission:', err)
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
      console.error('Error approving reviewer:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getStatusClass = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'bg-gray-200 text-gray-800',
      CLAIMED: 'bg-yellow-200 text-yellow-800',
      ELIGIBLE: 'bg-blue-400 text-white',
      APPROVED: 'bg-green-400 text-white',
      REJECTED: 'bg-red-200 text-red-800',
    }
    return statusMap[status] || 'bg-gray-200 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {userName}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'submissions'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Leaderboard
          </button>
        </div>

        {activeTab === 'submissions' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Eligible Submissions (Blue = Ready for Approval)
            </h2>
            <div className="space-y-4">
              {submissions.filter((s) => s.status === 'ELIGIBLE').length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
                  No eligible submissions waiting for approval.
                </div>
              ) : (
                submissions
                  .filter((s) => s.status === 'ELIGIBLE')
                  .map((submission) => (
                    <div
                      key={submission.id}
                      className="bg-blue-100 border-2 border-blue-400 rounded-lg shadow-md p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">
                            {submission.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {submission.domain} • {submission.language}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            By: {submission.contributor.name} ({submission.contributor.email})
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(submission.status)}`}>
                          {submission.status}
                        </span>
                      </div>
                      <button
                        onClick={() => handleApproveSubmission(submission.id)}
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve (Turn Green)
                      </button>
                    </div>
                  ))
              )}
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-4">
              All Submissions
            </h2>
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className={`rounded-lg shadow-md p-6 ${
                    submission.status === 'ELIGIBLE'
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : submission.status === 'APPROVED'
                      ? 'bg-green-100 border-2 border-green-400'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {submission.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {submission.domain} • {submission.language}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        By: {submission.contributor.name}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              User Management
            </h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm text-gray-800">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'REVIEWER'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
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
                            className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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

        {activeTab === 'leaderboard' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Contributor Leaderboard
            </h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Eligible Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Approved Tasks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.userId} className={index < 3 ? 'bg-yellow-50' : ''}>
                      <td className="px-6 py-4 text-sm font-bold text-gray-800">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">{entry.userName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{entry.email}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-semibold">
                        {entry.eligibleCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 font-semibold">
                        {entry.approvedCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800 font-bold">
                        {entry.totalCount}
                      </td>
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
