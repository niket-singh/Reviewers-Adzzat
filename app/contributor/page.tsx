'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { DOMAINS, LANGUAGES } from '@/lib/constants/options'
import { useToast } from '@/components/ToastContainer'
import Breadcrumb from '@/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import FileUpload from '@/components/FileUpload'
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
  reviews?: {
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
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    domain: '',
    language: '',
    customLanguage: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { showToast } = useToast()

  // Redirect if not authenticated or not a contributor/admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'CONTRIBUTOR' && user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchSubmissions()
    const interval = setInterval(() => {
      fetchSubmissions()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    filterSubmissions()
    setCurrentPage(1) // Reset to first page when filters change
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

    if (activeTab !== 'all') {
      filtered = filtered.filter(s => s.status.toLowerCase() === activeTab)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.title.toLowerCase().includes(query) ||
          s.domain.toLowerCase().includes(query) ||
          s.language.toLowerCase().includes(query)
      )
    }

    setFilteredSubmissions(filtered)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      showToast('Please select a file', 'error')
      return
    }

    if (!formData.domain) {
      showToast('Please select a domain', 'error')
      return
    }

    if (!formData.language) {
      showToast('Please select a language', 'error')
      return
    }

    if (formData.language === 'Other' && !formData.customLanguage.trim()) {
      showToast('Please specify the language', 'error')
      return
    }

    setLoading(true)

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
      fetchSubmissions()
      showToast('✨ Task uploaded successfully!', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Upload failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteSubmission(id)
      fetchSubmissions()
      showToast('Task deleted successfully', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete submission', 'error')
    }
  }

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const { downloadUrl } = await apiClient.getDownloadURL(id)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up blob URL to prevent memory leaks
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100)

      showToast('Download started!', 'success')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to download file', 'error')
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
      REJECTED: 'bg-gradient-to-r from-red-500 to-pink-500 text-white',
    }
    return statusMap[status] || 'bg-gray-100 text-gray-800'
  }

  const getTabCount = (tab: StatusFilter) => {
    if (tab === 'all') return submissions.length
    return submissions.filter(s => s.status.toLowerCase() === tab).length
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading amazing content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Contributor Hub
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Welcome back, {user.name}!</p>
              </div>
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

        {/* Search Bar */}
        <div className="mb-8 animate-slide-up">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by title, domain, or language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium"
            />
            <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Status Filters */}
          <div className="flex gap-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-gray-700/50 overflow-x-auto">
            {(['all', 'pending', 'claimed', 'eligible', 'approved'] as StatusFilter[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 glow'
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} ({getTabCount(tab)})
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`px-6 py-3 rounded-2xl font-black text-sm transition-all duration-300 shadow-xl hover:scale-105 whitespace-nowrap ${
              showUpload
                ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 animate-pulse-glow'
            }`}
          >
            {showUpload ? 'Cancel' : 'Upload New Task'}
          </button>
        </div>

        {/* Upload Form */}
        {showUpload && (
          <div className="mb-8 bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-gray-700/50 animate-scale-in hover-lift">
            <h3 className="text-2xl font-black mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              ✨ Upload New Task
            </h3>
            <form onSubmit={handleUpload} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                  placeholder="Enter a descriptive title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">
                    Domain *
                  </label>
                  <select
                    required
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                  >
                    <option value="">Select domain...</option>
                    {DOMAINS.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">
                    Language *
                  </label>
                  <select
                    required
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value, customLanguage: '' })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                  >
                    <option value="">Select language...</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.language === 'Other' && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">
                    Specify Language *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customLanguage}
                    onChange={(e) => setFormData({ ...formData, customLanguage: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                    placeholder="e.g., Ruby, Swift, Kotlin"
                  />
                </div>
              )}

              <FileUpload
                label="Upload ZIP File *"
                accept=".zip"
                maxSize={50 * 1024 * 1024} // 50MB
                onFileSelect={(selectedFile) => setFile(selectedFile)}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black text-lg hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  '🚀 Upload Task'
                )}
              </button>
            </form>
          </div>
        )}

        {/* Submissions Grid */}
        <div className="space-y-6">
          {filteredSubmissions.length === 0 ? (
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-16 text-center border-2 border-gray-700/50 animate-scale-in">
              <div className="text-8xl mb-6 animate-bounce-subtle">📋</div>
              <p className="text-xl font-bold text-gray-200 mb-2">
                {searchQuery
                  ? 'No submissions match your search'
                  : activeTab === 'all'
                  ? 'No submissions yet'
                  : `No ${activeTab} submissions`}
              </p>
              <p className="text-gray-400 font-medium">
                {searchQuery ? 'Try a different search term' : 'Upload your first task to get started!'}
              </p>
            </div>
          ) : (
            <>
              {paginatedSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-xl p-4 md:p-6 border-2 border-gray-700/50 interactive-card animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 md:gap-4 mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg flex-shrink-0 glow">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-black text-white mb-2 break-words">
                          {submission.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                          <span>ID:</span>
                          <CopyToClipboard text={submission.id}>
                            <span className="font-mono text-gray-400">{submission.id.slice(0, 8)}...</span>
                          </CopyToClipboard>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-md glow">
                            {submission.domain}
                          </span>
                          <span className="px-3 md:px-4 py-1.5 md:py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl text-xs md:text-sm font-bold shadow-md glow">
                            {submission.language}
                          </span>
                        </div>
                        <p className="text-xs md:text-sm text-gray-400 mt-3 font-medium">
                          {new Date(submission.createdAt).toLocaleDateString()} at {new Date(submission.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <span className={`px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-black shadow-lg text-center ${getStatusClass(submission.status)}`}>
                      {submission.status}
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Tooltip text="Download submission file">
                        <button
                          onClick={() => handleDownload(submission.id, submission.fileName)}
                          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 font-bold text-sm shadow-md hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span className="hidden sm:inline">Download</span>
                        </button>
                      </Tooltip>
                      {submission.status !== 'APPROVED' && (
                        <Tooltip text="Delete this submission">
                          <button
                            onClick={() => handleDelete(submission.id, submission.title)}
                            className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-bold text-sm shadow-md hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reviews Section */}
                {submission.reviews && submission.reviews.length > 0 && (
                  <div className="mt-6 pt-6 border-t-2 border-gray-700">
                    <h4 className="text-sm font-black text-gray-200 mb-4 flex items-center gap-2">
                      <span className="text-2xl">💬</span> Reviewer Feedback
                    </h4>
                    <div className="space-y-3">
                      {submission.reviews.map((review) => (
                        <div key={review.id} className="bg-gray-900/50 backdrop-blur-sm p-5 rounded-2xl border-2 border-gray-700/50 shadow-md hover-lift">
                          <p className="text-sm text-gray-200 mb-3 font-medium leading-relaxed">{review.feedback}</p>
                          <p className="text-xs text-gray-400 font-bold flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {review.reviewer.name} • {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
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
      </div>
    </div>
  )
}
