import { Sparkles, FileText, ScanSearch, Landmark, Gavel, ShieldCheck } from 'lucide-react'
import { Modal, Button } from './ui'

const STEPS = [
  {
    icon: <FileText className="h-4 w-4" />,
    title: '1. Tender is parsed',
    body: 'The uploaded GeM tender PDF is OCR\'d and read; the AI extraction service turns clauses like "minimum turnover Rs. 2 Cr" into structured, mandatory/optional requirements.',
  },
  {
    icon: <ScanSearch className="h-4 w-4" />,
    title: '2. Bidder documents are analyzed',
    body: 'Each bidder\'s GST, PAN, MCA and financial documents are classified and their fields extracted, then cross-checked against each other for identity mismatches.',
  },
  {
    icon: <Landmark className="h-4 w-4" />,
    title: '3. Government sources are cross-checked',
    body: 'GST, PAN, Udyam, MCA and blacklist registries are queried to confirm each document\'s claims are genuine and currently active.',
  },
  {
    icon: <Gavel className="h-4 w-4" />,
    title: '4. Deterministic rules decide the verdict',
    body: 'A rule engine — not the AI — combines every requirement, document and verification result into COMPLIANT / NON-COMPLIANT / NEEDS REVIEW. One failed mandatory requirement always forces NON-COMPLIANT.',
  },
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    title: '5. Explainable output for the Procurement Officer',
    body: 'Every verdict ships with a compliance score, risk level and a plain-language reason per requirement, plus an AI recommendation — the final call always stays with the officer.',
  },
]

export default function GuidedDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How the verification pipeline works"
      description="A 5-step guided walkthrough for judges and reviewers."
      icon={<Sparkles className="h-4 w-4" />}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.title} className="flex gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              {s.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{s.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
