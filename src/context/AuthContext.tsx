import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '../types'
import { DEFAULT_USERS } from '../lib/mockData'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>
  quickLogin: (userId: string) => void
  register: (name: string, email: string, teamName?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  allUsers: User[]
  addUserToTeam: (name: string, email: string) => User
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_STORAGE_KEY = 'chaisplit_user'
const ALL_USERS_KEY = 'chaisplit_all_users'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY)
      if (!saved) return null
      const parsed: User = JSON.parse(saved)
      if (!parsed.userCode) {
        const prefix = parsed.name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
        parsed.userCode = `${prefix}4821`
      }
      return parsed
    } catch {
      return null
    }
  })

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(ALL_USERS_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_USERS
    } catch {
      return DEFAULT_USERS
    }
  })

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(USER_STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed to sync auth to localStorage', e)
    }
  }, [user])

  useEffect(() => {
    try {
      localStorage.setItem(ALL_USERS_KEY, JSON.stringify(allUsers))
    } catch (e) {
      console.error('Failed to save all users', e)
    }
  }, [allUsers])

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = email.trim().toLowerCase()
    const found = allUsers.find(u => u.email.toLowerCase() === trimmed)
    if (found) {
      setUser(found)
      return { success: true }
    }

    // Auto-create friendly user if new email
    const namePart = trimmed.split('@')[0]
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1)
    const codePrefix = formattedName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: formattedName,
      email: trimmed,
      avatar: formattedName.slice(0, 2).toUpperCase(),
      teamName: 'Floor 3 Tea Club',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${namePart}@upi`
    }
    setAllUsers(prev => [...prev, newUser])
    setUser(newUser)
    return { success: true }
  }

  const quickLogin = (userId: string) => {
    const target = allUsers.find(u => u.id === userId)
    if (target) {
      setUser(target)
    }
  }

  const register = async (name: string, email: string, teamName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim() || !email.trim()) {
      return { success: false, error: 'Name and email are required.' }
    }

    const trimmedEmail = email.trim().toLowerCase()
    const existing = allUsers.find(u => u.email.toLowerCase() === trimmedEmail)
    if (existing) {
      setUser(existing)
      return { success: true }
    }

    const initials = name
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

    const codePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      avatar: initials || '☕',
      teamName: teamName?.trim() || 'Floor 3 Tea Club',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`
    }

    setAllUsers(prev => [...prev, newUser])
    setUser(newUser)
    return { success: true }
  }

  const addUserToTeam = (name: string, email: string): User => {
    const initials = name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const codePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@office.com`,
      avatar: initials || '☕',
      teamName: user?.teamName || 'Floor 3 Tea Club',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${name.toLowerCase().replace(/\s+/g, '')}@upi`
    }
    setAllUsers(prev => [...prev, newUser])
    return newUser
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(USER_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        quickLogin,
        register,
        logout,
        allUsers,
        addUserToTeam
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
