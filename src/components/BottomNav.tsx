import React from 'react'
import type { BottomTab } from '../types'

interface BottomNavProps {
  activeTab: BottomTab
  onChangeTab: (tab: BottomTab) => void
  historyCount?: number
}

interface NavItem {
  id: BottomTab
  label: string
  emoji: string
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, historyCount }) => {
  // Tabs with 'home' changed to 'details' and position of 'shops' interchanged with it:
  // 1. Shops (🏪), 2. Groups (👥), 3. Details (📋), 4. History (🧾)
  const tabs: NavItem[] = [
    { id: 'shops', label: 'Shops', emoji: '🏪' },
    { id: 'groups', label: 'Groups', emoji: '👥' },
    { id: 'details', label: 'Details', emoji: '📋' },
    { id: 'history', label: 'History', emoji: '🧾' }
  ]

  return (
    // Floating wrapper: suspended cleanly above the bottom edge with margins and glassmorphism
    <div className="sticky bottom-3 z-40 w-full px-3 pointer-events-none mt-auto">
      <nav
        id="floating-bottom-navigation"
        aria-label="Floating Bottom Navigation"
        className="pointer-events-auto w-full max-w-[390px] mx-auto h-[62px] rounded-2xl backdrop-blur-xl bg-white/92 dark:bg-stone-900/92 border border-stone-200/90 dark:border-stone-800/90 shadow-xl shadow-stone-950/10 dark:shadow-black/50 flex items-center justify-around p-1.5 transition-all"
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id || (tab.id === 'details' && activeTab === 'home')

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              id={`bottom-nav-${tab.id}`}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer relative group ${
                isActive
                  ? 'bg-amber-100/75 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold shadow-2xs'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium hover:bg-stone-100/50 dark:hover:bg-stone-800/40'
              }`}
            >
              {/* Emoji Icon with micro-animation on active */}
              <div
                className={`text-lg transition-transform duration-200 ${
                  isActive ? 'scale-115 -translate-y-0.5' : 'group-hover:scale-105 opacity-80'
                }`}
              >
                {tab.emoji}
              </div>

              {/* Text Label */}
              <span
                className={`text-[10px] leading-tight tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-amber-900 dark:text-amber-200 font-bold' : ''
                }`}
              >
                {tab.label}
              </span>

              {/* Optional badge on History if count exists */}
              {tab.id === 'history' && typeof historyCount === 'number' && historyCount > 0 && !isActive && (
                <span className="absolute top-1 right-2.5 w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold flex items-center justify-center border border-amber-300/40">
                  {historyCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
