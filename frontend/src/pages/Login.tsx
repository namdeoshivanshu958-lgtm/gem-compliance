import { useState, FormEvent } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  FileCheck2,
  ScanSearch,
  Building2,
  Landmark,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button, Input, FormField, Alert, Spinner } from '../components/ui'
import { getErrorMessage } from '../lib/errors'

const HIGHLIGHTS = [
  {
    icon: ScanSearch,
    title: 'Automated Requirement Extraction',
    text: 'Machine analysis of complex GeM tender notice PDFs and multi-document bidder packages.',
  },
  {
    icon: Landmark,
    title: 'Statutory Registry Cross-Verification',
    text: 'Real-time deterministic verification across GSTN, Udyam MSME, MCA21, EPFO, and BIS repositories.',
  },
  {
    icon: ShieldCheck,
    title: 'Cryptographic SHA-256 Ledger',
    text: 'Immutable audit trail and Merkle root sealing for all compliance decisions under GFR 2017.',
  },
]

export default function Login() {
  const [email, setEmail] = useState('admin@cpcl.gem')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard'

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA]">
        <Spinner size={28} label="Verifying session credentials?" />
      </div>
    )
  }
  if (isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Authentication failed. Please verify official credentials.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      {/* Tricolor National Government Strip */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808]" />

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left Brand Panel */}
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-sidebar-gradient p-12 text-white lg:flex border-r border-[#163A63]/50">
          <div className="pointer-events-none absolute inset-0 institutional-grid opacity-10" aria-hidden="true" />

          {/* Institutional Identification */}
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-[6px] bg-[#1F5FAF] text-white font-black text-sm tracking-wider border border-white/20 shadow-sm">
                CPCL
              </div>
              <div className="leading-tight">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  ???? ????? ? Ministry of Petroleum &amp; Natural Gas
                </p>
                <p className="text-sm font-bold text-white tracking-wide">
                  Chennai Petroleum Corporation Limited
                </p>
              </div>
            </div>
          </div>

          <div className="relative max-w-lg my-auto py-8">
            <div className="inline-flex items-center gap-2 rounded-[4px] bg-[#1F5FAF]/20 border border-[#1F5FAF]/40 px-2.5 py-1 text-xs font-semibold text-blue-200 mb-4">
              <Lock className="h-3 w-3" />
              Official Government Procurement Enclave
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
              GeM Compliance &amp; Bidder Verification Platform
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-slate-300">
              A national-scale digital infrastructure designed for automated tender clause extraction, statutory registry cross-examination, and audit-ready procurement governance.
            </p>

            <div className="mt-8 space-y-4">
              {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3.5 rounded-[6px] bg-white/[0.04] border border-white/10 p-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-[#1F5FAF] text-white">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative border-t border-white/10 pt-4 flex items-center justify-between text-[11px] text-slate-400">
            <span>Smart India Hackathon 2026 ? Problem Statement PS 26100</span>
            <span className="font-mono text-emerald-400">TLS 1.3 ? SHA-256 SECURED</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2">
          <div className="mx-auto w-full max-w-sm">
            {/* Small Screen Header */}
            <div className="mb-6 flex items-center gap-2.5 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-[6px] bg-[#0B1F3A] text-white font-black text-xs">
                CPCL
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold text-[#0B1F3A] uppercase">GeM Compliance System</p>
                <p className="text-[11px] text-[#5B6878]">Chennai Petroleum Corporation Limited</p>
              </div>
            </div>

            <div className="border-b border-[#D9E1EA] pb-3 mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1F5FAF] block">
                Officer Authentication
              </span>
              <h2 className="text-xl font-bold text-[#0B1F3A]">
                Sign In to Procurement Enclave
              </h2>
              <p className="mt-1 text-xs text-[#5B6878]">
                Authorized access for CPCL procurement officers, evaluators, and auditors.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && <Alert variant="danger">{error}</Alert>}

              <FormField label="Officer Email Address" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@cpcl.gem"
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  invalid={!!error}
                  className="rounded-[6px] text-xs h-9"
                />
              </FormField>

              <FormField label="Security Password" htmlFor="password" required>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="????????"
                    leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                    invalid={!!error}
                    className="rounded-[6px] text-xs h-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              <Button
                type="submit"
                loading={isSubmitting}
                className="w-full h-10 mt-2 bg-[#1F5FAF] hover:bg-[#184B8C] text-xs font-bold uppercase tracking-wider rounded-[6px]"
              >
                Authenticate &amp; Access Enclave
              </Button>
            </form>

            {/* Demonstration Credentials Helper */}
            <div className="mt-6 rounded-[6px] border border-[#D9E1EA] bg-white p-3.5 shadow-sm text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] mb-2">
                Demonstration Credentials (SIH 2026 Evaluation)
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@cpcl.gem')
                    setPassword('admin123')
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-[#F5F7FA] flex justify-between items-center text-[#0B1F3A]"
                >
                  <span><strong>Administrator:</strong> admin@cpcl.gem</span>
                  <span className="text-[10px] text-[#1F5FAF] font-sans font-semibold">Auto-fill ?</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('evaluator@cpcl.gem')
                    setPassword('eval123')
                  }}
                  className="w-full text-left p-1.5 rounded hover:bg-[#F5F7FA] flex justify-between items-center text-[#0B1F3A]"
                >
                  <span><strong>Evaluator:</strong> evaluator@cpcl.gem</span>
                  <span className="text-[10px] text-[#1F5FAF] font-sans font-semibold">Auto-fill ?</span>
                </button>
              </div>
            </div>

            <p className="mt-4 text-center text-[11px] text-[#5B6878]">
              Unauthorized access to this portal is strictly prohibited and subject to legal prosecution under the Information Technology Act, 2000.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
