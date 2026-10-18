import React, { useState } from 'react'
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
    <header className="sticky top-0 z-50 w-full bg-[#FAF8F5]/90 dark:bg-[#121110]/90 backdrop-blur-md text-stone-900 dark:text-stone-100 border-b border-stone-200/50 dark:border-stone-800/50 transition-colors">
      <div className="w-full px-4 sm:px-5 h-14 flex items-center justify-between relative">
        {/* Left: Minimalist Logo + App Name */}
        <button
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
          id="nav-logo-btn"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FF7043] text-white font-black shadow-xs group-hover:scale-105 transition-transform">
            <span className="text-sm">☕</span>
          </div>

          <span className="font-heading text-lg font-black tracking-tight text-stone-900 dark:text-white">
            ChaiSplit
          </span>
        </button>

        {/* Right: Profile Avatar */}
        {isAuthenticated && user && (
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowProfile(prev => !prev)}
              id="header-profile-btn"
              title={`${user.name}`}
              className="w-8 h-8 rounded-full bg-[#FF7043]/15 text-[#FF7043] font-extrabold text-xs flex items-center justify-center ring-1 ring-[#FF7043]/30 cursor-pointer hover:scale-105 transition-transform"
            >
              {user.avatar || user.name?.slice(0, 2).toUpperCase() || '👤'}
            </button>

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
