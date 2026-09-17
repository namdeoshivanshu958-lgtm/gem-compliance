import {
  LayoutDashboard,
  FileText,
  Building2,
  ShieldCheck,
  FileBarChart2,
  ScrollText,
  Users,
  KeyRound,
  Settings,
  Gauge,
  Landmark,
  Blocks,
  GitCompare,
  AlertTriangle,
  MessageSquare,
  Scale,
  FolderArchive,
  SearchCheck,
  ClipboardList,
  Bell,
  UserCheck,
} from 'lucide-react'

import type { LucideIcon } from 'lucide-react'
import type { UserRole } from '../types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon

  /** When set, item is only shown to these roles. Undefined = all authenticated. */
  roles?: UserRole[]

  /** Match the route exactly (for index-like routes). */
  end?: boolean

  /** Extra path prefixes that should also mark this item active. */
  activePaths?: string[]
}

export interface NavSection {
  label?: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Vendor Portal',
    items: [
      {
        label: 'Vendor Dashboard',
        to: '/vendor/dashboard',
        icon: LayoutDashboard,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'Browse Tenders',
        to: '/vendor/tenders',
        icon: SearchCheck,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'My Applications',
        to: '/vendor/applications',
        icon: ClipboardList,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'My Documents & Versions',
        to: '/vendor/documents',
        icon: FolderArchive,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'Compliance Matrix',
        to: '/vendor/compliance',
        icon: ShieldCheck,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'Clarification Notices',
        to: '/vendor/clarifications',
        icon: MessageSquare,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'Alerts & Notifications',
        to: '/vendor/notifications',
        icon: Bell,
        roles: ['bidder', 'admin'],
      },
      {
        label: 'Seller Profile',
        to: '/vendor/profile',
        icon: UserCheck,
        roles: ['bidder', 'admin'],
      },
    ],
  },
  {
    label: 'Officer Operations',
    items: [
      {
        label: 'Officer Console',
        to: '/officer/dashboard',
        icon: Gauge,
        roles: ['evaluator', 'admin'],
      },
      {
        label: 'Bidder Compare & L1',
        to: '/officer/compare',
        icon: GitCompare,
        roles: ['evaluator', 'admin'],
      },
      {
        label: 'Cartel & Tampering Risk',
        to: '/officer/risk',
        icon: AlertTriangle,
        roles: ['evaluator', 'admin'],
      },
      {
        label: 'Overrides & Deviations',
        to: '/officer/decisions',
        icon: Scale,
        roles: ['evaluator', 'admin'],
      },
      {
        label: 'Clarification Committee',
        to: '/officer/clarifications',
        icon: MessageSquare,
        roles: ['evaluator', 'admin'],
      },
    ],
  },
  {
    label: 'Workspace',
    items: [
      {
        label: 'Overview Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'evaluator', 'viewer'],
      },
      {
        label: 'Tenders Registry',
        to: '/tenders',
        icon: FileText,
        activePaths: ['/tenders'],
      },
      {
        label: 'Bidders Registry',
        to: '/bidders',
        icon: Building2,
        activePaths: ['/bidders'],
        roles: ['admin', 'evaluator', 'viewer'],
      },
      {
        label: 'Compliance Engine',
        to: '/compliance',
        icon: ShieldCheck,
        roles: ['admin', 'evaluator', 'viewer'],
      },
      {
        label: 'Reports & Audits',
        to: '/reports',
        icon: FileBarChart2,
        roles: ['admin', 'evaluator'],
      },
    ],
  },
  {
    label: 'Government Sources',
    items: [
      {
        label: 'GeM',
        to: '/government-sources?source=gem',
        icon: Landmark,
      },
      {
        label: 'GST',
        to: '/government-sources?source=gst',
        icon: Landmark,
      },
      {
        label: 'Udyam / MSME',
        to: '/government-sources?source=udyam',
        icon: Landmark,
      },
      {
        label: 'MCA',
        to: '/government-sources?source=mca',
        icon: Landmark,
      },
      {
        label: 'EPFO / ESIC',
        to: '/government-sources?source=epfo',
        icon: Landmark,
      },
      {
        label: 'DPIIT / Startup India',
        to: '/government-sources?source=dpiit',
        icon: Landmark,
      },
      {
        label: 'BIS',
        to: '/government-sources?source=bis',
        icon: Landmark,
      },
      {
        label: 'DigiLocker',
        to: '/government-sources?source=digilocker',
        icon: Landmark,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Blockchain Ledger',
        to: '/blockchain',
        icon: Blocks,
        activePaths: ['/blockchain'],
      },
      {
        label: 'Public Document Verify',
        to: '/verify',
        icon: SearchCheck,
        activePaths: ['/verify'],
      },
      {
        label: 'Audit Logs',
        to: '/audit-logs',
        icon: ScrollText,
        roles: ['admin', 'evaluator'],
      },
      {
        label: 'Users',
        to: '/admin/users',
        icon: Users,
        roles: ['admin'],
      },
      {
        label: 'Roles & Permissions',
        to: '/admin/roles',
        icon: KeyRound,
        roles: ['admin'],
      },
      {
        label: 'System Settings',
        to: '/admin/settings',
        icon: Settings,
        roles: ['admin'],
      },
    ],
  },
]

/** Filter nav sections/items by the current user's role. */
export function visibleSections(
  role: UserRole | undefined
): NavSection[] {
  if (!role) return []

  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.roles || item.roles.includes(role)
      ),
    }))
    .filter((section) => section.items.length > 0)
}