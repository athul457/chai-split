import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '../types'
import { supabase } from '../lib/supabase'

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
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Fetch real profiles from Supabase on mount
  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const fetchProfiles = async () => {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          const mappedUsers: User[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            avatar: p.avatar || '☕',
            teamName: p.team_name || 'Team',
            userCode: p.user_code,
            upiId: p.upi_id
          }))
          setAllUsers(mappedUsers)
        }
      } catch (err) {
        console.warn('Could not load profiles from Supabase:', err)
      }
    }

    fetchProfiles()
  }, [])

  // Sync active user to local cache
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

  // Sync users to local cache
  useEffect(() => {
    try {
      localStorage.setItem(ALL_USERS_KEY, JSON.stringify(allUsers))
    } catch (e) {
      console.error('Failed to save all users', e)
    }
  }, [allUsers])

  const login = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      return { success: false, error: 'Email is required.' }
    }

    // 1. Try querying Supabase profiles first
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', trimmed)
          .maybeSingle()

        if (!error && data) {
          const loggedInUser: User = {
            id: data.id,
            name: data.name,
            email: data.email,
            avatar: data.avatar || '☕',
            teamName: data.team_name || 'Team',
            userCode: data.user_code,
            upiId: data.upi_id
          }
          setUser(loggedInUser)
          setAllUsers(prev => {
            if (prev.some(u => u.id === loggedInUser.id)) return prev
            return [loggedInUser, ...prev]
          })
          return { success: true }
        }
      } catch (err) {
        console.warn('Supabase login lookup failed, falling back:', err)
      }
    }

    // 2. Check local users
    const found = allUsers.find(u => u.email.toLowerCase() === trimmed)
    if (found) {
      setUser(found)
      return { success: true }
    }

    // 3. If new email, create real user
    const namePart = trimmed.split('@')[0]
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1)
    const codePrefix = formattedName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: formattedName,
      email: trimmed,
      avatar: formattedName.slice(0, 2).toUpperCase(),
      teamName: 'Team',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${namePart}@upi`
    }

    if (supabase) {
      supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
          team_name: newUser.teamName,
          user_code: newUser.userCode,
          upi_id: newUser.upiId
        })
        .then(({ error }) => {
          if (error) console.warn('Supabase user auto-create error:', error.message)
        }, err => console.warn('Supabase insert error:', err))
    }

    setAllUsers(prev => [newUser, ...prev])
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
    const initials = name
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '☕'

    const codePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      avatar: initials,
      teamName: teamName?.trim() || 'Team',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`
    }

    // Insert into Supabase profiles
    if (supabase) {
      try {
        const { error } = await supabase.from('profiles').insert({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
          team_name: newUser.teamName,
          user_code: newUser.userCode,
          upi_id: newUser.upiId
        })
        if (error) {
          console.warn('Supabase register error:', error.message)
        }
      } catch (err) {
        console.warn('Could not insert profile into Supabase:', err)
      }
    }

    setAllUsers(prev => {
      const filtered = prev.filter(u => u.email.toLowerCase() !== trimmedEmail)
      return [newUser, ...filtered]
    })
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
      teamName: user?.teamName || 'Team',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${name.toLowerCase().replace(/\s+/g, '')}@upi`
    }

    if (supabase) {
      supabase.from('profiles').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        team_name: newUser.teamName,
        user_code: newUser.userCode,
        upi_id: newUser.upiId
      }).then(({ error }) => {
        if (error) console.warn('Supabase add user error:', error.message)
      }, err => console.warn('Supabase add user error:', err))
    }

    setAllUsers(prev => [newUser, ...prev])
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
