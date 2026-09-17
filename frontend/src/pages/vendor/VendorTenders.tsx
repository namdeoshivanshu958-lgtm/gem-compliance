import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Building2,
  Filter,
  Eye,
  PlusCircle,
  Clock,
  Sparkles,
  X,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'

interface TenderItem {
  id: string
  tender_ref_no: string
  title: string
  department: string
  organization: string
  category: string
  procurement_mode: string
  estimated_value: number
  deadline: string
  requirements_count: number
  status: string
  requirements?: any[]
}

export default function VendorTenders() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tenders, setTenders] = useState<TenderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [selectedTender, setSelectedTender] = useState<TenderItem | null>(null)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [applyingTender, setApplyingTender] = useState<TenderItem | null>(null)
  const [companyName, setCompanyName] = useState(user?.organization_name || 'Compliant Traders Private Limited')
  const [gemSellerId, setGemSellerId] = useState('GEM-SLR-2026-0001842')
  const [contactPhone, setContactPhone] = useState('+91 98765 43210')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    axios
      .get('/api/tenders')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setTenders(res.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStartApplication = (tender: TenderItem) => {
    setApplyingTender(tender)
    setSubmitError(null)
    setApplyModalOpen(true)
  }

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyingTender) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await axios.post('/api/bidders', {
        tender_id: applyingTender.id,
        company_name: companyName,
        gem_seller_id: gemSellerId,
        contact_email: user?.email || 'vendor@cpcl.gem',
        contact_phone: contactPhone,
      })

      const newBidderId = res.data.id
      setApplyModalOpen(false)
      // Navigate directly to document upload workflow for this bidder
      navigate(`/bidders/${newBidderId}`)
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Failed to initialize bid application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = tenders.filter((t) => {
    const matchesSearch =
      t.tender_ref_no.toLowerCase().includes(search.toLowerCase()) ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.department?.toLowerCase().includes(search.toLowerCase())
    const matchesCat = categoryFilter === 'ALL' || (t.category || 'Equipment').toUpperCase() === categoryFilter
    return matchesSearch && matchesCat
  })

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#1f5faf] uppercase font-bold">
              <Building2 className="w-4 h-4" />
              Tender Discovery &amp; Eligibility Enclave
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Available Public Tenders</h1>
            <p className="text-xs text-slate-500">
              Browse published CPCL / MoPNG procurement tenders, verify eligibility criteria, and begin statutory compliance filing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">SIH 2026 Prototype</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tender reference, keyword, or equipment..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-[#1f5faf] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded px-3 py-2 bg-white font-medium focus:ring-2 focus:ring-[#1f5faf]"
            >
              <option value="ALL">All Categories</option>
              <option value="EQUIPMENT">Equipment &amp; Hardware</option>
              <option value="SERVICES">Industrial Services</option>
              <option value="SAFETY">Safety &amp; PPE</option>
              <option value="CHEMICALS">Chemicals &amp; Catalysts</option>
            </select>
          </div>
        </div>

        {/* Tenders Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-[#1f5faf] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {t.tender_ref_no}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Open for Bidding
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">{t.title}</h3>
                <p className="text-xs text-slate-500 mb-3">{t.organization || 'Chennai Petroleum Corporation Limited (CPCL)'}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-100">
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] font-bold">Category</span>
                    <span className="font-semibold text-slate-700">{t.category || 'Equipment'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] font-bold">Procurement Mode</span>
                    <span className="font-semibold text-slate-700">{t.procurement_mode || 'L1'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] font-bold">Estimated Budget</span>
                    <span className="font-semibold text-slate-700 font-mono">
                      {t.estimated_value ? `₹${(t.estimated_value / 10000000).toFixed(2)} Cr` : '₹5.00 Cr'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-[9px] font-bold">Submission Deadline</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      {t.deadline ? new Date(t.deadline).toLocaleDateString() : 'In 9 days'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 flex items-center justify-between gap-2">
                <Link
                  to={`/tenders/${t.id}`}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Clauses
                </Link>

                <button
                  type="button"
                  onClick={() => handleStartApplication(t)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Start Application
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full bg-white p-12 text-center rounded-lg border border-slate-200">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">No matching tenders found</div>
              <div className="text-xs text-slate-500 mt-0.5">Try changing search query or category filters.</div>
            </div>
          )}
        </div>

        {/* Start Application Modal */}
        {applyModalOpen && applyingTender && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded">
                    {applyingTender.tender_ref_no}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">Start Bid Application</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitError && (
                <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <form onSubmit={handleSubmitApplication} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Legal Entity Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#1f5faf]"
                    placeholder="e.g. Compliant Traders Private Limited"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GeM Seller ID</label>
                    <input
                      type="text"
                      required
                      value={gemSellerId}
                      onChange={(e) => setGemSellerId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-[#1f5faf]"
                      placeholder="GEM-SLR-XXXXX"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Authorized Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-[#1f5faf]"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-[11px] text-slate-600">
                  <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Mandatory Technical Documents Required Next:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[10px]">
                    <li>Active GST Registration Certificate (GSTIN)</li>
                    <li>Permanent Account Number (PAN Card)</li>
                    <li>Audited Annual Turnover Statement (CA Certified)</li>
                    <li>Certificate of Company Incorporation (MCA / CIN)</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded flex items-center gap-1.5 shadow"
                  >
                    {submitting ? 'Initializing...' : 'Proceed to Document Upload'}
                    <ArrowRight className="w-3.5 h-3.5" />
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
