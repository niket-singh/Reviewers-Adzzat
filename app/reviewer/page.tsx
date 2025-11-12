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
  fileUrl: string
  status: string
  createdAt: string
  contributor: {
    name: string
    email: string
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

type StatusFilter = 'claimed' | 'eligible'

export default function ReviewerDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<StatusFilter>('claimed')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [accountPostedIn, setAccountPostedIn] = useState('')
  const [isEligible, setIsEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()

  // Redirect if not authenticated or not a reviewer
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'REVIEWER') {
      router.push('/')
    } else if (user && !user.isApproved) {
      // Show waiting for approval message
    }
  }, [user, authLoading, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchSubmissions()
    const interval = setInterval(() => {
      fetchSubmissions()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, activeTab, searchQuery])

  const fetchSubmissions = async () => {
    try {
      const data = await apiClient.getSubmissions()
      setSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
  }

  const filterSubmissions = () => {
    let filtered = submissions

    // Filter by status tab
    if (activeTab === 'claimed') {
      filtered = filtered.filter(s => s.status === 'CLAIMED')
    } else if (activeTab === 'eligible') {
      filtered = filtered.filter(s => s.status === 'ELIGIBLE')
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.domain.toLowerCase().includes(query) ||
          s.language.toLowerCase().includes(query) ||
          s.contributor.name.toLowerCase().includes(query)
      )
    }

    setFilteredSubmissions(filtered)
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubmission || !feedback) return

    setLoading(true)
    try {
      await apiClient.submitFeedback(selectedSubmission, {
        feedback,
        markEligible: isEligible,
        accountPostedIn: accountPostedIn || undefined,
      })

      setSelectedSubmission(null)
      setFeedback('')
      setAccountPostedIn('')
      setIsEligible(false)
      fetchSubmissions()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error submitting feedback')
    } finally {
      setLoading(false)
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

  const getTabCount = (tab: StatusFilter) => {
    if (tab === 'claimed') return submissions.filter(s => s.status === 'CLAIMED').length
    if (tab === 'eligible') return submissions.filter(s => s.status === 'ELIGIBLE').length
    return 0
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user.isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your reviewer account is waiting for admin approval. You'll be able to review submissions once an admin approves your account.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reviewer Dashboard</h1>
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
        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by title, domain, language, or contributor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white shadow-sm"
          />
        </div>

        <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 mb-6 w-fit">
          {(['claimed', 'eligible'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({getTabCount(tab)})
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">
                {searchQuery
                  ? 'No submissions match your search.'
                  : `No ${activeTab} submissions. Tasks are automatically assigned to you.`}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-white rounded-xl shadow-md p-6 transition-all hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {submission.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {submission.domain}
                      </span>
                      <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
                        {submission.language}
                      </span>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        by {submission.contributor.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(submission.id, submission.fileName)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => setSelectedSubmission(submission.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Review
                    </button>
                  </div>
                </div>

                {submission.reviews.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Previous Reviews</h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 p-4 rounded-lg mb-2">
                        <p className="text-sm text-gray-800 mb-2">{review.feedback}</p>
                        {review.accountPostedIn && (
                          <p className="text-xs text-gray-600 mb-1">
                            Account: <span className="font-medium">{review.accountPostedIn}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          by {review.reviewer.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback Form */}
                {selectedSubmission === submission.id && (
                  <form onSubmit={handleSubmitFeedback} className="mt-4 border-t pt-4">
                    <h4 className="text-lg font-bold text-gray-800 mb-4">Submit Review</h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Feedback *
                        </label>
                        <textarea
                          required
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Provide detailed feedback about the submission..."
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
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="e.g., @username or account URL"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Visible only to admins
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="eligible"
                          checked={isEligible}
                          onChange={(e) => setIsEligible(e.target.checked)}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label htmlFor="eligible" className="text-sm font-medium text-gray-700">
                          Mark as eligible for approval
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                        >
                          {loading ? 'Submitting...' : 'Submit Review'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubmission(null)
                            setFeedback('')
                            setAccountPostedIn('')
                            setIsEligible(false)
                          }}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
