'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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

type StatusFilter = 'pending' | 'claimed' | 'eligible'

export default function ReviewerDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending')
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [accountPostedIn, setAccountPostedIn] = useState('')
  const [isEligible, setIsEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchUserData()
    fetchSubmissions()
  }, [])

  useEffect(() => {
    filterSubmissions()
  }, [submissions, activeTab])

  const fetchUserData = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/')
        return
      }
      const data = await res.json()
      setUserName(data.user.name)
    } catch (err) {
      router.push('/')
    }
  }

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/submissions/list?status=${activeTab}`)
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
  }

  const filterSubmissions = () => {
    setFilteredSubmissions(submissions)
  }

  const handleClaim = async (submissionId: string) => {
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
      console.error('Error claiming submission:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubmission || !feedback) return

    setLoading(true)
    try {
      const res = await fetch('/api/submissions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: selectedSubmission,
          feedback,
          isEligible,
          accountPostedIn: accountPostedIn || undefined,
        }),
      })

      if (res.ok) {
        setSelectedSubmission(null)
        setFeedback('')
        setAccountPostedIn('')
        setIsEligible(false)
        fetchSubmissions()
      }
    } catch (err) {
      console.error('Error submitting feedback:', err)
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

  const getTabCount = (tab: StatusFilter) => {
    return submissions.filter(s => {
      if (tab === 'pending') return s.status === 'PENDING' || s.status === 'CLAIMED'
      if (tab === 'claimed') return s.status === 'CLAIMED'
      if (tab === 'eligible') return s.status === 'ELIGIBLE'
      return false
    }).length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reviewer Dashboard</h1>
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
        <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1 mb-6 w-fit">
          {(['pending', 'claimed', 'eligible'] as StatusFilter[]).map((tab) => (
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

        {selectedSubmission && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-purple-200">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Submit Review Feedback</h3>
            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Feedback *
                </label>
                <textarea
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Provide detailed feedback for the contributor..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Posted In (Optional - visible to admin only)
                </label>
                <input
                  type="text"
                  value={accountPostedIn}
                  onChange={(e) => setAccountPostedIn(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="e.g., GitHub, LinkedIn, Twitter"
                />
                <p className="text-xs text-gray-500 mt-1">This field is only visible to administrators</p>
              </div>

              <div className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="eligible"
                  checked={isEligible}
                  onChange={(e) => setIsEligible(e.target.checked)}
                  className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="eligible" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">
                  Mark as Eligible (will turn blue for admin approval)
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                >
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubmission(null)
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
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <p className="text-gray-500 text-lg">
                No {activeTab} tasks available at the moment.
              </p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {submission.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        {submission.domain}
                      </span>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                        {submission.language}
                      </span>
                      {submission.claimedBy && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Claimed by: {submission.claimedBy.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">By:</span> {submission.contributor.name} ({submission.contributor.email})
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Submitted:</span> {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      submission.status === 'PENDING'
                        ? 'bg-gray-200 text-gray-800'
                        : submission.status === 'CLAIMED'
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleDownload(submission.id, submission.fileName)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium shadow-sm hover:shadow-md flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>

                  {submission.status === 'PENDING' && (
                    <button
                      onClick={() => handleClaim(submission.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 font-medium shadow-sm hover:shadow-md"
                    >
                      Claim Task
                    </button>
                  )}

                  {submission.status === 'CLAIMED' && (
                    <button
                      onClick={() => setSelectedSubmission(submission.id)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium shadow-sm hover:shadow-md"
                    >
                      Give Feedback
                    </button>
                  )}
                </div>

                {submission.reviews.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="text-lg">💬</span> Previous Feedback
                    </h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 p-4 rounded-lg mb-2 border border-gray-200">
                        <p className="text-sm text-gray-800 mb-2">{review.feedback}</p>
                        <p className="text-xs text-gray-500">
                          by <span className="font-medium">{review.reviewer.name}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
