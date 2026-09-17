import { cn } from '../../lib/cn'

export interface ComplianceDimension {
  name: string
  score: number
  weight?: number
  status?: 'compliant' | 'review' | 'failed'
}

export interface ComplianceIndicatorProps {
  overallScore: number
  dimensions?: ComplianceDimension[]
  className?: string
  showBreakdown?: boolean
}

const DEFAULT_DIMENSIONS: ComplianceDimension[] = [
  { name: 'Technical Compliance', score: 88, weight: 30 },
  { name: 'Financial Compliance', score: 75, weight: 25 },
  { name: 'Legal Compliance', score: 100, weight: 15 },
  { name: 'Document Compliance', score: 82, weight: 15 },
  { name: 'Statutory Compliance', score: 95, weight: 10 },
  { name: 'Procurement Compliance', score: 70, weight: 5 },
]

export default function ComplianceIndicator({
  overallScore,
  dimensions = DEFAULT_DIMENSIONS,
  className,
  showBreakdown = true,
}: ComplianceIndicatorProps) {
  const rounded = Math.round(overallScore)
  const tone =
    rounded >= 70 ? 'text-[#16845B]' : rounded >= 50 ? 'text-[#C98200]' : 'text-[#C63D3D]'
  const barTone =
    rounded >= 70 ? 'bg-[#16845B]' : rounded >= 50 ? 'bg-[#C98200]' : 'bg-[#C63D3D]'

  return (
    <div className={cn('rounded-[8px] border border-[#D9E1EA] bg-white p-5 shadow-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D9E1EA] pb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
            Institutional Compliance Evaluation
          </p>
          <h3 className="text-base font-bold text-[#0B1F3A]">
            Overall Compliance Score
          </h3>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-3xl font-extrabold tabular-nums', tone)}>
            {rounded}%
          </span>
          <span className="text-xs font-medium text-[#5B6878]">/ 100%</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF2FA]">
          <div
            className={cn('h-full transition-all duration-300', barTone)}
            style={{ width: `${Math.min(100, Math.max(0, rounded))}%` }}
          />
        </div>
      </div>

      {showBreakdown && (
        <div className="mt-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
            Compliance Score Breakdown by Dimension
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {dimensions.map((dim) => {
              const dScore = Math.round(dim.score)
              const dBar =
                dScore >= 70 ? 'bg-[#16845B]' : dScore >= 50 ? 'bg-[#C98200]' : 'bg-[#C63D3D]'
              return (
                <div key={dim.name} className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#172033]">{dim.name}</span>
                    <span className="font-bold tabular-nums text-[#0B1F3A]">{dScore}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded bg-slate-200">
                    <div
                      className={cn('h-full transition-all', dBar)}
                      style={{ width: `${dScore}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
