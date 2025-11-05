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
  reviews: {
    id: string
    feedback: string
    createdAt: string
    reviewer: {
      name: string
    }
  }[]
}

export default function ContributorDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    language: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('domain', formData.domain)
      uploadFormData.append('language', formData.language)

      const res = await fetch('/api/submissions/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        setLoading(false)
        return
      }

      setShowUpload(false)
      setFormData({ title: '', domain: '', language: '' })
      setFile(null)
      fetchSubmissions()
    } catch (err) {
      setError('Network error. Please try again.')
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
            <h1 className="text-2xl font-bold text-gray-800">Contributor Dashboard</h1>
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">My Submissions</h2>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showUpload ? 'Cancel' : 'Upload New Task'}
          </button>
        </div>

        {showUpload && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Upload New Task</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Web Development, Machine Learning"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., JavaScript, Python, Java"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload ZIP File
                </label>
                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload Task'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              No submissions yet. Upload your first task to get started!
            </div>
          ) : (
            submissions.map((submission) => (
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {submission.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {submission.domain} • {submission.language}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted: {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(
                      submission.status
                    )}`}
                  >
                    {submission.status}
                  </span>
                </div>

                {submission.reviews.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Reviewer Feedback:
                    </h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className="bg-gray-50 p-3 rounded-lg mb-2">
                        <p className="text-sm text-gray-800">{review.feedback}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          by {review.reviewer.name} •{' '}
                          {new Date(review.createdAt).toLocaleDateString()}
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
