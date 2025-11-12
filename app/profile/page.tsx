'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { apiClient } from '@/lib/api-client'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const { user: authUser, loading: authLoading } = useAuth()

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
    setError('')
    setSuccess('')

    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters')
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

      setSuccess('Profile updated successfully!')
      setFormData({ ...formData, password: '', confirmPassword: '' })
      setEditing(false)
      fetchProfile()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed')
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

  if (authLoading || loading || !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  const { user, stats } = profileData

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Profile</h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(getRoleDashboard(user.role))}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{user.name}</h2>
              <p className="text-gray-600 mb-1">{user.email}</p>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    user.role === 'ADMIN'
                      ? 'bg-red-100 text-red-800'
                      : user.role === 'REVIEWER'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {user.role}
                </span>
                {user.role === 'REVIEWER' && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      user.isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {user.isApproved ? 'Approved' : 'Pending Approval'}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>

          {editing && (
            <form onSubmit={handleUpdate} className="border-t pt-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              {formData.password && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
              )}

              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{success}</div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Update Profile
              </button>
            </form>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Your Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {user.role === 'CONTRIBUTOR' && (
              <>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalSubmissions || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Submissions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {stats.eligibleSubmissions || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Eligible</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {stats.approvedSubmissions || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Approved</div>
                </div>
              </>
            )}

            {user.role === 'REVIEWER' && (
              <>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{stats.tasksClaimed || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Tasks Claimed</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalReviews || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Total Reviews</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{stats.eligibleMarked || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Marked Eligible</div>
                </div>
              </>
            )}

            {user.role === 'ADMIN' && (
              <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg">
                <div className="text-lg text-gray-600">
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
