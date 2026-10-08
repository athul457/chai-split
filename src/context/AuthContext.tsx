import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { User } from '../types'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>
  quickLogin: (userId: string) => void
  register: (name: string, email: string, password?: string, teamName?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void> | void
  allUsers: User[]
  addUserToTeam: (name: string, email: string) => User
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_STORAGE_KEY = 'chaisplit_user'
const ALL_USERS_KEY = 'chaisplit_all_users'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
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

  // Expose verified JWT access token
  const token = session?.access_token || null

  // Fetch real profiles and initialize Supabase Auth JWT session
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

    // 1. Initial JWT session recovery
    client.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      if (existingSession && existingSession.user) {
        setSession(existingSession)
        const authUser = existingSession.user
        try {
          const { data: p } = await client
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          let resolvedProfile = p
          if (!resolvedProfile && authUser.email) {
            const { data: pEmail } = await client
              .from('profiles')
              .select('*')
              .ilike('email', authUser.email)
              .maybeSingle()
            if (pEmail) resolvedProfile = pEmail
          }

          if (resolvedProfile) {
            setUser({
              id: resolvedProfile.id,
              name: resolvedProfile.name,
              email: resolvedProfile.email,
              avatar: resolvedProfile.avatar || '☕',
              teamName: resolvedProfile.team_name || 'Team',
              userCode: resolvedProfile.user_code,
              upiId: resolvedProfile.upi_id
            })
          } else {
            const namePart = (authUser.email || 'user').split('@')[0]
            const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1)
            const codePrefix = formattedName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
            const fallbackProfile = {
              id: authUser.id,
              name: formattedName,
              email: authUser.email || '',
              avatar: formattedName.slice(0, 2).toUpperCase(),
              team_name: 'Team',
              user_code: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
              upi_id: `${namePart}@upi`
            }
            await client.from('profiles').upsert(fallbackProfile, { onConflict: 'id' })
            setUser({
              id: fallbackProfile.id,
              name: fallbackProfile.name,
              email: fallbackProfile.email,
              avatar: fallbackProfile.avatar,
              teamName: fallbackProfile.team_name,
              userCode: fallbackProfile.user_code,
              upiId: fallbackProfile.upi_id
            })
          }
        } catch (err) {
          console.warn('Profile recovery error:', err)
        }
      }
    })

    // 2. Realtime listener for JWT session state (Sign in, Sign out, Token Refresh)
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      if (event === 'SIGNED_OUT' || !newSession) {
        setUser(null)
      } else if (newSession?.user) {
        const authUser = newSession.user
        try {
          const { data: p } = await client
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          let resolvedProfile = p
          if (!resolvedProfile && authUser.email) {
            const { data: pEmail } = await client
              .from('profiles')
              .select('*')
              .ilike('email', authUser.email)
              .maybeSingle()
            if (pEmail) resolvedProfile = pEmail
          }

          if (resolvedProfile) {
            setUser({
              id: resolvedProfile.id,
              name: resolvedProfile.name,
              email: resolvedProfile.email,
              avatar: resolvedProfile.avatar || '☕',
              teamName: resolvedProfile.team_name || 'Team',
              userCode: resolvedProfile.user_code,
              upiId: resolvedProfile.upi_id
            })
          }
        } catch (err) {
          console.warn('Auth state change profile resolution error:', err)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
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

  const login = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      return { success: false, error: 'Email is required.' }
    }

    const effectivePassword = password && password.trim() ? password.trim() : 'ChaiSplit@2026'

    if (supabase) {
      try {
        const client = supabase
        // 1. Authenticate with Supabase Auth to obtain a signed JWT session
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: trimmed,
          password: effectivePassword
        })

        if (!authError && authData.session && authData.user) {
          setSession(authData.session)
          const { data: p } = await client
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .maybeSingle()

          let loggedInUser: User
          if (p) {
            loggedInUser = {
              id: p.id,
              name: p.name,
              email: p.email,
              avatar: p.avatar || '☕',
              teamName: p.team_name || 'Team',
              userCode: p.user_code,
              upiId: p.upi_id
            }
          } else {
            const namePart = trimmed.split('@')[0]
            const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1)
            const codePrefix = formattedName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'
            loggedInUser = {
              id: authData.user.id,
              name: formattedName,
              email: trimmed,
              avatar: formattedName.slice(0, 2).toUpperCase(),
              teamName: 'Team',
              userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
              upiId: `${namePart}@upi`
            }
            await client.from('profiles').upsert({
              id: loggedInUser.id,
              name: loggedInUser.name,
              email: loggedInUser.email,
              avatar: loggedInUser.avatar,
              team_name: loggedInUser.teamName,
              user_code: loggedInUser.userCode,
              upi_id: loggedInUser.upiId
            })
          }

          setUser(loggedInUser)
          setAllUsers(prev => {
            if (prev.some(u => u.id === loggedInUser.id)) return prev
            return [loggedInUser, ...prev]
          })
          return { success: true }
        }

        // 2. Migration fallback: If user exists in profiles but doesn't have an auth record yet, auto-provision
        if (authError && (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found'))) {
          const { data: existingProfile } = await client
            .from('profiles')
            .select('*')
            .ilike('email', trimmed)
            .maybeSingle()

          const { data: signUpData, error: signUpErr } = await client.auth.signUp({
            email: trimmed,
            password: effectivePassword
          })

          if (!signUpErr && signUpData.session && signUpData.user) {
            setSession(signUpData.session)
            const namePart = trimmed.split('@')[0]
            const formattedName = existingProfile?.name || namePart.charAt(0).toUpperCase() + namePart.slice(1)
            const loggedInUser: User = {
              id: signUpData.user.id,
              name: formattedName,
              email: trimmed,
              avatar: existingProfile?.avatar || formattedName.slice(0, 2).toUpperCase(),
              teamName: existingProfile?.team_name || 'Team',
              userCode: existingProfile?.user_code || `${formattedName.slice(0, 4).toUpperCase()}4821`,
              upiId: existingProfile?.upi_id || `${namePart}@upi`
            }
            await client.from('profiles').upsert({
              id: loggedInUser.id,
              name: loggedInUser.name,
              email: loggedInUser.email,
              avatar: loggedInUser.avatar,
              team_name: loggedInUser.teamName,
              user_code: loggedInUser.userCode,
              upi_id: loggedInUser.upiId
            })
            setUser(loggedInUser)
            return { success: true }
          }
          return { success: false, error: authError.message }
        }

        if (authError) {
          return { success: false, error: authError.message }
        }
      } catch (err: any) {
        console.warn('Supabase login lookup failed, falling back:', err)
        return { success: false, error: err?.message || 'Login failed.' }
      }
    }

    // Offline / demo fallback
    const found = allUsers.find(u => u.email.toLowerCase() === trimmed)
    if (found) {
      setUser(found)
      return { success: true }
    }

    return { success: false, error: 'User not found. Please register first.' }
  }

  const quickLogin = (userId: string) => {
    const target = allUsers.find(u => u.id === userId)
    if (target) {
      setUser(target)
    }
  }

  const register = async (
    name: string,
    email: string,
    password?: string,
    teamName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim() || !email.trim()) {
      return { success: false, error: 'Name and email are required.' }
    }

    const trimmedEmail = email.trim().toLowerCase()
    const effectivePassword = password && password.trim() ? password.trim() : 'ChaiSplit@2026'
    const initials = name
      .trim()
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '☕'

    const codePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'USER'

    // Register with Supabase Auth to issue authentic cryptographic JWT
    if (supabase) {
      try {
        const client = supabase
        const { data: authData, error: authErr } = await client.auth.signUp({
          email: trimmedEmail,
          password: effectivePassword,
          options: {
            data: {
              name: name.trim(),
              teamName: teamName?.trim() || 'Team'
            }
          }
        })

        if (authErr) {
          if (authErr.message.toLowerCase().includes('already registered')) {
            return { success: false, error: 'Email already registered. Please log in.' }
          }
          return { success: false, error: authErr.message }
        }

        const authUserId = authData.user?.id || `user-${Date.now()}`
        if (authData.session) {
          setSession(authData.session)
        }

        const newUser: User = {
          id: authUserId,
          name: name.trim(),
          email: trimmedEmail,
          avatar: initials,
          teamName: teamName?.trim() || 'Team',
          userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
          upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`
        }

        // Upsert profile in Supabase linked to auth user ID
        await client.from('profiles').upsert({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          avatar: newUser.avatar,
          team_name: newUser.teamName,
          user_code: newUser.userCode,
          upi_id: newUser.upiId
        })

        setAllUsers(prev => {
          const filtered = prev.filter(u => u.email.toLowerCase() !== trimmedEmail)
          return [newUser, ...filtered]
        })
        setUser(newUser)
        return { success: true }
      } catch (err: any) {
        console.warn('Could not register in Supabase Auth:', err)
        return { success: false, error: err?.message || 'Registration failed.' }
      }
    }

    // Offline fallback
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      avatar: initials,
      teamName: teamName?.trim() || 'Team',
      userCode: `${codePrefix}${Math.floor(1000 + Math.random() * 9000)}`,
      upiId: `${name.toLowerCase().replace(/\s+/g, '')}@okaxis`
    }
    setAllUsers(prev => [newUser, ...prev])
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

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (err) {
        console.warn('Supabase sign out error:', err)
      }
    }
    setSession(null)
    setUser(null)
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem('chaisplit_groups_list_v2')
    localStorage.removeItem('chaisplit_active_group_id')
    localStorage.removeItem('chaisplit_all_registered_groups')
    localStorage.removeItem('chaisplit_active_session_v3')
    localStorage.removeItem('chaisplit_active_session')
    if (user?.id) {
      localStorage.removeItem(`chaisplit_groups_user_${user.id}`)
      localStorage.removeItem(`chaisplit_active_group_user_${user.id}`)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
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
