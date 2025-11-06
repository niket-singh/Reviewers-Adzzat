'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Stats {
  totalSubmissions?: number
  eligibleSubmissions?: number
  approvedSubmissions?: number
  totalReviews?: number
  tasksClaimed?: number
  eligibleMarked?: number
}

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (!res.ok) {
        router.push('/')
        return
      }
      const data = await res.json()
      setUser(data.user)
      setStats(data.stats || {})
      setFormData({ ...formData, name: data.user.name })
      setLoading(false)
    } catch (err) {
      router.push('/')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          currentPassword: formData.currentPassword || undefined,
          newPassword: formData.newPassword || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Update failed')
        return
      }

      setSuccess('Profile updated successfully!')
      setUser(data.user)
      setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' })
      setEditing(false)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Network error. Please try again.')
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const goToDashboard = () => {
    if (user?.role === 'CONTRIBUTOR') router.push('/contributor')
    else if (user?.role === 'REVIEWER') router.push('/reviewer')
    else if (user?.role === 'ADMIN') router.push('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToDashboard}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Dashboard
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-500 uppercase">Role</div>
            <div className="mt-2 text-2xl font-bold text-gray-800">{user?.role}</div>
          </div>

          {user?.role === 'CONTRIBUTOR' && (
            <>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Submissions</div>
                <div className="mt-2 text-2xl font-bold text-gray-800">{stats.totalSubmissions || 0}</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Approved Tasks</div>
                <div className="mt-2 text-2xl font-bold text-gray-800">{stats.approvedSubmissions || 0}</div>
              </div>
            </>
          )}

          {(user?.role === 'REVIEWER' || user?.role === 'ADMIN') && (
            <>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Total Reviews</div>
                <div className="mt-2 text-2xl font-bold text-gray-800">{stats.totalReviews || 0}</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="text-sm font-medium text-gray-500 uppercase">Tasks Claimed</div>
                <div className="mt-2 text-2xl font-bold text-gray-800">{stats.tasksClaimed || 0}</div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Profile Information</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Edit Profile
              </button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
                <div className="text-lg text-gray-800">{user?.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <div className="text-lg text-gray-800">{user?.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Member Since</label>
                <div className="text-lg text-gray-800">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password (Optional)</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                  {success}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setError('')
                    setSuccess('')
                    setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
