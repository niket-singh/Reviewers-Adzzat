'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/components/ToastContainer'

interface Stats {
  totalSubmissions?: number
  eligibleSubmissions?: number
  approvedSubmissions?: number
  totalReviews?: number
  tasksClaimed?: number
  eligibleMarked?: number
}

interface ProfileData {
  user: {
    id: string
    name: string
    email: string
    role: string
    isApproved: boolean
    createdAt: string
  }
  stats: Stats
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  })
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()
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

  const getRoleDashboard = (role: string) => {
    if (role === 'CONTRIBUTOR') return '/contributor'
    if (role === 'REVIEWER') return '/reviewer'
    if (role === 'ADMIN') return '/admin'
    return '/'
  }

  const getRoleColor = (role: string) => {
    if (role === 'ADMIN') return 'from-red-600 via-orange-600 to-pink-600'
    if (role === 'REVIEWER') return 'from-purple-600 via-indigo-600 to-blue-600'
    return 'from-blue-600 via-indigo-600 to-purple-600'
  }

  const getRoleGradient = (role: string) => {
    if (role === 'ADMIN') return 'bg-gradient-to-br from-red-50 via-orange-50 to-pink-50'
    if (role === 'REVIEWER') return 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50'
    return 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
  }

  const getCircleColors = (role: string) => {
    if (role === 'ADMIN') return ['bg-red-300', 'bg-orange-300', 'bg-pink-300']
    if (role === 'REVIEWER') return ['bg-purple-300', 'bg-indigo-300', 'bg-blue-300']
    return ['bg-blue-300', 'bg-indigo-300', 'bg-purple-300']
  }

  if (authLoading || loading || !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-700">Loading your profile...</p>
        </div>
      </div>
    )
  }

  const { user, stats } = profileData
  const colors = getCircleColors(user.role)

  return (
    <div className={`min-h-screen ${getRoleGradient(user.role)} relative overflow-hidden`}>
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 ${colors[0]} rounded-full blur-3xl opacity-20 floating`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 ${colors[1]} rounded-full blur-3xl opacity-20 floating`} style={{ animationDelay: '1s' }}></div>
        <div className={`absolute top-1/2 right-1/3 w-72 h-72 ${colors[2]} rounded-full blur-3xl opacity-20 floating`} style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="backdrop-blur-xl bg-white/80 border-b border-white/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center shadow-xl animate-pulse-glow`}>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h1 className={`text-2xl font-black bg-gradient-to-r ${getRoleColor(user.role)} bg-clip-text text-transparent`}>
                  Your Profile
                </h1>
                <p className="text-sm font-medium text-gray-600">Manage your account settings ⚙️</p>
              </div>
            </div>
            <div className="flex gap-3 animate-slide-in-right">
              <button
                onClick={() => router.push(getRoleDashboard(user.role))}
                className={`px-5 py-2.5 bg-gradient-to-r ${getRoleColor(user.role)} text-white rounded-xl hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl`}
              >
                🏠 Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8 relative z-10">
        {/* Profile Card */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border-2 border-white/50 animate-slide-up hover-lift">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center shadow-2xl animate-pulse-glow flex-shrink-0`}>
                <span className="text-4xl font-black text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">{user.name}</h2>
                <p className="text-gray-600 mb-3 font-medium flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.email}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-4 py-2 bg-gradient-to-r ${getRoleColor(user.role)} text-white rounded-xl text-sm font-black shadow-md`}>
                    {user.role}
                  </span>
                  {user.role === 'REVIEWER' && (
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
                  : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white border-2 border-gray-200'
              }`}
            >
              {editing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>

          {/* Edit Form */}
          {editing && (
            <form onSubmit={handleUpdate} className="border-t-2 border-gray-200 pt-6 space-y-5 animate-slide-up">
              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 transition-all duration-300 focus:scale-[1.02] bg-white/80 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-700">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 transition-all duration-300 focus:scale-[1.02] bg-white/80 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              {formData.password && (
                <div className="animate-slide-up">
                  <label className="block text-sm font-bold mb-2.5 text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 transition-all duration-300 focus:scale-[1.02] bg-white/80 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-medium"
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
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-white/50 animate-slide-up hover-lift" style={{ animationDelay: '0.1s' }}>
          <h3 className={`text-2xl font-black mb-6 bg-gradient-to-r ${getRoleColor(user.role)} bg-clip-text text-transparent flex items-center gap-2`}>
            <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Your Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {user.role === 'CONTRIBUTOR' && (
              <>
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                  <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">{stats.totalSubmissions || 0}</div>
                  <div className="text-sm text-gray-600 font-bold">📝 Total Submissions</div>
                </div>
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                  <div className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">{stats.eligibleSubmissions || 0}</div>
                  <div className="text-sm text-gray-600 font-bold">✓ Eligible</div>
                </div>
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                  <div className="text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">{stats.approvedSubmissions || 0}</div>
                  <div className="text-sm text-gray-600 font-bold">🌟 Approved</div>
                </div>
              </>
            )}

            {user.role === 'REVIEWER' && (
              <>
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                  <div className="text-5xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">{stats.tasksClaimed || 0}</div>
                  <div className="text-sm text-gray-600 font-bold">📌 Tasks Claimed</div>
                </div>
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                  <div className="text-5xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">{stats.totalReviews || 0}</div>
                  <div className="text-sm text-gray-600 font-bold">💬 Total Reviews</div>
                </div>
                <div className="text-center p-6 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                  <div className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">{stats.eligibleMarked || 0}</div>
                  <div className="text-sm text-gray-600 font-bold">✅ Marked Eligible</div>
                </div>
              </>
            )}

            {user.role === 'ADMIN' && (
              <div className="col-span-full text-center p-10 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-white/50 hover-lift">
                <div className="text-6xl mb-4">👑</div>
                <div className="text-xl font-bold text-gray-700">
                  View platform statistics in the Admin Dashboard
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
