// Utility for resolving appropriate icons and pastel badge colors for items & groups

export interface ItemIconConfig {
  emoji: string
  bgLight: string
  bgDark: string
  textColor: string
}

// Preset pastel color palettes matching the Splitty design language
const PASTEL_PALETTES = [
  { bgLight: 'bg-amber-100', bgDark: 'dark:bg-amber-950/70', textColor: 'text-amber-800 dark:text-amber-300' },
  { bgLight: 'bg-emerald-100', bgDark: 'dark:bg-emerald-950/70', textColor: 'text-emerald-800 dark:text-emerald-300' },
  { bgLight: 'bg-rose-100', bgDark: 'dark:bg-rose-950/70', textColor: 'text-rose-800 dark:text-rose-300' },
  { bgLight: 'bg-orange-100', bgDark: 'dark:bg-orange-950/70', textColor: 'text-orange-800 dark:text-orange-300' },
  { bgLight: 'bg-sky-100', bgDark: 'dark:bg-sky-950/70', textColor: 'text-sky-800 dark:text-sky-300' },
  { bgLight: 'bg-purple-100', bgDark: 'dark:bg-purple-950/70', textColor: 'text-purple-800 dark:text-purple-300' },
  { bgLight: 'bg-yellow-100', bgDark: 'dark:bg-yellow-950/70', textColor: 'text-yellow-800 dark:text-yellow-300' }
]

/**
 * Maps any tea stall or food item name to an appropriate icon & pastel badge background
 */
export function getItemIconConfig(name: string, category?: string, customEmoji?: string): ItemIconConfig {
  // If a valid custom emoji was provided and not blank, use it
  if (customEmoji && customEmoji.trim().length > 0 && customEmoji !== '☕') {
    const palette = getPaletteForString(name)
    return {
      emoji: customEmoji.trim(),
      bgLight: palette.bgLight,
      bgDark: palette.bgDark,
      textColor: palette.textColor
    }
  }

  const cleanName = (name || '').toLowerCase().trim()
  const cleanCat = (category || '').toLowerCase().trim()

  // 1. Hot Beverages (Tea & Chai)
  if (
    cleanName.includes('chaya') ||
    cleanName.includes('chai') ||
    cleanName.includes('tea') ||
    cleanCat.includes('tea')
  ) {
    return {
      emoji: '☕',
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-950/70',
      textColor: 'text-amber-800 dark:text-amber-300'
    }
  }

  // 2. Coffee
  if (
    cleanName.includes('coffee') ||
    cleanName.includes('kaapi') ||
    cleanName.includes('bru') ||
    cleanName.includes('nescafe') ||
    cleanCat.includes('coffee')
  ) {
    return {
      emoji: '☕',
      bgLight: 'bg-orange-100',
      bgDark: 'dark:bg-orange-950/70',
      textColor: 'text-orange-900 dark:text-orange-300'
    }
  }

  // 3. Samosa & Pastries
  if (cleanName.includes('samosa') || cleanName.includes('samoza')) {
    return {
      emoji: '🥟',
      bgLight: 'bg-yellow-100',
      bgDark: 'dark:bg-yellow-950/70',
      textColor: 'text-yellow-800 dark:text-yellow-300'
    }
  }

  // 4. Omelette & Eggs
  if (
    cleanName.includes('omlette') ||
    cleanName.includes('omelette') ||
    cleanName.includes('egg') ||
    cleanName.includes('bulls eye') ||
    cleanName.includes('poach')
  ) {
    return {
      emoji: '🍳',
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-950/70',
      textColor: 'text-amber-800 dark:text-amber-300'
    }
  }

  // 5. Puffs & Bakery
  if (cleanName.includes('puff') || cleanName.includes('pastry')) {
    return {
      emoji: '🥐',
      bgLight: 'bg-orange-100',
      bgDark: 'dark:bg-orange-950/70',
      textColor: 'text-orange-800 dark:text-orange-300'
    }
  }

  // 6. Porotta & Breads
  if (
    cleanName.includes('porotta') ||
    cleanName.includes('parotta') ||
    cleanName.includes('roti') ||
    cleanName.includes('chapati') ||
    cleanName.includes('naan')
  ) {
    return {
      emoji: '🫓',
      bgLight: 'bg-stone-200',
      bgDark: 'dark:bg-stone-800',
      textColor: 'text-stone-800 dark:text-stone-200'
    }
  }

  // 7. Dosa & Crepes
  if (cleanName.includes('dosa') || cleanName.includes('dosha')) {
    return {
      emoji: '🥞',
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-950/70',
      textColor: 'text-amber-800 dark:text-amber-300'
    }
  }

  // 8. Vada & Cutlets
  if (cleanName.includes('vada') || cleanName.includes('vadai') || cleanName.includes('cutlet')) {
    return {
      emoji: '🍩',
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-950/70',
      textColor: 'text-amber-900 dark:text-amber-200'
    }
  }

  // 9. Banana Fry / Pazham Pori
  if (cleanName.includes('banana') || cleanName.includes('pazham')) {
    return {
      emoji: '🍌',
      bgLight: 'bg-yellow-100',
      bgDark: 'dark:bg-yellow-950/70',
      textColor: 'text-yellow-800 dark:text-yellow-300'
    }
  }

  // 10. Biscuits & Cookies
  if (cleanName.includes('biscuit') || cleanName.includes('cookie') || cleanName.includes('rusk')) {
    return {
      emoji: '🍪',
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-950/70',
      textColor: 'text-amber-900 dark:text-amber-300'
    }
  }

  // 11. Sandwiches & Burgers
  if (cleanName.includes('sandwich') || cleanName.includes('burger') || cleanName.includes('roll')) {
    return {
      emoji: '🥪',
      bgLight: 'bg-emerald-100',
      bgDark: 'dark:bg-emerald-950/70',
      textColor: 'text-emerald-800 dark:text-emerald-300'
    }
  }

  // 12. Maggi & Noodles
  if (cleanName.includes('maggi') || cleanName.includes('noodle')) {
    return {
      emoji: '🍜',
      bgLight: 'bg-orange-100',
      bgDark: 'dark:bg-orange-950/70',
      textColor: 'text-orange-800 dark:text-orange-300'
    }
  }

  // 13. Drinks, Soda, Juices
  if (
    cleanName.includes('juice') ||
    cleanName.includes('soda') ||
    cleanName.includes('lime') ||
    cleanName.includes('water') ||
    cleanName.includes('coke') ||
    cleanName.includes('drink') ||
    cleanName.includes('shake')
  ) {
    return {
      emoji: '🥤',
      bgLight: 'bg-sky-100',
      bgDark: 'dark:bg-sky-950/70',
      textColor: 'text-sky-800 dark:text-sky-300'
    }
  }

  // 14. Cake & Desserts
  if (cleanName.includes('cake') || cleanName.includes('sweet') || cleanName.includes('dessert')) {
    return {
      emoji: '🍰',
      bgLight: 'bg-rose-100',
      bgDark: 'dark:bg-rose-950/70',
      textColor: 'text-rose-800 dark:text-rose-300'
    }
  }

  // 15. Rice & Meals
  if (cleanName.includes('rice') || cleanName.includes('biryani') || cleanName.includes('meal')) {
    return {
      emoji: '🍛',
      bgLight: 'bg-amber-100',
      bgDark: 'dark:bg-amber-950/70',
      textColor: 'text-amber-800 dark:text-amber-300'
    }
  }

  // Generic fallback: Warm tea cup or tableware with pleasant pastel background
  const palette = getPaletteForString(cleanName)
  return {
    emoji: customEmoji && customEmoji.length > 0 ? customEmoji : '☕',
    bgLight: palette.bgLight,
    bgDark: palette.bgDark,
    textColor: palette.textColor
  }
}

/**
 * Returns a stable pastel palette for a given string
 */
function getPaletteForString(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length
  return PASTEL_PALETTES[index]
}

/**
 * Maps a group name or shop to an appropriate group emoji
 */
export function getGroupIcon(groupName: string, shopName?: string, existingEmoji?: string): string {
  if (existingEmoji && existingEmoji.trim().length > 0 && existingEmoji !== '☕') {
    return existingEmoji.trim()
  }

  const combined = `${groupName || ''} ${shopName || ''}`.toLowerCase()

  if (combined.includes('birthday') || combined.includes('cake')) return '🎂'
  if (combined.includes('party') || combined.includes('celebration')) return '🪅'
  if (combined.includes('shop') || combined.includes('mall') || combined.includes('store')) return '🛍️'
  if (combined.includes('trip') || combined.includes('tour') || combined.includes('travel')) return '✈️'
  if (combined.includes('dinner') || combined.includes('lunch') || combined.includes('food')) return '🍽️'
  if (combined.includes('office') || combined.includes('work') || combined.includes('tech')) return '🏢'
  if (combined.includes('snack') || combined.includes('break')) return '🥪'

  return '☕' // Classic Chai Split fallback
}

/**
 * Maps a group to its emoji and pastel badge styling
 */
export function getGroupIconConfig(groupName: string, shopName?: string, existingEmoji?: string): ItemIconConfig {
  const emoji = getGroupIcon(groupName, shopName, existingEmoji)
  const palette = getPaletteForString(groupName || 'Group')
  return {
    emoji,
    bgLight: palette.bgLight,
    bgDark: palette.bgDark,
    textColor: palette.textColor
  }
}
