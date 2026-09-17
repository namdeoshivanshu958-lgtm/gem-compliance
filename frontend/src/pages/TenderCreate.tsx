import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus2, FileText, Hash, Building2, Calendar, ArrowRight, ShieldCheck, Info } from 'lucide-react'
import Layout from '../components/Layout'
import {
  FormField,
  Input,
  Textarea,
  Button,
  Alert,
  FormSection,
  ActionButton,
} from '../components/ui'
import { createTender } from '../api/tenders'
import { getErrorMessage } from '../lib/errors'

export default function TenderCreate() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    tender_ref_no: '',
    title: '',
    department: '',
    description: '',
    tender_date: '',
    deadline: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const tender = await createTender({
        tender_ref_no: form.tender_ref_no,
        title: form.title,
        department: form.department || undefined,
        description: form.description || undefined,
        tender_date: form.tender_date ? new Date(form.tender_date).toISOString() : undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      })
      navigate(`/tenders/${tender.id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create tender'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      {/* Formal Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <ShieldCheck className="h-3 w-3" />
                PROCUREMENT NOTICE INITIATION ? GFR 2017
              </span>
              <span className="text-[11px] font-mono text-gov-muted">FORM CPCL-T-01</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Register New Procurement Tender Notice
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Enter official tender metadata. You will upload the tender specifications document (PDF) and initiate machine requirement extraction on the subsequent stage.
            </p>
          </div>
          <ActionButton
            variant="outline"
            onClick={() => navigate('/tenders')}
          >
            Cancel & Return
          </ActionButton>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Statutory guidance note */}
        <div className="mb-5 rounded-[6px] border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
          <Info className="h-5 w-5 text-gov-blue flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Statutory Note on Tender Numbering:</span> Ensure the reference number matches the official GeM Custom Bid ID (e.g. <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-blue-200">GEM/2026/B/1234567</code>) or CPCL e-Tender Portal ID to ensure automated hash verification and cross-portal tracking.
          </div>
        </div>

        <FormSection
          title="Procurement Notice Identification & Metadata"
          description="Mandatory parameters required for GFR 2017 Rule 144 compliance records."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="danger" onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Official Tender Reference No." htmlFor="tender_ref_no" required>
                <Input
                  id="tender_ref_no"
                  required
                  value={form.tender_ref_no}
                  onChange={(e) => update('tender_ref_no', e.target.value)}
                  placeholder="GEM/2026/B/7654321"
                  leftIcon={<Hash className="h-4 w-4 text-gov-muted" />}
                  className="font-mono text-xs border-gov-border"
                />
              </FormField>

              <FormField label="Procuring Department / Division" htmlFor="department">
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => update('department', e.target.value)}
                  placeholder="Materials & Procurement (CPCL Manali)"
                  leftIcon={<Building2 className="h-4 w-4 text-gov-muted" />}
                  className="border-gov-border"
                />
              </FormField>
            </div>

            <FormField label="Procurement Package Title / Scope of Work" htmlFor="title" required>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Supply, Installation, and Commissioning of Industrial High-Pressure Valves"
                className="border-gov-border font-medium"
              />
            </FormField>

            <FormField
              label="Brief Scope of Procurement / Specification Summary"
              htmlFor="description"
              hint="Optional administrative summary of goods or turnkey services being procured."
            >
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Specify general technical parameters, delivery location (e.g. CPCL Refinery Complex, Manali, Chennai), and warranty expectations?"
                className="border-gov-border text-xs"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Tender Publication Date" htmlFor="tender_date">
                <Input
                  id="tender_date"
                  type="date"
                  value={form.tender_date}
                  onChange={(e) => update('tender_date', e.target.value)}
                  leftIcon={<Calendar className="h-4 w-4 text-gov-muted" />}
                  className="border-gov-border text-xs"
                />
              </FormField>

              <FormField label="Bid Submission Deadline (IST)" htmlFor="deadline">
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => update('deadline', e.target.value)}
                  leftIcon={<Calendar className="h-4 w-4 text-gov-muted" />}
                  className="border-gov-border text-xs"
                />
              </FormField>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gov-border pt-5 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => navigate('/tenders')}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} leftIcon={<FilePlus2 className="h-4 w-4" />}>
                {isSubmitting ? 'Registering Tender?' : 'Register Tender & Proceed to Documents'}
              </Button>
            </div>
          </form>
        </FormSection>
      </div>
    </Layout>
  )
}
