import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Plus, Search, FileSpreadsheet, ChevronRight, 
  Layers, Clock, CheckCircle2, AlertCircle
} from 'lucide-react'
import Layout from '../components/Layout'
import ProcessingStatusBadge from '../components/ProcessingStatusBadge'
import {
  DataTable,
  FilterBar,
  Input,
  Select,
  Badge,
  StatPanel,
  ActionButton,
  EmptyState,
  ErrorState,
} from '../components/ui'
import type { Column, Tone } from '../components/ui'
import { listTenders } from '../api/tenders'
import type { Tender, TenderStatus } from '../types'
import { useAuth } from '../context/AuthContext'
import { canManage } from '../lib/roles'
import { getErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'

const TENDER_STATUS_META: Record<TenderStatus, { tone: Tone; label: string }> = {
  draft: { tone: 'neutral', label: 'Draft' },
  open: { tone: 'info', label: 'Active / Open' },
  under_evaluation: { tone: 'warning', label: 'Under Technical Evaluation' },
  closed: { tone: 'primary', label: 'Evaluation Closed' },
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All Procurement Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Active / Open' },
  { value: 'under_evaluation', label: 'Under Technical Evaluation' },
  { value: 'closed', label: 'Evaluation Closed' },
]

export default function TenderList() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tenders, setTenders] = useState<Tender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    listTenders()
      .then(setTenders)
      .catch((err) => setError(getErrorMessage(err, 'Failed to load tenders')))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tenders.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false
      if (!q) return true
      return (
        t.tender_ref_no.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.department ?? '').toLowerCase().includes(q) ||
        (t.organization ?? '').toLowerCase().includes(q)
      )
    })
  }, [tenders, search, statusFilter])

  // Calculated stats
  const stats = useMemo(() => {
    const total = tenders.length
    const open = tenders.filter((t) => t.status === 'open').length
    const underEval = tenders.filter((t) => t.status === 'under_evaluation').length
    const closed = tenders.filter((t) => t.status === 'closed').length
    return { total, open, underEval, closed }
  }, [tenders])

  function handleExportCSV() {
    if (!filtered.length) return
    const headers = ['Tender Ref No', 'Title', 'Department', 'Status', 'Processing Status', 'Created At']
    const csvContent = [
      headers.join(','),
      ...filtered.map(t => [
        `"${t.tender_ref_no}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.department || t.organization || ''}"`,
        `"${t.status}"`,
        `"${t.processing_status}"`,
        `"${t.created_at}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `CPCL_Tender_Registry_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const columns = useMemo<Column<Tender>[]>(
    () => [
      {
        key: 'tender_ref_no',
        header: 'TENDER REFERENCE NO.',
        render: (t) => (
          <span className="font-mono text-xs font-semibold text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/20">
            {t.tender_ref_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: 'PROCUREMENT TITLE & DEPARTMENT',
        render: (t) => (
          <div className="min-w-0 py-0.5">
            <p className="font-semibold text-xs text-gov-navy hover:text-gov-blue cursor-pointer transition-colors">
              {t.title}
            </p>
            <p className="truncate font-mono text-[11px] text-gov-muted mt-0.5">
              {t.department || t.organization || 'Materials & Procurement Directorate'}
            </p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'PROCUREMENT STAGE',
        render: (t) => {
          const meta = TENDER_STATUS_META[t.status]
          return (
            <Badge tone={meta.tone} size="sm">
              {meta.label}
            </Badge>
          )
        },
      },
      {
        key: 'processing_status',
        header: 'DOCUMENT INTELLIGENCE',
        hideOnMobile: true,
        render: (t) => <ProcessingStatusBadge status={t.processing_status} />,
      },
      {
        key: 'created_at',
        header: 'PUBLISHED DATE',
        align: 'right',
        hideOnMobile: true,
        render: (t) => <span className="font-mono text-[11px] text-gov-muted">{formatDate(t.created_at)}</span>,
      },
      {
        key: 'actions',
        header: 'ACTION',
        align: 'right',
        render: (t) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/tenders/${t.id}`)
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue hover:text-gov-navy transition-colors px-2 py-1 rounded-[4px] hover:bg-gov-light-blue"
          >
            <span>Details</span>
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
                <FileText className="h-3 w-3" />
                CPCL CENTRAL TENDER INVENTORY
              </span>
              <span className="text-[11px] font-mono text-gov-muted">GFR 2017 / GeM 4.0</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              e-Procurement Tender Registry & Compliance Monitor
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Central catalog of tender notices, AI document requirement extraction, and multi-bidder statutory verification pipelines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ActionButton
              variant="outline"
              icon={<FileSpreadsheet className="h-4 w-4 text-emerald-700" />}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
            >
              Export Registry CSV
            </ActionButton>
            {canManage(user) && (
              <ActionButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/tenders/new')}
              >
                Create New Tender
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Total Tenders"
          value={stats.total}
          subtitle="Procurement notices published"
          icon={<Layers className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Notices"
        />
        <StatPanel
          title="Active / Open"
          value={stats.open}
          subtitle="Accepting vendor submissions"
          icon={<Clock className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Live"
        />
        <StatPanel
          title="Under Technical Eval"
          value={stats.underEval}
          subtitle="Compliance verification ongoing"
          icon={<AlertCircle className="h-4 w-4 text-gov-warning" />}
          tone="warning"
          badge="Active Review"
        />
        <StatPanel
          title="Evaluation Closed"
          value={stats.closed}
          subtitle="Evaluation complete & archived"
          icon={<CheckCircle2 className="h-4 w-4 text-gov-success" />}
          tone="success"
          badge="Completed"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="rounded-[8px] border border-gov-border bg-white shadow-sm">
          <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                Tender Master Ledger
              </span>
              <span className="text-[11px] font-mono text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
                {filtered.length} of {tenders.length} entries
              </span>
            </div>

            {/* Quick Status Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-[4px] border transition-colors ${
                    statusFilter === f.value
                      ? 'bg-gov-navy text-white border-gov-navy font-semibold'
                      : 'bg-white text-gov-navy border-gov-border hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <FilterBar
            search={
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reference number, procurement title, or department?"
                aria-label="Search tenders"
                leftIcon={<Search className="h-4 w-4 text-gov-muted" />}
                className="border-gov-border focus:border-gov-blue"
              />
            }
          >
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-56 border-gov-border text-xs font-medium text-gov-navy"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FilterBar>

          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(t) => t.id}
            onRowClick={(t) => navigate(`/tenders/${t.id}`)}
            loading={isLoading}
            skeletonRows={8}
            empty={
              <EmptyState
                icon={<FileText className="h-6 w-6 text-gov-blue" />}
                title={tenders.length === 0 ? 'No tenders published yet' : 'No matching tenders found'}
                description={
                  tenders.length === 0
                    ? canManage(user)
                      ? 'Click "Create New Tender" to upload your first tender document and extract clauses.'
                      : 'Tenders will appear here once published by procurement officers.'
                    : 'No tender records match your current filter criteria.'
                }
                action={
                  tenders.length === 0 && canManage(user) ? (
                    <ActionButton
                      variant="primary"
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() => navigate('/tenders/new')}
                    >
                      Create New Tender
                    </ActionButton>
                  ) : undefined
                }
              />
            }
          />
        </div>
      )}
    </Layout>
  )
}
