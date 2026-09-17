import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, LayoutDashboard, Lock, Building2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/roles'
import Button from '../components/ui/Button'

/**
 * 403 Access Restricted
 * Government of India / CPCL Institutional Authorization Gate
 */
export default function Unauthorized() {
  const { user } = useAuth()
  return (
    <Layout>
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center py-16 text-center">
        {/* Institutional Monogram Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[6px] border border-red-200 bg-red-50 text-gov-danger shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-[4px] bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-gov-danger border border-red-200">
          <Lock className="h-3 w-3" />
          HTTP 403 ? STATUTORY ACCESS RESTRICTED
        </div>

        <h1 className="mt-3 text-xl font-bold tracking-tight text-gov-navy">
          Statutory Authorization Required
        </h1>

        <p className="mt-2 text-xs text-gov-muted max-w-md leading-relaxed">
          This administrative control domain is strictly restricted to authorized platform administrators under CPCL e-Procurement Security Guidelines.
        </p>

        <div className="mt-5 w-full rounded-[6px] border border-gov-border bg-white p-4 text-left shadow-xs">
          <div className="flex items-center justify-between text-xs border-b border-gov-border pb-2.5 mb-2.5">
            <span className="text-gov-muted uppercase font-bold text-[10px] tracking-wider">Current Authenticated Session</span>
            <span className="font-mono text-[11px] text-gov-navy">{user?.email || 'Unidentified'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gov-muted uppercase font-bold text-[10px] tracking-wider">Assigned Role Privilege</span>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-gov-navy text-white rounded-[3px]">
              {user ? ROLE_LABELS[user.role] : 'Unknown'}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/dashboard">
            <Button leftIcon={<LayoutDashboard className="h-4 w-4" />}>
              Return to Control Room
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-[6px] border border-gov-border bg-white px-4 py-2 text-xs font-semibold text-gov-navy transition-colors hover:bg-slate-50 shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous Screen
          </button>
        </div>

        <p className="mt-8 text-[11px] text-gov-muted font-mono">
          CPCL Materials & Procurement Directorate ? Audit Event Logged
        </p>
      </div>
    </Layout>
  )
}
