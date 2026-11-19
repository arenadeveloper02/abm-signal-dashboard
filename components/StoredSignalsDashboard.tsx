"use client"

import { Fragment, useMemo, useState } from 'react'
import type {
  StoredFamily,
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
  FAMILY_META,
  NO_SIGNIFICANT_SIGNAL,
  familiesForHiring,
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
  family?: StoredFamily
  target?: TabKey
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
  'Hiring',
  'News Mention',
  'Creative Hiring',
]

const TYPE_PALETTE = ['#B364D7', '#F8528F', '#3BC884', '#FB8145', '#DFC612', '#00A7D6', '#7B61FF', '#1A73E8', '#6D717F', '#FF5252']

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
  if (e.displayType === 'Hiring') return 'hiring'
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

function isSignificant(s: StoredSignal): boolean {
  const t = (s.signal_type ?? '').trim().toUpperCase()
  const k = (s.signal_key ?? '').trim().toUpperCase()
  return t !== NO_SIGNIFICANT_SIGNAL && k !== NO_SIGNIFICANT_SIGNAL
}

function companyKeyOf(c: StoredCompany): string {
  const k = (c.company_key ?? '').trim()
  if (k !== '') return k.toLowerCase()
  const id = (c.company_id ?? '').trim()
  if (id !== '') return id.toLowerCase()
  return (c.company_name ?? '').trim().toLowerCase()
}

function signalCompanyKey(s: StoredSignal): string {
  const k = (s.company_key ?? '').trim()
  if (k !== '') return k.toLowerCase()
  const id = (s.company_id ?? '').trim()
  if (id !== '') return id.toLowerCase()
  return companyNameOf(s).toLowerCase()
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

const selectCls =
  'rounded-lg border border-[#E2E3E5] bg-white px-2 py-1.5 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none'

const FAMILY_ICONS: Record<StoredFamily, string> = {
  funding: '\u{1F4B0}',
  csuite: '\u{1F454}',
  product: '\u{1F680}',
  partnership: '\u{1F517}',
  hiring: '\u{1F4BC}',
}

function NoData() {
  return <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet</p>
}

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
  ]

  return (
    <div>
      {description !== '' && (
        <p className='text-sm leading-relaxed text-[#575A66]'>{description}</p>
      )}
      <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline gap-2 text-xs'>
            <dt className='w-28 shrink-0 font-medium uppercase tracking-wide text-[#8A8D99]'>{f.label}</dt>
            <dd className='truncate text-[#2C2D33]'>
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
    </div>
  )
}

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | StoredFamily>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const companies = useMemo<StoredCompany[]>(() => result.companies ?? [], [result])

  const companyByKey = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    companies.forEach((c) => map.set(companyKeyOf(c), c))
    return map
  }, [companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    return result.signals
      .filter(isSignificant)
      .map((s) => {
        const dateIso = storedSignalDate(s)
        const d = new Date(dateIso)
        const ts = Number.isNaN(d.getTime()) ? 0 : d.getTime()
        const company = companyByKey.get(signalCompanyKey(s))
        return {
          s,
          severity: normalizeStoredSeverity(s),
          displayType: storedDisplayType(s),
          dateIso,
          timestamp: ts,
          weekKey: ts === 0 ? '' : weekKeyOf(d),
          industry: company ? industryOf(company) : '\u2014',
          links: getStoredSourceLinks(s),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [result.signals, companyByKey])

  const hasHiring = useMemo(() => enriched.some((e) => familyOf(e) === 'hiring'), [enriched])
  const families = familiesForHiring(hasHiring)

  const countsBySeverity = useMemo(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    enriched.forEach((e) => {
      counts[e.severity] += 1
    })
    return counts
  }, [enriched])

  const countsByType = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const countsByFamily = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      const f = familyOf(e)
      map.set(f, (map.get(f) ?? 0) + 1)
    })
    return map
  }, [enriched])

  const weeklyData = useMemo<WeekBucket[]>(() => {
    const start = new Date(weekKeyOf(new Date()))
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(start)
      d.setDate(d.getDate() - i * 7)
      const key = weekKeyOf(d)
      index.set(key, buckets.length)
      buckets.push({ key, label: weekLabel(key), count: 0 })
    }
    enriched.forEach((e) => {
      if (e.weekKey === '') return
      const pos = index.get(e.weekKey)
      if (pos !== undefined) {
        const bucket = buckets[pos]
        if (bucket) bucket.count += 1
      }
    })
    return buckets
  }, [enriched])

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    typeof result.total_companies === 'number'
      ? result.total_companies
      : typeof dash.companies_tracked === 'number'
        ? dash.companies_tracked
        : typeof dash.companies_total === 'number'
          ? dash.companies_total
          : companies.length
  const totalSignals = enriched.length

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const signalsByCompany = new Map<string, EnrichedSignal[]>()
    enriched.forEach((e) => {
      const key = signalCompanyKey(e.s)
      const list = signalsByCompany.get(key)
      if (list) list.push(e)
      else signalsByCompany.set(key, [e])
    })
    return companies
      .map((company) => {
        const key = companyKeyOf(company)
        const signals = signalsByCompany.get(key) ?? []
        return {
          key,
          company,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(company, ['tech_stack', 'technologies']),
          keywords: extraList(company, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [companies, enriched])

  const visibleCompanyRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return companyRows
    return companyRows.filter((r) => (r.company.company_name ?? '').toLowerCase().includes(q))
  }, [companyRows, search])

  const filteredSignals = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (q !== '') {
        const text = `${companyNameOf(e.s)} ${e.s.summary ?? ''} ${e.displayType}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [enriched, severityFilter, familyFilter, typeFilter, search])

  const highInsights = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])
  const groupedInsights: { family: StoredFamily; items: EnrichedSignal[] }[] = families
    .map((f) => ({ family: f, items: highInsights.filter((e) => familyOf(e) === f) }))
    .filter((g) => g.items.length > 0)

  const severityData = SEVERITIES.map((sv) => ({
    name: sv,
    value: countsBySeverity[sv],
    color: OVERVIEW_SEVERITY_COLORS[sv],
  }))

  const familyBarData = families.map((f) => ({
    family: f,
    label: FAMILY_META[f].label,
    count: countsByFamily.get(f) ?? 0,
    color: FAMILY_META[f].color,
  }))

  const topCompanies = companyRows
    .filter((r) => r.signals.length > 0)
    .slice(0, 10)
    .map((r) => ({
      company: (r.company.company_name ?? '').trim() !== '' ? r.company.company_name : '\u2014',
      count: r.signals.length,
    }))

  const cards: StoredCardDef[] = [
    {
      icon: '\u{1F3E2}',
      label: 'Companies Tracked',
      value: totalCompanies,
      accent: '#00A7D6',
      spark: weeklyData.map((w) => w.count),
      target: 'companies',
    },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: totalSignals,
      accent: '#1A73E8',
      spark: weeklyData.map((w) => w.count),
      pills: [
        { label: 'H', value: countsBySeverity.HIGH, color: '#F31A1A' },
        { label: 'M', value: countsBySeverity.MEDIUM, color: '#FB8145' },
        { label: 'L', value: countsBySeverity.LOW, color: '#3BC884' },
      ],
      target: 'signals',
    },
    {
      icon: '\u{1F6A8}',
      label: 'High Alerts',
      value: countsBySeverity.HIGH,
      accent: '#F31A1A',
      spark: [countsBySeverity.HIGH],
      target: 'signals',
    },
    ...families.map((f) => ({
      icon: FAMILY_ICONS[f],
      label: FAMILY_META[f].label,
      value: countsByFamily.get(f) ?? 0,
      accent: FAMILY_META[f].color,
      spark: [countsByFamily.get(f) ?? 0],
      family: f,
      target: 'signals' as TabKey,
    })),
  ]

  const handleCardClick = (card: StoredCardDef) => {
    if (card.family) {
      setFamilyFilter(card.family)
    } else {
      setFamilyFilter('all')
    }
    if (card.label === 'High Alerts') {
      setSeverityFilter('HIGH')
    } else {
      setSeverityFilter('all')
    }
    setTab(card.target ?? 'signals')
  }

  const clearFilters = () => {
    setSeverityFilter('all')
    setFamilyFilter('all')
    setTypeFilter('all')
    setSearch('')
  }

  const handleRefresh = async (): Promise<void> => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const handleDelete = async (row: CompanyRowData): Promise<void> => {
    if (deleting !== null) return
    setDeleting(row.key)
    try {
      await fetch('/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: row.company.company_id,
          company_name: row.company.company_name,
          company_key: row.company.company_key,
        }),
      })
      if (onRefresh) await onRefresh()
    } catch {
      // Ignore network failures; the next refresh re-syncs state.
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <header className='sticky top-0 z-40 border-b border-[#E2E3E5] bg-white/95 backdrop-blur'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3'>
          <div className='flex items-center gap-2'>
            <span className='h-2.5 w-2.5 animate-pulse rounded-full bg-[#1A73E8]' aria-hidden='true' />
            <h1 className='text-base font-semibold text-[#2C2D33]'>ABM Signal Tracker</h1>
          </div>
          <p className='text-xs text-[#8A8D99]'>
            {formatNumber(totalCompanies)} companies {'\u00b7'} {formatNumber(totalSignals)} significant signal
            {totalSignals === 1 ? '' : 's'}
          </p>
          <div className='ml-auto flex flex-wrap items-center gap-2'>
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search companies or signals...'
              aria-label='Search companies or signals'
              className='w-48 rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none sm:w-64'
            />
            {onRefresh && (
              <button
                type='button'
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                className='rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:opacity-60'
              >
                {refreshing ? 'Refreshing\u2026' : 'Refresh Dashboard'}
              </button>
            )}
          </div>
        </div>
      </header>

      <TabBar active={tab} onChange={setTab} />

      <main className='mx-auto max-w-7xl px-4 py-6' role='tabpanel' aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              {cards.map((card) => (
                <KpiCard
                  key={card.label}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  accent={card.accent}
                  sparkData={card.spark}
                  pills={card.pills}
                  selected={card.family !== undefined && card.family === familyFilter}
                  onClick={() => handleCardClick(card)}
                />
              ))}
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Severity mix chart'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Severity Mix</h2>
                {totalSignals === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-56'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie
                            data={severityData}
                            dataKey='value'
                            nameKey='name'
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            stroke='none'
                          >
                            {severityData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className='mt-3 flex flex-wrap gap-4'>
                      {severityData.map((d) => (
                        <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                          <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                          {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Signal type breakdown chart'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Top Signal Types</h2>
                {countsByType.length === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={countsByType.slice(0, 8)} layout='vertical' margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis type='category' dataKey='type' width={140} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey='count' name='Signals' radius={[0, 6, 6, 0]} barSize={18}>
                          {countsByType.slice(0, 8).map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>

            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Weekly signal trend chart'>
              <h2 className='text-sm font-semibold text-[#575A66]'>Weekly Signal Trend (8 Weeks)</h2>
              {totalSignals === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.08)' }} />
                      <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Recent signals'>
              <div className='flex items-center justify-between'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                <button type='button' onClick={() => setTab('signals')} className='text-xs font-medium text-[#1A73E8] hover:underline'>
                  View all
                </button>
              </div>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-3 space-y-3'>
                  {enriched.slice(0, 8).map((e, i) => (
                    <OverviewSignalRow key={`${e.s.id}-${i}`} e={e} company={companyByKey.get(signalCompanyKey(e.s))} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
            <div className='max-h-[70vh] overflow-auto rounded-2xl'>
              <table className='w-full min-w-[760px] text-sm'>
                <thead>
                  <tr>
                    {['Company', 'Industry', 'HQ', 'Signals', 'High', 'Latest', ''].map((h, i) => (
                      <th
                        key={`col-${i}`}
                        className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                          i >= 3 ? 'text-right' : 'text-left'
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleCompanyRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                        No companies match your search.
                      </td>
                    </tr>
                  ) : (
                    visibleCompanyRows.map((row) => {
                      const expanded = expandedCompany === row.key
                      const highCount = row.signals.filter((e) => e.severity === 'HIGH').length
                      return (
                        <Fragment key={row.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => setExpandedCompany((prev) => (prev === row.key ? null : row.key))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setExpandedCompany((prev) => (prev === row.key ? null : row.key))
                              }
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
                                {(row.company.company_name ?? '').trim() !== '' ? row.company.company_name : '\u2014'}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-[#575A66]'>{industryOf(row.company)}</td>
                            <td className='px-4 py-3 text-[#575A66]'>
                              {(row.company.hq ?? '').trim() !== '' ? row.company.hq : '\u2014'}
                            </td>
                            <td className='px-4 py-3 text-right text-[#2C2D33]'>{row.signals.length}</td>
                            <td className='px-4 py-3 text-right text-[#2C2D33]'>{highCount}</td>
                            <td className='px-4 py-3 text-right text-[#8A8D99]'>
                              {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                            </td>
                            <td className='px-4 py-3 text-right'>
                              <button
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void handleDelete(row)
                                }}
                                disabled={deleting !== null}
                                aria-label={`Remove ${row.company.company_name}`}
                                className='rounded-lg border border-[#FAA3A3] px-2.5 py-1 text-xs font-medium text-[#C21515] transition-colors hover:bg-[#FFF3F3] disabled:opacity-60'
                              >
                                {deleting === row.key ? 'Removing\u2026' : 'Remove'}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className='border-b border-[#F0F1F2] last:border-b-0'>
                              <td colSpan={7} className='bg-[#F7F8F9] px-6 py-5'>
                                <CompanyInfoSection company={row.company} />
                                {row.techStack.length > 0 && (
                                  <div className='mt-4'>
                                    <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Tech Stack</h3>
                                    <div className='mt-2 flex flex-wrap gap-1.5'>
                                      {row.techStack.map((t) => (
                                        <span
                                          key={`ts-${t}`}
                                          className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {row.keywords.length > 0 && (
                                  <div className='mt-4'>
                                    <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Keywords</h3>
                                    <div className='mt-2 flex flex-wrap gap-1.5'>
                                      {row.keywords.map((t) => (
                                        <span
                                          key={`kw-${t}`}
                                          className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <div className='mt-4'>
                                  <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Signal History</h3>
                                  {row.signals.length === 0 ? (
                                    <p className='mt-2 text-xs text-[#8A8D99]'>
                                      No significant signals recorded for this company yet.
                                    </p>
                                  ) : (
                                    <div className='mt-3 space-y-3'>
                                      {row.signals.map((e, i) => (
                                        <SignalRow key={`${e.s.id}-${i}`} e={e} />
                                      ))}
                                    </div>
                                  )}
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
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <select
                aria-label='Filter by severity'
                className={selectCls}
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as 'all' | NormalizedSeverity)}
              >
                <option value='all'>All severities</option>
                {SEVERITIES.map((sv) => (
                  <option key={sv} value={sv}>
                    {sv}
                  </option>
                ))}
              </select>
              <select
                aria-label='Filter by family'
                className={selectCls}
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value as 'all' | StoredFamily)}
              >
                <option value='all'>All families</option>
                {families.map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_META[f].label}
                  </option>
                ))}
              </select>
              <select
                aria-label='Filter by signal type'
                className={selectCls}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value='all'>All types</option>
                {countsByType.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.type}
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
                {formatNumber(filteredSignals.length)} of {formatNumber(totalSignals)} signal{totalSignals === 1 ? '' : 's'}
              </span>
            </div>

            {filteredSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>
                  {'\u{1F50D}'}
                </p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing filters or changing the search.</p>
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
            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Weekly signal trend chart'>
              <h2 className='text-sm font-semibold text-[#575A66]'>Weekly Signal Trend (8 Weeks)</h2>
              {totalSignals === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.08)' }} />
                      <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Signals by family chart'>
              <h2 className='text-sm font-semibold text-[#575A66]'>Signals by Family</h2>
              {totalSignals === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={familyBarData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                          {familyBarData.map((f) => (
                            <Cell
                              key={f.family}
                              fill={f.color}
                              cursor='pointer'
                              onClick={() => {
                                setFamilyFilter(f.family)
                                setTab('signals')
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to filter the signal feed by that family.</p>
                </>
              )}
            </section>

            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5 lg:col-span-2' aria-label='Top companies chart'>
              <h2 className='text-sm font-semibold text-[#575A66]'>Top 10 Companies by Signal Count</h2>
              {topCompanies.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={topCompanies} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                      <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis type='category' dataKey='company' width={160} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey='count' name='Signals' fill='#00A7D6' radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'insights' && (
          <div className='space-y-6'>
            {highInsights.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>
                  {'\u{1F4A1}'}
                </p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>
                  Insights list HIGH-severity signals only. Check the Signals tab for all activity.
                </p>
              </div>
            ) : (
              groupedInsights.map((g) => (
                <section key={g.family} aria-label={`${FAMILY_META[g.family].label} insights`}>
                  <div className='mb-3 flex items-center gap-2'>
                    <span
                      className='inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium'
                      style={{
                        color: FAMILY_META[g.family].color,
                        borderColor: `${FAMILY_META[g.family].color}55`,
                        backgroundColor: `${FAMILY_META[g.family].color}14`,
                      }}
                    >
                      {FAMILY_META[g.family].label}
                    </span>
                    <span className='text-xs text-[#8A8D99]'>
                      {g.items.length} insight{g.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className='space-y-3'>
                    {g.items.map((e, i) => (
                      <SignalRow key={`${e.s.id}-${i}`} e={e} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
