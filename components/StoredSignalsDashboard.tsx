"use client"

import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Family,
  KpiPill,
  NormalizedSeverity,
  SourceLink,
  StoredCompany,
  StoredDashboardTotals,
  StoredSignal,
  StoredSignalsResult,
  TabKey,
} from '@/lib/types'
import TabBar from '@/components/TabBar'
import KpiCard from '@/components/KpiCard'
import {
  FAMILIES,
  FAMILY_META,
  NO_SIGNIFICANT_SIGNAL,
  formatDate,
  formatNumber,
  getStoredSourceLinks,
  normalizeStoredSeverity,
  relativeTime,
  storedDisplayType,
  storedSignalDate,
} from '@/lib/utils'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface StoredSignalsDashboardProps {
  result: StoredSignalsResult
  onRefresh?: () => void | Promise<void>
}

interface EnrichedSignal {
  s: StoredSignal
  severity: NormalizedSeverity
  displayType: string
  dateIso: string
  timestamp: number
  weekKey: string
  industry: string
  links: SourceLink[]
}

interface CompanyRowData {
  key: string
  company: StoredCompany
  signals: EnrichedSignal[]
  latest: EnrichedSignal | null
  techStack: string[]
  keywords: string[]
}

interface StoredCardDef {
  icon: string
  label: string
  value: number | null
  accent: string
  spark: number[]
  pills?: KpiPill[]
}

interface WeekBucket {
  key: string
  label: string
  count: number
}

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E3E5',
  borderRadius: 8,
  color: '#2C2D33',
  fontSize: 12,
}

const SEVERITY_COLORS: Record<NormalizedSeverity, string> = {
  HIGH: '#FF5252',
  MEDIUM: '#FB8145',
  LOW: '#9AA0AE',
}

const OVERVIEW_SEVERITY_COLORS: Record<NormalizedSeverity, string> = {
  HIGH: '#F31A1A',
  MEDIUM: '#FB8145',
  LOW: '#3BC884',
}

const SEVERITIES: NormalizedSeverity[] = ['HIGH', 'MEDIUM', 'LOW']

const TYPE_COLOR_ORDER = [
  'C-Suite Join',
  'C-Suite Exit',
  'Funding Round',
  'Acquisition / M&A',
  'IPO',
  'Product Launch',
  'Partnership',
  'News Mention',
  'Creative Hiring',
]

const TYPE_PALETTE = ['#B364D7', '#F8528F', '#3BC884', '#FB8145', '#DFC612', '#00A7D6', '#1A73E8', '#6D717F', '#FF5252']

function typeColor(label: string): string {
  const i = TYPE_COLOR_ORDER.indexOf(label)
  if (i === -1) return '#6D717F'
  return TYPE_PALETTE[i] ?? '#6D717F'
}

function weekKeyOf(d: Date): string {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  const y = copy.getFullYear()
  const m = String(copy.getMonth() + 1).padStart(2, '0')
  const dd = String(copy.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function weekLabel(wk: string): string {
  const d = new Date(wk)
  if (Number.isNaN(d.getTime())) return wk
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function activeLabelOf(state: unknown): string | null {
  if (typeof state === 'object' && state !== null && 'activeLabel' in state) {
    const label = (state as { activeLabel?: unknown }).activeLabel
    if (typeof label === 'string' && label !== '') return label
  }
  return null
}

function extraField(c: StoredCompany, keys: string[]): string {
  const rec = c as unknown as Record<string, unknown>
  for (const k of keys) {
    const v = rec[k]
    if (typeof v === 'string' && v.trim() !== '') return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  }
  return '\u2014'
}

function extraList(c: StoredCompany, keys: string[]): string[] {
  const rec = c as unknown as Record<string, unknown>
  for (const k of keys) {
    const v = rec[k]
    if (Array.isArray(v)) {
      const out = v
        .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
        .map((x) => x.trim())
      if (out.length > 0) return out
    }
    if (typeof v === 'string' && v.trim() !== '' && v.trim().toUpperCase() !== 'N/A') {
      const out = v
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter((x) => x !== '')
      if (out.length > 0) return out
    }
  }
  return []
}

function industryOf(c: StoredCompany): string {
  const v = (c.industry ?? '').trim()
  return v !== '' ? v : '\u2014'
}

function companyNameOf(s: StoredSignal): string {
  const primary = (s.company_name ?? '').trim()
  if (primary !== '') return primary
  const secondary = (s.company ?? '').trim()
  return secondary !== '' ? secondary : '\u2014'
}

function familyOf(e: EnrichedSignal): string {
  return (e.s.signal_family ?? '').toLowerCase()
}

function splitHeadline(summary: string): { headline: string; description: string } {
  const text = summary.trim()
  const idx = text.indexOf('. ')
  if (idx > 10 && idx < 140) {
    return { headline: text.slice(0, idx + 1), description: text.slice(idx + 2) }
  }
  return { headline: text, description: '' }
}

function SeverityBadge({ severity }: { severity: NormalizedSeverity }) {
  const color = SEVERITY_COLORS[severity]
  return (
    <span
      className='inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide'
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      {severity}
    </span>
  )
}

function TypeBadge({ label }: { label: string }) {
  const color = typeColor(label)
  return (
    <span className='inline-flex items-center gap-1.5 rounded-full border border-[#E2E3E5] bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-medium text-[#575A66]'>
      <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: color }} aria-hidden='true' />
      {label}
    </span>
  )
}

function SignalRow({ e }: { e: EnrichedSignal }) {
  return (
    <article className='rounded-2xl border border-[#E2E3E5] bg-white p-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-medium text-[#2C2D33]'>{companyNameOf(e.s)}</span>
        <TypeBadge label={e.displayType} />
        <SeverityBadge severity={e.severity} />
        <span className='ml-auto text-xs text-[#8A8D99]'>{formatDate(e.dateIso)}</span>
      </div>
      {e.s.summary !== '' && (
        <p className='mt-2 text-sm leading-relaxed text-[#575A66]'>{e.s.summary}</p>
      )}
      {e.links.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-3'>
          {e.links.map((l, i) => (
            <a
              key={`${l.url}-${i}`}
              href={l.url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs font-medium text-[#1A73E8] hover:underline'
            >
              {l.name} {'\u2197'}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

function OverviewSignalRow({ e, company }: { e: EnrichedSignal; company: StoredCompany | undefined }) {
  const color = OVERVIEW_SEVERITY_COLORS[e.severity]
  const { headline, description } = splitHeadline(e.s.summary ?? '')
  const website = (company?.website ?? '').trim()
  const location = (company?.hq ?? '').trim()
  const source = e.links[0]
  const d = new Date(e.dateIso)
  const dateLabel = Number.isNaN(d.getTime())
    ? '\u2014'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <article className='rounded-xl border border-[#E2E3E5] border-l-4 bg-white p-4' style={{ borderLeftColor: color }}>
      <div className='flex flex-wrap items-center gap-2'>
        <span
          className='inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white'
          style={{ backgroundColor: color }}
        >
          {e.severity}
        </span>
        <TypeBadge label={e.displayType} />
        <span className='ml-auto text-xs text-[#8A8D99]'>{dateLabel}</span>
      </div>
      <div className='mt-2'>
        {website !== '' ? (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm font-bold text-[#1A73E8] hover:underline'
          >
            {companyNameOf(e.s)}
          </a>
        ) : (
          <span className='text-sm font-bold text-[#1A73E8]'>{companyNameOf(e.s)}</span>
        )}
      </div>
      {headline !== '' && <p className='mt-1 text-sm font-semibold text-[#2C2D33]'>{headline}</p>}
      {description !== '' && <p className='mt-1 text-sm leading-relaxed text-[#575A66] line-clamp-2'>{description}</p>}
      <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
        {e.industry !== '\u2014' && (
          <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 font-medium text-[#155CBA]'>
            {e.industry}
          </span>
        )}
        {location !== '' && <span className='text-[#8A8D99]'>{location}</span>}
        {source && (
          <a href={source.url} target='_blank' rel='noopener noreferrer' className='font-medium text-[#1A73E8] hover:underline'>
            {source.name}
          </a>
        )}
      </div>
    </article>
  )
}

const CARD_TYPE_FILTER: Record<string, string | undefined> = {
  Funding: 'Funding Round',
  'Mergers & Acquisitions': 'Acquisition / M&A',
  IPO: 'IPO',
  News: 'News Mention',
  'Product Launches': 'Product Launch',
  Partnerships: 'Partnership',
  'Creative Hiring': 'Creative Hiring',
}

const selectCls =
  'rounded-lg border border-[#E2E3E5] bg-white px-2 py-1.5 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none'

function CompanyInfoSection({ company }: { company: StoredCompany }) {
  const website = (company.website ?? '').trim()
  const linkedin = (company.linkedin_url ?? '').trim()
  const domain = (company.domain ?? '').trim()
  const description = (company.short_description ?? '').trim()
  const locationParts = [company.city, company.state, company.country]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p !== '')
  const location =
    locationParts.length > 0
      ? locationParts.join(', ')
      : (company.hq ?? '').trim() !== ''
        ? (company.hq ?? '').trim()
        : ''

  const facts: { label: string; value: string; href?: string }[] = [
    {
      label: 'Website',
      value: website !== '' ? website : '\u2014',
      href: website !== '' ? (website.startsWith('http') ? website : `https://${website}`) : undefined,
    },
    { label: 'Domain', value: domain !== '' ? domain : '\u2014' },
    { label: 'Industry', value: industryOf(company) },
    { label: 'HQ / Location', value: location !== '' ? location : '\u2014' },
    { label: 'Employees', value: extraField(company, ['employees', 'employee_count']) },
    { label: 'Founded', value: extraField(company, ['founded_year', 'foundedYear']) },
    {
      label: 'LinkedIn',
      value: linkedin !== '' ? linkedin : '\u2014',
      href: linkedin !== '' ? linkedin : undefined,
    },
    { label: 'Account stage', value: extraField(company, ['account_stage', 'accountStage']) },
    { label: 'Account owner', value: extraField(company, ['account_owner', 'accountOwner']) },
    { label: 'Status', value: extraField(company, ['status']) },
    { label: 'Analyses', value: extraField(company, ['analysis_count', 'analysisCount']) },
    {
      label: 'First seen',
      value:
        (company.first_seen_at ?? '').trim() !== ''
          ? formatDate(company.first_seen_at as string)
          : '\u2014',
    },
    {
      label: 'Last analysed',
      value:
        (company.last_analysed_at ?? '').trim() !== ''
          ? formatDate(company.last_analysed_at as string)
          : '\u2014',
    },
  ]

  return (
    <section
      aria-label={`Company info for ${company.company_name}`}
      className='rounded-xl border border-[#E2E3E5] bg-white p-4'
    >
      <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>Company info</h3>
      <p className='mt-1 text-sm font-semibold text-[#2C2D33]'>{company.company_name}</p>
      {description !== '' && (
        <p className='mt-2 text-sm leading-relaxed text-[#575A66]'>{description}</p>
      )}
      <dl className='mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline justify-between gap-2'>
            <dt className='shrink-0 text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]'>{f.label}</dt>
            <dd className='truncate text-right text-xs text-[#2C2D33]'>
              {f.href ? (
                <a href={f.href} target='_blank' rel='noopener noreferrer' className='text-[#1A73E8] hover:underline'>
                  {f.value}
                </a>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function TrashIcon() {
  return (
    <svg
      width='16'
      height='16'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <polyline points='3 6 5 6 21 6' />
      <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' />
      <line x1='10' y1='11' x2='10' y2='17' />
      <line x1='14' y1='11' x2='14' y2='17' />
    </svg>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label={title}>
      <h2 className='text-sm font-semibold text-[#575A66]'>{title}</h2>
      {children}
    </section>
  )
}

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const companyByKey = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of result.companies ?? []) {
      if ((c.company_key ?? '') !== '') map.set(c.company_key, c)
      if ((c.company_id ?? '') !== '') map.set(c.company_id, c)
    }
    return map
  }, [result.companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    return result.signals
      .filter((s) => (s.signal_type ?? '').toUpperCase() !== NO_SIGNIFICANT_SIGNAL)
      .map((s) => {
        const dateIso = storedSignalDate(s)
        const d = new Date(dateIso)
        const valid = !Number.isNaN(d.getTime())
        const company = companyByKey.get(s.company_key) ?? companyByKey.get(s.company_id)
        return {
          s,
          severity: normalizeStoredSeverity(s),
          displayType: storedDisplayType(s),
          dateIso,
          timestamp: valid ? d.getTime() : 0,
          weekKey: valid ? weekKeyOf(d) : '',
          industry: company ? industryOf(company) : '\u2014',
          links: getStoredSourceLinks(s),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [result.signals, companyByKey])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const byKey = new Map<string, EnrichedSignal[]>()
    for (const e of enriched) {
      const key = (e.s.company_key ?? '') !== '' ? e.s.company_key : e.s.company_id
      const arr = byKey.get(key)
      if (arr) arr.push(e)
      else byKey.set(key, [e])
    }
    return (result.companies ?? [])
      .map((company) => {
        const key = (company.company_key ?? '') !== '' ? company.company_key : company.company_id
        const signals = byKey.get(key) ?? []
        return {
          key,
          company,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(company, ['tech_stack', 'techStack', 'technologies']),
          keywords: extraList(company, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [enriched, result.companies])

  const handleDeleteCompany = async (company: StoredCompany, rowKey: string) => {
    const name = (company.company_name ?? '').trim() || 'this company'
    const confirmed = window.confirm(
      `Delete "${name}"?\n\nThis will remove the company from tracking. This cannot be undone.`
    )
    if (!confirmed) return

    setDeleteError(null)
    setDeletingKey(rowKey)
    try {
      const res = await fetch('/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: name,
          companyId: company.company_id ?? '',
          confirm: true,
          signalsOnly: false,
        }),
      })
      let json: { error?: string } = {}
      try {
        json = (await res.json()) as { error?: string }
      } catch {
        json = {}
      }
      if (!res.ok) {
        setDeleteError(json.error ?? `Delete failed with status ${res.status}`)
        return
      }
      if (expandedCompany === rowKey) setExpandedCompany(null)
      if (onRefresh) await onRefresh()
    } catch {
      setDeleteError('Could not reach the delete API. Please try again.')
    } finally {
      setDeletingKey(null)
    }
  }

  const countsByType = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) {
      map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    }
    return map
  }, [enriched])

  const severityCounts = useMemo(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const e of enriched) {
      counts[e.severity] += 1
    }
    return counts
  }, [enriched])

  const weekBuckets = useMemo<WeekBucket[]>(() => {
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
    const now = new Date()
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const key = weekKeyOf(d)
      index.set(key, buckets.length)
      buckets.push({ key, label: weekLabel(key), count: 0 })
    }
    for (const e of enriched) {
      const pos = index.get(e.weekKey)
      if (pos !== undefined) {
        const bucket = buckets[pos]
        if (bucket) bucket.count += 1
      }
    }
    return buckets
  }, [enriched])

  const weekSpark = useMemo(() => weekBuckets.map((w) => w.count), [weekBuckets])

  const typePieData = useMemo(
    () =>
      Array.from(countsByType.entries())
        .map(([type, count]) => ({ type, count, color: typeColor(type) }))
        .sort((a, b) => b.count - a.count),
    [countsByType]
  )

  const typePieTotal = typePieData.reduce((acc, t) => acc + t.count, 0)

  const familyData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        label: FAMILY_META[f].label,
        count: enriched.filter((e) => familyOf(e) === f).length,
        color: FAMILY_META[f].color,
      })),
    [enriched]
  )

  const topCompanies = useMemo(
    () =>
      companyRows
        .filter((r) => r.signals.length > 0)
        .slice(0, 10)
        .map((r) => ({ company: r.company.company_name, count: r.signals.length })),
    [companyRows]
  )

  const signalTypeOptions = useMemo(() => Array.from(countsByType.keys()).sort(), [countsByType])

  const filteredSignals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return enriched.filter((e) => {
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (q !== '') {
        const { headline, description } = splitHeadline(e.s.summary ?? '')
        const haystack = `${companyNameOf(e.s)} ${headline} ${description} ${e.s.summary ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [enriched, familyFilter, severityFilter, typeFilter, searchQuery])

  const highSignals = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])

  const feedSignals = useMemo(
    () => enriched.filter((e) => (feedWeek === null ? true : e.weekKey === feedWeek)).slice(0, 30),
    [enriched, feedWeek]
  )

  const glance = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const companies = new Set<string>()
    let last7 = 0
    for (const e of enriched) {
      companies.add(companyNameOf(e.s))
      if (e.timestamp >= cutoff) last7 += 1
    }
    return { total: enriched.length, last7, companies: companies.size }
  }, [enriched])

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const companiesTracked =
    typeof dash.companies_tracked === 'number'
      ? dash.companies_tracked
      : typeof dash.total_companies === 'number'
        ? dash.total_companies
        : (result.companies ?? []).length

  const typeCount = (label: string): number => countsByType.get(label) ?? 0

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: companiesTracked, accent: '#00A7D6', spark: weekSpark },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: enriched.length,
      accent: '#1A73E8',
      spark: weekSpark,
      pills: [
        { label: 'H', value: severityCounts.HIGH, color: '#F31A1A' },
        { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
        { label: 'L', value: severityCounts.LOW, color: '#3BC884' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: weekSpark },
    {
      icon: '\u{1F454}',
      label: 'C-Suite Changes',
      value: typeCount('C-Suite Join') + typeCount('C-Suite Exit'),
      accent: '#B364D7',
      spark: weekSpark,
    },
    { icon: '\u{1F4B0}', label: 'Funding', value: typeCount('Funding Round'), accent: '#3BC884', spark: weekSpark },
    {
      icon: '\u{1F91D}',
      label: 'Mergers & Acquisitions',
      value: typeCount('Acquisition / M&A'),
      accent: '#FB8145',
      spark: weekSpark,
    },
    { icon: '\u{1F4C8}', label: 'IPO', value: typeCount('IPO'), accent: '#DFC612', spark: weekSpark },
    { icon: '\u{1F680}', label: 'Product Launches', value: typeCount('Product Launch'), accent: '#00A7D6', spark: weekSpark },
    { icon: '\u{1F517}', label: 'Partnerships', value: typeCount('Partnership'), accent: '#F8528F', spark: weekSpark },
  ]

  const handleCardClick = (label: string) => {
    const mapped = CARD_TYPE_FILTER[label]
    setTypeFilter(mapped ?? 'all')
    setFamilyFilter(label === 'C-Suite Changes' ? 'csuite' : 'all')
    setSeverityFilter(label === 'High Alerts' ? 'HIGH' : 'all')
    setTab('signals')
  }

  const clearFilters = () => {
    setFamilyFilter('all')
    setSeverityFilter('all')
    setTypeFilter('all')
    setSearchQuery('')
  }

  const handleWeekBarClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (label === null) return
    const bucket = weekBuckets.find((w) => w.label === label)
    if (!bucket) return
    setFeedWeek((prev) => (prev === bucket.key ? null : bucket.key))
  }

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />
      <div className='mx-auto max-w-7xl px-4 py-6' role='tabpanel' aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
              {cards.map((c) => (
                <KpiCard
                  key={c.label}
                  icon={c.icon}
                  label={c.label}
                  value={c.value}
                  accent={c.accent}
                  sparkData={c.spark}
                  pills={c.pills}
                  onClick={() => handleCardClick(c.label)}
                />
              ))}
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <ChartCard title='Weekly Signal Trend (8 Weeks)'>
                {enriched.length === 0 ? (
                  <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
                ) : (
                  <>
                    <div className='mt-2 h-56'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={weekBuckets} margin={{ top: 10, right: 16, bottom: 0, left: 0 }} onClick={handleWeekBarClick}>
                          <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                          <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                          <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                          <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                            {weekBuckets.map((w) => (
                              <Cell key={w.key} fill={feedWeek === w.key ? '#155CBA' : '#1A73E8'} cursor='pointer' />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to filter the recent signal feed by that week.</p>
                  </>
                )}
              </ChartCard>
              <ChartCard title='Signal Type Breakdown'>
                {typePieTotal === 0 ? (
                  <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
                ) : (
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie data={typePieData} dataKey='count' nameKey='type' innerRadius={45} outerRadius={80} paddingAngle={2} stroke='#FFFFFF'>
                          {typePieData.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title='Severity Mix'>
                {enriched.length === 0 ? (
                  <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
                ) : (
                  <>
                    <div className='mt-2 h-44'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Pie
                            data={SEVERITIES.map((sev) => ({ name: sev, value: severityCounts[sev] }))}
                            dataKey='value'
                            nameKey='name'
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            stroke='#FFFFFF'
                          >
                            {SEVERITIES.map((sev) => (
                              <Cell key={sev} fill={OVERVIEW_SEVERITY_COLORS[sev]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className='mt-3 flex flex-wrap gap-4'>
                      {SEVERITIES.map((sev) => (
                        <li key={sev} className='flex items-center gap-2 text-xs text-[#575A66]'>
                          <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: OVERVIEW_SEVERITY_COLORS[sev] }} aria-hidden='true' />
                          {sev} {'\u00b7'} <span className='text-[#2C2D33]'>{severityCounts[sev]}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </ChartCard>
            </div>
            <section aria-label='Recent signal feed' className='space-y-3'>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                {feedWeek !== null && (
                  <button
                    type='button'
                    onClick={() => setFeedWeek(null)}
                    className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
                  >
                    Week of {weekLabel(feedWeek)} {'\u2715'}
                  </button>
                )}
                <span className='ml-auto text-xs text-[#8A8D99]'>
                  {feedSignals.length} of {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'}
                </span>
              </div>
              {feedSignals.length === 0 ? (
                <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                  <p className='text-sm font-medium text-[#2C2D33]'>No signals in this period</p>
                  <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing the week filter or run a new analysis.</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {feedSignals.map((e, i) => (
                    <OverviewSignalRow
                      key={`${e.s.id}-${i}`}
                      e={e}
                      company={companyByKey.get(e.s.company_key) ?? companyByKey.get(e.s.company_id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
            {deleteError !== null && (
              <div className='border-b border-[#FAA3A3] bg-[#FFF3F3] px-4 py-3 text-xs text-[#921010]' role='alert'>
                {deleteError}
              </div>
            )}
            <div className='max-h-[70vh] overflow-auto rounded-2xl'>
              <table className='w-full min-w-[820px] text-sm'>
                <thead>
                  <tr>
                    {['Company', 'Industry', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Latest Signal', ''].map((h, i) => (
                      <th
                        key={h === '' ? 'actions' : h}
                        className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                          i >= 2 && h !== '' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companyRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                        No companies tracked yet. Import a company list to get started.
                      </td>
                    </tr>
                  ) : (
                    companyRows.map((r) => {
                      const expanded = expandedCompany === r.key
                      const isDeleting = deletingKey === r.key
                      return (
                        <Fragment key={r.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => setExpandedCompany(expanded ? null : r.key)}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') setExpandedCompany(expanded ? null : r.key)
                            }}
                            className='cursor-pointer border-b border-[#F0F1F2] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none'
                          >
                            <td className='px-4 py-3 font-medium text-[#2C2D33]'>
                              <span className='inline-flex items-center gap-2'>
                                <span
                                  aria-hidden='true'
                                  className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${
                                    expanded ? 'rotate-90' : ''
                                  }`}
                                >
                                  {'\u25B6'}
                                </span>
                                {r.company.company_name}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-[#575A66]'>{industryOf(r.company)}</td>
                            <td className='px-4 py-3 text-right text-[#2C2D33]'>{r.signals.length}</td>
                            <td className='px-4 py-3 text-right text-[#575A66]'>{r.company.by_family.funding}</td>
                            <td className='px-4 py-3 text-right text-[#575A66]'>{r.company.by_family.csuite}</td>
                            <td className='px-4 py-3 text-right text-[#575A66]'>{r.company.by_family.product}</td>
                            <td className='px-4 py-3 text-right text-[#575A66]'>{r.company.by_family.partnership}</td>
                            <td className='px-4 py-3 text-right text-[#8A8D99]'>{r.latest ? relativeTime(r.latest.dateIso) : '\u2014'}</td>
                            <td className='px-2 py-3 text-right'>
                              <button
                                type='button'
                                aria-label={`Delete ${r.company.company_name}`}
                                disabled={isDeleting || deletingKey !== null}
                                title='Delete company'
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  void handleDeleteCompany(r.company, r.key)
                                }}
                                className='inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A8D99] transition-colors hover:bg-[#FFF3F3] hover:text-[#F31A1A] disabled:opacity-50'
                              >
                                {isDeleting ? (
                                  <span className='text-[10px] font-semibold text-[#F31A1A]'>…</span>
                                ) : (
                                  <TrashIcon />
                                )}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className='border-b border-[#F0F1F2] last:border-b-0'>
                              <td colSpan={9} className='bg-[#F7F8F9] px-6 py-5'>
                                <div className='grid gap-4 lg:grid-cols-2'>
                                  <CompanyInfoSection company={r.company} />
                                  <div className='space-y-3'>
                                    {(r.techStack.length > 0 || r.keywords.length > 0) && (
                                      <div className='rounded-xl border border-[#E2E3E5] bg-white p-4'>
                                        {r.techStack.length > 0 && (
                                          <div>
                                            <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>Tech stack</h3>
                                            <div className='mt-2 flex flex-wrap gap-1.5'>
                                              {r.techStack.map((t) => (
                                                <span key={t} className='rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                                                  {t}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {r.keywords.length > 0 && (
                                          <div className={r.techStack.length > 0 ? 'mt-3' : ''}>
                                            <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>Keywords</h3>
                                            <div className='mt-2 flex flex-wrap gap-1.5'>
                                              {r.keywords.map((k) => (
                                                <span key={k} className='rounded-full bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-medium text-[#575A66]'>
                                                  {k}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>Signal history</h3>
                                    {r.signals.length === 0 ? (
                                      <p className='rounded-xl border border-[#E2E3E5] bg-white p-4 text-xs text-[#8A8D99]'>
                                        No signals recorded for this company yet.
                                      </p>
                                    ) : (
                                      r.signals.slice(0, 10).map((e, i) => <SignalRow key={`${e.s.id}-${i}`} e={e} />)
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'signals' && (
          <div className='space-y-4'>
            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='At a glance stats'>
              <div className='grid grid-cols-3 gap-3'>
                <div>
                  <div className='text-3xl font-semibold text-[#2C2D33]'>{formatNumber(glance.total)}</div>
                  <div className='mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]'>total signals</div>
                </div>
                <div>
                  <div className='text-3xl font-semibold text-[#2C2D33]'>{formatNumber(glance.last7)}</div>
                  <div className='mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]'>in the last 7 days</div>
                </div>
                <div>
                  <div className='text-3xl font-semibold text-[#2C2D33]'>{formatNumber(glance.companies)}</div>
                  <div className='mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]'>companies with signals</div>
                </div>
              </div>
            </section>

            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <input
                type='text'
                aria-label='Search signals'
                placeholder='Search signals'
                className={selectCls}
                value={searchQuery}
                onChange={(ev) => setSearchQuery(ev.target.value)}
              />
              <select
                aria-label='Filter by family'
                className={selectCls}
                value={familyFilter}
                onChange={(ev) => setFamilyFilter(ev.target.value as 'all' | Family)}
              >
                <option value='all'>All families</option>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_META[f].label}
                  </option>
                ))}
              </select>
              <select
                aria-label='Filter by signal type'
                className={selectCls}
                value={typeFilter}
                onChange={(ev) => setTypeFilter(ev.target.value)}
              >
                <option value='all'>All types</option>
                {signalTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                aria-label='Filter by severity'
                className={selectCls}
                value={severityFilter}
                onChange={(ev) => setSeverityFilter(ev.target.value as 'all' | NormalizedSeverity)}
              >
                <option value='all'>All severities</option>
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </select>
              <button
                type='button'
                onClick={clearFilters}
                className='rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
              >
                Clear
              </button>
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {formatNumber(filteredSignals.length)} of {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>
                  {'\u{1F50D}'}
                </p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try a different search or clear the filters.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {filteredSignals.slice(0, 200).map((e, i) => (
                  <SignalRow key={`${e.s.id}-${i}`} e={e} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <ChartCard title='Weekly Signal Trend (8 Weeks)'>
              {enriched.length === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weekBuckets} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Signals by Category'>
              {enriched.length === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={familyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                        {familyData.map((f) => (
                          <Cell key={f.family} fill={f.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Top 10 Companies by Signal Count'>
              {topCompanies.length === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={topCompanies} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                      <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis type='category' dataKey='company' width={150} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#00A7D6' radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Signal Type Breakdown'>
              {typePieTotal === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 flex flex-col gap-4 sm:flex-row sm:items-center'>
                  <div className='h-64 w-full sm:w-1/2'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie data={typePieData} dataKey='count' nameKey='type' innerRadius={50} outerRadius={85} paddingAngle={2} stroke='#FFFFFF'>
                          {typePieData.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                    {typePieData.map((t) => {
                      const pct = ((t.count / typePieTotal) * 100).toFixed(1)
                      return (
                        <li key={t.type} className='flex items-center gap-2 text-xs text-[#575A66]'>
                          <span className='h-2 w-2 shrink-0 rounded-full' style={{ backgroundColor: t.color }} aria-hidden='true' />
                          <span className='truncate'>{t.type}</span>
                          <span className='ml-auto shrink-0 text-[#8A8D99]'>
                            {t.count} {'\u00b7'} {pct}%
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {tab === 'insights' &&
          (highSignals.length === 0 ? (
            <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
              <p className='text-3xl' aria-hidden='true'>
                {'\u{1F4A1}'}
              </p>
              <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
              <p className='mt-1 text-xs text-[#8A8D99]'>
                Insights list HIGH-severity signals only. Check the Signals tab for the full feed.
              </p>
            </div>
          ) : (
            <div className='space-y-3'>
              <p className='text-xs text-[#8A8D99]'>
                {formatNumber(highSignals.length)} high-severity signal{highSignals.length === 1 ? '' : 's'}
              </p>
              {highSignals.slice(0, 100).map((e, i) => (
                <SignalRow key={`${e.s.id}-${i}`} e={e} />
              ))}
            </div>
          ))}
      </div>
    </div>
  )
}
