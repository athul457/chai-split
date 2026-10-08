import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'
import type { TeaSession, MenuItem, OrderItem, MemberExpense, User } from '../types'
import { DEFAULT_MENU } from '../lib/mockData'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

interface ExpenseContextType {
  activeSession: TeaSession | null
  pastSessions: TeaSession[]
  menuItems: MenuItem[]
  addItemToMember: (memberId: string, menuItem: MenuItem) => void
  removeItemFromMember: (memberId: string, menuItemId: string) => void
  toggleMemberPaid: (memberId: string) => void
  setPayer: (payerId: string) => void
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
  cancelActiveSession: (userId?: string) => boolean
  deleteActiveSession: (userId?: string) => { success: boolean; message: string }
  settleActiveSession: () => void
  addMemberToSession: (user: User) => void
  getMenuItemsForShop: (shopId?: string) => MenuItem[]
  addCustomMenuItem: (
    name: string,
    price: number,
    emoji?: string,
    category?: MenuItem['category'],
    shopId?: string
  ) => void
  updateMenuItemPrice: (itemId: string, newPrice: number) => void
  deleteMenuItem: (itemId: string) => void
  getShopItemSummary: () => { name: string; emoji: string; count: number; totalCost: number }[]
  generateWhatsAppSummary: () => string
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined)

const ACTIVE_SESSION_KEY = 'chaisplit_active_session_v3'
const PAST_SESSIONS_KEY = 'chaisplit_past_sessions_v3'
const MENU_ITEMS_KEY = 'chaisplit_menu_items_v3'

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { allUsers } = useAuth()

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
  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const loadMenu = async () => {
      try {
        const { data, error } = await client.from('menu_items').select('*')
        if (!error && data && data.length > 0) {
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
        }
      } catch (e) {
        console.warn('Could not load menu items:', e)
      }
    }
    loadMenu()
  }, [])

  // Fetch active session from Supabase
  const fetchActiveSession = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    try {
      const { data: sessionData, error: sessionErr } = await client
        .from('tea_sessions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sessionErr || !sessionData) {
        if (!sessionErr && !sessionData) {
          setActiveSession(null)
          localStorage.removeItem(ACTIVE_SESSION_KEY)
        }
        return
      }

      // Fetch expenses
      const { data: expensesData } = await client
        .from('session_expenses')
        .select('*')
        .eq('session_id', sessionData.id)

      // Fetch order items
      const { data: orderItemsData } = await client
        .from('order_items')
        .select('*')
        .eq('session_id', sessionData.id)

      const expenses: MemberExpense[] = (expensesData || []).map((exp: any) => ({
        memberId: exp.member_id,
        memberName: exp.member_name,
        memberAvatar: exp.member_avatar || '☕',
        total: Number(exp.total) || 0,
        isPaid: !!exp.is_paid,
        paidAt: exp.paid_at || undefined,
        items: (orderItemsData || [])
          .filter((item: any) => item.expense_id === exp.id || item.member_id === exp.member_id)
          .map((item: any) => ({
            id: item.id,
            menuItemId: item.menu_item_id || item.id,
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1,
            emoji: item.emoji || '☕'
          }))
      }))

      const fullSession: TeaSession = {
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
        totalAmount: Number(sessionData.total_amount) || 0,
        status: sessionData.status,
        notes: sessionData.notes,
        expenses
      }

      setActiveSession(fullSession)
    } catch (err) {
      console.warn('Error fetching active session from Supabase:', err)
    }
  }, [])

  // Fetch past sessions from Supabase
  const fetchPastSessions = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    try {
      const { data, error } = await client
        .from('tea_sessions')
        .select('*')
        .eq('status', 'settled')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && data) {
        const mapped: TeaSession[] = data.map((s: any) => ({
          id: s.id,
          title: s.title,
          shopName: s.shop_name,
          shopId: s.shop_id,
          groupId: s.group_id,
          groupName: s.group_name,
          createdAt: new Date(s.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          payerId: s.payer_id || '',
          payerName: s.payer_name,
          payerUpi: s.payer_upi,
          creatorId: s.creator_id,
          creatorName: s.creator_name,
          totalAmount: Number(s.total_amount) || 0,
          status: 'settled',
          notes: s.notes,
          expenses: []
        }))
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

  // Realtime subscription
  useEffect(() => {
    if (!supabase) return
    const client = supabase

    const channel = client
      .channel('realtime_tea_breaks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tea_sessions' }, () => {
        fetchActiveSession()
        fetchPastSessions()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_expenses' }, () => {
        fetchActiveSession()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        fetchActiveSession()
      })
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [fetchActiveSession, fetchPastSessions])

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
  }

  const syncExpenseToSupabase = async (sessionId: string, exp: MemberExpense) => {
    if (!supabase) return
    const client = supabase
    const expenseId = `${sessionId}-${exp.memberId}`
    try {
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
        })
      await client
        .from('tea_sessions')
        .update({ total_amount: exp.total })
        .eq('id', sessionId)
    } catch (e) {
      console.warn('Sync expense warning:', e)
    }
  }

  const addItemToMember = (memberId: string, menuItem: MenuItem) => {
    if (!activeSession) return

    setActiveSession(prev => {
      if (!prev) return null

      let memberFound = false
      const updatedExpenses = prev.expenses.map(exp => {
        if (exp.memberId !== memberId) return exp
        memberFound = true

        const itemIdx = exp.items.findIndex(i => i.menuItemId === menuItem.id)
        let updatedItems: OrderItem[] = []

        if (itemIdx > -1) {
          updatedItems = exp.items.map((item, idx) =>
            idx === itemIdx ? { ...item, quantity: item.quantity + 1 } : item
          )
        } else {
          updatedItems = [
            ...exp.items,
            {
              id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
          isPaid: exp.memberId === prev.payerId ? true : false
        }
      })

      if (!memberFound) {
        const userObj = allUsers.find(u => u.id === memberId)
        if (userObj) {
          const newExp: MemberExpense = {
            memberId: userObj.id,
            memberName: userObj.name,
            memberAvatar: userObj.avatar,
            items: [
              {
                id: `item-${Date.now()}`,
                menuItemId: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: 1,
                emoji: menuItem.emoji
              }
            ],
            total: menuItem.price,
            isPaid: userObj.id === prev.payerId
          }
          const updated = recalculateSessionTotals({
            ...prev,
            expenses: [...prev.expenses, newExp]
          })

          syncExpenseToSupabase(prev.id, newExp)
          return updated
        }
      }

      const updated = recalculateSessionTotals({
        ...prev,
        expenses: updatedExpenses
      })

      const targetExp = updated.expenses.find(e => e.memberId === memberId)
      if (targetExp) syncExpenseToSupabase(prev.id, targetExp)

      return updated
    })
  }

  const removeItemFromMember = (memberId: string, menuItemId: string) => {
    if (!activeSession) return

    setActiveSession(prev => {
      if (!prev) return null

      const updatedExpenses = prev.expenses.map(exp => {
        if (exp.memberId !== memberId) return exp

        const updatedItems = exp.items
          .map(item => {
            if (item.menuItemId === menuItemId) {
              return { ...item, quantity: item.quantity - 1 }
            }
            return item
          })
          .filter(item => item.quantity > 0)

        return {
          ...exp,
          items: updatedItems
        }
      })

      const updated = recalculateSessionTotals({
        ...prev,
        expenses: updatedExpenses
      })

      const targetExp = updated.expenses.find(e => e.memberId === memberId)
      if (targetExp) syncExpenseToSupabase(prev.id, targetExp)

      return updated
    })
  }

  const toggleMemberPaid = (memberId: string) => {
    if (!activeSession) return

    setActiveSession(prev => {
      if (!prev) return null

      const updatedExpenses = prev.expenses.map(exp => {
        if (exp.memberId !== memberId) return exp
        const willBePaid = !exp.isPaid
        const paidAtStr = willBePaid ? new Date().toISOString() : undefined

        if (supabase) {
          const client = supabase
          client
            .from('session_expenses')
            .update({ is_paid: willBePaid, paid_at: paidAtStr || null })
            .eq('id', `${prev.id}-${memberId}`)
            .then(() => {}, (e: any) => console.warn(e))
        }

        return {
          ...exp,
          isPaid: willBePaid,
          paidAt: willBePaid
            ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : undefined
        }
      })

      return {
        ...prev,
        expenses: updatedExpenses
      }
    })
  }

  const setPayer = (payerId: string) => {
    if (!activeSession) return
    const user = allUsers.find(u => u.id === payerId)
    if (!user) return

    setActiveSession(prev => {
      if (!prev) return null
      const updated = {
        ...prev,
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
          .eq('id', prev.id)
          .then(() => {}, (e: any) => console.warn(e))
      }

      return recalculateSessionTotals(updated)
    })
  }

  const deleteActiveSession = (userId?: string): { success: boolean; message: string } => {
    if (!activeSession) {
      return { success: false, message: 'No active tea break found.' }
    }
    const isOwner = !activeSession.creatorId || !userId || activeSession.creatorId === userId
    if (!isOwner) {
      return {
        success: false,
        message: `Only the creator (${activeSession.creatorName || 'owner'}) can delete this tea break.`
      }
    }

    if (supabase) {
      const client = supabase
      client.from('tea_sessions').delete().eq('id', activeSession.id).then(() => {}, (e: any) => console.warn(e))
    }

    setActiveSession(null)
    localStorage.removeItem(ACTIVE_SESSION_KEY)
    return { success: true, message: 'Tea break deleted successfully.' }
  }

  const cancelActiveSession = (userId?: string): boolean => {
    const res = deleteActiveSession(userId)
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
    if (activeSession && activeSession.status === 'active') {
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
      client
        .from('tea_sessions')
        .insert({
          id: newSess.id,
          title: newSess.title,
          shop_name: newSess.shopName,
          shop_id: newSess.shopId || null,
          group_id: newSess.groupId || null,
          group_name: newSess.groupName || null,
          payer_id: newSess.payerId || null,
          payer_name: newSess.payerName,
          payer_upi: newSess.payerUpi || null,
          creator_id: newSess.creatorId || null,
          creator_name: newSess.creatorName || null,
          total_amount: 0,
          status: 'active'
        })
        .then(() => {}, (e: any) => console.warn(e))

      if (newSess.expenses.length > 0) {
        client
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
          .then(() => {}, (e: any) => console.warn(e))
      }
    }

    setActiveSession(newSess)
    return true
  }

  const settleActiveSession = () => {
    if (!activeSession) return

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
      ...activeSession,
      status: 'settled',
      expenses: activeSession.expenses.map(e => ({ ...e, isPaid: true }))
    }

    if (supabase) {
      const client = supabase
      client.from('tea_sessions').update({ status: 'settled' }).eq('id', activeSession.id).then(() => {}, (e: any) => console.warn(e))
      client.from('session_expenses').update({ is_paid: true }).eq('session_id', activeSession.id).then(() => {}, (e: any) => console.warn(e))
    }

    setPastSessions(prev => [settled, ...prev])
    setActiveSession(null)
    localStorage.removeItem(ACTIVE_SESSION_KEY)
  }

  const getMenuItemsForShop = (shopId?: string): MenuItem[] => {
    const targetShopId = shopId || 'shop-chayakkada'
    return menuItems.filter(item => (item.shopId || 'shop-chayakkada') === targetShopId)
  }

  const addCustomMenuItem = (
    name: string,
    price: number,
    emoji?: string,
    category?: MenuItem['category'],
    shopId?: string
  ) => {
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

    if (supabase) {
      const client = supabase
      client.from('menu_items').insert({
        id: newItem.id,
        name: newItem.name,
        price: newItem.price,
        category: newItem.category,
        emoji: newItem.emoji,
        description: newItem.description,
        shop_id: newItem.shopId
      }).then(() => {}, (e: any) => console.warn(e))
    }

    setMenuItems(prev => [...prev, newItem])
  }

  const updateMenuItemPrice = (itemId: string, newPrice: number) => {
    const safePrice = Math.max(0, Number(newPrice))
    if (supabase) {
      const client = supabase
      client.from('menu_items').update({ price: safePrice }).eq('id', itemId).then(() => {}, (e: any) => console.warn(e))
    }
    setMenuItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, price: safePrice } : item))
    )
  }

  const deleteMenuItem = (itemId: string) => {
    if (supabase) {
      const client = supabase
      client.from('menu_items').delete().eq('id', itemId).then(() => {}, (e: any) => console.warn(e))
    }
    setMenuItems(prev => prev.filter(item => item.id !== itemId))
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
