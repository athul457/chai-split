import { useState } from 'react'
import { Check, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import type { PageRoute } from '../types'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: PageRoute) => void
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)

  if (!isOpen || !user) return null

  // Ensure an ID like 'USER4821'
  const userCode = user.userCode || (
    user.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() + '4821'
  )

  const handleCopyId = () => {
    navigator.clipboard.writeText(userCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSignOut = () => {
    logout()
    onClose()
    onNavigate('landing')
  }

  return (
    <>
      {/* Click-outside backdrop */}
      <div
        className="fixed inset-0 z-40 bg-stone-900/20 dark:bg-black/50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Profile Card Container (matching wireframe) */}
      <div
        id="user-profile-modal"
        className="absolute right-3 top-14 z-50 w-72 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xl p-4 text-left animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Top: 👤 User Name & Email */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold shadow-2xs">
            <span role="img" aria-label="user">👤</span>
          </div>

          <div className="truncate">
            <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 leading-tight truncate">
              {user.name}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-tight mt-0.5 truncate">
              {user.email}
            </p>
          </div>
        </div>

        {/* User ID Section */}
        <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80">
          <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
            User ID
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80">
            <span className="font-mono font-bold text-sm text-stone-900 dark:text-stone-100 tracking-wider">
              {userCode}
            </span>

            <button
              onClick={handleCopyId}
              id="copy-userid-btn"
              title="Copy User ID"
              className="p-1 rounded-md text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                </>
              ) : (
                <span className="text-sm" role="img" aria-label="copy">📋</span>
              )}
            </button>
          </div>
        </div>

        {/* Theme / Appearance Row */}
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
              <span>Appearance</span>
            </span>

            <button
              onClick={toggleTheme}
              id="profile-theme-toggle-btn"
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:border-amber-500 cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>{isDark ? '☀️ White Mode' : '🌙 Dark Mode'}</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-stone-100 dark:border-stone-800" />

        {/* Bottom: 🚪 Sign out */}
        <button
          onClick={handleSignOut}
          id="profile-signout-btn"
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer group text-left"
        >
          <span className="text-sm group-hover:scale-110 transition-transform" role="img" aria-label="door">
            🚪
          </span>
          <span>Sign out</span>
        </button>
      </div>
    </>
  )
}
