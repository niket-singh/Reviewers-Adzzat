'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ToastContainer'
import Breadcrumb from '@/components/Breadcrumb'

interface Stats {
  // Project X stats
  totalSubmissions?: number
  eligibleSubmissions?: number
  approvedSubmissions?: number
  totalReviews?: number
  tasksClaimed?: number
  eligibleMarked?: number
  // Project V stats
  projectVTotal?: number
  projectVSubmitted?: number
  projectVApproved?: number
  projectVRejected?: number
  // Combined stats
  allProjectsTotal?: number
  allProjectsApproved?: number
}

interface ProfileData {
  user: {
    id: string
    name: string
    email: string
    role: string
    isApproved: boolean
    createdAt: string
    profilePictureUrl?: string
  }
  stats: Stats
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [uploadingPfp, setUploadingPfp] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  })
  const router = useRouter()
  const { user: authUser, loading: authLoading, logout } = useAuth()
  const { showToast } = useToast()

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/')
    } else if (authUser) {
      fetchProfile()
    }
  }, [authUser, authLoading, router])

  const fetchProfile = async () => {
    try {
      const data = await apiClient.getProfile()
      setProfileData(data)
      setFormData({ name: data.user.name, password: '', confirmPassword: '' })
      setLoading(false)
    } catch (err: any) {
      console.error('Failed to fetch profile:', err)
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password && formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    if (formData.password && formData.password.length < 6) {
      showToast('Password must be at least 6 characters', 'error')
      return
    }

    try {
      const updateData: { name?: string; password?: string } = {}

      if (formData.name !== profileData?.user.name) {
        updateData.name = formData.name
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      await apiClient.updateProfile(updateData)

      showToast('✨ Profile updated successfully!', 'success')
      setFormData({ ...formData, password: '', confirmPassword: '' })
      setEditing(false)
      fetchProfile()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Update failed', 'error')
    }
  }

  const handleLogout = async () => {
    await apiClient.logout()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast('Please enter your password', 'error')
      return
    }

    setDeleting(true)
    try {
      await apiClient.deleteMyAccount(deletePassword)
      showToast('Account deleted successfully', 'success')
      await logout()
      router.push('/')
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete account', 'error')
      setDeleting(false)
    }
  }

  const handlePfpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error')
      return
    }

    setUploadingPfp(true)
    try {
      const formData = new FormData()
      formData.append('profilePicture', file)

      await apiClient.updateProfile(formData)
      showToast('✨ Profile picture updated!', 'success')
      fetchProfile()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Upload failed', 'error')
    } finally {
      setUploadingPfp(false)
    }
  }

  const getRoleDashboard = (role: string) => {
    if (role === 'CONTRIBUTOR') return '/contributor'
    if (role === 'TESTER') return '/reviewer'
    if (role === 'ADMIN') return '/admin'
    return '/'
  }

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return 'from-red-600 via-orange-600 to-pink-600'
    if (role === 'TESTER') return 'from-purple-600 via-indigo-600 to-blue-600'
    return 'from-blue-600 via-indigo-600 to-purple-600'
  }


  if (authLoading || loading || !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const { user, stats } = profileData

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center shadow-xl animate-pulse-glow`}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Your Profile
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Manage your account settings</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3 animate-slide-in-right">
              <button
                onClick={() => router.push(getRoleDashboard(user.role))}
                className={`px-5 py-2.5 bg-gradient-to-r ${getRoleColor(user.role)} text-white rounded-xl hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl glow`}
              >
                Dashboard
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
                  router.push(getRoleDashboard(user.role))
                  setMobileMenuOpen(false)
                }}
                className={`w-full px-5 py-2.5 bg-gradient-to-r ${getRoleColor(user.role)} text-white rounded-xl transition-all duration-300 font-semibold shadow-md`}
              >
                Dashboard
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

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 relative z-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumb />

        {/* Profile Card */}
        <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-4 md:p-8 mb-8 border-2 border-gray-700/50 animate-slide-up hover-lift">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center shadow-2xl animate-pulse-glow flex-shrink-0 glow overflow-hidden`}>
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-black text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <label
                  htmlFor="pfp-upload"
                  className="absolute inset-0 bg-black bg-opacity-60 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                >
                  {uploadingPfp ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <input
                    id="pfp-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePfpUpload}
                    className="hidden"
                    disabled={uploadingPfp}
                  />
                </label>
              </div>

              {/* Info */}
              <div>
                <h2 className="text-3xl font-black text-white mb-2">{user.name}</h2>
                <p className="text-gray-400 mb-3 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.email}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-4 py-2 bg-gradient-to-r ${getRoleColor(user.role)} text-white rounded-xl text-sm font-black shadow-md`}>
                    {user.role}
                  </span>
                  {user.role === 'TESTER' && (
                    <span className={`px-4 py-2 rounded-xl text-sm font-black shadow-md ${
                      user.isApproved
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                        : 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                    }`}>
                      {user.isApproved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3 flex items-center gap-2 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setEditing(!editing)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 whitespace-nowrap ${
                editing
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                  : 'bg-gray-700/50 backdrop-blur-sm text-gray-200 hover:bg-gray-600/60 border-2 border-gray-600'
              }`}
            >
              {editing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>

          {/* Edit Form */}
          {editing && (
            <form onSubmit={handleUpdate} className="border-t-2 border-gray-700 pt-6 space-y-5 animate-slide-up">
              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              {formData.password && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                  />
                </div>
              )}

              <button
                type="submit"
                className={`w-full bg-gradient-to-r ${getRoleColor(user.role)} text-white py-4 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all duration-300 shadow-2xl`}
              >
                💾 Update Profile
              </button>
            </form>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-4 md:p-8 border-2 border-gray-700/50 animate-slide-up hover-lift" style={{ animationDelay: '0.1s' }}>
          <h3 className={`text-2xl font-black mb-6 bg-gradient-to-r ${getRoleColor(user.role)} bg-clip-text text-transparent flex items-center gap-2`}>
            <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Your Statistics - All Projects
          </h3>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-600 to-blue-700 backdrop-blur-sm rounded-2xl border-2 border-blue-500/50 hover-lift">
              <div className="text-5xl font-black text-white mb-2">{stats.allProjectsTotal || 0}</div>
              <div className="text-sm text-blue-100 font-bold">📊 Total Across All Projects</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-green-600 to-green-700 backdrop-blur-sm rounded-2xl border-2 border-green-500/50 hover-lift">
              <div className="text-5xl font-black text-white mb-2">{stats.allProjectsApproved || 0}</div>
              <div className="text-sm text-green-100 font-bold">✅ Total Approved</div>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-600 to-purple-700 backdrop-blur-sm rounded-2xl border-2 border-purple-500/50 hover-lift">
              <div className="text-5xl font-black text-white mb-2">{((stats.allProjectsApproved || 0) / (stats.allProjectsTotal || 1) * 100).toFixed(0)}%</div>
              <div className="text-sm text-purple-100 font-bold">🎯 Approval Rate</div>
            </div>
          </div>

          {/* Project X Stats */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <span className="text-2xl">X</span> Project X Stats
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {user.role === 'CONTRIBUTOR' && (
                <>
                  <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                    <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1">{stats.totalSubmissions || 0}</div>
                    <div className="text-xs text-gray-400 font-bold">Total Submissions</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                    <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-1">{stats.eligibleSubmissions || 0}</div>
                    <div className="text-xs text-gray-400 font-bold">Eligible</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                    <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">{stats.approvedSubmissions || 0}</div>
                    <div className="text-xs text-gray-400 font-bold">Approved</div>
                  </div>
                </>
              )}
              {user.role === 'TESTER' && (
                <>
                  <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                    <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-1">{stats.tasksClaimed || 0}</div>
                    <div className="text-xs text-gray-400 font-bold">Tasks Claimed</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                    <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1">{stats.totalReviews || 0}</div>
                    <div className="text-xs text-gray-400 font-bold">Total Reviews</div>
                  </div>
                  <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                    <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-1">{stats.eligibleMarked || 0}</div>
                    <div className="text-xs text-gray-400 font-bold">Marked Eligible</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Project V Stats */}
          <div>
            <h4 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
              <span className="text-2xl">V</span> Project V Stats
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <div className="text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-1">{stats.projectVTotal || 0}</div>
                <div className="text-xs text-gray-400 font-bold">Total Submissions</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <div className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-1">{stats.projectVSubmitted || 0}</div>
                <div className="text-xs text-gray-400 font-bold">Submitted</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-1">{stats.projectVApproved || 0}</div>
                <div className="text-xs text-gray-400 font-bold">Approved</div>
              </div>
              <div className="text-center p-4 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
                <div className="text-3xl font-black bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent mb-1">{stats.projectVRejected || 0}</div>
                <div className="text-xs text-gray-400 font-bold">Rejected</div>
              </div>
            </div>
          </div>

          {user.role === 'ADMIN' && (
            <div className="mt-6 text-center p-6 bg-gray-900/50 backdrop-blur-sm rounded-2xl border-2 border-gray-700/50 hover-lift">
              <div className="text-4xl mb-3">👑</div>
              <div className="text-lg font-bold text-gray-300">
                View detailed platform statistics in the Admin Dashboard
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone - Delete Account */}
        {user.role !== 'ADMIN' && (
          <div className="bg-red-900/20 backdrop-blur-xl rounded-3xl shadow-2xl p-4 md:p-8 mt-8 border-2 border-red-500/30 animate-slide-up hover-lift" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-2">
              <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Danger Zone
            </h3>
            <p className="text-gray-300 mb-6 font-medium">
              Once you delete your account, there is no going back. This will permanently delete all your data including submissions, reviews, and files.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-md hover:shadow-xl hover:scale-105"
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-4 animate-slide-up">
                <div className="bg-red-950/50 border-2 border-red-500/50 rounded-xl p-4">
                  <p className="text-red-300 font-bold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Are you absolutely sure? This action cannot be undone!
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-bold mb-2 text-gray-200">
                      Enter your password to confirm
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full px-5 py-4 rounded-xl border-2 border-red-500/50 bg-gray-900/50 text-white placeholder-gray-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all duration-300 font-medium"
                      disabled={deleting}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting || !deletePassword}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-300 font-bold shadow-md hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeletePassword('')
                      }}
                      disabled={deleting}
                      className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-all duration-300 font-bold shadow-md hover:shadow-xl disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
