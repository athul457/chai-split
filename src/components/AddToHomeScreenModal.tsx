import React, { useState, useEffect } from 'react'
import { Smartphone, Download, X, CheckCircle2, Share } from 'lucide-react'

interface AddToHomeScreenModalProps {
  isOpen: boolean
  onClose: () => void
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      localStorage.setItem('chaisplit_pwa_installed', 'true')
      setIsInstalled(true)
      setTimeout(() => {
        onClose()
      }, 1500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isAppleDevice)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [onClose])

  if (!isOpen) return null

  // Handle Dismiss action
  const handleDismiss = () => {
    if (dontShowAgain) {
      localStorage.setItem('chaisplit_pwa_dont_show_again', 'true')
    }
    sessionStorage.setItem('chaisplit_pwa_dismissed_session', 'true')
    onClose()
  }

  // Handle Add to Home Screen action
  const handleAddToHome = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          localStorage.setItem('chaisplit_pwa_installed', 'true')
          sessionStorage.setItem('chaisplit_pwa_dismissed_session', 'true')
          setIsInstalled(true)
          setTimeout(() => onClose(), 1200)
          return
        }
      } catch (err) {
        console.warn('Install prompt error:', err)
      }
    }

    // On iOS Safari, display quick instruction
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }

    // Fallback: mark installed/added and dismiss
    localStorage.setItem('chaisplit_pwa_installed', 'true')
    sessionStorage.setItem('chaisplit_pwa_dismissed_session', 'true')
    setIsInstalled(true)
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-home-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-150 relative">
        {/* Close Button on top right */}
        <button
          type="button"
          onClick={handleDismiss}
          id="add-to-home-close-btn"
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* App Icon badge */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center mx-auto shadow-md shadow-amber-900/15">
          <Smartphone className="w-7 h-7" />
        </div>

        {/* Content */}
        <div className="space-y-1.5">
          <h3
            id="add-to-home-title"
            className="font-heading font-extrabold text-lg text-stone-900 dark:text-stone-100"
          >
            Add ChaiSplit to Home Screen
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed max-w-xs mx-auto">
            Install ChaiSplit on your home screen for quick 1-tap access to your tea breaks, orders, and group expense splits directly from your device.
          </p>
        </div>

        {/* iOS Guide if triggered */}
        {showIOSGuide && (
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-left text-xs text-amber-900 dark:text-amber-200 space-y-1.5 animate-in fade-in">
            <div className="font-bold flex items-center gap-1.5 text-xs">
              <Share className="w-3.5 h-3.5" />
              <span>How to add on iOS:</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-800 dark:text-amber-300">
              <li>Tap the <strong>Share</strong> button at bottom of Safari.</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
            </ol>
          </div>
        )}

        {/* Success message if installed */}
        {isInstalled && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Added to home screen successfully!</span>
          </div>
        )}

        {/* Don't show again Checkbox */}
        <div className="pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200">
            <input
              type="checkbox"
              id="dont-show-again-checkbox"
              checked={dontShowAgain}
              onChange={e => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 cursor-pointer"
            />
            <span className="font-medium">Don't show again</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            id="dismiss-add-to-home-btn"
            className="flex-1 py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs cursor-pointer active:scale-95 transition-all text-center"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={handleAddToHome}
            id="confirm-add-to-home-btn"
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-amber-900/15 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Add to Home</span>
          </button>
        </div>
      </div>
    </div>
  )
}
