import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Upload,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

interface ClarificationItem {
  id: string
  tender_id: string
  bidder_id: string
  requirement_id?: string
  subject: string
  query_text: string
  status: string
  requested_at: string
  response_text?: string
  responded_at?: string
  resolution_notes?: string
  resolved_at?: string
}

export default function VendorClarifications() {
  const [searchParams] = useSearchParams()
  const bidderIdParam = searchParams.get('bidder_id')

  const [bidders, setBidders] = useState<any[]>([])
  const [selectedBidderId, setSelectedBidderId] = useState<string>(bidderIdParam || '')
  const [clarifications, setClarifications] = useState<ClarificationItem[]>([])
  const [loading, setLoading] = useState(true)

  // Response Modal State
  const [activeItem, setActiveItem] = useState<ClarificationItem | null>(null)
  const [responseText, setResponseText] = useState('')
  const [replacementFile, setReplacementFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load bidders
  useEffect(() => {
    axios
      .get('/api/bidders')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setBidders(res.data)
          if (!selectedBidderId) {
            setSelectedBidderId(res.data[0].id)
          }
        }
      })
      .catch(() => {})
  }, [])

  // Load clarifications for bidder
  useEffect(() => {
    if (!selectedBidderId) {
      setLoading(false)
      return
    }
    setLoading(true)
    axios
      .get(`/api/clarifications/bidder/${selectedBidderId}`)
      .then((res) => {
        setClarifications(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => setClarifications([]))
      .finally(() => setLoading(false))
  }, [selectedBidderId])

  async function handleResponseSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeItem || !responseText.trim()) return

    setSubmitting(true)
    const formData = new FormData()
    formData.append('response_text', responseText.trim())
    if (replacementFile) {
      formData.append('replacement_file', replacementFile)
    }

    try {
      await axios.post(`/api/clarifications/${activeItem.id}/respond`, formData)
      alert('Clarification response submitted successfully! System is re-evaluating compliance.')
      setActiveItem(null)
      setResponseText('')
      setReplacementFile(null)

      // Refresh list
      const refreshRes = await axios.get(`/api/clarifications/bidder/${selectedBidderId}`)
      setClarifications(Array.isArray(refreshRes.data) ? refreshRes.data : [])
    } catch (err: any) {
      alert(`Submission failed: ${err?.response?.data?.detail || err.message}`)
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
              Clarification &amp; Re-upload Center
            </h1>
            <p className="text-xs text-slate-500">
              Respond to technical evaluation queries raised by government procurement officers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBidderId}
              onChange={(e) => setSelectedBidderId(e.target.value)}
              className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-medium focus:ring-2 focus:ring-amber-500"
            >
              {bidders.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Informational Guidance Banner */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Time-Sensitive Notice:</strong> Under GFR &amp; GeM tender conditions, clarifications requested by the evaluation committee must be answered within the specified window (normally 72 hours). Uploading a replacement certified document will automatically trigger an AI re-evaluation and create a new version record.
          </div>
        </div>

        {/* Clarifications List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-500">
              Loading clarifications...
            </div>
          ) : clarifications.length === 0 ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-900">No Clarifications Required</div>
              <p className="text-xs text-slate-500 mt-1">
                There are no open queries or document revision notices from the evaluation committee for this bidder.
              </p>
            </div>
          ) : (
            clarifications.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-3"
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
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Requested on: {new Date(item.requested_at).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs bg-slate-50 p-3 rounded border border-slate-100">
                  <span className="font-bold text-slate-700 block mb-1">Officer Query:</span>
                  <p className="text-slate-800 leading-relaxed">{item.query_text}</p>
                </div>

                {item.response_text && (
                  <div className="text-xs bg-emerald-50/50 p-3 rounded border border-emerald-200">
                    <span className="font-bold text-emerald-900 block mb-1">Your Submitted Response:</span>
                    <p className="text-emerald-950 leading-relaxed">{item.response_text}</p>
                    {item.responded_at && (
                      <span className="text-[10px] text-emerald-700 mt-1 block">
                        Submitted at: {new Date(item.responded_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {item.resolution_notes && (
                  <div className="text-xs bg-purple-50 p-3 rounded border border-purple-200">
                    <span className="font-bold text-purple-900 block mb-1">Committee Resolution:</span>
                    <p className="text-purple-950 leading-relaxed">{item.resolution_notes}</p>
                  </div>
                )}

                {item.status === 'pending' && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setActiveItem(item)
                        setResponseText('')
                        setReplacementFile(null)
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 rounded text-xs shadow transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Response &amp; Re-upload
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Response Modal */}
        {activeItem && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Respond to Clarification: {activeItem.subject}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Provide an official explanation and attach the replacement or supplementary document.
              </p>

              <form onSubmit={handleResponseSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Written Explanation / Justification *
                  </label>
                  <textarea
                    rows={4}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Enter your detailed response and explanation here..."
                    className="w-full border border-slate-300 rounded p-2.5 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Attach Replacement / Supplementary Document (PDF / Scan)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    A new DocumentVersion (e.g. V2) will be created with SHA-256 anchoring.
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveItem(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !responseText.trim()}
                    className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold shadow disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submitting ? 'Submitting & Re-evaluating...' : 'Submit Official Response'}
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
