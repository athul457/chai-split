import React, { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { Dashboard } from './pages/Dashboard'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ExpenseProvider } from './context/ExpenseContext'
import { ThemeProvider } from './context/ThemeContext'
import type { PageRoute } from './types'

const MainApp: React.FC = () => {
  const { isAuthenticated } = useAuth()

  // Read current hash route
  const getRouteFromHash = (): PageRoute => {
    const hash = window.location.hash.replace('#/', '').replace('#', '')
    if (hash === 'login') return 'login'
    if (hash === 'register') return 'register'
    if (hash === 'dashboard') return 'dashboard'
    return 'landing'
  }

  const [route, setRoute] = useState<PageRoute>(getRouteFromHash)

  // Listen to hash changes (back/forward button, external links)
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(getRouteFromHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Derived effective page adhering to user requirements:
  // - "If an already-authenticated user visits /, redirect them to the dashboard."
  // - "I would not show the landing page again."
  // - "Login -> Dashboard"
  const currentPage: PageRoute = (() => {
    if (isAuthenticated) {
      return 'dashboard'
    }
    if (route === 'dashboard') {
      return 'login'
    }
    return route
  })()

  // Keep hash in sync with authenticated redirection
  useEffect(() => {
    if (isAuthenticated && window.location.hash !== '#/dashboard') {
      window.location.hash = '#/dashboard'
    }
  }, [isAuthenticated])

  // Navigation handler
  const handleNavigate = (page: PageRoute) => {
    setRoute(page)
    window.location.hash = page === 'landing' ? '#/' : `#/${page}`
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Render appropriate view
  const renderCurrentPage = () => {
    if (isAuthenticated) {
      return <Dashboard onNavigate={handleNavigate} />
    }

    switch (currentPage) {
      case 'login':
        return <LoginPage onNavigate={handleNavigate} />
      case 'register':
        return <RegisterPage onNavigate={handleNavigate} />
      case 'dashboard':
        return <LoginPage onNavigate={handleNavigate} />
      case 'landing':
      default:
        return <LandingPage onNavigate={handleNavigate} />
    }
  }

  return (
    // Outer viewport: pure white in color/light mode, pure black in dark mode
    <div className="min-h-screen w-full bg-white dark:bg-black text-stone-900 dark:text-stone-100 flex justify-center items-start transition-colors">
      {/* Mobile view frame: always max 430px wide, centered, full height */}
      <div className="w-full max-w-[430px] min-h-screen bg-stone-50/70 dark:bg-stone-900 border-x border-stone-200/90 dark:border-stone-800 shadow-2xl flex flex-col relative transition-colors">
        <Header currentPage={currentPage} onNavigate={handleNavigate} />
        <main className="flex-1 w-full flex flex-col">{renderCurrentPage()}</main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ExpenseProvider>
          <MainApp />
        </ExpenseProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
