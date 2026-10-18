// Nutrition Database and Insight Generator for Chai-Split

export interface NutritionItem {
  item: string
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fats_g: number
  fiber_g: number
  health_rating: number // 1 to 5
}

export const NUTRITION_DATABASE: NutritionItem[] = [
  {
    item: 'Chaya',
    calories_kcal: 80,
    protein_g: 2.2,
    carbs_g: 12.0,
    fats_g: 2.5,
    fiber_g: 0.0,
    health_rating: 3
  },
  {
    item: 'Coffee',
    calories_kcal: 85,
    protein_g: 2.2,
    carbs_g: 13.0,
    fats_g: 2.5,
    fiber_g: 0.0,
    health_rating: 3
  },
  {
    item: 'Samoza',
    calories_kcal: 250,
    protein_g: 3.5,
    carbs_g: 30.0,
    fats_g: 13.0,
    fiber_g: 2.1,
    health_rating: 1
  },
  {
    item: 'Omlette',
    calories_kcal: 125,
    protein_g: 6.5,
    carbs_g: 1.5,
    fats_g: 10.0,
    fiber_g: 0.1,
    health_rating: 4
  },
  {
    item: 'Dosha',
    calories_kcal: 120,
    protein_g: 3.0,
    carbs_g: 22.0,
    fats_g: 2.2,
    fiber_g: 0.9,
    health_rating: 5
  },
  {
    item: 'Porotta',
    calories_kcal: 280,
    protein_g: 5.5,
    carbs_g: 42.0,
    fats_g: 9.5,
    fiber_g: 1.2,
    health_rating: 1
  },
  {
    item: 'Bull\'s Eye',
    calories_kcal: 110,
    protein_g: 6.3,
    carbs_g: 0.6,
    fats_g: 9.0,
    fiber_g: 0.0,
    health_rating: 4
  },
  {
    item: 'Puffs',
    calories_kcal: 320,
    protein_g: 6.0,
    carbs_g: 34.0,
    fats_g: 18.0,
    fiber_g: 1.5,
    health_rating: 1
  },
  {
    item: 'Parippvada',
    calories_kcal: 150,
    protein_g: 4.5,
    carbs_g: 16.0,
    fats_g: 7.5,
    fiber_g: 3.2,
    health_rating: 2
  },
  {
    item: 'Pass pass',
    calories_kcal: 8,
    protein_g: 0.1,
    carbs_g: 1.8,
    fats_g: 0.0,
    fiber_g: 0.2,
    health_rating: 2
  },
  {
    item: 'Pokkavada',
    calories_kcal: 180,
    protein_g: 3.2,
    carbs_g: 18.0,
    fats_g: 10.5,
    fiber_g: 0.8,
    health_rating: 1
  },
  {
    item: 'Boiled egg',
    calories_kcal: 75,
    protein_g: 6.3,
    carbs_g: 0.6,
    fats_g: 5.3,
    fiber_g: 0.0,
    health_rating: 5
  }
]

/**
 * Fuzzy matches an ordered item name to the nutrition database
 */
export function findNutritionInfo(itemName: string): NutritionItem {
  const clean = itemName.toLowerCase().trim()

  // Direct exact/inclusion checks
  if (clean.includes('boiled egg') || clean === 'egg boiled') {
    return NUTRITION_DATABASE.find(n => n.item === 'Boiled egg')!
  }
  if (clean.includes('bull') || clean.includes('bulls eye') || clean.includes("bull's eye")) {
    return NUTRITION_DATABASE.find(n => n.item === "Bull's Eye")!
  }
  if (clean.includes('omlette') || clean.includes('omelette') || clean.includes('omlet')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Omlette')!
  }
  if (clean.includes('chaya') || clean.includes('chai') || clean.includes('tea')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Chaya')!
  }
  if (clean.includes('coffee') || clean.includes('kaapi') || clean.includes('bru')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Coffee')!
  }
  if (clean.includes('samoza') || clean.includes('samosa')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Samoza')!
  }
  if (clean.includes('dosha') || clean.includes('dosa')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Dosha')!
  }
  if (clean.includes('porotta') || clean.includes('parotta') || clean.includes('paratha')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Porotta')!
  }
  if (clean.includes('puff') || clean.includes('puffs')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Puffs')!
  }
  if (clean.includes('paripp') || clean.includes('parippu') || clean.includes('dal vada') || clean.includes('vada')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Parippvada')!
  }
  if (clean.includes('pokka') || clean.includes('pakoda') || clean.includes('pakora')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Pokkavada')!
  }
  if (clean.includes('pass') || clean.includes('pass pass')) {
    return NUTRITION_DATABASE.find(n => n.item === 'Pass pass')!
  }

  // Exact match from database by name
  const exact = NUTRITION_DATABASE.find(n => n.item.toLowerCase() === clean)
  if (exact) return exact

  // Fallback for custom items not in list
  return {
    item: itemName,
    calories_kcal: 110,
    protein_g: 2.5,
    carbs_g: 15.0,
    fats_g: 4.5,
    fiber_g: 0.5,
    health_rating: 3
  }
}

export interface CalculatedItemNutrition {
  name: string
  quantity: number
  unitCalories: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFats: number
  totalFiber: number
  healthRating: number
}

export interface OrderNutritionSummary {
  totalItems: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFats: number
  totalFiber: number
  averageHealthRating: number // 1.0 to 5.0
  items: CalculatedItemNutrition[]
  scoreLabel: string
  scoreColor: string
  scoreBg: string
  insights: string[]
  walkTimeMinutes: number
}

export function calculateOrderNutrition(
  orderItems: { name: string; quantity: number }[]
): OrderNutritionSummary {
  let totalItems = 0
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFats = 0
  let totalFiber = 0
  let weightedRatingSum = 0

  const items: CalculatedItemNutrition[] = []

  orderItems.forEach(orderItem => {
    const qty = Math.max(1, orderItem.quantity || 1)
    const nut = findNutritionInfo(orderItem.name)

    const itemCals = nut.calories_kcal * qty
    const itemProt = nut.protein_g * qty
    const itemCarbs = nut.carbs_g * qty
    const itemFats = nut.fats_g * qty
    const itemFiber = nut.fiber_g * qty

    totalItems += qty
    totalCalories += itemCals
    totalProtein += itemProt
    totalCarbs += itemCarbs
    totalFats += itemFats
    totalFiber += itemFiber
    weightedRatingSum += nut.health_rating * qty

    items.push({
      name: orderItem.name,
      quantity: qty,
      unitCalories: nut.calories_kcal,
      totalCalories: Math.round(itemCals),
      totalProtein: Number(itemProt.toFixed(1)),
      totalCarbs: Number(itemCarbs.toFixed(1)),
      totalFats: Number(itemFats.toFixed(1)),
      totalFiber: Number(itemFiber.toFixed(1)),
      healthRating: nut.health_rating
    })
  })

  const averageHealthRating = totalItems > 0
    ? Number((weightedRatingSum / totalItems).toFixed(1))
    : 3.0

  // Determine health score tier
  let scoreLabel = 'Balanced Choice'
  let scoreColor = 'text-emerald-700 dark:text-emerald-300'
  let scoreBg = 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800'

  if (averageHealthRating >= 4.2) {
    scoreLabel = 'Super Clean & Healthy'
    scoreColor = 'text-emerald-700 dark:text-emerald-300'
    scoreBg = 'bg-emerald-100 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-800'
  } else if (averageHealthRating >= 3.0) {
    scoreLabel = 'Balanced Energy'
    scoreColor = 'text-teal-700 dark:text-teal-300'
    scoreBg = 'bg-teal-100 dark:bg-teal-950/70 border-teal-300 dark:border-teal-800'
  } else if (averageHealthRating >= 2.0) {
    scoreLabel = 'Moderate / Energy-Dense'
    scoreColor = 'text-amber-700 dark:text-amber-300'
    scoreBg = 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800'
  } else {
    scoreLabel = 'Indulgent Treat'
    scoreColor = 'text-rose-700 dark:text-rose-300'
    scoreBg = 'bg-rose-100 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800'
  }

  // Generate dynamic health insights
  const insights: string[] = []

  // 1. Protein insight
  if (totalProtein >= 10) {
    insights.push(`💪 High Protein Boost (${totalProtein.toFixed(1)}g): Great for sustained alertness and reducing evening sugar cravings.`)
  } else if (totalProtein >= 5) {
    insights.push(`🌱 Good Protein (${totalProtein.toFixed(1)}g): Provides steady amino acids for your work day.`)
  }

  // 2. Calorie & Carbs insight
  if (totalCalories >= 450) {
    insights.push(`⚡ High Energy Load (${Math.round(totalCalories)} kcal): Ideal fuel for a busy shift! Drink a glass of water to keep your digestion smooth.`)
  } else if (totalCalories <= 180) {
    insights.push(`🍃 Light & Guilt-Free (~${Math.round(totalCalories)} kcal): Perfect for staying active without midday fatigue or a sugar crash.`)
  }

  // 3. Health rating specific tip
  if (averageHealthRating <= 2.2) {
    insights.push(`🔥 Snack Tip: Contains fried snacks (rich in carbs & fats). Enjoy it today and pair with a lighter meal later!`)
  } else if (averageHealthRating >= 4.0) {
    insights.push(`🌟 Wholesome Choice: Excellent health score with clean nutrient distribution!`)
  } else {
    insights.push(`☕ Classic Tea Break: A cozy balance to refresh your focus.`)
  }

  // 4. Fiber note
  if (totalFiber >= 2.0) {
    insights.push(`🌾 Fiber Support (${totalFiber.toFixed(1)}g): Contains dietary fiber helping maintain stable blood sugar levels.`)
  }

  // Walking time burn estimate (approx 4-5 kcal per minute of brisk walking)
  const walkTimeMinutes = Math.max(5, Math.round(totalCalories / 4.5))

  return {
    totalItems,
    totalCalories: Math.round(totalCalories),
    totalProtein: Number(totalProtein.toFixed(1)),
    totalCarbs: Number(totalCarbs.toFixed(1)),
    totalFats: Number(totalFats.toFixed(1)),
    totalFiber: Number(totalFiber.toFixed(1)),
    averageHealthRating,
    items,
    scoreLabel,
    scoreColor,
    scoreBg,
    insights,
    walkTimeMinutes
  }
}
