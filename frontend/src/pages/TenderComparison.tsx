import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  BarChart3, Trophy, Building2, AlertTriangle, ArrowLeft, 
  PlayCircle, FileSpreadsheet, ShieldCheck, CheckCircle2, 
  XCircle, ChevronRight, Scale
} from 'lucide-react'
import Layout from '../components/Layout'
import ComplianceStatusBadge from '../components/ComplianceStatusBadge'
import RiskBadge from '../components/RiskBadge'
import {
  DataTable,
  ScoreIndicator,
  StatPanel,
  ActionButton,
  EmptyState,
  ErrorState,
  Alert,
  Badge,
} from '../components/ui'
import type { Column } from '../components/ui'
import { getTenderComparison, batchEvaluateTender } from '../api/compliance'
import type { BidderComparisonEntry, ComplianceStatus, RiskLevel } from '../types'
import { getErrorMessage } from '../lib/errors'
import { formatRelativeTime, formatScore } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { canManage } from '../lib/roles'

const COMPLIANCE_STATUSES = new Set<string>(['compliant', 'non_compliant', 'needs_review'])
const RISK_LEVELS = new Set<string>(['low', 'medium', 'high'])

function getRankBadge(rank: number) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 rounded-[3px]">
        L-1 (HIGHEST)
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 rounded-[3px]">
        L-2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-300 rounded-[3px]">
        L-3
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-semibold text-gov-muted bg-slate-50 border border-slate-200 rounded-[3px]">
      L-{rank}
    </span>
  )
}

export default function TenderComparison() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = canManage(user)

  const [bidders, setBidders] = useState<BidderComparisonEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isBatchRunning, setIsBatchRunning] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [batchNotice, setBatchNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    getTenderComparison(id)
      .then((data) => setBidders(data.bidders))
      .catch((err) => setError(getErrorMessage(err, 'Failed to load bidder comparison')))
      .finally(() => setIsLoading(false))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function handleBatchRun() {
    if (!id) return
    setBatchError(null)
    setBatchNotice(null)
    setIsBatchRunning(true)
    try {
      const summary = await batchEvaluateTender(id)
      const failed = summary.results.filter((r) => !r.success)
      setBatchNotice(
        `Successfully processed and evaluated ${summary.bidders_processed} bidder submission(s)` +
          (failed.length ? ` ? ${failed.length} failed evaluation (see audit logs).` : '.'),
      )
      load()
    } catch (err) {
      setBatchError(getErrorMessage(err, 'Batch verification/evaluation failed.'))
    } finally {
      setIsBatchRunning(false)
    }
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = bidders.length
    const compliant = bidders.filter((b) => b.overall_status === 'compliant').length
    const failedMandatory = bidders.filter((b) => b.mandatory_failed).length
    const avgScore = total > 0
      ? bidders.reduce((acc, b) => acc + (b.compliance_score || 0), 0) / total
      : null
    return { total, compliant, failedMandatory, avgScore }
  }, [bidders])

  function handleExportCSV() {
    if (!bidders.length) return
    const headers = ['Rank', 'Company Name', 'Compliance Score', 'Status', 'Risk Level', 'Mandatory Failed', 'Compliant Clauses', 'Failed Clauses', 'Review Items', 'Total Clauses', 'Evaluated At']
    const csvContent = [
      headers.join(','),
      ...bidders.map((b, i) => [
        i + 1,
        `"${b.company_name.replace(/"/g, '""')}"`,
        b.compliance_score,
        `"${b.overall_status}"`,
        `"${b.risk_level}"`,
        b.mandatory_failed ? 'YES' : 'NO',
        b.compliant_count,
        b.non_compliant_count,
        b.needs_review_count,
        b.total_requirements,
        `"${b.evaluated_at || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `CPCL_Comparative_Ranking_Tender_${id?.slice(0, 8)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const columns = useMemo<Column<BidderComparisonEntry>[]>(
    () => [
      {
        key: 'rank',
        header: 'MERIT RANK',
        align: 'center',
        className: 'w-24',
        render: (_b, i) => getRankBadge(i + 1),
      },
      {
        key: 'company_name',
        header: 'BIDDER / VENDOR IDENTITY',
        render: (b) => (
          <div className="min-w-0 py-0.5">
            <p className="font-semibold text-xs text-gov-navy hover:text-gov-blue cursor-pointer transition-colors">
              {b.company_name}
            </p>
            {b.mandatory_failed && (
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gov-danger bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                <AlertTriangle className="h-3 w-3" />
                Mandatory GFR Clause Failed
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'compliance_score',
        header: 'COMPLIANCE SCORE',
        className: 'w-48',
        render: (b) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold">
              <span className={b.compliance_score >= 80 ? 'text-gov-success' : b.compliance_score >= 50 ? 'text-gov-warning' : 'text-gov-danger'}>
                {formatScore(b.compliance_score)}
              </span>
              <span className="text-[10px] text-gov-muted">Weighted index</span>
            </div>
            <ScoreIndicator score={b.compliance_score} variant="bar" />
          </div>
        ),
      },
      {
        key: 'overall_status',
        header: 'EVALUATION STATUS',
        render: (b) =>
          COMPLIANCE_STATUSES.has(b.overall_status) ? (
            <ComplianceStatusBadge status={b.overall_status as ComplianceStatus} />
          ) : (
            <span className="text-gov-muted text-xs">?</span>
          ),
      },
      {
        key: 'risk_level',
        header: 'RISK BENCHMARK',
        hideOnMobile: true,
        render: (b) =>
          RISK_LEVELS.has(b.risk_level) ? (
            <RiskBadge level={b.risk_level as RiskLevel} />
          ) : (
            <span className="text-gov-muted text-xs">?</span>
          ),
      },
      {
        key: 'breakdown',
        header: 'CLAUSE VERIFICATION BREAKDOWN',
        align: 'center',
        hideOnMobile: true,
        render: (b) => (
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono tabular-nums">
            <span className="inline-flex items-center gap-0.5 text-gov-success bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Compliant clauses">
              ? {b.compliant_count}
            </span>
            <span className="inline-flex items-center gap-0.5 text-gov-danger bg-red-50 px-1.5 py-0.5 rounded border border-red-200" title="Failed clauses">
              ? {b.non_compliant_count}
            </span>
            <span className="inline-flex items-center gap-0.5 text-gov-warning bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Needs review">
              ! {b.needs_review_count}
            </span>
            <span className="text-gov-muted text-[10px]" title="Total requirements">
              / {b.total_requirements}
            </span>
          </div>
        ),
      },
      {
        key: 'evaluated_at',
        header: 'LAST EVALUATED',
        align: 'right',
        hideOnMobile: true,
        render: (b) => (
          <span className="font-mono text-[11px] text-gov-muted">{formatRelativeTime(b.evaluated_at)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'ACTION',
        align: 'right',
        render: (b) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/bidders/${b.bidder_id}`)
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue hover:text-gov-navy transition-colors px-2 py-1 rounded-[4px] hover:bg-gov-light-blue"
          >
            <span>Dossier</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ),
      },
    ],
    [navigate],
  )

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <Scale className="h-3 w-3" />
                TECHNICAL EVALUATION COMMITTEE ? GFR 2017 RULE 173
              </span>
              <span className="text-[11px] font-mono text-gov-muted">SIH 2026</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Comparative Bidder Compliance Matrix & Merit Ranking
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Objective machine-assisted compliance ordering across all participating vendors for this tender notice. Review mandatory failure exclusions prior to commercial envelope opening.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              variant="outline"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => navigate(id ? `/tenders/${id}` : '/tenders')}
            >
              Tender Dossier
            </ActionButton>
            <ActionButton
              variant="outline"
              icon={<FileSpreadsheet className="h-4 w-4 text-emerald-700" />}
              onClick={handleExportCSV}
              disabled={bidders.length === 0}
            >
              Export Matrix CSV
            </ActionButton>
            {isManager && (
              <ActionButton
                variant="primary"
                icon={<PlayCircle className="h-4 w-4" />}
                onClick={handleBatchRun}
                loading={isBatchRunning}
              >
                {isBatchRunning ? 'Running Evaluation?' : 'Batch Evaluate All Bidders'}
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      {batchNotice && (
        <Alert variant="success" className="mb-4" onDismiss={() => setBatchNotice(null)}>
          {batchNotice}
        </Alert>
      )}
      {batchError && (
        <Alert variant="danger" className="mb-4" onDismiss={() => setBatchError(null)}>
          {batchError}
        </Alert>
      )}

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Participating Bidders"
          value={stats.total}
          subtitle="Total submissions in comparison"
          icon={<BarChart3 className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Bidders"
        />
        <StatPanel
          title="Statutory Compliant"
          value={stats.compliant}
          subtitle="Technically qualified candidates"
          icon={<CheckCircle2 className="h-4 w-4 text-gov-success" />}
          tone="success"
          badge="Qualified"
        />
        <StatPanel
          title="Mandatory Rejections"
          value={stats.failedMandatory}
          subtitle="Disqualified under GFR criteria"
          icon={<XCircle className="h-4 w-4 text-gov-danger" />}
          tone="danger"
          badge="Disqualified"
        />
        <StatPanel
          title="Average Score"
          value={formatScore(stats.avgScore)}
          subtitle="Mean technical compliance index"
          icon={<Trophy className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Avg Index"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="rounded-[8px] border border-gov-border bg-white shadow-sm">
          <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                Ranked Vendor Evaluation Ledger
              </span>
              <span className="text-[11px] font-mono text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
                {bidders.length} Bidders Evaluated
              </span>
            </div>
            <span className="text-xs text-gov-muted font-mono">
              Highest Compliance Score First
            </span>
          </div>

          <DataTable
            columns={columns}
            data={bidders}
            rowKey={(b) => b.bidder_id}
            onRowClick={(b) => navigate(`/bidders/${b.bidder_id}`)}
            loading={isLoading}
            skeletonRows={6}
            empty={
              <EmptyState
                icon={<Building2 className="h-6 w-6 text-gov-blue" />}
                title="No evaluated bidder submissions"
                description="Upload bidder eligibility documents and click 'Batch Evaluate All Bidders' or evaluate individually to populate this comparative matrix."
              />
            }
          />
        </div>
      )}
    </Layout>
  )
}
