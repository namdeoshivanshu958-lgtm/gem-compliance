import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { UserCircle, Lock, Eye, EyeOff, ShieldCheck, KeyRound, CheckCircle2, UserCheck, Shield } from 'lucide-react'
import Layout from '../components/Layout'
import {
  FormField,
  Input,
  Button,
  Alert,
  Badge,
  Spinner,
  StatPanel,
  ActionButton,
} from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { changeOwnPassword } from '../api/users'
import { ROLE_LABELS } from '../lib/roles'
import { getErrorMessage } from '../lib/errors'
import { formatDate } from '../lib/format'

function CredentialRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gov-muted">{label}</dt>
      <dd className="text-xs font-semibold text-gov-navy">{children}</dd>
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  minLength?: number
}) {
  const [show, setShow] = useState(false)
  return (
    <FormField label={label} htmlFor={id} required>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          leftIcon={<Lock className="h-4 w-4 text-gov-muted" />}
          className="pr-10 border-gov-border"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gov-muted hover:text-gov-navy focus:outline-none transition-colors"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  )
}

export default function Profile() {
  const { user } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setIsSaving(true)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to change password'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="mt-16 flex justify-center">
          <Spinner size={28} label="Loading officer credentials?" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <ShieldCheck className="h-3 w-3" />
                CPCL IDENTITY ENCLAVE & RBAC
              </span>
              <span className="text-[11px] font-mono text-gov-muted">OFFICER ACCESS CONTROL</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Procurement Officer Security & Credentials
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Verify your official role delegations, statutory audit signature permissions, and manage your account authentication credentials.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Assigned Role"
          value={ROLE_LABELS[user.role] || user.role}
          subtitle="Role-Based Access Control tier"
          icon={<Shield className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Authorized"
        />
        <StatPanel
          title="Enclave Status"
          value="Active"
          subtitle="Authenticated session verified"
          icon={<CheckCircle2 className="h-4 w-4 text-gov-success" />}
          tone="success"
          badge="Verified"
        />
        <StatPanel
          title="Digital Signature"
          value="Class 3 DSC"
          subtitle="E-sign readiness enabled"
          icon={<KeyRound className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="PKI Compliant"
        />
        <StatPanel
          title="Credential Age"
          value={formatDate(user.created_at)}
          subtitle="Issuance timestamp"
          icon={<UserCheck className="h-4 w-4 text-gov-muted" />}
          tone="primary"
          badge="Active"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Officer Identity Card */}
        <div className="rounded-[8px] border border-gov-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-gov-blue" />
            <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
              Officer Identity & Access Permissions
            </span>
          </div>

          <div className="p-5">
            <dl className="divide-y divide-gov-border">
              <CredentialRow label="Officer Full Name">{user.full_name}</CredentialRow>
              <CredentialRow label="Official Government Email">
                <span className="font-mono text-xs text-gov-navy">{user.email}</span>
              </CredentialRow>
              <CredentialRow label="Statutory Role">
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-gov-navy text-white rounded-[3px]">
                  {ROLE_LABELS[user.role]}
                </span>
              </CredentialRow>
              <CredentialRow label="Organization">
                <span>Chennai Petroleum Corporation Limited (CPCL)</span>
              </CredentialRow>
              <CredentialRow label="Controlling Ministry">
                <span>Ministry of Petroleum & Natural Gas, Govt of India</span>
              </CredentialRow>
              <CredentialRow label="Account Enrolled">
                <span className="font-mono text-xs">{formatDate(user.created_at)}</span>
              </CredentialRow>
            </dl>

            <div className="mt-5 rounded-[6px] border border-slate-200 bg-slate-50 p-3 text-[11px] text-gov-muted leading-relaxed">
              <strong>Audit Notice:</strong> All tender requirement modifications, bidder document evaluations, and report generation actions performed under this identity are cryptographically logged to the CPCL immutable blockchain ledger.
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="rounded-[8px] border border-gov-border bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gov-blue" />
            <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
              Update Authentication Password
            </span>
          </div>

          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {success && (
                <Alert variant="success" onDismiss={() => setSuccess(false)}>
                  Authentication credentials updated successfully.
                </Alert>
              )}
              {error && (
                <Alert variant="danger" onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <PasswordField
                id="current_password"
                label="Current Password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
              <PasswordField
                id="new_password"
                label="New Secure Password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                minLength={6}
              />
              <PasswordField
                id="confirm_password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                minLength={6}
              />

              <div className="flex justify-end border-t border-gov-border pt-4">
                <Button type="submit" loading={isSaving} leftIcon={<KeyRound className="h-4 w-4" />}>
                  {isSaving ? 'Updating Password?' : 'Update Credentials'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
