import {
  ArrowUpDown,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Copy,
  CreditCard,
  Crown,
  Download,
  Layers,
  Receipt,
  Search,
  Store,
  UserCheck,
  Users,
  Utensils,
  X
} from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'
import { useExpense } from '../context/ExpenseContext'
import type { Group, TeaSession, User } from '../types'
import { downloadExpensePdf, downloadSingleSessionPdf, type MemberPdfBreakdown } from '../utils/pdfReport'

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom'
type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'items-desc'
type HistorySectionView = 'personal' | 'team' | 'both'

interface MemberOption {
  id: string
  name: string
  avatar: string
  email?: string
  isCurrentUser: boolean
}

interface HistoryPageProps {
  groups: Group[]
  currentUser: User | null
  initialGroupId?: string | null
  onBack?: () => void
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  groups,
  currentUser,
  initialGroupId = null,
  onBack
}) => {
  const { pastSessions } = useExpense()

  // Feature toggle: Download report/receipt buttons (hidden for now as requested)
  const SHOW_DOWNLOAD_REPORT = false

  // User's own groups: Only groups where the current user is a member or admin
  const userGroups = useMemo(() => {
    if (!currentUser) return groups
    return groups.filter(g =>
      g.adminId === currentUser.id ||
      g.members?.some(m => m.id === currentUser.id || (currentUser.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()))
    )
  }, [groups, currentUser])

  const userGroupIds = useMemo(() => new Set(userGroups.map(g => g.id)), [userGroups])
  const userGroupNames = useMemo(() => new Set(userGroups.map(g => g.name.toLowerCase().trim())), [userGroups])

  // Filter & Sort States
  const [sectionView, setSectionView] = useState<HistorySectionView>('personal')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('day')
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc')
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'all'>(initialGroupId || 'all')
  const [showOtherGroups, setShowOtherGroups] = useState(false)
  const [showUniqueItems, setShowUniqueItems] = useState(false)
  const [expandedBreakItemIds, setExpandedBreakItemIds] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline'>('grouped')
  const [searchQuery, setSearchQuery] = useState('')

  // Admin permission check: only show/allow PDF download for group admins
  const isGroupAdmin = useMemo(() => {
    if (!currentUser) return false
    if (selectedGroupId === 'all') {
      return userGroups.some(g => g.adminId === currentUser.id || (!g.adminId && g.members[0]?.id === currentUser.id))
    }
    const targetGroup = userGroups.find(g => g.id === selectedGroupId)
    if (!targetGroup) return false
    return targetGroup.adminId === currentUser.id || (!targetGroup.adminId && targetGroup.members[0]?.id === currentUser.id)
  }, [currentUser, selectedGroupId, userGroups])

  const toggleBreakItems = (sessionId: string) => {
    setExpandedBreakItemIds(prev => {
      const next = new Set(prev)
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })
  }

  const handleAllGroupsClick = () => {
    setShowOtherGroups(prev => !prev)
  }

  // Reset selectedGroupId if it is not in userGroupIds
  useEffect(() => {
    if (selectedGroupId !== 'all' && !userGroupIds.has(selectedGroupId)) {
      setSelectedGroupId('all')
    }
  }, [selectedGroupId, userGroupIds])

  // Custom Date Range (YYYY-MM-DD)
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().slice(0, 10)
  })

  // Expanded state for group sections in "grouped" view (collapsed by default)
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set())

  // Modal: Selected Session for Full Bill Receipt
  const [selectedSessionForReceipt, setSelectedSessionForReceipt] = useState<TeaSession | null>(null)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [expandedReceiptMemberIds, setExpandedReceiptMemberIds] = useState<Set<string>>(new Set())

  const toggleReceiptMemberItems = (memberId: string) => {
    setExpandedReceiptMemberIds(prev => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  const toggleAllReceiptMemberItems = () => {
    if (!selectedSessionForReceipt) return
    const membersWithItems = selectedSessionForReceipt.expenses
      .filter(e => e.items && e.items.length > 0)
      .map(e => e.memberId)

    setExpandedReceiptMemberIds(prev => {
      const allExpanded = membersWithItems.length > 0 && membersWithItems.every(id => prev.has(id))
      if (allExpanded) {
        return new Set()
      } else {
        return new Set(membersWithItems)
      }
    })
  }

  // Reset expanded member items whenever a different session receipt is opened
  useEffect(() => {
    setExpandedReceiptMemberIds(new Set())
  }, [selectedSessionForReceipt])

  const toggleGroupExpand = (grpKey: string) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev)
      if (next.has(grpKey)) {
        next.delete(grpKey)
      } else {
        next.add(grpKey)
      }
      return next
    })
  }

  // Helper to parse session date into Date object
  const getSessionDate = (sess: TeaSession): Date => {
    if (sess.rawCreatedAt) {
      const d = new Date(sess.rawCreatedAt)
      if (!isNaN(d.getTime())) return d
    }
    // Fallback: try parsing sess.id if it starts with session-timestamp
    if (sess.id && sess.id.startsWith('session-')) {
      const parts = sess.id.split('-')
      const ts = Number(parts[1])
      if (ts && !isNaN(ts) && ts > 1000000000000) {
        return new Date(ts)
      }
    }
    const d = new Date(sess.createdAt)
    return !isNaN(d.getTime()) ? d : new Date(0)
  }

  // Format date helper
  const formatFriendlyDate = (sess: TeaSession) => {
    const d = getSessionDate(sess)
    if (isNaN(d.getTime()) || d.getTime() === 0) return sess.createdAt || 'Settled'
    const now = new Date()
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `Today at ${timeStr}`

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    if (isYesterday) return `Yesterday at ${timeStr}`

    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • ${timeStr}`
  }

  // AUTHORIZATION & ISOLATION FILTER:
  // Each user should ONLY see user's own group details.
  // If user is not in a group, that group's details and sessions must NOT be visible.
  const userSessions = useMemo(() => {
    return pastSessions.filter(sess => {
      // 1. If tagged with a groupId, user MUST belong to this group
      if (sess.groupId) {
        return userGroupIds.has(sess.groupId)
      }
      // 2. If tagged with a groupName, user MUST belong to a group with this name
      if (sess.groupName) {
        return userGroupNames.has(sess.groupName.toLowerCase().trim())
      }
      // 3. Standalone / Walk-in session without group:
      // Only show if currentUser was a participant, payer, or creator
      if (currentUser) {
        const isPayer = sess.payerId === currentUser.id
        const isCreator = sess.creatorId === currentUser.id
        const isMember = sess.expenses?.some(e => e.memberId === currentUser.id)
        return isPayer || isCreator || isMember
      }
      return false
    })
  }, [pastSessions, userGroupIds, userGroupNames, currentUser])

  // Filtered Sessions according to Time, Group, and Search Query
  const filteredSessions = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1

    return userSessions.filter(sess => {
      const sDate = getSessionDate(sess)
      const sTime = sDate.getTime()

      // 1. Time Filter
      if (timeFilter === 'day') {
        if (sTime < todayStart || sTime > todayEnd) return false
      } else if (timeFilter === 'week') {
        const weekAgo = todayEnd - 7 * 24 * 60 * 60 * 1000
        if (sTime < weekAgo || sTime > todayEnd) return false
      } else if (timeFilter === 'month') {
        const monthAgo = todayEnd - 30 * 24 * 60 * 60 * 1000
        if (sTime < monthAgo || sTime > todayEnd) return false
      } else if (timeFilter === 'year') {
        const yearStart = new Date(now.getFullYear(), 0, 1).getTime()
        if (sTime < yearStart || sTime > todayEnd) return false
      } else if (timeFilter === 'custom') {
        if (customStartDate) {
          const cStart = new Date(`${customStartDate}T00:00:00`).getTime()
          if (sTime < cStart) return false
        }
        if (customEndDate) {
          const cEnd = new Date(`${customEndDate}T23:59:59`).getTime()
          if (sTime > cEnd) return false
        }
      }

      // 2. Group Filter
      if (selectedGroupId !== 'all') {
        const matchById = sess.groupId === selectedGroupId
        const targetGroup = userGroups.find(g => g.id === selectedGroupId)
        const matchByName = targetGroup && sess.groupName && sess.groupName.toLowerCase() === targetGroup.name.toLowerCase()
        if (!matchById && !matchByName) return false
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleMatch = sess.title.toLowerCase().includes(q)
        const shopMatch = sess.shopName.toLowerCase().includes(q)
        const groupMatch = sess.groupName ? sess.groupName.toLowerCase().includes(q) : false
        const payerMatch = sess.payerName ? sess.payerName.toLowerCase().includes(q) : false
        const memberMatch = sess.expenses.some(e => e.memberName.toLowerCase().includes(q))
        const itemMatch = sess.expenses.some(e => e.items.some(i => i.name.toLowerCase().includes(q)))

        if (!titleMatch && !shopMatch && !groupMatch && !payerMatch && !memberMatch && !itemMatch) {
          return false
        }
      }

      return true
    })
  }, [userSessions, timeFilter, selectedGroupId, searchQuery, customStartDate, customEndDate, userGroups])

  // Sorted Sessions
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      const aDate = getSessionDate(a).getTime()
      const bDate = getSessionDate(b).getTime()
      const aItemsCount = a.expenses.reduce((s, e) => s + e.items.reduce((sum, i) => sum + i.quantity, 0), 0)
      const bItemsCount = b.expenses.reduce((s, e) => s + e.items.reduce((sum, i) => sum + i.quantity, 0), 0)

      switch (sortOrder) {
        case 'date-desc':
          return bDate - aDate
        case 'date-asc':
          return aDate - bDate
        case 'amount-desc':
          return b.totalAmount - a.totalAmount
        case 'amount-asc':
          return a.totalAmount - b.totalAmount
        case 'items-desc':
          return bItemsCount - aItemsCount
        default:
          return bDate - aDate
      }
    })
  }, [filteredSessions, sortOrder])

  // -------------------------------------------------------------------------
  // SECTION 1: PERSONAL & MEMBER UNIQUE DATA (1st Priority)
  // -------------------------------------------------------------------------
  // Aggregate all unique members from user's groups and past sessions
  const availableMembers = useMemo((): MemberOption[] => {
    const map = new Map<string, MemberOption>()

    // Always place logged-in user FIRST
    if (currentUser) {
      map.set(currentUser.id, {
        id: currentUser.id,
        name: currentUser.name || 'You',
        avatar: currentUser.avatar || '👤',
        email: currentUser.email,
        isCurrentUser: true
      })
    } else {
      map.set('me', {
        id: 'me',
        name: 'You',
        avatar: '👤',
        isCurrentUser: true
      })
    }

    // Add members from all user groups
    userGroups.forEach(g => {
      g.members?.forEach(m => {
        if (currentUser && (m.id === currentUser.id || (m.name && m.name.toLowerCase() === currentUser.name?.toLowerCase()))) {
          return
        }
        const key = m.id || m.name.toLowerCase()
        if (!map.has(key)) {
          map.set(key, {
            id: m.id || key,
            name: m.name,
            avatar: m.avatar || m.name[0]?.toUpperCase() || '👤',
            email: m.email,
            isCurrentUser: false
          })
        }
      })
    })

    // Also include any members recorded in past sessions
    userSessions.forEach(sess => {
      sess.expenses?.forEach(exp => {
        if (currentUser && (exp.memberId === currentUser.id || (exp.memberName && exp.memberName.toLowerCase() === currentUser.name?.toLowerCase()))) {
          return
        }
        const key = exp.memberId || exp.memberName.toLowerCase()
        if (!map.has(key)) {
          map.set(key, {
            id: exp.memberId || key,
            name: exp.memberName,
            avatar: exp.memberAvatar || exp.memberName[0]?.toUpperCase() || '👤',
            isCurrentUser: false
          })
        }
      })
    })

    return Array.from(map.values())
  }, [currentUser, userGroups, userSessions])


  // Current user member object for Personal Expense section
  const currentUserMember = useMemo(() => {
    return availableMembers.find(m => m.isCurrentUser) || availableMembers[0]
  }, [availableMembers])

  // Helper to compute eaten items and metrics for a given member
  const computeMemberEatenData = (targetMember?: MemberOption) => {
    if (!targetMember) {
      return {
        totalSpent: 0,
        totalItemsCount: 0,
        breaksCount: 0,
        items: [] as { name: string; emoji: string; count: number; totalCost: number; unitPrice: number }[],
        topItem: null as { name: string; emoji: string; count: number; totalCost: number; unitPrice: number } | null,
        breakRecords: [] as {
          sessionId: string
          sessionTitle: string
          shopName: string
          formattedDate: string
          rawSession: TeaSession
          payerName: string
          memberTotal: number
          items: { id?: string; name: string; quantity: number; price: number; emoji?: string }[]
        }[]
      }
    }

    let totalSpent = 0
    let totalItemsCount = 0
    const itemMap = new Map<string, { name: string; emoji: string; count: number; totalCost: number; unitPrice: number }>()
    const breakRecords: {
      sessionId: string
      sessionTitle: string
      shopName: string
      formattedDate: string
      rawSession: TeaSession
      payerName: string
      memberTotal: number
      items: { id?: string; name: string; quantity: number; price: number; emoji?: string }[]
    }[] = []

    filteredSessions.forEach(sess => {
      const exp = sess.expenses?.find(e => {
        if (targetMember.isCurrentUser && currentUser) {
          if (e.memberId === currentUser.id) return true
          if (e.memberName && currentUser.name && e.memberName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) return true
          if (currentUser.email && e.memberId === currentUser.email) return true
        }
        if (e.memberId && targetMember.id && e.memberId === targetMember.id) return true
        if (e.memberName && targetMember.name && e.memberName.trim().toLowerCase() === targetMember.name.trim().toLowerCase()) return true
        return false
      })

      if (exp) {
        totalSpent += exp.total || 0
        const sessItems = exp.items || []
        const countInBreak = sessItems.reduce((acc, it) => acc + (it.quantity || 1), 0)
        totalItemsCount += countInBreak

        sessItems.forEach(it => {
          const key = it.name.trim().toLowerCase()
          const qty = it.quantity || 1
          const cost = (it.price || 0) * qty
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              name: it.name,
              emoji: it.emoji || '☕',
              count: 0,
              totalCost: 0,
              unitPrice: it.price || 0
            })
          }
          const record = itemMap.get(key)!
          record.count += qty
          record.totalCost += cost
        })

        breakRecords.push({
          sessionId: sess.id,
          sessionTitle: sess.title,
          shopName: sess.shopName,
          formattedDate: formatFriendlyDate(sess),
          rawSession: sess,
          payerName: sess.payerName || 'Team Admin',
          memberTotal: exp.total,
          items: sessItems
        })
      }
    })

    const items = Array.from(itemMap.values()).sort((a, b) => b.count - a.count)
    const topItem = items.length > 0 ? items[0] : null
    const breaksCount = breakRecords.length

    return {
      totalSpent,
      totalItemsCount,
      breaksCount,
      items,
      topItem,
      breakRecords
    }
  }

  // Personal Eaten Summary (Strictly for Current User)
  const personalEatenSummary = useMemo(() => {
    return computeMemberEatenData(currentUserMember)
  }, [currentUserMember, filteredSessions, currentUser])


  // Group-wise Categorization
  interface GroupHistorySection {
    key: string
    groupId: string | null
    groupName: string
    groupEmoji: string
    totalAmount: number
    sessionCount: number
    sessions: TeaSession[]
  }

  const groupWiseSections = useMemo((): GroupHistorySection[] => {
    const map = new Map<string, GroupHistorySection>()

    sortedSessions.forEach(sess => {
      let gId: string | null = sess.groupId || null
      let gName = sess.groupName || 'Direct / Walk-in'
      let gEmoji = '☕'

      if (gId) {
        const found = userGroups.find(g => g.id === gId)
        if (found) {
          gName = found.name
          gEmoji = found.shopEmoji || '👥'
        }
      } else if (sess.groupName) {
        const found = userGroups.find(g => g.name.toLowerCase() === sess.groupName?.toLowerCase())
        if (found) {
          gId = found.id
          gName = found.name
          gEmoji = found.shopEmoji || '👥'
        }
      }

      const key = gId || `name-${gName.toLowerCase()}`

      if (!map.has(key)) {
        map.set(key, {
          key,
          groupId: gId,
          groupName: gName,
          groupEmoji: gEmoji,
          totalAmount: 0,
          sessionCount: 0,
          sessions: []
        })
      }

      const sec = map.get(key)!
      sec.totalAmount += sess.totalAmount
      sec.sessionCount += 1
      sec.sessions.push(sess)
    })

    return Array.from(map.values())
  }, [sortedSessions, userGroups])

  // Aggregate Metrics
  const totalSpent = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + s.totalAmount, 0)
  }, [filteredSessions])

  // Copy UPI Helper
  const handleCopyUpi = (upiId?: string) => {
    if (!upiId) return
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  // Helper to trigger browser file download
  // Export PDF report of filtered past sessions matching ChaiSplit template
  const handleDownloadReport = () => {
    if (!isGroupAdmin) {
      alert('Only group admins can download the PDF expense report.')
      return
    }

    if (filteredSessions.length === 0) {
      alert('No sessions found to download for the current filters.')
      return
    }

    // If exactly 1 session is filtered, export that session's exact slip
    if (filteredSessions.length === 1) {
      downloadSingleSessionPdf(filteredSessions[0])
      return
    }

    const selectedGroupName =
      selectedGroupId === 'all'
        ? 'All Groups'
        : userGroups.find(g => g.id === selectedGroupId)?.name || 'Group'

    const uniqueShops = Array.from(new Set(filteredSessions.map(s => s.shopName).filter(Boolean)))
    const shopLabel =
      uniqueShops.length === 1
        ? uniqueShops[0]
        : uniqueShops.length > 0
        ? `${uniqueShops[0]} & others`
        : 'Various Shops'

    const totalSpend = totalSpent

    // Aggregate items and spend per member
    const memberMap = new Map<
      string,
      {
        memberName: string
        itemMap: Map<string, { name: string; quantity: number; price?: number }>
        shareAmount: number
      }
    >()

    filteredSessions.forEach(sess => {
      sess.expenses.forEach(exp => {
        const key = exp.memberId || exp.memberName
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            memberName: exp.memberName,
            itemMap: new Map(),
            shareAmount: 0
          })
        }
        const m = memberMap.get(key)!
        m.shareAmount += exp.total || 0
        exp.items?.forEach(it => {
          const itKey = it.name.trim()
          if (!m.itemMap.has(itKey)) {
            m.itemMap.set(itKey, { name: it.name, quantity: 0, price: it.price })
          }
          const existingIt = m.itemMap.get(itKey)!
          existingIt.quantity += it.quantity || 1
          if (it.price) existingIt.price = it.price
        })
      })
    })

    const members: MemberPdfBreakdown[] = Array.from(memberMap.values()).map(m => {
      const items = Array.from(m.itemMap.values())
      return {
        memberName: m.memberName,
        items,
        totalQty: items.reduce((sum, it) => sum + it.quantity, 0),
        shareAmount: m.shareAmount
      }
    })

    const totalItemsCount = members.reduce((sum, m) => sum + m.totalQty, 0)

    const now = new Date()
    const dateTimeStr = now.toLocaleString([], {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

    const reportTitle = `${selectedGroupName} Tea Break`

    downloadExpensePdf(
      {
        title: reportTitle,
        groupName: selectedGroupName,
        shopName: shopLabel,
        dateTimeStr,
        totalSpend,
        membersCount: members.length,
        totalItemsCount,
        members,
        noteText:
          'Note: The source export contains member totals and item quantities. Unit price and item total are calculated from session records.'
      },
      `ChaiSplit_Expense_Report_${selectedGroupName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timeFilter}.pdf`
    )
  }

  // Export individual session receipt as PDF
  const handleDownloadSessionReceipt = (sess: TeaSession) => {
    downloadSingleSessionPdf(sess)
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-20">
      {/* -------------------- SWITCHING OPTION: PERSONAL EXPENSE VS TEAM EXPENSE -------------------- */}
      <div className="p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer mr-0.5"
                title="Back to Dashboard"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            )}
          </div>
          {isGroupAdmin && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDownloadReport}
                className="text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 px-2.5 py-1 rounded-lg border border-stone-200/80 dark:border-stone-700 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Download PDF Report"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Download PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* 2 Main Switching Options: Personal Expense and Team Expense */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-100 dark:bg-stone-800/90 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 gap-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setSectionView('personal')}
            className={`py-2.5 px-3 rounded-xl font-heading font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              sectionView === 'personal'
                ? 'bg-amber-600 text-white shadow-md scale-[1.01]'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">Personal Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setSectionView('team')}
            className={`py-2.5 px-3 rounded-xl font-heading font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              sectionView === 'team'
                ? 'bg-amber-600 text-white shadow-md scale-[1.01]'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Team Expense</span>
          </button>
        </div>
      </div>

      {/* -------------------- TIME FILTER TABS (Day / Week / Month / Year / Custom) -------------------- */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Time Range:</span>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Group Wise</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-xs'
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Timeline</span>
            </button>
          </div>
        </div>

        {/* Segmented Filter Pills */}
        <div className="grid grid-cols-6 gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl">
          {[
            { id: 'day', label: 'Today' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'year', label: 'Year' },
            { id: 'all', label: 'All' },
            { id: 'custom', label: 'Custom' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeFilter(tab.id as TimeFilter)}
              className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeFilter === tab.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {timeFilter === 'custom' && (
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
              <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
              <span>Select Custom Date Range:</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold mb-0.5 block">
                  From Date:
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-500 dark:text-stone-400 font-semibold mb-0.5 block">
                  To Date:
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="w-full py-1.5 px-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              {[
                { label: 'Last 3 Days', days: 3 },
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const end = new Date()
                    const start = new Date()
                    start.setDate(end.getDate() - preset.days)
                    setCustomEndDate(end.toISOString().slice(0, 10))
                    setCustomStartDate(start.toISOString().slice(0, 10))
                  }}
                  className="px-2 py-1 rounded-md bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-semibold text-stone-700 dark:text-stone-300 hover:border-amber-400 cursor-pointer transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* -------------------- GROUP FILTER & SORT BAR -------------------- */}
      <div className="space-y-2">
        {/* Top Trigger: All Groups button with toggle + Active Group Chip */}
        <div className="flex items-center gap-2">
          {(() => {
            const isAll = selectedGroupId === 'all'
            const currentSelectedGroup = !isAll ? userGroups.find(g => g.id === selectedGroupId) : null

            return (
              <button
                type="button"
                onClick={handleAllGroupsClick}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                  !isAll
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-amber-400'
                }`}
              >
                {isAll ? (
                  <Users className="w-3.5 h-3.5" />
                ) : (
                  <span>{currentSelectedGroup?.shopEmoji || '☕'}</span>
                )}
                <span className="truncate max-w-[180px]">
                  {isAll ? 'All Groups' : (currentSelectedGroup?.name || 'Selected Group')}
                </span>

                {!isAll && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedGroupId('all')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                        setSelectedGroupId('all')
                      }
                    }}
                    className="p-0.5 hover:bg-amber-700 rounded-full cursor-pointer transition-colors"
                    title="Reset to All Groups"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}

                {userGroups.length > 0 && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showOtherGroups ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>
            )
          })()}
        </div>

        {/* When expanded, show all groups UNDER like row wise */}
        {showOtherGroups && (
          <div className="p-2 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-2 py-1 flex items-center justify-between">
              <span>Select a group:</span>
              <button
                type="button"
                onClick={() => setShowOtherGroups(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Row 1: All Groups option */}
            <button
              type="button"
              onClick={() => {
                setSelectedGroupId('all')
                setShowOtherGroups(false)
              }}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                selectedGroupId === 'all'
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-300/80 dark:border-amber-800/80'
                  : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600 shrink-0" />
                <span>All Groups (Combined)</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedGroupId === 'all' && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
              </div>
            </button>

            {/* Individual groups, each in its own row */}
            {userGroups.map(group => {
              const isSelected = selectedGroupId === group.id

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(group.id)
                    setShowOtherGroups(false)
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-300/80 dark:border-amber-800/80'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base shrink-0">{group.shopEmoji || '☕'}</span>
                    <span className="truncate">{group.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Search & Sort Controls Bar */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search history by title, shop, item..."
              className="w-full pl-8 pr-7 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="shrink-0 relative">
            <div className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 text-xs font-semibold">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as SortOrder)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest ₹</option>
                <option value="amount-asc">Lowest ₹</option>
                <option value="items-desc">Most Items</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------- SECTION 1: PERSONAL & MEMBER UNIQUE DATA (1ST PRIORITY) -------------------- */}
      {(sectionView === 'personal' || sectionView === 'both') && (
        <div className="space-y-2 pt-1">
          {/* Header outside the container with shortened wording */}
          <div className="flex items-center justify-between px-1">
            <h4 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5 uppercase tracking-wide">
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
              <span>Break Orders ({personalEatenSummary.breakRecords.length})</span>
            </h4>
            <span className="text-[11px] text-stone-400">
              Receipts
            </span>
          </div>

          {/* Break Orders Card Container */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs">

            {personalEatenSummary.breakRecords.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400 space-y-1">
                <p>No break orders found for you in this period.</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800 space-y-2">
                {personalEatenSummary.breakRecords.map(rec => (
                  <div key={rec.sessionId} className="pt-2 first:pt-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
                          {rec.sessionTitle}
                        </h5>
                        <p className="text-[11px] text-stone-400">
                          {rec.shopName} • {rec.formattedDate}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-heading font-black text-xs text-emerald-700 dark:text-emerald-400">
                          ₹{rec.memberTotal}
                        </span>
                        <p className="text-[10px] text-stone-400">Paid by {rec.payerName}</p>
                      </div>
                    </div>

                    {/* Action row: See Items toggle + Full Bill */}
                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      {rec.items.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleBreakItems(rec.sessionId)}
                          className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-stone-200/60 dark:border-stone-700/60"
                        >
                          <Utensils className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>{expandedBreakItemIds.has(rec.sessionId) ? 'Hide Items' : `See Items (${rec.items.length})`}</span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform duration-200 ${
                              expandedBreakItemIds.has(rec.sessionId) ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 italic">No items listed</span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedSessionForReceipt(rec.rawSession)}
                        className="ml-auto px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 text-[10px] font-bold transition-colors cursor-pointer border border-amber-200/60 dark:border-amber-900/40"
                      >
                        Full Bill 🧾
                      </button>
                    </div>

                    {/* Collapsible eaten items list */}
                    {expandedBreakItemIds.has(rec.sessionId) && rec.items.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1 animate-in fade-in duration-150">
                        {rec.items.map((it, idx) => (
                          <span
                            key={`${it.id || it.name}-${idx}`}
                            className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-700 dark:text-stone-300 font-medium border border-stone-200/60 dark:border-stone-700/60"
                          >
                            {it.emoji || '☕'} {it.name} ×{it.quantity} (₹{(it.price || 0) * (it.quantity || 1)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unique Items Eaten Card (Placed at the bottom, not shown directly, with "See All" button) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <Utensils className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100 uppercase tracking-wide">
                    Unique Items Eaten ({personalEatenSummary.items.length})
                  </h4>
                  <p className="text-[10px] text-stone-400">
                    {personalEatenSummary.totalItemsCount} total items consumed
                  </p>
                </div>
              </div>

              {personalEatenSummary.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowUniqueItems(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>{showUniqueItems ? 'Hide Items' : `See All (${personalEatenSummary.items.length})`}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showUniqueItems ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>

            {personalEatenSummary.items.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400 space-y-1">
                <Coffee className="w-7 h-7 text-stone-300 dark:text-stone-700 mx-auto" />
                <p>No items recorded for you in the selected time range.</p>
              </div>
            ) : showUniqueItems ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                {personalEatenSummary.items.map(it => {
                  const pct =
                    personalEatenSummary.totalItemsCount > 0
                      ? Math.round((it.count / personalEatenSummary.totalItemsCount) * 100)
                      : 0

                  return (
                    <div
                      key={it.name}
                      className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-850 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base">{it.emoji}</span>
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {it.name}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-xs shrink-0">
                          ×{it.count}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                        <span>
                          Total Spent: <strong className="text-stone-800 dark:text-stone-200">₹{it.totalCost}</strong>
                        </span>
                        <span>@ ₹{it.unitPrice} each</span>
                      </div>

                      {/* Popularity bar */}
                      <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* -------------------- SECTION 2: WHOLE TEAM EXPENSE -------------------- */}
      {(sectionView === 'team' || sectionView === 'both') && (
        <div className="space-y-3 pt-2">
          {/* Section 2 Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-black text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Team Expense</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Group break archive, total bills &amp; team receipts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-xs'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Group Wise</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-stone-700 text-amber-600 dark:text-amber-300 shadow-xs'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Timeline</span>
              </button>
            </div>
          </div>

          {/* SESSIONS LISTING (GROUPED OR TIMELINE) */}
          {sortedSessions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 text-stone-400 text-xs space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 mx-auto flex items-center justify-center text-xl">
                ☕
              </div>
              <p className="font-bold text-stone-700 dark:text-stone-300">No Past Sessions Found</p>
              <p className="text-[11px] max-w-xs mx-auto">
                {searchQuery
                  ? `No sessions matching "${searchQuery}". Try adjusting your search or time filter.`
                  : userGroups.length === 0
                  ? 'You are not a member of any tea groups yet. Create or join a group to see tea break history for your team.'
                  : 'No settled tea breaks found for your groups in this time range. Settle an active session to see it archived here!'}
              </p>
            </div>
          ) : viewMode === 'grouped' ? (
            /* GROUP-WISE VIEW */
            <div className="space-y-4">
              {groupWiseSections.map(section => {
                const isExpanded = expandedGroupIds.has(section.key)

                return (
                  <div
                    key={section.key}
                    className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs overflow-hidden"
                  >
                    {/* Group Header Card (Clickable to Expand/Collapse) */}
                    <div
                      onClick={() => toggleGroupExpand(section.key)}
                      className={`p-3.5 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between cursor-pointer select-none hover:bg-stone-100/60 dark:hover:bg-stone-800/70 transition-colors ${
                        isExpanded ? 'border-b border-stone-100 dark:border-stone-800' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{section.groupEmoji}</span>
                        <div className="min-w-0">
                          <h3 className="font-heading font-extrabold text-sm text-stone-900 dark:text-stone-100 truncate">
                            {section.groupName}
                          </h3>
                          <p className="text-[11px] text-stone-400">
                            {section.sessionCount} {section.sessionCount === 1 ? 'break' : 'breaks'} in period
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                          ₹{section.totalAmount}
                        </span>
                        <div className="text-stone-400 p-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Group Sessions Cards - Hidden by default, shown on toggle */}
                    {isExpanded && (
                      <div className="p-3 divide-y divide-stone-100 dark:divide-stone-800/80 space-y-2.5 animate-in fade-in duration-150">
                        {section.sessions.map(sess => (
                          <SessionCard
                            key={sess.id}
                            session={sess}
                            formattedDate={formatFriendlyDate(sess)}
                            onClick={() => setSelectedSessionForReceipt(sess)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            /* TIMELINE VIEW (CHRONOLOGICAL STREAM) */
            <div className="space-y-2.5">
              {sortedSessions.map(sess => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/90 dark:border-stone-800 shadow-2xs hover:border-amber-400 dark:hover:border-amber-500/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedSessionForReceipt(sess)}
                >
                  <SessionCard
                    session={sess}
                    formattedDate={formatFriendlyDate(sess)}
                    showGroupBadge
                    onClick={() => setSelectedSessionForReceipt(sess)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- DIGITAL RECEIPT MODAL -------------------- */}
      {selectedSessionForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[90vh] overflow-y-auto p-5 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-dashed border-stone-200 dark:border-stone-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                    ✓ Settled
                  </span>
                  {selectedSessionForReceipt.groupName && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                      {selectedSessionForReceipt.groupName}
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-black text-base text-stone-900 dark:text-stone-100">
                  {selectedSessionForReceipt.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedSessionForReceipt.shopName}</span>
                </p>
                <p className="text-[11px] text-stone-400">
                  📅 {formatFriendlyDate(selectedSessionForReceipt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSessionForReceipt(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payer Card */}
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider block">
                    Paid in Full By
                  </span>
                  <span className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
                    {selectedSessionForReceipt.payerName}
                  </span>
                  {selectedSessionForReceipt.payerUpi && currentUser && selectedSessionForReceipt.payerId === currentUser.id && (
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono block">
                      {selectedSessionForReceipt.payerUpi}
                    </span>
                  )}
                </div>
              </div>

              {selectedSessionForReceipt.payerUpi && currentUser && selectedSessionForReceipt.payerId === currentUser.id && (
                <button
                  type="button"
                  onClick={() => handleCopyUpi(selectedSessionForReceipt.payerUpi)}
                  className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-600 font-semibold text-xs flex items-center gap-1 hover:border-amber-500 cursor-pointer transition-colors"
                >
                  {copiedUpi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy UPI</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Total Bill Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
              <div>
                <span className="text-xs text-emerald-100/90 font-bold uppercase tracking-wider block">
                  Grand Total Bill
                </span>
                <span className="text-[11px] text-emerald-200/80">
                  {selectedSessionForReceipt.expenses.length} people ordered
                </span>
              </div>
              <span className="font-heading font-black text-2xl">
                ₹{selectedSessionForReceipt.totalAmount}
              </span>
            </div>

            {/* Member Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Member-wise Expenses:</span>
                </h4>
                {selectedSessionForReceipt.expenses.some(e => e.items && e.items.length > 0) && (
                  <button
                    type="button"
                    onClick={toggleAllReceiptMemberItems}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                  >
                    {(() => {
                      const withItems = selectedSessionForReceipt.expenses.filter(e => e.items && e.items.length > 0)
                      const allExpanded = withItems.length > 0 && withItems.every(e => expandedReceiptMemberIds.has(e.memberId))
                      return allExpanded ? 'Hide All Items' : 'See All Items'
                    })()}
                  </button>
                )}
              </div>

              {selectedSessionForReceipt.expenses.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No individual member expenses recorded.</p>
              ) : (
                <div className="rounded-xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
                  {selectedSessionForReceipt.expenses.map(exp => {
                    const hasItems = Boolean(exp.items && exp.items.length > 0)
                    const isExpanded = expandedReceiptMemberIds.has(exp.memberId)

                    return (
                      <div key={exp.memberId} className="p-2.5 space-y-1.5 bg-white dark:bg-stone-900">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {exp.memberAvatar || exp.memberName[0]}
                            </div>
                            <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                              {exp.memberName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasItems && (
                              <button
                                type="button"
                                onClick={() => toggleReceiptMemberItems(exp.memberId)}
                                className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-stone-200/60 dark:border-stone-700/60"
                              >
                                <Utensils className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                <span>{isExpanded ? 'Hide' : `See Items (${exp.items.length})`}</span>
                                <ChevronDown
                                  className={`w-3 h-3 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </button>
                            )}
                            <span className="font-heading font-bold text-xs text-emerald-700 dark:text-emerald-400">
                              ₹{exp.total}
                            </span>
                          </div>
                        </div>

                        {/* Items ordered by this member */}
                        {hasItems && isExpanded && (
                          <div className="flex flex-wrap gap-1 pl-8 pt-0.5 animate-in fade-in duration-150">
                            {exp.items.map((it, idx) => (
                              <span
                                key={`${it.id}-${idx}`}
                                className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-medium border border-stone-200/60 dark:border-stone-700/60"
                              >
                                {it.emoji} {it.name} ×{it.quantity} (₹{it.price * it.quantity})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className={`pt-2 ${SHOW_DOWNLOAD_REPORT ? 'flex items-center gap-2' : ''}`}>
              {SHOW_DOWNLOAD_REPORT && (
                <button
                  type="button"
                  onClick={() => handleDownloadSessionReceipt(selectedSessionForReceipt)}
                  id="download-receipt-modal-btn"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-xs"
                  title="Download text receipt slip"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Receipt</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedSessionForReceipt(null)}
                className={`py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-xs transition-colors cursor-pointer ${
                  SHOW_DOWNLOAD_REPORT ? 'px-4' : 'w-full'
                }`}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: Individual Session Card
// ---------------------------------------------------------------------------
interface SessionCardProps {
  session: TeaSession
  formattedDate: string
  showGroupBadge?: boolean
  onClick: () => void
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  formattedDate,
  showGroupBadge = false,
  onClick
}) => {
  const totalItemCount = session.expenses.reduce(
    (sum, e) => sum + e.items.reduce((s, it) => s + it.quantity, 0),
    0
  )

  return (
    <div
      onClick={onClick}
      className="p-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-850 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:border-amber-600/40 transition-all cursor-pointer space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="font-heading font-extrabold text-xs text-stone-900 dark:text-stone-100 truncate">
              {session.title}
            </h4>
            {showGroupBadge && session.groupName && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {session.groupName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 truncate flex items-center gap-1">
            <span>{session.shopName}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-heading font-black text-xs shrink-0 shadow-2xs">
          ₹{session.totalAmount}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400">
          <CreditCard className="w-3 h-3 text-amber-600" />
          <span>
            Paid by <strong className="text-stone-800 dark:text-stone-200">{session.payerName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
          <Receipt className="w-3 h-3" />
          <span>
            {session.expenses.length} people {totalItemCount > 0 ? `• ${totalItemCount} items` : ''}
          </span>
        </div>
      </div>
    </div>
  )
}
