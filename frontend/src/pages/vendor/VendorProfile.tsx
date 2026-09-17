import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  MapPin,
  Save,
  Check,
  KeyRound,
  FileCheck,
  BadgeCheck,
} from 'lucide-react'
import Layout from '../../components/Layout'
import {
  FormField,
  Input,
  Button,
  Alert,
  Badge,
  Spinner,
  ActionButton,
} from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { changeOwnPassword } from '../../api/users'
import { getErrorMessage } from '../../lib/errors'

export default function VendorProfile() {
  const { user } = useAuth()

  // Seller Details State
  const [profile, setProfile] = useState({
    gemSellerId: 'GEM-VD-2026-001',
    legalName: 'Apex Industrial Technologies Pvt Ltd',
    tradeName: 'Apex Industries',
    constitution: 'Private Limited Company',
    gstin: '33AAACA1234A1Z5',
    pan: 'AAACA1234A',
    udyamNumber: 'UDYAM-TN-02-0012345',
    epfoCode: 'TNMAS0012345000',
    msmeClass: 'Medium Enterprise',
    registeredEmail: user?.email || 'vendor@apex-technologies.in',
    mobileNumber: '+91 98401 23456',
    addressLine1: 'Plot No. 44, SIDCO Industrial Estate',
    addressLine2: 'Ambattur Phase III',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600058',
    bankName: 'State Bank of India',
    accountNumberMasked: '••••••••4812',
    ifsc: 'SBIN0001234',
    dscValidTill: '2027-08-31',
    dscSerial: '4F:2E:89:1A:0B:CD:EF:55',
  })

  const [isEditingContact, setIsEditingContact] = useState(false)
  const [contactSaved, setContactSaved] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [isChangingPass, setIsChangingPass] = useState(false)
  const [passError, setPassError] = useState<string | null>(null)
  const [passSuccess, setPassSuccess] = useState(false)

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    setPassError(null)
    setPassSuccess(false)

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.')
      return
    }

    setIsChangingPass(true)
    try {
      await changeOwnPassword(currentPassword, newPassword)
      setPassSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPassError(getErrorMessage(err, 'Failed to update password.'))
    } finally {
      setIsChangingPass(false)
    }
  }

  function handleSaveContact(e: FormEvent) {
    e.preventDefault()
    setIsEditingContact(false)
    setContactSaved(true)
    setTimeout(() => setContactSaved(false), 4000)
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="rounded-xl border border-gov-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gov-navy text-white shadow-md">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gov-navy">{profile.legalName}</h1>
                  <Badge tone="success" size="sm">
                    <BadgeCheck className="mr-1 h-3 w-3 inline" />
                    GeM Verified Seller
                  </Badge>
                </div>
                <p className="text-xs text-gov-muted mt-0.5">
                  GeM Seller ID: <span className="font-semibold text-gov-navy">{profile.gemSellerId}</span> • Registered Enterprise
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>DigiLocker KYC Anchored</span>
              </div>
            </div>
          </div>
        </div>

        {contactSaved && (
          <Alert variant="success" title="Profile Updated">
            Contact information updated successfully.
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Business & Statutory Identifiers */}
          <div className="space-y-6 lg:col-span-2">
            {/* Business Details Card */}
            <div className="rounded-xl border border-gov-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gov-border pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gov-blue" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gov-navy">
                    Enterprise Statutory Details
                  </h2>
                </div>
                <span className="text-[11px] text-gov-muted">Verified against MCA/GSTIN records</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">GSTIN Number</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-mono font-bold text-gov-navy">{profile.gstin}</span>
                    <Badge tone="success" size="sm">Active (01-TN)</Badge>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">Permanent Account No. (PAN)</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-mono font-bold text-gov-navy">{profile.pan}</span>
                    <Badge tone="success" size="sm">Verified</Badge>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">MSME / Udyam Reg.</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-mono font-bold text-gov-navy">{profile.udyamNumber}</span>
                    <Badge tone="info" size="sm">{profile.msmeClass}</Badge>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">EPFO Establishment Code</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-mono font-bold text-gov-navy">{profile.epfoCode}</span>
                    <Badge tone="success" size="sm">Active</Badge>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gov-muted">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  MCA Incorporation Master Data linked
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  CPCL Approved Vendor List (2025–26)
                </span>
              </div>
            </div>

            {/* Contact & Registered Address */}
            <div className="rounded-xl border border-gov-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gov-border pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gov-blue" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gov-navy">
                    Communication & Registered Office
                  </h2>
                </div>
                {!isEditingContact ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditingContact(true)}
                  >
                    Edit Contact
                  </Button>
                ) : null}
              </div>

              {isEditingContact ? (
                <form onSubmit={handleSaveContact} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Official Email" htmlFor="email" required>
                      <Input
                        id="email"
                        type="email"
                        value={profile.registeredEmail}
                        onChange={(e) => setProfile({ ...profile, registeredEmail: e.target.value })}
                        leftIcon={<Mail className="h-4 w-4 text-gov-muted" />}
                      />
                    </FormField>
                    <FormField label="Mobile Number" htmlFor="mobile" required>
                      <Input
                        id="mobile"
                        type="tel"
                        value={profile.mobileNumber}
                        onChange={(e) => setProfile({ ...profile, mobileNumber: e.target.value })}
                        leftIcon={<Phone className="h-4 w-4 text-gov-muted" />}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField label="City" htmlFor="city" required>
                      <Input
                        id="city"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      />
                    </FormField>
                    <FormField label="State" htmlFor="state" required>
                      <Input
                        id="state"
                        value={profile.state}
                        onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      />
                    </FormField>
                    <FormField label="PIN Code" htmlFor="pincode" required>
                      <Input
                        id="pincode"
                        value={profile.pincode}
                        onChange={(e) => setProfile({ ...profile, pincode: e.target.value })}
                      />
                    </FormField>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsEditingContact(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" leftIcon={<Save className="h-4 w-4" />}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div>
                    <span className="font-semibold text-gov-muted uppercase text-[10px] block mb-1">
                      Registered Corporate Address
                    </span>
                    <p className="font-medium text-gov-navy leading-relaxed">
                      {profile.addressLine1}<br />
                      {profile.addressLine2}<br />
                      {profile.city}, {profile.state} - {profile.pincode}, India
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="font-semibold text-gov-muted uppercase text-[10px] block mb-0.5">
                        Official Contact Email
                      </span>
                      <p className="font-medium text-gov-navy flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-gov-blue" />
                        {profile.registeredEmail}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-gov-muted uppercase text-[10px] block mb-0.5">
                        Authorized Phone Number
                      </span>
                      <p className="font-medium text-gov-navy flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gov-blue" />
                        {profile.mobileNumber}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bank Details for EMD / Settlements */}
            <div className="rounded-xl border border-gov-border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gov-border pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-gov-blue" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gov-navy">
                    Bank Account for EMD / Performance Security Refund
                  </h2>
                </div>
                <Badge tone="success" size="sm">e-Mandate Active</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-gov-muted uppercase text-[10px] block">Bank Name</span>
                  <p className="font-bold text-gov-navy mt-1">{profile.bankName}</p>
                </div>
                <div>
                  <span className="font-semibold text-gov-muted uppercase text-[10px] block">Account Number</span>
                  <p className="font-mono font-bold text-gov-navy mt-1">{profile.accountNumberMasked}</p>
                </div>
                <div>
                  <span className="font-semibold text-gov-muted uppercase text-[10px] block">IFSC Code</span>
                  <p className="font-mono font-bold text-gov-navy mt-1">{profile.ifsc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Security, DSC & Password Change */}
          <div className="space-y-6">
            {/* Digital Signature Card */}
            <div className="rounded-xl border border-gov-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gov-border pb-3 mb-4">
                <KeyRound className="h-4 w-4 text-gov-navy" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                  Class-3 Digital Signature (DSC)
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-gov-muted block">Token Status</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold mt-0.5">
                    <Check className="h-3.5 w-3.5" /> Valid & Registered
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gov-muted block">Valid Until</span>
                  <span className="font-semibold text-gov-navy">{profile.dscValidTill}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gov-muted block">Certificate Thumbprint</span>
                  <span className="font-mono text-[10px] text-slate-600 break-all">{profile.dscSerial}</span>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="rounded-xl border border-gov-border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 border-b border-gov-border pb-3 mb-4">
                <Lock className="h-4 w-4 text-gov-navy" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                  Account Credentials
                </h3>
              </div>

              {passSuccess && (
                <div className="mb-4">
                  <Alert variant="success" title="Success">
                    Password updated successfully.
                  </Alert>
                </div>
              )}

              {passError && (
                <div className="mb-4">
                  <Alert variant="danger" title="Error">
                    {passError}
                  </Alert>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
                <FormField label="Current Password" htmlFor="curr_pass" required>
                  <div className="relative">
                    <Input
                      id="curr_pass"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gov-muted hover:text-gov-navy"
                    >
                      {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </FormField>

                <FormField label="New Password" htmlFor="new_pass" required>
                  <div className="relative">
                    <Input
                      id="new_pass"
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gov-muted hover:text-gov-navy"
                    >
                      {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm New Password" htmlFor="confirm_pass" required>
                  <Input
                    id="confirm_pass"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </FormField>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    disabled={isChangingPass}
                  >
                    {isChangingPass ? <Spinner size={14} className="mr-1.5" /> : null}
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
