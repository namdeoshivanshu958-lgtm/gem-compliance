import apiClient from './client'

export interface BlockchainTransaction {
  tx_id: string
  tx_hash: string
  timestamp: string
  action: string
  entity_type: string
  entity_id: string
  title: string
  details?: Record<string, any>
  fingerprint?: string
  signature?: string
}

export interface BlockchainBlock {
  id: string
  block_number: number
  timestamp: string
  previous_hash: string
  block_hash: string
  merkle_root: string
  nonce: number
  transaction_count: number
  transactions: BlockchainTransaction[]
  smart_contract_tx?: string | null
  miner_address: string
  is_tampered: boolean
  tamper_note?: string | null
}

export interface BlockchainStats {
  total_blocks: number
  total_transactions: number
  latest_block_number: number
  latest_block_hash: string
  is_chain_valid: boolean
  verified_at: string
  smart_contract_address: string
  network_name: string
  consensus_algorithm: string
}

export interface IntegrityVerificationResult {
  valid: boolean
  total_blocks_checked: number
  broken_at_block?: number | null
  broken_block_hash?: string | null
  expected_hash?: string | null
  reason?: string | null
  verified_at: string
}

export interface DocumentProof {
  id: string
  document_name: string
  document_type: string
  sha256_hash: string
  entity_type: string
  entity_id: string
  file_size_bytes: number
  block_number: number
  tx_hash: string
  anchored_at: string
  status: string
  metadata?: Record<string, any>
}

export interface PublicVerificationResult {
  found: boolean
  query: string
  item_type?: string | null
  title?: string | null
  status?: string | null
  block_number?: number | null
  tx_hash?: string | null
  sha256_hash?: string | null
  previous_hash?: string | null
  anchored_at?: string | null
  issuer?: string | null
  details?: Record<string, any> | null
  tamper_detected: boolean
}

export async function getBlockchainStats(): Promise<BlockchainStats> {
  const { data } = await apiClient.get<BlockchainStats>('/blockchain/stats')
  return data
}

export async function listBlockchainBlocks(page = 1, pageSize = 10): Promise<{
  items: BlockchainBlock[]
  page: number
  page_size: number
  total: number
  total_pages: number
}> {
  const { data } = await apiClient.get('/blockchain/blocks', {
    params: { page, page_size: pageSize },
  })
  return data
}

export async function getBlockDetail(blockNumber: number): Promise<BlockchainBlock> {
  const { data } = await apiClient.get<BlockchainBlock>(`/blockchain/blocks/${blockNumber}`)
  return data
}

export async function verifyBlockchainIntegrity(): Promise<IntegrityVerificationResult> {
  const { data } = await apiClient.get<IntegrityVerificationResult>('/blockchain/verify')
  return data
}

export async function simulateTamperAttack(blockNumber?: number): Promise<any> {
  const { data } = await apiClient.post('/blockchain/simulate-tamper', null, {
    params: blockNumber !== undefined ? { block_number: blockNumber } : {},
  })
  return data
}

export async function restoreBlockchain(): Promise<{ success: boolean; restored_blocks_count: number; ledger_intact: boolean }> {
  const { data } = await apiClient.post('/blockchain/restore')
  return data
}

export async function listDocumentProofs(query?: string, page = 1, pageSize = 20): Promise<{
  items: DocumentProof[]
  page: number
  page_size: number
  total: number
  total_pages: number
}> {
  const { data } = await apiClient.get('/blockchain/proofs', {
    params: { query: query || undefined, page, page_size: pageSize },
  })
  return data
}

export async function publicVerifyHash(queryStr: string): Promise<PublicVerificationResult> {
  const { data } = await apiClient.get<PublicVerificationResult>(`/blockchain/public-verify/${encodeURIComponent(queryStr)}`)
  return data
}
