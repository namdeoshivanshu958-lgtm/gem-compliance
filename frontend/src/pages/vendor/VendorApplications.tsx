import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Upload,
  ArrowRight,
  ShieldCheck,
  FileText,
  Search,
  ExternalLink,
  PlusCircle,
  RefreshCw,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'

interface ApplicationItem {
  id: string
  company_name: string
  gem_seller_id: string
  tender_id: string
  tender_ref_no: string
  tender_title: string
  compliance_status: string
  compliance_score: number
  risk_level: string
  mandatory_failed: boolean
  documents_count: number
  created_at: string
}

export default function VendorApplications() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const loadApplications = () => {
    setLoading(true)
    axios
      .get('/api/bidders')
      .then(async (res) => {
        const bidderList = Array.isArray(res.data) ? res.data : []
        const list: ApplicationItem[] = []

        for (const b of bidderList) {
          let st = 'needs_review'
          let sc = 0
          let mf = false
          let rk = 'medium'

          try {
            const cRes = await axios.get(`/api/compliance/bidder/${b.id}`)
            if (cRes.data) {
              st = cRes.data.overall_status || 'needs_review'
              sc = cRes.data.compliance_score || 0
              mf = cRes.data.mandatory_failed || false
              rk = cRes.data.risk_level || 'medium'
            }
          } catch {}

          list.push({
            id: b.id,
            company_name: b.company_name,
            gem_seller_id: b.gem_seller_id || 'GEM-SLR-DEMO',
            tender_id: b.tender_id,
            tender_ref_no: b.tender?.tender_ref_no || 'GEM/2026/B/6541278',
            tender_title: b.tender?.title || 'Supply of Laptops & IT Equipment',
            compliance_status: st,
            compliance_score: sc,
            risk_level: rk,
            mandatory_failed: mf,
            documents_count: b.documents?.length || 4,
            created_at: b.created_at,
          })
        }
        setApplications(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.tender_ref_no.toLowerCase().includes(search.toLowerCase()) ||
      app.tender_title.toLowerCase().includes(search.toLowerCase()) ||
      app.company_name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || app.compliance_status.toUpperCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#1f5faf] uppercase font-bold">
              <FolderOpen className="w-4 h-4" />
              Vendor Applications Console
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">My Submitted Applications</h1>
            <p className="text-xs text-slate-500">
              Manage your technical compliance bids, track clause evaluations, and view issued certificates.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/vendor/tenders"
              className="bg-[#1f5faf] hover:bg-[#1a5298] text-white text-xs font-semibold px-3.5 py-2 rounded shadow transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Apply to New Tender
            </Link>
            <button
              onClick={loadApplications}
              className="p-2 rounded bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tender ref, title, or company..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#1f5faf] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-[#1f5faf]"
            >
              <option value="ALL">All Compliance Statuses</option>
              <option value="COMPLIANT">Compliant (Passed)</option>
              <option value="NON_COMPLIANT">Non-Compliant (Failed)</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
            </select>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tender Reference</th>
                  <th className="py-3 px-4">Tender Title</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Compliance Status</th>
                  <th className="py-3 px-4 text-center">Mandatory Criteria</th>
                  <th className="py-3 px-4 text-center">Risk Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0b1f3a]">
                      {app.tender_ref_no}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                      {app.tender_title}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="text-slate-900">{app.compliance_score?.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          app.compliance_status === 'compliant'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : app.compliance_status === 'non_compliant'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {app.compliance_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {app.mandatory_failed ? (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          1 or more Failed
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          All Passed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          app.risk_level === 'low'
                            ? 'bg-emerald-50 text-emerald-700'
                            : app.risk_level === 'high'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {app.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/bidders/${app.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          Details
                        </Link>
                        <Link
                          to="/vendor/compliance"
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#0b1f3a] hover:bg-[#163a63] rounded transition-colors"
                        >
                          Matrix
                        </Link>
                        <a
                          href={`/api/reports/bidder/${app.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#1f5faf] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          PDF
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No applications found. Click "Apply to New Tender" to submit your first bid.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
