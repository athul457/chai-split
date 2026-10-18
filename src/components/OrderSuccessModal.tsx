import React from 'react'
import {
  X,
  CheckCircle2,
  Flame,
  Sparkles,
  Footprints,
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

  // Calculate nutrition breakdown & health insights
  const nutrition = calculateOrderNutrition(
    items.map(item => ({
      name: item.name,
      quantity: item.quantity
    }))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-[#1C1917] rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
      >
        {/* Header with celebration banner and close button */}
        <div className="relative p-5 pb-4 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border-b border-stone-100 dark:border-stone-800/80">
          <button
            type="button"
            onClick={onClose}
            id="close-success-modal-btn"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#1B9C56] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3
                  id="success-modal-title"
                  className="font-heading font-black text-lg text-stone-900 dark:text-stone-100"
                >
                  Order Confirmed!
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-0">
                  Locked
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {sessionTitle ? `Added to ${sessionTitle}` : 'Your items are recorded for this tea break.'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Quick Stats: Amount & Total Items */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/70 dark:border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Your Total</span>
              <div className="text-xl font-heading font-black text-stone-900 dark:text-stone-100 mt-0.5">
                ₹{totalAmount}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/70 dark:border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Items Ordered</span>
              <div className="text-xl font-heading font-black text-[#FF7043] dark:text-[#FF8A65] mt-0.5">
                {nutrition.totalItems} {nutrition.totalItems === 1 ? 'item' : 'items'}
              </div>
            </div>
          </div>

          {/* Macro Nutrition Grid */}
          <div className="rounded-2xl bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent border border-amber-500/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-stone-800 dark:text-stone-200">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Nutrition Breakdown</span>
              </div>

              {/* Health Score Badge */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${nutrition.scoreBg} ${nutrition.scoreColor}`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>{nutrition.averageHealthRating} / 5</span>
                <span className="font-medium text-[10px] ml-0.5">({nutrition.scoreLabel})</span>
              </div>
            </div>

            {/* Macro Cards Grid */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white dark:bg-[#252220] border border-stone-200/70 dark:border-stone-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold text-stone-400 block">Calories</span>
                <span className="font-heading font-black text-sm text-amber-600 dark:text-amber-400 block mt-0.5">
                  {nutrition.totalCalories}
                </span>
                <span className="text-[9px] text-stone-400">kcal</span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#252220] border border-stone-200/70 dark:border-stone-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold text-stone-400 block">Protein</span>
                <span className="font-heading font-black text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {nutrition.totalProtein}g
                </span>
                <span className="text-[9px] text-stone-400">muscle</span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#252220] border border-stone-200/70 dark:border-stone-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold text-stone-400 block">Carbs</span>
                <span className="font-heading font-black text-sm text-sky-600 dark:text-sky-400 block mt-0.5">
                  {nutrition.totalCarbs}g
                </span>
                <span className="text-[9px] text-stone-400">energy</span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-[#252220] border border-stone-200/70 dark:border-stone-800/80 shadow-2xs">
                <span className="text-[10px] font-semibold text-stone-400 block">Fats</span>
                <span className="font-heading font-black text-sm text-purple-600 dark:text-purple-400 block mt-0.5">
                  {nutrition.totalFats}g
                </span>
                <span className="text-[9px] text-stone-400">rich</span>
              </div>
            </div>

            {/* Quick burn estimate footnote */}
            <div className="flex items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400 pt-0.5">
              <Footprints className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>
                Burn estimate: ~<strong>{nutrition.walkTimeMinutes} mins</strong> brisk walk burns these calories.
              </span>
            </div>
          </div>

          {/* Health Insights & Nutrition Facts Card */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Health & Wellness Insights</span>
            </div>

            <div className="space-y-1.5 text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
              {nutrition.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ordered Items Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 font-bold text-[11px]">
              <span>Items Breakdown ({nutrition.totalItems})</span>
              <span>Calories</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
              {nutrition.items.map((item, idx) => {
                const iconConfig = getItemIconConfig(item.name)
                return (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-xl bg-stone-50 dark:bg-stone-850/60 border border-stone-200/60 dark:border-stone-800"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg ${iconConfig.bgLight} ${iconConfig.bgDark} flex items-center justify-center text-xs shrink-0`}
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

        {/* Footer with Close Button */}
        <div className="p-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-stone-900/40 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            id="done-order-summary-btn"
            className="w-full py-2.5 px-4 rounded-2xl bg-[#1B9C56] hover:bg-[#158045] text-white font-bold text-xs shadow-md shadow-emerald-700/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Got it, close summary</span>
          </button>
        </div>
      </div>
    </div>
  )
}
