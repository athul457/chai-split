import {
  ArrowUpDown,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Download,
  Layers,
  Receipt,
  Search,
  Store,
  Users,
  X
} from 'lucide-react'
import React, { useMemo, useState, useEffect } from 'react'
import { useExpense } from '../context/ExpenseContext'
import type { Group, TeaSession, User } from '../types'

type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom'
type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'items-desc'

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
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('date-desc')
  const [selectedGroupId, setSelectedGroupId] = useState<string | 'all'>(initialGroupId || 'all')
  const [viewMode, setViewMode] = useState<'grouped' | 'timeline'>('grouped')
  const [searchQuery, setSearchQuery] = useState('')

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

  // Collapsed state for group sections in "grouped" view
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())

  // Modal: Selected Session for Full Bill Receipt
  const [selectedSessionForReceipt, setSelectedSessionForReceipt] = useState<TeaSession | null>(null)
  const [copiedUpi, setCopiedUpi] = useState(false)

  const toggleGroupCollapse = (grpKey: string) => {
    setCollapsedGroupIds(prev => {
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

  // Aggregate Metrics for Header
  const totalSpent = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + s.totalAmount, 0)
  }, [filteredSessions])

  const totalBreaks = filteredSessions.length

  const avgPerBreak = useMemo(() => {
    if (totalBreaks === 0) return 0
    return Math.round(totalSpent / totalBreaks)
  }, [totalSpent, totalBreaks])

  const topShopName = useMemo(() => {
    if (filteredSessions.length === 0) return 'None'
    const counts: Record<string, number> = {}
    filteredSessions.forEach(s => {
      counts[s.shopName] = (counts[s.shopName] || 0) + 1
    })
    let top = 'None'
    let max = 0
    Object.entries(counts).forEach(([shop, count]) => {
      if (count > max) {
        max = count
        top = shop
      }
    })
    return top
  }, [filteredSessions])

  // Copy UPI Helper
  const handleCopyUpi = (upiId?: string) => {
    if (!upiId) return
    navigator.clipboard.writeText(upiId)
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2000)
  }

  // Helper to trigger browser file download
  const triggerDownload = (filename: string, content: string, mimeType = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export full CSV report of filtered past sessions
  const handleDownloadReport = () => {
    if (filteredSessions.length === 0) {
      alert('No sessions found to download for the current filters.')
      return
    }

    const headers = [
      'Date & Time',
      'Session Title',
      'Group Name',
      'Shop Name',
      'Paid In Full By',
      'Payer UPI',
      'Total Amount (INR)',
      'Members Count',
      'Total Items Count',
      'Member-wise Breakdown & Items'
    ]

    const rows = filteredSessions.map(sess => {
      const sDate = getSessionDate(sess)
      const dateFormatted = !isNaN(sDate.getTime()) && sDate.getTime() !== 0
        ? sDate.toLocaleString([], { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : sess.createdAt || 'Settled'

      const itemsCount = sess.expenses.reduce((sum, e) => sum + e.items.reduce((s, it) => s + it.quantity, 0), 0)

      const breakdown = sess.expenses.map(e => {
        const itemsStr = e.items.map(it => `${it.name} x${it.quantity}`).join(', ')
        return `${e.memberName}: ${itemsStr || 'No items'} (Rs.${e.total})`
      }).join('; ')

      return [
        `"${dateFormatted.replace(/"/g, '""')}"`,
        `"${(sess.title || '').replace(/"/g, '""')}"`,
        `"${(sess.groupName || 'Direct / Walk-in').replace(/"/g, '""')}"`,
        `"${(sess.shopName || '').replace(/"/g, '""')}"`,
        `"${(sess.payerName || '').replace(/"/g, '""')}"`,
        `"${(sess.payerUpi || '').replace(/"/g, '""')}"`,
        sess.totalAmount,
        sess.expenses.length,
        itemsCount,
        `"${breakdown.replace(/"/g, '""')}"`
      ].join(',')
    })

    const summaryRow = [
      '"TOTAL SUMMARY"',
      '""',
      '""',
      '""',
      '""',
      '""',
      totalSpent,
      '""',
      '""',
      '""'
    ].join(',')

    const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n')
    const timestamp = new Date().toISOString().slice(0, 10)
    const groupLabel = selectedGroupId === 'all'
      ? 'All_Groups'
      : (userGroups.find(g => g.id === selectedGroupId)?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Group')
    const filename = `ChaiSplit_Expense_Report_${groupLabel}_${timeFilter}_${timestamp}.csv`

    triggerDownload(filename, csvContent, 'text/csv;charset=utf-8;')
  }

  // Export individual session receipt
  const handleDownloadSessionReceipt = (sess: TeaSession) => {
    const sDate = getSessionDate(sess)
    const dateFormatted = !isNaN(sDate.getTime()) && sDate.getTime() !== 0
      ? sDate.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : sess.createdAt || 'Settled'

    const lines = [
      `========================================`,
      `           CHAI-SPLIT RECEIPT           `,
      `========================================`,
      `Session:     ${sess.title}`,
      `Group:       ${sess.groupName || 'Direct / Walk-in'}`,
      `Shop:        ${sess.shopName}`,
      `Date & Time: ${dateFormatted}`,
      `Paid By:     ${sess.payerName}${sess.payerUpi ? ` (${sess.payerUpi})` : ''}`,
      `Status:      Settled`,
      `----------------------------------------`,
      `MEMBER-WISE BREAKDOWN:`,
      `----------------------------------------`
    ]

    sess.expenses.forEach(e => {
      lines.push(`• ${e.memberName} — ₹${e.total}`)
      if (e.items && e.items.length > 0) {
        e.items.forEach(it => {
          lines.push(`    - ${it.name} x${it.quantity} @ ₹${it.price} = ₹${it.price * it.quantity}`)
        })
      }
    })

    lines.push(`----------------------------------------`)
    lines.push(`GRAND TOTAL: ₹${sess.totalAmount}`)
    lines.push(`========================================`)
    lines.push(`Generated via Nibru-Tea ChaiSplit`)

    const textContent = lines.join('\n')
    const cleanTitle = sess.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `Receipt_${cleanTitle}_${sess.id}.txt`
    triggerDownload(filename, textContent, 'text/plain;charset=utf-8;')
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

  return (
    <div className="space-y-4 animate-in fade-in duration-200 pb-20">
      {/* -------------------- HEADER & KPI SUMMARY -------------------- */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-xl space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer mr-1"
                >
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
              )}
              <h2 className="font-heading font-black text-lg flex items-center gap-2">
                <span>Chai &amp; Bills History</span>
                <span className="text-xl">🧾</span>
              </h2>
            </div>
            <p className="text-amber-100/80 text-xs">
              Archive of all past tea breaks &amp; payments
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {SHOW_DOWNLOAD_REPORT && (
              <button
                type="button"
                onClick={handleDownloadReport}
                id="download-history-report-btn"
                className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all border border-white/25"
                title="Download CSV report for current filtered view"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report</span>
              </button>
            )}
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-extrabold text-xs shadow-inner shrink-0">
              ₹{totalSpent} Total
            </span>
          </div>
        </div>

        {/* KPI 4-Card Summary Bar */}
        <div className="grid grid-cols-4 gap-2 pt-1 relative z-10">
          <div className="p-2.5 rounded-2xl bg-black/15 backdrop-blur-xs text-center border border-white/10 space-y-0.5">
            <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Total</span>
            <p className="font-heading font-black text-sm truncate">₹{totalSpent}</p>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/15 backdrop-blur-xs text-center border border-white/10 space-y-0.5">
            <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Breaks</span>
            <p className="font-heading font-black text-sm">{totalBreaks}</p>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/15 backdrop-blur-xs text-center border border-white/10 space-y-0.5">
            <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Avg/Break</span>
            <p className="font-heading font-black text-sm truncate">₹{avgPerBreak}</p>
          </div>

          <div className="p-2.5 rounded-2xl bg-black/15 backdrop-blur-xs text-center border border-white/10 space-y-0.5">
            <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider">Top Shop</span>
            <p className="font-heading font-bold text-xs truncate" title={topShopName}>
              {topShopName}
            </p>
          </div>
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
            { id: 'day', label: 'Day' },
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
        {/* Group Selector Horizontal Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedGroupId('all')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0 ${
              selectedGroupId === 'all'
                ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-amber-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Groups</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedGroupId === 'all'
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
              }`}
            >
              {userSessions.length}
            </span>
          </button>

          {userGroups.map(group => {
            const isSelected = selectedGroupId === group.id
            const grpCount = userSessions.filter(
              s => s.groupId === group.id || (s.groupName && s.groupName.toLowerCase() === group.name.toLowerCase())
            ).length

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                  isSelected
                    ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-amber-400'
                }`}
              >
                <span>{group.shopEmoji || '👥'}</span>
                <span>{group.name}</span>
                {grpCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-amber-700 text-amber-100'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                    }`}
                  >
                    {grpCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

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

      {/* -------------------- SESSIONS LISTING (GROUPED OR TIMELINE) -------------------- */}
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
            const isCollapsed = collapsedGroupIds.has(section.key)

            return (
              <div
                key={section.key}
                className="rounded-2xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs overflow-hidden"
              >
                {/* Group Header Card (Clickable to Collapse/Expand) */}
                <div
                  onClick={() => toggleGroupCollapse(section.key)}
                  className="p-3.5 bg-stone-50/70 dark:bg-stone-800/40 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between cursor-pointer select-none hover:bg-stone-100/60 dark:hover:bg-stone-800/70 transition-colors"
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
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Group Sessions Cards */}
                {!isCollapsed && (
                  <div className="p-3 divide-y divide-stone-100 dark:divide-stone-800/80 space-y-2.5">
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
                  {selectedSessionForReceipt.payerUpi && (
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono block">
                      {selectedSessionForReceipt.payerUpi}
                    </span>
                  )}
                </div>
              </div>

              {selectedSessionForReceipt.payerUpi && (
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
              <h4 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100 flex items-center gap-1.5 uppercase tracking-wide">
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>Member-wise Expenses:</span>
              </h4>

              {selectedSessionForReceipt.expenses.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No individual member expenses recorded.</p>
              ) : (
                <div className="rounded-xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
                  {selectedSessionForReceipt.expenses.map(exp => (
                    <div key={exp.memberId} className="p-2.5 space-y-1 bg-white dark:bg-stone-900">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-[10px] flex items-center justify-center">
                            {exp.memberAvatar || exp.memberName[0]}
                          </div>
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                            {exp.memberName}
                          </span>
                        </div>
                        <span className="font-heading font-bold text-xs text-emerald-700 dark:text-emerald-400">
                          ₹{exp.total}
                        </span>
                      </div>

                      {/* Items ordered by this member */}
                      {exp.items && exp.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 pl-8">
                          {exp.items.map((it, idx) => (
                            <span
                              key={`${it.id}-${idx}`}
                              className="px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-600 dark:text-stone-400 font-medium"
                            >
                              {it.emoji} {it.name} ×{it.quantity} (₹{it.price * it.quantity})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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
            <span>📍 {session.shopName}</span>
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
