import React from 'react'
import {
  X,
  CheckCircle2,
  Star
} from 'lucide-react'
import { calculateOrderNutrition } from '../utils/nutrition'
import { getItemIconConfig } from '../utils/itemIcons'
import type { OrderItem } from '../types'

interface OrderSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  items: OrderItem[]
  totalAmount: number
  sessionTitle?: string
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  items,
  totalAmount,
  sessionTitle
}) => {
  if (!isOpen) return null

  // Calculate nutrition breakdown
  const nutrition = calculateOrderNutrition(
    items.map(item => ({
      name: item.name,
      quantity: item.quantity
    }))
  )

  // Highlighted rating config with color and emoji
  const getRatingHighlight = (rating: number) => {
    if (rating >= 4.2) {
      return {
        emoji: '🥗',
        label: 'Super Healthy',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        textColor: 'text-emerald-700 dark:text-emerald-300',
        pillBg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
      }
    }
    if (rating >= 3.2) {
      return {
        emoji: '🥑',
        label: 'Balanced Choice',
        bg: 'bg-teal-50 dark:bg-teal-950/60',
        textColor: 'text-teal-700 dark:text-teal-300',
        pillBg: 'bg-teal-500/15 text-teal-800 dark:text-teal-200'
      }
    }
    if (rating >= 2.2) {
      return {
        emoji: '⚡',
        label: 'Moderate Energy',
        bg: 'bg-amber-50 dark:bg-amber-950/60',
        textColor: 'text-amber-700 dark:text-amber-300',
        pillBg: 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
      }
    }
    return {
      emoji: '🍩',
      label: 'Indulgent Treat',
      bg: 'bg-orange-50 dark:bg-orange-950/60',
      textColor: 'text-orange-700 dark:text-orange-300',
      pillBg: 'bg-orange-500/15 text-orange-800 dark:text-orange-200'
    }
  }

  const ratingHighlight = getRatingHighlight(nutrition.averageHealthRating)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-[410px] bg-white dark:bg-[#1C1917] rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
      >
        {/* Header with celebration banner and close button */}
        <div className="relative p-4 pb-3.5 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-stone-100 dark:border-stone-800/80">
          <button
            type="button"
            onClick={onClose}
            id="close-success-modal-btn"
            className="absolute top-4 right-4 w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer border-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-2xl bg-[#1B9C56] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3
                  id="success-modal-title"
                  className="font-heading font-black text-base text-stone-900 dark:text-stone-100"
                >
                  Order Confirmed!
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-0">
                  Locked
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate max-w-[220px]">
                {sessionTitle ? `Added to ${sessionTitle}` : 'Your items are recorded for this tea break.'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Quick Stats: Amount & Total Items */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 px-3 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/70 dark:border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Your Total</span>
              <div className="text-lg font-heading font-black text-stone-900 dark:text-stone-100 mt-0.5">
                ₹{totalAmount}
              </div>
            </div>

            <div className="p-2.5 px-3 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/70 dark:border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Items Ordered</span>
              <div className="text-lg font-heading font-black text-[#FF7043] dark:text-[#FF8A65] mt-0.5">
                {nutrition.totalItems} {nutrition.totalItems === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>

          {/* Highlighted Health Rating Card (Placed at top of insight numbers) */}
          <div
            className={`p-3 rounded-2xl ${ratingHighlight.bg} flex items-center justify-between border-0 transition-all`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">{ratingHighlight.emoji}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 block leading-none">
                  Health Rating
                </span>
                <span className={`text-xs font-black ${ratingHighlight.textColor}`}>
                  {ratingHighlight.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/90 dark:bg-stone-900/90 px-3 py-1 rounded-xl shadow-2xs font-heading font-black text-sm">
              <span className="text-amber-500">⭐</span>
              <span className="text-stone-900 dark:text-stone-100">
                {nutrition.averageHealthRating}
              </span>
              <span className="text-[10px] font-medium text-stone-400">/ 5</span>
            </div>
          </div>

          {/* Insight Numbers Grid (Calories, Protein, Carbs, Fats) */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-[#252220] border border-stone-200/60 dark:border-stone-800/80 shadow-2xs">
              <span className="text-[10px] font-semibold text-stone-400 block">Calories</span>
              <span className="font-heading font-black text-sm text-amber-600 dark:text-amber-400 block mt-0.5">
                {nutrition.totalCalories}
              </span>
              <span className="text-[9px] text-stone-400">kcal</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-[#252220] border border-stone-200/60 dark:border-stone-800/80 shadow-2xs">
              <span className="text-[10px] font-semibold text-stone-400 block">Protein</span>
              <span className="font-heading font-black text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5">
                {nutrition.totalProtein}g
              </span>
              <span className="text-[9px] text-stone-400">muscle</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-[#252220] border border-stone-200/60 dark:border-stone-800/80 shadow-2xs">
              <span className="text-[10px] font-semibold text-stone-400 block">Carbs</span>
              <span className="font-heading font-black text-sm text-sky-600 dark:text-sky-400 block mt-0.5">
                {nutrition.totalCarbs}g
              </span>
              <span className="text-[9px] text-stone-400">energy</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-[#252220] border border-stone-200/60 dark:border-stone-800/80 shadow-2xs">
              <span className="text-[10px] font-semibold text-stone-400 block">Fats</span>
              <span className="font-heading font-black text-sm text-purple-600 dark:text-purple-400 block mt-0.5">
                {nutrition.totalFats}g
              </span>
              <span className="text-[9px] text-stone-400">rich</span>
            </div>
          </div>

          {/* Ordered Items Breakdown */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 font-bold text-[11px]">
              <span>Items Breakdown ({nutrition.totalItems})</span>
              <span>Calories</span>
            </div>

            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
              {nutrition.items.map((item, idx) => {
                const iconConfig = getItemIconConfig(item.name)
                return (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between p-2 px-2.5 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/60 dark:border-stone-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl ${iconConfig.bgLight} ${iconConfig.bgDark} flex items-center justify-center text-xs shrink-0`}
                      >
                        {iconConfig.emoji}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-stone-800 dark:text-stone-200 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-2">
                          <span>Qty: {item.quantity}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {item.healthRating}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-heading font-black text-amber-600 dark:text-amber-400">
                        {item.totalCalories} kcal
                      </div>
                      <div className="text-[9px] text-stone-400">
                        {item.unitCalories} kcal ea
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer with Close Button - elevated above navbar */}
        <div className="p-3.5 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40">
          <button
            type="button"
            onClick={onClose}
            id="done-order-summary-btn"
            className="w-full py-2.5 px-4 rounded-2xl bg-[#1B9C56] hover:bg-[#158045] text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 border-none outline-none"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Got it, close summary</span>
          </button>
        </div>
      </div>
    </div>
  )
}
