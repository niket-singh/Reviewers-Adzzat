'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ToastContainer'

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'CONTRIBUTOR',
  })
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, login, signup } = useAuth()
  const { showToast } = useToast()

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      // Redirect to project selection page
      router.push('/select-project')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (isSignUp) {
        await signup(formData.email, formData.password, formData.name, formData.role)

        // Check if reviewer - they need approval
        if (formData.role === 'REVIEWER') {
          showToast('Account created! Waiting for admin approval.', 'success')
          setSubmitting(false)
          return
        }
        showToast('Account created successfully!', 'success')
      } else {
        await login(formData.email, formData.password)
        showToast('Welcome back!', 'success')
      }

      // The useEffect will handle redirect
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Something went wrong'
      showToast(errorMessage, 'error')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-blue-500"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-purple-500" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 floating bg-pink-500" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="rounded-3xl shadow-2xl p-10 w-full max-w-md backdrop-blur-2xl transition-all duration-500 hover-lift animate-scale-in z-10 bg-gray-800/40 border-2 border-gray-700/50 glass-dark glow">
        {/* Logo/Brand */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl animate-pulse-glow bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
            <svg className="w-10 h-10 text-white animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            Reviewers-Adzzat
          </h1>
          <p className="text-sm font-medium text-gray-300">
            ✨ Task Submission & Review Platform ✨
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex mb-8 rounded-2xl p-1.5 shadow-inner bg-gray-900/50">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${
              !isSignUp
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 glow'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${
              isSignUp
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 glow'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div className="animate-slide-up">
              <label className="block text-sm font-bold mb-2.5 text-gray-200">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow"
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <label className="block text-sm font-bold mb-2.5 text-gray-200">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow"
              placeholder="your.email@example.com"
            />
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <label className="block text-sm font-bold mb-2.5 text-gray-200">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-5 py-4 pr-14 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow"
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-all duration-300 hover:scale-110 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {isSignUp && (
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <label className="block text-sm font-bold mb-2.5 text-gray-200">
                I am a
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 border-gray-700 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow"
              >
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="REVIEWER">Reviewer</option>
              </select>
              {formData.role === 'REVIEWER' && (
                <p className="text-xs mt-3 flex items-center gap-2 text-gray-400">
                  <span className="text-yellow-500">⚠️</span>
                  Reviewer accounts require admin approval
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || authLoading}
            className={`w-full py-4 rounded-xl font-black text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl mt-8 ${
              submitting || authLoading
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white animate-pulse-glow'
            }`}
          >
            {submitting || authLoading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Please wait...
              </span>
            ) : (
              <>
                {isSignUp ? '✨ Create Account' : '🚀 Sign In'}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-300">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="font-bold underline-offset-4 hover:underline transition-all text-blue-400 hover:text-blue-300"
          >
            {isSignUp ? 'Sign in now' : 'Sign up now'}
          </button>
        </div>
      </div>
    </div>
  )
}
