import React, { useState, useEffect, useMemo } from 'react'
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
  Users,
  Store,
  Trash2,
  KeyRound,
  Search
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

interface DashboardProps {
  onNavigate?: (page: PageRoute) => void
}

export const Dashboard: React.FC<DashboardProps> = () => {
  const { user, allUsers } = useAuth()
  const {
    activeSession,
    activeSessions,
    getActiveSessionForGroup,
    pastSessions,
    menuItems,
    addItemToMember,
    removeItemFromMember,
    toggleMemberPaid,
    settleActiveSession,
    addMemberToSession,
    addCustomMenuItem,
    getShopItemSummary,
    generateWhatsAppSummary
  } = useExpense()

  // Navigation tab state (Home is the default home tab)
  const [activeTab, setActiveTab] = useState<BottomTab>('home')

  // Search filter for groups
  const [groupSearchQuery, setGroupSearchQuery] = useState('')

  // Modals & form state
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [customItemName, setCustomItemName] = useState('')
  const [customItemPrice, setCustomItemPrice] = useState('20')
  const [customItemEmoji, setCustomItemEmoji] = useState('☕')
  const [selectedMemberForQuickAdd, setSelectedMemberForQuickAdd] = useState<string>('')
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  // Create Group form states (Group Name + Shop Name + Emoji)
  const [newGroupShopName, setNewGroupShopName] = useState('')
  const [newGroupShopEmoji, setNewGroupShopEmoji] = useState('☕')
  const [includeStarterMenu, setIncludeStarterMenu] = useState(true)


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
            const isAdmin = g.admin_id === user.id || (user.email && allUsers.some(u => u.id === g.admin_id && u.email.toLowerCase() === user.email.toLowerCase()))
            const isMember = groupMemberRows.some(r => r.group_id === g.id && (r.user_id === user.id || (user.email && allUsers.some(u => u.id === r.user_id && u.email.toLowerCase() === user.email.toLowerCase()))))
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

          // Merge with locally created groups for this user to guarantee persistence across refresh
          let localGroups: Group[] = []
          try {
            const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
            if (saved) localGroups = JSON.parse(saved)
          } catch {}

          const groupMap = new Map<string, Group>()
          localGroups.forEach(lg => {
            if (lg.adminId === user.id || lg.members?.some(m => m.id === user.id)) {
              groupMap.set(lg.id, lg)
            }
          })
          mappedGroups.forEach(mg => groupMap.set(mg.id, mg))

          const finalGroups = Array.from(groupMap.values())
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
  }, [allUsers, user?.id])

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
            const isAdmin = g.admin_id === user.id || (user.email && allUsers.some(u => u.id === g.admin_id && u.email.toLowerCase() === user.email.toLowerCase()))
            const isMember = groupMemberRows.some(r => r.group_id === g.id && (r.user_id === user.id || (user.email && allUsers.some(u => u.id === r.user_id && u.email.toLowerCase() === user.email.toLowerCase()))))
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

          // Merge with locally stored groups to prevent member disappearance during active editing
          let localGroups: Group[] = []
          try {
            const saved = localStorage.getItem(`chaisplit_groups_user_${user.id}`)
            if (saved) localGroups = JSON.parse(saved)
          } catch {}

          const groupMap = new Map<string, Group>()
          localGroups.forEach(lg => {
            if (lg.adminId === user.id || lg.members?.some(m => m.id === user.id)) {
              groupMap.set(lg.id, lg)
            }
          })
          mappedGroups.forEach(mg => groupMap.set(mg.id, mg))

          const finalGroups = Array.from(groupMap.values())
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
        if (payload?.group) {
          setGroups(prev => {
            const exists = prev.some(g => g.id === payload.group.id)
            if (exists) {
              return prev.map(g => g.id === payload.group.id ? payload.group : g)
            }
            return [payload.group, ...prev]
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

  // Handle create new group with dedicated Shop Name & Starter Menu
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim() || !user) return

    const generatedGroupId = `GRP-${Math.floor(1000 + Math.random() * 9000)}`
    const shopName = newGroupShopName.trim() || `${newGroupName.trim()} Tapri`
    const shopEmoji = newGroupShopEmoji || '☕'
    const newShopId = `shop-${Date.now()}`

    const newShop: Shop = {
      id: newShopId,
      name: shopName,
      location: 'Local Tapri',
      specialty: 'Chai & Snacks',
      rating: 4.8,
      emoji: shopEmoji
    }

    const starterItems: MenuItem[] = includeStarterMenu
      ? [
          { id: `${newShopId}-1`, name: 'Chaya', price: 12, category: 'tea', emoji: '☕', shopId: newShopId, description: 'Hot naadan chaya' },
          { id: `${newShopId}-2`, name: 'Coffee', price: 12, category: 'coffee', emoji: '☕', shopId: newShopId, description: 'Hot filter coffee' },
          { id: `${newShopId}-3`, name: 'Samoza', price: 12, category: 'snacks', emoji: '🥟', shopId: newShopId, description: 'Crispy hot samoza' },
          { id: `${newShopId}-4`, name: 'Omlette', price: 20, category: 'snacks', emoji: '🍳', shopId: newShopId, description: 'Fresh double egg omlette' },
          { id: `${newShopId}-5`, name: 'Dosha', price: 12, category: 'snacks', emoji: '🥞', shopId: newShopId, description: 'Hot crisp dosha' },
          { id: `${newShopId}-6`, name: 'Porotta', price: 12, category: 'snacks', emoji: '🫓', shopId: newShopId, description: 'Kerala layered porotta' },
          { id: `${newShopId}-7`, name: 'Puzhungiya Motta', price: 10, category: 'snacks', emoji: '🥚', shopId: newShopId, description: 'Boiled egg' },
          { id: `${newShopId}-8`, name: "Bull's Eye", price: 10, category: 'snacks', emoji: '🍳', shopId: newShopId, description: 'Half-boiled egg bullseye' },
          { id: `${newShopId}-9`, name: 'Puffs', price: 20, category: 'snacks', emoji: '🥐', shopId: newShopId, description: 'Crispy puff' },
          { id: `${newShopId}-10`, name: 'Parippvada', price: 10, category: 'snacks', emoji: '🧆', shopId: newShopId, description: 'Crunchy parippuvada' }
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
      shopEmoji: shopEmoji,
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
    setNewGroupShopEmoji('☕')

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
          avatar: user.avatar || '☕',
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


  // Session menu items for this break
  const filteredMenuItems = useMemo(() => {
    if (activeSession?.shopId) {
      const shopItems = menuItems.filter(item => item.shopId === activeSession.shopId)
      if (shopItems.length > 0) return shopItems
    }
    return menuItems
  }, [activeSession?.shopId, menuItems])

  // Shop breakdown
  const shopItems = getShopItemSummary()
  const bhaiyaShoutLine = shopItems.map(i => `${i.count} ${i.name}`).join(', ')

  // Total collected & pending
  const totalAmount = activeSession?.totalAmount || 0
  const unpaidMembers = activeSession?.expenses.filter(e => !e.isPaid && e.memberId !== activeSession.payerId && e.total > 0) || []
  const paidMembers = activeSession?.expenses.filter(e => e.isPaid && e.memberId !== activeSession.payerId && e.total > 0) || []

  // Target live break to feature on Dashboard top banner (for user's groups)
  const featuredActiveBreak = useMemo(() => {
    if (activeGroup?.id) {
      const gBreak = getActiveSessionForGroup(activeGroup.id)
      if (gBreak && gBreak.status === 'active') return gBreak
    }
    const foundInAny = activeSessions.find(s => s.status === 'active' && groups.some(g => g.id === s.groupId))
    if (foundInAny) return foundInAny
    if (activeSession && activeSession.status === 'active' && groups.some(g => g.id === activeSession.groupId)) {
      return activeSession
    }
    return null
  }, [activeGroup?.id, getActiveSessionForGroup, activeSessions, groups, activeSession])

  // Security check: Only display active session if user is actually in that group
  const isUserInActiveSessionGroup = Boolean(
    activeSession && groups.some(g => g.id === activeSession.groupId)
  )

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

        {/* -------------------- 1. DETAILS TAB (Live Break & Expense Tracking) -------------------- */}
        {activeTab === 'details' && (
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
                        onClick={() => settleActiveSession()}
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
                                    onClick={() => removeItemFromMember(expense.memberId, item.id || item.menuItemId || item.name, activeSession.id)}
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
              }}
              onUpdateGroup={(updatedGroup) => {
                setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
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
            {/* Welcome User Profile Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs text-white font-extrabold text-base flex items-center justify-center shrink-0 border border-white/30 shadow-2xs">
                  {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || '☕'}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-amber-200">
                    ChaiBreak Hub
                  </div>
                  <h2 className="font-heading font-extrabold text-base text-white truncate">
                    Welcome, {user?.name || 'Friend'}! ☕
                  </h2>
                </div>
              </div>

              {user && (
                <button
                  type="button"
                  onClick={() => handleCopy(user.userCode || user.id, 'My Unique ID')}
                  className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-xs cursor-pointer active:scale-95 transition-all shrink-0"
                  title="Click to copy your unique ID for colleagues to add you"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-200" />
                  <span>ID: {user.userCode || user.id}</span>
                </button>
              )}
            </div>

            {/* Live Break Quick Access Banner (if any) */}
            {featuredActiveBreak && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/40 shadow-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                      Live Tea Break in Progress
                    </span>
                  </div>
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate mt-0.5">
                    {featuredActiveBreak.title}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    📍 {featuredActiveBreak.shopName} • Total ₹{featuredActiveBreak.totalAmount}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const targetGroup = groups.find(g => g.id === featuredActiveBreak.groupId) || activeGroup
                    if (targetGroup) {
                      setViewingGroupId(null)
                      setViewingBreakGroupId(targetGroup.id)
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm cursor-pointer active:scale-95 transition-all flex items-center gap-1 shrink-0"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Enter Break ☕</span>
                </button>
              </div>
            )}

            {/* Search Bar & Action Buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={groupSearchQuery}
                    onChange={e => setGroupSearchQuery(e.target.value)}
                    placeholder="Search groups by name, tapri or ID..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  {groupSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGroupSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setJoinGroupIdInput('')
                    setJoinGroupError(null)
                    setShowJoinGroupModal(true)
                  }}
                  id="join-group-search-btn"
                  className="px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-stone-700 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 bg-white dark:bg-stone-900 shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all text-xs font-semibold shrink-0"
                  title="Join Group with Group ID"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>Join</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(true)}
                  id="create-group-search-btn"
                  className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create</span>
                </button>
              </div>
            </div>

            {/* Groups Header */}
            {groups.length > 0 && (
              <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300 px-0.5 pt-1">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>My Tea Groups</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    {filteredGroups.length}
                  </span>
                </span>
                {groupSearchQuery && (
                  <span className="text-[11px] font-normal text-stone-400">
                    Matching "{groupSearchQuery}"
                  </span>
                )}
              </div>
            )}

            {/* Loading / Empty / Filtered List */}
            {isLoadingGroups && groups.length === 0 ? (
              <GroupCardSkeleton count={3} />
            ) : groups.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white dark:bg-stone-900 border border-dashed border-stone-300 dark:border-stone-800 text-center space-y-4 my-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xs">
                  <Users className="w-8 h-8" />
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
            ) : filteredGroups.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-white dark:bg-stone-900 border border-dashed border-stone-200 dark:border-stone-800 space-y-2">
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
                  className="text-xs font-bold text-amber-600 hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Try joining "{groupSearchQuery.toUpperCase()}" with Group ID →</span>
                </button>
              </div>
            ) : (
              /* Groups Cards */
              <div className="space-y-3">
                {filteredGroups.map(group => {
                  const isActive = group.id === activeGroupId || (!activeGroupId && group === groups[0])
                  const groupActiveBreak = (group.id ? getActiveSessionForGroup(group.id) : null) || (activeSession?.groupId === group.id ? activeSession : null)
                  const isGroupBreakActive = Boolean(groupActiveBreak && groupActiveBreak.status === 'active')
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
                            <Store className="w-3 h-3 text-amber-600" />
                            <span>View Group &amp; Menu →</span>
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

        {/* -------------------- 4. REDESIGNED HISTORY TAB -------------------- */}
        {activeTab === 'history' && (
          <HistoryPage groups={groups} currentUser={user} />
        )}

      </div>

      {/* -------------------- BOTTOM NAVIGATION BAR -------------------- */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setViewingGroupId(null)
          setViewingBreakGroupId(null)
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

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-left">
              {/* Group Name */}
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

              {/* Shop / Tapri Name */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Shop / Tapri Name <span className="text-amber-600">*</span>
                  </label>
                  <span className="text-[10px] text-stone-400 font-medium">
                    (Linked directly to this group)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Tapri Point, Ground Floor Pantry"
                  value={newGroupShopName}
                  onChange={e => setNewGroupShopName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Shop Emoji Picker */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Shop Icon
                </label>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {['☕', '🍵', '🥟', '🍞', '🥪', '🥤', '🫓', '🍪'].map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewGroupShopEmoji(emoji)}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center cursor-pointer transition-all ${
                        newGroupShopEmoji === emoji
                          ? 'bg-amber-600 text-white scale-110 shadow-xs ring-2 ring-amber-400'
                          : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
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

              <p className="text-[10px] text-stone-400 italic">
                💡 You can view, add custom items, or modify prices anytime in the Group page.
              </p>

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
