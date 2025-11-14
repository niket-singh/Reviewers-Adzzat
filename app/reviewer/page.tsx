'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { useToast } from '@/components/ToastContainer'
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
  reviews?: {
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
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()

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
      const downloadUrl = await apiClient.getDownloadURL(submissionId)

      if (downloadUrl) {
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('Download started!', 'success')
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Download error', 'error')
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
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900'
          : 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50'
      }`}>
        <div className={`flex items-center gap-3 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
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
      <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900'
          : 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50'
      }`}>
        {/* Animated Background Circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating ${
            theme === 'dark' ? 'bg-purple-500' : 'bg-purple-300'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating ${
            theme === 'dark' ? 'bg-indigo-500' : 'bg-indigo-300'
          }`} style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`fixed top-6 right-6 p-4 rounded-2xl transition-all duration-500 hover:scale-110 hover:rotate-180 z-50 ${
            theme === 'dark'
              ? 'bg-gray-800/80 text-yellow-400 hover:bg-gray-700 glow backdrop-blur-lg'
              : 'bg-white/80 text-gray-700 hover:bg-gray-100 shadow-2xl backdrop-blur-lg'
          }`}
        >
          {theme === 'dark' ? (
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        <div className={`rounded-3xl shadow-2xl p-10 max-w-md backdrop-blur-2xl hover-lift animate-scale-in z-10 ${
          theme === 'dark'
            ? 'bg-gray-800/40 border-2 border-gray-700/50 glass-dark glow'
            : 'bg-white/60 border-2 border-white/50 glass shadow-xl'
        }`}>
          <div className="text-center">
            <div className="text-8xl mb-6 animate-bounce-subtle">⏳</div>
            <h2 className={`text-3xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r ${
              theme === 'dark'
                ? 'from-purple-400 via-indigo-400 to-blue-400'
                : 'from-purple-600 via-indigo-600 to-blue-600'
            }`}>
              Pending Approval
            </h2>
            <p className={`mb-8 text-lg ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Your reviewer account is waiting for admin approval. You'll be able to review submissions once an admin approves your account.
            </p>
            <button
              onClick={handleLogout}
              className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white glow'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white hover:shadow-2xl'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen relative overflow-hidden ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900'
        : 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50'
    }`}>
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating ${
          theme === 'dark' ? 'bg-purple-500' : 'bg-purple-300'
        }`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating ${
          theme === 'dark' ? 'bg-indigo-500' : 'bg-indigo-300'
        }`} style={{ animationDelay: '1s' }}></div>
        <div className={`absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 floating ${
          theme === 'dark' ? 'bg-blue-500' : 'bg-blue-300'
        }`} style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 p-4 rounded-2xl transition-all duration-500 hover:scale-110 hover:rotate-180 z-50 ${
          theme === 'dark'
            ? 'bg-gray-800/80 text-yellow-400 hover:bg-gray-700 glow backdrop-blur-lg'
            : 'bg-white/80 text-gray-700 hover:bg-gray-100 shadow-2xl backdrop-blur-lg'
        }`}
      >
        {theme === 'dark' ? (
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Glassmorphic Header */}
      <nav className={`sticky top-0 z-40 backdrop-blur-xl border-b shadow-lg ${
        theme === 'dark'
          ? 'bg-gray-800/40 border-gray-700/50'
          : 'bg-white/80 border-white/50'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl animate-pulse-glow ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600'
                : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600'
            }`}>
              <svg className="w-7 h-7 text-white animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${
                theme === 'dark'
                  ? 'from-purple-400 via-indigo-400 to-blue-400'
                  : 'from-purple-600 via-indigo-600 to-blue-600'
              }`}>
                Reviewer Hub
              </h1>
              <p className={`text-sm font-medium ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Welcome back, {user.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/profile')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg ${
                theme === 'dark'
                  ? 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/60 backdrop-blur-lg'
                  : 'bg-white/80 text-gray-700 hover:bg-white shadow-xl backdrop-blur-lg'
              }`}
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700/50 backdrop-blur-lg'
                  : 'text-gray-700 hover:bg-gray-100/80 backdrop-blur-lg'
              }`}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Modern Search Bar */}
        <div className="mb-6 animate-slide-up">
          <div className="relative">
            <svg className={`absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by title, domain, language, or contributor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-14 pr-6 py-4 rounded-2xl border-2 transition-all duration-300 focus:scale-[1.01] backdrop-blur-xl ${
                theme === 'dark'
                  ? 'bg-gray-800/40 border-gray-700/50 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:glow'
                  : 'bg-white/60 border-white/50 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:shadow-xl'
              }`}
            />
          </div>
        </div>

        {/* Glassmorphic Tabs */}
        <div className={`flex gap-2 rounded-2xl p-1.5 mb-6 w-fit shadow-xl backdrop-blur-xl animate-slide-up ${
          theme === 'dark' ? 'bg-gray-800/40' : 'bg-white/60'
        }`} style={{ animationDelay: '0.1s' }}>
          {(['claimed', 'eligible'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeTab === tab
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-lg scale-105 glow'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl scale-105'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({getTabCount(tab)})
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <div className={`rounded-3xl shadow-xl p-12 text-center backdrop-blur-2xl animate-scale-in ${
              theme === 'dark'
                ? 'bg-gray-800/40 border-2 border-gray-700/50'
                : 'bg-white/60 border-2 border-white/50'
            }`}>
              <div className="text-8xl mb-6 animate-bounce-subtle">📋</div>
              <p className={`text-lg font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {searchQuery
                  ? 'No submissions match your search.'
                  : `No ${activeTab} submissions. Tasks are automatically assigned to you.`}
              </p>
            </div>
          ) : (
            filteredSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className={`rounded-3xl shadow-xl p-6 backdrop-blur-2xl interactive-card hover-lift border-2 animate-slide-up ${
                  theme === 'dark'
                    ? 'bg-gray-800/40 border-gray-700/50'
                    : 'bg-white/60 border-white/50'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className={`text-xl font-black mb-3 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {submission.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white glow'
                          : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white'
                      }`}>
                        {submission.domain}
                      </span>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white glow'
                          : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                      }`}>
                        {submission.language}
                      </span>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white glow'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      }`}>
                        by {submission.contributor.name}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Submitted: {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleDownload(submission.id, submission.fileName)}
                      className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white glow'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white hover:shadow-xl'
                      }`}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => setSelectedSubmission(submission.id)}
                      className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white glow'
                          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:shadow-xl'
                      }`}
                    >
                      Review
                    </button>
                  </div>
                </div>

                {submission.reviews && submission.reviews.length > 0 && (
                  <div className={`mt-4 pt-4 border-t ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <h4 className={`text-sm font-bold mb-3 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Previous Reviews
                    </h4>
                    {submission.reviews.map((review) => (
                      <div key={review.id} className={`p-4 rounded-2xl mb-2 backdrop-blur-lg ${
                        theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100/80'
                      }`}>
                        <p className={`text-sm mb-2 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          {review.feedback}
                        </p>
                        {review.accountPostedIn && (
                          <p className={`text-xs mb-1 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Account: <span className="font-bold">{review.accountPostedIn}</span>
                          </p>
                        )}
                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          by {review.reviewer.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback Form */}
                {selectedSubmission === submission.id && (
                  <form onSubmit={handleSubmitFeedback} className={`mt-4 pt-4 border-t animate-slide-up ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <h4 className={`text-lg font-black mb-4 ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      Submit Review
                    </h4>

                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-bold mb-2.5 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                        }`}>
                          Feedback *
                        </label>
                        <textarea
                          required
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                          className={`w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.01] ${
                            theme === 'dark'
                              ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:glow'
                              : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:shadow-xl'
                          }`}
                          placeholder="Provide detailed feedback about the submission..."
                        />
                      </div>

                      <div>
                        <label className={`block text-sm font-bold mb-2.5 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                        }`}>
                          Account Posted In (Optional)
                        </label>
                        <input
                          type="text"
                          value={accountPostedIn}
                          onChange={(e) => setAccountPostedIn(e.target.value)}
                          className={`w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.01] ${
                            theme === 'dark'
                              ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:glow'
                              : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 focus:shadow-xl'
                          }`}
                          placeholder="e.g., @username or account URL"
                        />
                        <p className={`text-xs mt-2 ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
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
                        <label htmlFor="eligible" className={`text-sm font-bold ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                        }`}>
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
                              : theme === 'dark'
                              ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white glow'
                              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 text-white hover:shadow-2xl'
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
                          className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 hover:scale-105 ${
                            theme === 'dark'
                              ? 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/60'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
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
