import React from 'react'
import { Search, X } from 'lucide-react'

export interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  onChangeValue: (value: string) => void
  placeholder?: string
  className?: string
  containerClassName?: string
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeValue,
  placeholder = 'Search',
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center ${containerClassName}`}>
      <Search className="w-4 h-4 text-[#979087] dark:text-[#7C766E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
      <input
        type="text"
        value={value}
        onChange={e => onChangeValue(e.target.value)}
        placeholder={placeholder}
        className={`search-input ${className}`}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChangeValue('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#979087] hover:text-[#343029] dark:hover:text-[#E9E1DF] p-1 rounded-full cursor-pointer transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
