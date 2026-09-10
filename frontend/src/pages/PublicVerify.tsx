import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle,
  Copy,
  ExternalLink,
  ArrowLeft,
  Lock,
  Blocks,
  FileCheck2,
  Calendar,
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Government Navigation Bar */}
      <header className="border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                CPCL GeM Public Compliance Verifier
              </h1>
              <p className="text-xs text-slate-500">
                Chennai Petroleum Corporation Limited · Smart India Hackathon 2026 (PS 26100)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/blockchain"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Blocks className="h-4 w-4 text-indigo-600" />
              Blockchain Explorer
            </Link>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Search Section */}
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-10">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 mb-3">
            <Lock className="h-3.5 w-3.5" />
            Zero-Trust Proof-of-Existence Portal
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify Procurement Integrity
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Enter any Document SHA-256 Hash, Evaluation Fingerprint, or Blockchain Transaction to independently verify authenticity.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="relative flex items-center shadow-md rounded-xl overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
            <Search className="absolute left-4 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste SHA-256 digest, EVM hash (0x...), or Bidder ID..."
              className="w-full pl-12 pr-28 py-3.5 text-sm outline-none font-mono placeholder:font-sans placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify Now'}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Examples: Try Block #0, or a document hash from the ledger</span>
            <button
              type="button"
              onClick={() => {
                setQuery('0')
                executeSearch('0')
              }}
              className="text-indigo-600 hover:underline"
            >
              Verify Genesis Block
            </button>
          </div>
        </form>

        {/* Verification Results Display */}
        {result && (
          <div className="animate-fade-in">
            {result.found ? (
              <div
                className={`rounded-2xl border p-6 shadow-md bg-white ${
                  result.tamper_detected
                    ? 'border-red-400 ring-2 ring-red-300'
                    : 'border-emerald-300 ring-1 ring-emerald-200'
                }`}
              >
                {/* Status Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div className="flex items-center gap-3">
                    {result.tamper_detected ? (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-700">
                        <ShieldAlert className="h-7 w-7" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                        <CheckCircle className="h-7 w-7" />
                      </div>
                    )}
                    <div>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                          result.tamper_detected
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {result.tamper_detected ? 'Tamper Detected' : 'Cryptographically Verified'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{result.title}</h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-mono font-bold text-indigo-700">
                      Block #{result.block_number ?? 0}
                    </span>
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-5">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Entity Type</span>
                    <span className="font-semibold text-slate-800 uppercase">{result.item_type || 'Document'}</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Attestation Issuer</span>
                    <span className="font-semibold text-slate-800">{result.issuer || 'CPCL Procurement Authority'}</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">SHA-256 Fingerprint</span>
                      <button
                        onClick={() => copyHash(result.sha256_hash || '')}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[11px]"
                      >
                        <Copy className="h-3 w-3" />
                        {copied ? 'Copied!' : 'Copy Hash'}
                      </button>
                    </div>
                    <span className="font-mono text-slate-900 font-semibold break-all text-[11px]">
                      {result.sha256_hash}
                    </span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 md:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Blockchain Transaction Anchor (EVM)
                    </span>
                    <span className="font-mono text-purple-700 font-semibold break-all text-[11px]">
                      {result.tx_hash || '0xSimulatedConsortiumTx'}
                    </span>
                  </div>
                  {result.anchored_at && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 md:col-span-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-700">
                        Anchored on-chain on: <strong>{new Date(result.anchored_at).toUTCString()}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Evidence & Breakdown Payload */}
                {result.details && Object.keys(result.details).length > 0 && (
                  <div className="mb-4">
                    <span className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Anchored Attestation Metadata
                    </span>
                    <div className="rounded-lg bg-slate-900 p-3 text-slate-200 text-xs font-mono overflow-x-auto">
                      <pre>{JSON.stringify(result.details, null, 2)}</pre>
                    </div>
                  </div>
                )}

                {/* Official Digital Stamp */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-emerald-600" />
                    <span>Protected by SHA-256 Merkle Chain</span>
                  </div>
                  <Link
                    to="/blockchain"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View in Block Explorer <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Record Not Found on Ledger</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                  No anchored document, transaction, or evaluation matching "{result.query}" was found on the CPCL blockchain ledger.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        CPCL AI-Powered GeM Compliance Platform · Smart India Hackathon 2026 · Problem Statement ID 26100
      </footer>
    </div>
  )
}
