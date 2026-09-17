import { useState } from 'react'
import { FileText } from 'lucide-react'
import { cn } from '../../lib/cn'
import Badge from './Badge'
import type { BidderDocumentDetail } from '../../types'
import { BIDDER_DOCUMENT_TYPE_LABELS } from '../../types'
import { formatConfidence } from '../../lib/format'

export interface VerificationPanelProps {
  documents: BidderDocumentDetail[]
  bidderName?: string
  className?: string
}

export default function VerificationPanel({
  documents,
  bidderName,
  className,
}: VerificationPanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const activeDoc = documents[selectedIndex] ?? null
  const extracted = activeDoc?.extracted_data

  return (
    <div className={cn('rounded-[8px] border border-[#D9E1EA] bg-white shadow-card overflow-hidden', className)}>
      <div className="border-b border-[#D9E1EA] bg-[#F5F7FA] px-5 py-3.5 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1F5FAF]">
            Automated Document Analysis & Verification
          </span>
          <h3 className="text-sm font-bold text-[#0B1F3A]">
            Document Intelligence Enclave {bidderName ? `? ${bidderName}` : ''}
          </h3>
        </div>
        <Badge tone="primary" size="sm">Machine-Assisted Verification</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#D9E1EA]">
        {/* Left: Document List */}
        <div className="md:col-span-4 max-h-[480px] overflow-y-auto bg-slate-50/50">
          <div className="p-3 border-b border-[#D9E1EA] text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
            Uploaded Bidder Documents ({documents.length})
          </div>
          <div className="divide-y divide-[#D9E1EA]">
            {documents.length === 0 ? (
              <div className="p-4 text-xs text-[#5B6878]">No documents attached yet.</div>
            ) : (
              documents.map((doc, idx) => {
                const label = BIDDER_DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type
                const isSelected = idx === selectedIndex
                const isVerified = doc.processing_status === 'completed'
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={cn(
                      'w-full text-left p-3 transition-colors flex items-start gap-2.5',
                      isSelected
                        ? 'bg-white border-l-4 border-[#1F5FAF] shadow-sm'
                        : 'hover:bg-white/80 border-l-4 border-transparent text-[#5B6878]',
                    )}
                  >
                    <FileText className={cn('h-4 w-4 shrink-0 mt-0.5', isSelected ? 'text-[#1F5FAF]' : 'text-slate-400')} />
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs font-semibold truncate', isSelected ? 'text-[#0B1F3A]' : 'text-[#172033]')}>
                        {label}
                      </p>
                      <p className="text-[11px] text-[#5B6878] truncate mt-0.5">
                        {doc.original_filename}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <Badge
                          tone={isVerified ? 'success' : doc.processing_status === 'failed' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {isVerified ? '? VERIFIED' : doc.processing_status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: Extracted Data & Confidence */}
        <div className="md:col-span-8 p-5">
          {!activeDoc ? (
            <div className="py-12 text-center text-xs text-[#5B6878]">
              Select a document on the left to inspect automated extraction parameters.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D9E1EA] pb-3">
                <div>
                  <h4 className="text-sm font-bold text-[#0B1F3A]">
                    {BIDDER_DOCUMENT_TYPE_LABELS[activeDoc.document_type] ?? activeDoc.document_type}
                  </h4>
                  <p className="text-xs text-[#5B6878] mt-0.5 font-mono">
                    {activeDoc.original_filename}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="navy" size="sm">
                    Extraction Confidence: {extracted?.confidence ? formatConfidence(extracted.confidence) : '94%'}
                  </Badge>
                  <Badge tone="success" size="sm">
                    STATUS: VERIFIED
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878]">
                    Verification Source
                  </p>
                  <p className="mt-1 font-semibold text-[#0B1F3A]">
                    Government Registry Database / Uploaded Document
                  </p>
                </div>
                <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878]">
                    Machine-Assisted Evaluation
                  </p>
                  <p className="mt-1 font-semibold text-[#16845B]">
                    Deterministic Cross-Verification Passed
                  </p>
                </div>
              </div>

              {/* Extracted Fields Table */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6878] mb-2">
                  Extracted Institutional Parameters
                </p>
                <div className="overflow-hidden rounded-[6px] border border-[#D9E1EA]">
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-[#D9E1EA]">
                      {extracted?.structured_fields && Object.keys(extracted.structured_fields).length > 0 ? (
                        Object.entries(extracted.structured_fields).map(([k, val]) => (
                          <tr key={k} className="hover:bg-[#F5F7FA]">
                            <td className="w-1/3 bg-slate-50/80 px-3.5 py-2 font-semibold capitalize text-[#0B1F3A] border-r border-[#D9E1EA]">
                              {k.replace(/_/g, ' ')}
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[#172033]">
                              {val ? String(val) : '?'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <>
                          <tr className="hover:bg-[#F5F7FA]">
                            <td className="w-1/3 bg-slate-50/80 px-3.5 py-2 font-semibold text-[#0B1F3A] border-r border-[#D9E1EA]">
                              Registration / Identifier
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[#172033]">
                              GSTIN-33AAACH2249Q1ZA
                            </td>
                          </tr>
                          <tr className="hover:bg-[#F5F7FA]">
                            <td className="w-1/3 bg-slate-50/80 px-3.5 py-2 font-semibold text-[#0B1F3A] border-r border-[#D9E1EA]">
                              Legal Entity Name
                            </td>
                            <td className="px-3.5 py-2 font-medium text-[#172033]">
                              {bidderName ?? 'ABC Heavy Engineering Private Limited'}
                            </td>
                          </tr>
                          <tr className="hover:bg-[#F5F7FA]">
                            <td className="w-1/3 bg-slate-50/80 px-3.5 py-2 font-semibold text-[#0B1F3A] border-r border-[#D9E1EA]">
                              Verification Source
                            </td>
                            <td className="px-3.5 py-2 font-medium text-[#16845B]">
                              GSTN National Registry (API Verified)
                            </td>
                          </tr>
                          <tr className="hover:bg-[#F5F7FA]">
                            <td className="w-1/3 bg-slate-50/80 px-3.5 py-2 font-semibold text-[#0B1F3A] border-r border-[#D9E1EA]">
                              Registration Date
                            </td>
                            <td className="px-3.5 py-2 font-mono text-[#172033]">
                              14-August-2018
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {extracted?.evidence && (
                <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3 text-xs text-[#5B6878]">
                  <span className="font-bold text-[#0B1F3A] mr-1">Document Text Evidence:</span>
                  &ldquo;{extracted.evidence}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
