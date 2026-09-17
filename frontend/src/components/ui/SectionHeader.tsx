import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface SectionHeaderProps {
  title: string
  tag?: string
  description?: ReactNode
  actions?: ReactNode
  icon?: ReactNode
  className?: string
}

export default function SectionHeader({
  title,
  tag,
  description,
  actions,
  icon,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4 border-b border-[#D9E1EA] pb-3.5', className)}>
      <div className="min-w-0 flex-1">
        {tag && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1F5FAF]">
            {tag}
          </p>
        )}
        <div className="flex items-center gap-2.5 mt-0.5">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#EAF2FA] text-[#1F5FAF]">
              {icon}
            </span>
          )}
          <h2 className="text-base font-bold tracking-tight text-[#0B1F3A]">
            {title}
          </h2>
        </div>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-[#5B6878]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
