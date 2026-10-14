import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Coffee,
  Copy,
  Crown,
  Edit2,
  Flame,
  LogOut,
  Plus,
  Receipt,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react'
import React, { useState, useMemo } from 'react'
import { useExpense } from '../context/ExpenseContext'
import { supabase } from '../lib/supabase'
import { ChaiLoader } from '../components/ChaiLoader'
import type { Group, User, MenuItem } from '../types'
import { TeaBreakPage } from './TeaBreakPage'
import { HistoryPage } from './HistoryPage'

interface GroupDetailsPageProps {
  group: Group
  currentUser: User | null
  allUsers: User[]
  onBack: () => void
  onOpenBreak?: (groupId: string) => void
  onUpdateGroup: (updatedGroup: Group) => void
  onExitGroup: (groupId: string) => void
  onDeleteGroup?: (groupId: string) => void
}

export const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({
  group,
  currentUser,
  allUsers,
  onBack,
  onOpenBreak,
  onUpdateGroup,
  onExitGroup,
  onDeleteGroup
}) => {
  const {
    activeSession,
    getActiveSessionForGroup,
    addNewSession,
    menuItems,
    addCustomMenuItem,
    updateMenuItemPrice,
    deleteMenuItem
  } = useExpense()

  // Navigation states
  const [showMembersPage, setShowMembersPage] = useState(false)
  const [showTeaBreakView, setShowTeaBreakView] = useState(false)
  const [showGroupHistory, setShowGroupHistory] = useState(false)

  // Modals & form states
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [memberUniqueIdInput, setMemberUniqueIdInput] = useState('')
  const [addMemberError, setAddMemberError] = useState<string | null>(null)
  const [isSubmittingMember, setIsSubmittingMember] = useState(false)
  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [breakTitleInput, setBreakTitleInput] = useState(`${group.name} Chai Break ☕`)
  const [isStartingBreak, setIsStartingBreak] = useState(false)

  // Shop Menu Items State for this group
  const effectiveShopId = group.shopId || `shop-${group.id}`
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('15')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editPriceInput, setEditPriceInput] = useState('')
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const groupShopItems = useMemo(() => {
    const targetShopId = group.shopId || `shop-${group.id}`
    return menuItems.filter(i => i.shopId === targetShopId)
  }, [group.shopId, group.id, menuItems])

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return
    const priceNum = Math.max(0, Math.round(parseFloat(newItemPrice) || 15))
    await addCustomMenuItem(newItemName.trim(), priceNum, '☕', 'tea', effectiveShopId)
    setNewItemName('')
    setNewItemPrice('15')
    setShowAddItemModal(false)
    showToast(`Added "${newItemName.trim()}" (₹${priceNum}) to shop menu!`)
  }

  const handleSaveEditPrice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    const priceNum = Math.max(0, Math.round(parseFloat(editPriceInput) || 15))
    await updateMenuItemPrice(editingItem.id, priceNum)
    setEditingItem(null)
    showToast(`Updated "${editingItem.name}" price to ₹${priceNum}!`)
  }

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete || isDeletingItem) return
    setIsDeletingItem(true)
    const itemName = itemToDelete.name
    try {
      const success = await deleteMenuItem(itemToDelete.id)
      if (success) {
        showToast(`Removed "${itemName}" from shop menu`)
      } else {
        showToast(`Could not remove "${itemName}". Please try again.`)
      }
    } catch {
      showToast(`Error removing "${itemName}"`)
    } finally {
      setIsDeletingItem(false)
      setItemToDelete(null)
    }
  }

  const cleanInput = memberUniqueIdInput.trim()
  const matchedUser = cleanInput
    ? allUsers.find(
        u =>
          (u.userCode && u.userCode.toUpperCase() === cleanInput.toUpperCase()) ||
          u.id.toLowerCase() === cleanInput.toLowerCase()
      ) ||
      (currentUser &&
      ((currentUser.userCode && currentUser.userCode.toUpperCase() === cleanInput.toUpperCase()) ||
        currentUser.id.toLowerCase() === cleanInput.toLowerCase())
        ? currentUser
        : null)
    : null

  const isMatchedAlreadyMember = matchedUser ? group.members.some(m => m.id === matchedUser.id) : false

  const showToast = (msg: string) => {
    setToastNotice(msg)
    setTimeout(() => setToastNotice(null), 3000)
  }

  // Determine group admin (strictly group admin or initial group creator)
  const effectiveAdminId = group.adminId || group.members[0]?.id
  const isAdmin = Boolean(currentUser && currentUser.id === effectiveAdminId)

  // Determine if there is an active session specifically for this group
  const groupActiveSession = (group?.id ? getActiveSessionForGroup(group.id) : null) || (activeSession?.groupId === group.id ? activeSession : null)
  const isGroupBreakActive = Boolean(groupActiveSession && groupActiveSession.status === 'active')

  // Colleagues who are not yet members
  const existingMemberIds = new Set(group.members.map(m => m.id))
  const nonMemberColleagues = allUsers.filter(u => !existingMemberIds.has(u.id))

  // Total items in break
  const totalSessionItemCount = groupActiveSession?.expenses.reduce(
    (acc, exp) => acc + exp.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  ) || 0

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`Copied ${label} to clipboard!`)
  }

  // Remove a member (strictly admin only, from members page)
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!isAdmin) {
      showToast('Only the group admin can remove members from the group.')
      return
    }
    const updatedMembers = group.members.filter(m => m.id !== memberId)
    const updatedGroup: Group = {
      ...group,
      members: updatedMembers
    }
    onUpdateGroup(updatedGroup)
    if (supabase) {
      try {
        await supabase
          .from('group_members')
          .delete()
          .eq('group_id', group.id)
          .eq('user_id', memberId)
      } catch (err) {
        console.warn('Failed to remove member from Supabase:', err)
      }
    }
    showToast(`Removed ${memberName} from group`)
  }

  // Add existing colleague
  const handleAddExistingUser = async (colleague: User) => {
    const updatedMembers = [...group.members, colleague]
    const updatedGroup: Group = {
      ...group,
      members: updatedMembers
    }
    onUpdateGroup(updatedGroup)
    if (supabase) {
      try {
        // Ensure profile exists so foreign key constraint never fails
        await supabase.from('profiles').upsert({
          id: colleague.id,
          name: colleague.name,
          email: colleague.email || `${colleague.id}@team.chaisplit.internal`,
          avatar: colleague.avatar || '👤',
          team_name: colleague.teamName || group.name,
          user_code: colleague.userCode
        }, { onConflict: 'id' })

        await supabase.from('group_members').upsert({
          group_id: group.id,
          user_id: colleague.id
        }, { onConflict: 'group_id,user_id' })
      } catch (err) {
        console.warn('Failed to add member to Supabase:', err)
      }
    }
    showToast(`Added ${colleague.name} to group!`)
  }

  // Add member by Unique ID (not name and email)
  const handleAddMemberByUniqueId = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanId = memberUniqueIdInput.trim()
    if (!cleanId) return

    setAddMemberError(null)
    setIsSubmittingMember(true)

    try {
      // 1. Check if already in group
      const alreadyInGroup = group.members.find(
        m =>
          (m.userCode && m.userCode.toUpperCase() === cleanId.toUpperCase()) ||
          m.id.toLowerCase() === cleanId.toLowerCase()
      )
      if (alreadyInGroup) {
        setAddMemberError(
          `${alreadyInGroup.name} (${alreadyInGroup.userCode || alreadyInGroup.id}) is already in this group!`
        )
        setIsSubmittingMember(false)
        return
      }

      // 2. Search locally across allUsers & currentUser
      let foundUser: User | undefined = allUsers.find(
        u =>
          (u.userCode && u.userCode.toUpperCase() === cleanId.toUpperCase()) ||
          u.id.toLowerCase() === cleanId.toLowerCase()
      )
      if (!foundUser && currentUser) {
        if (
          (currentUser.userCode && currentUser.userCode.toUpperCase() === cleanId.toUpperCase()) ||
          currentUser.id.toLowerCase() === cleanId.toLowerCase()
        ) {
          foundUser = currentUser
        }
      }

      // 3. Search Supabase profiles table if online
      if (!foundUser && supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`user_code.ilike.${cleanId},id.eq.${cleanId}`)
            .maybeSingle()

          if (!error && data) {
            foundUser = {
              id: data.id,
              name: data.name,
              email: data.email,
              avatar: data.avatar || '👤',
              teamName: data.team_name || group.name,
              userCode: data.user_code || cleanId.toUpperCase()
            }
          }
        } catch (dbErr) {
          console.warn('Error querying profile by unique id:', dbErr)
        }
      }

      // 4. Resolve member to add
      const memberToAdd: User = foundUser || {
        id: `user-${cleanId.toLowerCase().replace(/[^a-z0-9_-]/g, '') || Date.now()}`,
        name: `Member (${cleanId.toUpperCase()})`,
        email: `${cleanId.toLowerCase()}@team.chaisplit.internal`,
        avatar: cleanId.slice(0, 2).toUpperCase(),
        teamName: group.name,
        userCode: cleanId.toUpperCase()
      }

      // 5. Update local group state
      const updatedMembers = [...group.members, memberToAdd]
      const updatedGroup: Group = {
        ...group,
        members: updatedMembers
      }
      onUpdateGroup(updatedGroup)

      // 6. Sync with Supabase if online
      if (supabase) {
        try {
          // Upsert profiles
          await supabase.from('profiles').upsert(
            {
              id: memberToAdd.id,
              name: memberToAdd.name,
              email: memberToAdd.email,
              avatar: memberToAdd.avatar || '👤',
              team_name: memberToAdd.teamName || group.name,
              user_code: memberToAdd.userCode
            },
            { onConflict: 'id' }
          )

          // Upsert into group_members
          await supabase.from('group_members').upsert({
            group_id: group.id,
            user_id: memberToAdd.id
          }, { onConflict: 'group_id,user_id' })
        } catch (syncErr) {
          console.warn('Failed to sync group member to Supabase:', syncErr)
        }
      }

      setMemberUniqueIdInput('')
      setShowAddUserModal(false)
      showToast(`Added ${memberToAdd.name} (${memberToAdd.userCode || memberToAdd.id}) to group! 🎉`)
    } catch (err: any) {
      setAddMemberError(err?.message || 'Failed to add member by Unique ID')
    } finally {
      setIsSubmittingMember(false)
    }
  }

  // Any member can start a break for this group if there is no ongoing break in this group
  const handleStartBreak = () => {
    if (isStartingBreak) return

    // Enforce: at a time a single group can only have 1 active break
    if (isGroupBreakActive) {
      showToast('A break is already active for this group! Close the ongoing break first.')
      return
    }

    setIsStartingBreak(true)
    const title = breakTitleInput.trim() || `${group.name} Chai Break ☕`
    const success = addNewSession(
      title,
      group.shopName || 'Chayakkada',
      group.members,
      group.id,
      group.name,
      currentUser?.id,
      group.shopId,
      currentUser?.id,
      currentUser?.name
    )

    if (!success) {
      showToast('Cannot start break: this group already has an ongoing break! Close it first.')
      setIsStartingBreak(false)
      return
    }

    setTimeout(() => {
      setIsStartingBreak(false)
      if (onOpenBreak) {
        onOpenBreak(group.id)
      } else {
        setShowTeaBreakView(true)
      }
    }, 350)
  }

  // =========================================================================
  // VIEW 1: SEPARATE DEDICATED TEA BREAK PAGE (NO GROUP DETAILS SHOWN HERE)
  // =========================================================================
  if (showTeaBreakView && isGroupBreakActive) {
    return (
      <TeaBreakPage
        group={group}
        currentUser={currentUser}
        onBack={() => setShowTeaBreakView(false)}
      />
    )
  }

  if (showGroupHistory) {
    return (
      <div className="space-y-4 animate-in fade-in pb-16">
        <HistoryPage
          groups={[group]}
          currentUser={currentUser}
          initialGroupId={group.id}
          onBack={() => setShowGroupHistory(false)}
        />
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

      {/* ========================================================================= */}
      {/* VIEW 2: DEDICATED MEMBERS VIEW (OPENED VIA "VIEW MEMBERS" BUTTON)         */}
      {/* ========================================================================= */}
      {showMembersPage ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Bar on Members Page */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <button
              onClick={() => setShowMembersPage(false)}
              id="back-to-group-from-members-btn"
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Group</span>
            </button>

            <span className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span>{group.members.length} Members</span>
            </span>
          </div>

          {/* Members Overview & Add Member Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Group Members</span>
                </h2>
                <p className="text-[11px] text-stone-400">
                  {isAdmin
                    ? '👑 You are Admin • You can add or remove members'
                    : `Colleagues in ${group.name}`}
                </p>
              </div>

              {/* Add Member Button - Strictly located on this page */}
              <button
                onClick={() => setShowAddUserModal(true)}
                id="add-member-page-btn"
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>

            {/* List of Members */}
            <div className="divide-y divide-stone-100 dark:divide-stone-800 pt-1">
              {group.members.map(member => {
                const isCurrentUser = member.id === currentUser?.id
                const isMemberAdmin = member.id === effectiveAdminId

                return (
                  <div key={member.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {member.avatar || member.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {member.name}
                          </span>

                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                              You
                            </span>
                          )}

                          {isMemberAdmin && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5 fill-emerald-700" />
                              <span>Admin</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/50 dark:border-amber-900/40">
                            ID: {member.userCode || member.id}
                          </span>
                          {member.email && (
                            <span className="truncate text-stone-400 hidden sm:inline">
                              • {member.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* ONLY THE ADMIN CAN SEE REMOVE USER - Strictly on this page */}
                      {isAdmin && !isCurrentUser && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          id={`remove-user-${member.id}`}
                          className="px-2.5 py-1 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                          title={`Remove ${member.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* EXIT / DELETE GROUP SECTION - Strictly located on this page */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  {isAdmin ? `Delete ${group.name}` : `Leave ${group.name}`}
                </div>
                <div className="text-[10px] text-stone-400">
                  {isAdmin ? 'Permanently delete this group (Admin only)' : 'Exit from this tea group'}
                </div>
              </div>
            </div>

            {isAdmin && onDeleteGroup ? (
              <button
                type="button"
                onClick={() => onDeleteGroup(group.id)}
                id="delete-group-members-page-btn"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Group</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onExitGroup(group.id)}
                id="exit-group-members-page-btn"
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Exit group directly"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit from Group</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 3: MAIN GROUP DETAILS VIEW (BANNER + SEPARATE BREAK LAUNCHER)        */
        /* ========================================================================= */
        <div className="space-y-4 animate-in fade-in">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs">
            <button
              onClick={onBack}
              id="back-to-groups-btn"
              className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Groups</span>
            </button>

            <span className="text-[11px] font-semibold text-stone-400">
              Tea Club Details
            </span>
          </div>

          {/* Group Info Header Card with "View Members" button after member count */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 text-white shadow-md space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Tea Club
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                      <Crown className="w-3 h-3 fill-stone-950" />
                      <span>Admin</span>
                    </span>
                  )}
                  {isGroupBreakActive && (
                    <span className="text-[10px] font-bold bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Flame className="w-3 h-3 fill-emerald-950" />
                      <span>Live Break</span>
                    </span>
                  )}
                </div>
                <h2 className="font-heading font-extrabold text-xl mt-1">
                  {group.name}
                </h2>
              </div>

              <button
                onClick={() => handleCopy(group.code || group.id, 'Group ID')}
                className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Copy className="w-3 h-3" />
                <span>ID: {group.code || group.id}</span>
              </button>
            </div>

            {/* Banner bottom row with member count and "View Members" button right after it */}
            <div className="flex items-center justify-between pt-2 border-t border-white/20 text-xs text-amber-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {group.shopName && (
                  <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-md text-[11px]">
                    <span>{group.shopEmoji || '🏪'}</span>
                    <span>Shop: {group.shopName}</span>
                  </span>
                )}
                <span>•</span>
                <span className="font-semibold">
                  {group.members.length} {group.members.length === 1 ? 'Colleague' : 'Colleagues'}
                </span>
              </div>

              {/* BUTTONS: HISTORY AND VIEW MEMBERS */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setShowGroupHistory(true)}
                  id="view-group-history-banner-btn"
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white active:scale-95 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-200" />
                  <span>History</span>
                </button>
                <button
                  onClick={() => setShowMembersPage(true)}
                  id="view-members-banner-btn"
                  className="px-2.5 py-1 rounded-xl bg-white text-stone-900 hover:bg-amber-50 active:scale-95 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>View Members</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TEA BREAK LAUNCHER (CLEAN & SEPARATE)                                     */}
          {/* ========================================================================= */}
          {isGroupBreakActive ? (
            /* IF BREAK IS ACTIVE: Clean card directing to the separate Break Section */
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/40 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                      Live Tea Break in Progress
                    </span>
                  </div>
                  <h3 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100">
                    {groupActiveSession?.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    📍 {groupActiveSession?.shopName} • {totalSessionItemCount} items • <strong className="text-stone-800 dark:text-stone-200">₹{groupActiveSession?.totalAmount}</strong>
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <Coffee className="w-5 h-5" />
                </div>
              </div>

              {/* Ongoing break single-break enforcement notice */}
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>Ongoing break in progress. Close or settle this break before creating a new one.</span>
              </div>

              <button
                onClick={() => {
                  if (onOpenBreak) {
                    onOpenBreak(group.id)
                  } else {
                    setShowTeaBreakView(true)
                  }
                }}
                id="enter-tea-break-btn"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Enter Tea Break &amp; Order Items ☕</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* IF BREAK IS NOT ACTIVE: ANYONE IN THE GROUP CAN CREATE A BREAK */
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                    Start a New Tea Break
                  </span>
                </div>
                <span className="text-[10px] text-stone-400">
                  Anyone can start a break
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-700 dark:text-stone-300">
                  Break Title
                </label>
                <input
                  type="text"
                  value={breakTitleInput}
                  onChange={e => setBreakTitleInput(e.target.value)}
                  placeholder="e.g. 4:30 PM Chai Break ☕"
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              <button
                onClick={handleStartBreak}
                disabled={isStartingBreak}
                id="start-tea-break-btn"
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 disabled:opacity-80 disabled:cursor-wait text-white shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isStartingBreak ? (
                  <ChaiLoader variant="spinner" size="sm" text="Starting Tea Break..." />
                ) : (
                  <>
                    <Coffee className="w-4 h-4" />
                    <span>Start Tea Break ☕</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SHOP & MENU ITEMS SECTION (MANAGE GROUP TAPRI MENU)                      */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-heading font-extrabold text-base text-stone-900 dark:text-stone-100 flex items-center gap-2 truncate">
                  <span className="text-xl">{group.shopEmoji || '🏪'}</span>
                  <span className="truncate">{group.shopName || 'Tapri'} Menu</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  {groupShopItems.length} {groupShopItems.length === 1 ? 'item' : 'items'} available for chai breaks
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddItemModal(true)}
                id="add-shop-item-btn"
                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Menu Items Simple List */}
            {groupShopItems.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 text-center space-y-2 bg-stone-50/50 dark:bg-stone-800/30">
                <p className="font-bold text-xs text-stone-800 dark:text-stone-200">
                  No Menu Items Added Yet
                </p>
                <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                  Add items to {group.shopName || 'this shop'} so members can order easily.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Item</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {groupShopItems.map(item => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 flex items-center justify-between gap-3 hover:border-amber-400 dark:hover:border-amber-500/50 transition-all"
                  >
                    {/* Item Name Only (No images/emojis) */}
                    <div className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate min-w-0">
                      {item.name}
                    </div>

                    {/* Price, Edit Price, Remove Item */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100/90 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 font-bold text-xs">
                        ₹{item.price}
                      </span>

                      {/* Edit Price Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(item)
                          setEditPriceInput(item.price.toString())
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-stone-200/60 dark:hover:bg-stone-700 transition-colors cursor-pointer"
                        title="Edit price"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove Item Button */}
                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                   */}
      {/* ========================================================================= */}

      {/* Modal: Add Member to Group by Unique ID */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                  <span>Add Member to Group</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Add member to {group.name} using their Unique ID
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setAddMemberError(null)
                  setMemberUniqueIdInput('')
                }}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Unique ID Form */}
            <form onSubmit={handleAddMemberByUniqueId} className="space-y-3 pt-1 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>Member Unique ID / User Code</span>
                  <span className="text-[10px] text-amber-600 font-normal">e.g. JOHN4821</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter Unique ID (e.g. JOHN4821)"
                  value={memberUniqueIdInput}
                  onChange={e => {
                    setMemberUniqueIdInput(e.target.value)
                    if (addMemberError) setAddMemberError(null)
                  }}
                  className="w-full py-2.5 px-3.5 uppercase font-mono tracking-wider rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-stone-400 leading-tight">
                  Colleagues can find their Unique ID in the Profile menu (top right).
                </p>
              </div>

              {/* Matched user preview */}
              {matchedUser && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                    isMatchedAlreadyMember
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {matchedUser.avatar || matchedUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {matchedUser.name}
                      </div>
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                        ID: {matchedUser.userCode || matchedUser.id}
                      </div>
                    </div>
                  </div>
                  {isMatchedAlreadyMember ? (
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 shrink-0">
                      Already in group
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>
              )}

              {/* Error display */}
              {addMemberError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addMemberError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false)
                    setAddMemberError(null)
                    setMemberUniqueIdInput('')
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMember || !cleanInput || isMatchedAlreadyMember}
                  id="submit-add-member-by-id-btn"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  {isSubmittingMember ? (
                    <ChaiLoader variant="spinner" size="sm" text="Adding..." />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick add from office colleagues with UNIQUE IDs */}
            {nonMemberColleagues.length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-stone-100 dark:border-stone-800">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 block">
                  Or Quick Add Teammate by ID
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 divide-y divide-stone-100 dark:divide-stone-800">
                  {nonMemberColleagues.map(colleague => (
                    <div
                      key={colleague.id}
                      className="pt-1.5 pb-1 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {colleague.avatar || colleague.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                            {colleague.name}
                          </div>
                          <div className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 truncate">
                            ID: {colleague.userCode || colleague.id}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddExistingUser(colleague)}
                        className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200/60 dark:border-amber-900/60 cursor-pointer active:scale-95 transition-all shrink-0"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Item to Shop Menu */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                  Add Item to Menu
                </h3>
                <p className="text-[11px] text-stone-400">
                  Add to {group.shopName || 'Tapri'} for this group
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddItemModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Item Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Chai, Coffee, Samosa, Biscuit"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Price (₹) <span className="text-amber-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="15"
                  value={newItemPrice}
                  onChange={e => setNewItemPrice(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-add-shop-item-btn"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Menu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Item Price */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                Edit Price: {editingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPrice} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  New Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  autoFocus
                  value={editPriceInput}
                  onChange={e => setEditPriceInput(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Item */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xs bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-3.5 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-lg">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h4 className="font-heading font-bold text-sm text-stone-900 dark:text-stone-100">
                Remove "{itemToDelete.name}"?
              </h4>
              <p className="text-[11px] text-stone-400">
                This item will be removed immediately from {group.shopName || 'this shop'} menu.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={handleConfirmDeleteItem}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center min-w-24"
              >
                {isDeletingItem ? 'Removing...' : 'Remove Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
