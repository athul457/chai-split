import React, { useState } from 'react'
import { Coffee } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ProfileDropdown } from './ProfileDropdown'
import type { PageRoute } from '../types'

interface HeaderProps {
  currentPage: PageRoute
  onNavigate: (page: PageRoute) => void
}

export const Header: React.FC<HeaderProps> = ({ currentPage: _currentPage, onNavigate }) => {
  const { user, isAuthenticated } = useAuth()
  const [showProfile, setShowProfile] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/90 dark:bg-stone-900/90 border-b border-amber-900/10 dark:border-stone-800 transition-colors pt-3">
      <div className="w-full px-5 sm:px-6 h-14 flex items-center justify-between relative">
        {/* Left: Logo + App Name */}
        <button
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
          id="nav-logo-btn"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-sm group-hover:scale-105 transition-transform">
            <Coffee className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-heading text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-amber-700 transition-colors">
              Nibru-Tea
            </span>
            <span className="text-xs">☕</span>
          </div>
        </button>

        {/* Right: Actions (Only shown when authenticated on dashboard) */}
        {isAuthenticated && user && (
          <div className="relative flex items-center">
            {/* User Avatar Button (Toggles Profile Popup) */}
            <button
              onClick={() => setShowProfile(prev => !prev)}
              id="header-profile-btn"
              title={`${user.name} (Click to view profile)`}
              className={`flex items-center gap-1.5 p-1 rounded-full transition-all cursor-pointer ${
                showProfile
                  ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-stone-900'
                  : 'hover:opacity-85'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-bold text-[11px] flex items-center justify-center shadow-inner">
                {user.avatar || '👤'}
              </div>
            </button>

            {/* Profile Card Popup matching wireframe */}
            <ProfileDropdown
              isOpen={showProfile}
              onClose={() => setShowProfile(false)}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </header>
  )
}
