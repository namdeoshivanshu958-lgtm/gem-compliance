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
      <PageHeader
        icon={<LayoutDashboard className="h-5 w-5" />}
        title={user?.full_name ? `Welcome, ${user.full_name.split(' ')[0]}` : 'Dashboard'}
        description="Live rollup of tenders, bidders and compliance verification across the platform."
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => setGuidedDemoOpen(true)}
            >
              Guided Demo
            </Button>
            {canManage(user) ? (
              <Button
                leftIcon={<PlayCircle className="h-4 w-4" />}
                onClick={runFullDemo}
                loading={demoRunning}
                disabled={tendersLoading || tenders.length === 0}
              >
                Run Full Verification Demo
              </Button>
            ) : null}
            {canManage(user) ? (
              <Button
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/tenders/new')}
              >
                New tender
              </Button>
            ) : null}
          </>
        }
      />

      {demoMessage ? (
        <Alert
          variant={demoMessage.variant}
          className="mb-4"
          onDismiss={() => setDemoMessage(null)}
          title={demoMessage.variant === 'success' ? 'Demo run complete' : 'Demo run failed'}
        >
          {demoMessage.text}
        </Alert>
      ) : null}

      {/* Summary metrics */}
      {statsError ? (
        <ErrorState message={statsError} onRetry={loadStats} compact />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {statsLoading || !stats ? (
            <StatCardSkeleton count={6} />
          ) : (
            <>
              <StatCard
                label="Tenders"
                value={stats.total_tenders}
                icon={<FileText className="h-5 w-5" />}
                tone="navy"
                to="/tenders"
              />
              <StatCard
                label="Bidders"
                value={stats.total_bidders}
                icon={<Building2 className="h-5 w-5" />}
                tone="primary"
                to="/bidders"
              />
              <StatCard
                label="Avg. score"
                value={formatScore(stats.average_compliance_score)}
                icon={<Gauge className="h-5 w-5" />}
                tone="primary"
                hint={`${stats.evaluated_bidders}/${stats.total_bidders} evaluated`}
              />
              <StatCard
                label="Compliant"
                value={stats.compliant_bidders}
                icon={<CheckCircle2 className="h-5 w-5" />}
                tone="success"
                to="/compliance?status=compliant"
              />
              <StatCard
                label="Needs review"
                value={stats.needs_review_bidders}
                icon={<AlertTriangle className="h-5 w-5" />}
                tone="warning"
                to="/compliance?status=needs_review"
              />
              <StatCard
                label="Non-compliant"
                value={stats.non_compliant_bidders}
                icon={<XCircle className="h-5 w-5" />}
                tone="danger"
                to="/compliance?status=non_compliant"
              />
            </>
          )}
        </div>
      )}

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
