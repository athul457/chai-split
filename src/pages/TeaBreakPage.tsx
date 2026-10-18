import {
    ArrowLeft,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Coffee,
    Crown,
    CreditCard,
    Minus,
    Plus,
    Receipt,
    Share2,
    ShoppingBag,
    Sparkles,
    UserPlus,
    Users,
    X,
    Lock,
    Trash2
} from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { ChaiLoader } from '../components/ChaiLoader'
import { getItemIconConfig, getGroupIconConfig } from '../utils/itemIcons'
import type { Group, MenuItem, User, MemberExpense } from '../types'

interface TeaBreakPageProps {
  group: Group
  currentUser: User | null
  onBack: () => void
  initialSubView?: 'my-orders' | 'others-orders'
  onSubViewChange?: (view: 'my-orders' | 'others-orders') => void
}

export const TeaBreakPage: React.FC<TeaBreakPageProps> = ({
  group,
  currentUser,
  onBack,
  initialSubView = 'my-orders',
  onSubViewChange
}) => {
  const { user: authUser } = useAuth()
  const effectiveUser = currentUser || authUser

  const [activeSubView, setActiveSubView] = useState<'my-orders' | 'others-orders'>(initialSubView)

  useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView)
    }
  }, [initialSubView])

  const handleSubViewChange = (view: 'my-orders' | 'others-orders') => {
    setActiveSubView(view)
    onSubViewChange?.(view)
  }

  const {
    activeSession: globalActiveSession,
    getActiveSessionForGroup,
    cancelActiveSession,
    settleActiveSession,
    addItemToMember,
    removeItemFromMember,
    confirmMemberOrder,
    menuItems,
    getMenuItemsForShop,
    generateWhatsAppSummary
  } = useExpense()

  // Retrieve the break session specifically for this group
  const activeSession = (group?.id ? getActiveSessionForGroup(group.id) : undefined) ||
    (globalActiveSession?.groupId === group?.id ? globalActiveSession : undefined)

  const groupIconConfig = getGroupIconConfig(group?.name || 'Tea Break', activeSession?.shopName)

  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showCannotCloseModal, setShowCannotCloseModal] = useState(false)
  const [showUnconfirmedModal, setShowUnconfirmedModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [isDeletingBreak, setIsDeletingBreak] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCupDrawerOpen, setIsCupDrawerOpen] = useState(false)
  const [showAllMembersList, setShowAllMembersList] = useState(false)

  // Accordion state: other users' items only appear when clicked
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(() => {
    const id = effectiveUser?.id || currentUser?.id
    return new Set(id ? [id] : [])
  })

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const showToast = (msg: string) => {
    setToastNotice(msg)
    setTimeout(() => setToastNotice(null), 3000)
  }

  // Admin detection
  const effectiveAdminId = group.adminId || group.members[0]?.id || effectiveUser?.id
  const isAdmin = effectiveUser?.id === effectiveAdminId

  // Designated Bill Payer detection: set in group or session
  const designatedPayerId = group.payerId || activeSession?.payerId
  const isDesignatedPayer = Boolean(
    effectiveUser?.id && (
      effectiveUser.id === designatedPayerId ||
      (effectiveUser.userCode && designatedPayerId === effectiveUser.userCode) ||
      (effectiveUser.email && designatedPayerId?.toLowerCase() === effectiveUser.email.toLowerCase()) ||
      (effectiveUser.name && (
        (group.payerName && group.payerName.toLowerCase() === effectiveUser.name.toLowerCase()) ||
        (activeSession?.payerName && activeSession.payerName.toLowerCase() === effectiveUser.name.toLowerCase())
      ))
    )
  )

  // Both Admin and the designated Bill Payer can edit confirmed items and assign items for others
  const canEditConfirmed = Boolean(isAdmin || isDesignatedPayer)

  // Break Creator detection: user who created the break
  const isBreakCreator = Boolean(
    activeSession && (
      (activeSession.creatorId && (
        effectiveUser?.id === activeSession.creatorId ||
        (effectiveUser?.userCode && activeSession.creatorId === effectiveUser.userCode) ||
        (effectiveUser?.email && activeSession.creatorId.toLowerCase() === effectiveUser.email.toLowerCase())
      )) ||
      (!activeSession.creatorId && (
        (effectiveUser?.id && activeSession.payerId === effectiveUser.id) ||
        (effectiveUser?.name && activeSession.creatorName && activeSession.creatorName.toLowerCase() === effectiveUser.name.toLowerCase())
      ))
    )
  )

  // Break closing rule: Both the person who created the break AND the group admin can close or settle it
  const canCloseBreak = Boolean(activeSession && (isBreakCreator || isAdmin))

  // Selected colleague for admin assigning items
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(() => {
    const firstOther = group.members.find(m => m.id !== effectiveUser?.id)
    return firstOther ? firstOther.id : (group.members[0]?.id || effectiveUser?.id || '')
  })

  const selectedAssignee = group.members.find(m => m.id === selectedAssigneeId) || group.members[0] || effectiveUser

  // Current user's expense in active break (Strictly isolated to logged-in user)
  const effectiveUserId =
    effectiveUser?.id ||
    currentUser?.id ||
    ''

  const currentUserExpense = activeSession?.expenses.find(e =>
    (effectiveUserId && e.memberId === effectiveUserId) ||
    (effectiveUser?.userCode && (e.memberId === effectiveUser.userCode || e.memberId.includes(effectiveUser.userCode))) ||
    (effectiveUser?.email && (e.memberId.toLowerCase() === effectiveUser.email.toLowerCase() || e.memberName.toLowerCase() === effectiveUser.name.toLowerCase())) ||
    (effectiveUser?.name && e.memberName.toLowerCase() === effectiveUser.name.toLowerCase())
  )

  const myTotal = currentUserExpense?.total || 0
  const myItemCount = currentUserExpense?.items.reduce((acc, i) => acc + i.quantity, 0) || 0
  const isMyOrderConfirmed = Boolean(currentUserExpense?.isConfirmed)

  // Members who ordered items and unconfirmed status
  const membersWithItems = useMemo(() => {
    if (!activeSession) return []
    return activeSession.expenses.filter(e => e.items && e.items.length > 0)
  }, [activeSession])

  const unconfirmedMembers = useMemo(() => {
    return membersWithItems.filter(e => !e.isConfirmed)
  }, [membersWithItems])

  const allMembersConfirmed = membersWithItems.length > 0 && unconfirmedMembers.length === 0

  // User confirms their own order/items
  const handleConfirmMyOrder = async () => {
    const targetUserId =
      currentUserExpense?.memberId ||
      effectiveUserId ||
      effectiveUser?.id

    if (!targetUserId) {
      showToast('Profile not detected.')
      return
    }

    if (!currentUserExpense || currentUserExpense.items.length === 0) {
      showToast('Please add at least 1 item to your cup before confirming.')
      return
    }

    setIsConfirming(true)
    try {
      await confirmMemberOrder(targetUserId, activeSession?.id)
      showToast('Order confirmed! Your items are now locked.')
    } catch {
      showToast('Could not confirm order. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  // User adds item for themselves (Collaborative: all group/session members can order)
  const handleSelfAddItem = (item: MenuItem) => {
    if (isMyOrderConfirmed && !canEditConfirmed) {
      showToast('Your order is confirmed and locked. Cannot add items.')
      return
    }

    const isMember = Boolean(
      !group ||
      group.adminId === effectiveUser?.id ||
      group.members.some(m =>
        m.id === effectiveUser?.id ||
        (m.userCode && effectiveUser?.userCode && m.userCode.toUpperCase() === effectiveUser.userCode.toUpperCase()) ||
        (m.email && effectiveUser?.email && m.email.toLowerCase() === effectiveUser.email.toLowerCase()) ||
        (m.name && effectiveUser?.name && m.name.toLowerCase() === effectiveUser.name.toLowerCase())
      ) ||
      Boolean(currentUserExpense)
    )

    if (!isMember) {
      showToast('You must be a member of this group to order items.')
      return
    }

    const targetUserId =
      currentUserExpense?.memberId ||
      effectiveUserId ||
      effectiveUser?.id

    if (!targetUserId) {
      showToast('Please join the group or select your profile first.')
      return
    }
    const adminEditorName = canEditConfirmed ? (effectiveUser?.name || (isAdmin ? 'Admin' : 'Payer')) : undefined
    addItemToMember(targetUserId, item, activeSession?.id, adminEditorName)
    showToast(`Added ${item.name} to your cup!`)
  }

  // User removes item for themselves
  const handleSelfRemoveItem = async (menuItemId: string) => {
    if (isMyOrderConfirmed && !canEditConfirmed) {
      showToast('Your order is confirmed and locked. Cannot edit items.')
      return
    }

    const targetUserId =
      currentUserExpense?.memberId ||
      effectiveUserId ||
      effectiveUser?.id

    if (!targetUserId) {
      showToast('Profile not detected.')
      return
    }
    const adminEditorName = canEditConfirmed ? (effectiveUser?.name || (isAdmin ? 'Admin' : 'Payer')) : undefined
    await removeItemFromMember(targetUserId, menuItemId, activeSession?.id, adminEditorName)
  }

  // Admin & Payer assigns item to selected colleague
  const handleAdminAssignItem = (item: MenuItem) => {
    if (!canEditConfirmed || !selectedAssigneeId) return
    const adminName = effectiveUser?.name || (isAdmin ? 'Admin' : 'Payer')
    addItemToMember(selectedAssigneeId, item, activeSession?.id, adminName)
    showToast(`Assigned ${item.name} to ${selectedAssignee?.name || 'teammate'}!`)
  }

  // Settle break (strictly only creator can close/settle the break, AND every member with items must confirm)
  const handleSettleBreak = () => {
    if (!canCloseBreak) {
      setShowCannotCloseModal(true)
      return
    }

    if (membersWithItems.length === 0) {
      showToast('No items have been ordered in this break yet.')
      return
    }

    if (!allMembersConfirmed) {
      setShowUnconfirmedModal(true)
      return
    }

    if (isSettling) return
    setIsSettling(true)
    setTimeout(() => {
      settleActiveSession(activeSession?.id, currentUser?.id, isAdmin)
      showToast(`Tea break bill settled successfully!`)
      setIsSettling(false)
      onBack()
    }, 400)
  }

  // Delete / End break (strictly only creator can close the break)
  const handleCancelBreak = () => {
    if (!canCloseBreak) {
      setShowCancelConfirm(false)
      setShowCannotCloseModal(true)
      return
    }
    if (isDeletingBreak) return
    setIsDeletingBreak(true)
    setTimeout(() => {
      const res = cancelActiveSession(currentUser?.id, activeSession?.id, isAdmin)
      setIsDeletingBreak(false)
      setShowCancelConfirm(false)
      if (res) {
        showToast(`Tea break closed. Anyone can now start a new break!`)
        onBack()
      } else {
        setShowCannotCloseModal(true)
      }
    }, 350)
  }

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const text = generateWhatsAppSummary()
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  // Total items in break
  const totalSessionItemCount = activeSession?.expenses.reduce(
    (acc, exp) => acc + exp.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  ) || 0

  // Aggregated items consumed across all group members (total items eaten and total price for each item)
  const aggregatedItems = useMemo(() => {
    if (!activeSession) return []
    const map = new Map<string, {
      menuItemId: string
      name: string
      emoji: string
      price: number
      quantity: number
      totalPrice: number
      orderedBy: { name: string; qty: number }[]
    }>()

    activeSession.expenses.forEach(expense => {
      expense.items.forEach(item => {
        const existing = map.get(item.menuItemId)
        if (existing) {
          existing.quantity += item.quantity
          existing.totalPrice += item.price * item.quantity
          const userOrder = existing.orderedBy.find(o => o.name === expense.memberName)
          if (userOrder) {
            userOrder.qty += item.quantity
          } else {
            existing.orderedBy.push({ name: expense.memberName, qty: item.quantity })
          }
        } else {
          map.set(item.menuItemId, {
            menuItemId: item.menuItemId,
            name: item.name,
            emoji: item.emoji,
            price: item.price,
            quantity: item.quantity,
            totalPrice: item.price * item.quantity,
            orderedBy: [{ name: expense.memberName, qty: item.quantity }]
          })
        }
      })
    })

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [activeSession])

  const orderedMembersCount = activeSession?.expenses.filter(e => e.items.length > 0).length || 0

  // Merge activeSession expenses with group.members so every teammate is visible
  const sortedExpenses = useMemo(() => {
    if (!activeSession) return []
    const myId = effectiveUser?.id || currentUser?.id

    const map = new Map<string, MemberExpense>()

    // Add session expenses
    activeSession.expenses.forEach(exp => {
      map.set(exp.memberId, exp)
    })

    // Ensure every member of this group has a card
    group.members.forEach(m => {
      if (!map.has(m.id)) {
        map.set(m.id, {
          memberId: m.id,
          memberName: m.name,
          memberAvatar: m.avatar || m.name.slice(0, 2).toUpperCase(),
          items: [],
          total: 0,
          isPaid: m.id === activeSession.payerId
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      if (a.memberId === myId) return -1
      if (b.memberId === myId) return 1
      if (a.total !== b.total) {
        return a.total - b.total
      }
      return a.memberName.localeCompare(b.memberName)
    })
  }, [activeSession, group.members, effectiveUser?.id, currentUser?.id])

  // Target shop for this tea break session
  const breakShopId = activeSession?.shopId || group.shopId || (group.id ? `shop-${group.id}` : 'shop-chayakkada')
  const shopMenuItems = useMemo(() => {
    return getMenuItemsForShop(breakShopId)
  }, [getMenuItemsForShop, breakShopId, menuItems])

  // Menu items for this break
  const sortedMenuItems = shopMenuItems

  if (!activeSession) {
    return (
      <div className="space-y-4 animate-in fade-in pb-16">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Group</span>
          </button>

          {group && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                {group.name}
              </span>
              <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/50">
                ID: {group.code || group.id}
              </span>
            </div>
          )}
        </div>
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 w-12 h-12 flex items-center justify-center mx-auto">
            <Coffee className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
            No Active Tea Break
          </h3>
          <p className="text-xs text-stone-500">
            This tea break has ended or settled for <strong className="text-stone-800 dark:text-stone-200">{group?.name}</strong>.
          </p>
          {group && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/60 text-xs">
                <span className="text-stone-500 dark:text-stone-400 font-medium">Group ID:</span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{group.code || group.id}</span>
              </div>
            </div>
          )}
          <div className="pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 active:scale-95 text-white transition-all cursor-pointer shadow-xs"
            >
              Return to Group
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in pb-28">
      {/* Toast Notice */}
      {toastNotice && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastNotice}</span>
          </div>
          <button onClick={() => setToastNotice(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header: Splitty Screen 2 style */}
      <div className="flex items-center justify-between px-1 py-1 text-white">
        <button
          onClick={onBack}
          id="back-to-group-from-break-btn"
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all shadow-2xs"
          title="Back to group"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0 px-2">
          <h2 className="font-heading font-extrabold text-base text-white truncate">
            {group?.name || activeSession.title}
          </h2>
          <p className="text-[11px] text-white/80 truncate">
            ☕ {activeSession.shopName} • ID: {group.code || group.id}
          </p>
        </div>

        <div className={`w-9 h-9 rounded-2xl ${groupIconConfig.bgLight} ${groupIconConfig.bgDark} flex items-center justify-center text-lg shrink-0 shadow-2xs`}>
          {groupIconConfig.emoji}
        </div>
      </div>

      {/* Screen 2 Top Card: Total Bill / Owed Card with black Settle / Share Pill */}
      <div className="bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-sm space-y-3.5 border border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              {isDesignatedPayer || isAdmin ? 'Total break bill' : 'Your order total'}
            </div>
            <div className="font-heading font-extrabold text-2xl text-[#1B9C56] tracking-tight">
              ₹{isDesignatedPayer || isAdmin ? activeSession.totalAmount : myTotal}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              id="share-break-whatsapp-btn"
              title="Share order on WhatsApp"
              className="bg-stone-900 hover:bg-black text-white px-4 py-2 rounded-full font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
            {canCloseBreak && (
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="bg-[#FF7043] hover:bg-[#F4511E] text-white px-4 py-2 rounded-full font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                End Break
              </button>
            )}
          </div>
        </div>

        {/* Member breakdown summary (Screen 2 'Who owes whom?') */}
        {membersWithItems.length > 0 && (
          <div className="pt-2.5 border-t border-stone-100 dark:border-stone-800 space-y-2">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Who owes whom?
            </div>
            <div className="space-y-2 max-h-24 overflow-y-auto pr-1">
              {membersWithItems.map(m => (
                <div key={m.memberId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                    <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {m.memberName?.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate">{m.memberName} {m.memberId === effectiveUser?.id ? '(You)' : 'owes'}</span>
                  </div>
                  <span className="font-bold text-stone-900 dark:text-stone-100 shrink-0">
                    ₹{m.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- VIEW TOGGLE: MY ORDERS vs OTHERS' ORDERS ---------------- */}
      <div className="flex rounded-xl bg-stone-100 dark:bg-stone-800/80 p-1 border border-stone-200 dark:border-stone-700/80 shadow-2xs">
        <button
          type="button"
          onClick={() => handleSubViewChange('my-orders')}
          id="tea-break-tab-my-orders"
          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'my-orders'
              ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-2xs'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>My Orders</span>
          {myItemCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
              {myItemCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSubViewChange('others-orders')}
          id="tea-break-tab-others-orders"
          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSubView === 'others-orders'
              ? 'bg-white dark:bg-stone-900 text-amber-700 dark:text-amber-400 shadow-2xs'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Others' Orders</span>
          {orderedMembersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold">
              {orderedMembersCount}
            </span>
          )}
        </button>
      </div>

      {/* ---------------- 1. MY ORDERS VIEW ---------------- */}
      {activeSubView === 'my-orders' && (
        <div className="space-y-4 animate-in fade-in">
          {/* 1. ITEMS SELECTION OPTION */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                    Select Items to Add
                  </h3>
                </div>
              </div>
            </div>

            {isMyOrderConfirmed && !canEditConfirmed ? (
              <div className="p-2.5 text-center text-xs text-stone-500 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Ordering is locked</span>
              </div>
            ) : shopMenuItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                No items available in {activeSession.shopName} menu yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {sortedMenuItems.map(item => {
                  const iconCfg = getItemIconConfig(item.name, item.category, item.emoji)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelfAddItem(item)}
                      className="w-full p-2.5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 hover:border-[#FF7043]/40 hover:bg-white dark:hover:bg-stone-800 text-left transition-all cursor-pointer active:scale-[0.98] group flex items-center justify-between gap-2.5 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl ${iconCfg.bgLight} ${iconCfg.bgDark} flex items-center justify-center text-lg shrink-0 shadow-2xs`}>
                          {iconCfg.emoji}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate block group-hover:text-[#CF4C16]">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-stone-400 capitalize block">
                            {item.category || 'Tapri Special'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="font-heading font-extrabold text-xs text-stone-900 dark:text-stone-100">
                          ₹{item.price}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-stone-200/70 dark:bg-stone-700 text-stone-700 dark:text-stone-200 group-hover:bg-[#FF7043] group-hover:text-white flex items-center justify-center transition-colors">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* CONFIRMED ORDER STATUS BANNER (Compact & clean, no long scrolling needed) */}
          {isMyOrderConfirmed && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-100">Order Locked &amp; Confirmed</div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    ₹{myTotal} • {myItemCount} {myItemCount === 1 ? 'item' : 'items'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSubViewChange('others-orders')}
                id="view-others-orders-after-confirmed-btn"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <span>Others' Orders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------- 2. OTHERS' ORDERS VIEW ---------------- */}
      {activeSubView === 'others-orders' && (
        <div className="space-y-4 animate-in fade-in">
          {/* ADMIN & PAYER: BUTTON FOR ADDING ITEMS FOR OTHERS */}
          {canEditConfirmed && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            id="add-items-for-others-btn"
            className="w-full py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-amber-500 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-600" />
            <span>Add items for others</span>
          </button>
        </div>
      )}

      {/* ---------------- WHO ORDERED WHAT & BILL BREAKDOWN (VISIBLE TO EACH USER) ---------------- */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Group Orders &amp; Bill Breakdown</span>
            </h3>
          </div>

          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            {orderedMembersCount} of {group.members.length} ordered
          </span>
        </div>

        {/* 1. TOTAL ITEMS ORDERED & TOTAL PRICE FOR EACH ITEM (TAPRI COUNTER) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                Total Items Ordered ({totalSessionItemCount})
              </span>
            </div>
          </div>

          {aggregatedItems.length > 0 ? (
            <div className="rounded-xl border border-stone-200/70 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800/80 overflow-hidden bg-stone-50/50 dark:bg-stone-900/50">
              {aggregatedItems.map(item => {
                const iconCfg = getItemIconConfig(item.name)
                return (
                  <div
                    key={item.menuItemId}
                    className="p-2.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl ${iconCfg.bgLight} ${iconCfg.bgDark} flex items-center justify-center text-sm shrink-0`}>
                        {iconCfg.emoji}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium">
                            @ ₹{item.price} each
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-bold text-[11px]">
                          ×{item.quantity}
                        </span>
                        <span className="font-heading font-black text-xs text-stone-900 dark:text-stone-100 min-w-10 text-right">
                          ₹{item.totalPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Aggregated Total Row */}
              <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 flex items-center justify-between text-xs font-bold border-t border-amber-200/50 dark:border-amber-900/40">
                <span className="text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <span>Total Items:</span>
                  <span className="text-amber-700 dark:text-amber-400">{totalSessionItemCount} items</span>
                </span>
                <span className="text-amber-900 dark:text-amber-200 font-heading text-sm">
                  Grand Total: ₹{activeSession.totalAmount}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 space-y-1">
              <p className="font-medium">No items ordered yet</p>
            </div>
          )}
        </div>

        {/* 3. EACH USER'S TOTAL & ITEMS */}
        <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                Each Member's Total &amp; Items ({group.members.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAllMembersList(prev => !prev)}
              id="toggle-all-members-items-btn"
              className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
                showAllMembersList
                  ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-800/40'
              }`}
              title={showAllMembersList ? "Hide member items" : "View all member items"}
            >
              <span>{showAllMembersList ? 'Hide' : 'View All'}</span>
              {showAllMembersList ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showAllMembersList && (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {sortedExpenses.map(expense => {
              const isUser =
                expense.memberId === effectiveUser?.id ||
                expense.memberId === currentUser?.id ||
                (currentUserExpense && expense.memberId === currentUserExpense.memberId) ||
                (effectiveUser?.userCode && expense.memberId === effectiveUser.userCode)
              const isMemberAdmin = expense.memberId === effectiveAdminId
              const isMemberPayer = Boolean(
                designatedPayerId && (
                  expense.memberId === designatedPayerId ||
                  (group.payerName && expense.memberName.toLowerCase() === group.payerName.toLowerCase())
                )
              )
              const isConfirmed = Boolean(expense.isConfirmed)
              const canEditThisMember = canEditConfirmed || (!isConfirmed && isUser)
              const memberItemCount = expense.items.reduce((sum, it) => sum + it.quantity, 0)
              const isExpanded = expandedMemberIds.has(expense.memberId)

              return (
                <div key={expense.memberId} className="py-2.5 space-y-1.5 transition-colors">
                  {/* Clickable Header Row: Click to toggle items visibility */}
                  <div
                    onClick={() => toggleMemberExpand(expense.memberId)}
                    className="flex items-center justify-between cursor-pointer select-none group p-1 -m-1 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {expense.memberAvatar || expense.memberName[0]}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                          {expense.memberName}
                        </span>
                        {isUser && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                            You
                          </span>
                        )}
                        {isMemberAdmin && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-0.5">
                            <Crown className="w-2.5 h-2.5" />
                            <span>Admin</span>
                          </span>
                        )}
                        {isMemberPayer && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold flex items-center gap-0.5 border border-amber-300 dark:border-amber-800">
                            <CreditCard className="w-2.5 h-2.5 text-amber-700" />
                            <span>Payer</span>
                          </span>
                        )}
                        {isConfirmed && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-0.5 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Confirmed</span>
                          </span>
                        )}
                        {!isConfirmed && expense.items.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold flex items-center gap-0.5 border border-rose-300 dark:border-rose-800">
                            <Clock className="w-2.5 h-2.5 text-rose-600" />
                            <span>Unconfirmed</span>
                          </span>
                        )}
                        {expense.adminEdits && expense.adminEdits.length > 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold flex items-center gap-0.5 border border-amber-300 dark:border-amber-800">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                            <span>Admin Edited</span>
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400">
                          ({memberItemCount} {memberItemCount === 1 ? 'item' : 'items'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-heading font-black text-xs ${
                        expense.total > 0 ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400'
                      }`}>
                        ₹{expense.total}
                      </span>
                      <div className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Member's items list - ONLY VISIBLE WHEN CLICKED */}
                  {isExpanded && (
                    <div className="pt-1.5 animate-in fade-in duration-150 space-y-2">
                      {/* Admin edit audit history for this member */}
                      {expense.adminEdits && expense.adminEdits.length > 0 && (
                        <div className="ml-8 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/80 text-[11px] space-y-1">
                          <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Admin Modified Confirmed Order:</span>
                          </div>
                          {expense.adminEdits.map((ed, idx) => (
                            <div key={idx} className="pl-4 text-stone-700 dark:text-stone-300 text-[10px]">
                              • <strong>{ed.adminName}</strong> {ed.action} <strong>{ed.itemName}</strong> (Qty: {ed.oldQuantity ?? 0} → <strong className="text-amber-700 dark:text-amber-400 font-bold">{ed.newQuantity ?? 0}</strong>) • {ed.editedAt}
                            </div>
                          ))}
                        </div>
                      )}

                      {expense.items.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-1.5 pl-8">
                          {expense.items.map(item => (
                            <div
                              key={item.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-700 dark:text-stone-300 border border-stone-200/50 dark:border-stone-700/50"
                            >
                              <span>{item.name}</span>
                              <span className="font-bold text-amber-700 dark:text-amber-400">
                                x{item.quantity}
                              </span>
                              <span className="text-[10px] text-stone-400">
                                (₹{item.price * item.quantity})
                              </span>

                              {canEditThisMember && (
                                <div className="flex items-center gap-0.5 ml-1 border-l border-stone-300 dark:border-stone-600 pl-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const adminName = canEditConfirmed ? (effectiveUser?.name || (isAdmin ? 'Admin' : 'Payer')) : undefined
                                      removeItemFromMember(expense.memberId, item.id || item.menuItemId || item.name, activeSession?.id, adminName)
                                    }}
                                    className="w-4 h-4 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 cursor-pointer"
                                    title="Decrease"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const mi =
                                        shopMenuItems.find(m => m.id === item.menuItemId) ||
                                        menuItems.find(m => m.id === item.menuItemId) || {
                                          id: item.menuItemId || item.id,
                                          name: item.name,
                                          price: item.price,
                                          category: 'snacks',
                                          emoji: item.emoji || ''
                                        }
                                      const adminName = canEditConfirmed ? (effectiveUser?.name || (isAdmin ? 'Admin' : 'Payer')) : undefined
                                      addItemToMember(expense.memberId, mi, activeSession?.id, adminName)
                                    }}
                                    className="w-4 h-4 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 cursor-pointer"
                                    title="Increase"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Confirmation status & quick confirm for this member */}
                        <div className="flex items-center justify-between pl-8 pt-1">
                          <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                            isConfirmed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {isConfirmed ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Items Confirmed ({expense.confirmedAt || 'Verified'})</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                                <span>Items Pending Confirmation</span>
                              </>
                            )}
                          </span>

                          {!isConfirmed && (isUser || isBreakCreator || canEditConfirmed) && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                await confirmMemberOrder(expense.memberId, activeSession?.id)
                                showToast(`Confirmed items for ${expense.memberName}`)
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Confirm Items</span>
                            </button>
                          )}
                        </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between pl-8 text-[10px] text-stone-400">
                          <span className="italic">No items added yet</span>
                          {canEditConfirmed && !isUser && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAssigneeId(expense.memberId)
                                setShowAssignModal(true)
                              }}
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-0.5 cursor-pointer hover:underline"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              <span>Add for {expense.memberName.split(' ')[0]}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          )}
        </div>

        {/* ---------------- 3. TOTAL BILL & END TASK OPTION (ONLY SEEN HERE) ---------------- */}
        <div className="pt-3 border-t border-stone-200/80 dark:border-stone-800 space-y-3">
          {/* Total Bill Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/25 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Total Bill
              </div>
              <div className="text-2xl font-black font-heading text-stone-900 dark:text-stone-100 flex items-baseline gap-1.5">
                <span>₹{activeSession.totalAmount}</span>
                <span className="text-xs font-semibold text-stone-500 font-sans">
                  ({totalSessionItemCount} {totalSessionItemCount === 1 ? 'item' : 'items'} ordered)
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-semibold text-stone-500">Your Share</div>
              <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
                ₹{myTotal} <span className="text-[10px] font-normal text-stone-400">({myItemCount} {myItemCount === 1 ? 'item' : 'items'})</span>
              </div>
            </div>
          </div>

          {/* Option for Close / Settle Break - Strictly creator can close or settle */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!canCloseBreak) {
                    setShowCannotCloseModal(true)
                  } else {
                    setShowCancelConfirm(true)
                  }
                }}
                id="end-task-btn"
                className={`flex-1 py-2.5 px-3 rounded-xl border ${
                  canCloseBreak
                    ? 'border-rose-300 dark:border-rose-800 hover:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                    : 'border-stone-300 dark:border-stone-700 bg-stone-100/80 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400'
                } font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs`}
              >
                {!canCloseBreak ? (
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                )}
                <span>Close / End Break</span>
              </button>

              <button
                type="button"
                onClick={handleSettleBreak}
                disabled={isSettling}
                id="settle-and-end-task-btn"
                className={`flex-1 py-2.5 px-3 rounded-xl ${
                  canCloseBreak && allMembersConfirmed
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md'
                    : canCloseBreak
                    ? 'bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-300 dark:border-stone-700'
                } font-bold text-xs active:scale-95 flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
              >
                {isSettling ? (
                  <ChaiLoader variant="spinner" size="sm" text="Settling..." />
                ) : (
                  <>
                    {!canCloseBreak ? (
                      <Lock className="w-3.5 h-3.5 text-stone-400" />
                    ) : !allMembersConfirmed ? (
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Settle &amp; Close</span>
                    {unconfirmedMembers.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-bold">
                        {unconfirmedMembers.length} pending
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Status notice for confirmation before settle */}
            {membersWithItems.length > 0 && unconfirmedMembers.length > 0 && (
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">
                    Waiting for <strong>{unconfirmedMembers.map(m => m.memberName).join(', ')}</strong> to confirm items.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUnconfirmedModal(true)}
                  className="text-[10px] font-bold text-amber-700 dark:text-amber-400 underline cursor-pointer shrink-0 ml-1"
                >
                  View ({unconfirmedMembers.length})
                </button>
              </div>
            )}

            {membersWithItems.length > 0 && unconfirmedMembers.length === 0 && (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>All {membersWithItems.length} members confirmed their items! Ready to settle &amp; close.</span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] px-1 text-stone-500 dark:text-stone-400">
              <span className="truncate">
                Created by: <strong className="text-stone-700 dark:text-stone-300">{activeSession?.creatorName || 'Member'}</strong>
              </span>
              <span className={`text-[10px] font-semibold ${canCloseBreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {canCloseBreak ? (allMembersConfirmed ? 'Ready to settle' : 'Awaiting confirmations') : 'Only creator or admin can close'}
              </span>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* Modal: Close / End Break Confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                Close Ongoing Tea Break?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Closing this break will end the current session for <strong>{group?.name}</strong> and allow anyone in this group to start a new tea break.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelBreak}
                disabled={isDeletingBreak}
                id="confirm-end-task-btn"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-80 text-white shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isDeletingBreak ? (
                  <ChaiLoader variant="spinner" size="sm" text="Closing..." />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Close Break</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Break is running cannot create at the moment */}
      {showCannotCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-800 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                Action Restricted
              </span>
              <h3 className="font-heading font-black text-base text-stone-900 dark:text-stone-100 leading-snug">
                Break is running cannot create at the moment
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Not everyone can close the break. Who created the break ({activeSession?.creatorName || 'the break creator'}) or the group admin can close or settle the break.
              </p>
              <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium text-left space-y-1">
                <div>• Current Break: <strong>{activeSession?.title || 'Tea Break'}</strong></div>
                <div>• Created by: <strong>{activeSession?.creatorName || 'Creator'}</strong></div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCannotCloseModal(false)}
                id="cannot-close-modal-ok-btn"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all text-center"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: All members must confirm items before settle and close */}
      {showUnconfirmedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-amber-300 dark:border-amber-800 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl shadow-inner">
              <Clock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                Confirmation Required
              </span>
              <h3 className="font-heading font-black text-base text-stone-900 dark:text-stone-100 leading-snug">
                Items Need Confirmation Before Settle &amp; Close
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Everyone needs to confirm their items. Only after that can you settle and close the break.
              </p>
            </div>

            {/* List of members who haven't confirmed */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1 text-left">
              <div className="text-[11px] font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                <span>Pending Members ({unconfirmedMembers.length}):</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Not Confirmed</span>
              </div>

              {unconfirmedMembers.map(member => (
                <div
                  key={member.memberId}
                  className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900 text-stone-800 dark:text-stone-200 text-[8px] font-bold flex items-center justify-center shrink-0">
                        {member.memberName[0]}
                      </div>
                      <span className="truncate">{member.memberName}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {member.items.map(i => `${i.name} x${i.quantity}`).join(', ')} • ₹{member.total}
                    </div>
                  </div>

                  {(isBreakCreator || canEditConfirmed || effectiveUser?.id === member.memberId) && (
                    <button
                      type="button"
                      onClick={async () => {
                        await confirmMemberOrder(member.memberId, activeSession?.id)
                        showToast(`Confirmed items for ${member.memberName}`)
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Confirm</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnconfirmedModal(false)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 shadow-2xs cursor-pointer active:scale-95 transition-all text-center"
              >
                Okay, Remind Members
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Admin Add Items for Others */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90vh] bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-4 space-y-3.5 flex flex-col text-left overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-sm text-stone-900 dark:text-stone-100">
                    Add Items for Others
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowAssignModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Member Selector Pills */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                <span>Select Colleague:</span>
                <span className="text-[10px] text-amber-600 font-bold">
                  {selectedAssignee?.name}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {group.members.map(member => {
                  const isSelected = selectedAssigneeId === member.id
                  const memberExp = activeSession.expenses.find(e => e.memberId === member.id)
                  const mCount = memberExp?.items.reduce((s, i) => s + i.quantity, 0) || 0

                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedAssigneeId(member.id)}
                      className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0 text-xs ${
                        isSelected
                          ? 'border-amber-600 bg-amber-600 text-white shadow-xs font-bold'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:border-amber-400'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-white text-stone-900'
                            : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200'
                        }`}
                      >
                        {member.avatar || member.name[0]}
                      </div>
                      <span>{member.name}</span>
                      {mCount > 0 && (
                        <span
                          className={`px-1 rounded-full text-[9px] font-bold ${
                            isSelected ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {mCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selected Member's current items summary */}
            {(() => {
              const assigneeExp = activeSession.expenses.find(e => e.memberId === selectedAssigneeId)
              const isAssigneeConfirmed = Boolean(assigneeExp?.isConfirmed)
              return assigneeExp ? (
                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span>In {selectedAssignee?.name}'s Cup:</span>
                      {isAssigneeConfirmed && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                          Confirmed
                        </span>
                      )}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      ₹{assigneeExp.total}
                    </span>
                  </div>

                  {isAssigneeConfirmed && (
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/80 text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>{selectedAssignee?.name} confirmed their order. Any changes you make will be recorded as an admin edit.</span>
                    </div>
                  )}

                  {assigneeExp.items.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {assigneeExp.items.map(item => (
                        <div
                          key={item.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px]"
                        >
                          <span>{item.name}</span>
                          <span className="font-bold text-amber-600">x{item.quantity}</span>
                          <button
                            onClick={() => removeItemFromMember(selectedAssigneeId, item.id || item.menuItemId || item.name, activeSession?.id, effectiveUser?.name || 'Admin')}
                            className="w-3.5 h-3.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Minus className="w-2 h-2" />
                          </button>
                          <button
                            onClick={() => {
                              const mi =
                                shopMenuItems.find(m => m.id === item.menuItemId) ||
                                menuItems.find(m => m.id === item.menuItemId) || {
                                  id: item.menuItemId || item.id,
                                  name: item.name,
                                  price: item.price,
                                  category: 'snacks',
                                  emoji: item.emoji || ''
                                }
                              handleAdminAssignItem(mi)
                            }}
                            className="w-3.5 h-3.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-emerald-600 cursor-pointer"
                          >
                            <Plus className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-stone-400 italic">No items yet</div>
                  )}
                </div>
              ) : null
            })()}

            {/* Step 2: Menu Items to Add */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Tap to add to {selectedAssignee?.name}'s cup:
                </span>
              </div>

              {/* Menu items grid */}
              {shopMenuItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                  No items listed for {activeSession.shopName} yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 overflow-y-auto max-h-48 pr-0.5">
                  {sortedMenuItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAdminAssignItem(item)}
                      className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700/60 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 text-left cursor-pointer active:scale-95 transition-all flex items-center justify-between group shadow-2xs"
                    >
                    <div className="truncate pr-1">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-semibold text-[11px] text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-700">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 pl-4">
                        ₹{item.price}
                      </div>
                    </div>

                    <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                      +
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="w-full py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- FLOATING BOTTOM POPUP BAR FOR ADDED ITEMS ---------------- */}
      {myItemCount > 0 && (
        <div className="fixed bottom-[76px] left-1/2 -translate-x-1/2 w-full max-w-[430px] px-3 z-40 pointer-events-none animate-in slide-in-from-bottom-4 duration-200">
          <div className="pointer-events-auto flex flex-col items-center">
            {/* Expandable popup drawer above the bar */}
            {isCupDrawerOpen && (
              <div className="w-full mb-2 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-700/70 shadow-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-150 max-h-[55vh] overflow-y-auto">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      <Coffee className="w-3.5 h-3.5" />
                    </div>
                    <h4 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
                      In Your Cup ({myItemCount} {myItemCount === 1 ? 'item' : 'items'})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCupDrawerOpen(false)}
                    className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Admin audit notification banner */}
                {currentUserExpense?.adminEdits && currentUserExpense.adminEdits.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 space-y-1.5 shadow-xs text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Admin modified your confirmed order:</span>
                    </div>
                    {currentUserExpense.adminEdits.map((edit, idx) => (
                      <div key={idx} className="text-[11px] text-stone-700 dark:text-stone-300 flex items-center justify-between">
                        <span>
                          <strong>{edit.adminName}</strong> {edit.action} <strong>{edit.itemName}</strong>
                        </span>
                        <span className="font-mono text-amber-700 dark:text-amber-400">
                          {edit.oldQuantity ?? 0} → {edit.newQuantity ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Item List */}
                <div className="space-y-1.5">
                  {currentUserExpense?.items.map(item => {
                    const iconCfg = getItemIconConfig(item.name, undefined, item.emoji)
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs py-2 px-2.5 rounded-2xl bg-stone-50 dark:bg-stone-850 border border-stone-200/60 dark:border-stone-700/50"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className={`w-8 h-8 rounded-xl ${iconCfg.bgLight} ${iconCfg.bgDark} flex items-center justify-center text-sm shrink-0`}>
                            {iconCfg.emoji}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate block">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              ₹{item.price} each
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                            ₹{item.price * item.quantity}
                          </span>
                        <div className="flex items-center gap-1 bg-stone-200/70 dark:bg-stone-700 p-0.5 rounded-md">
                          {(!isMyOrderConfirmed || canEditConfirmed) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSelfRemoveItem(item.id || item.menuItemId || item.name)}
                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 cursor-pointer"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-[11px] px-1">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const mi =
                                    shopMenuItems.find(m => m.id === item.menuItemId) ||
                                    menuItems.find(m => m.id === item.menuItemId) || {
                                      id: item.menuItemId || item.id,
                                      name: item.name,
                                      price: item.price,
                                      category: 'snacks',
                                      emoji: item.emoji || ''
                                    }
                                  handleSelfAddItem(mi)
                                }}
                                className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 cursor-pointer"
                                title="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-stone-600 dark:text-stone-300">
                              <Lock className="w-3 h-3 text-stone-400" />
                              <span>Qty: {item.quantity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>

                {/* Subtotal in drawer */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-600 dark:text-stone-400">Total</span>
                  <span className="font-heading font-black text-sm text-stone-900 dark:text-stone-100">₹{myTotal}</span>
                </div>
              </div>
            )}

            {/* Docked Floating Bar */}
            <div className="w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-amber-500/40 dark:border-amber-600/40 rounded-2xl p-2.5 shadow-xl shadow-stone-950/15 flex items-center justify-between gap-2 transition-all">
              {/* Left: Summary & Drawer Toggle */}
              <button
                type="button"
                onClick={() => setIsCupDrawerOpen(prev => !prev)}
                id="toggle-cup-drawer-btn"
                className="flex items-center gap-2 cursor-pointer text-left hover:opacity-85 transition-opacity py-0.5 px-1 rounded-xl"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-black text-sm text-stone-900 dark:text-stone-100">
                      ₹{myTotal}
                    </span>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/70 px-1.5 py-0.2 rounded-md">
                      {myItemCount} {myItemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-0.5">
                    <span>{isCupDrawerOpen ? 'Hide cup' : 'View cup'}</span>
                    {isCupDrawerOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                  </div>
                </div>
              </button>

              {/* Right: Confirm Action / Confirmed Badge */}
              <div className="flex items-center gap-1.5">
                {isMyOrderConfirmed ? (
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Confirmed</span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmMyOrder}
                    disabled={isConfirming || !currentUserExpense || currentUserExpense.items.length === 0}
                    id="confirm-my-order-popup-btn"
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                    title="Confirm and lock your items"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isConfirming ? 'Confirming...' : 'Confirm'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
