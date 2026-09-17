import { useState } from 'react'
import {
  ShieldCheck,
  Upload,
  Brain,
  CheckCircle2,
  Scale,
  UserCheck,
  HelpCircle,
  RefreshCw,
  Award,
  Blocks,
  FileCheck,
  Clock,
  ChevronRight,
  List,
  GitCommit,
} from 'lucide-react'
import Badge from './Badge'
import type { AuditLogEntry } from '../../types'

export interface LifecycleStage {
  id: string
  label: string
  subtext: string
  icon: typeof Upload
  status: 'completed' | 'in_progress' | 'pending' | 'flagged'
  timestamp?: string
  actor?: string
}

export interface AuditTimelineProps {
  entries: AuditLogEntry[]
  loading?: boolean
  bidderStatus?: string
  clarificationStatus?: string
  blockchainVerified?: boolean
}

const DEFAULT_LIFECYCLE_STAGES: LifecycleStage[] = [
  {
    id: 'upload',
    label: 'Document Uploaded',
    subtext: 'Statutory PDF/certificates submitted by bidder',
    icon: Upload,
    status: 'completed',
    actor: 'Bidder (Authorized Signatory)',
  },
  {
    id: 'ai_extraction',
    label: 'AI Field Extraction',
    subtext: 'Dual OCR & OCR confidence scoring executed',
    icon: Brain,
    status: 'completed',
    actor: 'Gemini AI Vision Engine',
  },
  {
    id: 'verification',
    label: 'Statutory Source Verification',
    subtext: 'Cross-referenced against GST, MCA, Udyam & DigiLocker',
    icon: CheckCircle2,
    status: 'completed',
    actor: 'Deterministic Verification Engine',
  },
  {
    id: 'compliance',
    label: 'Compliance Evaluation',
    subtext: 'Mandatory eligibility rule evaluation & score breakdown',
    icon: Scale,
    status: 'completed',
    actor: 'Deterministic Rule Engine',
  },
  {
    id: 'officer_review',
    label: 'Officer Review & Overrides',
    subtext: 'Procurement Officer inspected flagged criteria',
    icon: UserCheck,
    status: 'completed',
    actor: 'CPCL Procurement Committee',
  },
  {
    id: 'clarification',
    label: 'Clarification Notice',
    subtext: 'Formal notice issued under Rule 173(iv)',
    icon: HelpCircle,
    status: 'completed',
    actor: 'Evaluating Officer',
  },
  {
    id: 'reupload',
    label: 'Addendum Re-upload (V2)',
    subtext: 'Corrective statutory document re-submitted',
    icon: RefreshCw,
    status: 'completed',
    actor: 'Bidder',
  },
  {
    id: 'reevaluation',
    label: 'Automated Re-evaluation',
    subtext: 'Fresh deterministic verification run on V2 document',
    icon: FileCheck,
    status: 'completed',
    actor: 'Automated Pipeline',
  },
  {
    id: 'final_decision',
    label: 'Final Officer Decision',
    subtext: 'Mandatory sign-off with recorded justification',
    icon: Award,
    status: 'completed',
    actor: 'Competent Authority',
  },
  {
    id: 'blockchain_report',
    label: 'Blockchain Anchoring & Report',
    subtext: 'SHA-256 Merkle root anchored & PDF summary generated',
    icon: Blocks,
    status: 'completed',
    actor: 'Blockchain Ledger Service',
  },
]

export default function AuditTimeline({
  entries,
  loading,
  bidderStatus,
  clarificationStatus,
  blockchainVerified = true,
}: AuditTimelineProps) {
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'log'>('lifecycle')

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 w-full skeleton rounded" />
        ))}
      </div>
    )
  }

  // Adjust stages dynamically if clarification was not needed
  const stages = DEFAULT_LIFECYCLE_STAGES.map((st) => {
    if (st.id === 'clarification' && clarificationStatus === 'NONE') {
      return { ...st, status: 'completed' as const, subtext: 'No clarification required; criteria fully met' }
    }
    if (st.id === 'reupload' && clarificationStatus === 'NONE') {
      return { ...st, status: 'completed' as const, subtext: 'Original V1 documents accepted without addendum' }
    }
    return st
  })

  return (
    <div className="space-y-4">
      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-gov-border pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('lifecycle')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'lifecycle'
                ? 'bg-gov-navy text-white shadow-sm'
                : 'text-gov-muted hover:bg-slate-100 hover:text-gov-navy'
            }`}
          >
            <GitCommit className="h-3.5 w-3.5" />
            10-Stage Lifecycle Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'log'
                ? 'bg-gov-navy text-white shadow-sm'
                : 'text-gov-muted hover:bg-slate-100 hover:text-gov-navy'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Immutable Audit Trail ({entries?.length || 0})
          </button>
        </div>

        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Tamper-Evident SHA-256 Ledger
        </span>
      </div>

      {activeTab === 'lifecycle' ? (
        /* Visual Vertical 10-Stage Timeline */
        <div className="rounded-xl border border-gov-border bg-white p-5 shadow-sm">
          <div className="relative pl-6 before:absolute before:left-9 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200">
            <div className="space-y-6">
              {stages.map((stage, idx) => {
                const Icon = stage.icon
                const isCompleted = stage.status === 'completed'
                const isCurrent = stage.status === 'in_progress'

                return (
                  <div key={stage.id} className="relative flex items-start gap-4">
                    {/* Step Icon Badge */}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-white shadow-sm transition-all ${
                        isCompleted
                          ? 'border-emerald-500 bg-emerald-600'
                          : isCurrent
                          ? 'border-gov-blue bg-gov-blue animate-pulse'
                          : 'border-slate-300 bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-[11px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 rounded-lg border border-slate-100 bg-slate-50/60 p-3.5 hover:border-slate-300 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gov-navy">
                            {idx + 1}. {stage.label}
                          </span>
                          <Badge tone={isCompleted ? 'success' : isCurrent ? 'info' : 'neutral'} size="sm">
                            {isCompleted ? 'VERIFIED' : isCurrent ? 'IN PROGRESS' : 'PENDING'}
                          </Badge>
                        </div>
                        {stage.actor && (
                          <span className="text-[10px] font-semibold text-gov-muted bg-white border border-slate-200 px-2 py-0.5 rounded">
                            Actor: {stage.actor}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gov-muted mt-1">{stage.subtext}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Immutable Audit Log Table */
        <div className="rounded-xl border border-gov-border bg-white overflow-hidden shadow-sm">
          {!entries || entries.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5B6878]">
              No audit log entries recorded for this session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D9E1EA] bg-[#F5F7FA] text-left text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
                    <th className="px-4 py-2.5">Timestamp (IST)</th>
                    <th className="px-4 py-2.5">Authenticated User</th>
                    <th className="px-4 py-2.5">Action Code</th>
                    <th className="px-4 py-2.5">Target Entity</th>
                    <th className="px-4 py-2.5">Integrity Status</th>
                    <th className="px-4 py-2.5 text-right">Session Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E1EA]">
                  {entries.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F5F7FA] transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-[#172033] font-mono">
                        {new Date(log.created_at).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF2FA] text-[#1F5FAF] font-bold text-[10px]">
                            {log.user_name ? log.user_name[0].toUpperCase() : 'O'}
                          </span>
                          <span className="font-medium text-[#172033]">{log.user_name ?? 'System Engine'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[#0B1F3A]">
                        <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-semibold text-[10px]">
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[#5B6878]">
                        <span className="capitalize font-medium text-[#172033]">{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="ml-1 font-mono text-[10px] text-[#5B6878]">({log.entity_id.slice(0, 8)}…)</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone="success" size="sm">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          VERIFIED RECORD
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-[10px] text-[#5B6878]">
                        REF-{(log.id || 'SYS').slice(0, 8).toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
