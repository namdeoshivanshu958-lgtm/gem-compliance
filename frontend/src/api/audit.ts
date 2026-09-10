import apiClient from './client'
import type { AuditLogEntry, PaginatedResponse } from '../types'

export interface AuditLogQuery {
  action?: string
  entity_type?: string
  user_id?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export async function listAuditLogs(
  query: AuditLogQuery
): Promise<PaginatedResponse<AuditLogEntry>> {
  const res = await apiClient.get<PaginatedResponse<AuditLogEntry>>('/audit/', { params: query })
  return res.data
}

export async function verifyAuditIntegrity(): Promise<{ valid: boolean; total_checked: number; broken_at_entry_id?: string; reason?: string }> {
  const res = await apiClient.get('/audit/verify-integrity')
  return res.data
}

