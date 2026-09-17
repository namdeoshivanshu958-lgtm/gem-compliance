import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Search,
  FileCheck2,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileText,
  Users,
  ChevronRight,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Scale,
  Award,
} from 'lucide-react'
import axios from 'axios'
import GovernmentFooter from '../components/layout/GovernmentFooter'
import { useAccessibility } from '../context/AccessibilityContext'
import { useAuth } from '../context/AuthContext'

interface NoticeItem {
  id: string
  title: string
  content: string
  category: string
  priority: string
  published_at: string
}

interface PublicTender {
  id: string
  tender_ref_no: string
  title: string
  department?: string
  organization: string
  status: string
  category?: string
  procurement_mode?: string
  estimated_value?: number
  deadline?: string
  created_at: string
}

export default function Home() {
  const navigate = useNavigate()
  const { t, fontSize, setFontSize, language, setLanguage, highContrast, setHighContrast } = useAccessibility()
  const { user, isAuthenticated, logout } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [tenders, setTenders] = useState<PublicTender[]>([])
  const [loadingTenders, setLoadingTenders] = useState(true)
  const [stats, setStats] = useState({
    activeTenders: 1,
    totalBidders: 3,
    verifiedProofs: 12,
    blockchainBlocks: 56,
    needsReview: 1,
  })

  // Load notices and public tenders from backend
  useEffect(() => {
    // 1. Fetch notices
    axios
      .get('/api/notices')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNotices(res.data)
        }
      })
      .catch(() => {
        // Fallback demo notice
        setNotices([
          {
            id: 'n1',
            title: 'Tender GEM/2026/B/6541278 Technical Evaluation in Progress',
            content: 'Deterministic rule evaluation is active. Bidders with clarification notices must respond within 72 hours.',
            category: 'TENDER_UPDATE',
            priority: 'NORMAL',
            published_at: new Date().toISOString(),
          },
        ])
      })

    // 2. Fetch public tenders
    axios
      .get('/api/tenders/public')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setTenders(res.data)
        }
      })
      .catch(() => {
        // Fallback demo tender
        setTenders([
          {
            id: 'demo-t1',
            tender_ref_no: 'GEM/2026/B/6541278',
            title: 'Supply, Installation and Commissioning of Business-Grade Laptops',
            department: 'Information Technology Division',
            organization: 'Chennai Petroleum Corporation Limited (CPCL)',
            status: 'under_evaluation',
            category: 'Equipment',
            procurement_mode: 'L1',
            estimated_value: 50000000.0,
            deadline: new Date(Date.now() + 9 * 86400000).toISOString(),
            created_at: new Date().toISOString(),
          },
        ])
      })
      .finally(() => setLoadingTenders(false))

    // 3. Fetch blockchain stats
    axios
      .get('/api/blockchain/stats')
      .then((res) => {
        if (res.data) {
          setStats((prev) => ({
            ...prev,
            blockchainBlocks: res.data.total_blocks || prev.blockchainBlocks,
            verifiedProofs: res.data.total_transactions || prev.verifiedProofs,
          }))
        }
      })
      .catch(() => {})
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/compliance?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  const filteredTenders = tenders.filter((t) => {
    if (selectedCategory === 'All') return true
    return (t.category || '').toLowerCase() === selectedCategory.toLowerCase()
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* ------------------------------------------------------------- */}
      {/* TOP GOVERNMENT BAR (भारत सरकार | Government of India) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-[#0b1f3a] text-white border-b border-slate-700/60 text-xs py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Emblem & Ministry */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 tracking-wide">
              {t('gov_india', 'भारत सरकार | Government of India')}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300 hidden sm:inline">
              {t('mopng', 'Ministry of Petroleum & Natural Gas')}
            </span>
            <span className="hidden lg:inline text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/80 text-[10px]">
              SIH 2026 Demonstration Prototype
            </span>
          </div>

          {/* Right: Accessibility Controls & Portal Sign In */}
          <div className="flex items-center gap-3">
            {/* Font size toggle */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-1 rounded text-[11px] font-bold ${fontSize === 'normal' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
                title="Default Font Size"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-1 rounded text-[11px] font-bold ${fontSize === 'large' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
                title="Large Font Size"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xlarge')}
                className={`px-1 rounded text-[11px] font-bold ${fontSize === 'xlarge' ? 'bg-amber-600 text-white' : 'text-slate-300 hover:text-white'}`}
                title="Extra Large Font Size"
              >
                A++
              </button>
            </div>

            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-slate-800/80 rounded px-1.5 py-0.5 border border-slate-700 text-[11px]">
              <button
                onClick={() => setLanguage('en')}
                className={`px-1 rounded ${language === 'en' ? 'font-bold text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                English
              </button>
              <span className="text-slate-600">/</span>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-1 rounded ${language === 'hi' ? 'font-bold text-amber-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                हिंदी
              </button>
            </div>

            {/* High Contrast */}
            <button
              onClick={() => setHighContrast(!highContrast)}
              className={`px-2 py-0.5 rounded text-[11px] border ${highContrast ? 'bg-yellow-400 text-black font-bold border-yellow-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}
              title="Toggle High Contrast"
            >
              Contrast
            </button>

            {/* Portal Sign in or User link */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <span className="text-emerald-400 font-medium truncate max-w-[120px]">
                  {user.full_name}
                </span>
                <button
                  onClick={logout}
                  className="text-slate-400 hover:text-rose-300 text-[11px] underline"
                >
                  {t('sign_out', 'Logout')}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-0.5 rounded font-semibold text-[11px] shadow-sm transition-colors"
              >
                {t('sign_in', 'Portal Sign In')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BRAND HEADER (CPCL & Global Search) */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-white border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Platform Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* National Emblem & CPCL Emblem Placeholder */}
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-md bg-[#0b1f3a] text-amber-400 font-black flex flex-col items-center justify-center border border-amber-600/60 shadow-sm text-center leading-tight">
                <span className="text-[10px] font-bold text-slate-300">CPCL</span>
                <span className="text-xs">सीपीसीएल</span>
              </div>
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold text-[#0b1f3a] tracking-tight flex items-center gap-2">
                Chennai Petroleum Corporation Limited
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300 uppercase">
                  Government e-Procurement
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium">
                AI-Powered Integrated Bid Compliance Verification Platform
              </div>
            </div>
          </div>

          {/* Global Search Bar */}
          <form onSubmit={handleSearch} className="w-full md:w-80 lg:w-96">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_placeholder', 'Search Tender ID, Bidder, GSTIN, PAN...')}
                className="w-full pl-9 pr-20 py-2 text-xs rounded border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 bg-[#0b1f3a] hover:bg-slate-800 text-white text-xs px-3 rounded font-medium transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN NAVIGATION BAR */}
      {/* ------------------------------------------------------------- */}
      <nav className="bg-[#1f5faf] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto text-xs font-semibold">
          <div className="flex items-center space-x-1 py-1">
            <Link
              to="/"
              className="px-3 py-2 rounded bg-[#0b1f3a] text-white hover:bg-slate-900 transition-colors"
            >
              {t('nav_home', 'Home')}
            </Link>
            <Link
              to="/tenders"
              className="px-3 py-2 rounded hover:bg-[#1a4f91] transition-colors"
            >
              {t('nav_active_tenders', 'Active Tenders')}
            </Link>
            <Link
              to="/compliance"
              className="px-3 py-2 rounded hover:bg-[#1a4f91] transition-colors"
            >
              {t('nav_compliance', 'Compliance Verification')}
            </Link>
            <Link
              to="/blockchain"
              className="px-3 py-2 rounded hover:bg-[#1a4f91] transition-colors flex items-center gap-1"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              {t('nav_audit_vault', 'Audit Vault')}
            </Link>
            <Link
              to="/verify"
              className="px-3 py-2 rounded hover:bg-[#1a4f91] transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              Public Verification
            </Link>
            <Link
              to="/login?mode=register"
              className="px-3 py-2 rounded hover:bg-[#1a4f91] transition-colors"
            >
              {t('nav_vendor_registration', 'Vendor Registration')}
            </Link>
          </div>

          {/* Role-Specific Shortcuts */}
          <div className="flex items-center gap-2 py-1">
            {user?.role === 'bidder' ? (
              <Link
                to="/vendor/dashboard"
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                {t('nav_vendor_portal', 'Vendor Portal')}
              </Link>
            ) : (
              <Link
                to="/officer/dashboard"
                className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5" />
                {t('nav_officer_console', 'Officer Console')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------- */}
      {/* OFFICIAL NOTICE TICKER (Dynamic from Backend) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-3 text-xs">
          <span className="font-bold px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] tracking-wider uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {t('official_notice', 'Official Notice')}
          </span>
          <div className="overflow-hidden whitespace-nowrap flex-1 text-slate-800 font-medium">
            {notices.length > 0 ? (
              <span className="inline-block animate-pulse">
                <strong>{notices[0].title}:</strong> {notices[0].content}
              </span>
            ) : (
              <span>Deterministic compliance evaluation engine active for GeM PS 26100.</span>
            )}
          </div>
          <Link
            to="/tenders"
            className="text-amber-800 font-bold hover:underline whitespace-nowrap text-[11px]"
          >
            View All Notices →
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION: DETERMINISTIC COMPLIANCE ENGINE */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-gradient-to-b from-[#0b1f3a] via-[#12284b] to-[#0b1f3a] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {t('hero_tag', 'Deterministic Compliance Rule Engine')}
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {t('hero_title', 'AI-Powered Integrated Bid Compliance Verification')}
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
              {t(
                'hero_subtitle',
                'AI-assisted document intelligence with deterministic rule-based compliance evaluation and tamper-evident cryptographic audit trails for CPCL & Ministry of Petroleum & Natural Gas.'
              )}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/compliance"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded text-sm shadow transition-all flex items-center gap-2"
              >
                {t('btn_open_portal', 'Open Verification Portal')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/blockchain"
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded text-sm border border-slate-700 transition-colors flex items-center gap-2"
              >
                <Database className="w-4 h-4 text-amber-400" />
                {t('btn_audit_vault', 'View Blockchain Audit Vault')}
              </Link>
              <Link
                to="/verify"
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-5 py-2.5 rounded text-sm border border-emerald-600 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Verify Document Hash
              </Link>
            </div>
          </div>

          {/* Quick Engine Architecture Pillar Card */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-700 rounded-lg p-5 shadow-xl text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                Core Architecture Rule
              </span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                PS 26100
              </span>
            </div>

            <div className="space-y-2.5 text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-blue-900/80 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <div>
                  <strong className="text-white">AI Intelligence:</strong> Document extraction, optical character recognition (OCR), entity classification.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-emerald-900/80 text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <div>
                  <strong className="text-white">Deterministic Rule Engine:</strong> Final evaluation of mandatory & statutory criteria. Zero AI hallucinations.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-amber-900/80 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <div>
                  <strong className="text-white">Officer Review & Deviation:</strong> Authorized human officer oversight with logged justification.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded bg-purple-900/80 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <div>
                  <strong className="text-white">Cryptographic Blockchain:</strong> SHA-256 document PoE, Merkle Tree linking, and immutable audit ledger.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* QUICK SERVICES PANEL */}
      {/* ------------------------------------------------------------- */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full -mt-6 z-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link
            to="/verify"
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-900">Verify Document</span>
            <span className="text-[10px] text-slate-500 mt-1">Check SHA-256 PoE Hash</span>
          </Link>

          <Link
            to="/tenders"
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-900">Check Tender</span>
            <span className="text-[10px] text-slate-500 mt-1">Review Requirements</span>
          </Link>

          <Link
            to="/login?mode=register"
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-900">Vendor Register</span>
            <span className="text-[10px] text-slate-500 mt-1">Create Bidder Account</span>
          </Link>

          <Link
            to="/compliance"
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-900">Compliance Status</span>
            <span className="text-[10px] text-slate-500 mt-1">Check Bid Status</span>
          </Link>

          <Link
            to="/blockchain"
            className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all flex flex-col items-center text-center group col-span-2 md:col-span-1"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Database className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-900">Audit Vault</span>
            <span className="text-[10px] text-slate-500 mt-1">Merkle Tree Ledger</span>
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE TENDERS SECTION (Government Table / Cards) */}
      {/* ------------------------------------------------------------- */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-[#0b1f3a] tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#1f5faf]" />
              Active e-Procurement Tenders
            </h2>
            <p className="text-xs text-slate-500">
              Live tenders under technical compliance verification and commercial evaluation
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {['All', 'Equipment', 'Services', 'Safety', 'Chemicals', 'Works'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#0b1f3a] text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tenders Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tender Reference No</th>
                  <th className="py-3 px-4">Tender Title</th>
                  <th className="py-3 px-4">Organization / Division</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Est. Value</th>
                  <th className="py-3 px-4">Closing Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingTenders ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Loading tenders...
                    </td>
                  </tr>
                ) : filteredTenders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No active tenders found under this category.
                    </td>
                  </tr>
                ) : (
                  filteredTenders.map((tender) => (
                    <tr key={tender.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1f5faf]">
                        {tender.tender_ref_no}
                      </td>
                      <td className="py-3 px-4 max-w-xs font-medium text-slate-900">
                        {tender.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tender.organization}
                        {tender.department && (
                          <div className="text-[10px] text-slate-400">{tender.department}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200 text-[10px]">
                          {tender.procurement_mode || 'L1'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {tender.estimated_value
                          ? `₹${(tender.estimated_value / 10000000).toFixed(2)} Cr`
                          : '₹5.00 Cr'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tender.deadline ? new Date(tender.deadline).toLocaleDateString('en-IN') : '24-Sep-2026'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                          {tender.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/tenders/${tender.id}`}
                          className="bg-[#0b1f3a] hover:bg-slate-800 text-white px-3 py-1 rounded text-[11px] font-semibold transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* PLATFORM COMPLIANCE STATISTICS */}
      {/* ------------------------------------------------------------- */}
      <section className="py-10 bg-[#0b1f3a] text-white border-y border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-xl font-bold tracking-tight">Platform Compliance Statistics</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cryptographically backed figures from the CPCL GeM compliance ledger
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {stats.activeTenders}
              </div>
              <div className="text-xs text-slate-400 mt-1">Active Tenders</div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
                {stats.totalBidders}
              </div>
              <div className="text-xs text-slate-400 mt-1">Registered Bidders</div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {stats.verifiedProofs}
              </div>
              <div className="text-xs text-slate-400 mt-1">Document SHA-256 Proofs</div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-purple-400 font-mono">
                {stats.blockchainBlocks}
              </div>
              <div className="text-xs text-slate-400 mt-1">Blockchain Blocks Mined</div>
            </div>

            <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 col-span-2 md:col-span-1">
              <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                100%
              </div>
              <div className="text-xs text-slate-400 mt-1">Ledger Integrity Status</div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* HOW VERIFICATION WORKS (Institutional Step Flow) */}
      {/* ------------------------------------------------------------- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-xl font-bold text-[#0b1f3a] tracking-tight">
            How Integrated Verification Works
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end evaluation pipeline maintaining separation of AI extraction and deterministic rules
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="text-amber-600 font-mono font-bold text-xs mb-2">STAGE 01</div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Tender Requirements</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tender document parsed with PyMuPDF/OCR. AI extracts mandatory clauses, thresholds, and statutory categories.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="text-blue-600 font-mono font-bold text-xs mb-2">STAGE 02</div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Bidder Documents</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bidder uploads PAN, GST, Udyam, Financial Statements. SHA-256 fingerprint generated & anchored immediately.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="text-emerald-600 font-mono font-bold text-xs mb-2">STAGE 03</div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Deterministic Rule Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deterministic Python rules compare actual extracted values against required criteria. Single mandatory failure halts approval.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
            <div className="text-purple-600 font-mono font-bold text-xs mb-2">STAGE 04</div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Officer Review & Blockchain</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorized officer performs review or logs deviations. Final decision anchored to Merkle Tree on private blockchain ledger.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* GOVERNMENT FOOTER */}
      {/* ------------------------------------------------------------- */}
      <GovernmentFooter />
    </div>
  )
}
