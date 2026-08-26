import type {
  Confidence,
  Family,
  GlobalFilters,
  NormalizedSeverity,
  Signal,
  SourceLink,
  StoredSignal,
} from '@/lib/types'

export const FAMILIES: Family[] = ['funding', 'csuite', 'product', 'partnership']

export const CONFIDENCES: Confidence[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']

export const FAMILY_META: Record<Family, { label: string; color: string }> = {
  funding: { label: 'Funding', color: '#3BC884' },
  csuite: { label: 'C-Suite', color: '#B364D7' },
  product: { label: 'Product', color: '#00A7D6' },
  partnership: { label: 'Partnership', color: '#F8528F' },
}

export const CONFIDENCE_META: Record<Confidence, { color: string }> = {
  HIGH: { color: '#FF5252' },
  MEDIUM: { color: '#FB8145' },
  LOW: { color: '#9AA0AE' },
  UNKNOWN: { color: '#6D717F' },
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDate(value: string | Date): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

export function formatDateTime(value: string | Date): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function relativeTime(value: string | Date): string {
  const d = toDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const suffix = diff < 0 ? 'ahead' : 'ago'
  const abs = Math.abs(diff)
  const mins = Math.floor(abs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ${suffix}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ${suffix}`
  const days = Math.floor(hours / 24)
  return `${days}d ${suffix}`
}

export function filterSignals(signals: Signal[], filters: GlobalFilters, search: string): Signal[] {
  const q = search.trim().toLowerCase()
  return signals.filter((s) => {
    if (filters.family !== 'all' && s.family !== filters.family) return false
    if (filters.confidence !== 'all' && s.confidence !== filters.confidence) return false
    if (filters.signalType !== 'all' && s.signal_type !== filters.signalType) return false
    if (filters.dateFrom && s.date < filters.dateFrom) return false
    if (filters.dateTo && s.date > filters.dateTo) return false
    if (q && !s.company.toLowerCase().includes(q) && !s.summary.toLowerCase().includes(q)) return false
    return true
  })
}

// ── Stored-signal derivation helpers (ABM Signal Read API) ──────────────────

export const NO_SIGNIFICANT_SIGNAL = 'NO_SIGNIFICANT_SIGNAL'

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

export function storedSignalDate(s: StoredSignal): string {
  const primary = (s.announcement_date ?? '').trim()
  if (primary !== '' && !Number.isNaN(new Date(primary).getTime())) return primary
  return (s.last_seen_at ?? '').trim()
}

export function normalizeStoredSeverity(s: StoredSignal): NormalizedSeverity {
  const family = (s.signal_family ?? '').toLowerCase()
  const conf = (s.confidence ?? '').trim()
  if (family === 'csuite') {
    const status = (s.fields?.['Validation Status'] ?? '').trim().toUpperCase()
    return status === 'CONFIRMED' ? 'HIGH' : 'MEDIUM'
  }
  if (family === 'product') {
    const num = Number.parseFloat(conf)
    if (!Number.isNaN(num)) {
      if (num >= 8) return 'HIGH'
      if (num >= 5) return 'MEDIUM'
      return 'LOW'
    }
  }
  const upper = conf.toUpperCase()
  if (upper === 'HIGH') return 'HIGH'
  if (upper === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

export function isCreativeHiring(s: StoredSignal): boolean {
  const type = (s.signal_type ?? '').toUpperCase()
  return (type.includes('CREATIVE') || type.includes('MARKETING')) && (type.includes('HIR') || type.includes('RECRUIT'))
}

const CSUITE_EXIT_KEYWORDS = [
  'EXIT',
  'DEPART',
  'LEAVE',
  'LEFT',
  'RESIGN',
  'RETIRE',
  'STEP DOWN',
  'STEPS DOWN',
  'STEPPED DOWN',
  'OUTGOING',
]

const FUNDING_NEWS_HINTS = ['NEWS', 'MENTION', 'PRESS']

export function storedDisplayType(s: StoredSignal): string {
  const type = (s.signal_type ?? '').toUpperCase()
  const family = (s.signal_family ?? '').toLowerCase()
  if (isCreativeHiring(s)) return 'Creative Hiring'
  if (family === 'csuite') {
    const action = `${s.fields?.['Action'] ?? ''} ${s.fields?.['Title'] ?? ''}`.toUpperCase()
    const isExit = CSUITE_EXIT_KEYWORDS.some((k) => action.includes(k))
    return isExit ? 'C-Suite Exit' : 'C-Suite Join'
  }
  if (type === 'M_AND_A') return 'Acquisition / M&A'
  if (type === 'IPO_SIGNAL') return 'IPO'
  if (family === 'funding') {
    if (FUNDING_NEWS_HINTS.some((k) => type.includes(k))) return 'News Mention'
    return 'Funding Round'
  }
  if (family === 'product') return 'Product Launch'
  if (family === 'partnership') return 'Partnership'
  return 'News Mention'
}

export function getStoredSourceLinks(s: StoredSignal): SourceLink[] {
  const links: SourceLink[] = []
  const push = (rawUrl: string, name?: string) => {
    const url = rawUrl.trim()
    if (url === '' || url.toUpperCase() === 'N/A') return
    let label = name && name.trim() !== '' ? name.trim() : ''
    if (label === '') {
      try {
        label = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        label = url
      }
    }
    links.push({ name: label, url })
  }
  const family = (s.signal_family ?? '').toLowerCase()
  const supporting = (s.fields?.['Supporting URLs'] ?? '').trim()
  if (family === 'csuite') {
    if (supporting !== '' && supporting.toUpperCase() !== 'N/A') {
      supporting.split(',').forEach((u) => push(u))
    }
    return links
  }
  const directUrl = (s.source_url ?? '').trim()
  if (directUrl !== '') {
    directUrl.split(/\s+/).forEach((u, i) => push(u, i === 0 ? s.source_name : undefined))
    return links
  }
  if (supporting !== '' && supporting.toUpperCase() !== 'N/A') {
    supporting.split(',').forEach((u) => push(u))
  }
  return links
}
