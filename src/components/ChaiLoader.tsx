import React, { useEffect, useState } from 'react'

export interface ChaiLoaderProps {
  variant?: 'fullscreen' | 'card' | 'inline' | 'spinner'
  message?: string
  text?: string
  submessage?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const DEFAULT_CHAI_QUOTES = [
  'Brewing fresh cutting chai... ☕',
  'Crushing ginger & elaichi... 🌿',
  'Boiling milk on high flame... 🔥',
  'Splitting the tea bill fairly... 🧾',
  'Hot parippu vada & samosas ready... 🥟',
  'Pouring kadak meter chai... 🫖'
]

export const ChaiLoader: React.FC<ChaiLoaderProps> = ({
  variant = 'card',
  message,
  text,
  submessage,
  size = 'md',
  className = ''
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0)

  const effectiveMsg = text || message

  useEffect(() => {
    if (effectiveMsg) return
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % DEFAULT_CHAI_QUOTES.length)
    }, 2400)
    return () => clearInterval(interval)
  }, [effectiveMsg])

  const activeMessage = effectiveMsg || DEFAULT_CHAI_QUOTES[quoteIndex]

  // Button spinner variant
  if (variant === 'spinner') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <svg
          className="animate-spin text-amber-500 w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {activeMessage && <span>{activeMessage}</span>}
      </div>
    )
  }

  // Inline mini variant
  if (variant === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-2xs animate-in fade-in ${className}`}
      >
        <span className="text-sm animate-bounce">☕</span>
        <span className="font-semibold">{activeMessage}</span>
        <span className="flex gap-1 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        </span>
      </div>
    )
  }

  // Size configurations for SVG Tea Glass
  const glassDimensions = {
    sm: { width: 44, height: 56 },
    md: { width: 68, height: 86 },
    lg: { width: 92, height: 116 }
  }[size]

  const isFullscreen = variant === 'fullscreen'

  return (
    <div
      className={
        isFullscreen
          ? `fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-stone-100/90 dark:bg-stone-950/95 backdrop-blur-md animate-in fade-in duration-300 ${className}`
          : `flex flex-col items-center justify-center p-8 rounded-2xl bg-white/70 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800/80 backdrop-blur-xs text-center space-y-4 my-2 shadow-2xs animate-in fade-in duration-200 ${className}`
      }
    >
      {/* Animated Cutting Chai Glass Illustration */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Ambient Saucer Glow */}
        <div className="absolute -bottom-2 w-28 h-8 rounded-full bg-amber-500/25 dark:bg-amber-500/20 blur-md animate-chai-glow pointer-events-none" />

        {/* SVG Animated Chai Glass */}
        <svg
          width={glassDimensions.width}
          height={glassDimensions.height}
          viewBox="0 0 100 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 animate-cup-tilt drop-shadow-md select-none"
        >
          {/* Defs for Gradients */}
          <defs>
            {/* Rich Masala Chai Tea Liquid Gradient */}
            <linearGradient id="chaiLiquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="35%" stopColor="#d97706" />
              <stop offset="85%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>

            {/* Frothy Tea Milk Foam Layer */}
            <linearGradient id="chaiFoamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#fef3c7" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>

            {/* Glass Highlight */}
            <linearGradient id="glassReflectionGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
              <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
            </linearGradient>

            {/* Steam Glow */}
            <linearGradient id="steamGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Rising Steam Waves Above the Glass */}
          <g className="steam-streams">
            {/* Steam Wisp 1 (Left) */}
            <path
              d="M 38 42 Q 32 30 38 18 Q 44 8 38 -4"
              stroke="url(#steamGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              className="animate-steam-1"
            />
            {/* Steam Wisp 2 (Center) */}
            <path
              d="M 50 38 Q 56 26 48 12 Q 42 0 52 -10"
              stroke="url(#steamGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              className="animate-steam-2"
            />
            {/* Steam Wisp 3 (Right) */}
            <path
              d="M 62 42 Q 68 30 62 16 Q 56 4 64 -6"
              stroke="url(#steamGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="animate-steam-3"
            />
          </g>

          {/* 2. Glass Shadow / Base Saucer */}
          <ellipse cx="50" cy="122" rx="34" ry="5.5" fill="#1c1917" fillOpacity="0.18" />

          {/* 3. Cutting Chai Glass Body Outer Path */}
          {/* Tapered glass: Top 24-76 (width 52), Bottom 32-68 (width 36), Height 45 to 118 */}
          <path
            d="M 22 45 L 30 116 Q 30 120 36 120 L 64 120 Q 70 120 70 116 L 78 45 Z"
            fill="url(#glassReflectionGrad)"
            stroke="#d6d3d1"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />

          {/* 4. Rich Hot Chai Liquid Inside Glass */}
          <path
            d="M 24.5 58 L 31.5 115 Q 32 118 36.5 118 L 63.5 118 Q 68 118 68.5 115 L 75.5 58 Q 50 62 24.5 58 Z"
            fill="url(#chaiLiquidGrad)"
          />

          {/* 5. Frothy Chai Foam Top Rim */}
          <ellipse cx="50" cy="58" rx="25.5" ry="4.5" fill="url(#chaiFoamGrad)" opacity="0.95" />
          <ellipse cx="50" cy="58.5" rx="23" ry="3" fill="#d97706" opacity="0.3" />

          {/* 6. Simmering Tea Bubbles */}
          <circle cx="42" cy="85" r="2" fill="#fef3c7" className="animate-tea-bubble-1" />
          <circle cx="58" cy="95" r="2.5" fill="#fef3c7" className="animate-tea-bubble-2" />
          <circle cx="50" cy="74" r="1.8" fill="#fde68a" className="animate-tea-bubble-3" />
          <circle cx="36" cy="102" r="1.5" fill="#fef3c7" className="animate-tea-bubble-2" />
          <circle cx="62" cy="78" r="1.6" fill="#fde68a" className="animate-tea-bubble-1" />

          {/* 7. Authentic Cutting Chai Vertical Glass Flutes / Grooves */}
          <line x1="36" y1="52" x2="41" y2="114" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.45" strokeLinecap="round" />
          <line x1="45" y1="52" x2="47" y2="116" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="55" y1="52" x2="53" y2="116" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" strokeLinecap="round" />
          <line x1="64" y1="52" x2="59" y2="114" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.45" strokeLinecap="round" />

          {/* 8. Glass Rim Collar Highlight */}
          <rect x="21" y="44" width="58" height="4" rx="2" fill="#ffffff" fillOpacity="0.6" stroke="#e7e5e4" strokeWidth="0.8" />
        </svg>
      </div>

      {/* Text & Pulsing Status */}
      <div className="space-y-1.5 max-w-xs px-2">
        <h4 className="font-heading font-black text-sm tracking-tight text-stone-900 dark:text-stone-100 flex items-center justify-center gap-1.5 transition-all">
          <span>{activeMessage}</span>
        </h4>

        {submessage ? (
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
            {submessage}
          </p>
        ) : (
          <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
            {isFullscreen ? 'Synchronizing groups, bills & tapris...' : 'Please wait a moment'}
          </p>
        )}

        {/* Shimmering Amber Progress Capsule */}
        <div className="w-32 h-1.5 mx-auto bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden relative mt-2">
          <div className="h-full bg-gradient-to-r from-amber-400 via-amber-600 to-amber-400 rounded-full w-2/3 animate-shimmer" />
        </div>
      </div>
    </div>
  )
}
