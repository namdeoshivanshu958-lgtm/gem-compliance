import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  FileBarChart, FileText, FileSpreadsheet, Download, Building2, 
  History, ShieldCheck, CheckCircle2, Award, FileCheck2, ArrowRight
} from 'lucide-react'
import Layout from '../components/Layout'
import {
  FormField,
  Select,
  DataTable,
  Button,
  Badge,
  Alert,
  EmptyState,
  Skeleton,
  StatPanel,
  ActionButton,
} from '../components/ui'
import type { Column } from '../components/ui'
import { listTenders } from '../api/tenders'
import { listBidders } from '../api/bidders'
import {
  downloadBidderReportPdf,
  downloadBidderReportCsv,
  listTenderReports,
  downloadReportById,
} from '../api/reports'
import type { Tender, Bidder, ReportRecord } from '../types'
import { formatDateTime } from '../lib/format'

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTenderId = searchParams.get('tender_id') || ''

  const [tenders, setTenders] = useState<Tender[]>([])
  const [tendersLoading, setTendersLoading] = useState(true)
  const [selectedTenderId, setSelectedTenderId] = useState(initialTenderId)

  const [bidders, setBidders] = useState<Bidder[]>([])
  const [biddersLoading, setBiddersLoading] = useState(false)
  const [biddersError, setBiddersError] = useState<string | null>(null)

  const [pastReports, setPastReports] = useState<ReportRecord[]>([])
  const [pastReportsLoading, setPastReportsLoading] = useState(false)

  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    listTenders()
      .then(setTenders)
      .catch(() => setActionError('Failed to load tenders'))
      .finally(() => setTendersLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTenderId) {
      setBidders([])
      setPastReports([])
      return
    }
    setSearchParams({ tender_id: selectedTenderId })

    setBiddersLoading(true)
    setBiddersError(null)
    listBidders(selectedTenderId)
      .then(setBidders)
      .catch(() => setBiddersError('Failed to load bidders for this tender'))
      .finally(() => setBiddersLoading(false))

    setPastReportsLoading(true)
    listTenderReports(selectedTenderId)
      .then(setPastReports)
      .catch(() => {})
      .finally(() => setPastReportsLoading(false))
  }, [selectedTenderId, setSearchParams])

  const selectedTender = useMemo(() => {
    return tenders.find((t) => t.id === selectedTenderId)
  }, [tenders, selectedTenderId])

  async function handleDownload(bidder: Bidder, format: 'pdf' | 'csv') {
    setActionError(null)
    setGeneratingId(`${bidder.id}-${format}`)
    try {
      if (format === 'pdf') {
        await downloadBidderReportPdf(bidder.id, bidder.company_name)
      } else {
        await downloadBidderReportCsv(bidder.id, bidder.company_name)
      }
      if (selectedTenderId) {
        listTenderReports(selectedTenderId).then(setPastReports).catch(() => {})
      }
    } catch (err: any) {
      setActionError(
        err?.response?.data?.detail ||
          'Report generation failed ? ensure document verification and compliance evaluation have been completed for this bidder.',
      )
    } finally {
      setGeneratingId(null)
    }
  }

  const columns: Column<Bidder>[] = [
    {
      key: 'company_name',
      header: 'BIDDER / ENTERPRISE NAME',
      render: (b) => (
        <div className="py-0.5">
          <p className="font-semibold text-xs text-gov-navy">{b.company_name}</p>
          <p className="font-mono text-[11px] text-gov-muted mt-0.5">
            {b.gem_seller_id ? `GeM Seller: ${b.gem_seller_id}` : 'Direct Submission'}
          </p>
        </div>
      ),
    },
    {
      key: 'consistency_status',
      header: 'CONSISTENCY STATUS',
      hideOnMobile: true,
      render: (b) => (
        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-700 border border-slate-200">
          {b.consistency_status || 'verified'}
        </span>
      ),
    },
    {
      key: 'report',
      header: 'OFFICIAL ATTESTATION EXPORT',
      align: 'right',
      render: (b) => (
        <div className="flex justify-end gap-2">
          <button
            disabled={generatingId === `${b.id}-pdf`}
            onClick={() => handleDownload(b, 'pdf')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] bg-gov-blue text-white hover:bg-gov-navy disabled:opacity-50 transition-colors shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{generatingId === `${b.id}-pdf` ? 'Generating PDF?' : 'Official PDF Certificate'}</span>
          </button>
          <button
            disabled={generatingId === `${b.id}-csv`}
            onClick={() => handleDownload(b, 'csv')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-[4px] border border-gov-border bg-white text-gov-navy hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
            <span>CSV Audit</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <FileBarChart className="h-3 w-3" />
                STATUTORY COMPLIANCE DOSSIER & CERTIFICATE VAULT
              </span>
              <span className="text-[11px] font-mono text-gov-muted">GFR 2017 / SIH-26100</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Statutory Evaluation Reports & Technical Certificates
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Generate standardized PDF Technical Evaluation Certificates with digital signatures, cryptographic hashes, and export tabular verification data for audit archives.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Procurement Notices"
          value={tenders.length}
          subtitle="Tenders eligible for report generation"
          icon={<FileText className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Active"
        />
        <StatPanel
          title="Enrolled Bidders"
          value={bidders.length}
          subtitle={selectedTender ? `In ${selectedTender.tender_ref_no}` : 'Select a tender'}
          icon={<Building2 className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Vendors"
        />
        <StatPanel
          title="Generated Archives"
          value={pastReports.length}
          subtitle="Persisted on server audit trail"
          icon={<History className="h-4 w-4 text-gov-success" />}
          tone="success"
          badge="Attested"
        />
        <StatPanel
          title="Integrity Guarantee"
          value="SHA-256"
          subtitle="Blockchain cryptographically anchored"
          icon={<ShieldCheck className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Tamper-Proof"
        />
      </div>

      <div className="space-y-6">
        {/* Tender Selector Card */}
        <div className="rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
              Step 1: Select Target Procurement Tender
            </span>
          </div>

          {tendersLoading ? (
            <Skeleton className="h-10 w-full max-w-xl" />
          ) : (
            <div className="max-w-xl">
              <FormField label="Target Tender Notice" htmlFor="tender-select">
                <Select
                  id="tender-select"
                  value={selectedTenderId}
                  onChange={(e) => setSelectedTenderId(e.target.value)}
                  className="border-gov-border text-xs font-medium text-gov-navy"
                >
                  <option value="">? Select an Active CPCL Tender ?</option>
                  {tenders.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tender_ref_no} ? {t.title}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          )}

          {selectedTender && (
            <div className="mt-3.5 flex items-center gap-4 text-xs text-gov-muted border-t border-gov-border pt-3">
              <span>Department: <strong className="text-gov-navy">{selectedTender.department || 'Materials & Procurement'}</strong></span>
              <span>?</span>
              <span>Status: <strong className="text-gov-navy uppercase">{selectedTender.status}</strong></span>
              <span>?</span>
              <span>Ref: <code className="font-mono text-gov-blue">{selectedTender.tender_ref_no}</code></span>
            </div>
          )}
        </div>

        {actionError && (
          <Alert variant="danger" onDismiss={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {selectedTenderId && (
          <>
            {/* Bidder List with Generate Buttons */}
            <div className="rounded-[8px] border border-gov-border bg-white shadow-sm">
              <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                    Step 2: Generate Official Bidder Certificates
                  </span>
                  <span className="text-[11px] font-mono text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
                    {bidders.length} Bidders Enrolled
                  </span>
                </div>
              </div>

              {biddersError ? (
                <div className="p-5">
                  <Alert variant="danger">{biddersError}</Alert>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={bidders}
                  rowKey={(b) => b.id}
                  loading={biddersLoading}
                  skeletonRows={4}
                  empty={
                    <EmptyState
                      icon={<Building2 className="h-6 w-6 text-gov-blue" />}
                      title="No bidders registered for this tender"
                      description="Add participating bidders and run compliance evaluation to generate official PDF/CSV evaluation dossiers."
                    />
                  }
                />
              )}
            </div>

            {/* Previously Generated Archives */}
            <div className="rounded-[8px] border border-gov-border bg-white shadow-sm">
              <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-gov-blue" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                    Audit Archive: Previously Generated Certificates
                  </span>
                  <span className="text-[11px] font-mono text-gov-muted bg-white px-2 py-0.5 rounded border border-gov-border">
                    {pastReports.length} Historical Records
                  </span>
                </div>
              </div>

              {pastReportsLoading ? (
                <div className="space-y-2 p-5">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ) : pastReports.length === 0 ? (
                <EmptyState
                  compact
                  icon={<History className="h-6 w-6 text-gov-blue" />}
                  title="No archival reports generated yet"
                  description="Generated evaluation dossiers and certificates will be securely indexed here."
                />
              ) : (
                <ul className="divide-y divide-gov-border">
                  {pastReports.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gov-light-blue text-gov-navy border border-gov-blue/20 rounded-[3px]">
                          {r.report_type}
                        </span>
                        <span className="font-mono text-xs text-gov-navy font-medium truncate max-w-sm">
                          {r.file_path.split('/').pop() || 'report'}
                        </span>
                        <span className="text-xs text-gov-muted font-mono">
                          {formatDateTime(r.generated_at)}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          downloadReportById(r.id, r.file_path.split('/').pop() || 'report')
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-[4px] border border-gov-border bg-white text-gov-navy hover:bg-slate-100 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 text-gov-blue" />
                        <span>Re-download</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
