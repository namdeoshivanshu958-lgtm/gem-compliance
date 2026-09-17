import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Send,
  User,
  Clock,
  FileCheck2,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

export default function OfficerClarifications() {
  const [tenders, setTenders] = useState<any[]>([])
  const [selectedTenderId, setSelectedTenderId] = useState<string>('')
  const [bidders, setBidders] = useState<any[]>([])
  const [clarifications, setClarifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New Request Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [targetBidderId, setTargetBidderId] = useState('')
  const [subject, setSubject] = useState('')
  const [queryText, setQueryText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Resolve Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false)
  const [targetClarif, setTargetClarif] = useState<any>(null)
  const [resolveStatus, setResolveStatus] = useState('resolved')
  const [resolutionNotes, setResolutionNotes] = useState('')

  useEffect(() => {
    Promise.all([
      axios.get('/api/tenders').catch(() => ({ data: [] })),
      axios.get('/api/bidders').catch(() => ({ data: [] })),
    ]).then(([tRes, bRes]) => {
      if (Array.isArray(tRes.data) && tRes.data.length > 0) {
        setTenders(tRes.data)
        setSelectedTenderId(tRes.data[0].id)
      }
      if (Array.isArray(bRes.data)) {
        setBidders(bRes.data)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedTenderId) return
    setLoading(true)
    axios
      .get(`/api/clarifications/tender/${selectedTenderId}`)
      .then((res) => {
        setClarifications(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => setClarifications([]))
      .finally(() => setLoading(false))
  }, [selectedTenderId])

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!targetBidderId || !subject.trim() || !queryText.trim()) return

    setSubmitting(true)
    try {
      await axios.post('/api/clarifications/request', {
        tender_id: selectedTenderId,
        bidder_id: targetBidderId,
        subject: subject.trim(),
        query_text: queryText.trim(),
      })
      alert('Clarification request issued to bidder successfully!')
      setModalOpen(false)
      setSubject('')
      setQueryText('')

      // Refresh
      const refresh = await axios.get(`/api/clarifications/tender/${selectedTenderId}`)
      setClarifications(Array.isArray(refresh.data) ? refresh.data : [])
    } catch (err: any) {
      alert(`Request failed: ${err?.response?.data?.detail || err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResolveSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetClarif) return

    setSubmitting(true)
    try {
      await axios.post(`/api/clarifications/${targetClarif.id}/resolve`, {
        status: resolveStatus,
        resolution_notes: resolutionNotes.trim() || undefined,
      })
      alert(`Clarification marked as ${resolveStatus}`)
      setResolveModalOpen(false)
      setTargetClarif(null)
      setResolutionNotes('')

      // Refresh
      const refresh = await axios.get(`/api/clarifications/tender/${selectedTenderId}`)
      setClarifications(Array.isArray(refresh.data) ? refresh.data : [])
    } catch (err: any) {
      alert(`Resolution failed: ${err?.response?.data?.detail || err.message}`)
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
              <MessageSquare className="w-5 h-5 text-[#1f5faf]" />
              Evaluation Committee Clarification Center
            </h1>
            <p className="text-xs text-slate-500">
              Issue formal requests for clarification or document re-upload to bidders and review submitted responses.
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
              onClick={() => {
                if (bidders.length > 0 && !targetBidderId) {
                  setTargetBidderId(bidders[0].id)
                }
                setModalOpen(true)
              }}
              className="bg-[#0b1f3a] hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-1.5 rounded shadow transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Request Clarification
            </button>
          </div>
        </div>

        {/* Clarifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
              Loading clarifications...
            </div>
          ) : clarifications.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
              No clarifications have been issued for this tender yet. Click "Request Clarification" above to issue one.
            </div>
          ) : (
            clarifications.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        item.status === 'pending'
                          ? 'bg-rose-100 text-rose-800'
                          : item.status === 'responded'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{item.subject}</h3>
                    <span className="text-slate-400">|</span>
                    <span className="font-semibold text-slate-700">Bidder: {item.bidder_name}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Issued: {new Date(item.requested_at).toLocaleString()}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">Query Text:</span>
                  <p className="text-slate-800 leading-relaxed">{item.query_text}</p>
                </div>

                {item.response_text ? (
                  <div className="bg-emerald-50/50 p-3 rounded border border-emerald-200">
                    <span className="font-bold text-emerald-900 block mb-1">Bidder's Submitted Response:</span>
                    <p className="text-emerald-950 leading-relaxed">{item.response_text}</p>
                    {item.responded_at && (
                      <span className="text-[10px] text-emerald-700 mt-1 block">
                        Received: {new Date(item.responded_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">
                    Awaiting response from vendor...
                  </div>
                )}

                {item.resolution_notes && (
                  <div className="bg-purple-50 p-3 rounded border border-purple-200">
                    <span className="font-bold text-purple-900 block mb-1">Committee Resolution:</span>
                    <p className="text-purple-950 leading-relaxed">{item.resolution_notes}</p>
                  </div>
                )}

                {item.status === 'responded' && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setTargetClarif(item)
                        setResolveModalOpen(true)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1 rounded text-xs shadow transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolve / Conclude Clarification
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Create Clarification Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Issue Clarification Request to Bidder
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                The bidder will receive an alert and be allowed to submit a written explanation and revised document.
              </p>

              <form onSubmit={handleCreateRequest} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Bidder *</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Subject / Requirement Heading *</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Unreadable GST Certificate / Missing Turnover UDIN"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Detailed Technical Query *</label>
                  <textarea
                    rows={4}
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="State the exact discrepancy, missing field, or clause requirement..."
                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-amber-500"
                    required
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
                    disabled={submitting || !subject.trim() || !queryText.trim()}
                    className="px-4 py-1.5 rounded bg-[#0b1f3a] hover:bg-slate-800 text-white font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Issuing...' : 'Issue Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Resolve Modal */}
        {resolveModalOpen && targetClarif && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Conclude Clarification: {targetClarif.subject}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Record the committee's decision on the bidder's submitted response.
              </p>

              <form onSubmit={handleResolveSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Resolution Verdict</label>
                  <select
                    value={resolveStatus}
                    onChange={(e) => setResolveStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white font-bold"
                  >
                    <option value="resolved">RESOLVED (Response &amp; Document Accepted)</option>
                    <option value="rejected">REJECTED (Response Inadequate)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Committee Resolution Notes</label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="e.g. Scrutinized replacement CA certificate; turnover requirement verified compliant."
                    className="w-full border border-slate-300 rounded p-2 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setResolveModalOpen(false)
                      setTargetClarif(null)
                    }}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow disabled:opacity-50"
                  >
                    {submitting ? 'Recording...' : 'Commit Resolution'}
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
