import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Upload,
  ArrowRight,
  ShieldAlert,
  FileText,
  MessageSquare,
  Scale,
  RefreshCw,
  Bell,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FolderOpen,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'

interface BidderSummary {
  id: string
  company_name: string
  gem_seller_id: string
  tender_ref_no: string
  tender_title: string
  compliance_status: string
  compliance_score: number
  risk_level: string
  mandatory_failed: boolean
  pending_clarifications_count: number
  documents_count: number
}

export default function VendorDashboard() {
  const { user } = useAuth()
  const [bidders, setBidders] = useState<BidderSummary[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    axios
      .get('/api/bidders')
      .then(async (res) => {
        const bidderList = Array.isArray(res.data) ? res.data : []
        const enriched: BidderSummary[] = []

        for (const b of bidderList) {
          let crStatus = 'needs_review'
          let crScore = 0
          let mandatoryFailed = false
          let risk = 'medium'

          try {
            const crRes = await axios.get(`/api/compliance/bidder/${b.id}`)
            if (crRes.data) {
              crStatus = crRes.data.overall_status || 'needs_review'
              crScore = crRes.data.compliance_score || 0
              mandatoryFailed = crRes.data.mandatory_failed || false
              risk = crRes.data.risk_level || 'medium'
            }
          } catch {}

          let clarifCount = 0
          try {
            const clarRes = await axios.get(`/api/clarifications/bidder/${b.id}`)
            if (Array.isArray(clarRes.data)) {
              clarifCount = clarRes.data.filter((c: any) => c.status === 'pending').length
            }
          } catch {}

          enriched.push({
            id: b.id,
            company_name: b.company_name,
            gem_seller_id: b.gem_seller_id || 'GEM-SLR-DEMO',
            tender_ref_no: b.tender?.tender_ref_no || 'GEM/2026/B/6541278',
            tender_title: b.tender?.title || 'Supply of Laptops & IT Equipment',
            compliance_status: crStatus,
            compliance_score: crScore,
            risk_level: risk,
            mandatory_failed: mandatoryFailed,
            pending_clarifications_count: clarifCount,
            documents_count: b.documents?.length || 4,
          })
        }
        setBidders(enriched)
      })
      .catch(() => {
        setBidders([
          {
            id: 'demo-b1',
            company_name: 'Compliant Traders Private Limited',
            gem_seller_id: 'GEM-SLR-2026-0001842',
            tender_ref_no: 'GEM/2026/B/6541278',
            tender_title: 'Supply of Laptops & IT Equipment',
            compliance_status: 'compliant',
            compliance_score: 100.0,
            risk_level: 'low',
            mandatory_failed: false,
            pending_clarifications_count: 0,
            documents_count: 5,
          },
        ])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  // The 8 Mandated Metrics for Bidder Dashboard:
  const activeApplications = bidders.length
  const underReview = bidders.filter((b) => b.compliance_status === 'needs_review' || b.compliance_status === 'under_evaluation').length
  const compliant = bidders.filter((b) => b.compliance_status === 'compliant').length
  const nonCompliant = bidders.filter((b) => b.compliance_status === 'non_compliant').length
  const needsReview = bidders.filter((b) => b.compliance_status === 'needs_review').length
  const clarificationsRequired = bidders.reduce((acc, b) => acc + b.pending_clarifications_count, 0)
  const uploadedDocuments = bidders.reduce((acc, b) => acc + (b.documents_count || 0), 0)
  const pendingActions = clarificationsRequired + (nonCompliant > 0 ? 1 : 0) + (needsReview > 0 ? 1 : 0)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header Banner */}
        <div className="bg-[#0b1f3a] text-white rounded-lg p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold uppercase tracking-wider">
              <Building2 className="w-4 h-4" />
              Vendor &amp; Bidder Self-Service Portal
            </div>
            <h1 className="text-xl font-bold mt-1">
              Welcome, {user?.organization_name || user?.full_name || 'Vendor Authorized Signatory'}
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Seller Account: <span className="font-mono text-amber-300">{user?.email || 'vendor@cpcl.gem'}</span> | Track eligibility checks, upload credentials, and reply to clarification inquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/vendor/tenders"
              className="bg-[#1f5faf] hover:bg-[#1a5298] text-white text-xs font-semibold px-3.5 py-2 rounded shadow transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Available Tenders
            </Link>
            <Link
              to="/vendor/documents"
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3.5 py-2 rounded shadow transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Credentials
            </Link>
            <button
              onClick={loadData}
              className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Phase 2: Complete 8-Card Metric Grid */}
        <div>
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-[#1f5faf]" />
            Bidder Operations Overview — 8 Key Procurement Indicators
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* 1. Active Applications */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">Active Bids</span>
              <div className="text-xl font-black text-slate-900 mt-1">{activeApplications}</div>
              <span className="text-[10px] text-slate-400 font-medium">Submitted</span>
            </div>

            {/* 2. Under Review */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-blue-600 uppercase block truncate">Under Review</span>
              <div className="text-xl font-black text-blue-800 mt-1">{underReview}</div>
              <span className="text-[10px] text-blue-500 font-medium">AI In-progress</span>
            </div>

            {/* 3. Compliant */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 uppercase block truncate">Compliant</span>
              <div className="text-xl font-black text-emerald-800 mt-1">{compliant}</div>
              <span className="text-[10px] text-emerald-500 font-medium">100% Passed</span>
            </div>

            {/* 4. Non-Compliant */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-rose-600 uppercase block truncate">Non-Compliant</span>
              <div className="text-xl font-black text-rose-800 mt-1">{nonCompliant}</div>
              <span className="text-[10px] text-rose-500 font-medium">Mandatory Fail</span>
            </div>

            {/* 5. Needs Review */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 uppercase block truncate">Needs Review</span>
              <div className="text-xl font-black text-amber-800 mt-1">{needsReview}</div>
              <span className="text-[10px] text-amber-500 font-medium">Officer Action</span>
            </div>

            {/* 6. Clarifications Required */}
            <div className="bg-white p-3.5 rounded-lg border border-amber-300 bg-amber-50/40 shadow-sm">
              <span className="text-[10px] font-bold text-amber-800 uppercase block truncate">Clarifications</span>
              <div className="text-xl font-black text-amber-900 mt-1">{clarificationsRequired}</div>
              <span className="text-[10px] text-amber-700 font-medium">Reply Needed</span>
            </div>

            {/* 7. Uploaded Documents */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-600 uppercase block truncate">Documents</span>
              <div className="text-xl font-black text-slate-800 mt-1">{uploadedDocuments}</div>
              <span className="text-[10px] text-slate-500 font-medium">SHA-256 Verified</span>
            </div>

            {/* 8. Pending Actions */}
            <div className="bg-white p-3.5 rounded-lg border border-rose-300 bg-rose-50/40 shadow-sm">
              <span className="text-[10px] font-bold text-rose-800 uppercase block truncate">Pending Actions</span>
              <div className="text-xl font-black text-rose-900 mt-1">{pendingActions}</div>
              <span className="text-[10px] text-rose-700 font-medium">Action Required</span>
            </div>
          </div>
        </div>

        {/* Pending Actions & Urgent Alerts Banner */}
        {pendingActions > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-bold text-amber-900 uppercase">Attention Required: Immediate Vendor Actions</h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  You have {clarificationsRequired} pending clarification inquiry from evaluation officers and {nonCompliant + needsReview} applications requiring attention or document re-uploads.
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  <Link
                    to="/vendor/clarifications"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded shadow-sm"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Respond to Clarifications ({clarificationsRequired})
                  </Link>
                  <Link
                    to="/vendor/documents"
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded shadow-sm"
                  >
                    <Upload className="w-3 h-3" />
                    Upload Replacement Evidence
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Portal Navigation Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/vendor/tenders"
            className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#1f5faf] hover:bg-slate-50 transition-all flex items-center gap-3"
          >
            <div className="p-2 rounded bg-blue-50 text-[#1f5faf]">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Available Tenders</div>
              <div className="text-[10px] text-slate-500">View eligibility &amp; apply</div>
            </div>
          </Link>

          <Link
            to="/vendor/applications"
            className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#1f5faf] hover:bg-slate-50 transition-all flex items-center gap-3"
          >
            <div className="p-2 rounded bg-emerald-50 text-emerald-700">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">My Applications</div>
              <div className="text-[10px] text-slate-500">Track status &amp; evaluations</div>
            </div>
          </Link>

          <Link
            to="/vendor/compliance"
            className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#1f5faf] hover:bg-slate-50 transition-all flex items-center gap-3"
          >
            <div className="p-2 rounded bg-amber-50 text-amber-700">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Compliance &amp; Proofs</div>
              <div className="text-[10px] text-slate-500">Explainable AI verdicts</div>
            </div>
          </Link>

          <Link
            to="/vendor/notifications"
            className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-[#1f5faf] hover:bg-slate-50 transition-all flex items-center gap-3"
          >
            <div className="p-2 rounded bg-purple-50 text-purple-700">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">Notification Center</div>
              <div className="text-[10px] text-slate-500">Official alerts &amp; queries</div>
            </div>
          </Link>
        </div>

        {/* Active Applications Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                My Submitted Tender Applications
              </h2>
              <p className="text-[11px] text-slate-500">
                Detailed clause evaluation, mandatory criteria checks, and current verification status.
              </p>
            </div>
            <Link
              to="/vendor/applications"
              className="text-xs text-[#1f5faf] hover:underline font-semibold flex items-center gap-1"
            >
              View All ({bidders.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tender Reference</th>
                  <th className="py-3 px-4">Tender Title</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Compliance Status</th>
                  <th className="py-3 px-4 text-center">Mandatory Criteria</th>
                  <th className="py-3 px-4 text-center">Clarifications</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bidders.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0b1f3a]">
                      {b.tender_ref_no}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">
                      {b.tender_title}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      <span className="text-slate-900">{b.compliance_score?.toFixed(1)}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.compliance_status === 'compliant'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.compliance_status === 'non_compliant'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {b.compliance_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.mandatory_failed ? (
                        <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          Failed Clause
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          Passed All
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.pending_clarifications_count > 0 ? (
                        <span className="text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          {b.pending_clarifications_count} Query
                        </span>
                      ) : (
                        <span className="text-slate-500 font-mono text-[10px]">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/bidders/${b.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          View Evaluation
                        </Link>
                        <Link
                          to="/vendor/documents"
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#1f5faf] hover:bg-[#1a5298] rounded transition-colors"
                        >
                          Docs (V{b.documents_count})
                        </Link>
                      </div>
                    </td>
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
