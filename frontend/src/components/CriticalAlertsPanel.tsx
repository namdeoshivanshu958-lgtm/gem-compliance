import { useNavigate } from 'react-router-dom'
import { AlertOctagon, ShieldAlert, Info, ChevronRight } from 'lucide-react'
import { SectionCard, EmptyState, Skeleton } from './ui'
import { formatRelativeTime } from '../lib/format'
import { cn } from '../lib/cn'
import type { RequirementResult } from '../types'

export interface CriticalAlert {
  bidderId: string
  bidderName: string
  requirement: RequirementResult
  evaluatedAt: string | null
}

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

function severityOf(r: RequirementResult): Severity {
  if (r.status === 'NON_COMPLIANT' && r.mandatory) return 'CRITICAL'
  if (r.status === 'NON_COMPLIANT') return 'HIGH'
  return 'MEDIUM'
}

const SEVERITY_STYLE: Record<Severity, { badge: string; icon: JSX.Element }> = {
  CRITICAL: { badge: 'bg-danger-50 text-danger-700 border-danger-200', icon: <AlertOctagon className="h-3.5 w-3.5" /> },
  HIGH: { badge: 'bg-danger-50 text-danger-600 border-danger-100', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  MEDIUM: { badge: 'bg-warning-50 text-warning-700 border-warning-200', icon: <Info className="h-3.5 w-3.5" /> },
}

/**
 * Human-readable, judge-facing explainability panel: real reasons pulled
 * straight from the deterministic compliance engine's requirement_results —
 * not a bare "Failed: 1" count.
 */
export default function CriticalAlertsPanel({
  alerts,
  loading,
}: {
  alerts: CriticalAlert[]
  loading: boolean
}) {
  const navigate = useNavigate()

  const sorted = [...alerts].sort((a, b) => {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
    return rank[severityOf(a.requirement)] - rank[severityOf(b.requirement)]
  })

  return (
    <SectionCard
      title="Critical Alerts"
      description="Specific, human-readable reasons behind every flag — click through to the evidence."
      icon={<AlertOctagon className="h-4 w-4" />}
      className="h-full"
      bodyClassName="p-0"
    >
      {loading ? (
        <div className="space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<AlertOctagon className="h-6 w-6" />}
            title="No discrepancies flagged"
            description="Every recently evaluated bidder is clear of critical or review-level issues."
          />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.slice(0, 6).map((a, i) => {
            const sev = severityOf(a.requirement)
            const style = SEVERITY_STYLE[sev]
            return (
              <li key={`${a.bidderId}-${a.requirement.requirement_id}-${i}`}>
                <button
                  type="button"
                  onClick={() => navigate(`/bidders/${a.bidderId}`)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <span className={cn('mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', style.badge)}>
                    {style.icon}
                    {sev}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{a.bidderName}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{a.requirement.reason}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {a.requirement.requirement} · {formatRelativeTime(a.evaluatedAt)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
