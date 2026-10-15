import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'inverted' | 'outlined'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    inverted: 'btn-inverted',
    outlined: 'btn-outlined'
  }[variant]

  const sizeClass = {
    sm: 'text-xs py-1.5 px-3',
    md: 'text-xs md:text-sm py-2 px-4',
    lg: 'text-sm md:text-base py-2.5 px-5'
  }[size]

  return (
    <button
      type={props.type || 'button'}
      disabled={disabled}
      className={`${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
