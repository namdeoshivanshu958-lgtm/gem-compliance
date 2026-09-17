import { Landmark, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react'
import { cn } from '../../lib/cn'
import Badge from './Badge'

export interface GovernmentSourceProps {
  id: string
  name: string
  code: string
  purpose: string
  status?: 'OPERATIONAL' | 'CONNECTED' | 'MAINTENANCE' | 'OFFLINE'
  lastSync?: string
  services?: string[]
  agency?: string
  onClick?: () => void
}

export default function GovernmentSourceCard({
  name,
  code,
  purpose,
  status = 'OPERATIONAL',
  lastSync = 'Today, 10:45 AM',
  services = [],
  agency,
  onClick,
}: GovernmentSourceProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex flex-col justify-between rounded-[8px] border border-[#D9E1EA] bg-white p-4 shadow-[0_1px_3px_rgba(11,31,58,0.05)] transition-all duration-150',
        onClick && 'cursor-pointer hover:border-[#1F5FAF] hover:shadow-[0_2px_8px_rgba(31,95,175,0.08)]',
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#EAF2FA] text-[#1F5FAF] font-bold text-xs">
              {code.slice(0, 3).toUpperCase()}
            </span>
            <div>
              <h4 className="text-sm font-bold text-[#0B1F3A] group-hover:text-[#1F5FAF]">
                {name}
              </h4>
              {agency && (
                <p className="text-[11px] text-[#5B6878]">{agency}</p>
              )}
            </div>
          </div>
          <Badge
            tone={status === 'OPERATIONAL' || status === 'CONNECTED' ? 'success' : 'warning'}
            size="sm"
          >
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              {status}
            </span>
          </Badge>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#5B6878]">
          {purpose}
        </p>

        {services.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878]">
              Verification Services
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {services.map((svc) => (
                <span
                  key={svc}
                  className="rounded-[4px] bg-[#F5F7FA] border border-[#D9E1EA] px-2 py-0.5 text-[11px] text-[#172033] font-medium"
                >
                  {svc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#D9E1EA] pt-2.5 text-[11px] text-[#5B6878]">
        <span className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3 text-[#1F5FAF]" />
          Last sync: {lastSync}
        </span>
        <span className="font-medium text-[#1F5FAF] group-hover:underline flex items-center gap-0.5">
          Verified <ExternalLink className="h-2.5 w-2.5" />
        </span>
      </div>
    </div>
  )
}
