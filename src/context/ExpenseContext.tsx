import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'
import type { TeaSession, MenuItem, OrderItem, MemberExpense, User } from '../types'
import { DEFAULT_MENU } from '../lib/mockData'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

interface ExpenseContextType {
  activeSession: TeaSession | null
  activeSessions: TeaSession[]
  getActiveSessionForGroup: (groupId?: string) => TeaSession | undefined
  pastSessions: TeaSession[]
  menuItems: MenuItem[]
  addItemToMember: (memberId: string, menuItem: MenuItem, sessionId?: string) => Promise<boolean> | void
  removeItemFromMember: (memberId: string, menuItemId: string, sessionId?: string) => Promise<boolean> | void
  toggleMemberPaid: (memberId: string, sessionId?: string) => void
  setPayer: (payerId: string, sessionId?: string) => void
  addNewSession: (
    title: string,
    shopName: string,
    members?: User[],
    groupId?: string,
    groupName?: string,
    payerId?: string,
    shopId?: string,
    creatorId?: string,
    creatorName?: string
  ) => boolean
  cancelActiveSession: (userId?: string, sessionId?: string) => boolean
  deleteActiveSession: (userId?: string, sessionId?: string) => { success: boolean; message: string }
  settleActiveSession: (sessionId?: string) => void
  addMemberToSession: (user: User) => void
  getMenuItemsForShop: (shopId?: string) => MenuItem[]
  addCustomMenuItem: (
    name: string,
    price: number,
    emoji?: string,
    category?: MenuItem['category'],
    shopId?: string
  ) => Promise<MenuItem> | void
  updateMenuItemPrice: (itemId: string, newPrice: number) => Promise<boolean> | void
  deleteMenuItem: (itemId: string) => Promise<boolean>
  removeMenuItemsForShop?: (shopId: string) => void
  getShopItemSummary: () => { name: string; emoji: string; count: number; totalCost: number }[]
  generateWhatsAppSummary: () => string
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined)

const ACTIVE_SESSION_KEY = 'chaisplit_active_session_v3'
const PAST_SESSIONS_KEY = 'chaisplit_past_sessions_v3'
const MENU_ITEMS_KEY = 'chaisplit_menu_items_v3'

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { allUsers, user } = useAuth()

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(MENU_ITEMS_KEY)
      if (saved) return JSON.parse(saved)
      return DEFAULT_MENU
    } catch {
      return DEFAULT_MENU
    }
  })

  // Start with no mock session
  const [activeSession, setActiveSession] = useState<TeaSession | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SESSION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Multi-group active sessions list
  const [activeSessions, setActiveSessions] = useState<TeaSession[]>([])

  // Helper: retrieve the active break for a specific group
  const getActiveSessionForGroup = useCallback((groupId?: string): TeaSession | undefined => {
    if (!groupId) return activeSession || activeSessions[0] || undefined
    return activeSessions.find(s => s.groupId === groupId && s.status === 'active') ||
      (activeSession?.groupId === groupId && activeSession.status === 'active' ? activeSession : undefined)
  }, [activeSessions, activeSession])

  // Start with no mock past sessions
  const [pastSessions, setPastSessions] = useState<TeaSession[]>(() => {
    try {
      const saved = localStorage.getItem(PAST_SESSIONS_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Fetch menu items from Supabase
  const fetchMenuItems = useCallback(async () => {
    if (!supabase) return
    const client = supabase

    try {
      const { data, error } = await client.from('menu_items').select('*').order('name', { ascending: true })
      if (!error && data) {
        if (data.length > 0) {
          const mapped: MenuItem[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: Number(item.price) || 0,
            category: item.category || 'snacks',
            emoji: item.emoji || '☕',
            description: item.description,
            shopId: item.shop_id || 'shop-chayakkada'
          }))
          setMenuItems(mapped)
          try {
            localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(mapped))
          } catch {}
        } else {
          const isInitialized = localStorage.getItem('chaisplit_menu_initialized')
          if (!isInitialized) {
            localStorage.setItem('chaisplit_menu_initialized', 'true')
            const seedItems = DEFAULT_MENU.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              category: item.category,
              emoji: item.emoji,
              description: item.description,
              shop_id: item.shopId
            }))
            client.from('menu_items').upsert(seedItems).then(({ error: upsertErr }) => {
              if (!upsertErr) {
                setMenuItems(DEFAULT_MENU)
                try {
                  localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(DEFAULT_MENU))
                } catch {}
              }
            }, (e: any) => console.warn(e))
          } else {
            setMenuItems([])
            try {
              localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify([]))
            } catch {}
          }
        }
      }
    } catch (e) {
      console.warn('Could not load menu items from Supabase:', e)
    }
  }, [])

  useEffect(() => {
    fetchMenuItems()
  }, [fetchMenuItems])

  // Fetch active session from Supabase
  const latestFetchIdRef = useRef(0)
  const broadcastChannelRef = useRef<any>(null)
  const lastLocalActionTimeRef = useRef<number>(0)

  const fetchActiveSession = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    const fetchId = ++latestFetchIdRef.current

    try {
      const { data: sessionsData, error: sessionErr } = await client
        .from('tea_sessions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (fetchId !== latestFetchIdRef.current) return

      if (sessionErr || !sessionsData || sessionsData.length === 0) {
        if (!sessionErr) {
          setActiveSessions([])
          setActiveSession(null)
          localStorage.removeItem(ACTIVE_SESSION_KEY)
        }
        return
      }

      const sessionIds = sessionsData.map((s: any) => s.id)

      // Fetch expenses for all active sessions
      const { data: expensesData } = await client
        .from('session_expenses')
        .select('*')
        .in('session_id', sessionIds)

      if (fetchId !== latestFetchIdRef.current) return

      // Fetch order items for all active sessions
      const { data: orderItemsData } = await client
        .from('order_items')
        .select('*')
        .in('session_id', sessionIds)

      if (fetchId !== latestFetchIdRef.current) return

      const mappedSessions: TeaSession[] = sessionsData.map((sessionData: any) => {
        const thisSessionExpensesData = (expensesData || []).filter((e: any) => e.session_id === sessionData.id)
        const thisSessionOrderItemsData = (orderItemsData || []).filter((i: any) => i.session_id === sessionData.id)

        const expenses: MemberExpense[] = thisSessionExpensesData.map((exp: any) => {
          const expPrefix = `${sessionData.id}-${exp.member_id}-`
          const memberItems: OrderItem[] = thisSessionOrderItemsData
            .filter((item: any) => item.expense_id === exp.id || item.member_id === exp.member_id)
            .map((item: any) => {
              const cleanItemId = item.id && item.id.startsWith(expPrefix) ? item.id.slice(expPrefix.length) : item.id
              return {
                id: item.id,
                menuItemId: item.menu_item_id || cleanItemId,
                name: item.name,
                price: Number(item.price) || 0,
                quantity: Number(item.quantity) || 1,
                emoji: item.emoji || '☕'
              }
            })

          const calculatedMemberTotal = memberItems.reduce((sum, it) => sum + it.price * it.quantity, 0)

          return {
            memberId: exp.member_id,
            memberName: exp.member_name,
            memberAvatar: exp.member_avatar || '☕',
            total: memberItems.length > 0 ? calculatedMemberTotal : (Number(exp.total) || 0),
            isPaid: !!exp.is_paid,
            paidAt: exp.paid_at || undefined,
            items: memberItems
          }
        })

        const calculatedGrandTotal = expenses.reduce((sum, e) => sum + e.total, 0)

        return {
          id: sessionData.id,
          title: sessionData.title,
          shopName: sessionData.shop_name,
          shopId: sessionData.shop_id,
          groupId: sessionData.group_id,
          groupName: sessionData.group_name,
          createdAt: new Date(sessionData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          payerId: sessionData.payer_id || '',
          payerName: sessionData.payer_name,
          payerUpi: sessionData.payer_upi,
          creatorId: sessionData.creator_id,
          creatorName: sessionData.creator_name,
          totalAmount: calculatedGrandTotal || (Number(sessionData.total_amount) || 0),
          status: sessionData.status,
          notes: sessionData.notes,
          expenses
        }
      })

      const isRecentLocalAction = Date.now() - lastLocalActionTimeRef.current < 3500

      setActiveSessions(prev => {
        if (isRecentLocalAction) {
          const map = new Map<string, TeaSession>()
          mappedSessions.forEach(s => map.set(s.id, s))
          prev.forEach(ps => {
            if (map.has(ps.id)) map.set(ps.id, ps)
          })
          return Array.from(map.values())
        }
        return mappedSessions
      })

      setActiveSession(prev => {
        if (isRecentLocalAction && prev) return prev
        if (prev && mappedSessions.some(s => s.id === prev.id)) {
          return mappedSessions.find(s => s.id === prev.id) || mappedSessions[0]
        }
        return mappedSessions[0] || null
      })
    } catch (err) {
      console.warn('Error fetching active session from Supabase:', err)
    }
  }, [])

  // Fetch past sessions from Supabase
  // Fetch past sessions from Supabase with full expense and order item breakdowns
  const fetchPastSessions = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    try {
      const { data, error } = await client
        .from('tea_sessions')
        .select('*')
        .eq('status', 'settled')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data) {
        const sessionIds = data.map((s: any) => s.id)
        let allPastExpenses: any[] = []
        let allPastOrderItems: any[] = []

        if (sessionIds.length > 0) {
          const [expRes, itemRes] = await Promise.all([
            client.from('session_expenses').select('*').in('session_id', sessionIds),
            client.from('order_items').select('*').in('session_id', sessionIds)
          ])
          if (expRes.data) allPastExpenses = expRes.data
          if (itemRes.data) allPastOrderItems = itemRes.data
        }

        const mapped: TeaSession[] = data.map((s: any) => {
          const sessionExp = allPastExpenses.filter(e => e.session_id === s.id)
          const sessionItems = allPastOrderItems.filter(i => i.session_id === s.id)

          const expenses: MemberExpense[] = sessionExp.map((e: any) => {
            const memberItems: OrderItem[] = sessionItems
              .filter((it: any) => it.expense_id === e.id || it.member_id === e.member_id)
              .map((it: any) => ({
                id: it.id,
                menuItemId: it.menu_item_id || it.id,
                name: it.name,
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1,
                emoji: it.emoji || '☕'
              }))

            const calculatedTotal = memberItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

            return {
              memberId: e.member_id,
              memberName: e.member_name,
              memberAvatar: e.member_avatar || '☕',
              items: memberItems,
              total: memberItems.length > 0 ? calculatedTotal : (Number(e.total) || 0),
              isPaid: !!e.is_paid,
              paidAt: e.paid_at || undefined
            }
          })

          const calculatedSessionTotal = expenses.reduce((sum, exp) => sum + exp.total, 0)

          return {
            id: s.id,
            title: s.title,
            shopName: s.shop_name,
            shopId: s.shop_id,
            groupId: s.group_id,
            groupName: s.group_name,
            createdAt: new Date(s.created_at).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            }),
            rawCreatedAt: s.created_at,
            payerId: s.payer_id || '',
            payerName: s.payer_name,
            payerUpi: s.payer_upi,
            creatorId: s.creator_id,
            creatorName: s.creator_name,
            totalAmount: calculatedSessionTotal || (Number(s.total_amount) || 0),
            status: 'settled',
            notes: s.notes,
            expenses
          }
        })
        setPastSessions(mapped)
      }
    } catch (err) {
      console.warn('Error fetching past sessions:', err)
    }
  }, [])

  // Initial load from Supabase
  useEffect(() => {
    fetchActiveSession()
    fetchPastSessions()
  }, [fetchActiveSession, fetchPastSessions])

  // Debounced refresh for Realtime notifications
  const refreshTimerRef = useRef<any>(null)
  const debouncedFetchActiveSession = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    refreshTimerRef.current = setTimeout(() => {
      fetchActiveSession()
    }, 80)
  }, [fetchActiveSession])

  // Supabase Realtime & Broadcast helpers (Atomic per-member sync for up to 30 people)
  const broadcastMemberExpenseUpdated = useCallback((sessionId: string, memberId: string, expense: MemberExpense) => {
    lastLocalActionTimeRef.current = Date.now()
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'MEMBER_EXPENSE_UPDATED',
        payload: { sessionId, memberId, expense }
      }).catch((e: any) => console.warn('Broadcast member error:', e))
    }
  }, [])

  const broadcastSessionUpdated = useCallback((session: TeaSession) => {
    lastLocalActionTimeRef.current = Date.now()
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'SESSION_UPDATED',
        payload: { session }
      }).catch((e: any) => console.warn('Broadcast send error:', e))
    }
  }, [])

  const broadcastSessionSettled = useCallback((settled: TeaSession) => {
    lastLocalActionTimeRef.current = Date.now()
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'SESSION_SETTLED',
        payload: { settled }
      }).catch((e: any) => console.warn('Broadcast send error:', e))
    }
  }, [])

  const broadcastSessionCancelled = useCallback((sessionId: string) => {
    lastLocalActionTimeRef.current = Date.now()
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'SESSION_CANCELLED',
        payload: { sessionId }
      }).catch((e: any) => console.warn('Broadcast send error:', e))
    }
  }, [])

  // Realtime subscription & Broadcast channel
  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client
      .channel('realtime_tea_breaks', {
        config: { broadcast: { self: false } }
      })
      .on('broadcast', { event: 'MEMBER_EXPENSE_UPDATED' }, ({ payload }) => {
        if (!payload || !payload.memberId || !payload.expense) return
        lastLocalActionTimeRef.current = Date.now()

        setActiveSessions(prevSessions =>
          prevSessions.map(sess => {
            if (payload.sessionId && sess.id !== payload.sessionId) return sess
            const existingIdx = sess.expenses.findIndex(e => e.memberId === payload.memberId)
            let newExpenses: MemberExpense[]
            if (existingIdx > -1) {
              newExpenses = sess.expenses.map((e, idx) => (idx === existingIdx ? payload.expense : e))
            } else {
              newExpenses = [...sess.expenses, payload.expense]
            }
            return recalculateSessionTotals({ ...sess, expenses: newExpenses })
          })
        )

        setActiveSession(prev => {
          if (!prev || (payload.sessionId && prev.id !== payload.sessionId)) return prev
          const existingIdx = prev.expenses.findIndex(e => e.memberId === payload.memberId)
          let newExpenses: MemberExpense[]
          if (existingIdx > -1) {
            newExpenses = prev.expenses.map((e, idx) => (idx === existingIdx ? payload.expense : e))
          } else {
            newExpenses = [...prev.expenses, payload.expense]
          }
          return recalculateSessionTotals({ ...prev, expenses: newExpenses })
        })
      })
      .on('broadcast', { event: 'SESSION_UPDATED' }, ({ payload }) => {
        if (payload?.session) {
          lastLocalActionTimeRef.current = Date.now()
          setActiveSessions(prev => [payload.session, ...prev.filter(s => s.id !== payload.session.id)])
          setActiveSession(payload.session)
        }
      })
      .on('broadcast', { event: 'SESSION_SETTLED' }, ({ payload }) => {
        lastLocalActionTimeRef.current = Date.now()
        if (payload?.settled) {
          setPastSessions(prev => [payload.settled, ...prev.filter(s => s.id !== payload.settled.id)])
          setActiveSessions(prev => prev.filter(s => s.id !== payload.settled.id))
          setActiveSession(prev => (prev?.id === payload.settled.id ? null : prev))
        }
      })
      .on('broadcast', { event: 'SESSION_CANCELLED' }, ({ payload }) => {
        lastLocalActionTimeRef.current = Date.now()
        const cancelledId = payload?.sessionId
        if (cancelledId) {
          setActiveSessions(prev => prev.filter(s => s.id !== cancelledId))
          setActiveSession(prev => (prev?.id === cancelledId ? null : prev))
        } else {
          setActiveSessions([])
          setActiveSession(null)
        }
      })
      .on('broadcast', { event: 'MENU_ITEM_DELETED' }, ({ payload }) => {
        if (payload?.itemId) {
          setMenuItems(prev => {
            const updated = prev.filter(item => item.id !== payload.itemId)
            try {
              localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(updated))
            } catch {}
            return updated
          })
        }
      })
      .on('broadcast', { event: 'MENU_ITEM_ADDED' }, ({ payload }) => {
        if (payload?.item) {
          setMenuItems(prev => {
            if (prev.some(i => i.id === payload.item.id)) return prev
            const updated = [...prev, payload.item]
            try {
              localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(updated))
            } catch {}
            return updated
          })
        }
      })
      .on('broadcast', { event: 'MENU_ITEM_PRICE_UPDATED' }, ({ payload }) => {
        if (payload?.itemId && typeof payload?.price === 'number') {
          setMenuItems(prev => {
            const updated = prev.map(item => item.id === payload.itemId ? { ...item, price: payload.price } : item)
            try {
              localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(updated))
            } catch {}
            return updated
          })
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tea_sessions' }, () => {
        debouncedFetchActiveSession()
        fetchPastSessions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_expenses' }, () => {
        debouncedFetchActiveSession()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        debouncedFetchActiveSession()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchMenuItems()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          broadcastChannelRef.current = channel
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[Realtime] Channel error/timeout, refreshing session...')
          debouncedFetchActiveSession()
        }
      })

    broadcastChannelRef.current = channel

    return () => {
      broadcastChannelRef.current = null
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      client.removeChannel(channel)
    }
  }, [debouncedFetchActiveSession, fetchPastSessions, fetchMenuItems])

  // Automatic Polling Heartbeat: relaxed 20s interval so 30 concurrent users do not thrash DB
  useEffect(() => {
    const intervalMs = (activeSession && activeSession.status === 'active') ? 20000 : 8000
    const timer = setInterval(() => {
      fetchActiveSession()
    }, intervalMs)

    return () => clearInterval(timer)
  }, [activeSession?.id, activeSession?.status, fetchActiveSession])

  // Window Focus & Visibility sync: immediately refreshes when user switches back to browser tab
  useEffect(() => {
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        fetchActiveSession()
      }
    }
    window.addEventListener('visibilitychange', handleActive)
    window.addEventListener('focus', handleActive)
    return () => {
      window.removeEventListener('visibilitychange', handleActive)
      window.removeEventListener('focus', handleActive)
    }
  }, [fetchActiveSession])

  // Sync to local cache
  useEffect(() => {
    try {
      if (activeSession) {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(activeSession))
      } else {
        localStorage.removeItem(ACTIVE_SESSION_KEY)
      }
    } catch (e) {
      console.error('Failed to save active session', e)
    }
  }, [activeSession])

  useEffect(() => {
    try {
      localStorage.setItem(PAST_SESSIONS_KEY, JSON.stringify(pastSessions))
    } catch (e) {
      console.error('Failed to save past sessions', e)
    }
  }, [pastSessions])

  useEffect(() => {
    try {
      localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(menuItems))
    } catch (e) {
      console.error('Failed to save menu items', e)
    }
  }, [menuItems])

  const recalculateSessionTotals = (session: TeaSession): TeaSession => {
    let grandTotal = 0
    const updatedExpenses = session.expenses.map(exp => {
      const memberTotal = exp.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      grandTotal += memberTotal
      return {
        ...exp,
        total: memberTotal,
        isPaid: exp.memberId === session.payerId ? true : exp.isPaid
      }
    })

    return {
      ...session,
      totalAmount: grandTotal,
      expenses: updatedExpenses
    }
  }

  const addMemberToSession = (user: User) => {
    if (!activeSession) return
    const existing = activeSession.expenses.find(e => e.memberId === user.id)
    if (existing) return

    const newExpense: MemberExpense = {
      memberId: user.id,
      memberName: user.name,
      memberAvatar: user.avatar,
      items: [],
      total: 0,
      isPaid: false
    }

    if (supabase) {
      const client = supabase
      client.from('session_expenses').insert({
        id: `${activeSession.id}-${user.id}`,
        session_id: activeSession.id,
        member_id: user.id,
        member_name: user.name,
        member_avatar: user.avatar,
        total: 0,
        is_paid: false
      }).then(() => {}, (e: any) => console.warn(e))
    }

    setActiveSession(prev => {
      if (!prev) return null
      return {
        ...prev,
        expenses: [...prev.expenses, newExpense]
      }
    })
    if (newExpense) {
      broadcastMemberExpenseUpdated(activeSession.id, user.id, newExpense)
    }
  }

  const ensureSessionInDb = async (sessionId: string) => {
    if (!supabase) return
    const client = supabase
    try {
      const { data } = await client.from('tea_sessions').select('id').eq('id', sessionId).maybeSingle()
      if (!data && activeSession) {
        const { error } = await client.from('tea_sessions').upsert({
          id: activeSession.id,
          title: activeSession.title,
          shop_name: activeSession.shopName,
          shop_id: activeSession.shopId || null,
          group_id: activeSession.groupId || null,
          group_name: activeSession.groupName || null,
          payer_name: activeSession.payerName || 'Admin',
          total_amount: activeSession.totalAmount || 0,
          status: 'active'
        })
        if (error) {
          await client.from('tea_sessions').upsert({
            id: activeSession.id,
            title: activeSession.title,
            shop_name: activeSession.shopName,
            payer_name: activeSession.payerName || 'Admin',
            total_amount: activeSession.totalAmount || 0,
            status: 'active'
          })
        }
      }
    } catch {}
  }

  const syncExpenseToSupabase = async (sessionId: string, exp: MemberExpense, sessionTotal?: number) => {
    if (!supabase) return
    const client = supabase
    const expenseId = `${sessionId}-${exp.memberId}`
    try {
      // 0. Ensure session row exists in DB
      await ensureSessionInDb(sessionId)

      // 1. Ensure profile exists so foreign key doesn't fail
      const existingUser = allUsers.find(u => u.id === exp.memberId) || (user?.id === exp.memberId ? user : null)
      const userEmail = existingUser?.email || `${exp.memberId}@team.chaisplit.internal`
      await client.from('profiles').upsert({
        id: exp.memberId,
        name: exp.memberName,
        email: userEmail,
        avatar: exp.memberAvatar || '☕',
        team_name: 'Team'
      }, { onConflict: 'id', ignoreDuplicates: true })

      // 2. Upsert session_expenses FIRST so foreign key constraint (expense_id) in order_items is satisfied
      await client
        .from('session_expenses')
        .upsert({
          id: expenseId,
          session_id: sessionId,
          member_id: exp.memberId,
          member_name: exp.memberName,
          member_avatar: exp.memberAvatar,
          total: exp.total,
          is_paid: exp.isPaid
        }, { onConflict: 'id' })

      // 3. Map current order items
      const currentRows = (exp.items || []).map((item, idx) => {
        const itemId = item.id || `${expenseId}-${item.menuItemId || idx}`
        return {
          id: itemId,
          session_id: sessionId,
          expense_id: expenseId,
          member_id: exp.memberId,
          menu_item_id: item.menuItemId || null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          emoji: item.emoji || '☕'
        }
      })

      const currentItemIds = new Set(currentRows.map(r => r.id))

      // Fetch all existing order items in DB for this session AND member
      const { data: existingDbItems } = await client
        .from('order_items')
        .select('id')
        .eq('session_id', sessionId)
        .eq('member_id', exp.memberId)

      if (existingDbItems && existingDbItems.length > 0) {
        const toDeleteIds = existingDbItems
          .filter((di: any) => !currentItemIds.has(di.id))
          .map((di: any) => di.id)

        if (toDeleteIds.length > 0) {
          await client.from('order_items').delete().in('id', toDeleteIds)
        }
      }

      if (currentRows.length > 0) {
        const { error: upsertErr } = await client.from('order_items').upsert(currentRows, { onConflict: 'id' })
        if (upsertErr) {
          const fallbackRows = currentRows.map(r => ({ ...r, menu_item_id: null }))
          await client.from('order_items').upsert(fallbackRows, { onConflict: 'id' })
        }
      } else {
        // If all items were removed for this member, ensure DB is 100% clean
        await client
          .from('order_items')
          .delete()
          .eq('session_id', sessionId)
          .eq('member_id', exp.memberId)

        await client
          .from('order_items')
          .delete()
          .eq('session_id', sessionId)
          .eq('expense_id', expenseId)
      }

      // 4. Update total_amount in tea_sessions
      if (sessionTotal !== undefined) {
        await client
          .from('tea_sessions')
          .update({ total_amount: sessionTotal })
          .eq('id', sessionId)
      }
    } catch (e) {
      console.warn('Sync expense warning:', e)
    }
  }

  const addItemToMember = async (memberId: string, menuItem: MenuItem, sessionId?: string): Promise<boolean> => {
    const targetSession = (sessionId ? activeSessions.find(s => s.id === sessionId) : null) || activeSession
    if (!targetSession) return false

    lastLocalActionTimeRef.current = Date.now()
    const targetSessionId = targetSession.id

    let memberFound = false
    const updatedExpenses = targetSession.expenses.map(exp => {
      if (exp.memberId !== memberId) return exp
      memberFound = true

      const itemIdx = exp.items.findIndex(
        i =>
          i.menuItemId === menuItem.id ||
          i.id === menuItem.id ||
          (i.name && i.name.toLowerCase().trim() === menuItem.name.toLowerCase().trim())
      )
      let updatedItems: OrderItem[] = []

      if (itemIdx > -1) {
        updatedItems = exp.items.map((item, idx) =>
          idx === itemIdx ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        updatedItems = [
          ...exp.items,
          {
            id: `${targetSession.id}-${memberId}-${menuItem.id}`,
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            emoji: menuItem.emoji
          }
        ]
      }

      return {
        ...exp,
        items: updatedItems,
        isPaid: exp.memberId === targetSession.payerId ? true : false
      }
    })

    let updatedSession: TeaSession
    if (!memberFound) {
      const userObj = (user && user.id === memberId ? user : null) || allUsers.find(u => u.id === memberId)
      const memberName = userObj?.name || (memberId === user?.id ? user?.name : 'Member') || 'Member'
      const memberAvatar = userObj?.avatar || (memberId === user?.id ? user?.avatar : '☕') || '☕'

      const newExp: MemberExpense = {
        memberId,
        memberName,
        memberAvatar,
        items: [
          {
            id: `${targetSession.id}-${memberId}-${menuItem.id}`,
            menuItemId: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            emoji: menuItem.emoji
          }
        ],
        total: menuItem.price,
        isPaid: memberId === targetSession.payerId
      }
      updatedSession = recalculateSessionTotals({
        ...targetSession,
        expenses: [...targetSession.expenses, newExp]
      })
    } else {
      updatedSession = recalculateSessionTotals({
        ...targetSession,
        expenses: updatedExpenses
      })
    }

    const finalExpenseToSync = updatedSession.expenses.find(e => e.memberId === memberId)
    const targetSessionTotal = updatedSession.totalAmount

    // 1. Update React state synchronously
    setActiveSessions(prevSessions =>
      prevSessions.map(sess => (sess.id === targetSessionId ? updatedSession : sess))
    )
    setActiveSession(prev => (prev?.id === targetSessionId ? updatedSession : prev))

    try {
      if (activeSession?.id === targetSessionId || !activeSession) {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession))
      }
    } catch {}

    // 2. Broadcast and persist
    if (finalExpenseToSync) {
      broadcastMemberExpenseUpdated(targetSessionId, memberId, finalExpenseToSync)
      broadcastSessionUpdated(updatedSession)
      await syncExpenseToSupabase(targetSessionId, finalExpenseToSync, targetSessionTotal)
      return true
    }

    return false
  }

  const removeItemFromMember = async (memberId: string, menuItemId: string, sessionId?: string): Promise<boolean> => {
    const targetSession = (sessionId ? activeSessions.find(s => s.id === sessionId) : null) || activeSession
    if (!targetSession) return false

    lastLocalActionTimeRef.current = Date.now()
    const targetSessionId = targetSession.id
    const cleanTarget = (menuItemId || '').trim().toLowerCase()

    let memberFound = false
    let targetExpenseToSync: MemberExpense | null = null

    const updatedExpenses = targetSession.expenses.map(exp => {
      if (exp.memberId !== memberId) return exp
      memberFound = true

      let decremented = false
      const updatedItems = exp.items
        .map(item => {
          if (decremented) return item
          const isMatch =
            item.id === menuItemId ||
            item.menuItemId === menuItemId ||
            (item.name && item.name.toLowerCase().trim() === cleanTarget) ||
            (item.id && menuItemId && item.id.endsWith(menuItemId)) ||
            (item.id && menuItemId && menuItemId.endsWith(item.id)) ||
            (item.menuItemId && menuItemId && (item.menuItemId.includes(menuItemId) || menuItemId.includes(item.menuItemId)))

          if (isMatch) {
            decremented = true
            return { ...item, quantity: item.quantity - 1 }
          }
          return item
        })
        .filter(item => item.quantity > 0)

      const updatedExp: MemberExpense = {
        ...exp,
        items: updatedItems,
        total: updatedItems.reduce((sum, it) => sum + it.price * it.quantity, 0)
      }
      targetExpenseToSync = updatedExp
      return updatedExp
    })

    if (!memberFound) return false

    const updatedSession = recalculateSessionTotals({
      ...targetSession,
      expenses: updatedExpenses
    })

    const finalExpenseToSync = updatedSession.expenses.find(e => e.memberId === memberId) || targetExpenseToSync!
    const targetSessionTotal = updatedSession.totalAmount

    // 1. Immediately update local React state
    setActiveSessions(prevSessions =>
      prevSessions.map(sess => (sess.id === targetSessionId ? updatedSession : sess))
    )
    setActiveSession(prev => (prev?.id === targetSessionId ? updatedSession : prev))

    try {
      if (activeSession?.id === targetSessionId || !activeSession) {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(updatedSession))
      }
    } catch {}

    // 2. Realtime broadcast to peers
    broadcastMemberExpenseUpdated(targetSessionId, memberId, finalExpenseToSync)
    broadcastSessionUpdated(updatedSession)

    // 3. API Call to Supabase - immediately syncs removal to backend
    await syncExpenseToSupabase(targetSessionId, finalExpenseToSync, targetSessionTotal)

    return true
  }

  const toggleMemberPaid = (memberId: string, sessionId?: string) => {
    const targetSession = (sessionId ? activeSessions.find(s => s.id === sessionId) : null) || activeSession
    if (!targetSession) return
    const targetSessionId = targetSession.id
    lastLocalActionTimeRef.current = Date.now()

    let updatedMemberExp: MemberExpense | null = null
    const updatedExpenses = targetSession.expenses.map(exp => {
      if (exp.memberId !== memberId) return exp
      const willBePaid = !exp.isPaid
      const paidAtStr = willBePaid ? new Date().toISOString() : undefined

      if (supabase) {
        const client = supabase
        client
          .from('session_expenses')
          .update({ is_paid: willBePaid, paid_at: paidAtStr || null })
          .eq('id', `${targetSession.id}-${memberId}`)
          .then(() => {}, (e: any) => console.warn(e))
      }

      const updated = {
        ...exp,
        isPaid: willBePaid,
        paidAt: willBePaid
          ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined
      }
      updatedMemberExp = updated
      return updated
    })

    const updatedSession = recalculateSessionTotals({
      ...targetSession,
      expenses: updatedExpenses
    })

    setActiveSessions(prevSessions =>
      prevSessions.map(sess => (sess.id === targetSessionId ? updatedSession : sess))
    )
    setActiveSession(prev => (prev?.id === targetSessionId ? updatedSession : prev))

    if (updatedMemberExp) {
      broadcastMemberExpenseUpdated(targetSessionId, memberId, updatedMemberExp)
      broadcastSessionUpdated(updatedSession)
    }
  }

  const setPayer = (payerId: string, sessionId?: string) => {
    const targetSession = (sessionId ? activeSessions.find(s => s.id === sessionId) : null) || activeSession
    if (!targetSession) return
    const user = allUsers.find(u => u.id === payerId)
    if (!user) return
    const targetSessionId = targetSession.id
    lastLocalActionTimeRef.current = Date.now()

    const updated = {
      ...targetSession,
      payerId: user.id,
      payerName: user.name,
      payerUpi: user.upiId || `${user.name.toLowerCase().replace(/\s+/g, '')}@upi`
    }

    if (supabase) {
      const client = supabase
      client
        .from('tea_sessions')
        .update({
          payer_id: user.id,
          payer_name: user.name,
          payer_upi: updated.payerUpi
        })
        .eq('id', targetSession.id)
        .then(() => {}, (e: any) => console.warn(e))
    }

    const updatedSession = recalculateSessionTotals(updated)

    setActiveSessions(prevSessions =>
      prevSessions.map(sess => (sess.id === targetSessionId ? updatedSession : sess))
    )
    setActiveSession(prev => (prev?.id === targetSessionId ? updatedSession : prev))

    broadcastSessionUpdated(updatedSession)
  }

  const deleteActiveSession = (_userId?: string, sessionId?: string): { success: boolean; message: string } => {
    const targetSession = (sessionId ? activeSessions.find(s => s.id === sessionId) : null) || activeSession
    if (!targetSession) {
      return { success: false, message: 'No active tea break found.' }
    }

    const targetId = targetSession.id
    if (supabase) {
      const client = supabase
      client.from('tea_sessions').delete().eq('id', targetId).then(() => {}, (e: any) => console.warn(e))
    }

    broadcastSessionCancelled(targetId)
    setActiveSessions(prev => prev.filter(s => s.id !== targetId))
    setActiveSession(prev => (prev?.id === targetId ? null : prev))
    if (activeSession?.id === targetId) {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
    return { success: true, message: 'Tea break closed successfully. A new break can now be started!' }
  }

  const cancelActiveSession = (userId?: string, sessionId?: string): boolean => {
    const res = deleteActiveSession(userId, sessionId)
    return res.success
  }

  const addNewSession = (
    title: string,
    shopName: string,
    members?: User[],
    groupId?: string,
    groupName?: string,
    payerId?: string,
    shopId?: string,
    creatorId?: string,
    creatorName?: string
  ): boolean => {
    // ENFORCE: In a single group, user can only create ONE break at a time!
    if (groupId) {
      const existingInGroup = activeSessions.find(s => s.groupId === groupId && s.status === 'active')
      if (existingInGroup) {
        console.warn(`[ExpenseContext] Cannot create break: Group ${groupId} already has an ongoing active break ("${existingInGroup.title}"). Close it first.`)
        return false
      }
    } else if (activeSession && activeSession.status === 'active') {
      console.warn('Cannot create new session while an active session already exists.')
      return false
    }

    const sessionMembers = members && members.length > 0 ? members : allUsers
    const effectivePayerId = payerId || sessionMembers[0]?.id || allUsers[0]?.id || 'unknown'
    const payerUser = allUsers.find(u => u.id === effectivePayerId) || sessionMembers.find(u => u.id === effectivePayerId)
    const payerName = payerUser?.name || 'Admin'
    const payerUpi = payerUser?.upiId || 'office@upi'

    const effectiveCreatorId = creatorId || effectivePayerId
    const creatorUser = allUsers.find(u => u.id === effectiveCreatorId) || sessionMembers.find(u => u.id === effectiveCreatorId)
    const effectiveCreatorName = creatorName || creatorUser?.name || payerName

    const newSess: TeaSession = {
      id: `session-${Date.now()}`,
      title: title.trim() || 'Office Chai Break ☕',
      shopName: shopName.trim() || 'Chayakkada',
      shopId,
      groupId,
      groupName,
      createdAt: 'Just now',
      payerId: effectivePayerId,
      payerName,
      payerUpi,
      creatorId: effectiveCreatorId,
      creatorName: effectiveCreatorName,
      totalAmount: 0,
      status: 'active',
      expenses: sessionMembers.map(u => ({
        memberId: u.id,
        memberName: u.name,
        memberAvatar: u.avatar || u.name.slice(0, 2).toUpperCase(),
        items: [],
        total: 0,
        isPaid: u.id === effectivePayerId
      }))
    }

    if (supabase) {
      const client = supabase
      ;(async () => {
        try {
          // 1. Ensure all session members exist in profiles to prevent FK constraint failure
          for (const exp of newSess.expenses) {
            const existingU = allUsers.find(u => u.id === exp.memberId) || (user?.id === exp.memberId ? user : null)
            await client.from('profiles').upsert({
              id: exp.memberId,
              name: exp.memberName,
              email: existingU?.email || `${exp.memberId}@team.chaisplit.internal`,
              avatar: exp.memberAvatar || '☕',
              team_name: newSess.groupName || 'Team'
            }, { onConflict: 'id', ignoreDuplicates: true })
          }

          // 2. Insert tea_sessions
          const { error: sessErr } = await client
            .from('tea_sessions')
            .insert({
              id: newSess.id,
              title: newSess.title,
              shop_name: newSess.shopName,
              shop_id: newSess.shopId || null,
              group_id: newSess.groupId || null,
              group_name: newSess.groupName || null,
              payer_id: newSess.payerId || null,
              payer_name: newSess.payerName || 'Admin',
              payer_upi: newSess.payerUpi || null,
              creator_id: newSess.creatorId || null,
              creator_name: newSess.creatorName || null,
              total_amount: 0,
              status: 'active'
            })

          if (sessErr) {
            // Fallback: If FK constraint on shop_id, group_id, payer_id or creator_id failed
            await client.from('tea_sessions').insert({
              id: newSess.id,
              title: newSess.title,
              shop_name: newSess.shopName,
              payer_name: newSess.payerName || 'Admin',
              total_amount: 0,
              status: 'active'
            })
          }

          // 3. Insert session_expenses once tea_sessions exists
          if (newSess.expenses.length > 0) {
            await client
              .from('session_expenses')
              .insert(
                newSess.expenses.map(exp => ({
                  id: `${newSess.id}-${exp.memberId}`,
                  session_id: newSess.id,
                  member_id: exp.memberId,
                  member_name: exp.memberName,
                  member_avatar: exp.memberAvatar,
                  total: 0,
                  is_paid: exp.isPaid
                }))
              )
          }
        } catch (err) {
          console.warn('Error syncing new session to Supabase:', err)
        }
      })()
    }

    setActiveSessions(prev => [newSess, ...prev.filter(s => s.id !== newSess.id && (!groupId || s.groupId !== groupId))])
    setActiveSession(newSess)
    broadcastSessionUpdated(newSess)
    return true
  }

  const settleActiveSession = (sessionId?: string) => {
    const targetSession = (sessionId ? activeSessions.find(s => s.id === sessionId) : null) || activeSession
    if (!targetSession) return

    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#d97706', '#10b981', '#6366f1']
      })
    } catch {
      // ignore
    }

    const settled: TeaSession = {
      ...targetSession,
      status: 'settled',
      rawCreatedAt: targetSession.rawCreatedAt || new Date().toISOString(),
      expenses: targetSession.expenses.map(e => ({ ...e, isPaid: true }))
    }

    if (supabase) {
      const client = supabase
      client.from('tea_sessions').update({ status: 'settled' }).eq('id', targetSession.id).then(() => {}, (e: any) => console.warn(e))
      client.from('session_expenses').update({ is_paid: true }).eq('session_id', targetSession.id).then(() => {}, (e: any) => console.warn(e))
    }

    broadcastSessionSettled(settled)
    setPastSessions(prev => [settled, ...prev])
    setActiveSessions(prev => prev.filter(s => s.id !== targetSession.id))
    setActiveSession(prev => (prev?.id === targetSession.id ? (activeSessions.find(s => s.id !== targetSession.id) || null) : prev))
    if (activeSession?.id === targetSession.id) {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    }
  }

  const getMenuItemsForShop = (shopId?: string): MenuItem[] => {
    if (!shopId) return menuItems
    return menuItems.filter(item => item.shopId === shopId)
  }

  const addCustomMenuItem = async (
    name: string,
    price: number,
    emoji?: string,
    category?: MenuItem['category'],
    shopId?: string
  ): Promise<MenuItem> => {
    const effectiveShopId = shopId || activeSession?.shopId || 'shop-chayakkada'
    const newItem: MenuItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      price: Math.max(0, Number(price)),
      category: category || 'snacks',
      emoji: emoji || '☕',
      description: 'Shop menu item',
      shopId: effectiveShopId
    }

    setMenuItems(prev => {
      const updated = [...prev, newItem]
      try {
        localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'MENU_ITEM_ADDED',
        payload: { item: newItem }
      }).catch((e: any) => console.warn('[Realtime] Broadcast add error:', e))
    }

    if (supabase) {
      try {
        await supabase.from('menu_items').insert({
          id: newItem.id,
          name: newItem.name,
          price: newItem.price,
          category: newItem.category,
          emoji: newItem.emoji,
          description: newItem.description,
          shop_id: newItem.shopId
        })
      } catch (e: any) {
        console.warn('[Supabase API] Error adding menu item:', e)
      }
    }

    return newItem
  }

  const updateMenuItemPrice = async (itemId: string, newPrice: number): Promise<boolean> => {
    const safePrice = Math.max(0, Number(newPrice))

    setMenuItems(prev => {
      const updated = prev.map(item => (item.id === itemId ? { ...item, price: safePrice } : item))
      try {
        localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'MENU_ITEM_PRICE_UPDATED',
        payload: { itemId, price: safePrice }
      }).catch((e: any) => console.warn('[Realtime] Broadcast price error:', e))
    }

    if (supabase) {
      try {
        const { error } = await supabase.from('menu_items').update({ price: safePrice }).eq('id', itemId)
        if (error) {
          console.error('[Supabase API] Error updating price:', error)
          return false
        }
      } catch (e: any) {
        console.warn('[Supabase API] Exception updating price:', e)
        return false
      }
    }

    return true
  }

  const deleteMenuItem = async (itemId: string): Promise<boolean> => {
    // 1. Optimistic local update & persist
    setMenuItems(prev => {
      const updated = prev.filter(item => item.id !== itemId)
      try {
        localStorage.setItem(MENU_ITEMS_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })

    // 2. Realtime broadcast to peers
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'MENU_ITEM_DELETED',
        payload: { itemId }
      }).catch((e: any) => console.warn('[Realtime] Broadcast delete error:', e))
    }

    // 3. API Call to Supabase
    if (supabase) {
      try {
        // First disconnect any order items that reference this menu item
        await supabase.from('order_items').update({ menu_item_id: null }).eq('menu_item_id', itemId)

        const { error } = await supabase.from('menu_items').delete().eq('id', itemId)
        if (error) {
          console.error('[Supabase API] Failed to delete menu item:', error)
          fetchMenuItems()
          return false
        }
      } catch (err) {
        console.error('[Supabase API] Error deleting menu item:', err)
        fetchMenuItems()
        return false
      }
    }

    return true
  }

  const removeMenuItemsForShop = (shopId: string) => {
    if (supabase) {
      const client = supabase
      client.from('menu_items').delete().eq('shop_id', shopId).then(() => {}, (e: any) => console.warn(e))
    }
    setMenuItems(prev => prev.filter(item => item.shopId !== shopId))
  }

  const getShopItemSummary = () => {
    if (!activeSession) return []
    const summaryMap: Record<string, { name: string; emoji: string; count: number; totalCost: number }> = {}

    activeSession.expenses.forEach(exp => {
      exp.items.forEach(item => {
        if (!summaryMap[item.name]) {
          summaryMap[item.name] = {
            name: item.name,
            emoji: item.emoji,
            count: 0,
            totalCost: 0
          }
        }
        summaryMap[item.name].count += item.quantity
        summaryMap[item.name].totalCost += item.price * item.quantity
      })
    })

    return Object.values(summaryMap)
  }

  const generateWhatsAppSummary = (): string => {
    if (!activeSession) return ''
    const dateStr = new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })

    let text = `☕ *${activeSession.title}*\n`
    text += `📍 Shop: ${activeSession.shopName}\n`
    text += `📅 Date: ${dateStr}\n`
    text += `💳 Payer: *${activeSession.payerName}*\n`
    if (activeSession.payerUpi) {
      text += `📱 UPI ID: \`${activeSession.payerUpi}\`\n`
    }
    text += `💰 *Total Bill: ₹${activeSession.totalAmount}*\n`
    text += `──────────────────\n`
    text += `*Member Breakdown:*\n`

    activeSession.expenses.forEach(exp => {
      if (exp.total === 0 && exp.items.length === 0) return
      const statusIcon = exp.isPaid ? '✅' : '⏳'
      text += `\n${statusIcon} *${exp.memberName}* — *₹${exp.total}*\n`
      if (exp.items.length > 0) {
        exp.items.forEach(item => {
          text += `  • ${item.emoji} ${item.name} × ${item.quantity} (₹${item.price * item.quantity})\n`
        })
      }
    })

    text += `\n──────────────────\n`
    text += `_Sent via Nibru-Tea ☕_`
    return text
  }

  return (
    <ExpenseContext.Provider
      value={{
        activeSession,
        activeSessions,
        getActiveSessionForGroup,
        pastSessions,
        menuItems,
        addItemToMember,
        removeItemFromMember,
        toggleMemberPaid,
        setPayer,
        addNewSession,
        cancelActiveSession,
        deleteActiveSession,
        settleActiveSession,
        addMemberToSession,
        getMenuItemsForShop,
        addCustomMenuItem,
        updateMenuItemPrice,
        deleteMenuItem,
        removeMenuItemsForShop,
        getShopItemSummary,
        generateWhatsAppSummary
      }}
    >
      {children}
    </ExpenseContext.Provider>
  )
}

export const useExpense = () => {
  const context = useContext(ExpenseContext)
  if (!context) {
    throw new Error('useExpense must be used within an ExpenseProvider')
  }
  return context
}
