import React from 'react'
import { Home, Coffee, Plus, Users, Receipt } from 'lucide-react'
import type { BottomTab } from '../types'

interface BottomNavProps {
  activeTab: BottomTab
  onChangeTab: (tab: BottomTab) => void
  historyCount?: number
  onPlusClick?: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  historyCount,
  onPlusClick
}) => {
  const isHomeActive = activeTab === 'home' || activeTab === 'groups' || activeTab === 'shops'
  const isMyOrdersActive = activeTab === 'my-orders' || activeTab === 'details'
  const isOthersActive = activeTab === 'others-orders'
  const isHistoryActive = activeTab === 'history'

  return (
    // Floating wrapper: permanently fixed at the viewport bottom on all pages
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 px-3 pointer-events-none transition-all"
      style={{
        bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <nav
        id="floating-bottom-navigation"
        aria-label="Floating Bottom Navigation"
        className="pointer-events-auto w-full max-w-[400px] mx-auto h-[62px] rounded-full backdrop-blur-xl bg-white/95 dark:bg-[#121110]/95 border border-stone-200/90 dark:border-stone-800/80 shadow-2xl shadow-stone-900/15 dark:shadow-stone-950/60 flex items-center justify-around px-2 transition-all"
      >
        {/* 1. Home Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('home')}
          id="bottom-nav-home"
          aria-label="Home"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 cursor-pointer ${
            isHomeActive
              ? 'text-stone-900 dark:text-white font-black scale-105'
              : 'text-stone-400 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-stone-400'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight">Home</span>
        </button>

        {/* 2. My Orders Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('my-orders')}
          id="bottom-nav-my-orders"
          aria-label="My Orders"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 cursor-pointer ${
            isMyOrdersActive
              ? 'text-stone-900 dark:text-white font-black scale-105'
              : 'text-stone-400 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-medium'
          }`}
        >
          <Coffee className={`w-5 h-5 ${isMyOrdersActive ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-stone-400'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight">Orders</span>
        </button>

        {/* 3. Center Elevated Orange Action Button */}
        <div className="flex items-center justify-center px-1">
          <button
            type="button"
            onClick={() => {
              if (onPlusClick) {
                onPlusClick()
              } else {
                onChangeTab('my-orders')
              }
            }}
            id="bottom-nav-plus-action"
            aria-label="New Break or Group"
            className="w-12 h-12 -translate-y-2.5 rounded-full bg-[#FF7043] hover:bg-[#FA6432] active:scale-95 text-white shadow-lg shadow-orange-950/30 flex items-center justify-center cursor-pointer transition-all border-2 border-white dark:border-[#121110] group"
          >
            <Plus className="w-6 h-6 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* 4. Others' Orders Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('others-orders')}
          id="bottom-nav-others-orders"
          aria-label="Others Orders"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 cursor-pointer ${
            isOthersActive
              ? 'text-stone-900 dark:text-white font-black scale-105'
              : 'text-stone-400 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-medium'
          }`}
        >
          <Users className={`w-5 h-5 ${isOthersActive ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-stone-400'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight">Colleagues</span>
        </button>

        {/* 5. History Tab */}
        <button
          type="button"
          onClick={() => onChangeTab('history')}
          id="bottom-nav-history"
          aria-label="History"
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 cursor-pointer relative ${
            isHistoryActive
              ? 'text-stone-900 dark:text-white font-black scale-105'
              : 'text-stone-400 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-medium'
          }`}
        >
          <Receipt className={`w-5 h-5 ${isHistoryActive ? 'text-stone-900 dark:text-white' : 'text-stone-400 dark:text-stone-400'}`} />
          <span className="text-[9px] mt-0.5 tracking-tight">History</span>
          {typeof historyCount === 'number' && historyCount > 0 && !isHistoryActive && (
            <span className="absolute top-0 right-3 w-4 h-4 rounded-full bg-[#FF7043] text-white text-[9px] font-bold flex items-center justify-center">
              {historyCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  )
}
