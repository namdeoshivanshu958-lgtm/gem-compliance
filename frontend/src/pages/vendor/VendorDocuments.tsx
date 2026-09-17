import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  FileText,
  Upload,
  History,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  FileCheck2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

interface DocVersion {
  id: string
  version_number: number
  original_filename: string
  sha256_hash: string
  reason?: string
  uploaded_at: string
  blockchain_tx?: string
}

interface BidderDoc {
  id: string
  bidder_id: string
  document_type: string
  original_filename: string
  file_kind: string
  processing_status: string
  current_version: number
  tampering_risk?: string
  quality_status?: string
  tampering_indicators?: string
  uploaded_at: string
  extracted_data?: any
}

export default function VendorDocuments() {
  const [searchParams] = useSearchParams()
  const bidderIdParam = searchParams.get('bidder_id')

  const [bidders, setBidders] = useState<any[]>([])
  const [selectedBidderId, setSelectedBidderId] = useState<string>(bidderIdParam || '')
  const [documents, setDocuments] = useState<BidderDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [reuploadTargetDoc, setReuploadTargetDoc] = useState<BidderDoc | null>(null)
  const [uploadType, setUploadType] = useState('gst')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadReason, setUploadReason] = useState('')
  const [uploading, setUploading] = useState(false)

  // Version history modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [activeHistoryDoc, setActiveHistoryDoc] = useState<BidderDoc | null>(null)
  const [versions, setVersions] = useState<DocVersion[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Fetch bidders list
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

  // Fetch documents for selected bidder
  useEffect(() => {
    if (!selectedBidderId) {
      setLoading(false)
      return
    }
    setLoading(true)
    axios
      .get(`/api/bidders/${selectedBidderId}`)
      .then((res) => {
        if (res.data?.documents) {
          setDocuments(res.data.documents)
        } else {
          setDocuments([])
        }
      })
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false))
  }, [selectedBidderId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !selectedBidderId) return

    setUploading(true)
    const formData = new FormData()
    formData.append('bidder_id', selectedBidderId)
    formData.append('document_type', reuploadTargetDoc ? reuploadTargetDoc.document_type : uploadType)
    formData.append('file', selectedFile)

    try {
      const res = await axios.post('/api/documents/upload', formData)
      const docId = res.data?.document_id
      if (docId) {
        // Trigger background AI extraction & risk assessment
        await axios.post(`/api/documents/${docId}/process`)
      }

      // Re-evaluate compliance automatically
      await axios.post(`/api/compliance/bidder/${selectedBidderId}/evaluate`)

      // Refresh documents
      const refreshRes = await axios.get(`/api/bidders/${selectedBidderId}`)
      if (refreshRes.data?.documents) {
        setDocuments(refreshRes.data.documents)
      }

      setUploadModalOpen(false)
      setReuploadTargetDoc(null)
      setSelectedFile(null)
      setUploadReason('')
      alert('Document uploaded, AI extraction triggered, and compliance re-evaluated successfully!')
    } catch (err: any) {
      alert(`Upload failed: ${err?.response?.data?.detail || err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function openVersionHistory(doc: BidderDoc) {
    setActiveHistoryDoc(doc)
    setHistoryModalOpen(true)
    setLoadingVersions(true)
    try {
      const res = await axios.get(`/api/clarifications/documents/${doc.id}/versions`)
      setVersions(Array.isArray(res.data) ? res.data : [])
    } catch {
      setVersions([])
    } finally {
      setLoadingVersions(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#1f5faf]" />
              Bidder Document Vault &amp; Version Registry
            </h1>
            <p className="text-xs text-slate-500">
              Manage statutory compliance documents, verify cryptographic SHA-256 proofs, and track version history (V1, V2, V3...).
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Bidder selector */}
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

            <button
              onClick={() => {
                setReuploadTargetDoc(null)
                setUploadModalOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Informational Policy Banner */}
        <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#1f5faf] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Immutable Version Tracking Rule:</strong> Under GeM procurement audit guidelines, existing documents are <em>never overwritten</em> upon re-upload. Each submission generates an immutable <strong>DocumentVersion</strong> with its own SHA-256 hash anchored to the blockchain audit vault.
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Quality Status</th>
                  <th className="py-3 px-4">Tampering Risk</th>
                  <th className="py-3 px-4">AI Processing</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading bidder documents...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No documents uploaded yet for this bidder. Click "Upload Document" to begin.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold uppercase text-[#1f5faf]">
                        {doc.document_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          {doc.original_filename}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300 text-[10px]">
                          V{doc.current_version || 1}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            doc.quality_status === 'READABLE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {doc.quality_status || 'READABLE'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            doc.tampering_risk === 'LOW'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.tampering_risk === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.tampering_risk || 'LOW'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-medium text-[10px]">
                          {doc.processing_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => openVersionHistory(doc)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          History
                        </button>
                        <button
                          onClick={() => {
                            setReuploadTargetDoc(doc)
                            setUploadType(doc.document_type)
                            setUploadModalOpen(true)
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-upload (V{(doc.current_version || 1) + 1})
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload / Re-upload Modal */}
        {uploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {reuploadTargetDoc
                  ? `Re-upload Document (Creating Version V${(reuploadTargetDoc.current_version || 1) + 1})`
                  : 'Upload New Statutory Document'}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                {reuploadTargetDoc
                  ? `Original file '${reuploadTargetDoc.original_filename}' will remain preserved in version audit logs.`
                  : 'Select document category and attach PDF or scan.'}
              </p>

              <form onSubmit={handleUpload} className="space-y-4 text-xs">
                {!reuploadTargetDoc && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
                    <select
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                    >
                      <option value="pan">PAN Card</option>
                      <option value="gst">GST Registration Certificate</option>
                      <option value="udyam_msme">Udyam / MSME Certificate</option>
                      <option value="financial_statement">Financial Statements (Turnover / Balance Sheet)</option>
                      <option value="turnover_certificate">Turnover Certificate (CA Certified)</option>
                      <option value="company_registration">Company Registration / MCA CIN</option>
                      <option value="oem_authorization">OEM Authorization Letter</option>
                      <option value="bis">BIS / ISI Quality Certificate</option>
                      <option value="make_in_india">Make In India Local Content Declaration</option>
                      <option value="other">Other Statutory Declaration</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Choose File (PDF/Image)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                    required
                  />
                </div>

                {reuploadTargetDoc && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Reason for Re-upload</label>
                    <input
                      type="text"
                      value={uploadReason}
                      onChange={(e) => setUploadReason(e.target.value)}
                      placeholder="e.g. Responding to clarification, clearer scan with UDIN"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadModalOpen(false)
                      setReuploadTargetDoc(null)
                    }}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow disabled:opacity-50"
                  >
                    {uploading ? 'Processing & Anchoring...' : 'Submit & Process'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Version History Modal */}
        {historyModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Version History: {activeHistoryDoc?.document_type.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Immutable audit chain for {activeHistoryDoc?.original_filename}
                  </p>
                </div>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {loadingVersions ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading version records...</div>
              ) : versions.length === 0 ? (
                <div className="py-4 text-xs text-slate-500">
                  Version 1 is the active initial baseline. Subsequent re-uploads will appear here.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {versions.map((v) => (
                    <div key={v.id} className="p-3 rounded border border-slate-200 bg-slate-50 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-[#1f5faf]">Version {v.version_number}</span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(v.uploaded_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 font-medium text-slate-800">{v.original_filename}</div>
                      {v.reason && <div className="text-slate-600 text-[11px] mt-0.5">Reason: {v.reason}</div>}
                      <div className="mt-1 font-mono text-[10px] text-slate-500 truncate">
                        SHA-256: {v.sha256_hash}
                      </div>
                      {v.blockchain_tx && (
                        <div className="mt-1 font-mono text-[10px] text-emerald-700 truncate flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Tx: {v.blockchain_tx}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100 mt-4">
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
