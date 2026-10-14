import {
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Clock,
    Coffee,
    Crown,
    Flame,
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
import React, { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { ChaiLoader } from '../components/ChaiLoader'
import type { Group, MenuItem, User, MemberExpense } from '../types'

interface TeaBreakPageProps {
  group: Group
  currentUser: User | null
  onBack: () => void
}

export const TeaBreakPage: React.FC<TeaBreakPageProps> = ({
  group,
  currentUser,
  onBack
}) => {
  const { user: authUser } = useAuth()
  const effectiveUser = currentUser || authUser

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
    (globalActiveSession?.groupId === group?.id ? globalActiveSession : globalActiveSession)

  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showCannotCloseModal, setShowCannotCloseModal] = useState(false)
  const [showUnconfirmedModal, setShowUnconfirmedModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [isSettling, setIsSettling] = useState(false)
  const [isDeletingBreak, setIsDeletingBreak] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

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

  // Break Creator detection: strictly ONLY the user who created the break can close or settle it
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

  // Strictly only the person who created the break can close or settle it
  const canCloseBreak = Boolean(activeSession && isBreakCreator)

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
      showToast('Order confirmed! Your items are now locked. ✓')
    } catch {
      showToast('Could not confirm order. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  // User adds item for themselves (Collaborative: all group/session members can order)
  const handleSelfAddItem = (item: MenuItem) => {
    if (isMyOrderConfirmed && !isAdmin) {
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
    const adminEditorName = isAdmin ? (effectiveUser?.name || 'Admin') : undefined
    addItemToMember(targetUserId, item, activeSession?.id, adminEditorName)
    showToast(`Added ${item.name} to your cup! ☕`)
  }

  // User removes item for themselves
  const handleSelfRemoveItem = async (menuItemId: string) => {
    if (isMyOrderConfirmed && !isAdmin) {
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
    const adminEditorName = isAdmin ? (effectiveUser?.name || 'Admin') : undefined
    await removeItemFromMember(targetUserId, menuItemId, activeSession?.id, adminEditorName)
  }

  // Admin assigns item to selected colleague
  const handleAdminAssignItem = (item: MenuItem) => {
    if (!isAdmin || !selectedAssigneeId) return
    const adminName = effectiveUser?.name || 'Admin'
    addItemToMember(selectedAssigneeId, item, activeSession?.id, adminName)
    showToast(`Assigned ${item.name} to ${selectedAssignee?.name || 'teammate'}! 🥟`)
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
      settleActiveSession(activeSession?.id, currentUser?.id)
      showToast(`Tea break bill settled successfully! 🎉`)
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
      const res = cancelActiveSession(currentUser?.id, activeSession?.id)
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
          <div className="text-3xl">☕</div>
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
    <div className="space-y-4 animate-in fade-in pb-16">
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

      {/* Top Navigation Bar - Clean back to group */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
        <button
          onClick={onBack}
          id="back-to-group-from-break-btn"
          className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Group</span>
        </button>

        <div className="flex items-center gap-2">
          {group && (
            <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/50">
              ID: {group.code || group.id}
            </span>
          )}
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span>Live Tea Break</span>
          </span>
        </div>
      </div>

      {/* Active Session Overview Banner (PURE BREAK DATA - NO GROUP DETAILS) */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase backdrop-blur-xs flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-200" />
            <span>Live Session</span>
          </span>

          <span className="text-amber-100 text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{activeSession.createdAt}</span>
          </span>
        </div>

        <div>
          <h2 className="font-heading text-xl font-black tracking-tight">
            {activeSession.title}
          </h2>
          <p className="text-amber-100 text-xs font-medium mt-0.5">
            📍 {activeSession.shopName} • {totalSessionItemCount} items ordered
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20">
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-amber-200 font-medium">Shop:</span>
            <span className="font-heading text-sm font-bold">{activeSession.shopName}</span>
          </div>

          <button
            onClick={handleShareWhatsApp}
            id="share-break-whatsapp-btn"
            title="Share order on WhatsApp"
            className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share Bill</span>
          </button>
        </div>
      </div>

      {/* ---------------- FEATURE 1: USER ADDS ITEMS BY THEIR OWN ---------------- */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>My Cup</span>
                <span className="text-xs text-amber-600 font-normal">
                  {isMyOrderConfirmed ? '(Order Confirmed)' : '(Add items for yourself)'}
                </span>
              </h3>
              <p className="text-[10px] text-stone-400">
                Logged in as <strong>{effectiveUser?.name || currentUserExpense?.memberName || 'You'}</strong>
                {isMyOrderConfirmed ? ' • Items are locked' : ' • Tap items below to add'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMyOrderConfirmed ? (
              <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Confirmed ✓</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConfirmMyOrder}
                disabled={isConfirming || !currentUserExpense || currentUserExpense.items.length === 0}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                title="Confirm and lock your items"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isConfirming ? 'Confirming...' : 'Confirm Items'}</span>
              </button>
            )}

            <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs">
              ₹{myTotal}
            </span>
          </div>
        </div>

        {/* Confirmation status notice */}
        {isMyOrderConfirmed && (
          <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold">Your order is confirmed and locked.</span>
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 ml-1">
                  ({currentUserExpense?.confirmedAt || 'Earlier'})
                </span>
                <p className="text-[10px] text-stone-500 dark:text-stone-400">
                  {isAdmin
                    ? 'As Admin, you can still adjust quantities if needed.'
                    : 'You cannot edit your items anymore. Any changes will need to be made by the admin.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN EDIT AUDIT NOTIFICATION BANNER */}
        {currentUserExpense?.adminEdits && currentUserExpense.adminEdits.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 space-y-2 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-300">
                <span className="p-1 rounded-md bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
                <span>Admin modified your confirmed order:</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                {currentUserExpense.adminEdits.length} {currentUserExpense.adminEdits.length === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <div className="space-y-1.5 pt-0.5 divide-y divide-amber-200/60 dark:divide-amber-800/60">
              {currentUserExpense.adminEdits.map((edit, idx) => (
                <div key={idx} className="pt-1.5 first:pt-0 text-xs flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-stone-800 dark:text-stone-200">
                      👑 Admin <strong className="text-amber-700 dark:text-amber-400">{edit.adminName}</strong>{' '}
                      {edit.action === 'added' ? 'added' : edit.action === 'removed' ? 'removed' : 'adjusted'}{' '}
                      <strong className="font-bold underline decoration-amber-500">{edit.itemName}</strong>
                    </div>
                    <div className="text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                      Quantity: <span className="line-through text-stone-400">{edit.oldQuantity ?? 0}</span> ➔ <strong className="text-amber-700 dark:text-amber-300 font-bold">{edit.newQuantity ?? 0}</strong>
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400 shrink-0 font-medium pt-0.5">{edit.editedAt}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current user's items in their cup */}
        {currentUserExpense && currentUserExpense.items.length > 0 ? (
          <div className="space-y-1.5 p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/60">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
              In Your Cup ({myItemCount} items):
            </div>
            {currentUserExpense.items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg bg-white dark:bg-stone-800 shadow-2xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span>{item.emoji}</span>
                  <span className="font-medium text-stone-900 dark:text-stone-100 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    (₹{item.price} each)
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                    ₹{item.price * item.quantity}
                  </span>
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-700 p-0.5 rounded-md">
                    {(!isMyOrderConfirmed || isAdmin) ? (
                      <>
                        <button
                          onClick={() => handleSelfRemoveItem(item.id || item.menuItemId || item.name)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-[11px] px-1">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const mi =
                              shopMenuItems.find(m => m.id === item.menuItemId) ||
                              menuItems.find(m => m.id === item.menuItemId) || {
                                id: item.menuItemId || item.id,
                                name: item.name,
                                price: item.price,
                                category: 'snacks',
                                emoji: item.emoji || '☕'
                              }
                            handleSelfAddItem(mi)
                          }}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 cursor-pointer"
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
            ))}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
            Your cup is empty! Tap any item below to add to your order.
          </div>
        )}

        {/* Menu items 1-tap grid */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Select Tea &amp; Snacks to Add:
            </span>
            <span className="text-[10px] text-stone-400">
              {shopMenuItems.length} choices
            </span>
          </div>

          {isMyOrderConfirmed && !isAdmin ? (
            <div className="p-3 text-center text-xs text-stone-500 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Ordering locked. You have confirmed your items for this tea break.</span>
            </div>
          ) : shopMenuItems.length === 0 ? (
            <div className="p-4 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
              No items available in {activeSession.shopName} menu yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-0.5">
              {sortedMenuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelfAddItem(item)}
                  className="p-2 rounded-xl border border-stone-200/80 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all cursor-pointer active:scale-95 group flex items-center justify-between"
                >
                  <div className="truncate pr-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm shrink-0">{item.emoji}</span>
                      <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                        {item.name}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 pl-5">
                      ₹{item.price}
                    </div>
                  </div>

                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Plus className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- ADMIN: BUTTON FOR ADDING ITEMS FOR OTHERS ---------------- */}
      {isAdmin && (
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
            <p className="text-[10px] text-stone-400">
              {isAdmin
                ? 'Visible to all members • Admin can adjust quantities for any member'
                : 'Visible to all members • Real-time live sync'}
            </p>
          </div>

          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
            {orderedMembersCount} of {group.members.length} ordered
          </span>
        </div>

        {/* 1. TOTAL ITEMS EATEN & TOTAL PRICE FOR EACH ITEM (TAPRI COUNTER) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                Total Items Eaten ({totalSessionItemCount})
              </span>
            </div>
            <span className="text-[10px] text-stone-400">
              Tapri Order Summary
            </span>
          </div>

          {aggregatedItems.length > 0 ? (
            <div className="rounded-xl border border-stone-200/70 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800/80 overflow-hidden bg-stone-50/50 dark:bg-stone-900/50">
              {aggregatedItems.map(item => (
                <div
                  key={item.menuItemId}
                  className="p-2.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{item.emoji}</span>
                      <span className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-stone-400 font-medium">
                        @ ₹{item.price} each
                      </span>
                    </div>
                    {/* Who ate it */}
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 pl-5">
                      Eaten by: {item.orderedBy.map(o => `${o.name} (${o.qty})`).join(', ')}
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-2">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                        ×{item.quantity} eaten
                      </span>
                      <span className="font-heading font-black text-xs text-stone-900 dark:text-stone-100 min-w-10 text-right">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Aggregated Total Row */}
              <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 flex items-center justify-between text-xs font-bold border-t border-amber-200/50 dark:border-amber-900/40">
                <span className="text-amber-900 dark:text-amber-200 flex items-center gap-1">
                  <span>Total Items Eaten:</span>
                  <span className="text-amber-700 dark:text-amber-400">{totalSessionItemCount} items</span>
                </span>
                <span className="text-amber-900 dark:text-amber-200 font-heading text-sm">
                  Grand Total: ₹{activeSession.totalAmount}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 space-y-1">
              <p className="font-medium">No items eaten yet</p>
              <p className="text-[11px] text-stone-400">
                When members add tea &amp; snacks, the total count and total price for each item will appear here.
              </p>
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
            <span className="text-[10px] text-stone-400">
              Tap member to view items
            </span>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {sortedExpenses.map(expense => {
              const isUser =
                expense.memberId === effectiveUser?.id ||
                expense.memberId === currentUser?.id ||
                (currentUserExpense && expense.memberId === currentUserExpense.memberId) ||
                (effectiveUser?.userCode && expense.memberId === effectiveUser.userCode)
              const isMemberAdmin = expense.memberId === effectiveAdminId
              const isConfirmed = Boolean(expense.isConfirmed)
              const canEditThisMember = isAdmin || (!isConfirmed && isUser)
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
                              • <strong>{ed.adminName}</strong> {ed.action} <strong>{ed.itemName}</strong> (Qty: {ed.oldQuantity ?? 0} ➔ <strong className="text-amber-700 dark:text-amber-400 font-bold">{ed.newQuantity ?? 0}</strong>) • {ed.editedAt}
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
                              <span>{item.emoji}</span>
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
                                      const adminName = isAdmin ? (effectiveUser?.name || 'Admin') : undefined
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
                                          emoji: item.emoji || '☕'
                                        }
                                      const adminName = isAdmin ? (effectiveUser?.name || 'Admin') : undefined
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

                          {!isConfirmed && (isUser || isBreakCreator || isAdmin) && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                await confirmMemberOrder(expense.memberId, activeSession?.id)
                                showToast(`Confirmed items for ${expense.memberName} ✓`)
                              }}
                              className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Confirm Items ✓</span>
                            </button>
                          )}
                        </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between pl-8 text-[10px] text-stone-400">
                          <span className="italic">No items added yet</span>
                          {isAdmin && !isUser && (
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
                  ({totalSessionItemCount} {totalSessionItemCount === 1 ? 'item' : 'items'} eaten)
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
                    <span>Settle &amp; Close 🎉</span>
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
                {canCloseBreak ? (allMembersConfirmed ? '✓ Ready to settle' : '⏳ Awaiting confirmations') : '🔒 Only creator can close'}
              </span>
            </div>
          </div>
        </div>
      </div>

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
                Not everyone can close the break. Who created the break ({activeSession?.creatorName || 'the break creator'}) can only close or settle the break.
              </p>
              <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium text-left space-y-1">
                <div>• Current Break: <strong>{activeSession?.title || 'Tea Break'}</strong></div>
                <div>• Created by: <strong>{activeSession?.creatorName || 'Creator'}</strong></div>
                <div className="text-[10px] text-stone-500 dark:text-stone-400 pt-0.5">
                  Only one break can be created at a time. Please ask <strong>{activeSession?.creatorName || 'the creator'}</strong> to close or settle this session.
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCannotCloseModal(false)}
                id="cannot-close-modal-ok-btn"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all text-center"
              >
                Understood ✓
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
                      <span>{member.memberAvatar || '☕'}</span>
                      <span className="truncate">{member.memberName}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                      {member.items.map(i => `${i.name} x${i.quantity}`).join(', ')} • ₹{member.total}
                    </div>
                  </div>

                  {(isBreakCreator || isAdmin || effectiveUser?.id === member.memberId) && (
                    <button
                      type="button"
                      onClick={async () => {
                        await confirmMemberOrder(member.memberId, activeSession?.id)
                        showToast(`Confirmed items for ${member.memberName} ✓`)
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
                  <p className="text-[10px] text-stone-400">
                    Assign tea &amp; snacks to your teammates
                  </p>
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
                          ✓ Confirmed
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
                          <span>{item.emoji}</span>
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
                                  emoji: item.emoji || '☕'
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
                <span className="text-[10px] text-stone-400 font-medium">
                  {shopMenuItems.length} choices
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
                        <span className="text-xs shrink-0">{item.emoji}</span>
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
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
