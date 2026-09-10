import { FileSearch, ListChecks, ScanSearch, Landmark, Gavel, Gauge } from 'lucide-react'
import { SectionCard, Progress } from './ui'
import { cn } from '../lib/cn'

export interface PipelineStage {
  key: string
  label: string
  icon: JSX.Element
  /** 0–100, or null while there's no data to compute it from yet. */
  percent: number | null
}

export function buildPipelineStages(opts: {
  tendersTotal: number
  tendersParsed: number
  biddersTotal: number
  biddersEvaluated: number
}): PipelineStage[] {
  const tenderPct = opts.tendersTotal > 0 ? Math.round((opts.tendersParsed / opts.tendersTotal) * 100) : null
  // Document analysis, government cross-checks, rule evaluation and risk
  // scoring all happen inside the same evaluate-bidder pipeline call, so an
  // evaluated bidder has, by construction, completed every one of them —
  // the evaluated ratio is a faithful (not fabricated) proxy for each stage.
  const evalPct = opts.biddersTotal > 0 ? Math.round((opts.biddersEvaluated / opts.biddersTotal) * 100) : null
  return [
    { key: 'parsed', label: 'Tender Parsed', icon: <FileSearch className="h-4 w-4" />, percent: tenderPct },
    { key: 'requirements', label: 'Requirements Extracted', icon: <ListChecks className="h-4 w-4" />, percent: tenderPct },
    { key: 'documents', label: 'Documents Analyzed', icon: <ScanSearch className="h-4 w-4" />, percent: evalPct },
    { key: 'sources', label: 'Government Sources Cross-checked', icon: <Landmark className="h-4 w-4" />, percent: evalPct },
    { key: 'rules', label: 'Rules Evaluated', icon: <Gavel className="h-4 w-4" />, percent: evalPct },
    { key: 'risk', label: 'Risk Calculated', icon: <Gauge className="h-4 w-4" />, percent: evalPct },
  ]
}

function toneFor(percent: number | null) {
  if (percent === null) return 'neutral' as const
  if (percent >= 100) return 'success' as const
  if (percent >= 40) return 'primary' as const
  return 'warning' as const
}

/**
 * Sequential AI pipeline visualization for the dashboard. Accepts either the
 * live-computed stages or a `demoOverride` map of key -> percent so the
 * "Run Full Verification Demo" CTA can animate it while a real batch
 * evaluation call is in flight.
 */
export default function VerificationProgressPanel({
  stages,
  demoOverride,
  demoRunning,
}: {
  stages: PipelineStage[]
  demoOverride?: Record<string, number> | null
  demoRunning?: boolean
}) {
  return (
    <SectionCard
      title="Verification Progress"
      description="AI pipeline — how far the platform has gotten across every tender and bidder."
      icon={<Gauge className="h-4 w-4" />}
      className="h-full"
    >
      <ol className="flex flex-col gap-4">
        {stages.map((stage, i) => {
          const overridden = demoOverride?.[stage.key]
          const percent = overridden ?? stage.percent
          const displayPct = percent ?? 0
          return (
            <li key={stage.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold',
                    displayPct >= 100
                      ? 'border-success-200 bg-success-50 text-success-600'
                      : demoRunning && overridden !== undefined
                        ? 'animate-pulse border-primary-300 bg-primary-50 text-primary-600'
                        : 'border-slate-200 bg-slate-50 text-slate-400',
                  )}
                >
                  {i + 1}
                </span>
                {i < stages.length - 1 ? <span className="mt-1 h-6 w-px bg-slate-200" /> : null}
              </div>
              <div className="min-w-0 flex-1 pb-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 truncate text-xs font-semibold text-slate-700">
                    <span className="text-slate-400">{stage.icon}</span>
                    {stage.label}
                  </p>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
                    {percent === null ? '—' : `${Math.round(displayPct)}%`}
                  </span>
                </div>
                <Progress value={displayPct} tone={toneFor(percent)} className="mt-1.5" striped={demoRunning && overridden !== undefined && displayPct < 100} />
              </div>
            </li>
          )
        })}
      </ol>
    </SectionCard>
  )
}
