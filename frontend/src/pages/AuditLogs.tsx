import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ScrollText,
  ShieldCheck,
  Filter,
  UserCheck,
  Database,
  FileCheck2,
  RefreshCw,
  Search,
} from 'lucide-react'
import Layout from '../components/Layout'
import {
  PageHeader,
  SectionCard,
  StatPanel,
  Badge,
  Pagination,
  EmptyState,
  ErrorState,
  LoadingState,
  Select,
} from '../components/ui'
import { listAuditLogs } from '../api/audit'
import type { AuditLogEntry } from '../types'

const PAGE_SIZE = 15

const ACTION_OPTIONS = [
  { value: '', label: 'All Action Codes' },
  { value: 'report_generated', label: 'Report Generated' },
  { value: 'password_changed', label: 'Password Changed' },
  { value: 'verification_run', label: 'Verification Run' },
  { value: 'compliance_evaluated', label: 'Compliance Evaluated' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'All Target Entities' },
  { value: 'bidder', label: 'Bidder' },
  { value: 'tender', label: 'Tender' },
  { value: 'user', label: 'User' },
]

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    listAuditLogs({
      action: action || undefined,
      entity_type: entityType || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        setLogs(data.items)
        setTotal(data.total)
        setTotalPages(data.total_pages)
      })
      .catch((err) => {
        if (err?.response?.status === 403) {
          setError('Access Denied: Officer credentials do not have audit permissions.')
        } else {
          setError('Failed to load compliance audit logs from server.')
        }
      })
      .finally(() => setIsLoading(false))
  }, [action, entityType, page])

  useEffect(() => {
    load()
  }, [load])

  const actionCounts = useMemo(() => {
    return {
      compliance: logs.filter((l) => l.action.includes('compliance')).length,
      verification: logs.filter((l) => l.action.includes('verification')).length,
      reports: logs.filter((l) => l.action.includes('report')).length,
    }
  }, [logs])

  return (
    <Layout>
      <PageHeader
        icon={<ScrollText className="h-5 w-5 text-[#1F5FAF]" />}
        title="Procurement Compliance Audit Trail"
        description="Immutable read-only ledger of administrative, verification, and evaluation actions across CPCL procurement tenders."
        breadcrumbs={[{ label: 'Audit Logs' }]}
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F5FAF] hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Trail
          </button>
        }
      />

      {/* Audit KPI Rollup */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatPanel
          label="Total Logged Events"
          value={total}
          icon={<Database className="h-4 w-4" />}
          tone="navy"
          hint="Enclave events"
        />
        <StatPanel
          label="Compliance Evaluations"
          value={actionCounts.compliance}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="primary"
          hint="Current page"
        />
        <StatPanel
          label="Registry Verifications"
          value={actionCounts.verification}
          icon={<UserCheck className="h-4 w-4" />}
          tone="success"
          hint="Current page"
        />
        <StatPanel
          label="Reports Generated"
          value={actionCounts.reports}
          icon={<FileCheck2 className="h-4 w-4" />}
          tone="navy"
          hint="Audit certificates"
        />
      </div>

      {/* 14. AUDIT TRAIL TIMELINE / TABLE HYBRID */}
      <SectionCard
        title="Institutional Audit Ledger"
        description="Every officer action is cryptographically timestamped and referenced against authorization tokens."
        icon={<ScrollText className="h-4 w-4 text-[#1F5FAF]" />}
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
              className="w-44 text-xs h-8"
              aria-label="Filter by action code"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value)
                setPage(1)
              }}
              className="w-36 text-xs h-8"
              aria-label="Filter by target entity"
            >
              {ENTITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        }
      >
        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : isLoading ? (
          <LoadingState message="Loading procurement audit trail?" />
        ) : logs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title="No audit entries recorded"
              description={
                action || entityType
                  ? 'No audit records match the selected action code or entity filter.'
                  : 'Platform audit activity will appear here once actions are performed.'
              }
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D9E1EA] bg-[#F5F7FA] text-left text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
                    <th className="px-4 py-2.5">Timestamp (IST)</th>
                    <th className="px-4 py-2.5">Authenticated User</th>
                    <th className="px-4 py-2.5">Action Code</th>
                    <th className="px-4 py-2.5">Target Entity</th>
                    <th className="px-4 py-2.5">Integrity Status</th>
                    <th className="px-4 py-2.5">Audit Parameters &amp; Verification Details</th>
                    <th className="px-4 py-2.5 text-right">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E1EA]">
                  {logs.map((log) => {
                    const actionCode = log.action.toUpperCase()
                    const isEvaluation = actionCode.includes('COMPLIANCE')
                    const isVerify = actionCode.includes('VERIF')
                    const badgeTone = isEvaluation ? 'primary' : isVerify ? 'success' : 'neutral'

                    return (
                      <tr key={log.id} className="hover:bg-[#F5F7FA] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-[#172033] font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#0B1F3A] text-white font-bold text-[10px]">
                              {log.user_name ? log.user_name[0].toUpperCase() : 'O'}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0B1F3A] truncate">
                                {log.user_name ?? 'System Officer'}
                              </p>
                              <p className="text-[10px] text-[#5B6878] font-mono truncate">
                                ID: {log.user_id ? log.user_id.slice(0, 8) : 'ROOT-ENCLAVE'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          <Badge tone={badgeTone} size="sm">
                            {actionCode}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize font-semibold text-[#172033]">
                            {log.entity_type ?? 'Platform'}
                          </span>
                          {log.entity_id && (
                            <p className="font-mono text-[10px] text-[#5B6878]">
                              ID: {log.entity_id.slice(0, 10)}?
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone="success" size="sm">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            IMMUTABLE RECORD
                          </Badge>
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-[#5B6878]">
                          {log.details ? (
                            <span className="font-mono text-[11px] text-[#172033]">{log.details}</span>
                          ) : (
                            <span className="italic text-slate-400">Standard verified transaction</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[10px] text-[#5B6878]">
                          REF-{(log.id || 'SYS').slice(0, 8).toUpperCase()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </SectionCard>
    </Layout>
  )
}
