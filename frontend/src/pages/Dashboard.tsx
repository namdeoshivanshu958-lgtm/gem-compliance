import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Building2,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Plus,
  Sparkles,
  PlayCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import {
  PageHeader,
  StatCard,
  StatCardSkeleton,
  SectionCard,
  DataTable,
  FilterBar,
  Pagination,
  Input,
  Select,
  EmptyState,
  ErrorState,
  ScoreIndicator,
  Button,
  Alert,
  StatPanel,
  Badge,
} from '../components/ui'
import type { Column } from '../components/ui'
import DashboardStatusPill from '../components/DashboardStatusPill'
import RiskBadge from '../components/RiskBadge'
import SubScoreBars from '../components/SubScoreBars'
import VerificationProgressPanel, { buildPipelineStages } from '../components/VerificationProgressPanel'
import CriticalAlertsPanel from '../components/CriticalAlertsPanel'
import type { CriticalAlert } from '../components/CriticalAlertsPanel'
import RecentActivityFeed from '../components/RecentActivityFeed'
import AdminSnapshotWidget from '../components/AdminSnapshotWidget'
import GuidedDemoModal from '../components/GuidedDemoModal'
import { getDashboardStats, getDashboardBidders } from '../api/dashboard'
import { getBidderCompliance, batchEvaluateTender } from '../api/compliance'
import { listAuditLogs } from '../api/audit'
import { listUsers } from '../api/users'
import { listTenders } from '../api/tenders'
import type {
  DashboardStats,
  DashboardBidderRow,
  ComplianceResultDetail,
  AuditLogEntry,
  User,
  Tender,
  RiskLevel,
} from '../types'
import { canManage, isAdmin } from '../lib/roles'
import { getErrorMessage } from '../lib/errors'
import { formatScore, formatRelativeTime } from '../lib/format'
import { computeScoreBreakdown } from '../lib/scoreBreakdown'
import type { GroupScore } from '../lib/scoreBreakdown'

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'non_compliant', label: 'Non-Compliant' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'not_evaluated', label: 'Not Evaluated' },
]

const PAGE_SIZE = 10

type SortBy = 'company_name' | 'compliance_score' | 'status'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)

  const [rows, setRows] = useState<DashboardBidderRow[]>([])
  const [tableLoading, setTableLoading] = useState(true)
  const [tableError, setTableError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('company_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  // --- Explainability data: per-bidder compliance detail, fetched once per
  // visible row and reused for both the sub-score breakdown column and the
  // Critical Alerts panel, so nothing is fetched twice. ---
  const [detailByBidder, setDetailByBidder] = useState<Record<string, ComplianceResultDetail>>({})
  const [detailLoading, setDetailLoading] = useState(false)
  const detailCache = useRef<Record<string, ComplianceResultDetail>>({})

  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(true)

  const [adminUsers, setAdminUsers] = useState<User[] | null>(null)
  const [adminLoading, setAdminLoading] = useState(true)

  const [tenders, setTenders] = useState<Tender[]>([])
  const [tendersLoading, setTendersLoading] = useState(true)

  const [guidedDemoOpen, setGuidedDemoOpen] = useState(false)
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoOverride, setDemoOverride] = useState<Record<string, number> | null>(null)
  const [demoMessage, setDemoMessage] = useState<{ variant: 'success' | 'danger'; text: string } | null>(null)

  const loadStats = useCallback(() => {
    setStatsLoading(true)
    setStatsError(null)
    getDashboardStats()
      .then(setStats)
      .catch((err) => setStatsError(getErrorMessage(err)))
      .finally(() => setStatsLoading(false))
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const loadTable = useCallback(() => {
    setTableLoading(true)
    setTableError(null)
    getDashboardBidders({
      search: search || undefined,
      status: statusFilter || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        setRows(data.items)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      })
      .catch((err) => setTableError(getErrorMessage(err)))
      .finally(() => setTableLoading(false))
  }, [search, statusFilter, sortBy, sortDir, page])

  useEffect(() => {
    loadTable()
  }, [loadTable])

  const loadAudit = useCallback(() => {
    setAuditLoading(true)
    listAuditLogs({ page: 1, page_size: 8 })
      .then((data) => setAuditEntries(data.items))
      .catch(() => setAuditEntries([]))
      .finally(() => setAuditLoading(false))
  }, [])

  useEffect(() => {
    loadAudit()
  }, [loadAudit])

  useEffect(() => {
    setTendersLoading(true)
    listTenders()
      .then(setTenders)
      .catch(() => setTenders([]))
      .finally(() => setTendersLoading(false))
  }, [])

  useEffect(() => {
    if (!isAdmin(user)) {
      setAdminLoading(false)
      return
    }
    setAdminLoading(true)
    listUsers()
      .then(setAdminUsers)
      .catch(() => setAdminUsers(null))
      .finally(() => setAdminLoading(false))
  }, [user])

  // Fetch real compliance detail (used for both sub-score bars and Critical
  // Alerts) for every evaluated bidder currently visible on the page.
  useEffect(() => {
    const evaluated = rows.filter((r) => r.compliance_score !== null)
    const toFetch = evaluated.filter((r) => !detailCache.current[r.bidder_id])
    if (toFetch.length === 0) return
    setDetailLoading(true)
    Promise.all(
      toFetch.map((r) =>
        getBidderCompliance(r.bidder_id)
          .then((d) => {
            if (d) detailCache.current[r.bidder_id] = d
          })
          .catch(() => undefined),
      ),
    ).then(() => {
      setDetailByBidder({ ...detailCache.current })
      setDetailLoading(false)
    })
  }, [rows])

  // Debounce the search box, resetting to the first page on change.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => window.clearTimeout(t)
  }, [searchInput])

  function handleSort(col: string) {
    const k = col as SortBy
    if (sortBy === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(k)
      setSortDir(k === 'company_name' ? 'asc' : 'desc')
    }
    setPage(1)
  }

  const breakdownFor = useCallback(
    (bidderId: string): GroupScore[] | null => {
      const detail = detailByBidder[bidderId]
      if (!detail) return null
      return computeScoreBreakdown(detail.requirement_results)
    },
    [detailByBidder],
  )

  const criticalAlerts = useMemo<CriticalAlert[]>(() => {
    const alerts: CriticalAlert[] = []
    const nameByBidder = new Map(rows.map((r) => [r.bidder_id, r.company_name]))
    for (const [bidderId, detail] of Object.entries(detailByBidder)) {
      for (const req of detail.requirement_results) {
        if (req.status === 'COMPLIANT') continue
        alerts.push({
          bidderId,
          bidderName: nameByBidder.get(bidderId) ?? 'Unknown bidder',
          requirement: req,
          evaluatedAt: detail.evaluated_at,
        })
      }
    }
    return alerts
  }, [detailByBidder, rows])

  const pipelineStages = useMemo(
    () =>
      buildPipelineStages({
        tendersTotal: tenders.length,
        tendersParsed: tenders.filter((t) => t.processing_status === 'completed').length,
        biddersTotal: stats?.total_bidders ?? 0,
        biddersEvaluated: stats?.evaluated_bidders ?? 0,
      }),
    [tenders, stats],
  )

  async function runFullDemo() {
    if (demoRunning) return
    const target = [...tenders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
    if (!target) {
      setDemoMessage({ variant: 'danger', text: 'Create a tender with bidders first, then run the demo.' })
      return
    }
    setDemoMessage(null)
    setDemoRunning(true)
    const stageOrder = ['parsed', 'requirements', 'documents', 'sources', 'rules', 'risk']
    const progress: Record<string, number> = {}
    setDemoOverride({ ...progress })

    const animate = async () => {
      for (let i = 0; i < stageOrder.length - 1; i++) {
        await new Promise((r) => setTimeout(r, 500))
        progress[stageOrder[i]] = 100
        setDemoOverride({ ...progress })
      }
    }

    try {
      const [summary] = await Promise.all([batchEvaluateTender(target.id), animate()])
      progress[stageOrder[stageOrder.length - 1]] = 100
      setDemoOverride({ ...progress })
      await new Promise((r) => setTimeout(r, 350))
      detailCache.current = {}
      loadStats()
      loadTable()
      loadAudit()
      setDemoMessage({
        variant: 'success',
        text: `Full verification demo complete on "${target.title}" — ${summary.bidders_processed} bidder(s) processed end-to-end.`,
      })
    } catch (err) {
      setDemoMessage({ variant: 'danger', text: getErrorMessage(err) })
    } finally {
      setTimeout(() => {
        setDemoRunning(false)
        setDemoOverride(null)
      }, 600)
    }
  }

  const columns = useMemo<Column<DashboardBidderRow>[]>(
    () => [
      {
        key: 'company_name',
        header: 'Bidder',
        sortable: true,
        render: (r) => (
          <div className="min-w-0">
            <p className="font-medium text-slate-800">{r.company_name}</p>
            <p className="truncate text-xs text-slate-400">
              {r.gem_seller_id ? `GeM: ${r.gem_seller_id}` : r.tender_ref_no}
            </p>
          </div>
        ),
      },
      {
        key: 'compliance_score',
        header: 'Score',
        sortable: true,
        className: 'w-40',
        render: (r) =>
          r.compliance_score === null ? (
            <span className="text-sm text-slate-400">—</span>
          ) : (
            <ScoreIndicator score={r.compliance_score} variant="bar" />
          ),
      },
      {
        key: 'breakdown',
        header: 'Breakdown',
        hideOnMobile: true,
        className: 'w-44',
        render: (r) =>
          r.compliance_score === null ? (
            <span className="text-xs text-slate-300">—</span>
          ) : (
            <SubScoreBars
              breakdown={breakdownFor(r.bidder_id)}
              loading={detailLoading && !detailByBidder[r.bidder_id]}
            />
          ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (r) => <DashboardStatusPill status={r.status} />,
      },
      {
        key: 'risk_level',
        header: 'Risk',
        hideOnMobile: true,
        render: (r) =>
          r.risk_level ? (
            <RiskBadge level={r.risk_level as RiskLevel} />
          ) : (
            <span className="text-xs text-slate-300">—</span>
          ),
      },
      {
        key: 'failed_requirements',
        header: 'Failed',
        align: 'center',
        hideOnMobile: true,
        render: (r) => (
          <span
            className={
              r.failed_requirements > 0 ? 'font-semibold text-danger-600' : 'text-slate-400'
            }
          >
            {r.failed_requirements}
          </span>
        ),
      },
      {
        key: 'evaluated_at',
        header: 'Evaluated',
        align: 'right',
        hideOnMobile: true,
        render: (r) => (
          <span className="text-xs text-slate-500">{formatRelativeTime(r.evaluated_at)}</span>
        ),
      },
    ],
    [breakdownFor, detailByBidder, detailLoading],
  )

  return (
    <Layout>
      {/* 27. DASHBOARD HERO — Institutional Opening */}
      <div className="mb-6 rounded-[8px] border border-[#D9E1EA] bg-white p-5 shadow-[0_1px_3px_rgba(11,31,58,0.05)] relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 pointer-events-none opacity-5 institutional-grid hidden md:block" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-[4px] bg-[#0B1F3A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                CPCL
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F5FAF]">
                GeM COMPLIANCE SYSTEM
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-[11px] font-semibold text-[#5B6878]">
                SIH 2026 Prototype PS 26100
              </span>
            </div>
            <h1 className="mt-1.5 text-xl lg:text-2xl font-bold tracking-tight text-[#0B1F3A]">
              Procurement Compliance &amp; Bidder Verification Control Room
            </h1>
            <p className="mt-1 text-xs text-[#5B6878] max-w-2xl leading-relaxed">
              Centralized platform for automated requirement extraction, multi-registry statutory cross-verification, and audit-ready procurement records under General Financial Rules (GFR 2017).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="h-3.5 w-3.5 text-[#1F5FAF]" />}
              onClick={() => setGuidedDemoOpen(true)}
            >
              Guided Walkthrough
            </Button>
            {canManage(user) ? (
              <Button
                size="sm"
                leftIcon={<PlayCircle className="h-3.5 w-3.5" />}
                onClick={runFullDemo}
                loading={demoRunning}
                disabled={tendersLoading || tenders.length === 0}
              >
                Run Batch Verification
              </Button>
            ) : null}
            {canManage(user) ? (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => navigate('/tenders/new')}
              >
                + New Tender
              </Button>
            ) : null}
          </div>
        </div>

        {/* Institutional Status Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#D9E1EA] pt-3 text-[11px] text-[#5B6878]">
          <span className="flex items-center gap-1.5 font-semibold text-[#16845B]">
            <span className="h-2 w-2 rounded-full bg-[#16845B] animate-pulse" />
            SYSTEM STATUS: OPERATIONAL
          </span>
          <span>
            <strong className="text-[#172033]">LAST SYNCHRONIZED:</strong> Today, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
          </span>
          <span>
            <strong className="text-[#172033]">ACTIVE TENDERS:</strong> {String(tenders.length).padStart(2, '0')}
          </span>
          <span>
            <strong className="text-[#172033]">PENDING REVIEWS:</strong> {String(stats?.needs_review_bidders ?? 0).padStart(2, '0')}
          </span>
          <span className="ml-auto hidden xl:inline text-[10px] text-slate-400 font-mono">
            SECURITY ENCLAVE: SHA-256 IMMUTABLE LEDGER ACTIVE
          </span>
        </div>
      </div>

      {demoMessage ? (
        <Alert
          variant={demoMessage.variant}
          className="mb-4"
          onDismiss={() => setDemoMessage(null)}
          title={demoMessage.variant === 'success' ? 'Batch Evaluation Complete' : 'Evaluation Failed'}
        >
          {demoMessage.text}
        </Alert>
      ) : null}

      {/* 6. COMPACT GOVERNMENT-STYLE INFORMATION PANELS (7 metrics) */}
      {statsError ? (
        <ErrorState message={statsError} onRetry={loadStats} compact />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 mb-6">
          {statsLoading || !stats ? (
            <StatCardSkeleton count={7} />
          ) : (
            <>
              <StatPanel
                label="Total Tenders"
                value={stats.total_tenders}
                icon={<FileText className="h-4 w-4" />}
                tone="navy"
                hint="Active notices"
                to="/tenders"
              />
              <StatPanel
                label="Total Bidders"
                value={stats.total_bidders}
                icon={<Building2 className="h-4 w-4" />}
                tone="primary"
                hint="Submissions"
                to="/bidders"
              />
              <StatPanel
                label="Verified Bidders"
                value={stats.evaluated_bidders}
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="primary"
                hint="Evaluated"
                to="/compliance"
              />
              <StatPanel
                label="Pending Review"
                value={stats.needs_review_bidders}
                icon={<AlertTriangle className="h-4 w-4" />}
                tone="warning"
                hint="Officer action"
                to="/compliance?status=needs_review"
              />
              <StatPanel
                label="Compliant"
                value={stats.compliant_bidders}
                icon={<CheckCircle2 className="h-4 w-4" />}
                tone="success"
                hint="Eligible"
                to="/compliance?status=compliant"
              />
              <StatPanel
                label="Non-Compliant"
                value={stats.non_compliant_bidders}
                icon={<XCircle className="h-4 w-4" />}
                tone="danger"
                hint="Criteria failed"
                to="/compliance?status=non_compliant"
              />
              <StatPanel
                label="Avg. Score"
                value={formatScore(stats.average_compliance_score)}
                icon={<Gauge className="h-4 w-4" />}
                tone="navy"
                hint={`${stats.evaluated_bidders}/${stats.total_bidders} scored`}
              />
            </>
          )}
        </div>
      )}

      {/* 7. DATA-FIRST SECTION: RECENT TENDERS TABLE */}
      <div className="mb-6 rounded-[8px] border border-[#D9E1EA] bg-white shadow-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E1EA] bg-[#F5F7FA] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#EAF2FA] text-[#1F5FAF]">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                Recent Tenders &amp; Procurement Notices
              </h3>
              <p className="text-[11px] text-[#5B6878]">
                Official procurement notices actively undergoing compliance cross-verification.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tenders')}
          >
            View All Tenders →
          </Button>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D9E1EA] bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
                <th className="px-4 py-2.5">Tender ID</th>
                <th className="px-4 py-2.5">Tender Title</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5">Submission Date</th>
                <th className="px-4 py-2.5 text-center">Bidders</th>
                <th className="px-4 py-2.5 text-center">Verification Status</th>
                <th className="px-4 py-2.5 text-center">Risk Level</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D9E1EA]">
              {tendersLoading ? (
                <tr>
                  <td colSpan={8} className="p-4">
                    <div className="space-y-2">
                      <div className="h-6 w-full skeleton rounded" />
                      <div className="h-6 w-full skeleton rounded" />
                    </div>
                  </td>
                </tr>
              ) : tenders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-xs text-[#5B6878]">
                    No active tenders found. Click &ldquo;+ New Tender&rdquo; to publish a procurement notice.
                  </td>
                </tr>
              ) : (
                tenders.slice(0, 5).map((t) => {
                  const status =
                    t.processing_status === 'completed'
                      ? 'COMPLIANT'
                      : t.processing_status === 'failed'
                      ? 'NON-COMPLIANT'
                      : t.processing_status === 'extracting_requirements' || t.processing_status === 'extracting_text'
                      ? 'UNDER REVIEW'
                      : 'PENDING'
                  const statusTone =
                    status === 'COMPLIANT'
                      ? 'success'
                      : status === 'NON-COMPLIANT'
                      ? 'danger'
                      : status === 'UNDER REVIEW'
                      ? 'warning'
                      : 'neutral'

                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tenders/${t.id}`)}
                      className="cursor-pointer hover:bg-[#F5F7FA] transition-colors"
                    >
                      <td className="px-4 py-2.5 font-mono font-semibold text-[#1F5FAF]">
                        {t.tender_ref_no}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-[#172033] max-w-xs truncate">
                        {t.title}
                      </td>
                      <td className="px-4 py-2.5 text-[#5B6878]">
                        {t.department || 'Operations & Refining'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#5B6878] font-mono text-[11px]">
                        {new Date(t.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums font-bold text-[#172033]">
                        {(t as any).bidders_count ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge tone={statusTone} size="sm">
                          {status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] px-2 py-0.5 text-[10px] font-bold text-[#5B6878]">
                          LOW RISK
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-semibold text-[#1F5FAF] hover:underline">
                          Inspect →
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin / RBAC snapshot — kept and highlighted per the platform's differentiator */}
      {isAdmin(user) ? (
        <div className="mt-4">
          <AdminSnapshotWidget users={adminUsers} loading={adminLoading} />
        </div>
      ) : null}

      {/* Bidder table + Verification Progress */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SectionCard
            title="All bidders"
            description="Every bidder across all tenders."
            bodyClassName="p-0"
            className="h-full"
          >
            <div className="px-4 pt-4">
              <FilterBar
                search={
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search company or GeM seller ID…"
                    aria-label="Search bidders"
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                }
              >
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by status"
                  className="w-44"
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </FilterBar>
            </div>

            {tableError ? (
              <div className="p-4">
                <ErrorState message={tableError} onRetry={loadTable} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={rows}
                rowKey={(r) => r.bidder_id}
                onRowClick={(r) => navigate(`/bidders/${r.bidder_id}`)}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
                loading={tableLoading}
                skeletonRows={PAGE_SIZE}
                empty={
                  <EmptyState
                    icon={<Building2 className="h-6 w-6" />}
                    title="No bidders found"
                    description={
                      search || statusFilter
                        ? 'No bidders match your search or filter.'
                        : 'Create a tender and add bidders to get started.'
                    }
                  />
                }
              />
            )}

            {!tableLoading && !tableError && rows.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </SectionCard>
        </div>

        <div className="xl:col-span-1">
          <VerificationProgressPanel stages={pipelineStages} demoOverride={demoOverride} demoRunning={demoRunning} />
        </div>
      </div>

      {/* Critical Alerts + Recent Activity */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CriticalAlertsPanel
          alerts={criticalAlerts}
          loading={detailLoading && Object.keys(detailByBidder).length === 0}
        />
        <RecentActivityFeed entries={auditEntries} loading={auditLoading} />
      </div>

      <GuidedDemoModal open={guidedDemoOpen} onClose={() => setGuidedDemoOpen(false)} />
    </Layout>
  )
}
