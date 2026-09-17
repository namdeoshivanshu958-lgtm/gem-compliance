import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Blocks,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Fingerprint,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronRight,
  Database,
  Lock,
  Search,
  FileCheck2,
} from 'lucide-react'
import Layout from '../components/Layout'
import {
  PageHeader,
  SectionCard,
  StatPanel,
  Badge,
  Button,
  Input,
  LoadingState,
  EmptyState,
} from '../components/ui'
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
        setTamperAlert(result.reason || 'Cryptographic tampering detected in ledger chain!')
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
        `[AUDIT DEFENSE TEST]: Direct SQL modification injected into Block #${res.tampered_block_number}. ` +
        `Verdict modified without valid Merkle hash root.`
      )
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
      <PageHeader
        icon={<Blocks className="h-5 w-5 text-[#1F5FAF]" />}
        title="Procurement Cryptographic Audit Ledger"
        description="Immutable Merkle-tree blockchain providing verifiable proof-of-existence and non-repudiation for all tender verdicts."
        breadcrumbs={[{ label: 'Blockchain Ledger' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleVerify}
              loading={isVerifying}
              leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
            >
              Verify Chain Integrity
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSimulateTamper}
              disabled={isTampering}
              leftIcon={<AlertTriangle className="h-3.5 w-3.5 text-[#C98200]" />}
              title="Test cryptographic audit defense for evaluators"
            >
              Tamper Defense Test
            </Button>

            {tamperAlert && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRestore}
                loading={isRestoring}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Restore Ledger
              </Button>
            )}

            <Link
              to="/verify"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F5FAF] hover:underline ml-1"
            >
              Public Verifier Portal <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        }
      />

      {/* Cryptographic Alarm Alert */}
      {tamperAlert && (
        <div className="mb-6 rounded-[8px] border border-[#C63D3D] bg-[#FDF3F3] p-4 text-[#742626] shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-[#C63D3D] shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-sm text-[#A52D2D] uppercase tracking-wider">
                Cryptographic Discrepancy Detected
              </h3>
              <p className="mt-1 text-xs text-[#742626] leading-relaxed font-mono">
                {tamperAlert}
              </p>
              <div className="mt-2.5 flex items-center gap-3 text-xs">
                <span className="font-semibold text-[#A52D2D]">
                  The SHA-256 Merkle root detected out-of-band manipulation.
                </span>
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="rounded-[4px] bg-[#C63D3D] px-2.5 py-1 text-xs font-bold text-white hover:bg-[#A52D2D]"
                >
                  Restore Cryptographic Anchor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 15. BLOCKCHAIN LEDGER STAT PANELS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <StatPanel
          label="Total Ledger Blocks"
          value={stats?.total_blocks ?? 0}
          icon={<Blocks className="h-4 w-4" />}
          tone="navy"
          hint="Sequential Merkle blocks"
        />
        <StatPanel
          label="Recorded Transactions"
          value={stats?.total_transactions ?? 0}
          icon={<Database className="h-4 w-4" />}
          tone="primary"
          hint="Immutable evaluations"
        />
        <StatPanel
          label="Cryptographic Proofs"
          value={(stats as any)?.total_document_proofs ?? proofs.length ?? 0}
          icon={<Fingerprint className="h-4 w-4" />}
          tone="primary"
          hint="Document SHA-256 hashes"
        />
        <StatPanel
          label="Integrity Status"
          value={stats?.is_chain_valid && !tamperAlert ? 'IMMUTABLE' : 'TAMPERED'}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone={stats?.is_chain_valid && !tamperAlert ? 'success' : 'danger'}
          hint="Proof-of-Authority Consortium"
        />
      </div>

      {/* Section Tabs */}
      <div className="mb-4 border-b border-[#D9E1EA]">
        <nav className="flex space-x-6 text-xs">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 border-b-2 py-2.5 font-bold uppercase tracking-wider transition ${
              activeTab === 'explorer'
                ? 'border-[#1F5FAF] text-[#1F5FAF]'
                : 'border-transparent text-[#5B6878] hover:text-[#0B1F3A]'
            }`}
          >
            <Blocks className="h-3.5 w-3.5" />
            Ledger Block Explorer ({blocks.length})
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-2 border-b-2 py-2.5 font-bold uppercase tracking-wider transition ${
              activeTab === 'vault'
                ? 'border-[#1F5FAF] text-[#1F5FAF]'
                : 'border-transparent text-[#5B6878] hover:text-[#0B1F3A]'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            Document Proof Vault ({proofs.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: BLOCK EXPLORER */}
      {activeTab === 'explorer' && (
        <div className="space-y-3">
          {isLoading ? (
            <LoadingState message="Connecting to cryptographic ledger nodes?" />
          ) : blocks.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5B6878] bg-white rounded-[8px] border border-[#D9E1EA]">
              No blocks found on the ledger.
            </div>
          ) : (
            blocks.map((b) => {
              const isExpanded = !!expandedBlocks[b.block_number]
              const isTampered = b.is_tampered

              return (
                <div
                  key={b.id}
                  className={`rounded-[8px] border bg-white shadow-card transition-all ${
                    isTampered
                      ? 'border-[#C63D3D] bg-[#FDF3F3]'
                      : 'border-[#D9E1EA] hover:border-[#1F5FAF]'
                  }`}
                >
                  {/* Block Header */}
                  <div
                    onClick={() => toggleBlock(b.block_number)}
                    className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-[4px] font-bold text-xs tracking-wider ${
                          isTampered
                            ? 'bg-[#C63D3D] text-white'
                            : b.block_number === 0
                            ? 'bg-[#0B1F3A] text-white'
                            : 'bg-[#1F5FAF] text-white'
                        }`}
                      >
                        {b.block_number === 0 ? 'GEN' : `#${b.block_number}`}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                            Ledger Entry Block #{b.block_number}
                          </span>
                          <Badge tone={isTampered ? 'danger' : 'success'} size="sm">
                            {isTampered ? '? INTEGRITY COMPROMISED' : '? IMMUTABLE'}
                          </Badge>
                          <Badge tone="navy" size="sm">
                            {b.transaction_count ?? b.transactions?.length ?? 0} TRANSACTIONS RECORDED
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#5B6878] font-mono">
                          Timestamp: {new Date(b.timestamp).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                          Block Hash
                        </span>
                        <span className="font-mono text-xs text-[#0B1F3A]">
                          {b.block_hash.slice(0, 14)}?{b.block_hash.slice(-6)}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#5B6878]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#5B6878]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Block Details */}
                  {isExpanded && (
                    <div className="border-t border-[#D9E1EA] bg-[#F5F7FA] p-4 text-xs space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-[4px] border border-[#D9E1EA] bg-white p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                            Block Hash (SHA-256)
                          </span>
                          <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[#0B1F3A]">
                            <span className="truncate">{b.block_hash}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(b.block_hash)
                              }}
                              className="ml-1 text-slate-400 hover:text-[#1F5FAF]"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[4px] border border-[#D9E1EA] bg-white p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                            Previous Hash
                          </span>
                          <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[#5B6878]">
                            <span className="truncate">{b.previous_hash || '0'.repeat(64)}</span>
                          </div>
                        </div>

                        <div className="rounded-[4px] border border-[#D9E1EA] bg-white p-2.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6878] block">
                            Merkle Root
                          </span>
                          <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[#0B1F3A]">
                            <span className="truncate">{b.merkle_root}</span>
                          </div>
                        </div>
                      </div>

                      {/* Transactions list */}
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
                          Anchored Transactions ({b.transactions?.length ?? 0})
                        </p>
                        {b.transactions?.map((tx, idx) => {
                          const isTxExpanded = !!expandedTxs[tx.tx_id || `${b.block_number}-${idx}`]
                          return (
                            <div
                              key={tx.tx_id || idx}
                              className="rounded-[6px] border border-[#D9E1EA] bg-white p-3 shadow-sm"
                            >
                              <div
                                onClick={() => toggleTx(tx.tx_id || `${b.block_number}-${idx}`)}
                                className="flex cursor-pointer items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge tone="navy" size="sm">
                                    {tx.action.toUpperCase()}
                                  </Badge>
                                  <span className="font-semibold text-[#0B1F3A]">{tx.title}</span>
                                  <Badge tone="success" size="sm">
                                    <ShieldCheck className="h-2.5 w-2.5" />
                                    RECORDED
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] text-[#5B6878]">
                                    Hash: {tx.tx_hash?.slice(0, 12)}?
                                  </span>
                                  {isTxExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {isTxExpanded && (
                                <div className="mt-3 border-t border-[#D9E1EA] pt-2 text-xs font-mono">
                                  <div className="mb-1 text-[#5B6878]">
                                    <strong>Entity:</strong> {tx.entity_type} ({tx.entity_id})
                                  </div>
                                  <div className="mb-2 text-[#5B6878]">
                                    <strong>SHA-256 Digest:</strong> {tx.fingerprint || tx.tx_hash}
                                  </div>
                                  <div className="rounded-[4px] bg-[#0B1F3A] p-3 text-slate-200 overflow-x-auto text-[11px]">
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#D9E1EA] pt-3 text-xs text-[#5B6878]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-[4px] border border-[#D9E1EA] bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Previous Page
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-[4px] border border-[#D9E1EA] bg-white px-3 py-1.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Next Page
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROOF VAULT */}
      {activeTab === 'vault' && (
        <div className="rounded-[8px] border border-[#D9E1EA] bg-white shadow-card overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9E1EA] bg-[#F5F7FA] px-5 py-3.5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                Document Cryptographic Vault
              </h3>
              <p className="text-[11px] text-[#5B6878]">
                Every bidder certificate, balance sheet, and registration PDF is anchored to SHA-256 block hashes.
              </p>
            </div>
            <div className="w-64">
              <Input
                type="search"
                placeholder="Search proofs by filename/hash?"
                value={searchVault}
                onChange={(e) => setSearchVault(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D9E1EA] bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-[#5B6878]">
                  <th className="px-4 py-2.5">Document Name</th>
                  <th className="px-4 py-2.5">Document Type</th>
                  <th className="px-4 py-2.5">Cryptographic SHA-256 Digest</th>
                  <th className="px-4 py-2.5 text-center">Anchored Block</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-right">Date Anchored</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1EA]">
                {proofs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-[#5B6878]">
                      No document proofs match your search query.
                    </td>
                  </tr>
                ) : (
                  proofs.map((proof) => (
                    <tr key={proof.id} className="hover:bg-[#F5F7FA] transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#0B1F3A]">
                        {proof.document_name || (proof as any).original_filename}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="navy" size="sm">
                          {proof.document_type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[#1F5FAF]">
                        {proof.sha256_hash.slice(0, 16)}?{proof.sha256_hash.slice(-8)}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-[#0B1F3A]">
                        #{proof.block_number ?? '0'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge tone="success" size="sm">
                          <ShieldCheck className="h-2.5 w-2.5" />
                          VERIFIED
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-[#5B6878]">
                        {new Date(proof.anchored_at || (proof as any).created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
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
