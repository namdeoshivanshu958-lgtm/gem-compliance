import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle,
  Copy,
  ExternalLink,
  Lock,
  Blocks,
  FileCheck2,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Hash,
  Award
} from 'lucide-react'
import { publicVerifyHash, type PublicVerificationResult } from '../api/blockchain'

export default function PublicVerify() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [result, setResult] = useState<PublicVerificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const executeSearch = async (targetQuery: string) => {
    if (!targetQuery.trim()) return
    setIsLoading(true)
    try {
      const data = await publicVerifyHash(targetQuery.trim())
      setResult(data)
    } catch (err) {
      console.error('Public verify error:', err)
      setResult({
        found: false,
        query: targetQuery,
        tamper_detected: false,
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (initialQuery) {
      executeSearch(initialQuery)
    }
  }, [initialQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearchParams({ q: query.trim() })
    executeSearch(query.trim())
  }

  const copyHash = (hashStr: string) => {
    navigator.clipboard.writeText(hashStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-gov-navy flex flex-col font-sans">
      {/* Indian National Tricolor Accent Bar */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]" title="Saffron" />
        <div className="h-full w-1/3 bg-white border-y border-slate-200" title="White" />
        <div className="h-full w-1/3 bg-[#138808]" title="India Green" />
      </div>

      {/* Top Institutional Government Header */}
      <header className="border-b border-gov-border bg-white shadow-xs">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-gov-navy text-white font-bold text-sm tracking-wider shadow-sm border border-gov-border">
              CPCL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gov-blue">
                  GOVERNMENT OF INDIA ? MINISTRY OF PETROLEUM & NATURAL GAS
                </span>
              </div>
              <h1 className="text-sm font-bold text-gov-navy leading-tight">
                Chennai Petroleum Corporation Limited ? Public Compliance Ledger
              </h1>
              <p className="text-[11px] text-gov-muted font-mono">
                Smart India Hackathon 2026 ? Problem Statement ID: 26100
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/blockchain"
              className="flex items-center gap-1.5 rounded-[4px] border border-gov-border bg-white px-3 py-1.5 text-xs font-semibold text-gov-navy hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Blocks className="h-4 w-4 text-gov-blue" />
              Blockchain Explorer
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-[4px] bg-gov-blue px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gov-navy transition-colors shadow-xs"
            >
              Officer Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Verification Interface */}
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-8">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-1.5 rounded-[4px] bg-gov-light-blue px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gov-blue border border-gov-blue/20 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            GFR 2017 Zero-Trust Proof-of-Existence Registry
          </div>
          <h2 className="text-2xl font-bold text-gov-navy tracking-tight">
            Procurement Integrity & Document Attestation Verifier
          </h2>
          <p className="mt-1.5 text-xs text-gov-muted max-w-lg mx-auto leading-relaxed">
            Enter any Document SHA-256 Hash, Evaluation Fingerprint, or Blockchain Block Number to independently verify authenticity against the CPCL immutable ledger.
          </p>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSubmit} className="mb-7">
          <div className="relative flex items-center shadow-xs rounded-[6px] overflow-hidden border border-gov-border bg-white focus-within:ring-2 focus-within:ring-gov-blue/20 focus-within:border-gov-blue">
            <Search className="absolute left-3.5 h-4 w-4 text-gov-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste SHA-256 digest, EVM hash (0x...), or Bidder ID..."
              className="w-full pl-10 pr-28 py-3 text-xs outline-none font-mono placeholder:font-sans placeholder:text-gov-muted text-gov-navy"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-1.5 rounded-[4px] bg-gov-blue px-4 py-1.5 text-xs font-semibold text-white hover:bg-gov-navy disabled:opacity-50 transition-colors shadow-xs"
            >
              {isLoading ? 'Verifying?' : 'Verify Integrity'}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-gov-muted px-1">
            <span>Query syntax: 64-char hex SHA-256, EVM Tx hash, or Block index</span>
            <button
              type="button"
              onClick={() => {
                setQuery('0')
                executeSearch('0')
              }}
              className="text-gov-blue hover:underline font-semibold"
            >
              Verify Genesis Anchor (#0)
            </button>
          </div>
        </form>

        {/* Verification Result Display */}
        {result && (
          <div className="animate-fade-in">
            {result.found ? (
              <div
                className={`rounded-[8px] border bg-white p-6 shadow-sm ${
                  result.tamper_detected
                    ? 'border-gov-danger'
                    : 'border-gov-border'
                }`}
              >
                {/* Status Bar Accent */}
                <div className={`h-1 -mx-6 -mt-6 mb-5 rounded-t-[7px] ${
                  result.tamper_detected ? 'bg-gov-danger' : 'bg-gov-success'
                }`} />

                {/* Status Header */}
                <div className="flex items-center justify-between border-b border-gov-border pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    {result.tamper_detected ? (
                      <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-red-50 text-gov-danger border border-red-200">
                        <ShieldAlert className="h-6 w-6" />
                      </div>
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-[6px] bg-emerald-50 text-gov-success border border-emerald-200">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            result.tamper_detected
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {result.tamper_detected ? 'TAMPER DETECTED / HASH MISMATCH' : 'CRYPTOGRAPHICALLY VERIFIED & VALID'}
                        </span>
                        <span className="text-[10px] font-mono text-gov-muted">GFR 2017</span>
                      </div>
                      <h3 className="text-base font-bold text-gov-navy mt-1">{result.title}</h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded-[4px] bg-gov-light-blue px-2.5 py-1 text-xs font-mono font-bold text-gov-navy border border-gov-blue/20">
                      Block #{result.block_number ?? 0}
                    </span>
                  </div>
                </div>

                {/* Certificate Details Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs mb-5">
                  <div className="rounded-[6px] border border-gov-border bg-slate-50 p-3">
                    <span className="text-gov-muted block text-[10px] uppercase font-bold tracking-wider">Entity Type</span>
                    <span className="font-semibold text-gov-navy uppercase text-xs mt-0.5 block">{result.item_type || 'Statutory Document'}</span>
                  </div>
                  <div className="rounded-[6px] border border-gov-border bg-slate-50 p-3">
                    <span className="text-gov-muted block text-[10px] uppercase font-bold tracking-wider">Attestation Authority</span>
                    <span className="font-semibold text-gov-navy text-xs mt-0.5 block">{result.issuer || 'CPCL Procurement Evaluation Authority'}</span>
                  </div>
                  <div className="rounded-[6px] border border-gov-border bg-slate-50 p-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gov-muted text-[10px] uppercase font-bold tracking-wider">Document SHA-256 Hash Digest</span>
                      <button
                        onClick={() => copyHash(result.sha256_hash || '')}
                        className="text-gov-blue hover:text-gov-navy flex items-center gap-1 text-[11px] font-semibold"
                      >
                        <Copy className="h-3 w-3" />
                        {copied ? 'Copied to Clipboard' : 'Copy Hash'}
                      </button>
                    </div>
                    <span className="font-mono text-gov-navy font-semibold break-all text-[11px] mt-1 block">
                      {result.sha256_hash}
                    </span>
                  </div>
                  <div className="rounded-[6px] border border-gov-border bg-slate-50 p-3 md:col-span-2">
                    <span className="text-gov-muted block text-[10px] uppercase font-bold tracking-wider">
                      Blockchain Transaction Anchor (EVM)
                    </span>
                    <span className="font-mono text-gov-navy font-semibold break-all text-[11px] mt-1 block">
                      {result.tx_hash || '0xCPCLConsortiumAnchorGenesis'}
                    </span>
                  </div>
                  {result.anchored_at && (
                    <div className="rounded-[6px] border border-gov-border bg-slate-50 p-3 md:col-span-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gov-muted" />
                      <span className="text-gov-navy font-mono text-[11px]">
                        Anchored on-chain: <strong>{new Date(result.anchored_at).toUTCString()}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Evidence & Metadata Payload */}
                {result.details && Object.keys(result.details).length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-gov-navy mb-1.5 block">
                      Anchored Attestation Metadata & Parameters
                    </span>
                    <div className="rounded-[6px] bg-slate-900 p-3 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {/* Official Digital Seal */}
                <div className="mt-4 pt-4 border-t border-gov-border flex items-center justify-between text-xs text-gov-muted">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-gov-success" />
                    <span>Protected by SHA-256 Merkle Chain ? Immutable Proof of Existence</span>
                  </div>
                  <Link
                    to="/blockchain"
                    className="inline-flex items-center gap-1 font-semibold text-gov-blue hover:text-gov-navy"
                  >
                    View in Block Explorer <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-[8px] border border-gov-border bg-white p-8 text-center shadow-xs">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[6px] bg-slate-100 text-gov-muted mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-gov-navy uppercase tracking-wider">Record Not Found on Ledger</h3>
                <p className="mt-1 text-xs text-gov-muted max-w-sm mx-auto">
                  No anchored document, transaction, or evaluation matching "{result.query}" was discovered on the CPCL procurement blockchain ledger.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Institutional Government Footer */}
      <footer className="border-t border-gov-border bg-white py-4 text-center text-xs text-gov-muted">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Chennai Petroleum Corporation Limited (CPCL) ? Ministry of Petroleum & Natural Gas</span>
          <span>Smart India Hackathon 2026 ? Problem Statement ID: 26100</span>
        </div>
      </footer>
    </div>
  )
}
