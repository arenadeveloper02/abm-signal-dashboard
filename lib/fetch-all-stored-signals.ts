import type { StoredSignal, StoredSignalsResult } from '@/lib/types'

const PAGE_LIMIT = 1000
const MAX_PAGES = 50

type StoredPayload = Partial<StoredSignalsResult> & {
  error?: string
  missing?: string[]
  totals?: {
    total_companies?: number
    companies_returned?: number
    companies_with_signals?: number
    total_signals?: number
    signals_returned?: number
    signals_excluded_no_significant?: number
    total_signal_rows?: number
  }
}

function significantTotal(json: StoredPayload, collected: number): number {
  if (typeof json.totals?.total_signals === 'number') return json.totals.total_signals
  if (typeof json.dashboard?.total_signals === 'number') return json.dashboard.total_signals
  if (typeof json.returned === 'number' && typeof json.offset === 'number') {
    // Single-page hint only; prefer collected length when paging
    return Math.max(json.returned, collected)
  }
  return collected
}

export function normalizeStoredPayload(
  json: StoredPayload,
  signals: StoredSignal[],
  requestedCount: number
): StoredSignalsResult {
  const companies = Array.isArray(json.companies) ? json.companies : []
  const totalCompanies =
    typeof json.totals?.total_companies === 'number'
      ? json.totals.total_companies
      : typeof json.total_companies === 'number'
        ? json.total_companies
        : typeof json.company_count === 'number'
          ? json.company_count
          : companies.length

  return {
    total:
      typeof json.totals?.total_signal_rows === 'number'
        ? json.totals.total_signal_rows
        : typeof json.total === 'number'
          ? json.total
          : signals.length,
    returned: signals.length,
    limit: typeof json.limit === 'number' ? json.limit : PAGE_LIMIT,
    offset: 0,
    requested_count:
      typeof json.requested_count === 'number' ? json.requested_count : requestedCount,
    matched_count:
      typeof json.matched_count === 'number' ? json.matched_count : companies.length,
    unmatched_count:
      typeof json.unmatched_count === 'number'
        ? json.unmatched_count
        : Array.isArray(json.unmatched_inputs)
          ? json.unmatched_inputs.length
          : 0,
    counts_by_family: {
      funding: json.counts_by_family?.funding ?? 0,
      csuite: json.counts_by_family?.csuite ?? 0,
      product: json.counts_by_family?.product ?? 0,
      partnership: json.counts_by_family?.partnership ?? 0,
    },
    unmatched_inputs: Array.isArray(json.unmatched_inputs) ? json.unmatched_inputs : [],
    companies,
    total_companies: totalCompanies,
    total_signal_rows:
      typeof json.totals?.total_signal_rows === 'number'
        ? json.totals.total_signal_rows
        : typeof json.total_signal_rows === 'number'
          ? json.total_signal_rows
          : undefined,
    company_count: typeof json.company_count === 'number' ? json.company_count : companies.length,
    counts_by_alert: json.counts_by_alert,
    counts_by_category: json.counts_by_category,
    dashboard: json.dashboard,
    totals: json.totals,
    signals,
  }
}

/**
 * Fetches all stored companies (always complete from API) and pages through
 * signals until the significant-signal total is covered (server hard-caps limit at 5000).
 */
export async function fetchAllStoredSignals(): Promise<StoredSignalsResult> {
  const allSignals: StoredSignal[] = []
  let first: StoredPayload | null = null
  let offset = 0

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await fetch('/api/all-stored-signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: PAGE_LIMIT, offset, includeSignals: true }),
    })

    let json: StoredPayload = {}
    try {
      json = (await res.json()) as StoredPayload
    } catch {
      json = {}
    }

    if (!res.ok) {
      const err = new Error(
        json.error ?? `Fetching stored signals failed with status ${res.status}`
      ) as Error & { missing?: string[]; status?: number }
      err.missing = json.missing
      err.status = res.status
      throw err
    }
    if (json.error) {
      throw new Error(json.error)
    }

    if (first === null) first = json

    const batch = Array.isArray(json.signals) ? (json.signals as StoredSignal[]) : []
    allSignals.push(...batch)

    const target = significantTotal(json, allSignals.length)
    offset += PAGE_LIMIT

    if (batch.length === 0) break
    if (batch.length < PAGE_LIMIT) break
    if (allSignals.length >= target) break
  }

  if (first === null) {
    throw new Error('Unexpected response from the signal read API')
  }
  if (!Array.isArray(first.companies) && allSignals.length === 0) {
    throw new Error('Unexpected response from the signal read API')
  }

  const fallbackCount = Array.isArray(first.companies) ? first.companies.length : 0
  return normalizeStoredPayload(first, allSignals, fallbackCount)
}
