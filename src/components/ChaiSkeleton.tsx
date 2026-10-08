import React from 'react'

export interface SkeletonProps {
  count?: number
}

export const ShopCardSkeleton: React.FC<SkeletonProps> = ({ count = 1 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3 relative overflow-hidden animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-stone-200 dark:bg-stone-800 shrink-0" />
              <div className="space-y-1.5">
                <div className="w-28 h-4 rounded-md bg-stone-200 dark:bg-stone-800" />
                <div className="w-20 h-3 rounded-md bg-stone-100 dark:bg-stone-800/60" />
              </div>
            </div>
            <div className="w-10 h-5 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0" />
          </div>
          <div className="w-full h-3 rounded bg-stone-100 dark:bg-stone-800/50" />
          <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800/80">
            <div className="w-16 h-3 rounded bg-stone-100 dark:bg-stone-800/60" />
            <div className="w-20 h-6 rounded-lg bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

export const GroupCardSkeleton: React.FC<SkeletonProps> = ({ count = 1 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-2xs space-y-3 relative overflow-hidden animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-200 dark:bg-stone-800" />
              <div className="space-y-1">
                <div className="w-24 h-3.5 rounded bg-stone-200 dark:bg-stone-800" />
                <div className="w-16 h-2.5 rounded bg-stone-100 dark:bg-stone-800/60" />
              </div>
            </div>
            <div className="w-14 h-5 rounded-md bg-stone-200 dark:bg-stone-800" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/80">
            <div className="w-20 h-3 rounded bg-stone-100 dark:bg-stone-800/60" />
            <div className="w-16 h-6 rounded-lg bg-stone-200 dark:bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

export const BreakItemsSkeleton: React.FC<SkeletonProps> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-2 gap-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-2.5 rounded-xl border border-stone-200/70 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="w-6 h-6 rounded bg-stone-200 dark:bg-stone-700" />
            <div className="w-8 h-3 rounded bg-stone-200 dark:bg-stone-700" />
          </div>
          <div className="w-16 h-3 rounded bg-stone-200 dark:bg-stone-700" />
        </div>
      ))}
    </div>
  )
}
