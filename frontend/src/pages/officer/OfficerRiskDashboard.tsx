import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  FileSearch,
  CheckCircle2,
  Lock,
  Share2,
  Info,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

export default function OfficerRiskDashboard() {
  const [tenders, setTenders] = useState<any[]>([])
  const [selectedTenderId, setSelectedTenderId] = useState<string>('')
  const [collusionData, setCollusionData] = useState<any>(null)
  const [bidders, setBidders] = useState<any[]>([])
  const [selectedBidderId, setSelectedBidderId] = useState<string>('')
  const [documentRisks, setDocumentRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Load tenders and bidders
  useEffect(() => {
    Promise.all([
      axios.get('/api/tenders').catch(() => ({ data: [] })),
      axios.get('/api/bidders').catch(() => ({ data: [] })),
    ]).then(([tRes, bRes]) => {
      if (Array.isArray(tRes.data) && tRes.data.length > 0) {
        setTenders(tRes.data)
        setSelectedTenderId(tRes.data[0].id)
      }
      if (Array.isArray(bRes.data) && bRes.data.length > 0) {
        setBidders(bRes.data)
        setSelectedBidderId(bRes.data[0].id)
      }
    })
  }, [])

  // Load collusion analysis
  useEffect(() => {
    if (!selectedTenderId) return
    axios
      .get(`/api/risk/collusion/${selectedTenderId}`)
      .then((res) => {
        if (res.data) setCollusionData(res.data)
      })
      .catch(() => {})
  }, [selectedTenderId])

  // Load document tampering analysis
  useEffect(() => {
    if (!selectedBidderId) return
    setLoading(true)
    axios
      .get(`/api/risk/documents/${selectedBidderId}`)
      .then((res) => {
        if (res.data?.documents) {
          setDocumentRisks(res.data.documents)
        } else {
          setDocumentRisks([])
        }
      })
      .catch(() => setDocumentRisks([]))
      .finally(() => setLoading(false))
  }, [selectedBidderId])

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Procurement Risk &amp; Cartel Intelligence Radar
            </h1>
            <p className="text-xs text-slate-500">
              Decision-support indicators: synchronized bid submissions, price clustering, and document tampering risk analysis.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Tender:</span>
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
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Judicial &amp; Compliance Rule:</strong> Statistical indicators displayed here represent <em>"Potential Collusion Indicators"</em> for committee decision-support only. Under Indian law and GeM guidelines, indicators do not constitute definitive proof of fraud without comprehensive vigilance inquiry.
          </div>
        </div>

        {/* Cartel & Collusion Risk Section */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Phase 12: Bidder Relationship &amp; Collusion Correlation
                </h2>
                <p className="text-[11px] text-slate-500">
                  Cross-checks submission timestamps, evaluated pricing margins, and shared contact data.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Overall Collusion Risk:</span>
              <span
                className={`px-3 py-1 rounded font-bold uppercase text-xs ${
                  collusionData?.overall_risk === 'HIGH'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : collusionData?.overall_risk === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {collusionData?.overall_risk || 'LOW'} RISK
              </span>
            </div>
          </div>

          {/* Network Visualization Nodes Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(collusionData?.nodes || []).map((node: any) => (
              <div
                key={node.id}
                className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{node.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        node.risk === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : node.risk === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {node.risk}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1">
                    GeM ID: {node.gem_seller_id}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  Relationships detected: {(collusionData?.edges || []).filter((e: any) => e.source === node.id || e.target === node.id).length}
                </div>
              </div>
            ))}
          </div>

          {/* Detected Indicators List */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Detected Correlation Indicators ({collusionData?.indicators?.length || 0})
            </h3>
            {collusionData?.indicators?.length === 0 ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded text-xs">
                ✓ Zero suspicious submission timing or pricing synchronization detected between bidders.
              </div>
            ) : (
              <div className="space-y-2">
                {collusionData?.indicators?.map((ind: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded mr-2">
                        {ind.type}
                      </span>
                      {ind.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document Quality & Tampering Risk Radar */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-[#1f5faf]" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Phase 8: Document Quality &amp; Tampering Risk Radar
                </h2>
                <p className="text-[11px] text-slate-500">
                  Readability, OCR clarity, structural validity, and certificate expiry checks.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Select Bidder:</span>
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

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Quality Status</th>
                  <th className="py-3 px-4">Tampering Risk</th>
                  <th className="py-3 px-4">Detected Findings</th>
                  <th className="py-3 px-4 text-right">Committee Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      Analyzing documents...
                    </td>
                  </tr>
                ) : documentRisks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500">
                      No documents found for this bidder.
                    </td>
                  </tr>
                ) : (
                  documentRisks.map((d) => (
                    <tr key={d.document_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold uppercase text-[#1f5faf]">
                        {d.document_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {d.original_filename}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">V{d.current_version}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            d.quality_status === 'READABLE'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {d.quality_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                            d.tampering_risk === 'LOW'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.tampering_risk === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.tampering_risk} RISK
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {(d.tampering_indicators || []).length > 0 ? (
                          <div className="space-y-1">
                            {d.tampering_indicators.map((ind: string, idx: number) => (
                              <div key={idx} className="text-[11px] text-amber-800 flex items-start gap-1">
                                <span>•</span> {ind}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-medium">✓ No anomalies detected</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {d.needs_review ? (
                          <span className="text-amber-800 font-bold text-[11px] bg-amber-100 px-2 py-0.5 rounded">
                            Action Needed
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Clear</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
