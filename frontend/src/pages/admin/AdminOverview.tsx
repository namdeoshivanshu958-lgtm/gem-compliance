import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gauge,
  Users as UsersIcon,
  ShieldCheck,
  UserCog,
  Eye,
  KeyRound,
  Settings,
  ScrollText,
  Activity,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react'
import Layout from '../../components/Layout'
import {
  StatPanel,
  Progress,
  EmptyState,
  ErrorState,
  Skeleton,
  ActionButton,
} from '../../components/ui'
import { listUsers } from '../../api/users'
import { listAuditLogs } from '../../api/audit'
import type { User, UserRole, AuditLogEntry } from '../../types'
import { ROLE_LABELS } from '../../lib/roles'
import { getErrorMessage } from '../../lib/errors'
import { formatRelativeTime } from '../../lib/format'

const ROLE_ORDER: UserRole[] = ['admin', 'evaluator', 'viewer', 'bidder']

const ROLE_BAR: Record<UserRole, 'navy' | 'primary' | 'neutral'> = {
  admin: 'navy',
  evaluator: 'primary',
  viewer: 'neutral',
  bidder: 'neutral',
}

const QUICK_LINKS = [
  {
    to: '/admin/users',
    icon: UsersIcon,
    label: 'User Enrollment & RBAC',
    description: 'Create officer accounts, assign role permissions, and manage access.',
  },
  {
    to: '/admin/roles',
    icon: KeyRound,
    label: 'Statutory Roles & Matrix',
    description: 'Inspect procurement authority delegations across user roles.',
  },
  {
    to: '/admin/settings',
    icon: Settings,
    label: 'System & Service Health',
    description: 'Review connected backend APIs, OCR runtime, and database status.',
  },
  {
    to: '/audit-logs',
    icon: ScrollText,
    label: 'Compliance Audit Ledger',
    description: 'Immutable, read-only chronological trail of officer activity.',
  },
]

function humanizeAction(action: string): string {
  const s = action.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function actionTone(action: string): { bg: string; fg: string } {
  const a = action.toLowerCase()
  if (a.includes('creat')) return { bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200', fg: 'text-emerald-700' }
  if (a.includes('delet') || a.includes('deactiv') || a.includes('fail'))
    return { bg: 'bg-red-50 text-red-800 border border-red-200', fg: 'text-red-700' }
  if (a.includes('updat') || a.includes('edit') || a.includes('evaluat'))
    return { bg: 'bg-blue-50 text-gov-blue border border-blue-200', fg: 'text-gov-blue' }
  return { bg: 'bg-slate-100 text-slate-700 border border-slate-200', fg: 'text-slate-600' }
}

/** Administrator landing page ? real user + audit data, no fabricated metrics. */
export default function AdminOverview() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [usersError, setUsersError] = useState<string | null>(null)

  const [activity, setActivity] = useState<AuditLogEntry[] | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)

  function loadUsers() {
    setUsersError(null)
    setUsers(null)
    listUsers()
      .then(setUsers)
      .catch((err) => setUsersError(getErrorMessage(err)))
  }

  useEffect(() => {
    loadUsers()
    listAuditLogs({ page: 1, page_size: 6 })
      .then((res) => setActivity(res.items))
      .catch((err) => setActivityError(getErrorMessage(err)))
  }, [])

  const summary = useMemo(() => {
    if (!users) return null
    const byRole: Record<UserRole, number> = { admin: 0, evaluator: 0, viewer: 0, bidder: 0 }
    let active = 0
    users.forEach((u) => {
      byRole[u.role] += 1
      if (u.is_active) active += 1
    })
    return { total: users.length, active, inactive: users.length - active, byRole }
  }, [users])

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 rounded-[8px] border border-gov-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gov-blue bg-gov-light-blue px-2 py-0.5 rounded-[4px] border border-gov-blue/30">
                <Shield className="h-3 w-3" />
                SYSTEM ADMINISTRATION & IDENTITY CONTROL
              </span>
              <span className="text-[11px] font-mono text-gov-muted">CPCL RBAC</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-gov-navy">
              Administrative Control & Enclave Overview
            </h1>
            <p className="mt-0.5 text-xs text-gov-muted">
              Centrally manage authenticated procurement officers, role privilege delegations, system configuration, and live platform activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/users">
              <ActionButton variant="primary" icon={<UsersIcon className="h-4 w-4" />}>
                Manage User Directory
              </ActionButton>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatPanel
          title="Total Officers"
          value={summary ? summary.total : '?'}
          subtitle={summary ? `${summary.active} active ? ${summary.inactive} deactivated` : 'Loading?'}
          icon={<UsersIcon className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Enrolled"
        />
        <StatPanel
          title="Administrators"
          value={summary ? summary.byRole.admin : '?'}
          subtitle="Full platform & security privileges"
          icon={<ShieldCheck className="h-4 w-4 text-gov-navy" />}
          tone="primary"
          badge="Admin"
        />
        <StatPanel
          title="Evaluators"
          value={summary ? summary.byRole.evaluator : '?'}
          subtitle="Tender evaluation & clause approval"
          icon={<UserCog className="h-4 w-4 text-gov-blue" />}
          tone="primary"
          badge="Evaluator"
        />
        <StatPanel
          title="Auditors / Viewers"
          value={summary ? summary.byRole.viewer : '?'}
          subtitle="Read-only compliance scrutiny"
          icon={<Eye className="h-4 w-4 text-gov-muted" />}
          tone="primary"
          badge="Auditor"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="rounded-[8px] border border-gov-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gov-blue" />
                <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                  Recent Platform Audit Trail
                </span>
              </div>
              <Link
                to="/audit-logs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue hover:text-gov-navy transition-colors"
              >
                View Full Trail <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {activityError ? (
              <div className="p-4">
                <ErrorState message={activityError} compact />
              </div>
            ) : !activity ? (
              <ul className="divide-y divide-gov-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-7 w-7 rounded-[4px]" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : activity.length === 0 ? (
              <EmptyState
                compact
                icon={<Activity className="h-6 w-6 text-gov-blue" />}
                title="No activity recorded"
                description="Officer transactions will be indexed here in chronological order."
              />
            ) : (
              <ul className="divide-y divide-gov-border">
                {activity.map((e) => {
                  const tone = actionTone(e.action)
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-xs font-bold ${tone.bg}`}
                      >
                        <Activity className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gov-navy">
                          <span className="font-semibold">{humanizeAction(e.action)}</span>
                          {e.entity_type ? (
                            <span className="text-gov-muted font-mono"> ? {e.entity_type}</span>
                          ) : null}
                        </p>
                        <p className="truncate text-[11px] text-gov-muted">{e.user_name ?? 'Automated System'}</p>
                      </div>
                      <time className="shrink-0 font-mono text-[11px] text-gov-muted">
                        {formatRelativeTime(e.created_at)}
                      </time>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <div className="rounded-[8px] border border-gov-border bg-white shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-gov-border pb-2.5">
              <UsersIcon className="h-4 w-4 text-gov-blue" />
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                Role Privilege Distribution
              </span>
            </div>

            {!summary ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {ROLE_ORDER.map((role) => {
                  const count = summary.byRole[role]
                  const pct = summary.total ? Math.round((count / summary.total) * 100) : 0
                  return (
                    <div key={role}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-gov-navy">{ROLE_LABELS[role]}</span>
                        <span className="tabular-nums font-mono text-gov-muted">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <Progress value={pct} tone={ROLE_BAR[role]} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-[8px] border border-gov-border bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gov-border bg-gov-light-blue/25 px-4 py-2.5 flex items-center gap-2">
              <Settings className="h-4 w-4 text-gov-blue" />
              <span className="text-xs font-bold uppercase tracking-wider text-gov-navy">
                Administrative Modules
              </span>
            </div>
            <ul className="divide-y divide-gov-border">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon
                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-slate-100 text-gov-navy group-hover:bg-gov-light-blue group-hover:text-gov-blue border border-gov-border transition-colors">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gov-navy">{link.label}</p>
                        <p className="truncate text-[11px] text-gov-muted">{link.description}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-gov-blue transition-colors" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}
