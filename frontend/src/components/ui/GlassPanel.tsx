import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  flush?: boolean
  variant?: 'light' | 'navy' | 'subtle'
}

/**
 * Subtle Glassmorphic Panel: institutional glass effect with 1px border,
 * 12-16px backdrop blur, soft institutional shadow, and minimal visual noise.
 */
export default function GlassPanel({
  children,
  className,
  flush = false,
  variant = 'light',
  ...rest
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-[8px] transition-all duration-150',
        variant === 'light' &&
          'bg-white/85 backdrop-blur-[14px] border border-[#14375F]/10 shadow-[0_1px_3px_rgba(11,31,58,0.06)]',
        variant === 'subtle' &&
          'bg-white/70 backdrop-blur-[10px] border border-[#D9E1EA]/80 shadow-sm',
        variant === 'navy' &&
          'bg-[#0B1F3A]/90 text-white backdrop-blur-[16px] border border-white/10 shadow-elevated',
        !flush && 'p-4 sm:p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
