# Smart Contracts: TenderComplianceLedger

**Smart India Hackathon 2026 — Problem Statement ID 26100**
*Ministry of Petroleum & Natural Gas | Chennai Petroleum Corporation Limited (CPCL)*

This directory contains the decentralized smart contract implementation for anchoring GeM tender documents, bidder credentials, and automated compliance decisions directly onto EVM-compatible blockchains (Polygon, Ethereum Sepolia, or Private Hyperledger/Ethereum PoA consortia).

---

## 1. Smart Contract Architecture

The contract [`TenderComplianceLedger.sol`](./TenderComplianceLedger.sol) acts as a trustless, decentralized notary:

* **Proof-of-Existence (PoE) for Documents**: Every bidder credential (GSTIN certificate, PAN, MSME Udyam, audited balance sheet, OEM authorization letter) is hashed with SHA-256 upon upload. The cryptographic hash and submission block timestamp are committed on-chain. This makes it impossible for bidders or corrupted evaluators to swap documents post-deadline.
* **Non-Repudiation for Compliance Verdicts**: Once CPCL's deterministic Python compliance engine computes the final verdict (`COMPLIANT`, `NON_COMPLIANT`, or `NEEDS_REVIEW`), the verdict, compliance score, and Merkle audit hash are anchored on-chain with the evaluator's cryptographic signature.
* **Public Gasless Verification**: Anyone (Central Vigilance Commission, CAG, competing bidders, or public auditors) can call `verifyDocument(bytes32 docHash)` or `verifyComplianceVerdict(...)` for **zero gas fees** (`view` functions) to verify the validity of any procurement certificate.

---

## 2. Deployment Guide

### Option A: Remix Ethereum IDE (Quick Demo)
1. Open [https://remix.ethereum.org/](https://remix.ethereum.org/).
2. Create a new file `TenderComplianceLedger.sol` and paste the contents.
3. In **Solidity Compiler**, choose version `0.8.20+` and click **Compile**.
4. In **Deploy & Run Transactions**:
   - Environment: *Injected Provider - MetaMask* (for Polygon Amoy or Sepolia Testnet) OR *Remix VM* (for instant local simulated testing).
   - Click **Deploy**.
5. Copy the deployed contract address and update `SMART_CONTRACT_ADDRESS` in `backend/app/services/blockchain_service.py`.

### Option B: Hardhat / Foundry
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat run scripts/deploy.js --network polygonAmoy
```

---

## 3. Dual-Mode Operation in Backend

The platform backend is architected for zero external dependencies during judging demos:
1. **Simulated PoA Mode (Default)**: Automatically runs in the Python backend via cryptographic SHA-256 Merkle trees, block linking, and simulated EVM transaction receipts (`0x...`). This requires **zero setup, zero gas fees, and works completely offline**.
2. **Web3 Live Node Mode**: If an RPC endpoint (Alchemy / Infura / Polygon Amoy) and private key are supplied in `.env`, the backend will additionally dispatch transactions to the live EVM smart contract.
