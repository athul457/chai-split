import React, { useState, useEffect, useMemo } from 'react'
import {
  Coffee,
  Plus,
  CheckCircle2,
  Clock,
  Copy,
  X,
  Users,
  Trash2,
  KeyRound,
  Search,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { BottomNav } from '../components/BottomNav'
import { GroupDetailsPage } from './GroupDetailsPage'
import { TeaBreakPage } from './TeaBreakPage'
import { HistoryPage } from './HistoryPage'
import { DEFAULT_SHOPS } from '../lib/mockData'
import { supabase } from '../lib/supabase'
import { GroupCardSkeleton } from '../components/ChaiSkeleton'
import type { PageRoute, BottomTab, Shop, MenuItem, Group, User } from '../types'
import { getUserCode } from '../utils/userCode'
import { getGroupIconConfig } from '../utils/itemIcons'

interface DashboardProps {
  onNavigate?: (page: PageRoute) => void
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const { user, allUsers } = useAuth()
  const {
    activeSession,
    getActiveSessionForGroup,
    pastSessions,
    confirmMemberOrder,
    addCustomMenuItem,
    addNewSession
  } = useExpense()

  // Navigation tab state (Home is the default home tab)
  const [activeTab, setActiveTab] = useState<BottomTab>('home')

  // Search filter for groups
  const [groupSearchQuery, setGroupSearchQuery] = useState('')

  // Modals & form state
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [customItemName, setCustomItemName] = useState('')
  const [customItemPrice, setCustomItemPrice] = useState('20')
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  // Create Group form states (Group Name + Shop Name)
  const [newGroupShopName, setNewGroupShopName] = useState('')
  const [includeStarterMenu, setIncludeStarterMenu] = useState(true)

  // Delete Group Confirmation Modal states (Strictly Admin only with typed confirmation)
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null)
  const [deleteConfirmNameInput, setDeleteConfirmNameInput] = useState('')
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [showCannotSettleModal, setShowCannotSettleModal] = useState(false)
  const [showUnconfirmedModal, setShowUnconfirmedModal] = useState(false)


  // Groups tab state - Strictly isolated per logged-in user
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      if (!user) return []
      const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
      if (!saved) return []
      const parsed: Group[] = JSON.parse(saved)
      return parsed
        .filter(g =>
          g.adminId === user.id || g.members?.some(m =>
            m.id === user.id ||
            (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
            (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
          )
        )
        .map(g => ({
          ...g,
          code: g.code || g.id || `TEA-${Math.floor(1000 + Math.random() * 9000)}`
        }))
    } catch {
      return []
    }
  })

  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    if (!user) return null
    return localStorage.getItem(`chaisplit_active_group_user_${user.id}`) || null
  })

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false)
  const [joinGroupIdInput, setJoinGroupIdInput] = useState('')
  const [joinGroupError, setJoinGroupError] = useState<string | null>(null)
  const activeGroup = groups.find(g => g.id === activeGroupId) || (groups.length > 0 ? groups[0] : null)
  const [viewingGroupId, setViewingGroupId] = useState<string | null>(null)
  const viewingGroup = viewingGroupId ? groups.find(g => g.id === viewingGroupId) || null : null
  const [viewingBreakGroupId, setViewingBreakGroupId] = useState<string | null>(null)
  const viewingBreakGroup = viewingBreakGroupId ? (groups.find(g => g.id === viewingBreakGroupId) || null) : null
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)

  // Filtered groups based on Home search input
  const filteredGroups = useMemo(() => {
    const query = groupSearchQuery.trim().toLowerCase()
    if (!query) return groups
    return groups.filter(g =>
      g.name.toLowerCase().includes(query) ||
      (g.code && g.code.toLowerCase().includes(query)) ||
      (g.shopName && g.shopName.toLowerCase().includes(query)) ||
      (g.department && g.department.toLowerCase().includes(query))
    )
  }, [groups, groupSearchQuery])

  // User balance summary (You Owe vs Owes you) matching Splitty Screen 1
  const { youOweAmount, owesYouAmount } = useMemo(() => {
    let owe = 0
    let owed = 0
    if (!user) return { youOweAmount: '0.00', owesYouAmount: '0.00' }

    groups.forEach(g => {
      const s = getActiveSessionForGroup(g.id)
      if (s && s.status === 'active') {
        const myExp = s.expenses?.find(m => m.memberId === user.id)
        const myTotal = myExp?.items?.reduce((sum: number, it) => sum + (it.price * it.quantity), 0) || 0
        if (s.payerId === user.id) {
          const othersTotal = Math.max(0, (s.totalAmount || 0) - myTotal)
          owed += othersTotal
        } else {
          owe += myTotal
        }
      }
    })

    return {
      youOweAmount: owe > 0 ? owe.toFixed(2) : '0.00',
      owesYouAmount: owed > 0 ? owed.toFixed(2) : '0.00'
    }
  }, [groups, user, getActiveSessionForGroup])

  // Re-sync groups state when logged-in user changes (or upon initial login/logout)
  useEffect(() => {
    if (!user) {
      setGroups([])
      setActiveGroupId(null)
      return
    }
    try {
      const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
      if (saved) {
        const parsed: Group[] = JSON.parse(saved)
        const userGroups = parsed.filter(g =>
          g.adminId === user.id || g.members?.some(m =>
            m.id === user.id ||
            (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
            (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
          )
        )
        setGroups(userGroups)
        const savedActive = localStorage.getItem(`chaisplit_active_group_user_${user.id}`)
        if (savedActive && userGroups.some(g => g.id === savedActive)) {
          setActiveGroupId(savedActive)
        } else if (userGroups.length > 0) {
          setActiveGroupId(userGroups[0].id)
        } else {
          setActiveGroupId(null)
        }
      } else {
        setGroups([])
        setActiveGroupId(null)
      }
    } catch {
      setGroups([])
      setActiveGroupId(null)
    }
  }, [user?.id, user?.userCode, user?.email])

  // Save groups scoped strictly to current user ID
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`chaisplit_groups_user_${user.id}`, JSON.stringify(groups))
    }
  }, [groups, user?.id])

  // Save active group id scoped strictly to current user ID
  useEffect(() => {
    if (user?.id && activeGroupId) {
      localStorage.setItem(`chaisplit_active_group_user_${user.id}`, activeGroupId)
    } else if (user?.id && !activeGroupId) {
      localStorage.removeItem(`chaisplit_active_group_user_${user.id}`)
    }
  }, [activeGroupId, user?.id])

  // Fetch real groups from Supabase - STRICT SECURITY: User sees ONLY groups they created or were invited to!
  useEffect(() => {
    if (!supabase || !user) {
      if (!user) setGroups([])
      setIsLoadingGroups(false)
      return
    }
    const client = supabase
    const loadGroups = async () => {
      try {
        const { data: allGroupsData, error } = await client.from('groups').select('*')
        let groupMemberRows: any[] = []
        try {
          const { data: gm } = await client.from('group_members').select('*')
          if (gm) groupMemberRows = gm
        } catch {}

        if (!error && allGroupsData) {
          // SECURITY FILTER: User is group admin OR explicitly listed in group_members table
          const myGroupsData = allGroupsData.filter((g: any) => {
            const isAdmin = Boolean(
              g.admin_id === user.id ||
              (user.userCode && (g.admin_id === user.userCode || g.admin_id === `user-${user.userCode.toLowerCase()}`)) ||
              (user.email && allUsers.some(u => (u.id === g.admin_id || u.userCode === g.admin_id) && u.email.toLowerCase() === user.email.toLowerCase()))
            )

            const isMember = groupMemberRows.some(r => {
              if (r.group_id !== g.id) return false
              if (r.user_id === user.id) return true
              if (user.userCode && (r.user_id === user.userCode || r.user_id === `user-${user.userCode.toLowerCase()}`)) return true
              if (user.email && allUsers.some(u => (u.id === r.user_id || u.userCode === r.user_id) && u.email.toLowerCase() === user.email.toLowerCase())) return true
              return false
            })

            return isAdmin || isMember
          })

          const mappedGroups: Group[] = myGroupsData.map((g: any) => {
            const adminUser = allUsers.find(u => u.id === g.admin_id || u.userCode === g.admin_id) || (g.admin_id === user.id ? user : null)
            const gmUsers: User[] = groupMemberRows
              .filter(r => r.group_id === g.id)
              .map(r => allUsers.find(u => u.id === r.user_id || u.userCode === r.user_id) || (r.user_id === user.id ? user : null))
              .filter((u): u is User => Boolean(u))

            const memberMap = new Map<string, User>()
            if (adminUser) memberMap.set(adminUser.id, adminUser)
            gmUsers.forEach(m => memberMap.set(m.id, m))

            return {
              id: g.id,
              name: g.name,
              code: g.code || g.id || `TEA-${Math.floor(1000 + Math.random() * 9000)}`,
              department: g.department || 'Office',
              adminId: g.admin_id,
              payerId: g.payer_id || g.payerId,
              payerName: g.payer_name || g.payerName,
              shopId: g.shop_id,
              shopName: g.shop_name,
              shopEmoji: g.shop_emoji || '☕',
              members: Array.from(memberMap.values()),
              createdDate: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : 'Today'
            }
          })

          // Merge with locally stored groups for this user ONLY if user is actually member/admin of them
          let localGroups: Group[] = []
          try {
            const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
            if (saved) localGroups = JSON.parse(saved)
          } catch {}

          const groupMap = new Map<string, Group>()
          localGroups.forEach(lg => {
            const isMemberOrAdmin = lg.adminId === user.id || lg.members?.some(m =>
              m.id === user.id ||
              (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
            )
            if (isMemberOrAdmin) {
              groupMap.set(lg.id, lg)
            }
          })
          mappedGroups.forEach(mg => groupMap.set(mg.id, mg))

          // Filter strictly: NEVER show a group to a user who is not part of the group
          const finalGroups = Array.from(groupMap.values()).filter(g =>
            g.adminId === user.id || g.members?.some(m =>
              m.id === user.id ||
              (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
            )
          )

          setGroups(finalGroups)
          if (finalGroups.length > 0) {
            setActiveGroupId(prev => {
              if (prev && finalGroups.some(g => g.id === prev)) return prev
              return finalGroups[0].id
            })
          } else {
            setActiveGroupId(null)
          }
        }
      } catch (err) {
        console.warn('Failed to load groups from Supabase:', err)
      } finally {
        setIsLoadingGroups(false)
      }
    }
    loadGroups()
  }, [allUsers, user?.id, user?.userCode, user?.email])

  // Fetch real shops from Supabase
  useEffect(() => {
    if (!supabase) {
      return
    }
    const client = supabase
    const loadShops = async () => {
      try {
        const { data, error } = await client.from('shops').select('*')
        if (!error && data) {
          if (data.length > 0) {
            const mapped: Shop[] = data.map((s: any) => ({
              id: s.id,
              name: s.name,
              location: s.location || '',
              specialty: s.specialty || '',
              rating: Number(s.rating) || 4.5,
              emoji: s.emoji || '☕'
            }))
            setShops(mapped)
            localStorage.setItem('chaisplit_shops_initialized', 'true')
          } else {
            const isInitialized = localStorage.getItem('chaisplit_shops_initialized')
            if (!isInitialized) {
              // Auto-seed default shops into Supabase shops table only on very first launch
              localStorage.setItem('chaisplit_shops_initialized', 'true')
              const seedShops = DEFAULT_SHOPS.map(s => ({
                id: s.id,
                name: s.name,
                location: s.location,
                specialty: s.specialty,
                rating: s.rating,
                emoji: s.emoji
              }))
              client.from('shops').upsert(seedShops).then(({ error: upsertErr }) => {
                if (!upsertErr) setShops(DEFAULT_SHOPS)
              }, (e: any) => console.warn(e))
            } else {
              setShops([])
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load shops from Supabase:', err)
      }
    }
    loadShops()
  }, [])

  // Realtime subscription for shops, groups, and group_members
  useEffect(() => {
    if (!supabase || !user) return
    const client = supabase

    const refreshGroups = async () => {
      try {
        const { data: allGroupsData } = await client.from('groups').select('*')
        let groupMemberRows: any[] = []
        try {
          const { data: gm } = await client.from('group_members').select('*')
          if (gm) groupMemberRows = gm
        } catch {}

        if (allGroupsData) {
          const myGroupsData = allGroupsData.filter((g: any) => {
            const isAdmin = Boolean(
              g.admin_id === user.id ||
              (user.userCode && (g.admin_id === user.userCode || g.admin_id === `user-${user.userCode.toLowerCase()}`)) ||
              (user.email && allUsers.some(u => (u.id === g.admin_id || u.userCode === g.admin_id) && u.email.toLowerCase() === user.email.toLowerCase()))
            )

            const isMember = groupMemberRows.some(r => {
              if (r.group_id !== g.id) return false
              if (r.user_id === user.id) return true
              if (user.userCode && (r.user_id === user.userCode || r.user_id === `user-${user.userCode.toLowerCase()}`)) return true
              if (user.email && allUsers.some(u => (u.id === r.user_id || u.userCode === r.user_id) && u.email.toLowerCase() === user.email.toLowerCase())) return true
              return false
            })

            return isAdmin || isMember
          })

          const mappedGroups: Group[] = myGroupsData.map((g: any) => {
            const adminUser = allUsers.find(u => u.id === g.admin_id || u.userCode === g.admin_id) || (g.admin_id === user.id ? user : null)
            const gmUsers: User[] = groupMemberRows
              .filter(r => r.group_id === g.id)
              .map(r => allUsers.find(u => u.id === r.user_id || u.userCode === r.user_id) || (r.user_id === user.id ? user : null))
              .filter((u): u is User => Boolean(u))

            const memberMap = new Map<string, User>()
            if (adminUser) memberMap.set(adminUser.id, adminUser)
            gmUsers.forEach(m => memberMap.set(m.id, m))

            return {
              id: g.id,
              name: g.name,
              code: g.code || g.id || `TEA-${Math.floor(1000 + Math.random() * 9000)}`,
              department: g.department || 'Office',
              adminId: g.admin_id,
              shopId: g.shop_id,
              shopName: g.shop_name,
              shopEmoji: g.shop_emoji || '☕',
              members: Array.from(memberMap.values()),
              createdDate: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : 'Today'
            }
          })

          // Merge with locally stored groups for this user ONLY if user is actually member/admin of them
          let localGroups: Group[] = []
          try {
            const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
            if (saved) localGroups = JSON.parse(saved)
          } catch {}

          const groupMap = new Map<string, Group>()
          localGroups.forEach(lg => {
            const isMemberOrAdmin = lg.adminId === user.id || lg.members?.some(m =>
              m.id === user.id ||
              (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
            )
            if (isMemberOrAdmin) {
              groupMap.set(lg.id, lg)
            }
          })
          mappedGroups.forEach(mg => groupMap.set(mg.id, mg))

          // Filter strictly: NEVER show a group to a user who is not part of the group
          const finalGroups = Array.from(groupMap.values()).filter(g =>
            g.adminId === user.id || g.members?.some(m =>
              m.id === user.id ||
              (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
            )
          )

          setGroups(finalGroups)
          if (finalGroups.length > 0) {
            setActiveGroupId(prev => {
              if (prev && finalGroups.some(g => g.id === prev)) return prev
              return finalGroups[0].id
            })
          } else {
            setActiveGroupId(null)
          }
        }
      } catch (err) {
        console.warn('Realtime group refresh error:', err)
      }
    }

    const channel = client
      .channel('realtime_shops_and_groups', {
        config: { broadcast: { self: false } }
      })
      .on('broadcast', { event: 'GROUP_UPDATED' }, ({ payload }) => {
        if (payload?.group && user) {
          const group: Group = payload.group
          const isUserInGroup = Boolean(
            group.adminId === user.id ||
            group.members?.some(m =>
              m.id === user.id ||
              (m.userCode && user.userCode && m.userCode.toUpperCase() === user.userCode.toUpperCase()) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase())
            )
          )

          setGroups(prev => {
            if (isUserInGroup) {
              const exists = prev.some(g => g.id === group.id)
              if (exists) {
                return prev.map(g => g.id === group.id ? group : g)
              }
              return [group, ...prev]
            } else {
              // Strictly remove the group if current user is not in it!
              return prev.filter(g => g.id !== group.id)
            }
          })
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, async () => {
        const { data } = await client.from('shops').select('*')
        if (data) {
          setShops(data.map((s: any) => ({
            id: s.id,
            name: s.name,
            location: s.location || '',
            specialty: s.specialty || '',
            rating: Number(s.rating) || 4.5,
            emoji: s.emoji || '☕'
          })))
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
        refreshGroups()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
        refreshGroups()
      })
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [allUsers, user?.id])

  // Shops tab state
  const [shops, setShops] = useState<Shop[]>(() => {
    try {
      const saved = localStorage.getItem('chaisplit_shops_list_v2')
      if (saved !== null) return JSON.parse(saved)
      return DEFAULT_SHOPS
    } catch {
      return DEFAULT_SHOPS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('chaisplit_shops_list_v2', JSON.stringify(shops))
    } catch (e) {
      console.error('Failed to save shops', e)
    }
  }, [shops])

  const [customItemCategory, setCustomItemCategory] = useState<MenuItem['category']>('snacks')

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopyNotice(`Copied ${label} to clipboard!`)
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Handle quick start break for a group
  const handleStartBreakForGroup = (targetGroup: Group) => {
    const existing = getActiveSessionForGroup(targetGroup.id)
    if (existing && existing.status === 'active') {
      setViewingBreakGroupId(targetGroup.id)
      return
    }

    const title = `${targetGroup.name} Tea Break`
    const success = addNewSession(
      title,
      targetGroup.shopName || 'Chayakkada',
      targetGroup.members,
      targetGroup.id,
      targetGroup.name,
      targetGroup.payerId || user?.id,
      targetGroup.shopId,
      user?.id,
      user?.name
    )

    if (success) {
      setViewingBreakGroupId(targetGroup.id)
    } else {
      setShowCannotSettleModal(true)
    }
  }



  // Handle add custom item
  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItemName.trim()) return
    const priceNum = Math.max(0, Math.round(parseFloat(customItemPrice) || 15))
    const targetShopId = activeSession?.shopId || 'shop-chayakkada'
    const targetShopName = activeSession?.shopName || 'shop'
    addCustomMenuItem(customItemName.trim(), priceNum, '', customItemCategory, targetShopId)
    setShowAddItemModal(false)
    setCopyNotice(`Added "${customItemName.trim()}" (₹${priceNum}) to ${targetShopName}!`)
    setTimeout(() => setCopyNotice(null), 3000)
    setCustomItemName('')
    setCustomItemPrice('20')
  }

  // Handle create new group with dedicated Shop Name & Starter Menu
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !user) return

    const generatedGroupId = `GRP-${Math.floor(1000 + Math.random() * 9000)}`
    const shopName = newGroupShopName.trim() || `${newGroupName.trim()} Tapri`
    const newShopId = `shop-${Date.now()}`

    const newShop: Shop = {
      id: newShopId,
      name: shopName,
      location: 'Local Tapri',
      specialty: 'Chai & Snacks',
      rating: 4.8,
      emoji: ''
    }

    const starterItems: MenuItem[] = includeStarterMenu
      ? [
          { id: `${newShopId}-1`, name: 'Chaya', price: 12, category: 'tea', emoji: '', shopId: newShopId, description: 'Hot naadan chaya' },
          { id: `${newShopId}-2`, name: 'Coffee', price: 12, category: 'coffee', emoji: '', shopId: newShopId, description: 'Hot filter coffee' },
          { id: `${newShopId}-3`, name: 'Samoza', price: 12, category: 'snacks', emoji: '', shopId: newShopId, description: 'Crispy hot samoza' },
          { id: `${newShopId}-4`, name: 'Omlette', price: 20, category: 'snacks', emoji: '', shopId: newShopId, description: 'Fresh double egg omlette' },
          { id: `${newShopId}-5`, name: 'Dosha', price: 12, category: 'snacks', emoji: '', shopId: newShopId, description: 'Hot crisp dosha' },
          { id: `${newShopId}-6`, name: 'Porotta', price: 12, category: 'snacks', emoji: '', shopId: newShopId, description: 'Kerala layered porotta' },
          { id: `${newShopId}-7`, name: 'Puzhungiya Motta', price: 10, category: 'snacks', emoji: '', shopId: newShopId, description: 'Boiled egg' },
          { id: `${newShopId}-8`, name: "Bull's Eye", price: 10, category: 'snacks', emoji: '', shopId: newShopId, description: 'Half-boiled egg bullseye' },
          { id: `${newShopId}-9`, name: 'Puffs', price: 20, category: 'snacks', emoji: '', shopId: newShopId, description: 'Crispy puff' },
          { id: `${newShopId}-10`, name: 'Parippvada', price: 10, category: 'snacks', emoji: '', shopId: newShopId, description: 'Crunchy parippuvada' }
        ]
      : []

    const createdGroup: Group = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      code: generatedGroupId,
      department: 'Office',
      adminId: user.id,
      shopId: newShopId,
      shopName: shopName,
      shopEmoji: '',
      members: [user],
      createdDate: new Date().toISOString().split('T')[0]
    }

    // 1. Update React state immediately
    setShops(prev => [newShop, ...prev.filter(s => s.id !== newShop.id)])
    setGroups(prev => [createdGroup, ...prev.filter(g => g.id !== createdGroup.id)])
    setActiveGroupId(createdGroup.id)
    setViewingGroupId(createdGroup.id)
    setShowCreateGroupModal(false)
    setNewGroupName('')
    setNewGroupShopName('')

    // Also populate starter items into expense context immediately
    starterItems.forEach(item => {
      addCustomMenuItem(item.name, item.price, item.emoji, item.category, newShopId)
    })

    // 2. Persist to user-scoped localStorage immediately so refresh can NEVER lose it
    try {
      const current = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
      const parsed: Group[] = current ? JSON.parse(current) : []
      const updated = [createdGroup, ...parsed.filter(g => g.id !== createdGroup.id)]
      localStorage.setItem(`chaisplit_groups_user_${user.id}`, JSON.stringify(updated))
    } catch {}

    // 3. Persist to global registry for code join fallback
    try {
      const saved = localStorage.getItem('chaisplit_all_registered_groups')
      const all: Group[] = saved ? JSON.parse(saved) : []
      localStorage.setItem('chaisplit_all_registered_groups', JSON.stringify([createdGroup, ...all.filter(g => g.id !== createdGroup.id)]))
    } catch {}

    setCopyNotice(`Created group "${createdGroup.name}" with shop "${shopName}"! 🎉`)
    setTimeout(() => setCopyNotice(null), 3000)

    // 4. Persist to Supabase
    if (supabase) {
      const client = supabase
      try {
        // Guarantee user profile exists so admin_id foreign key constraint succeeds
        await client.from('profiles').upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || user.name.slice(0, 2).toUpperCase() || 'U',
          team_name: user.teamName || 'Team',
          user_code: user.userCode,
          upi_id: user.upiId
        }, { onConflict: 'id' })

        // Insert shop row
        await client.from('shops').upsert({
          id: newShop.id,
          name: newShop.name,
          location: newShop.location,
          specialty: newShop.specialty,
          rating: newShop.rating,
          emoji: newShop.emoji
        })

        // Insert starter items if any
        if (starterItems.length > 0) {
          const dbItems = starterItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            category: item.category,
            emoji: item.emoji,
            description: item.description,
            shop_id: newShopId
          }))
          await client.from('menu_items').upsert(dbItems)
        }

        // Insert group row
        const { error: groupErr } = await client.from('groups').insert({
          id: createdGroup.id,
          name: createdGroup.name,
          code: createdGroup.code,
          department: createdGroup.department,
          admin_id: user.id,
          shop_id: newShopId,
          shop_name: createdGroup.shopName,
          shop_emoji: createdGroup.shopEmoji
        })

        if (groupErr) {
          console.error('Failed to insert group in Supabase:', groupErr)
        }

        // Insert creator into group_members
        const { error: memberErr } = await client.from('group_members').upsert({
          group_id: createdGroup.id,
          user_id: user.id
        }, { onConflict: 'group_id,user_id' })

        if (memberErr) {
          console.error('Failed to insert group_member in Supabase:', memberErr)
        }

        // Broadcast to Realtime peers
        client.channel('realtime_shops_and_groups').send({
          type: 'broadcast',
          event: 'GROUP_UPDATED',
          payload: { group: createdGroup }
        }).catch(() => {})
      } catch (err) {
        console.error('Supabase group creation error:', err)
      }
    }
  }

  // Handle join group with Group ID
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanId = joinGroupIdInput.trim().toUpperCase()
    if (!cleanId || !user) return

    // 1. Check if already in user's groups
    const alreadyJoined = groups.find(
      g => g.code.toUpperCase() === cleanId || g.id.toUpperCase() === cleanId
    )
    if (alreadyJoined) {
      setActiveGroupId(alreadyJoined.id)
      setShowJoinGroupModal(false)
      setJoinGroupIdInput('')
      setJoinGroupError(null)
      setCopyNotice(`You are already in "${alreadyJoined.name}"!`)
      setTimeout(() => setCopyNotice(null), 3000)
      return
    }

    setJoinGroupError(null)

    // 2. Query Supabase groups table by code OR id
    if (supabase) {
      try {
        const client = supabase
        const { data: foundGroup, error } = await client
          .from('groups')
          .select('*')
          .or(`code.ilike.${cleanId},id.eq.${cleanId}`)
          .maybeSingle()

        if (error) {
          setJoinGroupError('Error searching for group. Please try again.')
          return
        }

        if (foundGroup) {
          // Add user to group_members in Supabase
          await client.from('group_members').upsert({
            group_id: foundGroup.id,
            user_id: user.id
          }, { onConflict: 'group_id,user_id' })

          // Fetch all group members for this group
          let gmRows: any[] = []
          try {
            const { data: gm } = await client.from('group_members').select('*').eq('group_id', foundGroup.id)
            if (gm) gmRows = gm
          } catch {}

          const adminUser = allUsers.find(u => u.id === foundGroup.admin_id) || (foundGroup.admin_id === user.id ? user : null)
          const gmUsers: User[] = gmRows
            .map(r => allUsers.find(u => u.id === r.user_id) || (r.user_id === user.id ? user : null))
            .filter((u): u is User => Boolean(u))

          const memberMap = new Map<string, User>()
          if (adminUser) memberMap.set(adminUser.id, adminUser)
          gmUsers.forEach(m => memberMap.set(m.id, m))
          memberMap.set(user.id, user)

          const groupToAdd: Group = {
            id: foundGroup.id,
            name: foundGroup.name,
            code: foundGroup.code,
            department: foundGroup.department || 'Office',
            adminId: foundGroup.admin_id,
            shopId: foundGroup.shop_id,
            shopName: foundGroup.shop_name,
            shopEmoji: foundGroup.shop_emoji || '☕',
            members: Array.from(memberMap.values()),
            createdDate: foundGroup.created_at ? new Date(foundGroup.created_at).toISOString().split('T')[0] : 'Today'
          }

          setGroups(prev => [groupToAdd, ...prev.filter(g => g.id !== groupToAdd.id)])
          setActiveGroupId(groupToAdd.id)
          setShowJoinGroupModal(false)
          setJoinGroupIdInput('')
          setJoinGroupError(null)
          setCopyNotice(`Joined "${groupToAdd.name}"! 🎉`)
          setTimeout(() => setCopyNotice(null), 3000)

          // Broadcast member update to other peers
          client.channel('realtime_shops_and_groups').send({
            type: 'broadcast',
            event: 'GROUP_UPDATED',
            payload: { group: groupToAdd }
          }).catch(() => {})
          return
        }
      } catch (err: any) {
        console.warn('Error joining group in Supabase:', err)
        setJoinGroupError(err?.message || 'Failed to join group.')
        return
      }
    }

    // 3. Offline check in registered groups registry
    let allRegistered: Group[] = []
    try {
      const saved = localStorage.getItem('chaisplit_all_registered_groups')
      if (saved) allRegistered = JSON.parse(saved)
    } catch {}

    const foundOffline = allRegistered.find(
      g => g.code.toUpperCase() === cleanId || g.id.toUpperCase() === cleanId
    )
    if (foundOffline) {
      const updatedMembers = !foundOffline.members.some(m => m.id === user.id)
        ? [...foundOffline.members, user]
        : foundOffline.members

      const groupToAdd: Group = {
        ...foundOffline,
        members: updatedMembers
      }

      setGroups(prev => [groupToAdd, ...prev.filter(g => g.id !== groupToAdd.id)])
      setActiveGroupId(groupToAdd.id)
      setShowJoinGroupModal(false)
      setJoinGroupIdInput('')
      setJoinGroupError(null)
      setCopyNotice(`Joined "${groupToAdd.name}"! 🎉`)
      setTimeout(() => setCopyNotice(null), 3000)
      return
    }

    // Never auto-create fake groups: if group code not found, show error!
    setJoinGroupError(`No group found with Code "${cleanId}". Please check the code with your group admin.`)
  }

  // Handle initiate delete group (Strictly Admin only - triggers name confirmation modal)
  const handleRequestDeleteGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const targetGroup = groups.find(g => g.id === groupId)
    if (!targetGroup) return

    const isGroupAdmin = user && (targetGroup.adminId === user.id || (!targetGroup.adminId && targetGroup.members[0]?.id === user.id))
    if (!isGroupAdmin) {
      setCopyNotice('Only the group admin can delete this group.')
      setTimeout(() => setCopyNotice(null), 3000)
      return
    }

    setGroupToDelete(targetGroup)
    setDeleteConfirmNameInput('')
  }

  // Handle confirm delete group after typing exact group name
  const handleConfirmDeleteGroup = async () => {
    if (!groupToDelete || !user || isDeletingGroup) return

    const isGroupAdmin = groupToDelete.adminId === user.id || (!groupToDelete.adminId && groupToDelete.members[0]?.id === user.id)
    if (!isGroupAdmin) {
      setCopyNotice('Only the group admin can delete this group.')
      setTimeout(() => setCopyNotice(null), 3000)
      setGroupToDelete(null)
      return
    }

    // Name confirmation validation (trimmed, case-insensitive)
    if (deleteConfirmNameInput.trim().toLowerCase() !== groupToDelete.name.trim().toLowerCase()) {
      return
    }

    setIsDeletingGroup(true)
    const targetId = groupToDelete.id
    const targetName = groupToDelete.name

    if (supabase && user) {
      try {
        await supabase
          .from('groups')
          .delete()
          .eq('id', targetId)
          .eq('admin_id', user.id)
      } catch (err) {
        console.warn('Error deleting group from Supabase:', err)
      }

      try {
        await supabase.channel('realtime_shops_and_groups').send({
          type: 'broadcast',
          event: 'GROUP_DELETED',
          payload: { groupId: targetId }
        })
      } catch {}
    }

    setGroups(prev => {
      const updated = prev.filter(g => g.id !== targetId)
      if (activeGroupId === targetId) {
        setActiveGroupId(updated.length > 0 ? updated[0].id : null)
      }
      return updated
    })

    if (viewingGroupId === targetId) {
      setViewingGroupId(null)
    }
    if (viewingBreakGroupId === targetId) {
      setViewingBreakGroupId(null)
    }

    setIsDeletingGroup(false)
    setGroupToDelete(null)
    setDeleteConfirmNameInput('')
    setCopyNotice(`Group "${targetName}" deleted successfully`)
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Handle direct exit from group (user can exit group directly)
  const handleDirectExitGroup = (groupId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const targetGroup = groups.find(g => g.id === groupId)
    const targetName = targetGroup?.name || 'the group'

    if (supabase && user) {
      supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .then(() => {}, (err: any) => console.warn(err))
    }

    setGroups(prev => {
      const updated = prev.filter(g => g.id !== groupId)
      if (activeGroupId === groupId) {
        setActiveGroupId(updated.length > 0 ? updated[0].id : null)
      }
      return updated
    })

    if (viewingGroupId === groupId) {
      setViewingGroupId(null)
    }
    if (viewingBreakGroupId === groupId) {
      setViewingBreakGroupId(null)
    }

    setCopyNotice(`You exited ${targetName}`)
    setTimeout(() => setCopyNotice(null), 3000)
  }





  // Count past sessions belonging to the user's groups for navigation badge
  const userPastSessionsCount = useMemo(() => {
    if (!user) return 0
    const userGrpIds = new Set(groups.map(g => g.id))
    const userGrpNames = new Set(groups.map(g => g.name.toLowerCase().trim()))

    return pastSessions.filter(s => {
      if (s.groupId && userGrpIds.has(s.groupId)) return true
      if (s.groupName && userGrpNames.has(s.groupName.toLowerCase().trim())) return true
      if (!s.groupId && !s.groupName) {
        return s.payerId === user.id || s.creatorId === user.id || s.expenses?.some(e => e.memberId === user.id)
      }
      return false
    }).length
  }, [pastSessions, groups, user])

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] justify-between">
      
      {/* Scrollable Main Content */}
      <div className="w-full px-3.5 py-4 pb-20 space-y-4 flex-1">
        
        {/* Notice Banner */}
        {copyNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in shadow-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{copyNotice}</span>
            </div>
            <button onClick={() => setCopyNotice(null)} className="text-emerald-600 hover:text-emerald-800">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* -------------------- 1. MY ORDERS & OTHERS' ORDERS TABS -------------------- */}
        {(activeTab === 'my-orders' || activeTab === 'others-orders' || activeTab === 'details') && (
          (() => {
            const isOthersTab = activeTab === 'others-orders'

            // RULE 1: If user is NOT a part of any group -> Show Create Group & Join Group options
            if (groups.length === 0) {
              return (
                <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5 my-3 animate-in fade-in">
                  <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h3 className="font-heading font-black text-lg text-stone-900 dark:text-stone-100">
                      {isOthersTab ? "Join a Group to View Orders" : "Join a Group to Order"}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                      {isOthersTab
                        ? "You are not a part of any group yet. Create a group or join with a Group ID to see live orders from your colleagues."
                        : "You are not a part of any group yet. Create or join a tea group first to start placing tea and snack orders."}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2 max-w-xs mx-auto">
                    <button
                      type="button"
                      onClick={() => setShowCreateGroupModal(true)}
                      id="orders-create-group-btn"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Group</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowJoinGroupModal(true)}
                      id="orders-join-group-btn"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span>Join Group</span>
                    </button>
                  </div>
                </div>
              )
            }

            // Find if any of the user's groups currently has a genuine live break
            const liveGroupWithBreak =
              (viewingBreakGroupId ? groups.find(g => g.id === viewingBreakGroupId && getActiveSessionForGroup(g.id)?.status === 'active') : null) ||
              groups.find(g => {
                const s = getActiveSessionForGroup(g.id)
                return s && s.status === 'active'
              })

            // RULE 2: If there IS a real live break in one of user's groups -> Render TeaBreakPage
            if (liveGroupWithBreak) {
              return (
                <TeaBreakPage
                  group={liveGroupWithBreak}
                  currentUser={user}
                  initialSubView={isOthersTab ? 'others-orders' : 'my-orders'}
                  onSubViewChange={(sub) => setActiveTab(sub)}
                  onBack={() => {
                    setViewingBreakGroupId(null)
                    setActiveTab('home')
                  }}
                />
              )
            }

            // RULE 3: User IS part of group(s), but NOT in a break -> Show option for Create Break (No dummy break!)
            return (
              <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-5 my-3 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
                  <Coffee className="w-8 h-8" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="font-heading font-black text-lg text-stone-900 dark:text-stone-100">
                    {isOthersTab ? "No Live Break Running" : "No Active Tea Break"}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                    {isOthersTab
                      ? "There is no live tea break running in your groups right now. Start a break with your team to collect everyone's orders!"
                      : "You are not part of an ongoing tea break. Start a break with your group to order tea & snacks!"}
                  </p>
                </div>

                <div className="pt-2 max-w-sm mx-auto space-y-3">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Start a break for your group:
                  </div>
                  <div className="space-y-2 text-left">
                    {groups.map(g => (
                      <div
                        key={g.id}
                        className="p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-850 flex items-center justify-between gap-2.5 transition-all hover:border-amber-400"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {g.name}
                          </h4>
                          <p className="text-[10px] text-stone-400 truncate">
                            {g.shopName || 'Chayakkada'} • {g.members?.length || 1} members
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartBreakForGroup(g)}
                          id={`start-break-btn-${g.id}`}
                          className="btn-primary text-xs py-2 px-3.5 rounded-lg shrink-0"
                        >
                          Create Break
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()
        )}

        {/* -------------------- 2. HOME / GROUPS TAB -------------------- */}
        {(activeTab === 'home' || activeTab === 'groups') && (
          viewingBreakGroup ? (
            /* DEDICATED SEPARATE BREAK PAGE - ZERO GROUP DETAILS SHOWN HERE */
            <TeaBreakPage
              group={viewingBreakGroup}
              currentUser={user}
              onBack={() => {
                const returnGroupId = viewingBreakGroup.id
                setViewingBreakGroupId(null)
                setViewingGroupId(returnGroupId)
              }}
            />
          ) : viewingGroup ? (
            <GroupDetailsPage
              group={viewingGroup}
              currentUser={user}
              allUsers={allUsers}
              onBack={() => setViewingGroupId(null)}
              onOpenBreak={(groupId) => {
                setViewingGroupId(groupId)
                setViewingBreakGroupId(groupId)
                setActiveTab('my-orders')
              }}
              onUpdateGroup={(updatedGroup) => {
                setGroups(prev => {
                  const updated = prev.map(g => g.id === updatedGroup.id ? updatedGroup : g)
                  try {
                    if (user?.id) localStorage.setItem(`chaisplit_groups_user_${user.id}`, JSON.stringify(updated))
                  } catch {}
                  return updated
                })
                if (supabase) {
                  const client = supabase
                  client.channel('realtime_shops_and_groups').send({
                    type: 'broadcast',
                    event: 'GROUP_UPDATED',
                    payload: { group: updatedGroup }
                  }).catch(() => {})
                }
              }}
              onExitGroup={(groupId) => {
                handleDirectExitGroup(groupId)
              }}
              onDeleteGroup={(groupId) => {
                handleRequestDeleteGroup(groupId)
              }}
            />
          ) : (
          <div className="space-y-4 animate-in fade-in">
            {/* 1. Splitty Two Balance Cards */}
            <div className="grid grid-cols-2 gap-3 pt-0.5">
              {/* You Owe Card */}
              <div className="bg-[#1C1917] rounded-3xl p-4 text-white shadow-xl flex flex-col justify-between h-28 border border-white/5">
                <div className="space-y-0.5">
                  <div className="font-heading font-extrabold text-2xl tracking-tight text-white">
                    ₹{youOweAmount}
                  </div>
                  <div className="text-xs text-stone-400 font-medium">You Owe</div>
                </div>
                <div className="flex justify-end">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-stone-300" />
                  </div>
                </div>
              </div>

              {/* Owes You Card */}
              <div className="bg-[#1C1917] rounded-3xl p-4 text-white shadow-xl flex flex-col justify-between h-28 border border-white/5">
                <div className="space-y-0.5">
                  <div className="font-heading font-extrabold text-2xl tracking-tight text-white">
                    ₹{owesYouAmount}
                  </div>
                  <div className="text-xs text-stone-400 font-medium">Owes you</div>
                </div>
                <div className="flex justify-end">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-stone-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Groups Header & Action Buttons */}
            <div className="flex items-center justify-between pt-1 px-1">
              <div>
                <h2 className="font-heading font-extrabold text-lg text-white">
                  Groups
                </h2>
                <p className="text-xs text-white/80 font-medium">
                  You are in <span className="font-bold text-white">{groups.length}</span> {groups.length === 1 ? 'group' : 'groups'}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJoinGroupIdInput('')
                    setJoinGroupError(null)
                    setShowJoinGroupModal(true)
                  }}
                  id="join-group-header-btn"
                  className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-xs transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Join Group with Group ID"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Join</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  id="create-group-header-btn"
                  className="px-3 py-1.5 rounded-full bg-white text-[#CF4C16] font-bold text-xs hover:bg-white/90 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Create New Group"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </div>
            </div>

            {/* 3. Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={groupSearchQuery}
                onChange={e => setGroupSearchQuery(e.target.value)}
                placeholder="Search groups by name, tapri, or ID..."
                className="w-full pl-9 pr-8 py-2.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs rounded-2xl text-xs font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none shadow-xs border border-white/40 dark:border-stone-800"
              />
              {groupSearchQuery && (
                <button
                  type="button"
                  onClick={() => setGroupSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 4. Loading / Empty / Filtered List */}
            {isLoadingGroups && groups.length === 0 ? (
              <GroupCardSkeleton count={3} />
            ) : groups.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-4 my-2 shadow-sm">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center text-2xl shadow-xs">
                  ☕
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100">
                    No Groups Joined Yet
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
                    Create a group with your favorite tea stall, or enter a Group ID from your colleague to join.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    id="create-new-group-empty-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs bg-[#FF7043] hover:bg-[#F4511E] text-white shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Group</span>
                  </button>

                  <button
                    onClick={() => {
                      setJoinGroupIdInput('')
                      setJoinGroupError(null)
                      setShowJoinGroupModal(true)
                    }}
                    id="join-group-empty-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-xs border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Join with Group ID</span>
                  </button>
                </div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-6 text-center rounded-3xl bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 space-y-2 shadow-sm">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  No groups found matching "{groupSearchQuery}".
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setJoinGroupIdInput(groupSearchQuery.toUpperCase())
                    setJoinGroupError(null)
                    setShowJoinGroupModal(true)
                  }}
                  className="text-xs font-bold text-[#CF4C16] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Try joining "{groupSearchQuery.toUpperCase()}" with Group ID →</span>
                </button>
              </div>
            ) : (
              /* Groups Cards (Splitty Screens 1 & 3) */
              <div className="space-y-3.5">
                {filteredGroups.map(group => {
                  const groupActiveBreak = (group.id ? getActiveSessionForGroup(group.id) : null) || (activeSession?.groupId === group.id ? activeSession : null)
                  const isGroupBreakActive = Boolean(groupActiveBreak && groupActiveBreak.status === 'active')
                  const groupIconConfig = getGroupIconConfig(group.name, group.shopName)

                  // Determine debts breakdown in this group
                  let youAreOwedInGroup: string | null = null
                  let youOweInGroup: string | null = null
                  const memberDebts: { name: string; amount: string; avatar?: string }[] = []

                  if (groupActiveBreak && groupActiveBreak.status === 'active' && user) {
                    const myExp = groupActiveBreak.expenses?.find(m => m.memberId === user.id)
                    const myTotal = myExp?.items?.reduce((sum: number, it) => sum + (it.price * it.quantity), 0) || 0
                    if (groupActiveBreak.payerId === user.id) {
                      const othersTotal = Math.max(0, (groupActiveBreak.totalAmount || 0) - myTotal)
                      if (othersTotal > 0) youAreOwedInGroup = othersTotal.toFixed(2)
                      groupActiveBreak.expenses?.filter(m => m.memberId !== user.id).forEach(m => {
                        const amt = m.items?.reduce((sum: number, it) => sum + (it.price * it.quantity), 0) || 0
                        if (amt > 0) {
                          memberDebts.push({
                            name: m.memberName || 'Member',
                            amount: amt.toFixed(2),
                            avatar: m.memberName?.slice(0, 1).toUpperCase()
                          })
                        }
                      })
                    } else {
                      if (myTotal > 0) youOweInGroup = myTotal.toFixed(2)
                    }
                  }

                  const totalDisplay = groupActiveBreak?.totalAmount
                    ? `₹${groupActiveBreak.totalAmount.toFixed(2)}`
                    : null

                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        setActiveGroupId(group.id)
                        if (isGroupBreakActive) {
                          setViewingBreakGroupId(group.id)
                          setActiveTab('my-orders')
                        } else {
                          setViewingGroupId(group.id)
                        }
                      }}
                      className="bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-sm space-y-3.5 cursor-pointer hover:shadow-md transition-all active:scale-[0.99] border border-stone-100/80 dark:border-stone-800"
                    >
                      {/* Top Row: Group Icon Pastel Badge + Name/Subtitle + Amount/ID */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-12 h-12 rounded-2xl ${groupIconConfig.bgLight} ${groupIconConfig.bgDark} flex items-center justify-center text-2xl shrink-0 shadow-2xs`}>
                            {groupIconConfig.emoji}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100 truncate">
                              {group.name}
                            </h3>
                            <p className="text-xs text-stone-400 truncate">
                              {group.shopName || 'Tea Stall'} • {group.members?.length || 1} {group.members?.length === 1 ? 'member' : 'members'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {totalDisplay ? (
                            <>
                              <div className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100">
                                {totalDisplay}
                              </div>
                              <div className="text-[10px] text-stone-400 font-medium">
                                Total bill
                              </div>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopy(group.code || group.id, `${group.name} Group ID`)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 transition-colors"
                              title="Click to copy Group ID"
                            >
                              <span>{group.code || group.id}</span>
                              <Copy className="w-3 h-3 opacity-60" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Middle: Member Debts Breakdown if active break with debts */}
                      {memberDebts.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
                          {memberDebts.slice(0, 2).map((debt, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-[10px] font-bold flex items-center justify-center">
                                  {debt.avatar || 'M'}
                                </div>
                                <span>{debt.name} owes you</span>
                              </div>
                              <span className="font-bold text-stone-900 dark:text-stone-100">₹{debt.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bottom Status Pill (Splitty Pill) */}
                      <div className="pt-0.5">
                        {isGroupBreakActive ? (
                          <div className="splitty-pill-owed">
                            <span className="w-2 h-2 rounded-full bg-[#1B9C56] animate-ping" />
                            <span>Live Break Active • Tap to Order</span>
                          </div>
                        ) : youAreOwedInGroup ? (
                          <div className="splitty-pill-owed">
                            <span>You are owed</span>
                            <span className="font-bold">₹{youAreOwedInGroup}</span>
                          </div>
                        ) : youOweInGroup ? (
                          <div className="splitty-pill-owe">
                            <span>You owe</span>
                            <span className="font-bold">₹{youOweInGroup}</span>
                          </div>
                        ) : (
                          <div className="splitty-pill-settled">
                            <span>Settled up</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 5. Friends & Tea Mates Section (Splitty Screen 1 Bottom Sheet) */}
            {allUsers && allUsers.length > 0 && (
              <div className="bg-[#FAF8F5] dark:bg-stone-900/60 rounded-3xl p-5 space-y-3.5 border border-stone-200/50 dark:border-stone-800 shadow-sm mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100">
                    Friends &amp; Tea Mates
                  </h3>
                  {user && (
                    <button
                      type="button"
                      onClick={() => handleCopy(getUserCode(user), 'My Unique ID')}
                      className="text-xs font-bold text-[#CF4C16] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      title="Copy my ID"
                    >
                      <span>My ID: {getUserCode(user)}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {allUsers.filter(u => u.id !== user?.id).slice(0, 3).map(friend => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-850 shadow-2xs border border-stone-100 dark:border-stone-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 font-extrabold text-xs text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0">
                          {friend.avatar || friend.name?.slice(0, 1).toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {friend.name}
                          </div>
                          <div className="text-[11px] text-stone-400">
                            ID: {getUserCode(friend)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(getUserCode(friend), `${friend.name}'s ID`)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer transition-colors"
                        title="Copy colleague's ID"
                      >
                        Copy ID
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* -------------------- 4. REDESIGNED HISTORY TAB -------------------- */}
        {activeTab === 'history' && (
          <HistoryPage groups={groups} currentUser={user} />
        )}

      </div>

      {/* -------------------- BOTTOM NAVIGATION BAR -------------------- */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'home') {
            setViewingGroupId(null)
            setViewingBreakGroupId(null)
          } else if (tab === 'my-orders' || tab === 'others-orders') {
            const target =
              (activeSession?.groupId ? groups.find(g => g.id === activeSession.groupId) : null) ||
              groups.find(g => {
                const s = getActiveSessionForGroup(g.id)
                return s && s.status === 'active'
              }) ||
              activeGroup
            if (target) {
              setViewingBreakGroupId(target.id)
            }
          }
          setActiveTab(tab)
        }}
        historyCount={userPastSessionsCount}
      />

      {/* -------------------- MODALS -------------------- */}



      {/* Modal: Create New Group */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <span>Create New Group</span>
                </h3>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-left">
              {/* Group Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Group Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Shop Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Shop Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newGroupShopName}
                  onChange={e => setNewGroupShopName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Include Starter Menu Items Checkbox */}
              <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeStarterMenu}
                    onChange={e => setIncludeStarterMenu(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200 block">
                      Include standard tapri items
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 block leading-tight">
                      Pre-populates Chaya (₹12), Coffee (₹12), Samoza (₹12), Omlette (₹20), Porotta (₹12), Puffs (₹20), etc.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-create-group-btn"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Group with Group ID */}
      {showJoinGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <span>Join a Group</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Enter the Group ID to join your colleagues
                </p>
              </div>
              <button
                onClick={() => {
                  setShowJoinGroupModal(false)
                  setJoinGroupError(null)
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJoinGroup} className="space-y-3.5 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Group ID <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. GRP-4821 or TEA-FL3"
                  value={joinGroupIdInput}
                  onChange={e => {
                    setJoinGroupIdInput(e.target.value.toUpperCase())
                    setJoinGroupError(null)
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs uppercase font-mono font-bold tracking-wider text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-400">
                  Ask your colleague or team admin for their Group ID
                </p>
                {joinGroupError && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    {joinGroupError}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinGroupModal(false)
                    setJoinGroupError(null)
                  }}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-join-group-btn"
                  className="btn-primary text-xs py-1.5 px-4 rounded-lg"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Join Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal: Add Item to Menu */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                  Add Item to Menu
                </h3>
                <p className="text-[11px] text-stone-400">
                  Add a new tea, snack or bite to Chayakkada
                </p>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomItem} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parippu Vada, Bun Maska, Pazham Pori"
                  value={customItemName}
                  onChange={e => setCustomItemName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="20"
                    value={customItemPrice}
                    onChange={e => setCustomItemPrice(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Category
                  </label>
                  <select
                    value={customItemCategory}
                    onChange={e => setCustomItemCategory(e.target.value as MenuItem['category'])}
                    className="w-full py-2 px-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                  >
                    <option value="tea">Tea</option>
                    <option value="coffee">Coffee</option>
                    <option value="snacks">Snacks</option>
                    <option value="quick-bites">Quick Bites</option>
                    <option value="drinks">Drinks</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="btn-secondary text-xs py-1.5 px-3 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-menu-item-submit-btn"
                  className="btn-primary text-xs py-1.5 px-3.5 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Group Confirmation (Admin Only - Requires Entering Group Name) */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-rose-200/80 dark:border-rose-900/50 p-5 sm:p-6 space-y-4 text-center">
            {/* Header Icon */}
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Title & Warning */}
            <div className="space-y-1.5">
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-stone-900 dark:text-stone-100">
                Delete "{groupToDelete.name}"?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                This action is <span className="font-semibold text-rose-600 dark:text-rose-400">irreversible</span>. All active sessions, past history, and member connections in this group will be permanently removed.
              </p>
            </div>

            {/* Name confirmation instructions & input */}
            <div className="space-y-2 text-left pt-1">
              <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                Type <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold select-all bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-200/60 dark:border-rose-800/40">{groupToDelete.name}</strong> to confirm:
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="delete-group-confirm-input"
                  autoFocus
                  placeholder={`Enter "${groupToDelete.name}"`}
                  value={deleteConfirmNameInput}
                  onChange={(e) => setDeleteConfirmNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      deleteConfirmNameInput.trim().toLowerCase() === groupToDelete.name.trim().toLowerCase() &&
                      !isDeletingGroup
                    ) {
                      e.preventDefault()
                      handleConfirmDeleteGroup()
                    }
                  }}
                  className="w-full py-2.5 px-3.5 pr-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 font-medium placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                />
                {deleteConfirmNameInput.trim().toLowerCase() === groupToDelete.name.trim().toLowerCase() && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </div>
              {deleteConfirmNameInput &&
                deleteConfirmNameInput.trim().toLowerCase() !== groupToDelete.name.trim().toLowerCase() && (
                  <p className="text-[11px] text-rose-500 font-medium">
                    Group name does not match
                  </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingGroup}
                onClick={() => {
                  setGroupToDelete(null)
                  setDeleteConfirmNameInput('')
                }}
                className="btn-secondary text-xs py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-group-btn"
                disabled={
                  deleteConfirmNameInput.trim().toLowerCase() !== groupToDelete.name.trim().toLowerCase() ||
                  isDeletingGroup
                }
                onClick={handleConfirmDeleteGroup}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all ${
                  deleteConfirmNameInput.trim().toLowerCase() === groupToDelete.name.trim().toLowerCase() &&
                  !isDeletingGroup
                    ? 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95 shadow-rose-600/20'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60'
                }`}
              >
                {isDeletingGroup ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Modal: Break is running cannot create/close at the moment */}
      {showCannotSettleModal && (
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
                <div className="text-[10px] text-stone-500 dark:text-stone-400 pt-0.5">
                  Only one break can be created at a time. Please ask <strong>{activeSession?.creatorName || 'the creator'}</strong> or the group admin to close or settle this session.
                </div>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCannotSettleModal(false)}
                id="cannot-settle-modal-ok-btn"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all text-center"
              >
                Understood ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: All members must confirm items before settle and close */}
      {showUnconfirmedModal && activeSession && (
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
                <span>
                  Pending Members (
                  {activeSession.expenses.filter(e => e.items && e.items.length > 0 && !e.isConfirmed).length}
                  ):
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Not Confirmed</span>
              </div>

              {activeSession.expenses
                .filter(e => e.items && e.items.length > 0 && !e.isConfirmed)
                .map(member => (
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

                    <button
                      type="button"
                      onClick={async () => {
                        await confirmMemberOrder(member.memberId, activeSession?.id)
                      }}
                      className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Confirm</span>
                    </button>
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

    </div>
  )
}
