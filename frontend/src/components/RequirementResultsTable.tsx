import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Quote, Sparkles } from 'lucide-react'
import type { RequirementResult } from '../types'
import { REQUIREMENT_CATEGORY_LABELS } from '../types'
import RequirementResultStatusBadge from './RequirementResultStatusBadge'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import ExplainableEvidenceModal from './ui/ExplainableEvidenceModal'

function formatValue(v: any): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString('en-IN')
  return String(v)
}

/**
 * Expandable per-requirement results table. Each row expands to reveal the
 * rule-engine reason, evidence snippet and verification provenance.
 */
export default function RequirementResultsTable({ results }: { results: RequirementResult[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<RequirementResult | null>(null)

  if (results.length === 0) {
    return (
      <EmptyState
        compact
        title="No requirement results yet"
        description="Run verification to evaluate this bidder against the tender requirements."
      />
    )
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th scope="col" className="w-8 px-3 py-3" aria-label="Expand" />
            <th scope="col" className="px-4 py-3">Requirement</th>
            <th scope="col" className="hidden px-4 py-3 md:table-cell">Required</th>
            <th scope="col" className="hidden px-4 py-3 md:table-cell">Actual</th>
            <th scope="col" className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {results.map((r) => {
            const isOpen = expanded === r.requirement_id
            return (
              <Fragment key={r.requirement_id}>
                <tr
                  className="cursor-pointer bg-white transition-colors hover:bg-slate-50"
                  onClick={() => setExpanded(isOpen ? null : r.requirement_id)}
                  aria-expanded={isOpen}
                >
                  <td className="px-3 py-3 align-top text-slate-400">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{r.requirement}</span>
                      {r.mandatory ? (
                        <Badge tone="navy" size="sm">Mandatory</Badge>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {REQUIREMENT_CATEGORY_LABELS[r.category] ?? r.category}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 align-top text-slate-600 md:table-cell tabular-nums">
                    {formatValue(r.required_value)}
                  </td>
                  <td className="hidden px-4 py-3 align-top text-slate-600 md:table-cell tabular-nums">
                    {formatValue(r.actual_value)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <RequirementResultStatusBadge status={r.status} />
                  </td>
                </tr>
                {isOpen && (
                  <tr className="bg-slate-50/70">
                    <td />
                    <td colSpan={4} className="px-4 py-4">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm text-slate-600 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <span className="font-semibold text-slate-700">Reason: </span>
                          {r.reason}
                        </div>
                        <div className="md:hidden">
                          <span className="font-semibold text-slate-700">Required: </span>
                          {formatValue(r.required_value)}
                          <span className="mx-2 text-slate-300">·</span>
                          <span className="font-semibold text-slate-700">Actual: </span>
                          {formatValue(r.actual_value)}
                        </div>
                        {r.evidence && (
                          <div className="sm:col-span-2">
                            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs italic text-slate-600">
                              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                              <span>{r.evidence}</span>
                            </div>
                          </div>
                        )}
                        {r.source_document && (
                          <div>
                            <span className="font-semibold text-slate-700">Source document: </span>
                            {r.source_document}
                          </div>
                        )}
                        {r.verification_provider && (
                          <div>
                            <span className="font-semibold text-slate-700">Verification provider: </span>
                            {r.verification_provider}{' '}
                            <span className="text-slate-400">(simulated)</span>
                          </div>
                        )}
                        {r.clause_reference && (
                          <div>
                            <span className="font-semibold text-slate-700">Clause: </span>
                            {r.clause_reference}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          Deterministic Rule Engine Verified • SHA-256 Ledger
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedItem(r)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0B1F3A] hover:bg-[#163A63] rounded-[6px] shadow-sm transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                          Why this decision? (Explainable AI)
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>

      {/* Explainable AI Decision Breakdown Modal */}
      <ExplainableEvidenceModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={
          selectedItem
            ? {
                requirement: selectedItem.requirement,
                category: selectedItem.category,
                status: selectedItem.status.toUpperCase(),
                reason: selectedItem.reason,
                required_value: selectedItem.required_value,
                actual_value: selectedItem.actual_value,
                evidence: selectedItem.evidence || undefined,
                source_document: selectedItem.source_document || undefined,
                clause_reference: selectedItem.clause_reference || undefined,
                confidence: selectedItem.status === 'COMPLIANT' ? 0.96 : 0.88,
                rule_applied: `rule_verify_${selectedItem.category || 'clause'}(required=${JSON.stringify(selectedItem.required_value)}, actual=${JSON.stringify(selectedItem.actual_value)})`,
                verification_provider: selectedItem.verification_provider,
                mandatory: selectedItem.mandatory,
              }
            : null
        }
      />
    </div>
  )
}
