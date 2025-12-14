'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ToastContainer'
import { apiClient } from '@/lib/api-client'
import Breadcrumb from '@/components/Breadcrumb'
import Pagination from '@/components/Pagination'
import CopyToClipboard from '@/components/CopyToClipboard'
import Tooltip from '@/components/Tooltip'

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
  reviews?: {
    id: string
    feedback: string
    accountPostedIn?: string
    tester: {
      name: string
    }
  }[]
}

type StatusFilter = 'claimed' | 'eligible' | 'reviewed'

export default function TesterDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [reviewedSubmissions, setReviewedSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [activeTab, setActiveTab] = useState<StatusFilter>('claimed')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [accountPostedIn, setAccountPostedIn] = useState('')
  const [isEligible, setIsEligible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuth()
  const { showToast } = useToast()

  // Redirect if not authenticated or not a reviewer
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    } else if (user && user.role !== 'TESTER') {
      router.push('/')
    } else if (user && !user.isApproved) {
      // Show waiting for approval message
    }
  }, [user, authLoading, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchSubmissions()
    fetchReviewedSubmissions()
    const interval = setInterval(() => {
      fetchSubmissions()
      fetchReviewedSubmissions()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  const fetchSubmissions = async () => {
    try {
      const data = await apiClient.getSubmissions()
      setSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    }
  }

  const fetchReviewedSubmissions = async () => {
    try {
      const data = await apiClient.getReviewedSubmissions()
      setReviewedSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching reviewed submissions:', err)
    }
  }

  const filterSubmissions = useCallback(() => {
    let filtered = activeTab === 'reviewed' ? reviewedSubmissions : submissions

    // Filter by status tab
    if (activeTab === 'claimed') {
      filtered = filtered.filter(s => s.status === 'CLAIMED')
    } else if (activeTab === 'eligible') {
      filtered = filtered.filter(s => s.status === 'ELIGIBLE')
    } else if (activeTab === 'reviewed') {
      // Already filtered to reviewed submissions
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
  }, [activeTab, reviewedSubmissions, submissions, searchQuery])

  useEffect(() => {
    filterSubmissions()
    setCurrentPage(1) // Reset to first page when filters change
  }, [filterSubmissions])

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

      showToast('Review submitted successfully!', 'success')
      setSelectedSubmission(null)
      setFeedback('')
      setAccountPostedIn('')
      setIsEligible(false)
      fetchSubmissions()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Error submitting feedback', 'error')
    } finally {
      setLoading(false)
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

        // Clean up blob URL to prevent memory leaks
        setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100)

        showToast('Download started!', 'success')
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to download file', 'error')
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const getTabCount = (tab: StatusFilter) => {
    if (tab === 'claimed') return submissions.filter(s => s.status === 'CLAIMED').length
    if (tab === 'eligible') return submissions.filter(s => s.status === 'ELIGIBLE').length
    if (tab === 'reviewed') return reviewedSubmissions.length
    return 0
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        <div className="flex items-center gap-3 text-gray-300">
          <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        {/* Animated Background Circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-purple-500"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-indigo-500" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="rounded-3xl shadow-2xl p-10 max-w-md backdrop-blur-2xl hover-lift animate-scale-in z-10 bg-gray-800/40 border-2 border-gray-700/50 glass-dark glow">
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bounce-subtle">⏳</div>
            <h2 className="text-3xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
              Pending Approval
            </h2>
            <p className="mb-8 text-lg text-gray-300">
              Your tester account is waiting for admin approval. You&apos;ll be able to review submissions once an admin approves your account.
            </p>
            <button
              onClick={handleLogout}
              className="px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white glow"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-purple-500"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-indigo-500" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 floating bg-blue-500" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Glassmorphic Header */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b shadow-lg bg-gray-800/40 border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse-glow bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600">
                <svg className="w-7 h-7 text-white animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
                  Tester Hub
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">
                  Welcome back, {user.name}
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => router.push('/profile')}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg bg-gray-700/50 text-gray-200 hover:bg-gray-600/60 backdrop-blur-lg"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 text-gray-300 hover:bg-gray-700/50 backdrop-blur-lg"
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
                className="w-full px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 shadow-lg bg-gray-700/50 text-gray-200 hover:bg-gray-600/60 backdrop-blur-lg"
              >
                Profile
              </button>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="w-full px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 text-gray-300 hover:bg-gray-700/50 backdrop-blur-lg"
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

        {/* Modern Search Bar */}
        <div className="mb-6 animate-slide-up">
          <div className="relative">
            <svg className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, domain, language, or contributor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:scale-[1.01] backdrop-blur-xl bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:glow"
            />
          </div>
        </div>

        {/* Glassmorphic Tabs */}
        <div className="flex gap-2 rounded-2xl p-1.5 mb-6 w-fit shadow-xl backdrop-blur-xl animate-slide-up bg-gray-800/40" style={{ animationDelay: '0.1s' }}>
          {(['claimed', 'eligible', 'reviewed'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg scale-105 glow'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({getTabCount(tab)})
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div className="rounded-3xl shadow-xl p-12 text-center backdrop-blur-2xl animate-scale-in bg-gray-800/40 border-2 border-gray-700/50">
              <div className="text-8xl mb-6 animate-bounce-subtle">📋</div>
              <p className="text-lg font-medium text-gray-300">
                {searchQuery
                  ? 'No submissions match your search.'
                  : `No ${activeTab} submissions. Tasks are automatically assigned to you.`}
              </p>
            </div>
          ) : (
            <>
              {paginatedSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className="rounded-3xl shadow-xl p-4 md:p-6 backdrop-blur-2xl interactive-card hover-lift border-2 animate-slide-up bg-gray-800/40 border-gray-700/50"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-black mb-2 text-white break-words">
                      {submission.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                      <span>ID:</span>
                      <CopyToClipboard text={submission.id}>
                        <span className="font-mono text-gray-400">{submission.id.slice(0, 8)}...</span>
                      </CopyToClipboard>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white glow">
                        {submission.domain}
                      </span>
                      <span className="px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-lg bg-gradient-to-r from-pink-600 to-purple-600 text-white glow">
                        {submission.language}
                      </span>
                      <span className="px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white glow">
                        by {submission.contributor.name}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm font-medium text-gray-400">
                      Submitted: {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 lg:ml-4">
                    <Tooltip text="Download submission file">
                      <button
                        onClick={() => handleDownload(submission.id, submission.fileName)}
                        className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white glow flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </Tooltip>
                    <Tooltip text="Submit review for this submission">
                      <button
                        onClick={() => setSelectedSubmission(submission.id)}
                        className="px-4 md:px-6 py-2.5 md:py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white glow flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="hidden sm:inline">Review</span>
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {submission.reviews && submission.reviews.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-bold mb-3 text-gray-300">
                      Previous Reviews
                    </h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-2xl mb-2 backdrop-blur-lg bg-gray-900/50">
                        <p className="text-sm mb-2 text-gray-200">
                          {review.feedback}
                        </p>
                        {review.accountPostedIn && (
                          <p className="text-xs mb-1 text-gray-400">
                            Account: <span className="font-bold">{review.accountPostedIn}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          by {review.tester.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback Form */}
                {selectedSubmission === submission.id && (
                  <form onSubmit={handleSubmitFeedback} className="mt-4 pt-4 border-t animate-slide-up border-gray-700">
                    <h4 className="text-lg font-black mb-4 text-white">
                      Submit Review
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-2.5 text-gray-200">
                          Feedback *
                        </label>
                        <textarea
                          required
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                          className="w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.01] bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:glow"
                          placeholder="Provide detailed feedback about the submission..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold mb-2.5 text-gray-200">
                          Account Posted In (Optional)
                        </label>
                        <input
                          type="text"
                          value={accountPostedIn}
                          onChange={(e) => setAccountPostedIn(e.target.value)}
                          className="w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.01] bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:glow"
                          placeholder="e.g., @username or account URL"
                        />
                        <p className="text-xs mt-2 text-gray-500">
                          Visible only to admins
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="eligible"
                          checked={isEligible}
                          onChange={(e) => setIsEligible(e.target.checked)}
                          className="w-5 h-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded transition-all"
                        />
                        <label htmlFor="eligible" className="text-sm font-bold text-gray-200">
                          Mark as eligible for approval
                        </label>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl ${
                            loading
                              ? 'bg-gray-400 cursor-not-allowed opacity-50'
                              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white glow'
                          }`}
                        >
                          {loading ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Submitting...
                            </span>
                          ) : (
                            'Submit Review'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubmission(null)
                            setFeedback('')
                            setAccountPostedIn('')
                            setIsEligible(false)
                          }}
                          className="px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 bg-gray-700/50 text-gray-200 hover:bg-gray-600/60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
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
