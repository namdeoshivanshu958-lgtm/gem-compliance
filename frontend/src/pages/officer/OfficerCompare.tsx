import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Scale,
  Award,
  FileText,
  DollarSign,
  TrendingDown,
  Info,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

export default function OfficerCompare() {
  const [tenders, setTenders] = useState<any[]>([])
  const [selectedTenderId, setSelectedTenderId] = useState<string>('')
  const [comparisonData, setComparisonData] = useState<any>(null)
  const [commercialData, setCommercialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!selectedTenderId) return

    setLoading(true)
    Promise.all([
      axios.get(`/api/compliance/tender/${selectedTenderId}/comparison`).catch(() => ({ data: null })),
      axios.get(`/api/commercial/tender/${selectedTenderId}/evaluation`).catch(() => ({ data: null })),
    ])
      .then(([compRes, commRes]) => {
        if (compRes?.data) setComparisonData(compRes.data)
        if (commRes?.data) setCommercialData(commRes.data)
      })
      .finally(() => setLoading(false))
  }, [selectedTenderId])

  const biddersList: any[] = comparisonData?.bidders || []
  const commercialRankings: any[] = commercialData?.rankings || []

  // Extract all unique requirements across all bidders
  const allRequirements: string[] = []
  biddersList.forEach((b) => {
    (b.requirements || []).forEach((r: any) => {
      const title = r.requirement || r.title
      if (title && !allRequirements.includes(title)) {
        allRequirements.push(title)
      }
    })
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1f5faf]" />
              Multi-Bidder Comparison &amp; Commercial L1 Evaluation
            </h1>
            <p className="text-xs text-slate-500">
              Clause-by-clause technical matrix cross-tabulation and tender-defined commercial price ranking.
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
                  {t.tender_ref_no} — {t.title.slice(0, 35)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Commercial L1 Ranking Section (Independent from technical compliance) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Phase 11: Commercial Evaluation &amp; L1 Ranking
                </h2>
                <p className="text-[11px] text-slate-500">
                  Evaluated Price = Quoted Base Price + Applicable GST + Freight. Only technically qualified bids qualify for L1.
                </p>
              </div>
            </div>
            {commercialData?.l1_bidder && (
              <span className="px-3 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Current L1: {commercialData.l1_bidder.company_name} (₹{commercialData.l1_bidder.evaluated_price.toLocaleString('en-IN')})
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Bidder Name</th>
                  <th className="py-3 px-4">Technical Status</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Taxes (18%)</th>
                  <th className="py-3 px-4">Evaluated Price</th>
                  <th className="py-3 px-4">Variance vs L1</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commercialRankings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-500">
                      No commercial bids recorded yet for this tender.
                    </td>
                  </tr>
                ) : (
                  commercialRankings.map((b) => (
                    <tr
                      key={b.bid_id || b.bidder_id}
                      className={`hover:bg-slate-50 transition-colors ${b.is_l1 ? 'bg-amber-50/40 font-semibold' : ''}`}
                    >
                      <td className="py-3 px-4 font-bold">
                        {b.is_l1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[11px] shadow-sm">
                            <Award className="w-3.5 h-3.5" /> L1
                          </span>
                        ) : b.rank && b.rank < 999 ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                            L{b.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400">DISQUALIFIED</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-bold">{b.company_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            b.is_technically_qualified
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.technical_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">₹{b.base_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">₹{b.tax_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-950">
                        ₹{b.evaluated_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        {b.is_l1 ? (
                          <span className="text-emerald-600 font-bold">Baseline (0%)</span>
                        ) : b.is_technically_qualified ? (
                          <span className="text-amber-700 font-semibold">+{b.price_variance_vs_l1_pct}%</span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded font-bold text-[10px] ${
                            b.is_technically_qualified
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {b.is_technically_qualified ? 'QUALIFIED' : 'TECH REJECTED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Multi-Bidder Clause-by-Clause Technical Matrix */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Technical Requirement Cross-Tabulation Matrix
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Compliant</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Non-Compliant</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> Needs Review</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 min-w-[240px]">Tender Requirement</th>
                  {biddersList.map((b) => (
                    <th key={b.bidder_id} className="py-3 px-4 min-w-[200px] text-center border-l border-slate-200">
                      <div className="font-bold text-slate-900">{b.company_name}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Score: {b.compliance_score?.toFixed(1)}%</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Overall Verdict Row */}
                <tr className="bg-slate-50 font-bold">
                  <td className="py-3 px-4 font-bold text-slate-900">Overall Technical Verdict</td>
                  {biddersList.map((b) => (
                    <td key={b.bidder_id} className="py-3 px-4 text-center border-l border-slate-200">
                      <span
                        className={`px-2.5 py-1 rounded font-bold uppercase text-[10px] ${
                          b.overall_status === 'compliant'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.overall_status === 'non_compliant'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {b.overall_status?.replace('_', ' ') || 'NEEDS REVIEW'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Mandatory Failures Row */}
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">Mandatory Criteria Failures</td>
                  {biddersList.map((b) => (
                    <td key={b.bidder_id} className="py-2.5 px-4 text-center border-l border-slate-200 font-mono">
                      {b.mandatory_failed ? (
                        <span className="text-rose-600 font-bold">FAIL (1 or more)</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">0 (Clean)</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Risk Level Row */}
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-700">Risk Assessment Level</td>
                  {biddersList.map((b) => (
                    <td key={b.bidder_id} className="py-2.5 px-4 text-center border-l border-slate-200">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.risk_level === 'low'
                            ? 'bg-emerald-50 text-emerald-700'
                            : b.risk_level === 'high'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {(b.risk_level || 'MEDIUM').toUpperCase()}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Clause Rows */}
                {allRequirements.map((reqTitle) => (
                  <tr key={reqTitle} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs">{reqTitle}</td>
                    {biddersList.map((b) => {
                      const match = (b.requirements || []).find(
                        (r: any) => (r.requirement || r.title) === reqTitle
                      )
                      const st = match?.status || 'NEEDS_REVIEW'

                      return (
                        <td
                          key={b.bidder_id}
                          className="py-3 px-4 text-center border-l border-slate-200 text-xs"
                        >
                          <div className="inline-flex items-center gap-1 font-semibold">
                            {st === 'COMPLIANT' && (
                              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Compliant
                              </span>
                            )}
                            {st === 'NON_COMPLIANT' && (
                              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                Non-Compliant
                              </span>
                            )}
                            {st === 'NEEDS_REVIEW' && (
                              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Needs Review
                              </span>
                            )}
                          </div>
                          {match?.reason && (
                            <div className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto truncate" title={match.reason}>
                              {match.reason}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
