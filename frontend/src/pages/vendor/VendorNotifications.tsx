import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  Upload,
  CheckCheck,
  Filter,
  FileCheck2,
  ShieldAlert,
  Sparkles,
  Calendar,
} from 'lucide-react'
import axios from 'axios'
import Layout from '../../components/Layout'

interface NotificationItem {
  id: string
  subject: string
  message: string
  notification_type?: string
  is_read: boolean
  created_at: string
  read_at?: string
  bidder_id?: string
  tender_id?: string
}

export default function VendorNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)

  const loadNotifications = () => {
    setLoading(true)
    axios
      .get('/api/notifications')
      .then((res) => {
        if (Array.isArray(res.data)) {
          setNotifications(res.data)
        }
      })
      .catch(() => {
        // Fallback demo notifications
        setNotifications([
          {
            id: 'notif-1',
            subject: 'Clarification Required: Low-Resolution Scan',
            message: 'An evaluation officer has flagged your Turnover Certificate as low resolution. Please upload a clear chartered accountant certified copy within 72 hours.',
            notification_type: 'CLARIFICATION_REQUIRED',
            is_read: false,
            created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          },
          {
            id: 'notif-2',
            subject: 'Compliance Completed: GEM/2026/B/6541278',
            message: 'Deterministic verification completed. Technical evaluation verdict: COMPLIANT (Score: 100%). Cryptographic proof anchored on-chain.',
            notification_type: 'COMPLIANCE_COMPLETED',
            is_read: true,
            created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
          {
            id: 'notif-3',
            subject: 'Tender Closing Soon: Industrial Safety PPE',
            message: 'Tender GEM/2026/B/7891234 submission deadline closes in 48 hours. Ensure all statutory documents are submitted.',
            notification_type: 'TENDER_CLOSING_SOON',
            is_read: false,
            created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
          },
        ])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      await axios.post(`/api/notifications/${id}/read`)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/read-all')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const displayed = filterUnreadOnly ? notifications.filter((n) => !n.is_read) : notifications

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#1f5faf] uppercase font-bold">
              <Bell className="w-4 h-4" />
              Vendor Alert &amp; Communication Enclave
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Notification Center</h1>
            <p className="text-xs text-slate-500">
              Direct official notices, clarification requests, and compliance status updates from procurement officers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              Mark All Read
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterUnreadOnly(false)}
              className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${
                !filterUnreadOnly ? 'bg-[#0b1f3a] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              onClick={() => setFilterUnreadOnly(true)}
              className={`px-3 py-1 text-xs rounded font-semibold transition-colors flex items-center gap-1.5 ${
                filterUnreadOnly ? 'bg-[#0b1f3a] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="bg-rose-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            {unreadCount} pending action{unreadCount === 1 ? '' : 's'}
          </span>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {displayed.map((n) => {
            const isClarif = n.notification_type === 'CLARIFICATION_REQUIRED' || n.subject.toLowerCase().includes('clarification')
            const isCompleted = n.notification_type === 'COMPLIANCE_COMPLETED' || n.subject.toLowerCase().includes('completed')
            const isDeadline = n.notification_type === 'TENDER_CLOSING_SOON' || n.subject.toLowerCase().includes('closing')

            return (
              <div
                key={n.id}
                className={`p-4 rounded-lg border transition-all ${
                  !n.is_read
                    ? 'bg-amber-50/40 border-amber-300 shadow-sm'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded mt-0.5 ${
                        isClarif
                          ? 'bg-amber-100 text-amber-800'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-[#1f5faf]'
                      }`}
                    >
                      {isClarif ? (
                        <MessageSquare className="w-4 h-4" />
                      ) : isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">{n.subject}</h3>
                        {!n.is_read && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                        <span>{new Date(n.created_at).toLocaleString()}</span>
                        {isClarif && (
                          <Link
                            to="/vendor/clarifications"
                            className="text-[#1f5faf] font-bold hover:underline flex items-center gap-0.5"
                          >
                            Open Clarification Console &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="px-2 py-1 text-[10px] font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded shrink-0"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {displayed.length === 0 && !loading && (
            <div className="bg-white p-12 text-center rounded-lg border border-slate-200 text-slate-500">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700">No notifications in this view</div>
              <div className="text-[11px] text-slate-400 mt-0.5">You are fully caught up with official communications.</div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
