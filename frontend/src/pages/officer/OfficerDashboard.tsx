import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Scale,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldAlert,
  Layers,
  ArrowRight,
  Database,
  BarChart3,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

interface OfficerStats {
  active_tenders: number
  total_bidders: number
  compliant_bidders: number
  needs_review: number
  non_compliant: number
  pending_clarifications: number
  high_risk_documents: number
  total_overrides: number
}

export default function OfficerDashboard() {
  const [stats, setStats] = useState<OfficerStats>({
    active_tenders: 1,
    total_bidders: 3,
    compliant_bidders: 1,
    needs_review: 1,
    non_compliant: 1,
    pending_clarifications: 1,
    high_risk_documents: 1,
    total_overrides: 0,
  })
  const [bidders, setBidders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch officer stats
    axios
      .get('/api/officer/stats')
      .then((res) => {
        if (res.data) setStats(res.data)
      })
      .catch(() => {})

    // 2. Fetch bidders queue
    axios
      .get('/api/bidders')
      .then((res) => {
        setBidders(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <Layout>
      <div className="space-y-6">
        {/* Officer Console Banner */}
        <div className="bg-[#0b1f3a] text-white rounded-lg p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <Scale className="w-4 h-4" />
              Government Procurement Officer Console
            </div>
            <h1 className="text-xl font-bold mt-1">
              Technical Evaluation &amp; Compliance Oversight
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Review AI extractions, verify deterministic rule engine verdicts, handle bidder clarifications, and manage authorized deviations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/officer/compare"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded shadow transition-colors flex items-center gap-1.5"
            >
              <BarChart3 className="w-4 h-4" />
              Bidder Comparison &amp; L1
            </Link>
            <Link
              to="/officer/decisions"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-4 py-2 rounded transition-colors"
            >
              Officer Overrides ({stats.total_overrides})
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
              <span>Active Tenders</span>
              <FileCheck2 className="w-4 h-4 text-[#1f5faf]" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.active_tenders}</div>
            <div className="text-[10px] text-slate-400 mt-1">Under technical scrutiny</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-amber-700 font-medium flex items-center justify-between">
              <span>Needs Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-600 mt-1 font-mono">{stats.needs_review}</div>
            <div className="text-[10px] text-slate-400 mt-1">Action required by committee</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-rose-700 font-medium flex items-center justify-between">
              <span>High Risk / Tampering</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{stats.high_risk_documents}</div>
            <div className="text-[10px] text-slate-400 mt-1">Flagged for visual inspection</div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-blue-700 font-medium flex items-center justify-between">
              <span>Pending Clarifications</span>
              <MessageSquare className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 mt-1 font-mono">{stats.pending_clarifications}</div>
            <div className="text-[10px] text-slate-400 mt-1">Waiting on vendor re-upload</div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/officer/compare"
            className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded bg-amber-50 text-amber-700 flex items-center justify-center mb-2 font-bold group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Multi-Bidder Comparison &amp; L1</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Side-by-side requirement matrix and commercial price ranking
            </p>
          </Link>

          <Link
            to="/officer/clarifications"
            className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded bg-blue-50 text-blue-700 flex items-center justify-center mb-2 font-bold group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Clarification Center</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Issue queries to vendors and review replacement document versions
            </p>
          </Link>

          <Link
            to="/officer/decisions"
            className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 font-bold group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Officer Decisions &amp; Deviations</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Authorized manual approvals, deviations, and blockchain anchoring
            </p>
          </Link>

          <Link
            to="/officer/risk"
            className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded bg-rose-50 text-rose-700 flex items-center justify-center mb-2 font-bold group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-slate-900">Cartel &amp; Collusion Radar</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Synchronized timing, price clustering, and document anomaly radar
            </p>
          </Link>
        </div>

        {/* Live Evaluation Queue */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Registered Bidders Review Queue</h2>
              <p className="text-xs text-slate-500">Live bidders across all active CPCL tenders</p>
            </div>
            <Link
              to="/compliance"
              className="text-xs text-[#1f5faf] font-semibold hover:underline"
            >
              Full Compliance Grid →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">GeM Seller ID</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Consistency</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Loading queue...
                    </td>
                  </tr>
                ) : (
                  bidders.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {b.company_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {b.gem_seller_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {b.contact_email || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            b.consistency_status === 'consistent'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.consistency_status === 'inconsistent'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {(b.consistency_status || 'NOT_ANALYZED').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          to={`/bidders/${b.id}`}
                          className="bg-[#0b1f3a] hover:bg-slate-800 text-white px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                        >
                          Review Bidder
                        </Link>
                        <Link
                          to={`/officer/compare`}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 py-1 rounded text-[11px] font-semibold transition-colors"
                        >
                          Compare
                        </Link>
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
