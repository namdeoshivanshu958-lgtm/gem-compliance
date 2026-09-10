import type { RequirementCategory, RequirementResult } from '../types'

export type ScoreGroup = 'technical' | 'financial' | 'document' | 'legal'

export const SCORE_GROUP_LABELS: Record<ScoreGroup, string> = {
  technical: 'Technical',
  financial: 'Financial',
  document: 'Docs',
  legal: 'Legal',
}

/**
 * Maps every requirement category the AI extraction pipeline produces onto
 * one of the four judge-facing score groups. Kept in one place so the
 * dashboard breakdown and any future page agree on the same grouping.
 */
const GROUP_BY_CATEGORY: Record<RequirementCategory, ScoreGroup> = {
  bis: 'technical',
  make_in_india: 'technical',
  other: 'technical',
  financial: 'financial',
  turnover: 'financial',
  pan: 'legal',
  gst: 'legal',
  income_tax: 'legal',
  blacklist_debarment: 'legal',
  company_registration: 'legal',
  identity: 'document',
  udyam_msme: 'document',
  startup_dpiit: 'document',
  nsic: 'document',
  oem_authorization: 'document',
  epfo: 'document',
  esic: 'document',
  digilocker: 'document',
}

export interface GroupScore {
  group: ScoreGroup
  /** 0–100, or null when the tender had no requirements in this group. */
  score: number | null
  compliant: number
  total: number
}

/**
 * Derives a real per-group compliance percentage from the deterministic
 * rule engine's own requirement_results — never fabricated, never averaged
 * from the overall score. A group with zero matching requirements reports
 * `score: null` rather than a misleading 100%.
 */
export function computeScoreBreakdown(results: RequirementResult[]): GroupScore[] {
  const groups: ScoreGroup[] = ['technical', 'financial', 'document', 'legal']
  return groups.map((group) => {
    const inGroup = results.filter((r) => GROUP_BY_CATEGORY[r.category] === group)
    if (inGroup.length === 0) return { group, score: null, compliant: 0, total: 0 }
    const compliant = inGroup.filter((r) => r.status === 'COMPLIANT').length
    return {
      group,
      score: Math.round((compliant / inGroup.length) * 100),
      compliant,
      total: inGroup.length,
    }
  })
}
