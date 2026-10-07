import React, { createContext, useContext, useState, useEffect } from 'react'
import confetti from 'canvas-confetti'
import type { TeaSession, MenuItem, OrderItem, MemberExpense, User } from '../types'
import { DEFAULT_MENU, INITIAL_ACTIVE_SESSION, PAST_SESSIONS } from '../lib/mockData'
import { useAuth } from './AuthContext'

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
    shopId?: string
  ) => void
  cancelActiveSession: () => void
  settleActiveSession: () => void
  addMemberToSession: (user: User) => void
  addCustomMenuItem: (name: string, price: number, emoji?: string, category?: MenuItem['category']) => void
  updateMenuItemPrice: (itemId: string, newPrice: number) => void
  deleteMenuItem: (itemId: string) => void
  getShopItemSummary: () => { name: string; emoji: string; count: number; totalCost: number }[]
  generateWhatsAppSummary: () => string
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined)

const ACTIVE_SESSION_KEY = 'chaisplit_active_session_v2'
const PAST_SESSIONS_KEY = 'chaisplit_past_sessions_v2'
const MENU_ITEMS_KEY = 'chaisplit_menu_items_v2'

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { allUsers } = useAuth()

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem(MENU_ITEMS_KEY)
      return saved ? JSON.parse(saved) : DEFAULT_MENU
    } catch {
      return DEFAULT_MENU
    }
  })

  const [activeSession, setActiveSession] = useState<TeaSession | null>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SESSION_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.shopName?.includes('Sharma')) {
          parsed.shopName = 'Chayakkada'
        }
        return parsed
      }
      return INITIAL_ACTIVE_SESSION
    } catch {
      return INITIAL_ACTIVE_SESSION
    }
  })

  const [pastSessions, setPastSessions] = useState<TeaSession[]>(() => {
    try {
      const saved = localStorage.getItem(PAST_SESSIONS_KEY)
      if (saved) {
        const list: TeaSession[] = JSON.parse(saved)
        return list.map(s => s.shopName.includes('Sharma') ? { ...s, shopName: 'Chayakkada' } : s)
      }
      return PAST_SESSIONS
    } catch {
      return PAST_SESSIONS
    }
  })

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
        // The payer's own expense is marked paid automatically
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

    setActiveSession(prev => {
      if (!prev) return null
      return {
        ...prev,
        expenses: [...prev.expenses, newExpense]
      }
    })
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
              id: `item-${Date.now()}-${Math.random()}`,
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
          // Reset paid status when adding more items, unless they are the payer
          isPaid: exp.memberId === prev.payerId ? true : false
        }
      })

      // If member wasn't in session yet, look up in allUsers and add them
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
          return recalculateSessionTotals({
            ...prev,
            expenses: [...prev.expenses, newExp]
          })
        }
      }

      return recalculateSessionTotals({
        ...prev,
        expenses: updatedExpenses
      })
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

      return recalculateSessionTotals({
        ...prev,
        expenses: updatedExpenses
      })
    })
  }

  const toggleMemberPaid = (memberId: string) => {
    if (!activeSession) return

    setActiveSession(prev => {
      if (!prev) return null

      const updatedExpenses = prev.expenses.map(exp => {
        if (exp.memberId !== memberId) return exp
        const willBePaid = !exp.isPaid
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
      return recalculateSessionTotals(updated)
    })
  }

  const cancelActiveSession = () => {
    setActiveSession(null)
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY)
    } catch (e) {
      console.error('Failed to clear active session', e)
    }
  }

  const addNewSession = (
    title: string,
    shopName: string,
    members?: User[],
    groupId?: string,
    groupName?: string,
    payerId?: string,
    shopId?: string
  ) => {
    const sessionMembers = members && members.length > 0 ? members : allUsers.slice(0, 4)
    const effectivePayerId = payerId || sessionMembers[0]?.id || allUsers[0]?.id || 'unknown'
    const payerUser = allUsers.find(u => u.id === effectivePayerId) || sessionMembers.find(u => u.id === effectivePayerId)
    const payerName = payerUser?.name || 'Admin'
    const payerUpi = payerUser?.upiId || 'office@upi'

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
    setActiveSession(newSess)
  }

  const settleActiveSession = () => {
    if (!activeSession) return

    // Trigger celebration confetti
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

    setPastSessions(prev => [settled, ...prev])
    setActiveSession(null)
  }

  const addCustomMenuItem = (name: string, price: number, emoji?: string, category?: MenuItem['category']) => {
    const newItem: MenuItem = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      price: Math.max(0, Number(price)),
      category: category || 'snacks',
      emoji: emoji || '☕',
      description: 'Chayakkada menu item'
    }
    setMenuItems(prev => [...prev, newItem])
  }

  const updateMenuItemPrice = (itemId: string, newPrice: number) => {
    const validPrice = Math.max(0, Math.round(Number(newPrice)))
    setMenuItems(prev =>
      prev.map(item => (item.id === itemId ? { ...item, price: validPrice } : item))
    )

    // Keep active session totals updated if items are ordered
    setActiveSession(prev => {
      if (!prev) return null
      const updatedExpenses = prev.expenses.map(exp => ({
        ...exp,
        items: exp.items.map(it => (it.menuItemId === itemId ? { ...it, price: validPrice } : it))
      }))
      return recalculateSessionTotals({ ...prev, expenses: updatedExpenses })
    })
  }

  const deleteMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== itemId))
  }

  const getShopItemSummary = () => {
    if (!activeSession) return []
    const map = new Map<string, { name: string; emoji: string; count: number; totalCost: number }>()

    activeSession.expenses.forEach(exp => {
      exp.items.forEach(item => {
        const cur = map.get(item.name) || {
          name: item.name,
          emoji: item.emoji,
          count: 0,
          totalCost: 0
        }
        cur.count += item.quantity
        cur.totalCost += item.price * item.quantity
        map.set(item.name, cur)
      })
    })

    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }

  const generateWhatsAppSummary = () => {
    if (!activeSession) return ''

    const shopItems = getShopItemSummary()
    const itemLines = shopItems.map(i => `• ${i.emoji} ${i.name} × ${i.count} (₹${i.totalCost})`).join('\n')

    const memberLines = activeSession.expenses
      .filter(e => e.total > 0)
      .map(e => {
        const paidStatus = e.isPaid
          ? e.memberId === activeSession.payerId ? '👑 [Paid for all]' : '✅ [Paid]'
          : '⏳ [Owes]'
        return `${e.memberName}: ₹${e.total} ${paidStatus}`
      })
      .join('\n')

    return `☕ *${activeSession.title}*\n📍 *Shop:* ${activeSession.shopName}\n💰 *Total Bill:* ₹${activeSession.totalAmount}\n👤 *Paid by:* ${activeSession.payerName} (${activeSession.payerUpi || 'UPI'})\n\n🧾 *Vendor Order Items:*\n${itemLines || 'No items yet'}\n\n👥 *Individual Breakdown:*\n${memberLines}\n\nSplit effortlessly with ChaiSplit! 🚀`
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
        settleActiveSession,
        addMemberToSession,
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
