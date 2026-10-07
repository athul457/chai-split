import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Plus,
  Minus,
  Crown,
  Coffee,
  Sparkles,
  Share2,
  Clock,
  ShoppingBag,
  Flame,
  X,
  CheckCircle2,
  UserPlus,
  Receipt,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useExpense } from '../context/ExpenseContext'
import type { Group, User, MenuItem } from '../types'

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
  const {
    activeSession,
    cancelActiveSession,
    settleActiveSession,
    addItemToMember,
    removeItemFromMember,
    menuItems,
    generateWhatsAppSummary
  } = useExpense()

  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  // Accordion state: other users' items only appear when clicked
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(() => {
    return new Set(currentUser?.id ? [currentUser.id] : [])
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
  const effectiveAdminId = group.adminId || group.members[0]?.id || currentUser?.id
  const isAdmin = currentUser?.id === effectiveAdminId

  // Selected colleague for admin assigning items
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>(() => {
    const firstOther = group.members.find(m => m.id !== currentUser?.id)
    return firstOther ? firstOther.id : (group.members[0]?.id || currentUser?.id || '')
  })

  const selectedAssignee = group.members.find(m => m.id === selectedAssigneeId) || group.members[0] || currentUser

  // User adds item for themselves
  const handleSelfAddItem = (item: MenuItem) => {
    if (!currentUser) return
    addItemToMember(currentUser.id, item)
    showToast(`Added ${item.name} to your cup! ☕`)
  }

  // User removes item for themselves
  const handleSelfRemoveItem = (menuItemId: string) => {
    if (!currentUser) return
    removeItemFromMember(currentUser.id, menuItemId)
  }

  // Admin assigns item to selected colleague
  const handleAdminAssignItem = (item: MenuItem) => {
    if (!isAdmin || !selectedAssigneeId) return
    addItemToMember(selectedAssigneeId, item)
    showToast(`Assigned ${item.name} to ${selectedAssignee?.name || 'teammate'}! 🥟`)
  }

  // Settle break (admin)
  const handleSettleBreak = () => {
    if (!isAdmin) return
    settleActiveSession()
    showToast(`Tea break bill settled successfully! 🎉`)
    onBack()
  }

  // Cancel break (admin)
  const handleCancelBreak = () => {
    if (!isAdmin) return
    cancelActiveSession()
    setShowCancelConfirm(false)
    showToast(`Tea break ended.`)
    onBack()
  }

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const text = generateWhatsAppSummary()
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  // Current user's expense in active break
  const currentUserExpense = activeSession?.expenses.find(e => e.memberId === currentUser?.id)
  const myTotal = currentUserExpense?.total || 0
  const myItemCount = currentUserExpense?.items.reduce((acc, i) => acc + i.quantity, 0) || 0

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

  // Sort members based on total price in ascending order (₹0 first, then ₹12, ₹50, ₹90...)
  const sortedExpenses = useMemo(() => {
    if (!activeSession) return []
    return [...activeSession.expenses].sort((a, b) => {
      if (a.total !== b.total) {
        return a.total - b.total
      }
      // If totals are equal, put current user first, then sort by name
      if (a.memberId === currentUser?.id) return -1
      if (b.memberId === currentUser?.id) return 1
      return a.memberName.localeCompare(b.memberName)
    })
  }, [activeSession, currentUser?.id])

  // Sort menu items by price in ascending order
  const sortedMenuItems = useMemo(() => {
    return [...menuItems].sort((a, b) => a.price - b.price)
  }, [menuItems])

  if (!activeSession) {
    return (
      <div className="space-y-4 animate-in fade-in pb-16">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Group</span>
          </button>
        </div>
        <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="text-3xl">☕</div>
          <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
            No Active Tea Break
          </h3>
          <p className="text-xs text-stone-500">
            This tea break has ended or settled.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white cursor-pointer"
          >
            Return to Group
          </button>
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
          <span>Back to Groups</span>
        </button>

        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span>Live Tea Break</span>
        </span>
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
                <span className="text-xs text-amber-600 font-normal">(Add items for yourself)</span>
              </h3>
              <p className="text-[10px] text-stone-400">
                Logged in as <strong>{currentUser?.name}</strong> • Tap items below to add
              </p>
            </div>
          </div>

          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs">
            ₹{myTotal}
          </span>
        </div>

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
                    <button
                      onClick={() => handleSelfRemoveItem(item.menuItemId)}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-[11px] px-1">{item.quantity}</span>
                    <button
                      onClick={() => {
                        const mi = menuItems.find(m => m.id === item.menuItemId)
                        if (mi) handleSelfAddItem(mi)
                      }}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
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
              {menuItems.length} choices
            </span>
          </div>

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
            <span>+ Add items for others</span>
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
              const isUser = expense.memberId === currentUser?.id
              const isMemberAdmin = expense.memberId === effectiveAdminId
              const canEditThisMember = isAdmin || isUser
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
                    <div className="pt-1.5 animate-in fade-in duration-150">
                      {expense.items.length > 0 ? (
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
                                      removeItemFromMember(expense.memberId, item.menuItemId)
                                    }}
                                    className="w-4 h-4 rounded flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 cursor-pointer"
                                    title="Decrease"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const mi = menuItems.find(m => m.id === item.menuItemId)
                                      if (mi) addItemToMember(expense.memberId, mi)
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

          {/* Option for End Task - Strictly visible only here */}
          {isAdmin ? (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                id="end-task-btn"
                className="flex-1 py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-rose-400 bg-stone-50 dark:bg-stone-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4 text-rose-500" />
                <span>End Task</span>
              </button>

              <button
                type="button"
                onClick={handleSettleBreak}
                id="settle-and-end-task-btn"
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md active:scale-95 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Settle &amp; Close 🎉</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-[11px] text-stone-400 pt-1">
              Admin ({group.members.find(m => m.id === effectiveAdminId)?.name || 'Admin'}) can end this task when break is done.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cancel / End Task Confirmation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center mx-auto text-xl">
              ☕
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                End Current Tea Break Task?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                This will end the active chai break for {group.name}.
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Yes, End Task
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
              return assigneeExp && assigneeExp.items.length > 0 ? (
                <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-700/70 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                    <span>In {selectedAssignee?.name}'s Cup:</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">
                      ₹{assigneeExp.total}
                    </span>
                  </div>
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
                          onClick={() => removeItemFromMember(selectedAssigneeId, item.menuItemId)}
                          className="w-3.5 h-3.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Minus className="w-2 h-2" />
                        </button>
                        <button
                          onClick={() => {
                            const mi = menuItems.find(m => m.id === item.menuItemId)
                            if (mi) handleAdminAssignItem(mi)
                          }}
                          className="w-3.5 h-3.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-emerald-600 cursor-pointer"
                        >
                          <Plus className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>
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
                  {menuItems.length} choices
                </span>
              </div>

              {/* Menu items grid */}
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
