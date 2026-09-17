import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1F5FAF] text-white shadow-sm hover:bg-[#184B8C] active:bg-[#163A63] border border-transparent font-medium',
  secondary:
    'bg-[#0B1F3A] text-white shadow-sm hover:bg-[#163A63] active:bg-[#071426] border border-transparent font-medium',
  outline:
    'bg-white text-[#172033] border border-[#D9E1EA] hover:bg-[#F5F7FA] hover:border-[#B3CFEF] active:bg-[#EAF2FA] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
  ghost:
    'bg-transparent text-[#5B6878] border border-transparent hover:bg-[#EAF2FA] hover:text-[#0B1F3A] active:bg-slate-200 font-medium',
  danger:
    'bg-[#C63D3D] text-white shadow-sm hover:bg-[#A52D2D] active:bg-[#892828] border border-transparent font-medium',
  success:
    'bg-[#16845B] text-white shadow-sm hover:bg-[#126A4A] active:bg-[#11543C] border border-transparent font-medium',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-[6px]',
  md: 'h-9 px-4 text-xs font-semibold tracking-wide uppercase gap-2 rounded-[6px]',
  lg: 'h-10 px-5 text-sm font-semibold tracking-wide gap-2.5 rounded-[7px]',
  icon: 'h-9 w-9 rounded-[6px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  icon?: ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    icon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        (leftIcon ?? icon)
      )}
      {size !== 'icon' ? children : loading ? null : children}
      {!loading ? rightIcon : null}
    </button>
  )
})

export default Button
