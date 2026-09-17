import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Building2, Plus, Search, FileX2, ShieldCheck, CheckCircle2, 
  AlertTriangle, FileSpreadsheet, ArrowLeft, ChevronRight, FileText
} from 'lucide-react'
import Layout from '../components/Layout'
import BidderConsistencyStatusBadge from '../components/BidderConsistencyStatusBadge'
import {
  DataTable,
  FilterBar,
  Input,
  StatPanel,
  ActionButton,
  EmptyState,
  ErrorState,
  Badge,
} from '../components/ui'
import type { Column } from '../components/ui'
import { listBidders } from '../api/bidders'
import { getTender } from '../api/tenders'
import type { Bidder, Tender } from '../types'
import { useAuth } from '../context/AuthContext'
import { canManage } from '../lib/roles'
import { getErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'

export default function BidderList() {
  const [searchParams] = useSearchParams()
  const tenderId = searchParams.get('tender_id') || undefined
  const navigate = useNavigate()
  const { user } = useAuth()

  const [bidders, setBidders] = useState<Bidder[]>([])
  const [tender, setTender] = useState<Tender | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    Promise.all([listBidders(tenderId), tenderId ? getTender(tenderId) : Promise.resolve(null)])
      .then(([b, t]) => {
        setBidders(b)
        setTender(t)
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load bidders')))
      .finally(() => setIsLoading(false))
  }, [tenderId])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return bidders
    return bidders.filter(
      (b) =>
        b.company_name.toLowerCase().includes(q) ||
        (b.gem_seller_id ?? '').toLowerCase().includes(q) ||
        (b.contact_email ?? '').toLowerCase().includes(q)
    )
  }, [bidders, search])

  // Computed summary metrics
  const stats = useMemo(() => {
    const total = bidders.length
    const consistent = bidders.filter((b) => b.consistency_status === 'consistent').length
    const withMissingDocs = bidders.filter((b) => (b.missing_document_types?.length ?? 0) > 0).length
    const flagged = bidders.filter((b) => b.consistency_status === 'inconsistent' || b.consistency_status === 'needs_review').length
    return { total, consistent, withMissingDocs, flagged }
  }, [bidders])

  function handleExportCSV() {
    if (!filtered.length) return
    const headers = ['Company Name', 'GeM Seller ID', 'Consistency Status', 'Contact Email', 'Contact Phone', 'Missing Docs Count', 'Created At']
    const csvContent = [
      headers.join(','),
      ...filtered.map(b => [
        `"${b.company_name.replace(/"/g, '""')}"`,
        `"${b.gem_seller_id || ''}"`,
        `"${b.consistency_status || ''}"`,
        `"${b.contact_email || ''}"`,
        `"${b.contact_phone || ''}"`,
        b.missing_document_types?.length ?? 0,
        `"${b.created_at || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `CPCL_Bidders_Registry_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const columns = useMemo<Column<Bidder>[]>(
    () => [
      {
        key: 'company_name',
        header: 'BIDDER / ENTERPRISE NAME',
        render: (b) => (
          <div className="min-w-0 py-0.5">
            <p className="font-semibold text-xs text-gov-navy hover:text-gov-blue cursor-pointer transition-colors">
              {b.company_name}
            </p>
            <p className="truncate font-mono text-[11px] text-gov-muted mt-0.5">
              {b.gem_seller_id ? `GeM Seller ID: ${b.gem_seller_id}` : 'Direct Portal Submission'}
            </p>
          </div>
        ),
      },
      {
        key: 'consistency_status',
        header: 'CROSS-DOCUMENT CONSISTENCY',
        render: (b) => <BidderConsistencyStatusBadge status={b.consistency_status} />,
      },
      {
        key: 'contact',
        header: 'OFFICIAL CONTACT',
        hideOnMobile: true,
        render: (b) =>
          b.contact_email || b.contact_phone ? (
            <div className="text-[11px] text-gov-muted leading-tight">
              {b.contact_email && <p className="font-mono text-gov-navy">{b.contact_email}</p>}
              {b.contact_phone && <p className="text-gov-muted">{b.contact_phone}</p>}
            </div>
          ) : (
            <span className="text-gov-muted text-xs">?</span>
          ),
      },
      {
        key: 'missing',
        header: 'STATUTORY DOSSIER',
        align: 'center',
        hideOnMobile: true,
        render: (b) => {
          const n = b.missing_document_types?.length ?? 0
          return n > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-xs text-gov-warning bg-amber-50 px-2 py-0.5 rounded-[4px] border border-amber-200">
              <FileX2 className="h-3.5 w-3.5 text-amber-600" />
              {n} Missing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-xs text-gov-success bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Complete
            </span>
          )
        },
      },
      {
        key: 'created_at',
        header: 'ENROLLMENT DATE',
        align: 'right',
        hideOnMobile: true,
        render: (b) => <span className="font-mono text-[11px] text-gov-muted">{formatDate(b.created_at)}</span>,
      },
      {
        key: 'actions',
        header: 'ACTION',
        align: 'right',
        render: (b) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/bidders/${b.id}`)
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
                <Building2 className="h-3 w-3" />
                CPCL BIDDER & VENDOR REPOSITORY
              </span>
              {tender && (
                <span className="text-[11px] font-mono text-gov-muted bg-slate-100 px-2 py-0.5 rounded border border-gov-border">
                  Tender: {tender.tender_ref_no}
                </span>
              )}
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              {tender ? `Bidders Enrolled for ?${tender.title}?` : 'Statutory Bidder Registry'}
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              {tender
                ? `Comprehensive list of participating bidders, eligibility certificates, and cross-document verification status for tender ${tender.tender_ref_no}.`
                : 'Central directory of all vendor organizations registered across CPCL procurement tenders.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {tenderId && (
              <ActionButton
                variant="outline"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => navigate(`/tenders/${tenderId}`)}
              >
                Back to Tender
              </ActionButton>
            )}
            <ActionButton
              variant="outline"
              icon={<FileSpreadsheet className="h-4 w-4 text-emerald-700" />}
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
            >
              Export CSV
            </ActionButton>
            {canManage(user) && tenderId && (
              <ActionButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => navigate(`/bidders/new?tender_id=${tenderId}`)}
              >
                Enroll New Bidder
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Total Bidders"
          value={stats.total}
          subtitle="Registered vendor entities"
          icon={<Building2 className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Enrolled"
        />
        <StatPanel
          title="Consistent Profiles"
          value={stats.consistent}
          subtitle="Zero mismatch across statutory IDs"
          icon={<CheckCircle2 className="h-4 w-4 text-gov-success" />}
          tone="success"
          badge="Verified"
        />
        <StatPanel
          title="Incomplete Submissions"
          value={stats.withMissingDocs}
          subtitle="Awaiting mandatory certificates"
          icon={<FileX2 className="h-4 w-4 text-gov-warning" />}
          tone="warning"
          badge="Pending Docs"
        />
        <StatPanel
          title="Flagged Profiles"
          value={stats.flagged}
          subtitle="PAN / GST / Name discrepancies"
          icon={<AlertTriangle className="h-4 w-4 text-gov-danger" />}
          tone="danger"
          badge="Audit Flag"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="rounded-[8px] border border-gov-border bg-white shadow-sm">
          <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                Registered Bidder Ledger
              </span>
              <span className="text-[11px] font-mono text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
                {filtered.length} of {bidders.length} records
              </span>
            </div>
          </div>

          <FilterBar
            search={
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by vendor company name, GeM ID, or email?"
                aria-label="Search bidders"
                leftIcon={<Search className="h-4 w-4 text-gov-muted" />}
                className="border-gov-border focus:border-gov-blue"
              />
            }
          />

          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`/bidders/${b.id}`)}
            loading={isLoading}
            skeletonRows={8}
            empty={
              <EmptyState
                icon={<Building2 className="h-6 w-6 text-gov-blue" />}
                title={bidders.length === 0 ? 'No bidders enrolled yet' : 'No matching bidders found'}
                description={
                  bidders.length === 0
                    ? canManage(user) && tenderId
                      ? 'Click "Enroll New Bidder" above to register the first vendor organization.'
                      : 'Bidders will appear here once they are registered against a tender.'
                    : 'No vendor records match your current search query.'
                }
                action={
                  bidders.length === 0 && canManage(user) && tenderId ? (
                    <ActionButton
                      variant="primary"
                      icon={<Plus className="h-4 w-4" />}
                      onClick={() => navigate(`/bidders/new?tender_id=${tenderId}`)}
                    >
                      Enroll New Bidder
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
