'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-context'
import { useToast } from '@/components/ToastContainer'

export default function Home() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'CONTRIBUTOR',
  })
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading, login, signup } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const role = user.role
      if (role === 'CONTRIBUTOR') {
        router.push('/contributor')
      } else if (role === 'REVIEWER') {
        router.push('/reviewer')
      } else if (role === 'ADMIN') {
        router.push('/admin')
      }
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
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900'
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating ${
          theme === 'dark' ? 'bg-blue-500' : 'bg-blue-300'
        }`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating ${
          theme === 'dark' ? 'bg-purple-500' : 'bg-purple-300'
        }`} style={{ animationDelay: '1s' }}></div>
        <div className={`absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 floating ${
          theme === 'dark' ? 'bg-pink-500' : 'bg-pink-300'
        }`} style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 p-4 rounded-2xl transition-all duration-500 hover:scale-110 hover:rotate-180 z-50 ${
          theme === 'dark'
            ? 'bg-gray-800/80 text-yellow-400 hover:bg-gray-700 glow backdrop-blur-lg'
            : 'bg-white/80 text-gray-700 hover:bg-gray-100 shadow-2xl backdrop-blur-lg'
        }`}
        aria-label="Toggle theme"
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

      <div className={`rounded-3xl shadow-2xl p-10 w-full max-w-md backdrop-blur-2xl transition-all duration-500 hover-lift animate-scale-in z-10 ${
        theme === 'dark'
          ? 'bg-gray-800/40 border-2 border-gray-700/50 glass-dark glow'
          : 'bg-white/60 border-2 border-white/50 glass shadow-xl'
      }`}>
        {/* Logo/Brand */}
        <div className="text-center mb-10 animate-slide-up">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl animate-pulse-glow ${
            theme === 'dark'
              ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500'
              : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'
          }`}>
            <svg className="w-10 h-10 text-white animate-bounce-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className={`text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r ${
            theme === 'dark'
              ? 'from-blue-400 via-purple-400 to-pink-400'
              : 'from-blue-600 via-indigo-600 to-purple-600'
          }`}>
            Reviewers-Adzzat
          </h1>
          <p className={`text-sm font-medium ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            ✨ Task Submission & Review Platform ✨
          </p>
        </div>

        {/* Tab Switcher */}
        <div className={`flex mb-8 rounded-2xl p-1.5 shadow-inner ${
          theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-100'
        }`}>
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${
              !isSignUp
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 glow'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                : theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-3 rounded-xl transition-all duration-300 font-bold text-sm ${
              isSignUp
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105 glow'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                : theme === 'dark'
                ? 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div className="animate-slide-up">
              <label className={`block text-sm font-bold mb-2.5 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow'
                    : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:shadow-xl'
                }`}
                placeholder="Enter your full name"
              />
            </div>
          )}

          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <label className={`block text-sm font-bold mb-2.5 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow'
                  : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:shadow-xl'
              }`}
              placeholder="your.email@example.com"
            />
          </div>

          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <label className={`block text-sm font-bold mb-2.5 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
            }`}>
              Password
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={`w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] ${
                theme === 'dark'
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow'
                  : 'bg-white/80 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:shadow-xl'
              }`}
              placeholder="••••••••••"
            />
          </div>

          {isSignUp && (
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <label className={`block text-sm font-bold mb-2.5 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>
                I am a
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className={`w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] ${
                  theme === 'dark'
                    ? 'bg-gray-900/50 border-gray-700 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow'
                    : 'bg-white/80 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:shadow-xl'
                }`}
              >
                <option value="CONTRIBUTOR">Contributor</option>
                <option value="REVIEWER">Reviewer</option>
              </select>
              {formData.role === 'REVIEWER' && (
                <p className={`text-xs mt-3 flex items-center gap-2 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
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
                : theme === 'dark'
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white animate-pulse-glow'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white hover:shadow-3xl'
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
        <div className={`mt-8 text-center text-sm ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className={`font-bold underline-offset-4 hover:underline transition-all ${
              theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {isSignUp ? 'Sign in now' : 'Sign up now'}
          </button>
        </div>
      </div>
    </div>
  )
}
