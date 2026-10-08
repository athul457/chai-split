import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coffee,
  Copy,
  Crown,
  Flame,
  LogOut,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react'
import React, { useState } from 'react'
import { useExpense } from '../context/ExpenseContext'
import type { Group, User } from '../types'
import { TeaBreakPage } from './TeaBreakPage'

interface GroupDetailsPageProps {
  group: Group
  currentUser: User | null
  allUsers: User[]
  onBack: () => void
  onOpenBreak?: (groupId: string) => void
  onUpdateGroup: (updatedGroup: Group) => void
  onExitGroup: (groupId: string) => void
}

export const GroupDetailsPage: React.FC<GroupDetailsPageProps> = ({
  group,
  currentUser,
  allUsers,
  onBack,
  onOpenBreak,
  onUpdateGroup,
  onExitGroup
}) => {
  const {
    activeSession,
    addNewSession
  } = useExpense()

  // Navigation states
  const [showMembersPage, setShowMembersPage] = useState(false)
  const [showTeaBreakView, setShowTeaBreakView] = useState(false)

  // Modals & form states
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [toastNotice, setToastNotice] = useState<string | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [breakTitleInput, setBreakTitleInput] = useState(`${group.name} Chai Break ☕`)

  const showToast = (msg: string) => {
    setToastNotice(msg)
    setTimeout(() => setToastNotice(null), 3000)
  }

  // Determine group admin
  const effectiveAdminId = group.adminId || group.members[0]?.id || currentUser?.id
  const isAdmin = currentUser?.id === effectiveAdminId

  // Determine if there is an active session for this group
  const isGroupBreakActive = Boolean(
    activeSession && (
      activeSession.groupId === group.id ||
      (!activeSession.groupId && (activeSession.shopName === group.shopName || group.id === 'group-eng-fl3'))
    )
  )

  // Colleagues who are not yet members
  const existingMemberIds = new Set(group.members.map(m => m.id))
  const nonMemberColleagues = allUsers.filter(u => !existingMemberIds.has(u.id))

  // Total items in break
  const totalSessionItemCount = activeSession?.expenses.reduce(
    (acc, exp) => acc + exp.items.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  ) || 0

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showToast(`Copied ${label} to clipboard!`)
  }

  // Remove a member (strictly admin only, from members page)
  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!isAdmin) return
    const updatedMembers = group.members.filter(m => m.id !== memberId)
    const updatedGroup: Group = {
      ...group,
      members: updatedMembers
    }
    onUpdateGroup(updatedGroup)
    showToast(`Removed ${memberName} from group`)
  }

  // Add existing colleague
  const handleAddExistingUser = (colleague: User) => {
    const updatedMembers = [...group.members, colleague]
    const updatedGroup: Group = {
      ...group,
      members: updatedMembers
    }
    onUpdateGroup(updatedGroup)
    showToast(`Added ${colleague.name} to group!`)
  }

  // Add new colleague via form
  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUserName.trim()) return

    const newMember: User = {
      id: `user-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim() || `${newUserName.trim().toLowerCase().replace(/\s+/g, '.')}@office.com`,
      avatar: newUserName
        .trim()
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
      teamName: group.name,
      userCode: newUserName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() + Math.floor(1000 + Math.random() * 9000)
    }

    const updatedMembers = [...group.members, newMember]
    const updatedGroup: Group = {
      ...group,
      members: updatedMembers
    }
    onUpdateGroup(updatedGroup)
    setNewUserName('')
    setNewUserEmail('')
    setShowAddUserModal(false)
    showToast(`Added ${newMember.name} to group! 🎉`)
  }

  // Handle Exit Group
  const handleConfirmExit = () => {
    setShowExitConfirm(false)
    onExitGroup(group.id)
  }

  // Admin starts break for this group and immediately opens the separate break page
  const handleStartBreak = () => {
    if (!isAdmin) return
    const title = breakTitleInput.trim() || `${group.name} Chai Break ☕`
    addNewSession(
      title,
      group.shopName || 'Chayakkada',
      group.members,
      group.id,
      group.name,
      currentUser?.id,
      group.shopId
    )
    if (onOpenBreak) {
      onOpenBreak(group.id)
    } else {
      setShowTeaBreakView(true)
    }
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

                        <span className="text-[10px] text-stone-400 block truncate">
                          {member.email || (member.userCode ? `ID: ${member.userCode}` : 'Colleague')}
                        </span>
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

          {/* EXIT FROM GROUP SECTION - Strictly located on this page */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                  Leave {group.name}
                </div>
                <div className="text-[10px] text-stone-400">
                  Exit from this tea group
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowExitConfirm(true)}
              id="exit-group-members-page-btn"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit from Group</span>
            </button>
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

              {/* BUTTON LIKE "VIEW MEMBERS" AFTER THE MEMBER COUNT IN THE GROUP BANNER */}
              <button
                onClick={() => setShowMembersPage(true)}
                id="view-members-banner-btn"
                className="px-2.5 py-1 rounded-xl bg-white text-stone-900 hover:bg-amber-50 active:scale-95 text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all shrink-0"
              >
                <Users className="w-3.5 h-3.5 text-amber-600" />
                <span>View Members</span>
              </button>
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
                    {activeSession?.title}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    📍 {activeSession?.shopName} • {totalSessionItemCount} items • <strong className="text-stone-800 dark:text-stone-200">₹{activeSession?.totalAmount}</strong>
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  <Coffee className="w-5 h-5" />
                </div>
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
            /* IF BREAK IS NOT ACTIVE */
            isAdmin ? (
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3">
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
                  id="start-tea-break-btn"
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Start Tea Break ☕</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs text-center space-y-1.5 py-6">
                <div className="text-2xl">☕</div>
                <h4 className="font-heading font-bold text-xs text-stone-900 dark:text-stone-100">
                  No Active Tea Break
                </h4>
                <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                  Waiting for group admin to start the next chai break. Once started, you can join and order your tea &amp; snacks!
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                   */}
      {/* ========================================================================= */}

      {/* Modal: Add User to Group */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-600" />
                  <span>Add Users to Group</span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Invite your colleagues to {group.name}
                </p>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick add from office colleagues */}
            {nonMemberColleagues.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                  Quick Add Teammates
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 divide-y divide-stone-100 dark:divide-stone-800">
                  {nonMemberColleagues.map(colleague => (
                    <div
                      key={colleague.id}
                      className="pt-1.5 pb-1 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {colleague.avatar}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
                            {colleague.name}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {colleague.email}
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

            {/* Custom Add Colleague Form */}
            <form onSubmit={handleCreateNewUser} className="space-y-3 pt-2 border-t border-stone-100 dark:border-stone-800 text-left">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 block">
                Or Add Colleague by Name
              </span>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                  Full Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arun Nair"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                  Email / Work ID (optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. arun.nair@company.com"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Add Colleague
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exit Group Confirmation */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-heading font-bold text-base text-stone-900 dark:text-stone-100">
                Exit {group.name}?
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Are you sure you want to exit this group? You won't be able to view active sessions unless someone re-invites you or you join with the group ID.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
              >
                Stay in Group
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                id="confirm-exit-group-btn"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Yes, Exit Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
