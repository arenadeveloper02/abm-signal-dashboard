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
      <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>Company Info</h3>
      {description !== '' && (
        <p className='mt-2 text-sm leading-relaxed text-[#575A66]'>{description}</p>
      )}
      <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline justify-between gap-3'>
            <dt className='shrink-0 text-xs text-[#8A8D99]'>{f.label}</dt>
            <dd className='truncate text-right text-xs font-medium text-[#2C2D33]'>
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

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label={title}>
      <h2 className='text-sm font-semibold text-[#575A66]'>{title}</h2>
      {children}
    </section>
  )
}

function NoData() {
  return <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data</p>
}

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const companies = useMemo<StoredCompany[]>(() => result.companies ?? [], [result.companies])

  const companyLookup = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of companies) {
      if (c.company_key !== '') map.set(c.company_key, c)
      if (c.company_id !== '') map.set(c.company_id, c)
    }
    return map
  }, [companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    const out: EnrichedSignal[] = []
    for (const s of result.signals ?? []) {
      const upperType = (s.signal_type ?? '').trim().toUpperCase()
      if (upperType === NO_SIGNIFICANT_SIGNAL) continue
      const dateIso = storedSignalDate(s)
      const d = new Date(dateIso)
      const valid = !Number.isNaN(d.getTime())
      const company = companyLookup.get(s.company_key) ?? companyLookup.get(s.company_id)
      out.push({
        s,
        severity: normalizeStoredSeverity(s),
        displayType: storedDisplayType(s),
        dateIso,
        timestamp: valid ? d.getTime() : 0,
        weekKey: valid ? weekKeyOf(d) : '',
        industry: company ? industryOf(company) : '\u2014',
        links: getStoredSourceLinks(s),
      })
    }
    return out.sort((a, b) => b.timestamp - a.timestamp)
  }, [result.signals, companyLookup])

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    return map
  }, [enriched])

  const severityCounts = useMemo(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const e of enriched) counts[e.severity] += 1
    return counts
  }, [enriched])

  const familyCounts = useMemo(() => {
    const counts: Record<Family, number> = { funding: 0, csuite: 0, product: 0, partnership: 0 }
    for (const e of enriched) {
      const f = familyOf(e)
      if (f === 'funding' || f === 'csuite' || f === 'product' || f === 'partnership') counts[f] += 1
    }
    return counts
  }, [enriched])

  const weeklyBuckets = useMemo<WeekBucket[]>(() => {
    const currentKey = weekKeyOf(new Date())
    const start = new Date(currentKey)
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date(start)
      d.setDate(d.getDate() - i * 7)
      const key = weekKeyOf(d)
      index.set(key, buckets.length)
      buckets.push({ key, label: weekLabel(key), count: 0 })
    }
    for (const e of enriched) {
      const pos = index.get(e.weekKey)
      if (pos !== undefined) {
        const b = buckets[pos]
        if (b) b.count += 1
      }
    }
    return buckets
  }, [enriched])

  const weekIndex = useMemo(() => {
    const map = new Map<string, number>()
    weeklyBuckets.forEach((b, i) => map.set(b.key, i))
    return map
  }, [weeklyBuckets])

  const sparkFor = (predicate: (e: EnrichedSignal) => boolean): number[] => {
    const arr: number[] = weeklyBuckets.map(() => 0)
    for (const e of enriched) {
      if (!predicate(e)) continue
      const pos = weekIndex.get(e.weekKey)
      if (pos !== undefined) arr[pos] = (arr[pos] ?? 0) + 1
    }
    return arr
  }

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    dash.total_companies ?? dash.companies_total ?? result.total_companies ?? companies.length
  const totalSignals = enriched.length
  const highAlerts = severityCounts.HIGH

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark: sparkFor(() => true) },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: totalSignals,
      accent: '#1A73E8',
      spark: sparkFor(() => true),
      pills: [
        { label: 'H', value: severityCounts.HIGH, color: '#FF5252' },
        { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
        { label: 'L', value: severityCounts.LOW, color: '#9AA0AE' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: highAlerts, accent: '#F31A1A', spark: sparkFor((e) => e.severity === 'HIGH') },
    {
      icon: '\u{1F454}',
      label: 'C-Suite Changes',
      value: (typeCounts.get('C-Suite Join') ?? 0) + (typeCounts.get('C-Suite Exit') ?? 0),
      accent: '#B364D7',
      spark: sparkFor((e) => familyOf(e) === 'csuite'),
    },
    { icon: '\u{1F4B0}', label: 'Funding', value: typeCounts.get('Funding Round') ?? 0, accent: '#3BC884', spark: sparkFor((e) => e.displayType === 'Funding Round') },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: typeCounts.get('Acquisition / M&A') ?? 0, accent: '#FB8145', spark: sparkFor((e) => e.displayType === 'Acquisition / M&A') },
    { icon: '\u{1F4C8}', label: 'IPO', value: typeCounts.get('IPO') ?? 0, accent: '#DFC612', spark: sparkFor((e) => e.displayType === 'IPO') },
    { icon: '\u{1F680}', label: 'Product Launches', value: typeCounts.get('Product Launch') ?? 0, accent: '#00A7D6', spark: sparkFor((e) => e.displayType === 'Product Launch') },
    { icon: '\u{1F517}', label: 'Partnerships', value: typeCounts.get('Partnership') ?? 0, accent: '#F8528F', spark: sparkFor((e) => e.displayType === 'Partnership') },
  ]

  const handleCardClick = (label: string) => {
    const mapped = CARD_TYPE_FILTER[label]
    setSearch('')
    setSeverityFilter('all')
    if (label === 'C-Suite Changes') {
      setFamilyFilter('csuite')
      setTypeFilter('all')
    } else if (label === 'High Alerts') {
      setFamilyFilter('all')
      setTypeFilter('all')
      setSeverityFilter('HIGH')
    } else if (mapped) {
      setTypeFilter(mapped)
      setFamilyFilter('all')
    } else {
      setTypeFilter('all')
      setFamilyFilter('all')
    }
    setTab(label === 'Companies Tracked' ? 'companies' : 'signals')
  }

  const filteredSignals = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (
        q !== '' &&
        !companyNameOf(e.s).toLowerCase().includes(q) &&
        !(e.s.summary ?? '').toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [enriched, severityFilter, familyFilter, typeFilter, search])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const byCompany = new Map<string, EnrichedSignal[]>()
    for (const e of enriched) {
      const key = e.s.company_key !== '' ? e.s.company_key : companyNameOf(e.s)
      const list = byCompany.get(key)
      if (list) list.push(e)
      else byCompany.set(key, [e])
    }
    return companies
      .map((c) => {
        const signals =
          byCompany.get(c.company_key) ?? byCompany.get(c.company_id) ?? byCompany.get(c.company_name) ?? []
        return {
          key: c.company_key !== '' ? c.company_key : c.company_id,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'technologies', 'techStack']),
          keywords: extraList(c, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [companies, enriched])

  const visibleCompanyRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return companyRows
    return companyRows.filter((r) => r.company.company_name.toLowerCase().includes(q))
  }, [companyRows, search])

  const signalTypes = useMemo(() => Array.from(typeCounts.keys()).sort(), [typeCounts])

  const typePie = useMemo(
    () =>
      Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count, color: typeColor(type) }))
        .sort((a, b) => b.count - a.count),
    [typeCounts]
  )
  const typeTotal = typePie.reduce((acc, t) => acc + t.count, 0)

  const severityPie = SEVERITIES.map((sev) => ({
    name: sev,
    value: severityCounts[sev],
    color: OVERVIEW_SEVERITY_COLORS[sev],
  }))
  const severityTotal = severityPie.reduce((acc, d) => acc + d.value, 0)

  const familyBar = FAMILIES.map((f) => ({
    name: FAMILY_META[f].label,
    value: familyCounts[f],
    color: FAMILY_META[f].color,
  }))

  const highSignals = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])

  const overviewFeed = useMemo(() => {
    const base = feedWeek === null ? enriched : enriched.filter((e) => e.weekKey === feedWeek)
    return base.slice(0, 30)
  }, [enriched, feedWeek])

  const clearFilters = () => {
    setSeverityFilter('all')
    setFamilyFilter('all')
    setTypeFilter('all')
    setSearch('')
  }

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const renderWeeklyChart = (interactive: boolean) => (
    <div className='mt-2 h-64'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={weeklyBuckets}
          margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
          onClick={
            interactive
              ? (state) => {
                  const label = activeLabelOf(state)
                  if (label === null) return
                  const bucket = weeklyBuckets.find((b) => b.label === label)
                  if (!bucket) return
                  setFeedWeek((prev) => (prev === bucket.key ? null : bucket.key))
                }
              : undefined
          }
        >
          <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
          <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
          <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
          <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
            {weeklyBuckets.map((b) => (
              <Cell
                key={b.key}
                fill={interactive && feedWeek === b.key ? '#155CBA' : '#1A73E8'}
                cursor={interactive ? 'pointer' : undefined}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )

  const renderSeverityPie = () => (
    <>
      {severityTotal === 0 ? (
        <NoData />
      ) : (
        <div className='mt-2 h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie data={severityPie} dataKey='value' nameKey='name' innerRadius={50} outerRadius={80} paddingAngle={3} stroke='none'>
                {severityPie.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      <ul className='mt-3 flex flex-wrap gap-4'>
        {severityPie.map((d) => (
          <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
            <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
            {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
          </li>
        ))}
      </ul>
    </>
  )

  const renderFamilyBar = () => (
    <>
      {totalSignals === 0 ? (
        <NoData />
      ) : (
        <div className='mt-2 h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={familyBar} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
              <XAxis dataKey='name' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
              <Bar dataKey='value' name='Signals' radius={[4, 4, 0, 0]}>
                {familyBar.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  )

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <header className='sticky top-0 z-40 border-b border-[#E2E3E5] bg-white/95 backdrop-blur'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3'>
          <div className='flex items-center gap-2'>
            <span className='h-2.5 w-2.5 animate-pulse rounded-full bg-[#1A73E8]' aria-hidden='true' />
            <h1 className='text-base font-semibold text-[#2C2D33]'>ABM Signal Tracker</h1>
          </div>
          <span className='text-xs text-[#8A8D99]'>
            {formatNumber(totalCompanies)} companies {'\u00b7'} {formatNumber(totalSignals)} signals
          </span>
          <div className='ml-auto flex flex-wrap items-center gap-2'>
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search companies or signals...'
              aria-label='Search companies or signals'
              className='w-48 rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none sm:w-56'
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
        {companies.length === 0 && enriched.length === 0 ? (
          <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
            <p className='text-3xl' aria-hidden='true'>{'\u{1F4ED}'}</p>
            <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No stored signals yet</p>
            <p className='mt-1 text-xs text-[#8A8D99]'>
              Import a company list and run an analysis to start tracking ABM signals.
            </p>
          </div>
        ) : (
          <>
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
                    {totalSignals === 0 ? <NoData /> : renderWeeklyChart(true)}
                    <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to filter the feed below by that week.</p>
                  </ChartCard>
                  <ChartCard title='Severity Mix'>{renderSeverityPie()}</ChartCard>
                  <ChartCard title='Signals by Family'>{renderFamilyBar()}</ChartCard>
                </div>
                <section aria-label='Recent signals' className='rounded-2xl border border-[#E2E3E5] bg-white p-5'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                    {feedWeek !== null && (
                      <button
                        type='button'
                        onClick={() => setFeedWeek(null)}
                        className='rounded-full border border-[#E2E3E5] px-2 py-0.5 text-[11px] text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
                      >
                        Clear week: {weekLabel(feedWeek)}
                      </button>
                    )}
                    <span className='ml-auto text-xs text-[#8A8D99]'>{formatNumber(overviewFeed.length)} shown</span>
                  </div>
                  {overviewFeed.length === 0 ? (
                    <p className='mt-6 text-center text-sm text-[#8A8D99]'>No signals for this selection.</p>
                  ) : (
                    <div className='mt-3 space-y-3'>
                      {overviewFeed.map((e, i) => (
                        <OverviewSignalRow
                          key={`${e.s.id}-${i}`}
                          e={e}
                          company={companyLookup.get(e.s.company_key) ?? companyLookup.get(e.s.company_id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
            {tab === 'companies' && (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
                <div className='max-h-[70vh] overflow-auto rounded-2xl'>
                  <table className='w-full min-w-[860px] text-sm'>
                    <thead>
                      <tr>
                        {['Company', 'Industry', 'HQ', 'Signals', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Latest'].map(
                          (label, i) => (
                            <th
                              key={label}
                              className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                                i >= 3 ? 'text-right' : 'text-left'
                              }`}
                            >
                              {label}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCompanyRows.length === 0 ? (
                        <tr>
                          <td colSpan={9} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                            No companies match your search.
                          </td>
                        </tr>
                      ) : (
                        visibleCompanyRows.map((row) => {
                          const expanded = expandedCompany === row.key
                          return (
                            <Fragment key={row.key}>
                              <tr
                                tabIndex={0}
                                aria-expanded={expanded}
                                onClick={() => setExpandedCompany(expanded ? null : row.key)}
                                onKeyDown={(ev) => {
                                  if (ev.key === 'Enter' || ev.key === ' ') setExpandedCompany(expanded ? null : row.key)
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
                                    {row.company.company_name}
                                  </span>
                                </td>
                                <td className='px-4 py-3 text-[#575A66]'>{industryOf(row.company)}</td>
                                <td className='px-4 py-3 text-[#575A66]'>
                                  {(row.company.hq ?? '').trim() !== '' ? row.company.hq : '\u2014'}
                                </td>
                                <td className='px-4 py-3 text-right text-[#2C2D33]'>{row.signals.length}</td>
                                <td className='px-4 py-3 text-right text-[#575A66]'>{row.company.by_family.funding}</td>
                                <td className='px-4 py-3 text-right text-[#575A66]'>{row.company.by_family.csuite}</td>
                                <td className='px-4 py-3 text-right text-[#575A66]'>{row.company.by_family.product}</td>
                                <td className='px-4 py-3 text-right text-[#575A66]'>{row.company.by_family.partnership}</td>
                                <td className='px-4 py-3 text-right text-[#8A8D99]'>
                                  {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                                </td>
                              </tr>
                              {expanded && (
                                <tr className='border-b border-[#F0F1F2] last:border-b-0'>
                                  <td colSpan={9} className='bg-[#F7F8F9] px-6 py-5'>
                                    <div className='space-y-4'>
                                      <CompanyInfoSection company={row.company} />
                                      {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                        <div className='flex flex-wrap gap-1.5'>
                                          {row.techStack.map((t) => (
                                            <span
                                              key={`tech-${t}`}
                                              className='rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'
                                            >
                                              {t}
                                            </span>
                                          ))}
                                          {row.keywords.map((k) => (
                                            <span
                                              key={`kw-${k}`}
                                              className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#575A66]'
                                            >
                                              {k}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {row.signals.length === 0 ? (
                                        <p className='text-xs text-[#8A8D99]'>
                                          No significant signals recorded for this company yet.
                                        </p>
                                      ) : (
                                        <div className='space-y-3'>
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
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label='Filter by family'
                    className={selectCls}
                    value={familyFilter}
                    onChange={(e) => setFamilyFilter(e.target.value as 'all' | Family)}
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
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value='all'>All types</option>
                    {signalTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
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
                    {formatNumber(filteredSignals.length)} of {formatNumber(enriched.length)} signal
                    {enriched.length === 1 ? '' : 's'}
                  </span>
                </div>
                {filteredSignals.length === 0 ? (
                  <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                    <p className='text-3xl' aria-hidden='true'>{'\u{1F50D}'}</p>
                    <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                    <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing filters or widening your search.</p>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {filteredSignals.map((e, i) => (
                      <SignalRow key={`${e.s.id}-${i}`} e={e} />
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'trends' && (
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <ChartCard title='Weekly Signal Trend (8 Weeks)'>
                  {totalSignals === 0 ? <NoData /> : renderWeeklyChart(false)}
                </ChartCard>
                <ChartCard title='Signals by Family'>{renderFamilyBar()}</ChartCard>
                <ChartCard title='Signal Type Breakdown'>
                  {typeTotal === 0 ? (
                    <NoData />
                  ) : (
                    <div className='mt-2 flex flex-col gap-4 sm:flex-row sm:items-center'>
                      <div className='h-64 w-full sm:w-1/2'>
                        <ResponsiveContainer width='100%' height='100%'>
                          <PieChart>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Pie
                              data={typePie}
                              dataKey='count'
                              nameKey='type'
                              innerRadius={50}
                              outerRadius={85}
                              paddingAngle={2}
                              stroke='#FFFFFF'
                            >
                              {typePie.map((t) => (
                                <Cell key={t.type} fill={t.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                        {typePie.map((t) => {
                          const pct = typeTotal > 0 ? ((t.count / typeTotal) * 100).toFixed(1) : '0.0'
                          return (
                            <li key={t.type} className='flex items-center gap-2 text-xs text-[#575A66]'>
                              <span
                                className='h-2 w-2 shrink-0 rounded-full'
                                style={{ backgroundColor: t.color }}
                                aria-hidden='true'
                              />
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
                <ChartCard title='Severity Mix'>{renderSeverityPie()}</ChartCard>
              </div>
            )}
            {tab === 'insights' && (
              <div className='space-y-4'>
                {highSignals.length === 0 ? (
                  <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                    <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
                    <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                    <p className='mt-1 text-xs text-[#8A8D99]'>
                      Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity
                      activity.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className='text-xs text-[#8A8D99]'>
                      {formatNumber(highSignals.length)} high-severity insight{highSignals.length === 1 ? '' : 's'}
                    </p>
                    <div className='space-y-3'>
                      {highSignals.map((e, i) => (
                        <SignalRow key={`${e.s.id}-${i}`} e={e} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
