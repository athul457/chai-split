import React, { useState, useEffect } from 'react'
import { Coffee, CheckCircle2, X } from 'lucide-react'
import type { OrderItem } from '../types'
import { getFunnyMalayalamAlert, type MalayalamAlertResult } from '../utils/malayalamAlerts'

interface FunnyMalayalamAlertModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  items?: OrderItem[]
  totalAmount?: number
  context?: 'confirm_order' | 'checkout' | 'split_bill'
  perPersonAmount?: number
  isConfirming?: boolean
  confirmLabel?: string
}

export const FunnyMalayalamAlertModal: React.FC<FunnyMalayalamAlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  items = [],
  totalAmount = 0,
  context = 'confirm_order',
  perPersonAmount,
  isConfirming = false,
  confirmLabel = 'Confirm Order'
}) => {
  const [countdown, setCountdown] = useState<number>(3)
  const [alertData, setAlertData] = useState<MalayalamAlertResult | null>(null)

  // When modal opens, pick a new random funny alert and reset 3s countdown
  useEffect(() => {
    if (isOpen) {
      const result = getFunnyMalayalamAlert(items, totalAmount, context, perPersonAmount)
      setAlertData(result)
      setCountdown(3)

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isOpen, items, totalAmount, context, perPersonAmount])

  if (!isOpen || !alertData) return null

  const isButtonDisabled = countdown > 0 || isConfirming

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-amber-200/60 dark:border-amber-900/40 p-5 sm:p-6 space-y-5 text-center relative overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer z-10"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Fun Icon */}
        <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF7043] to-[#FFA726] text-white flex items-center justify-center shadow-lg shadow-orange-500/25">
          <Coffee className="w-7 h-7" />
          {countdown > 0 && (
            <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-900 text-xs font-black flex items-center justify-center shadow-md animate-bounce">
              {countdown}
            </div>
          )}
        </div>

        {/* Dialog Title */}
        <div className="space-y-1">
          <h3 className="font-heading font-black text-lg sm:text-xl text-stone-900 dark:text-stone-50 tracking-tight">
            {context === 'split_bill'
              ? 'ബില്ല് ഷെയർ ചെയ്യാൻ വരട്ടെ!'
              : context === 'checkout'
              ? 'ചെക്കൗട്ട് ചെയ്യാൻ വരട്ടെ!'
              : 'ഓർഡർ ഉറപ്പിക്കാൻ വരട്ടെ! ☕'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {context === 'split_bill' || context === 'checkout'
              ? 'Please verify before settling this tea break bill'
              : 'Please take a moment to verify your items'}
          </p>
        </div>

        {/* Funny Malayalam Alert Card */}
        <div className="relative p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 shadow-inner text-left">
          <div className="text-stone-900 dark:text-amber-50 text-base sm:text-lg font-bold leading-relaxed tracking-normal select-none">
            {alertData.text}
          </div>

          {alertData.reasonMalayalam && (
            <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/50 flex items-start gap-1.5 text-xs text-amber-900/85 dark:text-amber-300 font-medium">
              <span className="font-bold text-amber-800 dark:text-amber-400 shrink-0">കാരണം:</span>
              <span className="leading-snug">{alertData.reasonMalayalam}</span>
            </div>
          )}
        </div>

        {/* 3-Second Visual Countdown Progress Bar */}
        <div className="w-full h-1.5 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              countdown === 0 ? 'bg-emerald-500 w-full' : 'bg-[#FF7043]'
            }`}
            style={{
              width: countdown === 0 ? '100%' : `${((3 - countdown) / 3) * 100}%`
            }}
          />
        </div>

        {/* Buttons: Cancel and Confirm */}
        <div className="flex items-center gap-2.5 pt-1">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            id="alert-modal-cancel-btn"
            className="flex-1 py-3 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-200 font-bold text-xs transition-all cursor-pointer active:scale-95"
          >
            Cancel
          </button>

          {/* Confirm Button (Unlocked after 3 seconds) */}
          <button
            type="button"
            onClick={() => {
              if (!isButtonDisabled) {
                onConfirm()
              }
            }}
            disabled={isButtonDisabled}
            id="alert-modal-confirm-btn"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 ${
              isButtonDisabled
                ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 border border-stone-300 dark:border-stone-700 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer shadow-emerald-600/20'
            }`}
          >
            {isConfirming ? (
              <span>Confirming...</span>
            ) : countdown > 0 ? (
              <>
                <Coffee className="w-3.5 h-3.5 animate-spin" />
                <span>Confirm ({countdown}s)</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
