import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Blocks,
  Copy,
  ExternalLink,
} from 'lucide-react'
import Layout from '../components/Layout'
import { listAuditLogs, verifyAuditIntegrity } from '../api/audit'
import type { AuditLogEntry } from '../types'

const PAGE_SIZE = 20

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'report_generated', label: 'Report Generated' },
  { value: 'password_changed', label: 'Password Changed' },
  { value: 'verification_run', label: 'Verification Run' },
  { value: 'compliance_evaluated', label: 'Compliance Evaluated' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'bidder', label: 'Bidder' },
  { value: 'tender', label: 'Tender' },
  { value: 'user', label: 'User' },
]

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean
    total_checked: number
    broken_at_entry_id?: string
    reason?: string
  } | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
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
          setError('You do not have permission to view audit logs.')
        } else {
          setError('Failed to load audit logs')
        }
      })
      .finally(() => setIsLoading(false))
  }, [action, entityType, page])

  useEffect(() => {
    load()
  }, [load])

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const res = await verifyAuditIntegrity()
      setVerificationResult(res)
    } catch (err) {
      console.error('Audit verification error:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Audit Logs & Hash Chain</h2>
          <p className="text-sm text-gray-500">
            A read-only, tamper-evident audit trail of every key action taken across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 transition"
          >
            <ShieldCheck className={`h-4 w-4 text-emerald-600 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verifying...' : 'Verify Hash Chain'}
          </button>
          <Link
            to="/blockchain"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
          >
            <Blocks className="h-4 w-4" />
            Blockchain Explorer
          </Link>
        </div>
      </div>

      {/* Blockchain Cross-Link Alert Banner */}
      <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 text-indigo-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0">
            <Blocks className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-indigo-950">Cryptographic Blockchain Backed</h4>
            <p className="text-xs text-indigo-700">
              Audit entries and bidder documents are sealed into an immutable Merkle tree ledger with SHA-256 block linking.
            </p>
          </div>
        </div>
        <Link
          to="/blockchain"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 shrink-0"
        >
          View Full Block Ledger <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`mb-6 rounded-lg border p-3.5 text-xs shadow-xs ${
            verificationResult.valid
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {verificationResult.valid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {verificationResult.valid
                  ? `Hash Chain Intact: ${verificationResult.total_checked} rows verified with 0 tampering detected.`
                  : `Hash Chain Broken at entry ${verificationResult.broken_at_entry_id}: ${verificationResult.reason}`}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-700">Activity</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value)
                setPage(1)
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value)
                setPage(1)
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ENTITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Timestamp</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">User</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Action</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Entity</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">Details</th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-500">SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3" colSpan={6}>
                      <div className="h-4 w-full rounded bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 && !error ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    No audit log entries match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500 text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{log.user_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {log.entity_type ? `${log.entity_type} · ${log.entity_id?.slice(0, 8)}...` : '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-400" title={log.details || ''}>
                      {log.details || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {log.record_hash ? (
                        <div className="flex items-center gap-1">
                          <span title={log.record_hash}>{log.record_hash.slice(0, 12)}...</span>
                          <button
                            onClick={() => copyToClipboard(log.record_hash!)}
                            className="text-gray-400 hover:text-gray-700"
                            title="Copy SHA-256 hash"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && logs.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 text-xs text-gray-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-gray-300 px-2.5 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-gray-300 px-2.5 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
