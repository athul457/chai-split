import React, { useState } from 'react'
import { Bell } from 'lucide-react'
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
    <header className="sticky top-0 z-50 w-full bg-[#FF7043] dark:bg-[#1A0E08] text-white transition-colors pt-3">
      <div className="w-full px-5 sm:px-6 h-14 flex items-center justify-between relative">
        {/* Left: Splitty-style Logo + App Name */}
        <button
          onClick={() => onNavigate(isAuthenticated ? 'dashboard' : 'landing')}
          className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          id="nav-logo-btn"
        >
          {/* Minimalist White Pill Logo */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-[#FF7043] font-black shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-base font-black">☕</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-heading text-xl font-black tracking-tight text-white group-hover:opacity-95 transition-opacity">
              ChaiSplit
            </span>
          </div>
        </button>

        {/* Right: Notification Bell + Avatar Ring (matching Splitty) */}
        {isAuthenticated && user && (
          <div className="relative flex items-center gap-2.5">
            {/* Notification Bell */}
            <button
              type="button"
              id="header-notification-btn"
              title="Notifications"
              onClick={() => setShowProfile(prev => !prev)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-xs text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <Bell className="w-4 h-4 fill-white/20" />
            </button>

            {/* User Avatar with White Border Ring */}
            <button
              onClick={() => setShowProfile(prev => !prev)}
              id="header-profile-btn"
              title={`${user.name} (Click to view profile)`}
              className={`p-0.5 rounded-full ring-2 ring-white/90 transition-all cursor-pointer shadow-sm active:scale-95 ${
                showProfile ? 'ring-white' : 'hover:opacity-90'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-white text-[#FF7043] font-extrabold text-xs flex items-center justify-center shadow-inner">
                {user.avatar || user.name?.slice(0, 2).toUpperCase() || '👤'}
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
