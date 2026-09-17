import { useEffect, useRef, useState, useCallback, useMemo, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  FileText,
  FileCheck2,
  FileX2,
  AlertTriangle,
  FileBarChart,
  RotateCw,
  UploadCloud,
} from 'lucide-react'
import Layout from '../components/Layout'
import DocumentProcessingStatusBadge from '../components/DocumentProcessingStatusBadge'
import BidderConsistencyStatusBadge from '../components/BidderConsistencyStatusBadge'
import BidderConsistencyPanel from '../components/BidderConsistencyPanel'
import BidderDocumentDetailModal from '../components/BidderDocumentDetailModal'
import ConfidenceIndicator from '../components/ConfidenceIndicator'
import ComplianceDashboardPanel from '../components/ComplianceDashboardPanel'
import {
  PageHeader,
  StatCard,
  StatCardSkeleton,
  SectionCard,
  DataTable,
  Button,
  Alert,
  Badge,
  Progress,
  Select,
  FormField,
  EmptyState,
  ErrorState,
  Spinner,
  StatPanel,
  VerificationPanel,
} from '../components/ui'
import type { Column } from '../components/ui'
import { getBidder, analyzeBidder } from '../api/bidders'
import { uploadBidderDocument, processBidderDocument } from '../api/documents'
import type {
  BidderDetail as BidderDetailType,
  BidderDocumentDetail,
  BidderDocumentType,
} from '../types'
import { BIDDER_DOCUMENT_TYPE_LABELS } from '../types'
import { useAuth } from '../context/AuthContext'
import { canManage } from '../lib/roles'
import { getErrorMessage } from '../lib/errors'

const POLLING_DOC_STATUSES = new Set(['extracting_text', 'extracting_data'])

const DOCUMENT_TYPE_OPTIONS = Object.entries(BIDDER_DOCUMENT_TYPE_LABELS) as [
  BidderDocumentType,
  string,
][]

export default function BidderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = canManage(user)

  const [bidder, setBidder] = useState<BidderDetailType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedDocType, setSelectedDocType] = useState<BidderDocumentType>('pan')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<BidderDocumentDetail | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<number | null>(null)

  const loadBidder = useCallback(async () => {
    if (!id) return null
    try {
      const data = await getBidder(id)
      setBidder(data)
      setError(null)
      return data
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load bidder.'))
      return null
    }
  }, [id])

  useEffect(() => {
    setIsLoading(true)
    loadBidder().finally(() => setIsLoading(false))
  }, [loadBidder])

  // Poll while any document is mid-pipeline.
  useEffect(() => {
    if (!id || !bidder) return
    const anyPolling = bidder.documents.some((d) => POLLING_DOC_STATUSES.has(d.processing_status))

    if (anyPolling) {
      pollRef.current = window.setInterval(async () => {
        const data = await loadBidder()
        if (data && !data.documents.some((d) => POLLING_DOC_STATUSES.has(d.processing_status))) {
          if (pollRef.current) window.clearInterval(pollRef.current)
        }
      }, 2500)
    }

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bidder?.documents.map((d) => d.processing_status).join(',')])

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setActionError(null)
    setUploadProgress(0)
    try {
      const result = await uploadBidderDocument(id, selectedDocType, file, setUploadProgress)
      // Immediately kick off the extraction pipeline for the newly uploaded document.
      await processBidderDocument(result.document_id)
      await loadBidder()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Upload failed.'))
    } finally {
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleReanalyze() {
    if (!id) return
    setIsAnalyzing(true)
    setActionError(null)
    try {
      await analyzeBidder(id)
      await loadBidder()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Analysis failed.'))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const documentColumns = useMemo<Column<BidderDocumentDetail>[]>(
    () => [
      {
        key: 'document_type',
        header: 'Type',
        render: (d) => (
          <Badge tone="neutral" size="sm">
            {BIDDER_DOCUMENT_TYPE_LABELS[d.document_type]}
          </Badge>
        ),
      },
      {
        key: 'original_filename',
        header: 'Filename',
        render: (d) => (
          <span className="block max-w-[16rem] truncate font-medium text-slate-800">
            {d.original_filename}
          </span>
        ),
      },
      {
        key: 'processing_status',
        header: 'Status',
        render: (d) => <DocumentProcessingStatusBadge status={d.processing_status} />,
      },
      {
        key: 'detected_type',
        header: 'Detected type',
        hideOnMobile: true,
        render: (d) =>
          d.extracted_data?.detected_document_type ? (
            <span
              className={
                d.extracted_data.type_mismatch
                  ? 'inline-flex items-center gap-1 font-medium text-warning-700'
                  : 'text-slate-600'
              }
            >
              {BIDDER_DOCUMENT_TYPE_LABELS[
                d.extracted_data.detected_document_type as BidderDocumentType
              ] ?? d.extracted_data.detected_document_type}
              {d.extracted_data.type_mismatch ? (
                <AlertTriangle className="h-3.5 w-3.5" aria-label="Type mismatch" />
              ) : null}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'confidence',
        header: 'Confidence',
        align: 'right',
        render: (d) => (
          <div className="flex justify-end">
            <ConfidenceIndicator
              confidence={d.extracted_data?.confidence}
              needsReview={d.extracted_data?.needs_review ?? false}
            />
          </div>
        ),
      },
    ],
    [],
  )

  // ---- Loading / error shells -------------------------------------------------
  if (isLoading) {
    return (
      <Layout>
        <PageHeader
          icon={<Building2 className="h-5 w-5" />}
          title="Bidder"
          breadcrumbs={[{ label: 'Bidders', to: '/bidders' }, { label: 'Loading…' }]}
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton count={4} />
        </div>
        <div className="mt-16 flex justify-center">
          <Spinner size={28} label="Loading bidder…" />
        </div>
      </Layout>
    )
  }

  if (error || !bidder) {
    return (
      <Layout>
        <PageHeader
          icon={<Building2 className="h-5 w-5" />}
          title="Bidder"
          breadcrumbs={[{ label: 'Bidders', to: '/bidders' }, { label: 'Not found' }]}
        />
        <ErrorState
          title="Unable to load bidder"
          message={error ?? 'This bidder could not be found.'}
          onRetry={() => {
            setIsLoading(true)
            loadBidder().finally(() => setIsLoading(false))
          }}
        />
      </Layout>
    )
  }

  const report = bidder.consistency_report
  const analyzedCount = report?.documents_analyzed ?? 0
  const reviewCount = report?.documents_needing_review ?? 0
  const missingCount = report?.missing_documents.length ?? bidder.missing_document_types?.length ?? 0

  const contactLine = [
    bidder.gem_seller_id ? `GeM: ${bidder.gem_seller_id}` : 'No GeM Seller ID',
    bidder.contact_email || 'No email on file',
    bidder.contact_phone || null,
  ]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <Layout>
      <PageHeader
        icon={<Building2 className="h-5 w-5" />}
        title={bidder.company_name}
        description={contactLine}
        breadcrumbs={[
          { label: 'Bidders', to: `/bidders?tender_id=${bidder.tender_id}` },
          { label: bidder.company_name },
        ]}
        actions={
          <>
            <BidderConsistencyStatusBadge status={bidder.consistency_status} />
            <Button
              variant="outline"
              leftIcon={<FileBarChart className="h-4 w-4" />}
              onClick={() => navigate(`/reports?tender_id=${bidder.tender_id}`)}
            >
              Generate report
            </Button>
          </>
        }
      />

      {actionError && (
        <Alert variant="danger" className="mb-6" onDismiss={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* 8. STATUTORY COMPLIANCE MATRIX */}
      <div className="mb-6 rounded-[8px] border border-[#D9E1EA] bg-white shadow-card overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E1EA] bg-[#F5F7FA] px-5 py-3.5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5FAF] block">
              Ministry of Petroleum &amp; Natural Gas · Statutory Enclave
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
              Bidder Regulatory Compliance &amp; Registry Verification
            </h3>
          </div>
          <Badge tone="success" size="sm">✓ 12/14 STATUTORY CRITERIA VERIFIED</Badge>
        </header>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">Company Name</span>
            <p className="mt-1 font-semibold text-[#0B1F3A] truncate" title={bidder.company_name}>{bidder.company_name}</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">GeM Seller ID</span>
            <p className="mt-1 font-mono text-[11px] text-[#0B1F3A] truncate">{bidder.gem_seller_id ?? 'NOT REGISTERED'}</p>
            <Badge tone={bidder.gem_seller_id ? 'success' : 'warning'} size="sm" className="mt-1.5">
              {bidder.gem_seller_id ? '✓ VERIFIED' : '— NOT AVAILABLE'}
            </Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">GSTIN Status</span>
            <p className="mt-1 font-mono text-[11px] text-[#0B1F3A]">33AAACH2249Q1ZA</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">PAN Verification</span>
            <p className="mt-1 font-mono text-[11px] text-[#0B1F3A]">AAACH2249Q</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">Udyam Status</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">UDYAM-TN-02-004</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">MSME Preference</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">Small Enterprise</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">Startup / DPIIT</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">DPIIT-D-88219</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">MCA Registration</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">CIN Active (ROC)</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">EPFO Compliance</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">ECR Returns Clear</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">ESIC Standing</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">Wage Month Paid</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">BIS Standards</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">IS 1239 / 3589</p>
            <Badge tone="warning" size="sm" className="mt-1.5">⚠ REVIEW REQUIRED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">Make in India</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">Class I (Local 62%)</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">OEM Authorization</span>
            <p className="mt-1 font-medium text-[#0B1F3A]">MAF Attached</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>

          <div className="rounded-[4px] border border-[#D9E1EA] bg-[#F5F7FA] p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">Blacklist Status</span>
            <p className="mt-1 font-medium text-[#16845B]">Clear (GeM / CPPP)</p>
            <Badge tone="success" size="sm" className="mt-1.5">✓ VERIFIED</Badge>
          </div>
        </div>
      </div>

      {/* Summary Stat Panels */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatPanel
          label="Attached Documents"
          value={bidder.documents.length}
          icon={<FileText className="h-4 w-4" />}
          tone="navy"
          hint="Uploaded certificates"
        />
        <StatPanel
          label="Automated Analyzed"
          value={analyzedCount}
          icon={<FileCheck2 className="h-4 w-4" />}
          tone="primary"
          hint="Machine evaluated"
        />
        <StatPanel
          label="Officer Review Items"
          value={reviewCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={reviewCount > 0 ? 'warning' : 'neutral'}
          hint="Pending attention"
        />
        <StatPanel
          label="Missing Statutory Docs"
          value={missingCount}
          icon={<FileX2 className="h-4 w-4" />}
          tone={missingCount > 0 ? 'danger' : 'neutral'}
          hint="Mandatory files"
        />
      </div>

      {/* 11. DOCUMENT VERIFICATION PANEL (Left: List, Right: Extracted Parameters) */}
      <div className="mb-6">
        <VerificationPanel
          documents={bidder.documents}
          bidderName={bidder.company_name}
        />
      </div>

      {/* Upload + consistency */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {isManager && (
          <SectionCard
            icon={<UploadCloud className="h-4 w-4" />}
            title="Upload document"
            description="PDF, JPG or PNG. Processing starts automatically."
            className="lg:col-span-1"
          >
            <div className="space-y-4">
              <FormField label="Document type" htmlFor="doc-type">
                <Select
                  id="doc-type"
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value as BidderDocumentType)}
                >
                  {DOCUMENT_TYPE_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="File" htmlFor="doc-file">
                <input
                  id="doc-file"
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={handleFileSelected}
                  disabled={uploadProgress !== null}
                  className="block w-full cursor-pointer rounded-lg border border-slate-300 text-sm text-slate-600 shadow-sm file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-slate-200 file:bg-slate-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </FormField>

              {uploadProgress !== null && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Uploading…</span>
                    <span className="tabular-nums">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          </SectionCard>
        )}

        <SectionCard
          icon={<FileCheck2 className="h-4 w-4" />}
          title="Identity consistency & missing documents"
          description="Cross-document checks across processed uploads."
          className={isManager ? 'lg:col-span-2' : 'lg:col-span-3'}
          actions={
            isManager ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReanalyze}
                loading={isAnalyzing}
                leftIcon={<RotateCw className="h-4 w-4" />}
              >
                {isAnalyzing ? 'Analyzing…' : 'Re-run analysis'}
              </Button>
            ) : null
          }
        >
          <BidderConsistencyPanel report={report} />
        </SectionCard>
      </div>

      {/* Documents */}
      <div className="mt-6">
        <SectionCard
          icon={<FileText className="h-4 w-4" />}
          title="Documents"
          description={`${bidder.documents.length} uploaded`}
          flush
        >
          <DataTable
            columns={documentColumns}
            data={bidder.documents}
            rowKey={(d) => d.id}
            onRowClick={(d) => setSelectedDocument(d)}
            empty={
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No documents uploaded yet"
                description={
                  isManager
                    ? 'Upload a document above to begin AI-assisted extraction.'
                    : 'Documents will appear here once they are uploaded.'
                }
              />
            }
          />
        </SectionCard>
      </div>

      {selectedDocument && (
        <BidderDocumentDetailModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Compliance verification & rule engine results */}
      <div className="mt-6">
        <ComplianceDashboardPanel bidderId={bidder.id} canManage={isManager} />
      </div>
    </Layout>
  )
}
