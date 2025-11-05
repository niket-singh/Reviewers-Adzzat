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
  reviews: {
    id: string
    feedback: string
    reviewer: {
      name: string
    }
  }[]
}

export default function ReviewerDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isEligible, setIsEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchUserData()
    fetchSubmissions()
  }, [])

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
      const res = await fetch('/api/submissions/list')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
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
        }),
      })

      if (res.ok) {
        setSelectedSubmission(null)
        setFeedback('')
        setIsEligible(false)
        fetchSubmissions()
      }
    } catch (err) {
      console.error('Error submitting feedback:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Reviewer Dashboard</h1>
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
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Available Tasks for Review
        </h2>

        {selectedSubmission && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Submit Feedback</h3>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback
                </label>
                <textarea
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide detailed feedback for the contributor..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="eligible"
                  checked={isEligible}
                  onChange={(e) => setIsEligible(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="eligible" className="ml-2 text-sm text-gray-700">
                  Mark as Eligible (will turn blue for admin approval)
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubmission(null)
                    setFeedback('')
                    setIsEligible(false)
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No tasks available for review at the moment.
            </div>
          ) : (
            submissions.map((submission) => (
              <div key={submission.id} className="bg-white rounded-lg shadow-md p-6">
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
                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      submission.status === 'PENDING'
                        ? 'bg-gray-200 text-gray-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>

                <div className="flex gap-2">
                  {submission.status === 'PENDING' && (
                    <button
                      onClick={() => handleClaim(submission.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      Claim Task
                    </button>
                  )}
                  {submission.status === 'CLAIMED' && (
                    <button
                      onClick={() => setSelectedSubmission(submission.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Give Feedback
                    </button>
                  )}
                </div>

                {submission.reviews.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Previous Feedback:
                    </h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 p-3 rounded-lg mb-2">
                        <p className="text-sm text-gray-800">{review.feedback}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          by {review.reviewer.name}
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
