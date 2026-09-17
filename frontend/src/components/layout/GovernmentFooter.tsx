import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Database, ExternalLink, Lock, CheckCircle2 } from 'lucide-react'
import { useAccessibility } from '../../context/AccessibilityContext'

export default function GovernmentFooter() {
  const { t } = useAccessibility()

  return (
    <footer className="bg-slate-900 text-slate-300 border-t-4 border-amber-600">
      {/* Top Banner with Government Trust Badges */}
      <div className="border-b border-slate-800 bg-slate-950 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Deterministic Rule Engine v2.0
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-950/80 text-blue-300 border border-blue-800/80 font-medium">
              <Database className="w-3.5 h-3.5" />
              Cryptographic SHA-256 Ledger
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-800/80 font-medium">
              <Lock className="w-3.5 h-3.5" />
              Merkle Root Non-Repudiation
            </span>
          </div>
          <div className="text-amber-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            SIH 2026 Demonstration Prototype (PS ID 26100)
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Col 1: Organization & Mission */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-white text-sm shadow">
              CPCL
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-wide">CPCL GeM Compliance</div>
              <div className="text-slate-400 text-xs">MoP&NG e-Procurement Portal</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI-assisted document understanding paired with deterministic rule-based evaluation and immutable cryptographic blockchain audit trails for GeM public procurement.
          </p>
          <div className="mt-4 p-2.5 rounded bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
            <strong>Notice:</strong> This is a Smart India Hackathon 2026 working demonstration prototype developed for Problem Statement 26100.
          </div>
        </div>

        {/* Col 2: Navigation */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider text-xs border-b border-slate-800 pb-1">
            Quick Portals
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/tenders" className="hover:text-amber-400 transition-colors">Active Tenders</Link>
            </li>
            <li>
              <Link to="/verify" className="hover:text-amber-400 transition-colors">Public Blockchain Verification</Link>
            </li>
            <li>
              <Link to="/blockchain" className="hover:text-amber-400 transition-colors">Cryptographic Audit Vault</Link>
            </li>
            <li>
              <Link to="/vendor/dashboard" className="hover:text-amber-400 transition-colors">Vendor / Bidder Portal</Link>
            </li>
            <li>
              <Link to="/officer/dashboard" className="hover:text-amber-400 transition-colors">Evaluation Officer Console</Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Government Portals Reference */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider text-xs border-b border-slate-800 pb-1">
            Government Links
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="https://gem.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                Government e-Marketplace (GeM) <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a href="https://mopng.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                Ministry of Petroleum & Natural Gas <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a href="https://cpcl.co.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                Chennai Petroleum Corporation Limited <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>
              <a href="https://www.india.gov.in" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                National Portal of India <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          </ul>
        </div>

        {/* Col 4: Platform Security */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider text-xs border-b border-slate-800 pb-1">
            Security & Compliance
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Deterministic Decision Rule Engine
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Explainable AI Evidence Extraction
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Document Tampering Risk Detection
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Consortium Blockchain (PoA Node)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Non-Repudiation Proof-of-Existence
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="bg-black/80 py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 border-t border-slate-800">
        <p>
          © 2026 Chennai Petroleum Corporation Limited (CPCL) | Smart India Hackathon 2026 - Problem Statement 26100 Prototype.
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Designed for high-trust institutional public procurement compliance verification under General Financial Rules (GFR 2017).
        </p>
      </div>
    </footer>
  )
}
