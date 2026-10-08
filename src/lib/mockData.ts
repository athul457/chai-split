import type { User, MenuItem, Group, TeaSession, Shop } from '../types'

export const DEFAULT_USERS: User[] = [
  {
    id: 'user-john',
    name: 'John Doe',
    email: 'johndoe@example.com',
    avatar: 'JD',
    teamName: 'Engineering & Product',
    userCode: 'JOHN4821',
    upiId: 'johndoe@okaxis'
  },
  {
    id: 'user-rahul',
    name: 'Rahul Sharma',
    email: 'rahul@office.com',
    avatar: 'RS',
    teamName: 'Engineering & Product',
    userCode: 'RAHUL8421',
    upiId: 'rahul@okhdfcbank'
  },
  {
    id: 'user-priya',
    name: 'Priya Patel',
    email: 'priya@office.com',
    avatar: 'PP',
    teamName: 'Engineering & Product',
    userCode: 'PRIYA3910',
    upiId: 'priya@oksbi'
  },
  {
    id: 'user-amit',
    name: 'Amit Verma',
    email: 'amit@office.com',
    avatar: 'AV',
    teamName: 'Engineering & Product',
    userCode: 'AMIT5521',
    upiId: 'amit.verma@paytm'
  },
  {
    id: 'user-sneha',
    name: 'Sneha Rao',
    email: 'sneha@office.com',
    avatar: 'SR',
    teamName: 'Engineering & Product',
    userCode: 'SNEHA6214',
    upiId: 'sneha@icici'
  },
  {
    id: 'user-vikram',
    name: 'Vikram Das',
    email: 'vikram@office.com',
    avatar: 'VD',
    teamName: 'Engineering & Product',
    userCode: 'VIKRAM9102',
    upiId: 'vikram@axl'
  }
]

export const DEFAULT_MENU: MenuItem[] = [
  {
    id: 'item-masala-chai',
    name: 'Kadak Masala Chai',
    price: 15,
    category: 'tea',
    emoji: '☕',
    description: 'Fresh brewed ginger & cardamom spiced tea',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-ginger-tea',
    name: 'Adrak Ginger Chai',
    price: 20,
    category: 'tea',
    emoji: '🍵',
    description: 'Extra strong grated ginger chai',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-elaichi-tea',
    name: 'Elaichi Special Chai',
    price: 20,
    category: 'tea',
    emoji: '🌿',
    description: 'Fragrant cardamom infused tea',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-filter-coffee',
    name: 'Filter Coffee',
    price: 25,
    category: 'coffee',
    emoji: '☕',
    description: 'Traditional hot frothy filter kaapi',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-samosa',
    name: 'Crispy Samosa & Chutney',
    price: 20,
    category: 'snacks',
    emoji: '🥟',
    description: 'Fresh piping hot aloo samosa with mint dip',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-bun-maska',
    name: 'Warm Bun Maska',
    price: 35,
    category: 'quick-bites',
    emoji: '🍞',
    description: 'Soft Irani bun with generous butter slab',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-sandwich',
    name: 'Veg Grilled Sandwich',
    price: 60,
    category: 'quick-bites',
    emoji: '🥪',
    description: 'Loaded cheese & veggie toasted sandwich',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-biscuits',
    name: 'Chai Biscuits (2 pcs)',
    price: 10,
    category: 'snacks',
    emoji: '🍪',
    description: 'Crisp bakery butter biscuits to dip',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-vada',
    name: 'Batata Vada Pav',
    price: 25,
    category: 'snacks',
    emoji: '🧆',
    description: 'Mumbai style spicy potato vada in pao',
    shopId: 'shop-chayakkada'
  },
  {
    id: 'item-cold-coffee',
    name: 'Cold Coffee with Ice Cream',
    price: 55,
    category: 'drinks',
    emoji: '🧋',
    description: 'Thick creamy blended coffee',
    shopId: 'shop-chayakkada'
  }
]

export const DEFAULT_GROUP: Group = {
  id: 'group-eng-fl3',
  name: 'Floor 3 Tea & Snack Addicts',
  code: 'TEA-FL3',
  department: 'Product & Tech',
  adminId: 'user-john',
  shopId: 'shop-chayakkada',
  shopName: 'Chayakkada',
  shopEmoji: '☕',
  members: DEFAULT_USERS,
  createdDate: '2026-02-15'
}

export const INITIAL_ACTIVE_SESSION: TeaSession = {
  id: 'session-demo-1',
  title: '4:00 PM Evening Tea Tapri ☕',
  shopName: 'Chayakkada',
  shopId: 'shop-chayakkada',
  groupId: 'group-eng-fl3',
  groupName: 'Floor 3 Tea & Snack Addicts',
  createdAt: 'Today, 4:05 PM',
  payerId: 'user-amit',
  payerName: 'Amit Verma',
  payerUpi: 'amit.verma@paytm',
  creatorId: 'user-john',
  creatorName: 'John Doe',
  totalAmount: 170,
  status: 'active',
  notes: 'Tapri near Building B gate',
  expenses: [
    {
      memberId: 'user-rahul',
      memberName: 'Rahul Sharma',
      memberAvatar: 'RS',
      items: [
        { id: 'o-1', menuItemId: 'item-masala-chai', name: 'Kadak Masala Chai', price: 15, quantity: 1, emoji: '☕' },
        { id: 'o-2', menuItemId: 'item-samosa', name: 'Crispy Samosa & Chutney', price: 20, quantity: 1, emoji: '🥟' }
      ],
      total: 35,
      isPaid: false
    },
    {
      memberId: 'user-priya',
      memberName: 'Priya Patel',
      memberAvatar: 'PP',
      items: [
        { id: 'o-3', menuItemId: 'item-ginger-tea', name: 'Adrak Ginger Chai', price: 20, quantity: 1, emoji: '🍵' },
        { id: 'o-4', menuItemId: 'item-bun-maska', name: 'Warm Bun Maska', price: 35, quantity: 1, emoji: '🍞' }
      ],
      total: 55,
      isPaid: true,
      paidAt: '4:18 PM'
    },
    {
      memberId: 'user-sneha',
      memberName: 'Sneha Rao',
      memberAvatar: 'SR',
      items: [
        { id: 'o-5', menuItemId: 'item-masala-chai', name: 'Kadak Masala Chai', price: 15, quantity: 1, emoji: '☕' },
        { id: 'o-6', menuItemId: 'item-samosa', name: 'Crispy Samosa & Chutney', price: 20, quantity: 1, emoji: '🥟' }
      ],
      total: 35,
      isPaid: false
    },
    {
      memberId: 'user-amit',
      memberName: 'Amit Verma',
      memberAvatar: 'AV',
      items: [
        { id: 'o-7', menuItemId: 'item-filter-coffee', name: 'Filter Coffee', price: 25, quantity: 1, emoji: '☕' },
        { id: 'o-8', menuItemId: 'item-samosa', name: 'Crispy Samosa & Chutney', price: 20, quantity: 1, emoji: '🥟' }
      ],
      total: 45,
      isPaid: true // Amit paid the vendor
    }
  ]
}

export const PAST_SESSIONS: TeaSession[] = [
  {
    id: 'session-past-1',
    title: '11:30 AM Morning Standup Chai',
    shopName: 'Chayakkada',
    createdAt: 'Yesterday, 11:35 AM',
    payerId: 'user-rahul',
    payerName: 'Rahul Sharma',
    payerUpi: 'rahul@okhdfcbank',
    totalAmount: 110,
    status: 'settled',
    expenses: [
      {
        memberId: 'user-rahul',
        memberName: 'Rahul Sharma',
        memberAvatar: 'RS',
        items: [{ id: 'op-1', menuItemId: 'item-masala-chai', name: 'Kadak Masala Chai', price: 15, quantity: 1, emoji: '☕' }],
        total: 15,
        isPaid: true
      },
      {
        memberId: 'user-priya',
        memberName: 'Priya Patel',
        memberAvatar: 'PP',
        items: [{ id: 'op-2', menuItemId: 'item-ginger-tea', name: 'Adrak Ginger Chai', price: 20, quantity: 1, emoji: '🍵' }],
        total: 20,
        isPaid: true
      },
      {
        memberId: 'user-amit',
        memberName: 'Amit Verma',
        memberAvatar: 'AV',
        items: [
          { id: 'op-3', menuItemId: 'item-masala-chai', name: 'Kadak Masala Chai', price: 15, quantity: 1, emoji: '☕' },
          { id: 'op-4', menuItemId: 'item-biscuits', name: 'Chai Biscuits (2 pcs)', price: 10, quantity: 1, emoji: '🍪' }
        ],
        total: 25,
        isPaid: true
      },
      {
        memberId: 'user-vikram',
        memberName: 'Vikram Das',
        memberAvatar: 'VD',
        items: [{ id: 'op-5', menuItemId: 'item-sandwich', name: 'Veg Grilled Sandwich', price: 60, quantity: 1, emoji: '🥪' }],
        total: 60,
        isPaid: true
      }
    ]
  }
]

export const DEFAULT_SHOPS: Shop[] = [
  {
    id: 'shop-chayakkada',
    name: 'Chayakkada',
    location: 'Gate 2 Tapri, Near Tech Park',
    specialty: 'Kadak Naadan Chai, Samosas & Snacks',
    rating: 4.9,
    emoji: '☕'
  }
]
