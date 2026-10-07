export interface User {
  id: string
  name: string
  email: string
  avatar: string
  teamName: string
  userCode?: string
  upiId?: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: 'tea' | 'coffee' | 'snacks' | 'quick-bites' | 'drinks'
  emoji: string
  description?: string
  shopId?: string
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  emoji: string
}

export interface MemberExpense {
  memberId: string
  memberName: string
  memberAvatar: string
  items: OrderItem[]
  total: number
  isPaid: boolean
  paidAt?: string
}

export interface TeaSession {
  id: string
  title: string
  shopName: string
  shopId?: string
  groupId?: string
  groupName?: string
  createdAt: string
  payerId: string
  payerName: string
  payerUpi?: string
  creatorId?: string
  creatorName?: string
  totalAmount: number
  expenses: MemberExpense[]
  status: 'active' | 'settled'
  notes?: string
}

export interface Group {
  id: string
  name: string
  code: string
  department: string
  adminId?: string
  shopId?: string
  shopName?: string
  shopEmoji?: string
  members: User[]
  createdDate: string
}

export interface Shop {
  id: string
  name: string
  location: string
  specialty: string
  rating: number
  emoji: string
}

export type BottomTab = 'shops' | 'groups' | 'details' | 'history' | 'home'

export type PageRoute = 'landing' | 'login' | 'register' | 'dashboard'
