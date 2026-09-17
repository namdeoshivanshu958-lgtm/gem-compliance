import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn'
import type { Tone } from './Badge'

export interface StatPanelProps {
  label?: string
  title?: string
  value: ReactNode
  icon?: ReactNode
  tone?: Tone
  hint?: ReactNode
  subtitle?: ReactNode
  footer?: ReactNode
  badge?: ReactNode
  to?: string
  loading?: boolean
  className?: string
}

const TONE_BAR: Record<Tone, string> = {
  neutral: 'border-l-[#5B6878]',
  primary: 'border-l-[#1F5FAF]',
  navy: 'border-l-[#0B1F3A]',
  success: 'border-l-[#16845B]',
  warning: 'border-l-[#C98200]',
  danger: 'border-l-[#C63D3D]',
  info: 'border-l-[#2468B5]',
}

const ICON_BG: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  primary: 'bg-[#EAF2FA] text-[#1F5FAF]',
  navy: 'bg-[#0B1F3A]/10 text-[#0B1F3A]',
  success: 'bg-[#EAF8F1] text-[#16845B]',
  warning: 'bg-[#FEF9EC] text-[#C98200]',
  danger: 'bg-[#FDF3F3] text-[#C63D3D]',
  info: 'bg-[#EAF2FA] text-[#2468B5]',
}

export default function StatPanel({
  label,
  title,
  value,
  icon,
  tone = 'navy',
  hint,
  subtitle,
  footer,
  badge,
  to,
  loading = false,
  className,
}: StatPanelProps) {
  const effectiveLabel = label ?? title ?? ''
  const effectiveHint = hint ?? subtitle
  const effectiveFooter = footer ?? (badge ? (
    <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-[#0B1F3A] border border-[#D9E1EA] rounded-[3px]">
      {badge}
    </span>
  ) : null)

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
            {effectiveLabel}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-20 skeleton rounded" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-[#172033]">
              {value}
            </p>
          )}
          {effectiveHint && !loading && (
            <p className="mt-1 truncate text-xs text-[#5B6878]">{effectiveHint}</p>
          )}
        </div>
        {icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-sm',
              ICON_BG[tone],
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      {effectiveFooter && (
        <div className="mt-2.5 border-t border-[#D9E1EA] pt-2 text-xs text-[#5B6878]">
          {effectiveFooter}
        </div>
      )}
    </>
  )

  const cardClasses = cn(
    'relative overflow-hidden rounded-[8px] border border-[#D9E1EA] border-l-4 bg-white p-4 shadow-[0_1px_3px_rgba(11,31,58,0.05)] transition-all duration-150',
    TONE_BAR[tone],
    to && 'hover:border-[#1F5FAF] hover:shadow-[0_2px_6px_rgba(11,31,58,0.08)]',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={cn(cardClasses, 'block focus-visible:ring-2 focus-visible:ring-[#1F5FAF]')}>
        {content}
      </Link>
    )
  }

  return <div className={cardClasses}>{content}</div>
}
