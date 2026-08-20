import type { Confidence, Family, GlobalFilters, Signal } from '@/lib/types'

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
