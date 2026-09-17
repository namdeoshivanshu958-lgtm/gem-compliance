import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
  headerClassName?: string
}

export default function FormSection({
  title,
  description,
  children,
  className,
  headerClassName,
}: FormSectionProps) {
  return (
    <section className={cn('rounded-[8px] border border-[#D9E1EA] bg-white shadow-card overflow-hidden', className)}>
      <header className={cn('border-b border-[#D9E1EA] bg-[#F5F7FA] px-5 py-3.5', headerClassName)}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs text-[#5B6878]">{description}</p>
        )}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}
