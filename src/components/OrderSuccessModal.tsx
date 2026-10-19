import React from 'react'
import { X, CheckCircle2, Star } from 'lucide-react'
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

  // Prominent health status & background based on health rating:
  // Red for unhealthy (< 2.3), Yellow for average (2.3 - 3.4), Green for good (>= 3.5)
  const getHealthStatusConfig = (rating: number) => {
    if (rating >= 3.5) {
      return {
        status: 'Good Health',
        emoji: '🥗',
        cardBg: 'bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/30',
        textColor: 'text-emerald-800 dark:text-emerald-200',
        badgeBg: 'bg-emerald-600/20 text-emerald-900 dark:text-emerald-100',
        starColor: 'text-emerald-600 dark:text-emerald-400'
      }
    }
    if (rating >= 2.3) {
      return {
        status: 'Average Health',
        emoji: '⚡',
        cardBg: 'bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30',
        textColor: 'text-amber-800 dark:text-amber-200',
        badgeBg: 'bg-amber-600/20 text-amber-900 dark:text-amber-100',
        starColor: 'text-amber-600 dark:text-amber-400'
      }
    }
    return {
      status: 'Unhealthy Choice',
      emoji: '⚠️',
      cardBg: 'bg-rose-500/15 dark:bg-rose-500/25 border border-rose-500/30',
      textColor: 'text-rose-800 dark:text-rose-200',
      badgeBg: 'bg-rose-600/20 text-rose-900 dark:text-rose-100',
      starColor: 'text-rose-600 dark:text-rose-400'
    }
  }

  const healthConfig = getHealthStatusConfig(nutrition.averageHealthRating)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-[390px] bg-white dark:bg-[#1C1917] rounded-3xl shadow-2xl border border-stone-200/80 dark:border-stone-800 overflow-hidden flex flex-col max-h-[84vh] transition-all"
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

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Top Summary Bar: Total Amount & Item Count */}
          <div className="flex items-center justify-between px-1">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Total Amount
              </span>
              <div className="font-heading font-black text-2xl text-stone-900 dark:text-stone-100 mt-0.5">
                ₹{totalAmount}
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Items Ordered
              </span>
              <span className="font-heading font-bold text-sm text-[#FF7043] dark:text-[#FF8A65] mt-0.5 block">
                {nutrition.totalItems} {nutrition.totalItems === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {/* Prominent Health Rating Banner with background based on health status */}
          <div
            className={`p-3.5 rounded-2xl ${healthConfig.cardBg} flex items-center justify-between shadow-2xs transition-all`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl leading-none">{healthConfig.emoji}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block leading-none">
                  Health Status
                </span>
                <span className={`text-sm font-black ${healthConfig.textColor} mt-1 block`}>
                  {healthConfig.status}
                </span>
              </div>
            </div>

            {/* Prominent Score Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${healthConfig.badgeBg} font-heading font-black text-sm shadow-2xs`}
            >
              <Star className={`w-3.5 h-3.5 fill-current ${healthConfig.starColor}`} />
              <span className={healthConfig.textColor}>{nutrition.averageHealthRating}</span>
              <span className="text-[10px] font-medium opacity-65">/ 5</span>
            </div>
          </div>

          {/* Unified Nutrition Strip */}
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

          {/* Simple Items List */}
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
