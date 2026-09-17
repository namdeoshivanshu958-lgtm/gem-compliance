import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface LoadingStateProps {
  message?: string
  description?: string
  className?: string
}

export default function LoadingState({
  message = 'Loading data?',
  description = 'Connecting to institutional services',
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <Loader2 className="h-7 w-7 animate-spin text-[#1F5FAF]" />
      <p className="mt-3 text-sm font-semibold text-[#172033]">{message}</p>
      {description && (
        <p className="mt-1 text-xs text-[#5B6878]">{description}</p>
      )}
    </div>
  )
}
