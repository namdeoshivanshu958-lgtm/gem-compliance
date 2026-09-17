import { NavLink } from 'react-router-dom'
import {
  ShieldCheck,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useAuth } from '../../context/AuthContext'
import { visibleSections } from '../../config/nav'
import { ROLE_LABELS } from '../../lib/roles'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const ROW =
  'group relative flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-xs font-medium transition-all duration-150 border-l-[3px] border-transparent'
const ROW_ACTIVE =
  'bg-[#1F5FAF]/20 text-white border-l-[#1F5FAF] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
const ROW_INACTIVE = 'text-slate-300 hover:bg-white/[0.06] hover:text-white'

interface InnerProps {
  collapsed: boolean
  onNavigate?: () => void
}

function SidebarInner({ collapsed, onNavigate }: InnerProps) {
  const { user, logout } = useAuth()
  const sections = visibleSections(user?.role)

  return (
    <div className="flex h-full flex-col bg-sidebar-gradient border-r border-[#163A63]/50">
      {/* Institutional Brand */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/10 px-4 bg-[#071426]/60',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] bg-[#1F5FAF] text-white shadow-sm border border-white/20 font-black text-xs tracking-wider">
            CPCL
          </div>
          {!collapsed && (
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-white tracking-wide uppercase">GeM Compliance</p>
                <span className="rounded bg-[#1F5FAF]/30 px-1 py-0.2 text-[9px] font-semibold text-blue-200 border border-blue-400/20">
                  SIH 2026
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate mt-0.5">Chennai Petroleum Corp Ltd</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="scrollbar-dark flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {sections.map((section, si) => (
          <div key={section.label ?? si}>
            {section.label && !collapsed ? (
              <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
            ) : section.label && collapsed ? (
              <div className="mx-2 mb-1.5 border-t border-white/10" />
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(ROW, collapsed && 'justify-center px-0 py-2', isActive ? ROW_ACTIVE : ROW_INACTIVE)
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.75]" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-[4px] bg-[#071426] border border-white/10 px-2.5 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
                        {item.label}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-2.5', collapsed && 'flex-col gap-2')}>
          <NavLink
            to="/profile"
            onClick={onNavigate}
            title={collapsed ? user?.full_name : undefined}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-500/20 text-xs font-bold text-white ring-1 ring-white/20 transition-colors hover:bg-primary-500/30"
          >
            {user ? initialsOf(user.full_name) : '?'}
          </NavLink>
          {!collapsed && (
            <>
              <NavLink to="/profile" onClick={onNavigate} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.full_name ?? 'Account'}
                </p>
                <p className="truncate text-[11px] text-navy-300">
                  {user ? ROLE_LABELS[user.role] : ''}
                </p>
              </NavLink>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
                className="shrink-0 rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
          {collapsed && (
            <button
              type="button"
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-lg p-2 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapse: () => void
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col lg:flex',
          collapsed ? 'w-[76px]' : 'w-64',
        )}
      >
        <div className="relative flex-1 overflow-hidden">
          <SidebarInner collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-10 shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-navy-950 text-xs font-medium text-navy-300 transition-colors hover:bg-navy-900 hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 animate-slide-up shadow-elevated">
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-navy-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarInner collapsed={false} onNavigate={onCloseMobile} />
          </div>
        </div>
      )}
    </>
  )
}
