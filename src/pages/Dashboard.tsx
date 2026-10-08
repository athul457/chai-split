import React, { useState, useEffect } from 'react'
import {
  Coffee,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Share2,
  Receipt,
  Wallet,
  Copy,
  X,
  MapPin,
  Users,
  Store,
  ArrowRight,
  Trash2,
  KeyRound
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { BottomNav } from '../components/BottomNav'
import { ShopItemsPage } from './ShopItemsPage'
import { GroupDetailsPage } from './GroupDetailsPage'
import { TeaBreakPage } from './TeaBreakPage'
import { DEFAULT_SHOPS } from '../lib/mockData'
import { supabase } from '../lib/supabase'
import { ShopCardSkeleton, GroupCardSkeleton } from '../components/ChaiSkeleton'
import type { PageRoute, BottomTab, Shop, MenuItem, Group, User } from '../types'

interface DashboardProps {
  onNavigate?: (page: PageRoute) => void
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const { user, allUsers } = useAuth()
  const {
    activeSession,
    pastSessions,
    menuItems,
    getMenuItemsForShop,
    addItemToMember,
    removeItemFromMember,
    toggleMemberPaid,
    settleActiveSession,
    addMemberToSession,
    addCustomMenuItem,
    removeMenuItemsForShop,
    getShopItemSummary,
    generateWhatsAppSummary
  } = useExpense()

  // Navigation tab state (Shops is the default home tab)
  const [activeTab, setActiveTab] = useState<BottomTab>('shops')

  // Modals & form state
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [customItemName, setCustomItemName] = useState('')
  const [customItemPrice, setCustomItemPrice] = useState('20')
  const [customItemEmoji, setCustomItemEmoji] = useState('☕')
  const [selectedMemberForQuickAdd, setSelectedMemberForQuickAdd] = useState<string>('')
  const [copyNotice, setCopyNotice] = useState<string | null>(null)


  // Groups tab state - Strictly isolated per logged-in user
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      if (!user) return []
      const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
      if (!saved) return []
      const parsed: Group[] = JSON.parse(saved)
      return parsed.map(g => ({
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
  const [isLoadingShops, setIsLoadingShops] = useState(true)

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
        setGroups(parsed)
        const savedActive = localStorage.getItem(`chaisplit_active_group_user_${user.id}`)
        if (savedActive && parsed.some(g => g.id === savedActive)) {
          setActiveGroupId(savedActive)
        } else if (parsed.length > 0) {
          setActiveGroupId(parsed[0].id)
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
  }, [user?.id])

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
            const isAdmin = g.admin_id === user.id
            const isMember = groupMemberRows.some(r => r.group_id === g.id && r.user_id === user.id)
            return isAdmin || isMember
          })

          const mappedGroups: Group[] = myGroupsData.map((g: any) => {
            const adminUser = allUsers.find(u => u.id === g.admin_id) || (g.admin_id === user.id ? user : null)
            const gmUsers: User[] = groupMemberRows
              .filter(r => r.group_id === g.id)
              .map(r => allUsers.find(u => u.id === r.user_id) || (r.user_id === user.id ? user : null))
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

          setGroups(mappedGroups)
          if (mappedGroups.length > 0) {
            setActiveGroupId(prev => {
              if (prev && mappedGroups.some(g => g.id === prev)) return prev
              return mappedGroups[0].id
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
  }, [allUsers, user?.id])

  // Fetch real shops from Supabase
  useEffect(() => {
    if (!supabase) {
      setIsLoadingShops(false)
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
      } finally {
        setIsLoadingShops(false)
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
            const isAdmin = g.admin_id === user.id
            const isMember = groupMemberRows.some(r => r.group_id === g.id && r.user_id === user.id)
            return isAdmin || isMember
          })

          const mappedGroups: Group[] = myGroupsData.map((g: any) => {
            const adminUser = allUsers.find(u => u.id === g.admin_id) || (g.admin_id === user.id ? user : null)
            const gmUsers: User[] = groupMemberRows
              .filter(r => r.group_id === g.id)
              .map(r => allUsers.find(u => u.id === r.user_id) || (r.user_id === user.id ? user : null))
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

          setGroups(mappedGroups)
          if (mappedGroups.length > 0) {
            setActiveGroupId(prev => {
              if (prev && mappedGroups.some(g => g.id === prev)) return prev
              return mappedGroups[0].id
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
      .channel('realtime_shops_and_groups')
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

  const [showAddShopModal, setShowAddShopModal] = useState(false)
  const [newShopName, setNewShopName] = useState('')
  const [newShopLocation, setNewShopLocation] = useState('')
  const [newShopSpecialty, setNewShopSpecialty] = useState('')
  const [newShopEmoji, setNewShopEmoji] = useState('☕')
  const [selectedShopId, setSelectedShopId] = useState<string>(() => DEFAULT_SHOPS[0]?.id || '')

  // Shop items new page state
  const [viewingShopItems, setViewingShopItems] = useState<Shop | null>(null)
  const [customItemCategory, setCustomItemCategory] = useState<MenuItem['category']>('snacks')

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopyNotice(`Copied ${label} to clipboard!`)
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Copy WhatsApp summary
  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppSummary()
    handleCopy(text, 'bill summary')
  }

  // Handle add custom item
  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customItemName.trim()) return
    const priceNum = Math.max(0, Math.round(parseFloat(customItemPrice) || 15))
    const targetShopId = activeSession?.shopId || 'shop-chayakkada'
    const targetShopName = activeSession?.shopName || 'shop'
    addCustomMenuItem(customItemName.trim(), priceNum, customItemEmoji, customItemCategory, targetShopId)
    setShowAddItemModal(false)
    setCopyNotice(`Added "${customItemName.trim()}" (₹${priceNum}) to ${targetShopName}!`)
    setTimeout(() => setCopyNotice(null), 3000)
    setCustomItemName('')
    setCustomItemPrice('20')
  }

  // Handle create new group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !user) return

    const generatedGroupId = `GRP-${Math.floor(1000 + Math.random() * 9000)}`
    const chosenShop = shops.find(s => s.id === selectedShopId) || shops[0] || null

    const createdGroup: Group = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      code: generatedGroupId,
      department: 'Office',
      adminId: user.id,
      shopId: chosenShop?.id,
      shopName: chosenShop?.name,
      shopEmoji: chosenShop?.emoji,
      members: [user],
      createdDate: new Date().toISOString().split('T')[0]
    }

    setGroups(prev => [createdGroup, ...prev])
    setActiveGroupId(createdGroup.id)
    setShowCreateGroupModal(false)
    setNewGroupName('')
    setSelectedShopId(shops[0]?.id || '')

    // Persist to Supabase
    if (supabase) {
      const client = supabase
      client.from('groups').insert({
        id: createdGroup.id,
        name: createdGroup.name,
        code: createdGroup.code,
        department: createdGroup.department,
        admin_id: user.id,
        shop_id: createdGroup.shopId || null,
        shop_name: createdGroup.shopName,
        shop_emoji: createdGroup.shopEmoji
      }).then(() => {
        // Also insert admin into group_members table
        client.from('group_members').insert({
          group_id: createdGroup.id,
          user_id: user.id
        }).then(() => {}, (e: any) => console.warn(e))
      }, (e: any) => console.warn(e))
    }

    // Persist to local registry for offline fallback
    try {
      const saved = localStorage.getItem('chaisplit_all_registered_groups')
      const all: Group[] = saved ? JSON.parse(saved) : []
      localStorage.setItem('chaisplit_all_registered_groups', JSON.stringify([createdGroup, ...all]))
    } catch {}

    setCopyNotice(`Created group "${createdGroup.name}" (ID: ${generatedGroupId})! 🎉`)
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Handle join group with Group ID
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanId = joinGroupIdInput.trim().toUpperCase()
    if (!cleanId || !user) return

    // 1. Check if already in user's groups
    const alreadyJoined = groups.find(g => g.code.toUpperCase() === cleanId)
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

    // 2. Query Supabase groups table
    if (supabase) {
      try {
        const client = supabase
        const { data: foundGroup, error } = await client
          .from('groups')
          .select('*')
          .ilike('code', cleanId)
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

    const foundOffline = allRegistered.find(g => g.code.toUpperCase() === cleanId)
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

  // Handle delete group (Strictly Admin only)
  const handleDeleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const targetGroup = groups.find(g => g.id === groupId)
    if (targetGroup && targetGroup.adminId && user && targetGroup.adminId !== user.id) {
      setCopyNotice('Only the group admin can delete this group.')
      setTimeout(() => setCopyNotice(null), 3000)
      return
    }

    if (supabase && user) {
      const client = supabase
      client
        .from('groups')
        .delete()
        .eq('id', groupId)
        .eq('admin_id', user.id)
        .then(() => {}, (e: any) => console.warn(e))
    }
    setGroups(prev => {
      const updated = prev.filter(g => g.id !== groupId)
      if (activeGroupId === groupId) {
        setActiveGroupId(updated.length > 0 ? updated[0].id : null)
      }
      return updated
    })
    setCopyNotice('Group deleted')
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Handle add new shop
  const handleAddShop = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newShopName.trim()) return
    const createdShop: Shop = {
      id: `shop-${Date.now()}`,
      name: newShopName.trim(),
      location: newShopLocation.trim() || 'Near Office',
      specialty: newShopSpecialty.trim() || 'Tea & Snacks',
      rating: 4.8,
      emoji: newShopEmoji || '☕'
    }

    if (supabase) {
      const client = supabase
      client.from('shops').insert({
        id: createdShop.id,
        name: createdShop.name,
        location: createdShop.location,
        specialty: createdShop.specialty,
        rating: createdShop.rating,
        emoji: createdShop.emoji
      }).then(() => {}, (e: any) => console.warn(e))
    }

    setShops(prev => [createdShop, ...prev])
    setShowAddShopModal(false)
    setNewShopName('')
    setNewShopLocation('')
    setNewShopSpecialty('')
    setCopyNotice(`Added ${createdShop.name} to shops!`)
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Handle delete shop
  const handleDeleteShop = (shopId: string, shopName: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }

    if (supabase) {
      const client = supabase
      client
        .from('menu_items')
        .delete()
        .eq('shop_id', shopId)
        .then(() => {
          client
            .from('shops')
            .delete()
            .eq('id', shopId)
            .then(() => {}, (err: any) => console.warn('Supabase delete shop err:', err))
        }, () => {
          client
            .from('shops')
            .delete()
            .eq('id', shopId)
            .then(() => {}, (err: any) => console.warn('Supabase delete shop err:', err))
        })
    }

    setShops(prev => prev.filter(s => s.id !== shopId))
    if (removeMenuItemsForShop) {
      removeMenuItemsForShop(shopId)
    }
    if (viewingShopItems?.id === shopId) {
      setViewingShopItems(null)
    }
    setCopyNotice(`Deleted shop "${shopName}"`)
    setTimeout(() => setCopyNotice(null), 3000)
  }

  // Filtered menu
  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory)

  // Shop breakdown
  const shopItems = getShopItemSummary()
  const bhaiyaShoutLine = shopItems.map(i => `${i.count} ${i.name}`).join(', ')

  // Total collected & pending
  const totalAmount = activeSession?.totalAmount || 0
  const unpaidMembers = activeSession?.expenses.filter(e => !e.isPaid && e.memberId !== activeSession.payerId && e.total > 0) || []
  const paidMembers = activeSession?.expenses.filter(e => e.isPaid && e.memberId !== activeSession.payerId && e.total > 0) || []

  // Past sessions total spent
  const totalHistorySpent = pastSessions.reduce((sum, s) => sum + s.totalAmount, 0)

  // Security check: Only display active session if user is actually in that group
  const isUserInActiveSessionGroup = Boolean(
    activeSession && groups.some(g => g.id === activeSession.groupId)
  )

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] justify-between">
      
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

        {/* -------------------- 1. DETAILS TAB (Live Break & Expense Tracking) -------------------- */}
        {(activeTab === 'details' || activeTab === 'home') && (
          <div className="space-y-4">
            {/* Top Bar with Break Status */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                    {activeGroup?.name || user?.teamName || 'Floor 3 Tea Club'}
                  </span>
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Logged in as <strong className="text-stone-800 dark:text-stone-200">{user?.name}</strong>
                </div>
              </div>

              {activeSession && isUserInActiveSessionGroup ? (
                <button
                  onClick={() => {
                    const targetGroup = groups.find(g => g.id === activeSession?.groupId) || activeGroup
                    if (targetGroup) {
                      setViewingGroupId(null)
                      setViewingBreakGroupId(targetGroup.id)
                    }
                    setActiveTab('groups')
                  }}
                  id="view-group-orders-btn"
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Tea Break Orders ☕</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (activeGroup) {
                      setViewingGroupId(activeGroup.id)
                    }
                    setActiveTab('groups')
                  }}
                  id="header-groups-btn"
                  className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Groups</span>
                </button>
              )}
            </div>

            {/* Active Session Content */}
            {activeSession && isUserInActiveSessionGroup ? (
              <div className="space-y-4">
                {/* Active Session Highlight Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white shadow-md relative overflow-hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide uppercase backdrop-blur-sm">
                      Live Session
                    </span>
                    <span className="text-amber-100 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activeSession.createdAt}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-heading text-xl font-extrabold tracking-tight">
                      {activeSession.title}
                    </h2>
                    <p className="text-amber-100 text-xs font-medium">
                      📍 {activeSession.shopName} • {shopItems.reduce((acc, i) => acc + i.count, 0)} items total
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/20">
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-amber-200">Total:</span>
                      <span className="font-heading text-2xl font-black">₹{totalAmount}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyWhatsApp}
                        id="copy-whatsapp-btn"
                        title="Share on WhatsApp"
                        className="px-2.5 py-1.5 rounded-xl bg-white text-stone-900 hover:bg-amber-50 text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px]">WhatsApp</span>
                      </button>

                      <button
                        onClick={settleActiveSession}
                        id="settle-bill-btn"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Settle 🎉</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card 1: ☕ Track Orders (Who Had What?) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        <Coffee className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-stone-900 dark:text-stone-100 text-sm">
                          ☕ Who Had What?
                        </h3>
                        <p className="text-[10px] text-stone-400">
                          Tap items below to add to cup
                        </p>
                      </div>
                    </div>

                    {/* Add colleague dropdown */}
                    <select
                      id="add-colleague-select"
                      onChange={e => {
                        const target = allUsers.find(u => u.id === e.target.value)
                        if (target) {
                          addMemberToSession(target)
                          e.target.value = ''
                        }
                      }}
                      className="text-xs py-1 px-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 cursor-pointer focus:outline-none"
                    >
                      <option value="">+ Add Person</option>
                      {allUsers
                        .filter(u => !activeSession.expenses.some(e => e.memberId === u.id))
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Members list */}
                  <div className="space-y-2.5">
                    {activeSession.expenses.map(expense => {
                      const isPayer = expense.memberId === activeSession.payerId
                      const isCurrentUser = expense.memberId === user?.id

                      return (
                        <div
                          key={expense.memberId}
                          className={`p-3 rounded-xl border transition-all ${
                            selectedMemberForQuickAdd === expense.memberId
                              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/20'
                              : 'border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-stone-700 to-stone-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                {expense.memberAvatar}
                              </div>
                              <div className="truncate">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate">
                                    {expense.memberName}
                                  </span>
                                  {isCurrentUser && (
                                    <span className="px-1 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                                      You
                                    </span>
                                  )}
                                  {isPayer && (
                                    <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                                      👑 Payer
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-stone-400 font-medium">
                                  Total: <strong className="text-stone-800 dark:text-stone-200">₹{expense.total}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!isPayer && expense.total > 0 && (
                                <button
                                  onClick={() => toggleMemberPaid(expense.memberId)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                    expense.isPaid
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  }`}
                                >
                                  {expense.isPaid ? 'Paid' : `Owes ₹${expense.total}`}
                                </button>
                              )}

                              <button
                                onClick={() =>
                                  setSelectedMemberForQuickAdd(
                                    selectedMemberForQuickAdd === expense.memberId ? '' : expense.memberId
                                  )
                                }
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                  selectedMemberForQuickAdd === expense.memberId
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                                }`}
                              >
                                {selectedMemberForQuickAdd === expense.memberId ? 'Adding' : '+ Item'}
                              </button>
                            </div>
                          </div>

                          {/* List of items */}
                          {expense.items.length > 0 ? (
                            <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1">
                              {expense.items.map(item => (
                                <div
                                  key={item.id}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] text-stone-800 dark:text-stone-200"
                                >
                                  <span>{item.emoji}</span>
                                  <span className="font-medium truncate max-w-[100px]">{item.name}</span>
                                  <span className="text-stone-400">×{item.quantity}</span>
                                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                                    ₹{item.price * item.quantity}
                                  </span>
                                  <button
                                    onClick={() => removeItemFromMember(expense.memberId, item.menuItemId)}
                                    className="w-3.5 h-3.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center text-stone-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Card 2: Tapri Menu Grid */}
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-stone-900 dark:text-stone-100 text-xs">
                      Menu Quick Add{' '}
                      {selectedMemberForQuickAdd && (
                        <span className="text-amber-600 font-semibold">
                          (to {activeSession.expenses.find(e => e.memberId === selectedMemberForQuickAdd)?.memberName})
                        </span>
                      )}
                    </h3>

                    <button
                      onClick={() => setShowAddItemModal(true)}
                      className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Custom</span>
                    </button>
                  </div>

                  {/* Menu Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-semibold">
                    {['all', 'tea', 'coffee', 'snacks', 'quick-bites'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2 py-0.5 rounded-lg capitalize whitespace-nowrap cursor-pointer transition-all ${
                          selectedCategory === cat
                            ? 'bg-amber-600 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Menu Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {filteredMenuItems.slice(0, 6).map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          const targetId = selectedMemberForQuickAdd || user?.id || activeSession.expenses[0]?.memberId
                          if (targetId) {
                            addItemToMember(targetId, item)
                          }
                        }}
                        className="p-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/50 hover:bg-amber-50 hover:border-amber-300 dark:hover:bg-amber-950/40 text-left transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{item.emoji}</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400 text-xs">
                            ₹{item.price}
                          </span>
                        </div>
                        <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs truncate mt-1">
                          {item.name}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card 3: 🧾 Easy Billing for the Stall Owner */}
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
                        Shop Order &amp; Total
                      </h3>
                    </div>
                    <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                      ₹{totalAmount}
                    </span>
                  </div>

                  {shopItems.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-[11px] space-y-1">
                      <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between">
                        <span>📢 Call to Vendor:</span>
                        <button
                          onClick={() => handleCopy(bhaiyaShoutLine, 'order line')}
                          className="text-[10px] text-amber-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                      <p className="text-stone-700 dark:text-stone-300 italic font-mono text-[11px]">
                        &ldquo;{bhaiyaShoutLine}&rdquo;
                      </p>
                    </div>
                  )}

                  <div className="divide-y divide-stone-100 dark:divide-stone-800 text-[11px]">
                    {shopItems.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span>{item.emoji}</span>
                          <span className="font-medium text-stone-800 dark:text-stone-200">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800">
                            × {item.count}
                          </span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            ₹{item.totalCost}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 4: 💰 Settle & Who Owes What */}
                <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
                      Settlements &amp; Repayments
                    </h3>
                  </div>

                  {/* Unpaid shares */}
                  <div className="space-y-1.5">
                    {unpaidMembers.length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>All members have cleared their shares! 🎉</span>
                      </div>
                    ) : (
                      unpaidMembers.map(m => (
                        <div
                          key={m.memberId}
                          className="p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                              {m.memberAvatar}
                            </span>
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {m.memberName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-800 dark:text-amber-300">
                              owes ₹{m.total}
                            </span>
                            <button
                              onClick={() => toggleMemberPaid(m.memberId)}
                              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-600 dark:bg-stone-800 dark:hover:bg-emerald-600 hover:text-white text-[11px] font-semibold cursor-pointer active:scale-95 transition-all shadow-2xs"
                            >
                              Mark Paid
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {paidMembers.length > 0 && (
                    <div className="pt-1.5 border-t border-stone-100 dark:border-stone-800 text-[10px] text-stone-400">
                      <span>Cleared: </span>
                      <span className="font-medium text-stone-600 dark:text-stone-300">
                        {paidMembers.map(m => m.memberName).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* Empty state */
              <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto text-xl shadow-xs">
                  ☕
                </div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                  No Active Tea Break
                </h3>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Tea breaks can be started from your group page by any member. Visit your group to start a break and add items!
                </p>
                <button
                  onClick={() => {
                    if (activeGroup) {
                      setViewingGroupId(activeGroup.id)
                    }
                    setActiveTab('groups')
                  }}
                  id="go-to-groups-empty-btn"
                  className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Go to Groups 👥</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* -------------------- 2. GROUPS TAB -------------------- */}
        {activeTab === 'groups' && (
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
              }}
              onUpdateGroup={(updatedGroup) => {
                setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
              }}
              onExitGroup={(groupId) => {
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
                setViewingGroupId(null)
                setCopyNotice(`You exited the group`)
                setTimeout(() => setCopyNotice(null), 3000)
              }}
            />
          ) : (
          <div className="space-y-4 animate-in fade-in">
            {/* Header when groups exist */}
            {groups.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>Office Groups</span>
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {groups.length}
                    </span>
                  </h2>
                  <p className="text-[11px] text-stone-400">
                    Your teams &amp; tea break clubs
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setJoinGroupIdInput('')
                      setJoinGroupError(null)
                      setShowJoinGroupModal(true)
                    }}
                    id="join-group-header-btn"
                    className="px-2.5 py-1.5 rounded-xl font-semibold text-xs border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 bg-stone-50 dark:bg-stone-800 shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Join</span>
                  </button>

                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    id="create-group-header-btn"
                    className="px-2.5 py-1.5 rounded-xl font-semibold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading or Empty State: If groups are fetching or none found */}
            {isLoadingGroups && groups.length === 0 ? (
              <GroupCardSkeleton count={3} />
            ) : groups.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 text-center space-y-4 my-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100">
                    No Groups Found
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
                    You haven't joined or created any groups yet. Create a group or join using a Group ID from your colleague!
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    id="create-new-group-empty-btn"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
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
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs border border-stone-300 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 bg-stone-50 dark:bg-stone-800 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Join with Group ID</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Groups List */
              <div className="space-y-3">
                {groups.map(group => {
                  const isActive = group.id === activeGroupId || (!activeGroupId && group === groups[0])
                  const isGroupBreakActive = Boolean(
                    activeSession && (
                      activeSession.groupId === group.id ||
                      (!activeSession.groupId && (activeSession.shopName === group.shopName || group.id === 'group-eng-fl3'))
                    )
                  )
                  return (
                    <div
                      key={group.id}
                      onClick={() => {
                        setActiveGroupId(group.id)
                        if (isGroupBreakActive) {
                          setViewingBreakGroupId(group.id)
                        } else {
                          setViewingGroupId(group.id)
                        }
                      }}
                      className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                        isGroupBreakActive
                          ? 'bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-transparent border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : isActive
                          ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/60 ring-1 ring-amber-500/30 dark:bg-amber-950/20'
                          : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                      } shadow-2xs space-y-3`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-heading font-extrabold text-sm text-stone-900 dark:text-stone-100">
                              {group.name}
                            </h3>
                            {isGroupBreakActive && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white animate-pulse flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>Live Break ☕</span>
                              </span>
                            )}
                            {isActive && !isGroupBreakActive && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-600 text-white">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 flex-wrap">
                            {group.shopName && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-100/90 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-semibold text-[10px]">
                                <span>{group.shopEmoji || '🏪'}</span>
                                <span>{group.shopName}</span>
                              </span>
                            )}
                            <span>
                              {group.members?.length || 1}{' '}
                              {group.members?.length === 1 ? 'member' : 'members'}
                            </span>
                          </p>
                        </div>

                        {group.adminId === user?.id && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteGroup(group.id, e)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete group (Admin only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Direct button to separate Tea Break page when active */}
                      {isGroupBreakActive && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveGroupId(group.id)
                              setViewingBreakGroupId(group.id)
                            }}
                            id={`enter-break-btn-${group.id}`}
                            className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 transition-all"
                          >
                            <Coffee className="w-3.5 h-3.5" />
                            <span>Enter Tea Break ☕ →</span>
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800 text-xs gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                            Group ID:
                          </span>
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-900/50">
                            {group.code || group.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveGroupId(group.id)
                              setViewingGroupId(group.id)
                            }}
                            className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Users className="w-3 h-3 text-amber-600" />
                            <span>Group Info</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(group.code || group.id, `${group.name} Group ID`)
                            }}
                            className="px-2 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-stone-600 dark:text-stone-300 hover:text-amber-800 dark:hover:text-amber-200 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy ID</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="py-2.5 px-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Group</span>
                  </button>
                  <button
                    onClick={() => {
                      setJoinGroupIdInput('')
                      setJoinGroupError(null)
                      setShowJoinGroupModal(true)
                    }}
                    className="py-2.5 px-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 hover:border-amber-500 dark:hover:border-amber-500 text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 font-semibold text-xs flex items-center justify-center gap-1.5 bg-stone-50/50 dark:bg-stone-800/30 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Join Group</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )
        )}

        {/* -------------------- 3. SHOPS TAB (with New Page for items) -------------------- */}
        {activeTab === 'shops' && (
          viewingShopItems ? (
            /* Dedicated New Page for Shop Menu Items */
            <ShopItemsPage
              shop={viewingShopItems}
              onBack={() => setViewingShopItems(null)}
              onDeleteShop={(shop) => handleDeleteShop(shop.id, shop.name)}
            />
          ) : (
            /* Shops List */
            <div className="space-y-4 animate-in fade-in">
              {/* Header */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between">
                <h2 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-600" />
                  <span>Shops</span>
                </h2>

                <button
                  onClick={() => setShowAddShopModal(true)}
                  className="px-2.5 py-1.5 rounded-xl font-semibold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Shop</span>
                </button>
              </div>

              {/* Shop Cards */}
              {isLoadingShops && shops.length === 0 ? (
                <ShopCardSkeleton count={3} />
              ) : shops.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 text-stone-500 text-xs space-y-3">
                  <span className="text-3xl block">🏪</span>
                  <p className="font-semibold text-stone-700 dark:text-stone-300">No shops available</p>
                  <p className="text-[11px] text-stone-400">Add your favorite chai tapri or cafe to get started.</p>
                  <button
                    onClick={() => setShowAddShopModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Shop</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {shops.map(shop => (
                    <div
                      key={shop.id}
                      id={`shop-card-${shop.id}`}
                      onClick={() => setViewingShopItems(shop)}
                      className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3 hover:border-amber-400 dark:hover:border-amber-500/80 hover:shadow-md transition-all cursor-pointer group"
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-900/40 group-hover:scale-105 transition-transform">
                            {shop.emoji}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:text-amber-800 dark:group-hover:text-amber-300 transition-colors">
                                {shop.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                {getMenuItemsForShop(shop.id).length} items
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{shop.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-stone-500 truncate max-w-[190px]">
                          Specialty: <strong className="text-stone-700 dark:text-stone-300">{shop.specialty}</strong>
                        </span>

                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          <span>View Menu</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* -------------------- 4. HISTORY TAB -------------------- */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Bills History</span>
                </h2>
                <p className="text-[11px] text-stone-400">
                  Archived tea breaks &amp; payments
                </p>
              </div>

              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                Total: ₹{totalHistorySpent}
              </span>
            </div>

            {/* List */}
            {pastSessions.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-stone-400 text-xs">
                No past settled sessions yet. Settle an active session to see it archived here!
              </div>
            ) : (
              <div className="space-y-3">
                {pastSessions.map(sess => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-bold text-stone-900 dark:text-stone-100 text-sm">
                          {sess.title}
                        </h3>
                        <p className="text-[11px] text-stone-400">
                          {sess.shopName} • {sess.createdAt}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                        ₹{sess.totalAmount}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px]">
                      <div className="text-stone-500 mb-1">
                        Paid by <strong className="text-stone-800 dark:text-stone-200">{sess.payerName}</strong>:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {sess.expenses.map(e => (
                          <span
                            key={e.memberId}
                            className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[10px]"
                          >
                            {e.memberName}: ₹{e.total}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* -------------------- BOTTOM NAVIGATION BAR -------------------- */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setViewingShopItems(null)
          setViewingGroupId(null)
          setViewingBreakGroupId(null)
          setActiveTab(tab)
        }}
        historyCount={pastSessions.length}
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
                  <span>👥</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Form a tea club to track and split expenses
                </p>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Group Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chai Pe Charcha, Floor 4 Tech Club"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Option to select shop from the shop page - single selection only */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Select Shop <span className="text-amber-600">*</span>
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">
                    (Select 1 shop from Shops page)
                  </span>
                </div>

                {shops.length > 0 ? (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {shops.map(shop => {
                      const isSelected = (selectedShopId || shops[0]?.id) === shop.id
                      return (
                        <button
                          type="button"
                          key={shop.id}
                          onClick={() => setSelectedShopId(shop.id)}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/40 ring-1 ring-amber-500 shadow-2xs'
                              : 'border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">{shop.emoji || '🏪'}</span>
                            <div className="truncate">
                              <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate flex items-center gap-1.5">
                                <span>{shop.name}</span>
                                {isSelected && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-600 text-white">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                {shop.location}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-all ${
                              isSelected
                                ? 'border-amber-600 bg-amber-600 text-white'
                                : 'border-stone-300 dark:border-stone-600'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-stone-400 border border-dashed rounded-xl">
                    No shops found in shops page
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  <span>🔑</span>
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-join-group-btn"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs active:scale-95 transition-all flex items-center gap-1"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Join Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Shop in Shops */}
      {showAddShopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                Add Tea Stall or Shop 🏪
              </h3>
              <button
                onClick={() => setShowAddShopModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddShop} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Tapri Point"
                  value={newShopName}
                  onChange={e => setNewShopName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Parking Lot Gate"
                  value={newShopLocation}
                  onChange={e => setNewShopLocation(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Specialty
                  </label>
                  <input
                    type="text"
                    placeholder="Cutting Chai"
                    value={newShopSpecialty}
                    onChange={e => setNewShopSpecialty(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Emoji
                  </label>
                  <select
                    value={newShopEmoji}
                    onChange={e => setNewShopEmoji(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none"
                  >
                    <option value="☕">☕ Chai</option>
                    <option value="🍞">🍞 Bun Maska</option>
                    <option value="🥟">🥟 Samosa</option>
                    <option value="🥪">🥪 Sandwich</option>
                    <option value="🥤">🥤 Cold Drink</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddShopModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  Save Shop
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
                  Add Item to Menu ☕
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Icon Emoji
                </label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['☕', '🍵', '🥟', '🍞', '🥪', '🍪', '🧆', '🥤', '🫓', '🍛'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCustomItemEmoji(emoji)}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                        customItemEmoji === emoji
                          ? 'bg-amber-600 text-white scale-110 shadow-xs ring-2 ring-amber-400'
                          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="save-menu-item-submit-btn"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
