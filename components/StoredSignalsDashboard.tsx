"use client"

import { Fragment, useMemo, useState } from 'react'
import type { StoredCompany, StoredSignal, StoredSignalsResult } from '@/lib/types'
import { FAMILIES, FAMILY_META } from '@/lib/utils'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

type DashTab = 'overview' | 'companies' | 'signals' | 'trends' | 'insights'

type SortKey = 'company' | 'family' | 'type' | 'severity' | 'date'

interface SourceLink {
  label: string
  url: string
}

interface EnrichedSignal {
  signal: StoredSignal
  severity: Severity
  typeLabel: string
  date: string
  links: SourceLink[]
}

interface TrendBucket {
  key: string
  month: string
  funding: number
  csuite: number
  product: number
  partnership: number
}

interface WeekBucket {
  key: string
  label: string
  HIGH: number
  MEDIUM: number
  LOW: number
}

interface NamedCount {
  name: string
  value: number
}

interface StatPill {
  label: string
  value: number
  color: string
}

interface StoredSignalsDashboardProps {
  result: StoredSignalsResult
  onRefresh: () => void
  onImport: () => void
  refreshing: boolean
}

const SKIP_FIELD_KEYS = ['Normalized Entity', 'Sources Checked', 'Research Gaps', 'Reserved']

const SEVERITIES: Severity[] = ['HIGH', 'MEDIUM', 'LOW']

const SEVERITY_COLORS: Record<Severity, string> = {
  HIGH: '#F31A1A',
  MEDIUM: '#FB8145',
  LOW: '#3BC884',
}

const TABS: { key: DashTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'companies', label: 'Companies' },
  { key: 'signals', label: 'Signals' },
  { key: 'trends', label: 'Trends' },
  { key: 'insights', label: 'Insights' },
]

const COLS: { key: SortKey; label: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'family', label: 'Family' },
  { key: 'type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'date', label: 'Date' },
]

const TYPE_COLORS: Record<string, string> = {
  'C-Suite Join': '#B364D7',
  'C-Suite Exit': '#F31A1A',
  'Funding Round': '#3BC884',
  'Acquisition / M&A': '#FB8145',
  IPO: '#DFC612',
  'Product Launch': '#00A7D6',
  Partnership: '#F8528F',
  'News Mention': '#6D717F',
  'Creative Hiring': '#1A73E8',
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

const selectCls =
  'rounded-lg border border-[#D6D9E0] bg-white px-2 py-1.5 text-sm text-[#2C2D33] focus:border-[#1A73E8] focus:outline-none'

const tooltipStyle = {
  backgroundColor: '#2C2D33',
  border: 'none',
  borderRadius: 8,
  color: '#FFFFFF',
  fontSize: 12,
}

function sevRank(s: Severity): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1
}

function normalizeSeverity(s: StoredSignal): Severity {
  const fam = s.signal_family.toLowerCase()
  const conf = (s.confidence ?? '').trim()
  if (fam === 'product') {
    const n = Number(conf)
    if (conf !== '' && !Number.isNaN(n)) {
      if (n >= 8) return 'HIGH'
      if (n >= 5) return 'MEDIUM'
      return 'LOW'
    }
  }
  if (fam === 'csuite') {
    const status = (s.fields?.['Validation Status'] ?? '').trim().toUpperCase()
    return status === 'CONFIRMED' ? 'HIGH' : 'MEDIUM'
  }
  const upper = conf.toUpperCase()
  if (upper === 'HIGH') return 'HIGH'
  if (upper === 'LOW') return 'LOW'
  return 'MEDIUM'
}

function displayType(s: StoredSignal): string {
  const fam = s.signal_family.toLowerCase()
  const t = s.signal_type.toUpperCase()
  if (fam === 'csuite') {
    const action = `${s.fields?.['Action'] ?? ''} ${s.fields?.['Title'] ?? ''} ${s.signal_type}`.toUpperCase()
    if (/(DEPART|EXIT|RESIGN|STEP DOWN|STEPS DOWN|STEPPING DOWN|LEAV|RETIR)/.test(action)) return 'C-Suite Exit'
    return 'C-Suite Join'
  }
  if (t.includes('CREATIVE') || t.includes('HIRING')) return 'Creative Hiring'
  if (t === 'M_AND_A') return 'Acquisition / M&A'
  if (t === 'IPO_SIGNAL') return 'IPO'
  if (t === 'FUNDING_ROUND' || t === 'DEBT_FINANCING' || t === 'EARNINGS') return 'Funding Round'
  if (fam === 'funding') return 'Funding Round'
  if (fam === 'partnership') return 'Partnership'
  if (fam === 'product') return 'Product Launch'
  return 'News Mention'
}

function getSourceLinks(s: StoredSignal): SourceLink[] {
  const fam = s.signal_family.toLowerCase()
  if (fam === 'csuite') {
    const raw = (s.fields?.['Supporting URLs'] ?? '').trim()
    if (raw === '' || raw.toUpperCase() === 'N/A') return []
    const label = (s.fields?.['Document Type'] ?? '').trim() || 'Source'
    return raw
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u !== '' && u.toUpperCase() !== 'N/A')
      .map((url) => ({ label, url }))
  }
  const urls = (s.source_url ?? '')
    .split(/\s+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'))
  const label = (s.source_name ?? '').trim() || 'Source'
  return urls.map((url) => ({ label, url }))
}

function famMeta(family: string): { label: string; color: string } {
  const f = family.toLowerCase()
  if (f === 'funding' || f === 'csuite' || f === 'product' || f === 'partnership') {
    return FAMILY_META[f]
  }
  return { label: family || 'Other', color: '#6D717F' }
}

function detailEntries(s: StoredSignal): [string, string][] {
  const fields = s.fields ?? {}
  return Object.entries(fields)
    .filter(([k, v]) => !SKIP_FIELD_KEYS.includes(k) && String(v).trim() !== '')
    .map(([k, v]) => [k, String(v)] as [string, string])
}

function formatLongDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatShortDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function agoLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 0) return '0d 0h'
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function weekStartKey(value: string): string | null {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
}

function weekLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`)
  if (Number.isNaN(d.getTime())) return key
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function StatCard({ label, value, color, pills }: { label: string; value: number; color: string; pills?: StatPill[] }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${color}66`, backgroundColor: `${color}0D` }}>
      <p className="text-3xl font-semibold" style={{ color }}>{value.toLocaleString('en-US')}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[#6D717F]">{label}</p>
      {pills && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pills.map((p) => (
            <span
              key={p.label}
              className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
              style={{ color: p.color, borderColor: `${p.color}55`, backgroundColor: `${p.color}14` }}
            >
              {p.label}:{p.value.toLocaleString('en-US')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const color = SEVERITY_COLORS[severity]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      {severity}
    </span>
  )
}

function FamilyBadge({ family }: { family: string }) {
  const meta = famMeta(family)
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }}
    >
      {meta.label}
    </span>
  )
}

function TypeChip({ label }: { label: string }) {
  const color = TYPE_COLORS[label] ?? '#6D717F'
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      {label}
    </span>
  )
}

export default function StoredSignalsDashboard({ result, onRefresh, onImport, refreshing }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<DashTab>('overview')
  const [famFilter, setFamFilter] = useState('all')
  const [sevFilter, setSevFilter] = useState<'all' | Severity>('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [industryFilter, setIndustryFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
  const [feedType, setFeedType] = useState<string | null>(null)

  const enriched = useMemo<EnrichedSignal[]>(
    () =>
      result.signals
        .filter((s) => s.signal_type.toUpperCase() !== 'NO_SIGNIFICANT_SIGNAL')
        .map((s) => ({
          signal: s,
          severity: normalizeSeverity(s),
          typeLabel: displayType(s),
          date: s.announcement_date && s.announcement_date.trim() !== '' ? s.announcement_date : s.last_seen_at,
          links: getSourceLinks(s),
        })),
    [result]
  )

  const industryByCompany = useMemo(() => {
    const map = new Map<string, string>()
    ;(result.companies ?? []).forEach((c) => {
      const industry = (c.industry ?? '').trim()
      if (industry === '') return
      if (c.company_id) map.set(c.company_id, industry)
      if (c.company_key) map.set(c.company_key, industry)
    })
    return map
  }, [result])

  const hasSignals = result.signals.length > 0
  const requested = result.requested_count ?? 0
  const matched = result.matched_count ?? (result.companies ? result.companies.length : 0)
  const totalSignals = enriched.length

  const sevCounts = useMemo(() => {
    const counts: Record<Severity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    enriched.forEach((e) => {
      counts[e.severity] += 1
    })
    return counts
  }, [enriched])

  const byLabel = (label: string): number => enriched.filter((e) => e.typeLabel === label).length
  const byFam = (fam: string): number => enriched.filter((e) => e.signal.signal_family.toLowerCase() === fam).length

  const csuiteChanges = hasSignals ? byFam('csuite') : result.counts_by_family.csuite
  const fundingEvents = hasSignals ? byLabel('Funding Round') : result.counts_by_family.funding
  const productLaunches = hasSignals ? byFam('product') : result.counts_by_family.product
  const partnerships = hasSignals ? byFam('partnership') : result.counts_by_family.partnership
  const mna = byLabel('Acquisition / M&A')
  const ipo = byLabel('IPO')
  const news = byLabel('News Mention')
  const creativeHiring = byLabel('Creative Hiring')

  const cards: { label: string; value: number; color: string; pills?: StatPill[] }[] = [
    { label: 'Companies Tracked', value: requested, color: '#1A73E8' },
    {
      label: 'Total Signals',
      value: totalSignals,
      color: '#00A7D6',
      pills: [
        { label: 'H', value: sevCounts.HIGH, color: SEVERITY_COLORS.HIGH },
        { label: 'M', value: sevCounts.MEDIUM, color: SEVERITY_COLORS.MEDIUM },
        { label: 'L', value: sevCounts.LOW, color: SEVERITY_COLORS.LOW },
      ],
    },
    { label: 'High Alerts', value: sevCounts.HIGH, color: '#F31A1A' },
    { label: 'C-Suite Changes', value: csuiteChanges, color: '#B364D7' },
    { label: 'Funding', value: fundingEvents, color: '#3BC884' },
    { label: 'Mergers & Acquisitions', value: mna, color: '#FB8145' },
    { label: 'IPO', value: ipo, color: '#DFC612' },
    { label: 'News', value: news, color: '#6D717F' },
    { label: 'Product Launches', value: productLaunches, color: '#00A7D6' },
    { label: 'Partnerships', value: partnerships, color: '#F8528F' },
    { label: 'Creative Hiring', value: creativeHiring, color: '#1A73E8' },
  ]

  const feedBase = useMemo(() => {
    const within = enriched.filter((e) => {
      const d = new Date(e.date)
      if (Number.isNaN(d.getTime())) return false
      const diff = Date.now() - d.getTime()
      return diff >= 0 && diff <= NINETY_DAYS_MS
    })
    return [...within].sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
    })
  }, [enriched])

  const feedSignals = useMemo(
    () =>
      feedBase.filter((e) => {
        if (feedWeek && weekStartKey(e.date) !== feedWeek) return false
        if (feedType && e.typeLabel !== feedType) return false
        return true
      }),
    [feedBase, feedWeek, feedType]
  )

  const weeklyData = useMemo<WeekBucket[]>(() => {
    const map = new Map<string, WeekBucket>()
    feedBase.forEach((e) => {
      const key = weekStartKey(e.date)
      if (!key) return
      const entry = map.get(key) ?? { key, label: weekLabel(key), HIGH: 0, MEDIUM: 0, LOW: 0 }
      entry[e.severity] += 1
      map.set(key, entry)
    })
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [feedBase])

  const typeBreakdown = useMemo<NamedCount[]>(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.typeLabel, (map.get(e.typeLabel) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [enriched])

  const industryData = useMemo<NamedCount[]>(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      const industry =
        industryByCompany.get(e.signal.company_id) ?? industryByCompany.get(e.signal.company_key) ?? ''
      if (industry === '') return
      map.set(industry, (map.get(industry) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [enriched, industryByCompany])

  const topCompanies: StoredCompany[] = useMemo(
    () => [...(result.companies ?? [])].sort((a, b) => b.total - a.total),
    [result]
  )
  const maxCompanyTotal = topCompanies.reduce((acc, c) => Math.max(acc, c.total), 1)

  const recentHigh = useMemo(
    () =>
      enriched
        .filter((e) => e.severity === 'HIGH')
        .sort((a, b) => {
          const ta = new Date(a.date).getTime()
          const tb = new Date(b.date).getTime()
          return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
        }),
    [enriched]
  )

  const trendData = useMemo<TrendBucket[]>(() => {
    const map = new Map<string, TrendBucket>()
    enriched.forEach((e) => {
      const d = new Date(e.date)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry =
        map.get(key) ?? {
          key,
          month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          funding: 0,
          csuite: 0,
          product: 0,
          partnership: 0,
        }
      const fam = e.signal.signal_family.toLowerCase()
      if (fam === 'funding') entry.funding += 1
      else if (fam === 'csuite') entry.csuite += 1
      else if (fam === 'product') entry.product += 1
      else if (fam === 'partnership') entry.partnership += 1
      map.set(key, entry)
    })
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [enriched])

  const companyOptions = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.signal.company_name))).sort(),
    [enriched]
  )

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = enriched.filter((e) => {
      if (famFilter !== 'all' && e.signal.signal_family.toLowerCase() !== famFilter) return false
      if (sevFilter !== 'all' && e.severity !== sevFilter) return false
      if (companyFilter !== 'all' && e.signal.company_name !== companyFilter) return false
      if (industryFilter !== 'all') {
        const ind =
          industryByCompany.get(e.signal.company_id) ?? industryByCompany.get(e.signal.company_key) ?? ''
        if (ind !== industryFilter) return false
      }
      if (
        q &&
        !e.signal.company_name.toLowerCase().includes(q) &&
        !e.signal.summary.toLowerCase().includes(q) &&
        !e.typeLabel.toLowerCase().includes(q)
      )
        return false
      return true
    })
    return [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'company') cmp = a.signal.company_name.localeCompare(b.signal.company_name)
      else if (sortKey === 'family') cmp = a.signal.signal_family.localeCompare(b.signal.signal_family)
      else if (sortKey === 'type') cmp = a.typeLabel.localeCompare(b.typeLabel)
      else if (sortKey === 'severity') cmp = sevRank(a.severity) - sevRank(b.severity)
      else cmp = a.date.localeCompare(b.date)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [enriched, famFilter, sevFilter, companyFilter, industryFilter, industryByCompany, query, sortKey, sortDir])

  const latestSeen = useMemo(() => {
    let best = 0
    result.signals.forEach((s) => {
      const t = new Date(s.last_seen_at).getTime()
      if (!Number.isNaN(t) && t > best) best = t
    })
    return best
  }, [result])

  const latestSignal = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => {
      const ta = new Date(a.date).getTime()
      const tb = new Date(b.date).getTime()
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
    })
    return sorted[0] ?? null
  }, [enriched])

  const highByCompany = useMemo(() => {
    const map = new Map<string, number>()
    enriched
      .filter((e) => e.severity === 'HIGH')
      .forEach((e) => map.set(e.signal.company_name, (map.get(e.signal.company_name) ?? 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0] ?? null
  }, [enriched])

  const topBySignals = topCompanies[0] ?? null
  const topType = typeBreakdown[0] ?? null

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'company' ? 'asc' : 'desc')
    }
  }

  const handleWeekClick = (data: { key?: string; payload?: { key?: string } }) => {
    const key = data.payload?.key ?? data.key
    if (typeof key === 'string' && key !== '') {
      setFeedWeek((prev) => (prev === key ? null : key))
    }
  }

  const handleTypeClick = (data: { name?: string; payload?: { name?: string } }) => {
    const name = data.payload?.name ?? data.name
    if (typeof name === 'string' && name !== '') {
      setFeedType((prev) => (prev === name ? null : name))
    }
  }

  const handleIndustryClick = (data: { name?: string; payload?: { name?: string } }) => {
    const name = data.payload?.name ?? data.name
    if (typeof name === 'string' && name !== '') {
      setIndustryFilter(name)
      setTab('signals')
    }
  }

  const clearTableFilters = () => {
    setFamFilter('all')
    setSevFilter('all')
    setCompanyFilter('all')
    setIndustryFilter('all')
    setQuery('')
  }

  const insightTiles = [
    {
      label: 'Most Signals',
      value: topBySignals ? topBySignals.company_name : '\u2014',
      sub: topBySignals ? `${topBySignals.total.toLocaleString('en-US')} total signal${topBySignals.total === 1 ? '' : 's'}` : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'Most High Alerts',
      value: highByCompany ? highByCompany[0] : '\u2014',
      sub: highByCompany ? `${highByCompany[1].toLocaleString('en-US')} high-severity signal${highByCompany[1] === 1 ? '' : 's'}` : 'No high alerts yet',
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: topType ? topType.name : '\u2014',
      sub: topType ? `${topType.value.toLocaleString('en-US')} occurrence${topType.value === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? latestSignal.signal.company_name : '\u2014',
      sub: latestSignal ? `${latestSignal.typeLabel} \u00b7 ${formatShortDate(latestSignal.date)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#2C2D33]">Stored Signals Dashboard</h2>
          <p className="mt-0.5 text-xs text-[#6D717F]">
            {totalSignals.toLocaleString('en-US')} signal{totalSignals === 1 ? '' : 's'} \u00b7 {matched.toLocaleString('en-US')} of{' '}
            {requested.toLocaleString('en-US')} companies matched
            {latestSeen > 0 ? ` \u00b7 Updated ${agoLabel(latestSeen)} ago` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded-lg border border-[#D6D9E0] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:border-[#1A73E8] disabled:opacity-60"
          >
            {refreshing ? 'Refreshing\u2026' : 'Refresh Signals'}
          </button>
          <button
            type="button"
            onClick={onImport}
            className="rounded-lg bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CB8]"
          >
            Import New List
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Stored signals sections" className="mt-4 flex overflow-x-auto border-b border-[#EDEFF3]">
        {TABS.map((t) => {
          const isActive = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8]/40 ${
                isActive ? 'border-[#1A73E8] text-[#1A73E8]' : 'border-transparent text-[#6D717F] hover:text-[#2C2D33]'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        enriched.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-[#EDEFF3] bg-white p-12 text-center">
            <p className="text-3xl" aria-hidden="true">\ud83d\udced</p>
            <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals found for this list</p>
            <p className="mt-1 text-xs text-[#6D717F]">Import a new list or refresh to fetch the latest stored signals.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {cards.map((c) => (
                <StatCard key={c.label} label={c.label} value={c.value} color={c.color} pills={c.pills} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#EDEFF3] bg-white p-5" aria-label="Weekly signal trend chart">
                <h3 className="text-sm font-semibold text-[#2C2D33]">Weekly Signal Trend</h3>
                <p className="mt-0.5 text-[11px] text-[#6D717F]">Click a bar to filter the Signal Feed to that week.</p>
                {weeklyData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#6D717F]">No signals in the last 90 days.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#EDEFF3" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#6D717F" tick={{ fill: '#6D717F', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#6D717F', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                        {SEVERITIES.map((sev) => (
                          <Bar
                            key={sev}
                            dataKey={sev}
                            stackId="sev"
                            fill={SEVERITY_COLORS[sev]}
                            className="cursor-pointer"
                            onClick={handleWeekClick}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-3 flex flex-wrap gap-4">
                  {SEVERITIES.map((sev) => (
                    <li key={sev} className="flex items-center gap-2 text-xs text-[#6D717F]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} aria-hidden="true" />
                      {sev}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-[#EDEFF3] bg-white p-5" aria-label="Signal type breakdown chart">
                <h3 className="text-sm font-semibold text-[#2C2D33]">Signal Type Breakdown</h3>
                <p className="mt-0.5 text-[11px] text-[#6D717F]">Click a segment or legend entry to filter the Signal Feed.</p>
                {typeBreakdown.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#6D717F]">No signal types yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={typeBreakdown}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          stroke="none"
                          className="cursor-pointer"
                          onClick={handleTypeClick}
                        >
                          {typeBreakdown.map((t) => (
                            <Cell key={t.name} fill={TYPE_COLORS[t.name] ?? '#6D717F'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {typeBreakdown.map((t) => (
                    <li key={t.name}>
                      <button
                        type="button"
                        onClick={() => setFeedType((prev) => (prev === t.name ? null : t.name))}
                        aria-pressed={feedType === t.name}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                          feedType === t.name ? 'border-[#1A73E8] bg-[#F3F8FE] text-[#1A73E8]' : 'border-[#EDEFF3] bg-white text-[#2C2D33] hover:border-[#D6D9E0]'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t.name] ?? '#6D717F' }} aria-hidden="true" />
                        {t.name} \u00b7 {t.value.toLocaleString('en-US')}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border border-[#EDEFF3] bg-white p-5" aria-label="Top industries by signal count chart">
              <h3 className="text-sm font-semibold text-[#2C2D33]">Top Industries by Signal Count</h3>
              <p className="mt-0.5 text-[11px] text-[#6D717F]">Click a bar to filter the Signals table to that industry.</p>
              {industryData.length === 0 ? (
                <p className="mt-10 text-center text-sm text-[#6D717F]">No industry data available for the matched companies.</p>
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#6D717F', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={150} stroke="#6D717F" tick={{ fill: '#2C2D33', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                      <Bar dataKey="value" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={18} className="cursor-pointer" onClick={handleIndustryClick} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#EDEFF3] bg-white" aria-label="Signal feed">
              <div className="flex flex-wrap items-center gap-2 border-b border-[#EDEFF3] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#2C2D33]">Signal Feed</h3>
                <span className="rounded-full border border-[#1A73E8]/40 bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-semibold text-[#1A73E8]">
                  {feedSignals.length.toLocaleString('en-US')}
                </span>
                {feedWeek && (
                  <button
                    type="button"
                    onClick={() => setFeedWeek(null)}
                    className="rounded-full border border-[#D6D9E0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#2C2D33] hover:border-[#F31A1A]/50"
                  >
                    Week of {weekLabel(feedWeek)} \u2715
                  </button>
                )}
                {feedType && (
                  <button
                    type="button"
                    onClick={() => setFeedType(null)}
                    className="rounded-full border border-[#D6D9E0] bg-white px-2 py-0.5 text-[11px] font-medium text-[#2C2D33] hover:border-[#F31A1A]/50"
                  >
                    {feedType} \u2715
                  </button>
                )}
                <span className="ml-auto text-[11px] text-[#6D717F]">Limited to the last 90 days</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {feedSignals.length === 0 ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-sm font-medium text-[#2C2D33]">No signals match the current feed filters</p>
                    <p className="mt-1 text-xs text-[#6D717F]">Clear the week or type filter, or check back after the next run.</p>
                  </div>
                ) : (
                  feedSignals.map((e) => (
                    <article key={e.signal.id} className="border-b border-[#EDEFF3] px-4 py-3 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[#2C2D33]">{e.signal.company_name}</span>
                        <TypeChip label={e.typeLabel} />
                        <SeverityBadge severity={e.severity} />
                        <span className="ml-auto text-xs text-[#6D717F]">{formatShortDate(e.date)}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-[#6D717F] line-clamp-2">{e.signal.summary}</p>
                      {e.links.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-3">
                          {e.links.map((l, i) => (
                            <a
                              key={`${l.url}-${i}`}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[#1A73E8] hover:underline"
                            >
                              {l.label} \u2197
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )
      )}

      {tab === 'companies' && (
        <div className="mt-6 rounded-2xl border border-[#EDEFF3] bg-white">
          <div className="max-h-[70vh] overflow-auto rounded-2xl">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership'].map((h, i) => (
                    <th
                      key={h}
                      className={`sticky top-0 z-10 border-b border-[#EDEFF3] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6D717F] ${
                        i >= 3 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#6D717F]">
                      No matched companies yet.
                    </td>
                  </tr>
                ) : (
                  topCompanies.map((c) => (
                    <tr key={c.company_id || c.company_key || c.company_name} className="border-b border-[#F1F2F5] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[#2C2D33]">
                        {c.company_name}
                        <div className="mt-1 h-1.5 w-32 rounded-full bg-[#F1F2F5]">
                          <div
                            className="h-1.5 rounded-full bg-[#1A73E8]"
                            style={{ width: `${Math.round((c.total / maxCompanyTotal) * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6D717F]">{c.industry || '\u2014'}</td>
                      <td className="px-4 py-3 text-[#6D717F]">{c.hq || '\u2014'}</td>
                      <td className="px-4 py-3 text-right text-[#2C2D33]">{c.total.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-right text-[#6D717F]">{c.by_family.funding.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-right text-[#6D717F]">{c.by_family.csuite.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-right text-[#6D717F]">{c.by_family.product.toLocaleString('en-US')}</td>
                      <td className="px-4 py-3 text-right text-[#6D717F]">{c.by_family.partnership.toLocaleString('en-US')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'signals' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#EDEFF3] bg-white p-4">
            <select
              aria-label="Filter by family"
              className={selectCls}
              value={famFilter}
              onChange={(e) => setFamFilter(e.target.value)}
            >
              <option value="all">All families</option>
              {FAMILIES.map((f) => (
                <option key={f} value={f}>{FAMILY_META[f].label}</option>
              ))}
            </select>
            <select
              aria-label="Filter by severity"
              className={selectCls}
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value as 'all' | Severity)}
            >
              <option value="all">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              aria-label="Filter by company"
              className={selectCls}
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="all">All companies</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="search"
              aria-label="Search signals"
              placeholder="Search signals\u2026"
              className={selectCls}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {industryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setIndustryFilter('all')}
                className="rounded-full border border-[#1A73E8]/40 bg-[#F3F8FE] px-3 py-1.5 text-xs font-medium text-[#1A73E8]"
              >
                Industry: {industryFilter} \u2715
              </button>
            )}
            <button
              type="button"
              onClick={clearTableFilters}
              className="rounded-lg border border-[#D6D9E0] px-3 py-1.5 text-sm text-[#6D717F] transition-colors hover:border-[#F31A1A]/50 hover:text-[#2C2D33]"
            >
              Clear
            </button>
            <span className="ml-auto text-xs text-[#6D717F]">
              {tableRows.length.toLocaleString('en-US')} of {enriched.length.toLocaleString('en-US')} signal{enriched.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="rounded-2xl border border-[#EDEFF3] bg-white">
            <div className="max-h-[70vh] overflow-auto rounded-2xl">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    {COLS.map((col) => (
                      <th
                        key={col.key}
                        className="sticky top-0 z-10 border-b border-[#EDEFF3] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          aria-label={`Sort by ${col.label}`}
                          className="transition-colors hover:text-[#2C2D33]"
                        >
                          {col.label}
                          {sortKey === col.key && <span aria-hidden="true"> {sortDir === 'asc' ? '\u25b2' : '\u25bc'}</span>}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={COLS.length} className="px-4 py-12 text-center text-sm text-[#6D717F]">
                        No signals match your search or filters.
                      </td>
                    </tr>
                  ) : (
                    tableRows.map((e) => (
                      <Fragment key={e.signal.id}>
                        <tr
                          tabIndex={0}
                          onClick={() => setExpandedId((prev) => (prev === e.signal.id ? null : e.signal.id))}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter' || ev.key === ' ') {
                              setExpandedId((prev) => (prev === e.signal.id ? null : e.signal.id))
                            }
                          }}
                          className="cursor-pointer border-b border-[#F1F2F5] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none"
                        >
                          <td className="px-4 py-3 font-medium text-[#2C2D33]">{e.signal.company_name}</td>
                          <td className="px-4 py-3"><FamilyBadge family={e.signal.signal_family} /></td>
                          <td className="px-4 py-3"><TypeChip label={e.typeLabel} /></td>
                          <td className="px-4 py-3"><SeverityBadge severity={e.severity} /></td>
                          <td className="px-4 py-3 text-[#6D717F]">{formatShortDate(e.date)}</td>
                        </tr>
                        {expandedId === e.signal.id && (
                          <tr>
                            <td colSpan={COLS.length} className="border-b border-[#F1F2F5] bg-[#F7F8F9] px-4 py-3">
                              <p className="text-sm leading-relaxed text-[#2C2D33]">{e.signal.summary}</p>
                              {detailEntries(e.signal).length > 0 && (
                                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                                  {detailEntries(e.signal).map(([k, v]) => (
                                    <div key={k} className="text-xs">
                                      <dt className="inline font-medium text-[#6D717F]">{k}: </dt>
                                      <dd className="inline text-[#2C2D33]">{v}</dd>
                                    </div>
                                  ))}
                                </dl>
                              )}
                              {e.links.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-3">
                                  {e.links.map((l, i) => (
                                    <a
                                      key={`${l.url}-${i}`}
                                      href={l.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs font-medium text-[#1A73E8] hover:underline"
                                    >
                                      {l.label} \u2197
                                    </a>
                                  ))}
                                </div>
                              )}
                              <p className="mt-2 text-[11px] text-[#6D717F]">
                                First seen {formatLongDateTime(e.signal.first_seen_at)} \u00b7 Last seen{' '}
                                {formatLongDateTime(e.signal.last_seen_at)} \u00b7 Seen {e.signal.seen_count.toLocaleString('en-US')} time
                                {e.signal.seen_count === 1 ? '' : 's'}
                              </p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'trends' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="Family legend">
            {FAMILIES.map((f) => (
              <span
                key={f}
                className="flex items-center gap-2 rounded-full border border-[#EDEFF3] bg-white px-3 py-1.5 text-xs font-medium text-[#2C2D33]"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                {FAMILY_META[f].label}
              </span>
            ))}
          </div>
          <section className="rounded-2xl border border-[#EDEFF3] bg-white p-5" aria-label="Signals by month chart">
            <h3 className="text-sm font-semibold text-[#2C2D33]">Signals by Month</h3>
            {trendData.length === 0 ? (
              <p className="mt-16 text-center text-sm text-[#6D717F]">No monthly trend data yet.</p>
            ) : (
              <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#EDEFF3" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="#6D717F" tick={{ fill: '#6D717F', fontSize: 12 }} />
                    <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#6D717F', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    {FAMILIES.map((f) => (
                      <Area
                        key={f}
                        type="monotone"
                        dataKey={f}
                        name={FAMILY_META[f].label}
                        stackId="fam"
                        stroke={FAMILY_META[f].color}
                        fill={FAMILY_META[f].color}
                        fillOpacity={0.25}
                        strokeWidth={2}
                        dot
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'insights' && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {insightTiles.map((t) => (
              <div key={t.label} className="rounded-2xl border border-[#EDEFF3] bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6D717F]">{t.label}</p>
                <p className="mt-1 truncate text-xl font-semibold" style={{ color: t.accent }}>{t.value}</p>
                <p className="mt-0.5 text-xs text-[#6D717F]">{t.sub}</p>
              </div>
            ))}
          </div>

          {recentHigh.length === 0 ? (
            <div className="rounded-2xl border border-[#EDEFF3] bg-white p-12 text-center">
              <p className="text-3xl" aria-hidden="true">\ud83d\udca1</p>
              <p className="mt-3 text-sm font-medium text-[#2C2D33]">No high-severity insights yet</p>
              <p className="mt-1 text-xs text-[#6D717F]">Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.</p>
            </div>
          ) : (
            <section aria-label="High severity insights" className="space-y-3">
              <h3 className="text-sm font-semibold text-[#2C2D33]">
                High-Severity Signals \u00b7 {recentHigh.length.toLocaleString('en-US')}
              </h3>
              {recentHigh.slice(0, 20).map((e) => (
                <article key={e.signal.id} className="rounded-2xl border border-[#EDEFF3] bg-white p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[#2C2D33]">{e.signal.company_name}</span>
                    <FamilyBadge family={e.signal.signal_family} />
                    <TypeChip label={e.typeLabel} />
                    <SeverityBadge severity={e.severity} />
                    <span className="ml-auto text-xs text-[#6D717F]">{formatShortDate(e.date)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#6D717F]">{e.signal.summary}</p>
                  {e.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {e.links.map((l, i) => (
                        <a
                          key={`${l.url}-${i}`}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-[#1A73E8] hover:underline"
                        >
                          {l.label} \u2197
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
