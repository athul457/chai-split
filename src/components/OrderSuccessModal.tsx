import React from 'react'
import { X, CheckCircle2 } from 'lucide-react'
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
        bg: 'bg-emerald-100/80 dark:bg-emerald-950/70',
        textColor: 'text-emerald-800 dark:text-emerald-300'
      }
    }
    if (rating >= 3.2) {
      return {
        emoji: '🥑',
        label: 'Balanced Choice',
        bg: 'bg-teal-100/80 dark:bg-teal-950/70',
        textColor: 'text-teal-800 dark:text-teal-300'
      }
    }
    if (rating >= 2.2) {
      return {
        emoji: '⚡',
        label: 'Moderate Energy',
        bg: 'bg-amber-100/80 dark:bg-amber-950/70',
        textColor: 'text-amber-800 dark:text-amber-300'
      }
    }
    return {
      emoji: '🍩',
      label: 'Indulgent Treat',
      bg: 'bg-orange-100/80 dark:bg-orange-950/70',
      textColor: 'text-orange-800 dark:text-orange-300'
    }
  }

  const ratingHighlight = getRatingHighlight(nutrition.averageHealthRating)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[390px] bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden flex flex-col max-h-[82vh] transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
      >
        {/* Simple Header */}
        <div className="p-4 pb-3 flex items-center justify-between border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3
                id="success-modal-title"
                className="font-heading font-black text-sm text-stone-900 dark:text-stone-100 leading-tight"
              >
                Order Confirmed!
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5 truncate max-w-[240px]">
                {sessionTitle ? sessionTitle : 'Items added to your tea break'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            id="close-success-modal-btn"
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 flex items-center justify-center transition-colors cursor-pointer border-0"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body with clean spacing */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Top Summary Bar: Total & Highlighted Health Rating in one unified row */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Amount
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-heading font-black text-xl text-stone-900 dark:text-stone-100">
                  ₹{totalAmount}
                </span>
                <span className="text-[11px] font-bold text-[#FF7043] dark:text-[#FF8A65]">
                  ({nutrition.totalItems} {nutrition.totalItems === 1 ? 'item' : 'items'})
                </span>
              </div>
            </div>

            {/* Highlighted Rating with color & emoji */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${ratingHighlight.bg} ${ratingHighlight.textColor} font-bold text-xs shrink-0`}
            >
              <span className="text-sm leading-none">{ratingHighlight.emoji}</span>
              <span>{nutrition.averageHealthRating}</span>
              <span className="text-[10px] opacity-70">/ 5</span>
              <span className="text-[10px] font-semibold ml-0.5 opacity-90 hidden sm:inline">
                • {ratingHighlight.label}
              </span>
            </div>
          </div>

          {/* Unified Nutrition Strip (Clean 4 metrics, no bulky nested cards) */}
          <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-150 dark:border-stone-800">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">
              Nutrition Breakdown
            </div>
            <div className="grid grid-cols-4 divide-x divide-stone-200/60 dark:divide-stone-700/60 text-center">
              <div className="px-1">
                <span className="text-[10px] font-medium text-stone-400 block">Calories</span>
                <span className="font-heading font-black text-sm text-stone-900 dark:text-stone-100 block mt-0.5">
                  {nutrition.totalCalories}
                </span>
                <span className="text-[9px] text-stone-400">kcal</span>
              </div>

              <div className="px-1">
                <span className="text-[10px] font-medium text-stone-400 block">Protein</span>
                <span className="font-heading font-black text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {nutrition.totalProtein}g
                </span>
                <span className="text-[9px] text-stone-400">protein</span>
              </div>

              <div className="px-1">
                <span className="text-[10px] font-medium text-stone-400 block">Carbs</span>
                <span className="font-heading font-black text-sm text-sky-600 dark:text-sky-400 block mt-0.5">
                  {nutrition.totalCarbs}g
                </span>
                <span className="text-[9px] text-stone-400">carbs</span>
              </div>

              <div className="px-1">
                <span className="text-[10px] font-medium text-stone-400 block">Fats</span>
                <span className="font-heading font-black text-sm text-amber-600 dark:text-amber-400 block mt-0.5">
                  {nutrition.totalFats}g
                </span>
                <span className="text-[9px] text-stone-400">fats</span>
              </div>
            </div>
          </div>

          {/* Simple Items List (Clean rows, light styling) */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-stone-400 dark:text-stone-500 font-bold text-[10px] uppercase tracking-wider px-1">
              <span>Items ({nutrition.totalItems})</span>
              <span>Calories</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {nutrition.items.map((item, idx) => {
                const iconConfig = getItemIconConfig(item.name)
                return (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-stone-50 dark:hover:bg-stone-850/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{iconConfig.emoji}</span>
                      <div className="truncate">
                        <div className="font-bold text-xs text-stone-800 dark:text-stone-200 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          Qty: {item.quantity}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-heading font-black text-xs text-stone-900 dark:text-stone-100">
                        {item.totalCalories} kcal
                      </div>
                      <div className="text-[9px] text-stone-400">
                        {item.unitCalories} ea
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Clean Footer Button */}
        <div className="p-3.5 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40">
          <button
            type="button"
            onClick={onClose}
            id="done-order-summary-btn"
            className="w-full py-2.5 px-4 rounded-xl bg-[#1B9C56] hover:bg-[#158045] text-white font-bold text-xs shadow-xs active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5 border-0 border-none outline-none"
          >
            <span>Got it, close summary</span>
          </button>
        </div>
      </div>
    </div>
  )
}
