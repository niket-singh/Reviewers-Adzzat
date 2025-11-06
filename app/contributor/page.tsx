'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DOMAINS, LANGUAGES } from '@/lib/constants/options'

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

type StatusFilter = 'all' | 'pending' | 'claimed' | 'eligible' | 'approved'

export default function ContributorDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [showUpload, setShowUpload] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    language: '',
    customLanguage: '',
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
      const res = await fetch('/api/submissions/list')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
  }

  const filterSubmissions = () => {
    if (activeTab === 'all') {
      setFilteredSubmissions(submissions)
    } else {
      const filtered = submissions.filter(s => s.status.toLowerCase() === activeTab)
      setFilteredSubmissions(filtered)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    if (!formData.domain) {
      setError('Please select a domain')
      return
    }

    if (!formData.language) {
      setError('Please select a language')
      return
    }

    if (formData.language === 'Other' && !formData.customLanguage.trim()) {
      setError('Please specify the language')
      return
    }

    setLoading(true)
    setError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('domain', formData.domain)
      uploadFormData.append('language', formData.language === 'Other' ? formData.customLanguage : formData.language)

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
      setFormData({ title: '', domain: '', language: '', customLanguage: '' })
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
      PENDING: 'bg-gray-100 text-gray-800 border-gray-300',
      CLAIMED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ELIGIBLE: 'bg-blue-500 text-white border-blue-600',
      APPROVED: 'bg-green-500 text-white border-green-600',
      REJECTED: 'bg-red-100 text-red-800 border-red-300',
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBgClass = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: 'bg-white',
      CLAIMED: 'bg-yellow-50',
      ELIGIBLE: 'bg-blue-50 border-2 border-blue-400',
      APPROVED: 'bg-green-50 border-2 border-green-400',
      REJECTED: 'bg-red-50',
    }
    return statusMap[status] || 'bg-white'
  }

  const getTabCount = (tab: StatusFilter) => {
    if (tab === 'all') return submissions.length
    return submissions.filter(s => s.status.toLowerCase() === tab).length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Contributor Dashboard</h1>
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 bg-white rounded-lg shadow-sm p-1">
            {(['all', 'pending', 'claimed', 'eligible', 'approved'] as StatusFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({getTabCount(tab)})
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            {showUpload ? '✕ Cancel' : '+ Upload New Task'}
          </button>
        </div>

        {showUpload && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6 border border-gray-200">
            <h3 className="text-xl font-bold mb-6 text-gray-800">Upload New Task</h3>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="e.g., Ruby, Swift, Kotlin"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload ZIP File *
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
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

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? 'Uploading...' : 'Upload Task'}
              </button>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">
                {activeTab === 'all'
                  ? 'No submissions yet. Upload your first task to get started!'
                  : `No ${activeTab} submissions.`}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div
                key={submission.id}
                className={`rounded-xl shadow-md p-6 transition-all hover:shadow-lg ${getStatusBgClass(submission.status)}`}
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
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                        {submission.language}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Submitted: {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusClass(
                      submission.status
                    )}`}
                  >
                    {submission.status}
                  </span>
                </div>

                {submission.reviews.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="text-lg">💬</span> Reviewer Feedback
                    </h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className="bg-white bg-opacity-60 p-4 rounded-lg mb-2 border border-gray-200">
                        <p className="text-sm text-gray-800 mb-2">{review.feedback}</p>
                        <p className="text-xs text-gray-500">
                          by <span className="font-medium">{review.reviewer.name}</span> • {new Date(review.createdAt).toLocaleDateString()}
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
