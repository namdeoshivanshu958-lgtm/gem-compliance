import { Link } from 'react-router-dom'
import { Users, KeyRound, ChevronRight } from 'lucide-react'
import type { User } from '../types'
import { ROLE_LABELS } from '../lib/roles'
import { Skeleton } from './ui'

/**
 * Slim admin/RBAC snapshot surfaced on the dashboard — active users and a
 * role breakdown — so the platform's biggest differentiator (real RBAC, not
 * a single admin login) is visible without leaving the dashboard.
 */
export default function AdminSnapshotWidget({
  users,
  loading,
}: {
  users: User[] | null
  loading: boolean
}) {
  const active = users?.filter((u) => u.is_active).length ?? 0
  const byRole = (users ?? []).reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-slate-200 bg-white px-5 py-3.5 shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
          <Users className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Admin snapshot</p>
          {loading ? (
            <Skeleton className="mt-1 h-4 w-24" />
          ) : (
            <p className="text-sm font-bold text-slate-900">
              {active} active user{active === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>

      {!loading && (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(byRole).map(([role, count]) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
            >
              <KeyRound className="h-3 w-3 text-slate-400" />
              {count} {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
            </span>
          ))}
        </div>
      )}

      <Link
        to="/admin/users"
        className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
      >
        Manage users & roles
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
