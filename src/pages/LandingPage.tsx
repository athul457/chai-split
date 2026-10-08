import React from 'react'
import { ArrowRight, Coffee, Users, Receipt, Wallet, LogIn } from 'lucide-react'
import type { PageRoute } from '../types'

interface LandingPageProps {
  onNavigate: (page: PageRoute) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {

  return (
    <div className="flex flex-col min-h-full justify-between px-4 py-6 text-center space-y-6">
      {/* Hero Container */}
      <section className="flex flex-col items-center justify-center space-y-5">
        
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

        {/* Live Mini Preview Snippet */}
        <div className="w-full p-3.5 rounded-xl bg-white dark:bg-stone-900 border border-amber-200/60 dark:border-amber-900/40 shadow-sm text-left text-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="font-semibold text-stone-800 dark:text-stone-200 text-[11px] flex items-center gap-1">
              <span>☕ Raju Chai Tapri</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
              Total: ₹170
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-stone-600 dark:text-stone-400 text-[11px]">
            <div className="p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 flex items-center justify-between">
              <span>☕ Kadak Chai × 4</span>
              <span className="font-bold text-stone-800 dark:text-stone-200">₹60</span>
            </div>
            <div className="p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 flex items-center justify-between">
              <span>🥟 Samosas × 3</span>
              <span className="font-bold text-stone-800 dark:text-stone-200">₹60</span>
            </div>
          </div>
          <div className="mt-2 pt-1.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400">
            <span>Amit paid for all</span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Rahul owes ₹35 • Priya owes ₹55
            </span>
          </div>
        </div>

        {/* 4 Feature Points Section (Mobile 2x2 Grid) */}
        <div className="w-full grid grid-cols-2 gap-2 text-left pt-2">
          {/* 1. Track Orders */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1.5">
              <Coffee className="w-4 h-4" />
            </div>
            <h2 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
              ☕ Track Orders
            </h2>
            <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
              Everyone selects what they had.
            </p>
          </div>

          {/* 2. Group Together */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1.5">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
              👥 Group Together
            </h2>
            <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
              Create or join your office group.
            </p>
          </div>

          {/* 3. Easy Billing */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5">
              <Receipt className="w-4 h-4" />
            </div>
            <h2 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
              🧾 Easy Billing
            </h2>
            <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
              Total quantity for the shop.
            </p>
          </div>

          {/* 4. Know Your Share */}
          <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
              💰 Know Your Share
            </h2>
            <p className="mt-0.5 text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
              Everyone knows what they owe.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-stone-200/60 dark:border-stone-800/80 pt-3 text-[11px] text-stone-400 flex items-center justify-between">
        <span>Nibru-Tea • Office Khata</span>
        <div className="flex items-center gap-3">
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
