'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ToastContainer'
import { apiClient } from '@/lib/api-client'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      
      emailSchema.parse({ email })

      
      await apiClient.requestPasswordReset(email)

      setEmailSent(true)
      showToast('Password reset link sent! Check your email.', 'success')
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        showToast(error.issues[0].message, 'error')
      } else {
        
        setEmailSent(true)
        showToast('If an account exists, you will receive a reset link.', 'info')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-blue-500"></div>
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 floating bg-purple-500"
          style={{ animationDelay: '1s' }}
        ></div>
        <div
          className="absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-3xl opacity-20 floating bg-pink-500"
          style={{ animationDelay: '2s' }}
        ></div>
      </div>

      <div className="rounded-3xl shadow-2xl p-10 w-full max-w-md backdrop-blur-2xl transition-all duration-500 hover-lift animate-scale-in z-10 bg-gray-800/40 border-2 border-gray-700/50 glass-dark glow">
        {!emailSent ? (
          <>

            <div className="text-center mb-8 animate-slide-up">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl animate-pulse-glow bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
                <svg
                  className="w-10 h-10 text-white animate-bounce-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                Forgot Password?
              </h1>
              <p className="text-sm font-medium text-gray-300">
                No worries! Enter your email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="animate-slide-up">
                <label className="block text-sm font-bold mb-2.5 text-gray-200">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 rounded-xl border-2 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:glow"
                  placeholder="your.email@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 rounded-xl font-black text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-2xl ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white animate-pulse-glow'
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending...
                  </span>
                ) : (
                  '✉️ Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-300">
              Remember your password?{' '}
              <Link
                href="/"
                className="font-bold underline-offset-4 hover:underline transition-all text-blue-400 hover:text-blue-300"
              >
                Sign in
              </Link>
            </div>
          </>
        ) : (
          
          <div className="text-center animate-scale-in">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 shadow-2xl bg-green-500/20 animate-pulse-glow">
              <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black mb-4 text-white">Check Your Email!</h2>
            <p className="text-gray-300 mb-2">
              We&apos;ve sent a password reset link to:
            </p>
            <p className="text-blue-400 font-bold mb-6 break-all">{email}</p>
            <p className="text-sm text-gray-400 mb-8">
              The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Return to Login
              </button>
              <button
                onClick={() => setEmailSent(false)}
                className="w-full px-6 py-3 bg-gray-700/50 text-gray-200 font-bold rounded-xl hover:bg-gray-600/60 transition-all duration-300"
              >
                Resend Email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
