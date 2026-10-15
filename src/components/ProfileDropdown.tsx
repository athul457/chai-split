import { useState } from 'react'
import { Check, Sun, Moon, X, Copy, Edit3, Trash2, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import type { PageRoute } from '../types'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: PageRoute) => void
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ isOpen, onClose, onNavigate }) => {
  const { user, logout, updateUpiId } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [copied, setCopied] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [isEditingUpi, setIsEditingUpi] = useState(false)
  const [upiInput, setUpiInput] = useState('')
  const [upiError, setUpiError] = useState('')

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

  const handleStartEditUpi = () => {
    setUpiInput(user.upiId || '')
    setUpiError('')
    setIsEditingUpi(true)
  }

  const handleSaveUpi = async () => {
    const trimmed = upiInput.trim()
    if (!trimmed) {
      setUpiError('Please enter a valid UPI ID or cancel.')
      return
    }
    if (!trimmed.includes('@')) {
      setUpiError('UPI ID must include @ (e.g. name@upi)')
      return
    }
    await updateUpiId(trimmed)
    setIsEditingUpi(false)
    setUpiError('')
  }

  const handleDeleteUpi = async () => {
    await updateUpiId('')
    setIsEditingUpi(false)
    setUpiInput('')
    setUpiError('')
  }

  const handleCopyUpi = () => {
    if (!user.upiId) return
    navigator.clipboard.writeText(user.upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2000)
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
        {/* Top: 👤 User Name & Email + Close X Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold shadow-2xs">
              <span role="img" aria-label="user">👤</span>
            </div>

            <div className="truncate min-w-0">
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 leading-tight truncate">
                {user.name}
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-tight mt-0.5 truncate">
                {user.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="close-profile-modal-btn"
            title="Close"
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0 -mt-1 -mr-1"
            aria-label="Close Profile"
          >
            <X className="w-4 h-4" />
          </button>
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

        {/* UPI ID Section (Private to this user) */}
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              UPI ID
            </span>
            <span className="text-[9px] text-stone-400 dark:text-stone-500 font-semibold">
              Private to you
            </span>
          </div>

          {isEditingUpi ? (
            <div className="space-y-1.5 p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-amber-300 dark:border-amber-700/80">
              <input
                type="text"
                value={upiInput}
                onChange={e => {
                  setUpiInput(e.target.value)
                  if (upiError) setUpiError('')
                }}
                placeholder="e.g. username@okhdfcbank"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                autoFocus
              />
              {upiError && (
                <p className="text-[10px] text-rose-500 font-medium px-1 leading-tight">{upiError}</p>
              )}
              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUpi(false)
                    setUpiError('')
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-bold text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpi}
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : user.upiId ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 gap-1.5">
              <span className="font-mono text-xs text-stone-900 dark:text-stone-100 truncate min-w-0 flex-1">
                {user.upiId}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  title="Copy UPI ID"
                  className="p-1 rounded-md text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[10px] text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleStartEditUpi}
                  title="Edit UPI ID"
                  className="p-1 rounded-md text-stone-500 hover:text-amber-600 dark:text-stone-400 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleDeleteUpi}
                  title="Delete UPI ID"
                  className="p-1 rounded-md text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEditUpi}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-stone-600 dark:text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-stone-50/50 dark:bg-stone-850"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add UPI ID</span>
            </button>
          )}
        </div>

        {/* Dark Mode Switch Row */}
        <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-amber-400">
                {isDark ? (
                  <Moon className="w-4 h-4 text-amber-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block leading-tight">
                  Dark Mode
                </span>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 block leading-tight">
                  {isDark ? 'Active' : 'Off'}
                </span>
              </div>
            </div>

            {/* Switch Toggle Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleTheme}
              id="profile-theme-toggle-btn"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark mode"
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                isDark ? 'bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <span className="sr-only">Toggle dark mode</span>
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isDark ? 'translate-x-5' : 'translate-x-0'
                }`}
              >
                {isDark ? (
                  <Moon className="w-2.5 h-2.5 text-amber-600" />
                ) : (
                  <Sun className="w-2.5 h-2.5 text-amber-500" />
                )}
              </span>
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
