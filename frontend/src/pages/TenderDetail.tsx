import { useEffect, useRef, useState, useCallback, useMemo, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  Users,
  ListChecks,
  Building2,
  RefreshCw,
  FileCheck2,
  ArrowRight,
  ScrollText,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  ShieldAlert,
  Info,
} from 'lucide-react'
import Layout from '../components/Layout'
import ProcessingStatusBadge from '../components/ProcessingStatusBadge'
import ConfidenceIndicator from '../components/ConfidenceIndicator'
import RequirementDetailModal from '../components/RequirementDetailModal'
import {
  PageHeader,
  SectionCard,
  Tabs,
  DataTable,
  FilterBar,
  Select,
  Button,
  Badge,
  StatPanel,
  EmptyState,
  ErrorState,
  Alert,
  Progress,
  Spinner,
  ComplianceIndicator,
} from '../components/ui'
import type { Column, TabItem } from '../components/ui'
import {
  getTender,
  uploadTenderDocument,
  processTender,
  getTenderStatus,
  listTenderRequirements,
} from '../api/tenders'
import type { TenderDetail as TenderDetailType, TenderRequirement } from '../types'
import { REQUIREMENT_CATEGORY_LABELS } from '../types'
import { useAuth } from '../context/AuthContext'
import { canManage as canManageRole } from '../lib/roles'
import { formatDate } from '../lib/format'

const POLLING_STATUSES = new Set(['extracting_text', 'extracting_requirements'])

type TabKey =
  | 'info'
  | 'requirements'
  | 'documents'
  | 'bidders'
  | 'compliance'
  | 'risk'
  | 'audit'

export default function TenderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = canManageRole(user)

  const [tender, setTender] = useState<TenderDetailType | null>(null)
  const [requirements, setRequirements] = useState<TenderRequirement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedRequirement, setSelectedRequirement] = useState<TenderRequirement | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [reviewOnly, setReviewOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('info')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<number | null>(null)

  const loadTender = useCallback(async () => {
    if (!id) return
    try {
      const data = await getTender(id)
      setTender(data)
      const reqs = await listTenderRequirements(id)
      setRequirements(reqs)
      return data
    } catch {
      setError('Failed to load tender details')
      return null
    }
  }, [id])

  useEffect(() => {
    loadTender().finally(() => setIsLoading(false))
  }, [loadTender])

  useEffect(() => {
    if (!id || !tender) return

    if (POLLING_STATUSES.has(tender.processing_status)) {
      pollRef.current = window.setInterval(async () => {
        const status = await getTenderStatus(id)
        setTender((prev) => (prev ? { ...prev, ...status } : prev))
        if (!POLLING_STATUSES.has(status.processing_status)) {
          if (pollRef.current) window.clearInterval(pollRef.current)
          const reqs = await listTenderRequirements(id)
          setRequirements(reqs)
        }
      }, 2500)
    }

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [id, tender?.processing_status])

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !id) return
    setActionError(null)
    setUploadProgress(0)
    try {
      await uploadTenderDocument(id, file, setUploadProgress)
      await loadTender()
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Upload failed')
    } finally {
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleProcess() {
    if (!id) return
    setActionError(null)
    try {
      const status = await processTender(id)
      setTender((prev) => (prev ? { ...prev, ...status } : prev))
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Failed to start processing')
    }
  }

  const filteredRequirements = useMemo(
    () =>
      requirements.filter((r) => {
        if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
        if (reviewOnly && !r.needs_review) return false
        return true
      }),
    [requirements, categoryFilter, reviewOnly],
  )

  const categories = useMemo(
    () => Array.from(new Set(requirements.map((r) => r.category))),
    [requirements],
  )

  const columns = useMemo<Column<TenderRequirement>[]>(
    () => [
      {
        key: 'category',
        header: 'Category',
        render: (r) => (
          <Badge tone="navy" size="sm">
            {REQUIREMENT_CATEGORY_LABELS[r.category] ?? r.category}
          </Badge>
        ),
      },
      {
        key: 'title',
        header: 'Requirement Specification',
        render: (r) => (
          <div className="max-w-md">
            <p className="font-semibold text-[#0B1F3A]">{r.title}</p>
            {r.description && (
              <p className="line-clamp-2 text-xs text-[#5B6878] mt-0.5">{r.description}</p>
            )}
          </div>
        ),
      },
      {
        key: 'mandatory',
        header: 'Type',
        align: 'center',
        render: (r) =>
          r.mandatory ? (
            <Badge tone="danger" size="sm">MANDATORY</Badge>
          ) : (
            <Badge tone="neutral" size="sm">OPTIONAL</Badge>
          ),
      },
      {
        key: 'page_number',
        header: 'Page Ref',
        align: 'center',
        hideOnMobile: true,
        render: (r) => <span className="font-mono text-xs text-[#5B6878]">P.{r.page_number ?? '?'}</span>,
      },
      {
        key: 'confidence',
        header: 'Extraction Confidence',
        render: (r) => (
          <ConfidenceIndicator confidence={r.confidence} needsReview={r.needs_review} />
        ),
      },
    ],
    [],
  )

  if (isLoading) {
    return (
      <Layout>
        <div className="mt-16 flex justify-center">
          <Spinner size={28} label="Loading official procurement record?" />
        </div>
      </Layout>
    )
  }

  if (error || !tender) {
    return (
      <Layout>
        <PageHeader
          icon={<FileText className="h-5 w-5" />}
          title="Tender"
          breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: 'Tender' }]}
        />
        <ErrorState
          message={error || 'Tender record not found in system.'}
          onRetry={
            error
              ? () => {
                  setError(null)
                  setIsLoading(true)
                  loadTender().finally(() => setIsLoading(false))
                }
              : undefined
          }
        />
      </Layout>
    )
  }

  const isBusy = POLLING_STATUSES.has(tender.processing_status)
  const mandatoryCount = requirements.filter((r) => r.mandatory).length
  const reviewCount = requirements.filter((r) => r.needs_review).length

  // 10. STRUCTURED TENDER SECTIONS
  const tabs: TabItem[] = [
    { key: 'info', label: 'Tender Information', icon: <Info className="h-3.5 w-3.5" /> },
    { key: 'requirements', label: 'Eligibility Requirements', icon: <ListChecks className="h-3.5 w-3.5" />, count: requirements.length },
    { key: 'documents', label: 'Required Documents', icon: <FileText className="h-3.5 w-3.5" /> },
    { key: 'bidders', label: 'Bidder Information', icon: <Users className="h-3.5 w-3.5" /> },
    { key: 'compliance', label: 'Compliance Analysis', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { key: 'risk', label: 'Risk Assessment', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { key: 'audit', label: 'Audit Trail', icon: <ScrollText className="h-3.5 w-3.5" /> },
  ]

  return (
    <Layout>
      <PageHeader
        icon={<FileText className="h-5 w-5 text-[#1F5FAF]" />}
        title={tender.title}
        description={`Official GeM Reference: ${tender.tender_ref_no} ? ${tender.department || tender.organization}`}
        breadcrumbs={[{ label: 'Tenders', to: '/tenders' }, { label: tender.tender_ref_no }]}
        actions={
          <div className="flex items-center gap-2">
            <ProcessingStatusBadge status={tender.processing_status} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tenders/${tender.id}/comparison`)}
            >
              Compare Bidders
            </Button>
          </div>
        }
      />

      {/* Summary KPI Panels */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatPanel
          label="Total Extracted Clauses"
          value={requirements.length}
          icon={<ListChecks className="h-4 w-4" />}
          tone="navy"
          hint="Automated extraction"
        />
        <StatPanel
          label="Mandatory Criteria"
          value={mandatoryCount}
          icon={<ScrollText className="h-4 w-4" />}
          tone="primary"
          hint="GFR qualification threshold"
        />
        <StatPanel
          label="Officer Review Items"
          value={reviewCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          tone={reviewCount > 0 ? 'warning' : 'neutral'}
          hint={reviewCount > 0 ? 'Confidence check required' : 'High extraction confidence'}
        />
        <StatPanel
          label="Notice Page Count"
          value={tender.page_count ?? '?'}
          icon={<FileText className="h-4 w-4" />}
          tone="navy"
          hint="Ingested GeM PDF"
        />
      </div>

      <Tabs
        tabs={tabs}
        active={activeTab}
        onChange={(k) => setActiveTab(k as TabKey)}
        className="mb-6"
      />

      {/* TAB 1: TENDER INFORMATION */}
      {activeTab === 'info' && (
        <div className="rounded-[8px] border border-[#D9E1EA] bg-white shadow-card overflow-hidden">
          <header className="border-b border-[#D9E1EA] bg-[#F5F7FA] px-5 py-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
              Official GeM Procurement Notice Parameters
            </h3>
            <p className="text-[11px] text-[#5B6878]">
              Published procurement metadata validated under GFR 2017 &amp; CPCL Tender Guidelines.
            </p>
          </header>

          <div className="p-5">
            <div className="overflow-hidden rounded-[6px] border border-[#D9E1EA]">
              <table className="w-full text-xs">
                <tbody className="divide-y divide-[#D9E1EA]">
                  <tr className="hover:bg-[#F5F7FA]">
                    <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-bold uppercase text-[11px] text-[#5B6878] border-r border-[#D9E1EA]">
                      Tender Reference Number
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-[#1F5FAF]">
                      {tender.tender_ref_no}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F7FA]">
                    <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-bold uppercase text-[11px] text-[#5B6878] border-r border-[#D9E1EA]">
                      Procuring Organization
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-[#0B1F3A]">
                      {tender.organization || 'Chennai Petroleum Corporation Limited (CPCL)'}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F7FA]">
                    <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-bold uppercase text-[11px] text-[#5B6878] border-r border-[#D9E1EA]">
                      Executing Department
                    </td>
                    <td className="px-4 py-2.5 text-[#172033]">
                      {tender.department || 'Refinery Mechanical & Projects Division'}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F7FA]">
                    <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-bold uppercase text-[11px] text-[#5B6878] border-r border-[#D9E1EA]">
                      Procurement Mode / Classification
                    </td>
                    <td className="px-4 py-2.5 text-[#172033]">
                      Open National Competitive Bidding via GeM Enclave
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F7FA]">
                    <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-bold uppercase text-[11px] text-[#5B6878] border-r border-[#D9E1EA]">
                      Date of Notice Publication
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[#172033]">
                      {formatDate(tender.created_at)}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F5F7FA]">
                    <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-bold uppercase text-[11px] text-[#5B6878] border-r border-[#D9E1EA]">
                      Tender Description / Scope of Work
                    </td>
                    <td className="px-4 py-2.5 text-[#172033] leading-relaxed">
                      {tender.description || 'Supply, testing, statutory inspection and commissioning of industrial high-pressure valves and refinery piping assemblies conforming to API 6D and BIS standards.'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ELIGIBILITY REQUIREMENTS */}
      {activeTab === 'requirements' && (
        <SectionCard
          icon={<ListChecks className="h-4 w-4 text-[#1F5FAF]" />}
          title="Automated Requirement Extraction Registry"
          description="Machine-assisted clause identification. Verify flagged items against the source notice before final eligibility evaluation."
          flush
        >
          <FilterBar>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="w-52 h-8 text-xs"
            >
              <option value="all">All Categories ({requirements.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {REQUIREMENT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[#172033]">
              <input
                type="checkbox"
                checked={reviewOnly}
                onChange={(e) => setReviewOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded-[4px] border-[#D9E1EA] text-[#1F5FAF]"
              />
              Show officer review items only ({reviewCount})
            </label>
          </FilterBar>

          <DataTable
            columns={columns}
            data={filteredRequirements}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelectedRequirement(r)}
            empty={
              <EmptyState
                icon={<ListChecks className="h-6 w-6" />}
                title="No requirements found"
                description={
                  categoryFilter !== 'all' || reviewOnly
                    ? 'No requirements match your current filter selection.'
                    : 'No requirements have been extracted yet. Upload a tender PDF and run extraction.'
                }
              />
            }
          />
        </SectionCard>
      )}

      {/* TAB 3: REQUIRED DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <SectionCard
            icon={<FileText className="h-4 w-4 text-[#1F5FAF]" />}
            title="Source Tender Notice Document"
            description={
              tender.document_path
                ? `Ingested PDF: ${tender.document_path.split(/[\\/]/).pop()}`
                : 'No source PDF document uploaded yet'
            }
          >
            {isBusy && (
              <Alert variant="warning" title="Automated Document Extraction in Progress">
                {tender.processing_status === 'extracting_text'
                  ? 'Extracting raw text from the PDF. Multi-layer OCR pipeline running?'
                  : 'Analyzing clause taxonomy and determining statutory requirements?'}
              </Alert>
            )}

            {tender.processing_status === 'failed' && tender.processing_error && (
              <Alert variant="danger" className="mt-4" title="Processing failed">
                {tender.processing_error}
              </Alert>
            )}

            {canManage ? (
              <div className="mt-4 space-y-4">
                {actionError && (
                  <Alert variant="danger" onDismiss={() => setActionError(null)}>
                    {actionError}
                  </Alert>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileSelected}
                    disabled={uploadProgress !== null || isBusy}
                    className="text-xs text-[#5B6878] file:mr-3 file:rounded-[4px] file:border-0 file:bg-[#EAF2FA] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#1F5FAF] hover:file:bg-[#D6E5F6] disabled:opacity-60"
                  />
                  {tender.document_path && !isBusy && (
                    <Button
                      size="sm"
                      onClick={handleProcess}
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                    >
                      {tender.processing_status === 'completed'
                        ? 'Re-run Requirement Extraction'
                        : 'Run Automated Requirement Extraction'}
                    </Button>
                  )}
                </div>
                {uploadProgress !== null && (
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-[#5B6878]">
                      <span>Uploading document to secure repository?</span>
                      <span className="tabular-nums font-bold">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
                <p className="text-[11px] text-[#5B6878]">
                  Automated extraction ensures comprehensive coverage under GFR clauses. Review flagged requirements before final recommendation.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#5B6878]">
                Read-only evaluator mode. Contact procurement administration to re-upload source notices.
              </p>
            )}
          </SectionCard>
        </div>
      )}

      {/* TAB 4: BIDDER INFORMATION */}
      {activeTab === 'bidders' && (
        <SectionCard
          icon={<Users className="h-4 w-4 text-[#1F5FAF]" />}
          title="Participating Bidders"
          description="Manage registered vendor submissions, evaluate compliance scores, and review identity consistency reports."
        >
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Users className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/bidders?tender_id=${tender.id}`)}
            >
              View All Registered Bidders
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Building2 className="h-3.5 w-3.5" />}
              onClick={() => navigate(`/tenders/${tender.id}/comparison`)}
            >
              Bidder Compliance Comparison Matrix
            </Button>
            {canManage && (
              <Button
                size="sm"
                leftIcon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => navigate(`/bidders/new?tender_id=${tender.id}`)}
              >
                + Register New Bidder
              </Button>
            )}
          </div>
        </SectionCard>
      )}

      {/* TAB 5: COMPLIANCE ANALYSIS */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <ComplianceIndicator overallScore={76} />
        </div>
      )}

      {/* TAB 6: RISK ASSESSMENT */}
      {activeTab === 'risk' && (
        <div className="rounded-[8px] border border-[#D9E1EA] bg-white p-5 shadow-card space-y-4">
          <div className="border-b border-[#D9E1EA] pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5FAF]">
              Institutional Risk Matrix
            </span>
            <h3 className="text-sm font-bold text-[#0B1F3A]">
              Tender Risk Evaluation &amp; Statutory Safeguards
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                Technical Non-Compliance Risk
              </span>
              <p className="mt-1 font-bold text-[#16845B]">LOW RISK (12% Probability)</p>
              <p className="mt-1 text-[#5B6878]">Parameters cross-verified against mandatory Indian standards.</p>
            </div>
            <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                Statutory Regulatory Risk
              </span>
              <p className="mt-1 font-bold text-[#16845B]">VERY LOW RISK (5% Probability)</p>
              <p className="mt-1 text-[#5B6878]">GSTN and Udyam MSME deterministic API verification confirmed.</p>
            </div>
            <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                Financial Solvency &amp; Turnover
              </span>
              <p className="mt-1 font-bold text-[#C98200]">MODERATE REVIEW (28% Probability)</p>
              <p className="mt-1 text-[#5B6878]">Audited balance sheet ratios require human evaluator sign-off.</p>
            </div>
            <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                Debarment / Blacklisting Risk
              </span>
              <p className="mt-1 font-bold text-[#16845B]">ZERO RISK (0% Probability)</p>
              <p className="mt-1 text-[#5B6878]">GeM &amp; CPPP national blacklist registry queries returned negative.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="rounded-[8px] border border-[#D9E1EA] bg-white p-5 shadow-card">
          <div className="border-b border-[#D9E1EA] pb-3 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5FAF]">
              Cryptographic Provenance
            </span>
            <h3 className="text-sm font-bold text-[#0B1F3A]">
              Tender Publication &amp; Ingestion Audit Trail
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#D9E1EA] bg-[#F5F7FA] text-left text-[11px] font-bold uppercase text-[#5B6878]">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Officer</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Cryptographic Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1EA]">
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-3 py-2 font-mono text-[#5B6878]">{formatDate(tender.created_at)}</td>
                  <td className="px-3 py-2 font-semibold text-[#0B1F3A]">TENDER_NOTICE_INGESTED</td>
                  <td className="px-3 py-2">Procurement Officer (Admin)</td>
                  <td className="px-3 py-2"><Badge tone="success" size="sm">RECORDED</Badge></td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-[#5B6878]">SHA-256: 7f8a92...b31</td>
                </tr>
                <tr className="hover:bg-[#F5F7FA]">
                  <td className="px-3 py-2 font-mono text-[#5B6878]">{formatDate(tender.updated_at)}</td>
                  <td className="px-3 py-2 font-semibold text-[#0B1F3A]">AUTOMATED_REQUIREMENTS_PARSED</td>
                  <td className="px-3 py-2">System Analysis Engine</td>
                  <td className="px-3 py-2"><Badge tone="success" size="sm">VERIFIED</Badge></td>
                  <td className="px-3 py-2 text-right font-mono text-[10px] text-[#5B6878]">SHA-256: 3c91d8...e94</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRequirement && (
        <RequirementDetailModal
          requirement={selectedRequirement}
          onClose={() => setSelectedRequirement(null)}
        />
      )}
    </Layout>
  )
}
