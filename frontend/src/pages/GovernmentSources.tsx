import { useEffect, useState, useCallback } from 'react'
import { Landmark, CheckCircle2, XCircle, HelpCircle, Clock3, Building2 } from 'lucide-react'
import Layout from '../components/Layout'
import { PageHeader, SectionCard, EmptyState, ErrorState, Skeleton, Badge } from '../components/ui'
import type { Tone } from '../components/ui'
import { listBidders } from '../api/bidders'
import { listVerificationResults } from '../api/verification'
import type { Bidder, VerificationResult, VerificationStatus } from '../types'
import { getErrorMessage } from '../lib/errors'
import { formatRelativeTime } from '../lib/format'

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
  const [rows, setRows] = useState<BidderSources[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <Layout>
      <PageHeader
        icon={<Landmark className="h-5 w-5" />}
        title="Government Sources"
        description="Which external registries were cross-checked for each bidder, and whether they matched."
        breadcrumbs={[{ label: 'Government Sources' }]}
      />

      <SectionCard
        title="Cross-source verification"
        description="GST, PAN, MCA, Udyam and GeM blacklist checks run against the mock government registries."
        icon={<Landmark className="h-4 w-4" />}
        bodyClassName="p-0"
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
        ) : !rows || rows.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Landmark className="h-6 w-6" />}
              title="No source checks run yet"
              description="Run verification on a bidder to see government-source match status here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Bidder</th>
                  {orderedProviders.map((p) => (
                    <th key={p} className="px-3 py-3 text-center">
                      {PROVIDER_LABELS[p] ?? p}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Last Checked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ bidder, results }) => {
                  const byProvider = new Map(results.map((r) => [r.provider_name || 'unknown', r]))
                  const latest = results.reduce<string | null>(
                    (acc, r) => (!acc || r.verified_at > acc ? r.verified_at : acc),
                    null,
                  )
                  return (
                    <tr key={bidder.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
                            <Building2 className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">{bidder.company_name}</p>
                            <p className="truncate text-xs text-slate-400">{bidder.gem_seller_id ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      {orderedProviders.map((p) => {
                        const res = byProvider.get(p)
                        return (
                          <td key={p} className="px-3 py-3 text-center">
                            {res ? (
                              <Badge tone={STATUS_TONE[res.status]} title={res.notes ?? undefined}>
                                {STATUS_ICON[res.status]}
                                {res.status.replace('_', ' ')}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-4 py-3 text-right text-xs text-slate-400">
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
