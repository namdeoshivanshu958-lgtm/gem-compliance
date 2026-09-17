import { SCORE_GROUP_LABELS } from '../lib/scoreBreakdown'
import type { GroupScore } from '../lib/scoreBreakdown'
import { cn } from '../lib/cn'

function barTone(score: number | null) {
  if (score === null) return 'bg-slate-200'
  if (score >= 80) return 'bg-success-500'
  if (score >= 50) return 'bg-warning-500'
  return 'bg-danger-500'
}

/**
 * Small "STAT / TECH / FIN / DOCS / LEGAL"-style breakdown: four thin bars,
 * each labelled, showing the real per-category compliance percentage
 * produced by the rule engine for one bidder.
 */
export default function SubScoreBars({
  breakdown,
  loading,
}: {
  breakdown: GroupScore[] | null | undefined
  loading?: boolean
  /** @deprecated layout is always single-column now; kept so old call sites don't break. */
  compact?: boolean
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-1.5 w-full max-w-[140px] skeleton" />
        ))}
      </div>
    )
  }
  if (!breakdown) return <span className="text-xs text-slate-400">—</span>

  return (
    <div className="flex flex-col gap-1">
      {breakdown.map(({ group, score, compliant, total }) => (
        <div
          key={group}
          className="flex items-center gap-1.5"
          title={`${SCORE_GROUP_LABELS[group]}: ${score === null ? 'no requirements' : `${compliant}/${total} compliant`}`}
        >
          <span className="w-12 shrink-0 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {SCORE_GROUP_LABELS[group]}
          </span>
          <span className="h-1.5 min-w-[28px] flex-1 shrink overflow-hidden rounded-full bg-slate-100">
            <span
              className={cn('block h-full rounded-full transition-all', barTone(score))}
              style={{ width: `${score ?? 0}%` }}
            />
          </span>
          <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-slate-500">
            {score === null ? '—' : `${score}%`}
          </span>
        </div>
      ))}
    </div>
  )
}
