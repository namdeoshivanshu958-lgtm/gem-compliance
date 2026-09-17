import React, { useState, useEffect } from 'react'
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Lock,
  FileCheck2,
  Send,
  History,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

interface OfficerDecisionRecord {
  id: string
  tender_id: string
  bidder_id: string
  bidder_name: string
  decision_type: string
  original_verdict: string
  new_verdict: string
  deviation_category?: string
  justification: string
  comments?: string
  officer_name: string
  officer_role: string
  blockchain_tx?: string
  created_at: string
}

export default function OfficerDecisions() {
  const [tenders, setTenders] = useState<any[]>([])
  const [selectedTenderId, setSelectedTenderId] = useState<string>('')
  const [bidders, setBidders] = useState<any[]>([])
  const [decisions, setDecisions] = useState<OfficerDecisionRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Override Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [targetBidderId, setTargetBidderId] = useState('')
  const [decisionType, setDecisionType] = useState('APPROVE_WITH_DEVIATION')
  const [deviationCategory, setDeviationCategory] = useState('Minor Documentary Discrepancy')
  const [justification, setJustification] = useState('')
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load initial tenders
  useEffect(() => {
    axios
      .get('/api/tenders')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTenders(res.data)
          setSelectedTenderId(res.data[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Load bidders & decisions for selected tender
  useEffect(() => {
    if (!selectedTenderId) return
    setLoading(true)

    Promise.all([
      axios.get('/api/bidders').catch(() => ({ data: [] })),
      axios.get(`/api/officer/decisions/tender/${selectedTenderId}`).catch(() => ({ data: [] })),
    ])
      .then(([biddersRes, decisionsRes]) => {
        const bList = Array.isArray(biddersRes.data)
          ? biddersRes.data.filter((b: any) => String(b.tender_id) === String(selectedTenderId))
          : []
        setBidders(bList)
        if (bList.length > 0 && !targetBidderId) {
          setTargetBidderId(bList[0].id)
        }
        setDecisions(Array.isArray(decisionsRes.data) ? decisionsRes.data : [])
      })
      .finally(() => setLoading(false))
  }, [selectedTenderId])

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetBidderId || !justification.trim()) return

    setSubmitting(true)
    try {
      const res = await axios.post('/api/officer/override', {
        tender_id: selectedTenderId,
        bidder_id: targetBidderId,
        decision_type: decisionType,
        deviation_category: decisionType === 'APPROVE_WITH_DEVIATION' ? deviationCategory : undefined,
        justification: justification.trim(),
        comments: comments.trim() || undefined,
      })

      alert(`Officer decision successfully recorded and anchored! Tx: ${res.data.blockchain_tx || 'Recorded'}`)
      setModalOpen(false)
      setJustification('')
      setComments('')

      // Refresh decisions list
      const refresh = await axios.get(`/api/officer/decisions/tender/${selectedTenderId}`)
      setDecisions(Array.isArray(refresh.data) ? refresh.data : [])
    } catch (err: any) {
      alert(`Override failed: ${err?.response?.data?.detail || err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#1f5faf]" />
              Officer Override &amp; Deviation Ledger
            </h1>
            <p className="text-xs text-slate-500">
              Execute authorized manual evaluation overrides, log statutory justifications, and anchor decisions to the blockchain.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedTenderId}
              onChange={(e) => setSelectedTenderId(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-amber-500"
            >
              {tenders.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tender_ref_no}
                </option>
              ))}
            </select>

            <button
              onClick={() => setModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-1.5 rounded shadow transition-colors flex items-center gap-1.5"
            >
              <Scale className="w-4 h-4" />
              Log Officer Decision / Override
            </button>
          </div>
        </div>

        {/* Audit Enclave Guidance */}
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Cryptographic Audit Anchoring:</strong> All officer overrides and authorized deviations are permanently signed with the evaluator's credentials, timestamped, and bundled into a new cryptographic block on the private procurement blockchain.
          </div>
        </div>

        {/* Override Ledger Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recorded Decisions &amp; Deviations History
            </h2>
            <span className="text-[11px] text-slate-500">{decisions.length} recorded entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Bidder Name</th>
                  <th className="py-3 px-4">Decision Type</th>
                  <th className="py-3 px-4">Original → New</th>
                  <th className="py-3 px-4">Officer &amp; Role</th>
                  <th className="py-3 px-4">Justification</th>
                  <th className="py-3 px-4 text-right">Blockchain Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Loading decisions...
                    </td>
                  </tr>
                ) : decisions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No officer overrides or deviations have been recorded for this tender.
                    </td>
                  </tr>
                ) : (
                  decisions.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{d.bidder_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            d.decision_type === 'APPROVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.decision_type === 'APPROVE_WITH_DEVIATION'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {d.decision_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-slate-500">{d.original_verdict}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="font-bold text-slate-900">{d.new_verdict}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{d.officer_name}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{d.officer_role}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-900 truncate" title={d.justification}>
                          {d.justification}
                        </div>
                        {d.deviation_category && (
                          <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                            Category: {d.deviation_category}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {d.blockchain_tx ? (
                          <span className="font-mono text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            {d.blockchain_tx.slice(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-slate-400">Ledger Verified</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Override Modal Dialog */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Execute Authorized Officer Override / Deviation
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                This action modifies the deterministic verdict and commits a cryptographic block to the ledger.
              </p>

              <form onSubmit={handleOverrideSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Bidder *</label>
                  <select
                    value={targetBidderId}
                    onChange={(e) => setTargetBidderId(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    required
                  >
                    {bidders.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Decision Type *</label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white font-semibold"
                  >
                    <option value="APPROVE_WITH_DEVIATION">APPROVE WITH DEVIATION (Tender Provision)</option>
                    <option value="APPROVE">APPROVE (Overturn to Compliant)</option>
                    <option value="REJECT">REJECT (Mark Non-Compliant)</option>
                  </select>
                </div>

                {decisionType === 'APPROVE_WITH_DEVIATION' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deviation Category *</label>
                    <select
                      value={deviationCategory}
                      onChange={(e) => setDeviationCategory(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    >
                      <option value="Minor Documentary Discrepancy">Minor Documentary Discrepancy</option>
                      <option value="Minor Specification Variance">Minor Specification Variance</option>
                      <option value="Relaxation under MSE Policy">Relaxation under MSE Policy</option>
                      <option value="Make in India Local Content Exemption">Make in India Local Content Exemption</option>
                      <option value="Other Tender Specific Proviso">Other Tender Specific Proviso</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Official Justification &amp; Clause Citation *
                  </label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="e.g. Discrepancy accepted under Clause 4.2.1 provisions as per competent authority approval..."
                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Internal Committee Comments</label>
                  <input
                    type="text"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Optional meeting reference or file number"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !justification.trim()}
                    className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {submitting ? 'Anchoring to Blockchain...' : 'Commit Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
