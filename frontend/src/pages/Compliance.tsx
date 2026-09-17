import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ShieldCheck, Search, Building2, Gauge, CheckCircle2, AlertTriangle, 
  XCircle, FileSpreadsheet, Printer, Filter, ExternalLink, ChevronRight,
  FileCheck2, ShieldAlert
} from 'lucide-react'
import Layout from '../components/Layout'
import {
  StatPanel,
  DataTable,
  FilterBar,
  Pagination,
  Input,
  Select,
  EmptyState,
  ErrorState,
  ScoreIndicator,
  StatusBadge,
  Badge,
  ActionButton,
  SectionHeader,
} from '../components/ui'
import type { Column } from '../components/ui'
import RiskBadge from '../components/RiskBadge'
import DashboardStatusPill from '../components/DashboardStatusPill'
import { getDashboardStats, getDashboardBidders } from '../api/dashboard'
import type { DashboardStats, DashboardBidderRow, RiskLevel } from '../types'
import { getErrorMessage } from '../lib/errors'
import { formatScore, formatRelativeTime, formatDate } from '../lib/format'

const PAGE_SIZE = 10
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high']

type SortBy = 'company_name' | 'compliance_score' | 'status'

/**
 * Enterprise Cross-Tender Compliance Explorer
 * Ministry of Petroleum & Natural Gas ? CPCL SIH 2026
 * Backed by /dashboard endpoints, URL-persisted search & status filters.
 */
export default function Compliance() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsError, setStatsError] = useState(false)

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [sortBy, setSortBy] = useState<SortBy>('compliance_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<DashboardBidderRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Adopt URL query params
  useEffect(() => {
    setSearch(searchParams.get('search') ?? '')
    setStatus(searchParams.get('status') ?? '')
  }, [searchParams])

  // Debounce free-text search
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, sortBy, sortDir])

  useEffect(() => {
    let mounted = true
    getDashboardStats()
      .then((s) => mounted && setStats(s))
      .catch(() => mounted && setStatsError(true))
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    getDashboardBidders({
      search: debouncedSearch || undefined,
      status: status || undefined,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: PAGE_SIZE,
    })
      .then((res) => {
        if (!mounted) return
        setRows(res.items)
        setTotal(res.total)
        setTotalPages(res.total_pages)
      })
      .catch((err) => mounted && setError(getErrorMessage(err)))
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [debouncedSearch, status, sortBy, sortDir, page])

  function onSort(key: string) {
    const k = key as SortBy
    if (k === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(k)
      setSortDir(k === 'company_name' ? 'asc' : 'desc')
    }
  }

  function handleExportCSV() {
    if (!rows.length) return
    const headers = ['Company Name', 'GeM Seller ID', 'Tender Ref', 'Compliance Score', 'Status', 'Risk Level', 'Failed Items', 'Review Items', 'Evaluated At']
    const csvContent = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.company_name.replace(/"/g, '""')}"`,
        `"${r.gem_seller_id || ''}"`,
        `"${r.tender_ref_no}"`,
        r.compliance_score ?? '',
        `"${r.status}"`,
        `"${r.risk_level || ''}"`,
        r.failed_requirements,
        r.review_items,
        `"${r.evaluated_at || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `CPCL_Compliance_Ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const columns = useMemo<Column<DashboardBidderRow>[]>(
    () => [
      {
        key: 'company_name',
        header: 'BIDDER / VENDOR IDENTITY',
        sortable: true,
        render: (r) => (
          <div className="min-w-0 py-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gov-navy hover:text-gov-blue cursor-pointer transition-colors text-xs">
                {r.company_name}
              </span>
              {r.status === 'compliant' && (
                <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-[3px]">
                  VERIFIED
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gov-muted font-mono">
              <span>{r.gem_seller_id ? `GeM: ${r.gem_seller_id}` : 'No GeM Seller ID'}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'tender_ref_no',
        header: 'TENDER REF NO.',
        hideOnMobile: true,
        render: (r) => (
          <span className="font-mono text-xs font-medium text-gov-blue bg-gov-light-blue/60 px-2 py-0.5 rounded-[4px] border border-gov-blue/20">
            {r.tender_ref_no}
          </span>
        ),
      },
      {
        key: 'compliance_score',
        header: 'COMPLIANCE SCORE',
        sortable: true,
        className: 'w-44',
        render: (r) =>
          r.compliance_score === null ? (
            <span className="text-xs text-gov-muted italic">Pending Evaluation</span>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                <span className={r.compliance_score >= 80 ? 'text-gov-success' : r.compliance_score >= 50 ? 'text-gov-warning' : 'text-gov-danger'}>
                  {formatScore(r.compliance_score)}
                </span>
                <span className="text-[10px] text-gov-muted">GFR benchmark</span>
              </div>
              <ScoreIndicator score={r.compliance_score} variant="bar" />
            </div>
          ),
      },
      {
        key: 'status',
        header: 'STATUTORY STATUS',
        sortable: true,
        render: (r) => <DashboardStatusPill status={r.status} />,
      },
      {
        key: 'risk',
        header: 'RISK LEVEL',
        hideOnMobile: true,
        render: (r) =>
          r.risk_level && RISK_LEVELS.includes(r.risk_level as RiskLevel) ? (
            <RiskBadge level={r.risk_level as RiskLevel} />
          ) : (
            <span className="text-xs text-gov-muted">?</span>
          ),
      },
      {
        key: 'issues',
        header: 'AUDIT FLAGS',
        align: 'center',
        hideOnMobile: true,
        render: (r) => (
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono">
            {r.failed_requirements > 0 ? (
              <span
                className="inline-flex items-center gap-1 font-semibold text-gov-danger bg-red-50 px-1.5 py-0.5 rounded border border-red-200"
                title="Failed mandatory criteria"
              >
                ? {r.failed_requirements} failed
              </span>
            ) : (
              <span className="text-gov-success font-medium">? 0 fails</span>
            )}
            {r.review_items > 0 && (
              <span
                className="inline-flex items-center gap-1 font-semibold text-gov-warning bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                title="Items requiring manual verification"
              >
                ? {r.review_items} review
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'evaluated_at',
        header: 'VERIFIED DATE',
        align: 'right',
        hideOnMobile: true,
        render: (r) => (
          <div className="text-right font-mono text-[11px] text-gov-muted">
            <p>{formatRelativeTime(r.evaluated_at)}</p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'ACTION',
        align: 'right',
        render: (r) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/bidders/${r.bidder_id}`)
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

  const statusOptions = [
    { value: '', label: 'All Statutory Statuses' },
    { value: 'compliant', label: 'Statutory Compliant (Passed)' },
    { value: 'needs_review', label: 'Needs Officer Review' },
    { value: 'non_compliant', label: 'Non-Compliant (Rejected)' },
    { value: 'not_evaluated', label: 'Pending Evaluation' },
  ]

  return (
    <Layout>
      {/* Formal Government Section Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <ShieldCheck className="h-3 w-3" />
                GFR 2017 RULE 144 / 149 / 153 AUDIT REPOSITORY
              </span>
              <span className="text-[11px] text-gov-muted font-mono">SIH-26100</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Bidder Statutory & Technical Compliance Ledger
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Official regulatory evaluation repository recording AI-assisted clause verification, statutory certificate validation, and risk scores across CPCL tenders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              variant="outline"
              icon={<FileSpreadsheet className="h-4 w-4 text-emerald-700" />}
              onClick={handleExportCSV}
              disabled={rows.length === 0}
            >
              Export Ledger CSV
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon={<Printer className="h-4 w-4" />}
              onClick={() => window.print()}
            >
              Print Audit Sheet
            </ActionButton>
          </div>
        </div>
      </div>

      {/* Statutory KPI Summary Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Overall Evaluation Rate"
          value={stats ? `${stats.evaluated_bidders} / ${stats.total_bidders}` : '?'}
          subtitle={stats ? `Avg. compliance score: ${formatScore(stats.average_compliance_score)}` : 'Loading?'}
          icon={<Gauge className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="GFR 144"
        />
        <StatPanel
          title="Statutory Compliant"
          value={stats ? stats.compliant_bidders : '?'}
          subtitle="Passed all eligibility & technical criteria"
          icon={<CheckCircle2 className="h-4 w-4 text-gov-success" />}
          tone="success"
          badge="Eligible"
        />
        <StatPanel
          title="Under Officer Review"
          value={stats ? stats.needs_review_bidders : '?'}
          subtitle="Pending clarification or manual verification"
          icon={<AlertTriangle className="h-4 w-4 text-gov-warning" />}
          tone="warning"
          badge="Action Req."
        />
        <StatPanel
          title="Non-Compliant / Rejected"
          value={stats ? stats.non_compliant_bidders : '?'}
          subtitle="Disqualified on mandatory statutory clauses"
          icon={<XCircle className="h-4 w-4 text-gov-danger" />}
          tone="danger"
          badge="Rejected"
        />
      </div>

      {/* Main Compliance Ledger Table */}
      <div className="rounded-[8px] border border-gov-border bg-white shadow-sm">
        <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
              Regulatory Verification Table
            </span>
            <span className="text-[11px] font-mono text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
              {total} Entries Registered
            </span>
          </div>

          {/* Status quick filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStatus('')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
                status === ''
                  ? 'bg-gov-navy text-white border-gov-navy font-semibold'
                  : 'bg-white text-gov-navy border-gov-border hover:bg-slate-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatus('compliant')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
                status === 'compliant'
                  ? 'bg-emerald-700 text-white border-emerald-700 font-semibold'
                  : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              Compliant
            </button>
            <button
              onClick={() => setStatus('needs_review')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
                status === 'needs_review'
                  ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                  : 'bg-white text-amber-800 border-amber-200 hover:bg-amber-50'
              }`}
            >
              Needs Review
            </button>
            <button
              onClick={() => setStatus('non_compliant')}
              className={`px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
                status === 'non_compliant'
                  ? 'bg-red-700 text-white border-red-700 font-semibold'
                  : 'bg-white text-red-800 border-red-200 hover:bg-red-50'
              }`}
            >
              Non-Compliant
            </button>
          </div>
        </div>

        <FilterBar
          search={
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor company name or GeM seller ID?"
              aria-label="Search bidders"
              leftIcon={<Search className="h-4 w-4 text-gov-muted" />}
              className="border-gov-border focus:border-gov-blue"
            />
          }
        >
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="w-56 border-gov-border text-xs font-medium text-gov-navy"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FilterBar>

        {error ? (
          <ErrorState message={error} onRetry={() => setPage((p) => p)} />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(r) => r.bidder_id}
            onRowClick={(r) => navigate(`/bidders/${r.bidder_id}`)}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            loading={loading}
            skeletonRows={PAGE_SIZE}
            empty={
              <EmptyState
                icon={<Building2 className="h-6 w-6 text-gov-blue" />}
                title="No compliance records found"
                description={
                  debouncedSearch || status
                    ? 'No vendor submissions match your search parameters. Clear filters to view full registry.'
                    : 'Once bidders submit documentation and machine evaluation runs, statutory compliance results will appear here.'
                }
              />
            }
          />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="border-t border-gov-border px-4 py-3 bg-slate-50">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Statutory Footer Citation */}
      <div className="mt-4 flex items-center justify-between text-[11px] text-gov-muted px-1">
        <span>Verified against Government e-Marketplace (GeM 4.0) Statutory Verification Guidelines</span>
        <span>CPCL Materials & Procurement Directorate ? Confidential</span>
      </div>
    </Layout>
  )
}
