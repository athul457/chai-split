import React from 'react'
import { ArrowRight, LogIn, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import type { PageRoute } from '../types'

interface LandingPageProps {
  onNavigate: (page: PageRoute) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-4rem)] justify-between px-4 py-4 text-center">
      {/* Vertically Centered Hero Container */}
      <div className="flex-1 flex flex-col items-center justify-center w-full my-auto py-4">
        <section className="w-full max-w-sm flex flex-col items-center justify-center space-y-5">
          
          {/* Subtle internal tool tag */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] font-semibold shadow-xs">
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Internal Team App • Tea &amp; Lunch Khata</span>
          </div>

          {/* Hero Headline */}
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100 leading-tight">
            Split the bill. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700">
              Not the headache.
            </span>{' '}
            <span>☕</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-xs font-normal leading-relaxed">
            Easily manage your office tea, lunch and group expenses.
          </p>

          {/* Primary CTA Section */}
          <div className="flex flex-col gap-2.5 w-full pt-1">
            <button
              onClick={() => onNavigate('register')}
              id="hero-get-started-btn"
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-700 active:scale-98 text-white shadow-md shadow-amber-600/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('login')}
              id="hero-login-btn"
              className="w-full py-2.5 px-3 rounded-xl font-medium text-xs text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-amber-50/50 dark:hover:bg-stone-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5 text-stone-500" />
              <span>Sign In to Existing Account</span>
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200/60 dark:border-stone-800/80 pt-3 text-[11px] text-stone-400 flex items-center justify-between">
        <span>Nibru-Tea • Office Khata</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer flex items-center gap-1 transition-colors"
            title={isDark ? 'Switch to White Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
            <span>{isDark ? 'White' : 'Dark'}</span>
          </button>
          <span>•</span>
          <button onClick={() => onNavigate('login')} className="hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer">
            Login
          </button>
          <span>•</span>
          <button onClick={() => onNavigate('register')} className="hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer">
            Register
          </button>
        </div>
      </footer>
    </div>
  )
}
