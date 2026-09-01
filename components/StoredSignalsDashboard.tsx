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

interface TypeCount {
  type: string
  count: number
  color: string
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
      <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline justify-between gap-3'>
            <dt className='shrink-0 text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]'>{f.label}</dt>
            <dd className='min-w-0 truncate text-right text-sm text-[#2C2D33]'>
              {f.href ? (
                <a
                  href={f.href}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-[#1A73E8] hover:underline'
                >
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

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')
  const [weekFilter, setWeekFilter] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const companies = useMemo<StoredCompany[]>(() => result.companies ?? [], [result])

  const companyByKey = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of companies) {
      const key = (c.company_key ?? '').trim()
      if (key !== '') map.set(key, c)
      const id = (c.company_id ?? '').trim()
      if (id !== '') map.set(id, c)
      const name = (c.company_name ?? '').trim().toLowerCase()
      if (name !== '') map.set(name, c)
    }
    return map
  }, [companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    return (result.signals ?? [])
      .filter((s) => (s.signal_type ?? '').toUpperCase() !== NO_SIGNIFICANT_SIGNAL)
      .map((s) => {
        const dateIso = storedSignalDate(s)
        const d = new Date(dateIso)
        const valid = !Number.isNaN(d.getTime())
        const company =
          companyByKey.get((s.company_key ?? '').trim()) ??
          companyByKey.get((s.company_id ?? '').trim()) ??
          companyByKey.get(companyNameOf(s).toLowerCase())
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
  }, [result, companyByKey])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const byCompany = new Map<string, EnrichedSignal[]>()
    for (const e of enriched) {
      const key =
        (e.s.company_key ?? '').trim() !== ''
          ? (e.s.company_key ?? '').trim()
          : companyNameOf(e.s).toLowerCase()
      const arr = byCompany.get(key)
      if (arr) {
        arr.push(e)
      } else {
        byCompany.set(key, [e])
      }
    }
    return companies
      .map((c) => {
        const key =
          (c.company_key ?? '').trim() !== ''
            ? (c.company_key ?? '').trim()
            : (c.company_name ?? '').trim().toLowerCase()
        const signals = byCompany.get(key) ?? []
        const rowKey = (c.company_id ?? '').trim() !== '' ? (c.company_id ?? '').trim() : key
        return {
          key: rowKey,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'technologies', 'techStack']),
          keywords: extraList(c, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [companies, enriched])

  const weekly = useMemo<WeekBucket[]>(() => {
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
    const start = new Date()
    const day = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - day)
    start.setHours(0, 0, 0, 0)
    for (let i = 7; i >= 0; i -= 1) {
      const wk = new Date(start)
      wk.setDate(wk.getDate() - i * 7)
      const key = weekKeyOf(wk)
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

  const severityCounts = useMemo<Record<NormalizedSeverity, number>>(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const e of enriched) counts[e.severity] += 1
    return counts
  }, [enriched])

  const typeCounts = useMemo<TypeCount[]>(() => {
    const map = new Map<string, number>()
    for (const e of enriched) map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const signalTypeOptions = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched]
  )

  const highSignals = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])

  const topCompanies = useMemo(
    () =>
      companyRows
        .filter((r) => r.signals.length > 0)
        .slice(0, 10)
        .map((r) => ({ company: r.company.company_name, count: r.signals.length })),
    [companyRows]
  )

  const filteredSignals = useMemo<EnrichedSignal[]>(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) => {
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (weekFilter !== null && e.weekKey !== weekFilter) return false
      if (
        q !== '' &&
        !companyNameOf(e.s).toLowerCase().includes(q) &&
        !(e.s.summary ?? '').toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [enriched, typeFilter, severityFilter, familyFilter, weekFilter, search])

  const visibleCompanies = useMemo<CompanyRowData[]>(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return companyRows
    return companyRows.filter(
      (r) =>
        r.company.company_name.toLowerCase().includes(q) ||
        industryOf(r.company).toLowerCase().includes(q)
    )
  }, [companyRows, search])

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    dash.total_companies ??
    dash.companies_total ??
    dash.companies_tracked ??
    result.total_companies ??
    companies.length
  const totalSignals = dash.total_signals ?? result.totals?.total_signals ?? enriched.length
  const highAlerts = dash.high_alerts ?? severityCounts.HIGH
  const typeCountOf = (label: string): number => typeCounts.find((t) => t.type === label)?.count ?? 0
  const csuiteChanges = dash.csuite_changes ?? enriched.filter((e) => familyOf(e) === 'csuite').length
  const funding = dash.funding ?? typeCountOf('Funding Round')
  const mna = dash.mergers_acquisitions ?? typeCountOf('Acquisition / M&A')
  const ipoCount = dash.ipo ?? typeCountOf('IPO')
  const productLaunches = dash.product_launches ?? typeCountOf('Product Launch')
  const partnerships = dash.partnerships ?? typeCountOf('Partnership')

  const weeklySpark = weekly.map((w) => w.count)

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Total Companies', value: totalCompanies, accent: '#00A7D6', spark: weeklySpark },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: totalSignals,
      accent: '#1A73E8',
      spark: weeklySpark,
      pills: [
        { label: 'H', value: severityCounts.HIGH, color: SEVERITY_COLORS.HIGH },
        { label: 'M', value: severityCounts.MEDIUM, color: SEVERITY_COLORS.MEDIUM },
        { label: 'L', value: severityCounts.LOW, color: SEVERITY_COLORS.LOW },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: highAlerts, accent: '#F31A1A', spark: weeklySpark },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: csuiteChanges, accent: '#B364D7', spark: weeklySpark },
    { icon: '\u{1F4B0}', label: 'Funding', value: funding, accent: '#3BC884', spark: weeklySpark },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: mna, accent: '#FB8145', spark: weeklySpark },
    { icon: '\u{1F4C8}', label: 'IPO', value: ipoCount, accent: '#DFC612', spark: weeklySpark },
    { icon: '\u{1F680}', label: 'Product Launches', value: productLaunches, accent: '#00A7D6', spark: weeklySpark },
    { icon: '\u{1F517}', label: 'Partnerships', value: partnerships, accent: '#F8528F', spark: weeklySpark },
  ]

  const handleCardClick = (label: string) => {
    if (label === 'Total Companies') {
      // Navigate to the Companies tab (fixed: previously targeted the Signals tab)
      setTab('companies')
      return
    }
    if (label === 'High Alerts') {
      setSeverityFilter('HIGH')
      setTypeFilter('all')
      setFamilyFilter('all')
      setTab('signals')
      return
    }
    if (label === 'C-Suite Changes') {
      setFamilyFilter('csuite')
      setTypeFilter('all')
      setSeverityFilter('all')
      setTab('signals')
      return
    }
    const type = CARD_TYPE_FILTER[label]
    if (type !== undefined) {
      setTypeFilter(type)
      setSeverityFilter('all')
      setFamilyFilter('all')
    } else {
      setTypeFilter('all')
    }
    setTab('signals')
  }

  const handleRefresh = () => {
    if (!onRefresh || refreshing) return
    setRefreshing(true)
    void Promise.resolve(onRefresh()).finally(() => setRefreshing(false))
  }

  const clearFilters = () => {
    setTypeFilter('all')
    setSeverityFilter('all')
    setFamilyFilter('all')
    setWeekFilter(null)
  }

  const companyForSignal = (e: EnrichedSignal): StoredCompany | undefined =>
    companyByKey.get((e.s.company_key ?? '').trim()) ??
    companyByKey.get((e.s.company_id ?? '').trim()) ??
    companyByKey.get(companyNameOf(e.s).toLowerCase())

  const severityPie = SEVERITIES.map((sev) => ({
    name: sev,
    value: severityCounts[sev],
    color: OVERVIEW_SEVERITY_COLORS[sev],
  }))
  const severityTotal = severityPie.reduce((acc, d) => acc + d.value, 0)
  const typeTotal = typeCounts.reduce((acc, t) => acc + t.count, 0)

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <header className='border-b border-[#E2E3E5] bg-white'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4'>
          <div>
            <h1 className='text-base font-semibold text-[#2C2D33]'>ABM Signal Tracker</h1>
            <p className='text-xs text-[#8A8D99]'>
              {formatNumber(totalCompanies)} companies tracked {'\u00b7'} {formatNumber(totalSignals)} significant signal
              {totalSignals === 1 ? '' : 's'}
            </p>
          </div>
          <div className='ml-auto flex flex-wrap items-center gap-2'>
            <input
              type='search'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search companies or signals...'
              aria-label='Search companies or signals'
              className={`w-56 ${selectCls}`}
            />
            {onRefresh && (
              <button
                type='button'
                onClick={handleRefresh}
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
                  <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
                ) : (
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={weekly}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          const label = activeLabelOf(state)
                          if (label === null) return
                          const bucket = weekly.find((w) => w.label === label)
                          if (!bucket) return
                          setWeekFilter((prev) => (prev === bucket.key ? null : bucket.key))
                          setTab('signals')
                        }}
                      >
                        <CartesianGrid stroke='#F0F1F2' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title='Severity Mix'>
                {severityTotal === 0 ? (
                  <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
                ) : (
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie
                          data={severityPie}
                          dataKey='value'
                          nameKey='name'
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={3}
                          stroke='none'
                        >
                          {severityPie.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
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
              </ChartCard>
              <ChartCard title='Signal Type Breakdown'>
                {typeTotal === 0 ? (
                  <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
                ) : (
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie
                          data={typeCounts}
                          dataKey='count'
                          nameKey='type'
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke='none'
                        >
                          {typeCounts.map((t) => (
                            <Cell
                              key={t.type}
                              fill={t.color}
                              cursor='pointer'
                              onClick={() => {
                                setTypeFilter(t.type)
                                setSeverityFilter('all')
                                setFamilyFilter('all')
                                setTab('signals')
                              }}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>
            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Recent signals'>
              <div className='flex items-center justify-between'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                <span className='text-xs text-[#8A8D99]'>
                  {formatNumber(enriched.length)} significant signal{enriched.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className='mt-3 space-y-3'>
                {enriched.length === 0 ? (
                  <p className='py-8 text-center text-sm text-[#8A8D99]'>
                    No signals stored yet. Import companies to start tracking.
                  </p>
                ) : (
                  enriched.slice(0, 10).map((e, i) => (
                    <OverviewSignalRow key={`${e.s.id}-${i}`} e={e} company={companyForSignal(e)} />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
        {tab === 'companies' && (
          <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
            <div className='max-h-[70vh] overflow-auto rounded-2xl'>
              <table className='w-full min-w-[760px] text-sm'>
                <thead>
                  <tr>
                    {['Company', 'Industry', 'HQ', 'Signals', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Latest'].map(
                      (h) => (
                        <th
                          key={h}
                          className='sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {visibleCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={9} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                        No companies match your search.
                      </td>
                    </tr>
                  ) : (
                    visibleCompanies.map((r) => {
                      const expanded = expandedCompany === r.key
                      return (
                        <Fragment key={r.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => setExpandedCompany(expanded ? null : r.key)}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                setExpandedCompany(expanded ? null : r.key)
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
                                {r.company.company_name}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-[#575A66]'>{industryOf(r.company)}</td>
                            <td className='px-4 py-3 text-[#575A66]'>
                              {(r.company.hq ?? '').trim() !== '' ? r.company.hq : '\u2014'}
                            </td>
                            <td className='px-4 py-3 text-[#2C2D33]'>{r.signals.length}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{r.company.by_family.funding}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{r.company.by_family.csuite}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{r.company.by_family.product}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{r.company.by_family.partnership}</td>
                            <td className='px-4 py-3 text-[#8A8D99]'>
                              {r.latest ? relativeTime(r.latest.dateIso) : '\u2014'}
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
                                            <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>
                                              Tech Stack
                                            </h3>
                                            <div className='mt-2 flex flex-wrap gap-1.5'>
                                              {r.techStack.map((t) => (
                                                <span
                                                  key={t}
                                                  className='rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'
                                                >
                                                  {t}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {r.keywords.length > 0 && (
                                          <div className={r.techStack.length > 0 ? 'mt-3' : ''}>
                                            <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>
                                              Keywords
                                            </h3>
                                            <div className='mt-2 flex flex-wrap gap-1.5'>
                                              {r.keywords.map((k) => (
                                                <span
                                                  key={k}
                                                  className='rounded-full bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-medium text-[#575A66]'
                                                >
                                                  {k}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {r.signals.length === 0 ? (
                                      <p className='rounded-xl border border-[#E2E3E5] bg-white p-4 text-sm text-[#8A8D99]'>
                                        No significant signals stored for this company yet.
                                      </p>
                                    ) : (
                                      r.signals.slice(0, 6).map((e, i) => <SignalRow key={`${e.s.id}-${i}`} e={e} />)
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
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <select
                aria-label='Filter by signal type'
                className={selectCls}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
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
                onChange={(e) => setSeverityFilter(e.target.value as 'all' | NormalizedSeverity)}
              >
                <option value='all'>All severities</option>
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
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
              {weekFilter !== null && (
                <button
                  type='button'
                  onClick={() => setWeekFilter(null)}
                  className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-3 py-1 text-xs font-medium text-[#155CBA]'
                >
                  Week of {weekLabel(weekFilter)} {'\u2715'}
                </button>
              )}
              <button
                type='button'
                onClick={clearFilters}
                className='rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
              >
                Clear
              </button>
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {filteredSignals.length} of {enriched.length} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>
            {filteredSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F50D}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try widening the filters or clearing them.</p>
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
              {enriched.length === 0 ? (
                <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weekly} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#F0F1F2' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#3BC884' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Signal Type Breakdown'>
              {typeTotal === 0 ? (
                <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 flex flex-col gap-4 sm:flex-row sm:items-center'>
                  <div className='h-64 w-full sm:w-1/2'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie
                          data={typeCounts}
                          dataKey='count'
                          nameKey='type'
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke='none'
                        >
                          {typeCounts.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                    {typeCounts.map((t) => {
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
            <ChartCard title='Top 10 Companies by Signal Count'>
              {topCompanies.length === 0 ? (
                <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={topCompanies} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke='#F0F1F2' strokeDasharray='3 3' horizontal={false} />
                      <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <YAxis
                        type='category'
                        dataKey='company'
                        width={140}
                        stroke='#A7AAB2'
                        tick={{ fill: '#575A66', fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#00A7D6' radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Severity Mix'>
              {severityTotal === 0 ? (
                <p className='py-16 text-center text-sm text-[#8A8D99]'>No data</p>
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Pie
                        data={severityPie}
                        dataKey='value'
                        nameKey='name'
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke='none'
                      >
                        {severityPie.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>
        )}
        {tab === 'insights' && (
          <div className='space-y-4'>
            {highSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>
                  Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
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
      </main>
    </div>
  )
}
