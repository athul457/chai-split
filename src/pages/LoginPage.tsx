import React, { useState } from 'react'
import { Coffee, ArrowLeft, LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import type { PageRoute } from '../types'
import { useAuth } from '../context/AuthContext'

interface LoginPageProps {
  onNavigate: (page: PageRoute) => void
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setLoading(true)
    const result = await login(email, password)
    setLoading(false)

    if (result.success) {
      onNavigate('dashboard')
    } else {
      setError(result.error || 'Failed to log in.')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/30 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-xl shadow-amber-950/5 border border-stone-200/80 dark:border-stone-800 p-6 sm:p-8 space-y-6">
        
        {/* Back Link */}
        <button
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 shadow-sm">
            <Coffee className="w-6 h-6 animate-steam" />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400">
            Log in to manage your office tea &amp; lunch expenses
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="login-email">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="johndoe@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300" htmlFor="login-password">
                Password
              </label>
              <span className="text-[11px] text-amber-700 dark:text-amber-400">Demo (any password)</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            id="login-submit-btn"
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-700 active:scale-98 text-white shadow-md shadow-amber-600/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Logging in...' : 'Log In to Dashboard'}</span>
          </button>
        </form>



        {/* Bottom Switch Link */}
        <div className="text-center text-xs text-stone-500 dark:text-stone-400">
          Don&apos;t have an account yet?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
          >
            Register here
          </button>
        </div>

      </div>
    </div>
  )
}
