import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Blocks,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Fingerprint,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Database,
  Lock,
  Search,
  Zap,
} from 'lucide-react'
import Layout from '../components/Layout'
import {
  getBlockchainStats,
  listBlockchainBlocks,
  verifyBlockchainIntegrity,
  simulateTamperAttack,
  restoreBlockchain,
  listDocumentProofs,
  type BlockchainStats,
  type BlockchainBlock,
  type IntegrityVerificationResult,
  type DocumentProof,
} from '../api/blockchain'

export default function BlockchainLedger() {
  const [activeTab, setActiveTab] = useState<'explorer' | 'vault'>('explorer')
  const [stats, setStats] = useState<BlockchainStats | null>(null)
  const [blocks, setBlocks] = useState<BlockchainBlock[]>([])
  const [proofs, setProofs] = useState<DocumentProof[]>([])
  const [expandedBlocks, setExpandedBlocks] = useState<Record<number, boolean>>({})
  const [expandedTxs, setExpandedTxs] = useState<Record<string, boolean>>({})

  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isTampering, setIsTampering] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [verificationResult, setVerificationResult] = useState<IntegrityVerificationResult | null>(null)
  const [tamperAlert, setTamperAlert] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const [searchVault, setSearchVault] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [statsData, blocksData, proofsData] = await Promise.all([
        getBlockchainStats(),
        listBlockchainBlocks(page, 10),
        listDocumentProofs(searchVault, 1, 50),
      ])
      setStats(statsData)
      setBlocks(blocksData.items)
      setTotalPages(blocksData.total_pages)
      setProofs(proofsData.items)

      // Auto expand the latest block
      if (blocksData.items.length > 0 && page === 1) {
        setExpandedBlocks((prev) => ({ ...prev, [blocksData.items[0].block_number]: true }))
      }
    } catch (err) {
      console.error('Failed to load blockchain data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [page, searchVault])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const result = await verifyBlockchainIntegrity()
      setVerificationResult(result)
      if (!result.valid) {
        setTamperAlert(result.reason || 'Cryptographic tampering detected in ledger!')
      } else {
        setTamperAlert(null)
      }
      const newStats = await getBlockchainStats()
      setStats(newStats)
    } catch (err) {
      console.error('Verification error:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSimulateTamper = async () => {
    setIsTampering(true)
    try {
      const res = await simulateTamperAttack()
      setTamperAlert(
        `[ATTACK SIMULATION]: Direct SQL modification performed on Block #${res.tampered_block_number}. ` +
        `Verdict flipped to COMPLIANT without generating valid Merkle cryptographic proof.`
      )
      // Re-verify immediately to trigger visual alerts
      const verifyRes = await verifyBlockchainIntegrity()
      setVerificationResult(verifyRes)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to simulate tamper attack')
    } finally {
      setIsTampering(false)
    }
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      await restoreBlockchain()
      setTamperAlert(null)
      const verifyRes = await verifyBlockchainIntegrity()
      setVerificationResult(verifyRes)
      await loadData()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to restore ledger')
    } finally {
      setIsRestoring(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const toggleBlock = (blockNum: number) => {
    setExpandedBlocks((prev) => ({ ...prev, [blockNum]: !prev[blockNum] }))
  }

  const toggleTx = (txId: string) => {
    setExpandedTxs((prev) => ({ ...prev, [txId]: !prev[txId] }))
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
              <Blocks className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Procurement Blockchain & Merkle Ledger</h2>
              <p className="text-xs text-gray-500">
                CPCL / MoPNG · Smart India Hackathon 2026 (PS 26100) · Immutable Proof-of-Existence Registry
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <ShieldCheck className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verifying Hashes...' : 'Verify Chain Integrity'}
          </button>

          <button
            onClick={handleSimulateTamper}
            disabled={isTampering}
            title="Simulate a database attack for hackathon judges"
            className="flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
          >
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Simulate Tamper Demo
          </button>

          {tamperAlert && (
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
              Restore Ledger
            </button>
          )}

          <Link
            to="/verify"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4 text-gray-500" />
            Public Verifier
          </Link>
        </div>
      </div>

      {/* Tamper Alert Banner */}
      {tamperAlert && (
        <div className="mb-6 animate-pulse rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 shadow-md">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 text-red-600 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-red-800">SECURITY ALARM: Cryptographic Chain Broken!</h3>
              <p className="mt-1 text-xs text-red-700 leading-relaxed">{tamperAlert}</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-800">
                <span>The Merkle Root / SHA-256 seal prevents unauthorized tampering from going undetected.</span>
                <button
                  onClick={handleRestore}
                  className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                >
                  Click to Restore Original State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Success Banner */}
      {verificationResult && verificationResult.valid && !tamperAlert && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Blockchain Cryptographically Intact — 0 Tampering Detected
              </p>
              <p className="text-xs text-emerald-700">
                All {verificationResult.total_blocks_checked} blocks, Merkle trees, and SHA-256 previous-hash links match mathematical proofs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Block Height</span>
            <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              #{stats?.latest_block_number ?? 0}
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats?.total_blocks ?? 0}</p>
          <p className="mt-1 text-[11px] text-gray-400">Total verified blocks mined</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Anchored Events</span>
            <Database className="h-4 w-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats?.total_transactions ?? 0}</p>
          <p className="mt-1 text-[11px] text-gray-400">Tenders, documents & verdicts</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Consensus & Status</span>
            <Cpu className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                stats?.is_chain_valid && !tamperAlert ? 'bg-emerald-500' : 'bg-red-500 animate-ping'
              }`}
            />
            <span className="text-sm font-bold text-gray-900">
              {stats?.is_chain_valid && !tamperAlert ? '100% Valid (PoA)' : 'Tampered Block'}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-gray-400">Proof-of-Authority Consortium</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Smart Contract (EVM)</span>
            <Lock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-xs font-semibold text-gray-800 truncate" title={stats?.smart_contract_address}>
            {stats?.smart_contract_address ? `${stats.smart_contract_address.slice(0, 16)}...` : '0x742d...44e'}
          </p>
          <p className="mt-1 text-[11px] text-gray-400">Polygon / Ethereum Sepolia Ready</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'explorer'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Blocks className="h-4 w-4" />
            Block Explorer
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition ${
              activeTab === 'vault'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <Fingerprint className="h-4 w-4" />
            Document Proof Vault ({proofs.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: BLOCK EXPLORER */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : blocks.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
              No blocks found on the ledger.
            </div>
          ) : (
            blocks.map((b) => {
              const isExpanded = !!expandedBlocks[b.block_number]
              const isTampered = b.is_tampered

              return (
                <div
                  key={b.id}
                  className={`rounded-xl border transition-all ${
                    isTampered
                      ? 'border-red-400 bg-red-50/50 shadow-md ring-2 ring-red-400'
                      : 'border-gray-200 bg-white shadow-sm hover:border-indigo-300'
                  }`}
                >
                  {/* Block Header */}
                  <div
                    onClick={() => toggleBlock(b.block_number)}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg font-bold text-sm ${
                          isTampered
                            ? 'bg-red-600 text-white'
                            : b.block_number === 0
                            ? 'bg-purple-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {b.block_number === 0 ? 'GEN' : `#${b.block_number}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {b.block_number === 0 ? 'Genesis Block' : `Block #${b.block_number}`}
                          </span>
                          {isTampered && (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                              TAMPERED BLOCK
                            </span>
                          )}
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {b.transaction_count} {b.transaction_count === 1 ? 'Tx' : 'Txs'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{new Date(b.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Hashes Summary */}
                    <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
                      <div className="hidden sm:block">
                        <span className="text-gray-400">Block Hash: </span>
                        <span className="font-medium text-gray-800">{b.block_hash.slice(0, 14)}...</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 hover:text-gray-700">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Block Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-4 text-xs">
                      {/* Header details table */}
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 mb-4 rounded-lg border border-gray-200 bg-white p-3 font-mono">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Previous Block Hash</span>
                          <span className="text-gray-800 break-all">{b.previous_hash}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Merkle Root</span>
                          <span className="text-indigo-600 font-semibold break-all">{b.merkle_root}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Block Hash (SHA-256)</span>
                          <div className="flex items-center gap-1">
                            <span className="text-emerald-700 font-semibold break-all">{b.block_hash}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(b.block_hash)
                              }}
                              className="text-gray-400 hover:text-gray-700 shrink-0"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">EVM Transaction Anchor</span>
                          <span className="text-purple-600 break-all">{b.smart_contract_tx || '0xSimulated'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Authority Node / Miner</span>
                          <span className="text-gray-700 break-all">{b.miner_address}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase">Nonce / Consensus</span>
                          <span className="text-gray-700">{b.nonce} (PoA Sealed)</span>
                        </div>
                      </div>

                      {/* Transactions List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                          <span>Transactions Sealed in Block ({b.transactions?.length || 0})</span>
                        </div>

                        {b.transactions?.map((tx, idx) => {
                          const isTxExpanded = !!expandedTxs[tx.tx_id || `${b.block_number}-${idx}`]

                          return (
                            <div
                              key={tx.tx_id || idx}
                              className="rounded-lg border border-gray-200 bg-white p-3 shadow-xs"
                            >
                              <div
                                onClick={() => toggleTx(tx.tx_id || `${b.block_number}-${idx}`)}
                                className="flex cursor-pointer items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="font-semibold text-gray-900">{tx.title}</span>
                                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                                    {tx.action}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-gray-400">
                                    Tx: {tx.tx_hash?.slice(0, 10)}...
                                  </span>
                                  {isTxExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                  )}
                                </div>
                              </div>

                              {isTxExpanded && (
                                <div className="mt-3 border-t border-gray-100 pt-2 font-mono text-[11px]">
                                  <div className="mb-1 text-gray-500">
                                    <strong>Entity ID:</strong> {tx.entity_id} | <strong>Entity Type:</strong> {tx.entity_type}
                                  </div>
                                  <div className="mb-2 text-gray-500">
                                    <strong>SHA-256 Fingerprint:</strong> {tx.fingerprint || tx.tx_hash}
                                  </div>
                                  <div className="rounded bg-gray-900 p-2 text-gray-200 overflow-x-auto">
                                    <pre>{JSON.stringify(tx.details, null, 2)}</pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-xs text-gray-500">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DOCUMENT PROOF VAULT */}
      {activeTab === 'vault' && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Cryptographic Proof-of-Existence Registry</h3>
                <p className="text-xs text-gray-500">
                  Every bidder document uploaded to the platform is fingerprinted with SHA-256 and locked on-chain.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by filename or hash..."
                  value={searchVault}
                  onChange={(e) => setSearchVault(e.target.value)}
                  className="rounded-lg border border-gray-300 pl-9 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Document / Entity</th>
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium">SHA-256 Fingerprint</th>
                  <th className="px-4 py-2.5 text-left font-medium">Block Height</th>
                  <th className="px-4 py-2.5 text-left font-medium">Anchored At</th>
                  <th className="px-4 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proofs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No document proofs anchored yet. Upload documents or run the demo seeder.
                    </td>
                  </tr>
                ) : (
                  proofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">{proof.document_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 uppercase">
                          {proof.document_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">
                        <div className="flex items-center gap-1">
                          <span title={proof.sha256_hash}>{proof.sha256_hash.slice(0, 16)}...</span>
                          <button
                            onClick={() => copyToClipboard(proof.sha256_hash)}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-700">
                          Block #{proof.block_number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(proof.anchored_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/verify?q=${encodeURIComponent(proof.sha256_hash)}`}
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                        >
                          Verify <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
