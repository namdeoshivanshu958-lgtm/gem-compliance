import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, UserPlus, FileText, Hash, Phone, Mail, ShieldCheck, ArrowLeft, Info } from 'lucide-react'
import Layout from '../components/Layout'
import {
  FormField,
  Input,
  Button,
  Alert,
  FormSection,
  ActionButton,
} from '../components/ui'
import { createBidder } from '../api/bidders'
import { getErrorMessage } from '../lib/errors'

export default function BidderCreate() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tenderId = searchParams.get('tender_id') || ''

  const [form, setForm] = useState({
    company_name: '',
    gem_seller_id: '',
    contact_email: '',
    contact_phone: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tenderId) {
      setError('No tender selected. Please return to a tender dossier and initiate bidder enrollment from there.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      const bidder = await createBidder({
        tender_id: tenderId,
        company_name: form.company_name,
        gem_seller_id: form.gem_seller_id || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
      })
      navigate(`/bidders/${bidder.id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to enroll bidder'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const biddersHref = tenderId ? `/bidders?tender_id=${tenderId}` : '/bidders'

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <ShieldCheck className="h-3 w-3" />
                BIDDER REGISTRATION ? GFR 2017 RULE 144
              </span>
              <span className="text-[11px] font-mono text-gov-muted">FORM CPCL-B-01</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Register Vendor Submission Dossier
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Enroll vendor legal identity parameters. In the following step, you will upload statutory certificates (GST, PAN, MSME, BIS) for cryptographic attestation and automated compliance evaluation.
            </p>
          </div>
          <ActionButton
            variant="outline"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate(biddersHref)}
          >
            Return to Bidders
          </ActionButton>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        {!tenderId ? (
          <Alert variant="warning" title="Tender Association Required" className="mb-6">
            A bidder submission must be registered under an active CPCL tender notice. Please select a tender first to proceed.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/tenders')}>
                Browse Active Tenders
              </Button>
            </div>
          </Alert>
        ) : (
          <div className="mb-5 rounded-[6px] border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
            <Info className="h-5 w-5 text-gov-blue flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Target Tender Enrolled: </span>
              <span className="font-mono font-semibold">{tenderId}</span>
              <p className="mt-1 text-slate-600">
                All uploaded documents and evaluations for this vendor will be cryptographically anchored under this tender's blockchain Merkle tree.
              </p>
            </div>
          </div>
        )}

        <FormSection
          title="Vendor Legal Entity & Contact Details"
          description="Enter the legal company name matching the GSTIN and MCA Certificate of Incorporation."
        >
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <Alert variant="danger" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            <FormField label="Legal Enterprise / Company Name" htmlFor="company_name" required>
              <Input
                id="company_name"
                required
                value={form.company_name}
                onChange={(e) => update('company_name', e.target.value)}
                placeholder="e.g. Larsen & Toubro Limited / ABC Engineering Pvt Ltd"
                leftIcon={<Building2 className="h-4 w-4 text-gov-muted" />}
                className="border-gov-border font-medium"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="GeM Seller ID (Government e-Marketplace)" htmlFor="gem_seller_id">
                <Input
                  id="gem_seller_id"
                  value={form.gem_seller_id}
                  onChange={(e) => update('gem_seller_id', e.target.value)}
                  placeholder="SLR000123456"
                  leftIcon={<Hash className="h-4 w-4 text-gov-muted" />}
                  className="font-mono text-xs border-gov-border"
                />
              </FormField>

              <FormField label="Authorized Representative Phone" htmlFor="contact_phone">
                <Input
                  id="contact_phone"
                  value={form.contact_phone}
                  onChange={(e) => update('contact_phone', e.target.value)}
                  placeholder="+91 98765 43210"
                  leftIcon={<Phone className="h-4 w-4 text-gov-muted" />}
                  className="border-gov-border text-xs"
                />
              </FormField>
            </div>

            <FormField label="Official Corporate Email (for Statutory Notices)" htmlFor="contact_email">
              <Input
                id="contact_email"
                type="email"
                value={form.contact_email}
                onChange={(e) => update('contact_email', e.target.value)}
                placeholder="tenders@enterprise.com"
                leftIcon={<Mail className="h-4 w-4 text-gov-muted" />}
                className="border-gov-border text-xs font-mono"
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 border-t border-gov-border pt-5">
              <Button variant="outline" type="button" onClick={() => navigate(biddersHref)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={!tenderId}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                {isSubmitting ? 'Registering Bidder?' : 'Enroll Bidder & Upload Dossier'}
              </Button>
            </div>
          </form>
        </FormSection>
      </div>
    </Layout>
  )
}
