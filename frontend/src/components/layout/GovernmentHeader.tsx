import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Lock,
  HelpCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/AuthContext'
import { useClickOutside } from '../../lib/useClickOutside'
import { ROLE_LABELS } from '../../lib/roles'
import { getDashboardStats } from '../../api/dashboard'
import type { DashboardStats } from '../../types'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'

import { useAccessibility } from '../../context/AccessibilityContext'
import type { FontSize } from '../../context/AccessibilityContext'

interface Notice {
  key: string
  label: string
  to: string
  tone: 'warning' | 'danger' | 'neutral'
  icon: typeof AlertTriangle
}

function noticesFromStats(stats: DashboardStats): Notice[] {
  const out: Notice[] = []
  const notEvaluated = Math.max(0, stats.total_bidders - stats.evaluated_bidders)
  if (stats.non_compliant_bidders > 0) {
    out.push({
      key: 'non_compliant',
      label: `${stats.non_compliant_bidders} non-compliant bidder${stats.non_compliant_bidders > 1 ? 's' : ''}`,
      to: '/compliance?status=non_compliant',
      tone: 'danger',
      icon: AlertTriangle,
    })
  }
  if (stats.needs_review_bidders > 0) {
    out.push({
      key: 'needs_review',
      label: `${stats.needs_review_bidders} bidder${stats.needs_review_bidders > 1 ? 's' : ''} need review`,
      to: '/compliance?status=needs_review',
      tone: 'warning',
      icon: Clock,
    })
  }
  if (notEvaluated > 0) {
    out.push({
      key: 'not_evaluated',
      label: `${notEvaluated} bidder${notEvaluated > 1 ? 's' : ''} not yet evaluated`,
      to: '/compliance?status=not_evaluated',
      tone: 'neutral',
      icon: Clock,
    })
  }
  return out
}

export interface GovernmentHeaderProps {
  onOpenMobile: () => void
}

export default function GovernmentHeader({ onOpenMobile }: GovernmentHeaderProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { fontSize, setFontSize, language, setLanguage, highContrast, setHighContrast, t } = useAccessibility()

  const [term, setTerm] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)

  const [notifOpen, setNotifOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[] | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  useClickOutside(notifRef, () => setNotifOpen(false), notifOpen)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = term.trim()
    navigate(q ? `/compliance?search=${encodeURIComponent(q)}` : '/compliance')
  }

  async function toggleNotifications() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next && notices === null) {
      try {
        const stats = await getDashboardStats()
        setNotices(noticesFromStats(stats))
      } catch {
        setNotices([])
      }
    }
  }

  const alertCount = notices?.length ?? 0

  return (
    <>
      {/* Tricolor National Government Strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808]" />

      {/* Top Institutional Bar */}
      <div className="border-b border-[#D9E1EA] bg-[#0B1F3A] text-white px-4 py-1.5 text-[11px] hidden md:block">
        <div className="mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors">
              <span className="font-bold text-amber-400">🏛</span>
              <span>{t('gov_india', 'भारत सरकार | Government of India')}</span>
            </Link>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300">
              {t('mopng', 'पेट्रोलियम एवं प्राकृतिक गैस मंत्रालय | Ministry of Petroleum & Natural Gas')}
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-300">
            {/* Language Switch */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
              className="px-2 py-0.5 rounded text-[10px] font-bold border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-amber-300 transition-colors"
              title="Toggle Hindi/English"
            >
              {language === 'hi' ? 'English' : 'हिंदी'}
            </button>

            {/* Accessibility Options */}
            <div className="flex items-center gap-1.5 border-r border-l border-slate-700 px-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Text:</span>
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={cn('px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-800 transition-colors', fontSize === 'normal' && 'bg-[#1F5FAF] font-bold text-white')}
                title="Default text size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={cn('px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-800 transition-colors', fontSize === 'large' && 'bg-[#1F5FAF] font-bold text-white')}
                title="Large text size"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSize('xlarge')}
                className={cn('px-1.5 py-0.5 rounded text-[10px] hover:bg-slate-800 transition-colors', fontSize === 'xlarge' && 'bg-[#1F5FAF] font-bold text-white')}
                title="Extra large text size"
              >
                A++
              </button>
              <button
                type="button"
                onClick={() => setHighContrast(!highContrast)}
                className={cn('ml-1 px-1.5 py-0.5 rounded text-[10px] border border-slate-700 hover:bg-slate-800 transition-colors', highContrast && 'bg-amber-400 font-bold text-black')}
                title="Toggle High Contrast"
              >
                Contrast
              </button>
            </div>

            {/* Help / Guidelines button */}
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <HelpCircle className="h-3 w-3 text-[#1F5FAF]" />
              Help &amp; Guidelines
            </button>

            {/* Security enclave indicator */}
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Lock className="h-3 w-3" />
              Secure Enclave • SHA-256
            </span>
          </div>
        </div>
      </div>

      {/* Main Government Header with subtle glassmorphic styling */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[#D9E1EA] glass-header px-4 lg:px-6 shadow-[0_1px_3px_rgba(11,31,58,0.04)]">
        {/* Mobile menu + brand */}
        <button
          type="button"
          onClick={onOpenMobile}
          className="rounded-[6px] p-2 text-[#5B6878] transition-colors hover:bg-slate-100 hover:text-[#0B1F3A] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/dashboard" className="flex items-center gap-2.5 lg:hidden">
          <span className="grid h-8 w-8 place-items-center rounded-[6px] bg-[#1F5FAF] text-white font-black text-xs">
            CPCL
          </span>
          <div>
            <span className="text-xs font-bold text-[#0B1F3A] uppercase block">GeM Compliance</span>
            <span className="text-[10px] text-[#5B6878] block">SIH 2026 Prototype</span>
          </div>
        </Link>

        {/* Institutional Title & Badge for Desktop */}
        <div className="hidden lg:flex flex-col justify-center min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
              Chennai Petroleum Corporation Limited (CPCL)
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-[#1F5FAF]">
              GeM Procurement Compliance System
            </span>
          </div>
          <p className="text-[11px] text-[#5B6878] truncate">
            Automated Bidder Verification &amp; Statutory Compliance Enclave
          </p>
        </div>

        {/* Global search */}
        <form onSubmit={submitSearch} className="hidden max-w-sm flex-1 md:block ml-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search bidders by company or GeM seller ID..."
              aria-label="Search bidders"
              className="h-8 w-full rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] pl-8 pr-3 text-xs text-[#172033] placeholder:text-slate-400 transition-colors hover:border-slate-400 focus:border-[#1F5FAF] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1F5FAF]"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {/* Notifications Panel */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative rounded-[6px] p-2 text-[#5B6878] transition-colors hover:bg-slate-100 hover:text-[#0B1F3A]"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <Bell className="h-4 w-4" />
              {alertCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#C63D3D] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C63D3D]" />
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 animate-scale-in overflow-hidden rounded-[8px] border border-[#D9E1EA] bg-white/95 backdrop-blur-[12px] shadow-elevated z-50">
                <div className="flex items-center justify-between border-b border-[#D9E1EA] px-4 py-2.5 bg-[#F5F7FA]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">Verification Action Items</p>
                  {notices ? (
                    <Badge tone={alertCount ? 'warning' : 'success'} size="sm">{alertCount}</Badge>
                  ) : null}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notices === null ? (
                    <div className="space-y-2 p-4">
                      <div className="h-4 w-full skeleton rounded" />
                      <div className="h-4 w-2/3 skeleton rounded" />
                    </div>
                  ) : notices.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                      <CheckCircle2 className="h-7 w-7 text-[#16845B]" />
                      <p className="text-xs font-semibold text-[#172033]">All submissions verified</p>
                      <p className="text-[11px] text-[#5B6878]">
                        No non-compliant bidders currently flagged.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#D9E1EA]">
                      {notices.map((n) => {
                        const Icon = n.icon
                        return (
                          <li key={n.key}>
                            <Link
                              to={n.to}
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50 text-xs"
                            >
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px]',
                                  n.tone === 'danger' && 'bg-[#FDF3F3] text-[#C63D3D]',
                                  n.tone === 'warning' && 'bg-[#FEF9EC] text-[#C98200]',
                                  n.tone === 'neutral' && 'bg-slate-100 text-slate-500',
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="text-[#172033] font-medium">{n.label}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className="border-t border-[#D9E1EA] bg-[#F5F7FA] px-4 py-2 text-center">
                  <Link
                    to="/compliance"
                    onClick={() => setNotifOpen(false)}
                    className="text-[11px] font-bold text-[#1F5FAF] hover:underline"
                  >
                    View Complete Compliance Registry →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User profile menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-[6px] py-1 pl-1.5 pr-2 transition-colors hover:bg-slate-100 border border-transparent hover:border-[#D9E1EA]"
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <span className="grid h-7 w-7 place-items-center rounded-[4px] bg-[#0B1F3A] text-[11px] font-bold text-white">
                {user ? user.full_name.slice(0, 1).toUpperCase() : 'O'}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-bold leading-tight text-[#172033]">
                  {user?.full_name}
                </span>
                <span className="block text-[10px] leading-tight text-[#5B6878]">
                  {user ? ROLE_LABELS[user.role] : 'Officer'}
                </span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 animate-scale-in overflow-hidden rounded-[8px] border border-[#D9E1EA] bg-white/95 backdrop-blur-[12px] shadow-elevated z-50">
                <div className="border-b border-[#D9E1EA] bg-[#F5F7FA] px-4 py-3">
                  <p className="truncate text-xs font-bold text-[#0B1F3A]">
                    {user?.full_name}
                  </p>
                  <p className="truncate text-[11px] text-[#5B6878] font-mono">{user?.email}</p>
                  <span className="mt-2 inline-flex">
                    <Badge tone="navy" size="sm">{user ? ROLE_LABELS[user.role] : 'Procurement Officer'}</Badge>
                  </span>
                </div>
                <div className="p-1 text-xs">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-[#172033] transition-colors hover:bg-slate-100 font-medium"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                    Officer Profile &amp; Credentials
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                    }}
                    className="flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2 font-medium text-[#C63D3D] transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out (End Session)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Institutional Guidelines Modal */}
      {helpOpen && (
        <Modal
          open
          onClose={() => setHelpOpen(false)}
          title="GeM Bidder Compliance Platform • Official Guidelines"
          description="Ministry of Petroleum & Natural Gas / CPCL / SIH 2026 (PS 26100)"
          icon={<HelpCircle className="h-5 w-5 text-[#1F5FAF]" />}
          size="lg"
        >
          <div className="space-y-4 text-xs text-[#172033] leading-relaxed">
            <div className="rounded-[6px] border border-[#D9E1EA] bg-[#F5F7FA] p-3.5">
              <h4 className="font-bold text-[#0B1F3A] mb-1 uppercase tracking-wider text-[11px]">
                Procurement Compliance Mandate
              </h4>
              <p>
                In accordance with General Financial Rules (GFR 2017) and GeM Procurement Guidelines, all bidder submissions must undergo rigorous cross-verification against statutory registries including GSTN, Udyam MSME, MCA21, EPFO, and BIS before tender evaluation.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#0B1F3A] mb-2 uppercase tracking-wider text-[11px]">
                Verification Workflow
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                <li><strong>Tender Ingestion:</strong> Automated requirement extraction from GeM tender notice PDFs.</li>
                <li><strong>Bidder Submission:</strong> Multi-format bidder document ingestion (GST, PAN, Audited Balance Sheets, Technical Certifications).</li>
                <li><strong>Registry Cross-Checking:</strong> Deterministic verification against mock/live government databases.</li>
                <li><strong>Immutable Recording:</strong> Cryptographic SHA-256 block ledger recording of all compliance verdicts.</li>
              </ol>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#D9E1EA]">
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="px-4 py-1.5 rounded-[6px] bg-[#0B1F3A] text-white font-semibold text-xs hover:bg-[#163A63]"
              >
                Close Guidelines
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
