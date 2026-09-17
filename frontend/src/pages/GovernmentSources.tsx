import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Landmark, CheckCircle2, XCircle, HelpCircle, Clock3, Building2, Search, Filter } from 'lucide-react'
import Layout from '../components/Layout'
import {
  PageHeader,
  SectionCard,
  EmptyState,
  ErrorState,
  Skeleton,
  Badge,
  GovernmentSourceCard,
  type GovernmentSourceProps,
  Input,
} from '../components/ui'
import type { Tone } from '../components/ui'
import { listBidders } from '../api/bidders'
import { listVerificationResults } from '../api/verification'
import type { Bidder, VerificationResult, VerificationStatus } from '../types'
import { getErrorMessage } from '../lib/errors'
import { formatRelativeTime } from '../lib/format'

const INSTITUTIONAL_SOURCES: GovernmentSourceProps[] = [
  {
    id: 'gem',
    name: 'Government e-Marketplace (GeM)',
    code: 'GeM',
    purpose: 'National public procurement portal for common use goods and services across central/state government buyers.',
    agency: 'Ministry of Commerce and Industry',
    status: 'OPERATIONAL',
    lastSync: 'Today, 10:42 AM',
    services: ['Seller Registration', 'Primary Product Category', 'Turnover Verification', 'Blacklist Registry'],
  },
  {
    id: 'gst',
    name: 'Goods & Services Tax Network (GSTN)',
    code: 'GST',
    purpose: 'Central statutory repository for indirect tax registrations, return filing frequency, and active operating status.',
    agency: 'Department of Revenue, Ministry of Finance',
    status: 'OPERATIONAL',
    lastSync: 'Today, 10:45 AM',
    services: ['GSTIN Validation', 'Active Filing Status', 'Legal Entity Reconciliation', 'Jurisdiction Audit'],
  },
  {
    id: 'udyam',
    name: 'Udyam Registration Portal',
    code: 'MSME',
    purpose: 'Official national register for Micro, Small and Medium Enterprises eligible for public procurement preferences.',
    agency: 'Ministry of MSME',
    status: 'OPERATIONAL',
    lastSync: 'Today, 09:30 AM',
    services: ['Udyam Certificate Hash', 'Enterprise Category (Micro/Small/Medium)', 'Manufacturing vs Service Classification'],
  },
  {
    id: 'mca',
    name: 'Ministry of Corporate Affairs (MCA21)',
    code: 'MCA',
    purpose: 'Corporate registry validating Certificate of Incorporation, Director Identification Numbers, and charges.',
    agency: 'Ministry of Corporate Affairs',
    status: 'OPERATIONAL',
    lastSync: 'Today, 10:15 AM',
    services: ['CIN Verification', 'Authorized Capital Check', 'Active Directorships', 'Compliance Filing Status'],
  },
  {
    id: 'epfo',
    name: 'Employees\' Provident Fund Organisation',
    code: 'EPFO',
    purpose: 'Statutory social security verification for workforce compliance and active electronic challan returns (ECR).',
    agency: 'Ministry of Labour & Employment',
    status: 'OPERATIONAL',
    lastSync: 'Today, 08:50 AM',
    services: ['Establishment Code Validation', 'Active Member Count', 'ECR Wage Month Filing'],
  },
  {
    id: 'esic',
    name: 'Employees\' State Insurance Corporation',
    code: 'ESIC',
    purpose: 'Social security and healthcare contribution tracking for qualifying industrial enterprise personnel.',
    agency: 'Ministry of Labour & Employment',
    status: 'OPERATIONAL',
    lastSync: 'Today, 08:55 AM',
    services: ['Employer IP Registration', 'Contribution Filing Verification', 'Standing Exemption Check'],
  },
  {
    id: 'dpiit',
    name: 'Startup India & DPIIT Recognition',
    code: 'DPIIT',
    purpose: 'Recognition registry providing exemption from prior turnover and experience criteria under GFR 173(i).',
    agency: 'Department for Promotion of Industry and Internal Trade',
    status: 'OPERATIONAL',
    lastSync: 'Today, 07:40 AM',
    services: ['DPIIT Certificate Validation', 'Eligible Exemption Categories', 'Incorporation Window Check'],
  },
  {
    id: 'bis',
    name: 'Bureau of Indian Standards (BIS)',
    code: 'BIS',
    purpose: 'National standards body ensuring conformity to mandatory quality certification (ISI / Compulsory Registration).',
    agency: 'Ministry of Consumer Affairs',
    status: 'OPERATIONAL',
    lastSync: 'Today, 09:10 AM',
    services: ['Standard License Verification', 'Product Conformity Certificate', 'Test Report Cross-Check'],
  },
  {
    id: 'digilocker',
    name: 'DigiLocker National Enclave',
    code: 'DLK',
    purpose: 'Government digital wallet providing tamper-evident cryptographic verification of scanned documents.',
    agency: 'National e-Governance Division (NeGD) / MeitY',
    status: 'OPERATIONAL',
    lastSync: 'Today, 10:30 AM',
    services: ['Issued Document Fetch', 'URI Tamper Proof', 'Digital Signature Authenticity'],
  },
]

const PROVIDER_LABELS: Record<string, string> = {
  gst_mock: 'GST',
  pan_mock: 'PAN',
  udyam_mock: 'Udyam / MSME',
  mca_mock: 'MCA / Company Registration',
  bis_mock: 'BIS',
  epfo_mock: 'EPFO',
  esic_mock: 'ESIC',
  startup_dpiit_mock: 'Startup / DPIIT',
  nsic_mock: 'NSIC',
  oem_authorization_mock: 'OEM Authorization',
  digilocker_mock: 'DigiLocker',
  income_tax_mock: 'Income Tax',
  blacklist_mock: 'GeM Blacklist Registry',
}

const PROVIDER_ORDER = ['gst_mock', 'pan_mock', 'mca_mock', 'blacklist_mock', 'udyam_mock', 'bis_mock']

const STATUS_TONE: Record<VerificationStatus, Tone> = {
  verified: 'success',
  mismatch: 'danger',
  not_found: 'warning',
  pending: 'neutral',
}

const STATUS_ICON: Record<VerificationStatus, JSX.Element> = {
  verified: <CheckCircle2 className="h-3 w-3" />,
  mismatch: <XCircle className="h-3 w-3" />,
  not_found: <HelpCircle className="h-3 w-3" />,
  pending: <Clock3 className="h-3 w-3" />,
}

interface BidderSources {
  bidder: Bidder
  results: VerificationResult[]
}

export default function GovernmentSources() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSourceFilter = searchParams.get('source')?.toLowerCase() ?? ''

  const [rows, setRows] = useState<BidderSources[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    listBidders()
      .then(async (bidders) => {
        const withResults = await Promise.all(
          bidders.map(async (bidder) => {
            try {
              const results = await listVerificationResults(bidder.id)
              return { bidder, results }
            } catch {
              return { bidder, results: [] as VerificationResult[] }
            }
          }),
        )
        setRows(withResults.filter((r) => r.results.length > 0))
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const providersPresent = new Set<string>()
  rows?.forEach((r) => r.results.forEach((res) => providersPresent.add(res.provider_name || 'unknown')))
  const orderedProviders = [
    ...PROVIDER_ORDER.filter((p) => providersPresent.has(p)),
    ...[...providersPresent].filter((p) => !PROVIDER_ORDER.includes(p)),
  ]

  const filteredSources = useMemo(() => {
    if (!activeSourceFilter) return INSTITUTIONAL_SOURCES
    return INSTITUTIONAL_SOURCES.filter(
      (s) => s.id.includes(activeSourceFilter) || s.code.toLowerCase().includes(activeSourceFilter)
    )
  }, [activeSourceFilter])

  const filteredRows = useMemo(() => {
    if (!rows) return null
    if (!searchTerm.trim()) return rows
    const q = searchTerm.toLowerCase()
    return rows.filter(
      (r) =>
        r.bidder.company_name.toLowerCase().includes(q) ||
        (r.bidder.gem_seller_id && r.bidder.gem_seller_id.toLowerCase().includes(q))
    )
  }, [rows, searchTerm])

  return (
    <Layout>
      <PageHeader
        icon={<Landmark className="h-5 w-5 text-[#1F5FAF]" />}
        title="Institutional Verification Sources"
        description="Statutory registry integration directory and cross-verification status across public repositories."
        breadcrumbs={[{ label: 'Government Sources' }]}
        actions={
          activeSourceFilter ? (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="text-xs font-semibold text-[#1F5FAF] hover:underline"
            >
              Clear Filter ({activeSourceFilter.toUpperCase()}) ?
            </button>
          ) : null
        }
      />

      {/* 13. GOVERNMENT SOURCES INSTITUTIONAL DIRECTORY */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 border-b border-[#D9E1EA] pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
              Connected Statutory Repositories
            </h3>
            <p className="text-[11px] text-[#5B6878]">
              Automated API links with central government regulatory frameworks.
            </p>
          </div>
          <span className="text-[11px] font-bold text-[#16845B] bg-[#EAF8F1] border border-[#CEF0DF] px-2.5 py-0.5 rounded-[4px]">
            ALL CONNECTORS HEALTHY (9/9)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSources.map((source) => (
            <GovernmentSourceCard
              key={source.id}
              {...source}
              onClick={() => {
                if (activeSourceFilter === source.id) {
                  setSearchParams({})
                } else {
                  setSearchParams({ source: source.id })
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Cross-source verification matrix */}
      <SectionCard
        title="Cross-Source Verification Registry"
        description="Deterministic cross-examination results across GST, PAN, MCA, Udyam and GeM blacklist repositories."
        icon={<Landmark className="h-4 w-4 text-[#1F5FAF]" />}
        bodyClassName="p-0"
        actions={
          <div className="w-56">
            <Input
              type="search"
              placeholder="Search bidders in registry?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        }
      >
        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !filteredRows || filteredRows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Landmark className="h-6 w-6" />}
              title="No source checks found"
              description={searchTerm ? "No bidders matched your search term." : "Run verification on a bidder to see government-source match status here."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9E1EA] bg-[#F5F7FA] text-left text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
                  <th className="px-4 py-2.5">Bidder Company</th>
                  {orderedProviders.map((p) => (
                    <th key={p} className="px-3 py-2.5 text-center">
                      {PROVIDER_LABELS[p] ?? p}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 text-right">Last Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1EA]">
                {filteredRows.map(({ bidder, results }) => {
                  const byProvider = new Map(results.map((r) => [r.provider_name || 'unknown', r]))
                  const latest = results.reduce<string | null>(
                    (acc, r) => (!acc || r.verified_at > acc ? r.verified_at : acc),
                    null,
                  )
                  return (
                    <tr key={bidder.id} className="transition-colors hover:bg-[#F5F7FA]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-[#EAF2FA] text-[#1F5FAF]">
                            <Building2 className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0B1F3A]">{bidder.company_name}</p>
                            <p className="truncate font-mono text-[10px] text-[#5B6878]">{bidder.gem_seller_id ?? '?'}</p>
                          </div>
                        </div>
                      </td>
                      {orderedProviders.map((p) => {
                        const res = byProvider.get(p)
                        return (
                          <td key={p} className="px-3 py-2.5 text-center">
                            {res ? (
                              <Badge tone={STATUS_TONE[res.status]} title={res.notes ?? undefined} size="sm">
                                {STATUS_ICON[res.status]}
                                {res.status === 'verified' ? 'VERIFIED' : res.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-300">?</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right font-mono text-[11px] text-[#5B6878]">
                        {formatRelativeTime(latest)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </Layout>
  )
}
