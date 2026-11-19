"use client"

import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
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

const CARD_TYPE_FILTER: Record<string, string | undefined> = {
  Funding: 'Funding Round',
  'Mergers & Acquisitions': 'Acquisition / M&A',
  IPO: 'IPO',
  News: 'News Mention',
  'Product Launches': 'Product Launch',
  Partnerships: 'Partnership',
  'Creative Hiring': 'Creative Hiring',
  Hiring: 'Hiring',
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
  ]

  return (
    <div className='rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-4'>
      {description !== '' && (
        <p className='text-sm leading-relaxed text-[#575A66]'>{description}</p>
      )}
      <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline gap-2 text-xs'>
            <dt className='shrink-0 font-medium uppercase tracking-wide text-[#8A8D99]'>{f.label}</dt>
            <dd className='min-w-0 truncate text-[#2C2D33]'>
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

function ChipList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className='mt-3'>
      <p className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>{title}</p>
      <div className='mt-1.5 flex flex-wrap gap-1.5'>
        {items.slice(0, 16).map((item) => (
          <span
            key={item}
            className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
          >
            {item}
          </span>
        ))}
      </div>
    </div>
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
  return <p className='my-16 text-center text-sm text-[#8A8D99]'>No data</p>
}

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | StoredFamily>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [weekFilter, setWeekFilter] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  const companies = useMemo<StoredCompany[]>(
    () => (Array.isArray(result.companies) ? result.companies : []),
    [result]
  )

  const companyByKey = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of companies) map.set(companyKeyOf(c), c)
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
  }, [result, companyByKey])

  const hiringEnabled = useMemo(() => enriched.some((e) => familyOf(e) === 'hiring'), [enriched])
  const families = useMemo<StoredFamily[]>(() => familiesForHiring(hiringEnabled), [hiringEnabled])

  const severityCounts = useMemo(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const e of enriched) counts[e.severity] += 1
    return counts
  }, [enriched])

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    return map
  }, [enriched])

  const signalTypes = useMemo(() => Array.from(typeCounts.keys()).sort(), [typeCounts])

  const weeklyBuckets = useMemo<WeekBucket[]>(() => {
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
    for (let i = 7; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i * 7)
      const key = weekKeyOf(d)
      if (!index.has(key)) {
        index.set(key, buckets.length)
        buckets.push({ key, label: weekLabel(key), count: 0 })
      }
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

  const spark = useMemo(() => weeklyBuckets.map((w) => w.count), [weeklyBuckets])

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    dash.companies_tracked ??
    dash.total_companies ??
    dash.companies_total ??
    result.total_companies ??
    companies.length
  const totalSignals = dash.total_signals ?? enriched.length
  const highAlerts = dash.high_alerts ?? severityCounts.HIGH

  const countOfType = (label: string): number => typeCounts.get(label) ?? 0

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark, target: 'companies' },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: totalSignals,
      accent: '#1A73E8',
      spark,
      pills: [
        { label: 'H', value: severityCounts.HIGH, color: '#FF5252' },
        { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
        { label: 'L', value: severityCounts.LOW, color: '#9AA0AE' },
      ],
      target: 'signals',
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: highAlerts, accent: '#F31A1A', spark, target: 'signals' },
    {
      icon: '\u{1F454}',
      label: 'C-Suite Changes',
      value: dash.csuite_changes ?? countOfType('C-Suite Join') + countOfType('C-Suite Exit'),
      accent: '#B364D7',
      spark,
      target: 'signals',
    },
    { icon: '\u{1F4B0}', label: 'Funding', value: dash.funding ?? countOfType('Funding Round'), accent: '#3BC884', spark, target: 'signals' },
    {
      icon: '\u{1F91D}',
      label: 'Mergers & Acquisitions',
      value: dash.mergers_acquisitions ?? countOfType('Acquisition / M&A'),
      accent: '#FB8145',
      spark,
      target: 'signals',
    },
    { icon: '\u{1F4C8}', label: 'IPO', value: dash.ipo ?? countOfType('IPO'), accent: '#DFC612', spark, target: 'signals' },
    {
      icon: '\u{1F680}',
      label: 'Product Launches',
      value: dash.product_launches ?? countOfType('Product Launch'),
      accent: '#00A7D6',
      spark,
      target: 'signals',
    },
    {
      icon: '\u{1F517}',
      label: 'Partnerships',
      value: dash.partnerships ?? countOfType('Partnership'),
      accent: '#F8528F',
      spark,
      target: 'signals',
    },
  ]
  if (hiringEnabled) {
    cards.push({ icon: '\u{1F9D1}', label: 'Hiring', value: countOfType('Hiring'), accent: '#7B61FF', spark, target: 'signals' })
  }

  const handleCardClick = (card: StoredCardDef) => {
    const mapped = CARD_TYPE_FILTER[card.label]
    setTypeFilter(mapped ?? 'all')
    setSeverityFilter(card.label === 'High Alerts' ? 'HIGH' : 'all')
    setFamilyFilter('all')
    setWeekFilter(null)
    setTab(card.target ?? 'signals')
  }

  const filteredSignals = useMemo<EnrichedSignal[]>(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (weekFilter !== null && e.weekKey !== weekFilter) return false
      if (
        q !== '' &&
        !companyNameOf(e.s).toLowerCase().includes(q) &&
        !(e.s.summary ?? '').toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [enriched, severityFilter, familyFilter, typeFilter, weekFilter, search])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const byCompany = new Map<string, EnrichedSignal[]>()
    for (const e of enriched) {
      const key = signalCompanyKey(e.s)
      const list = byCompany.get(key)
      if (list) list.push(e)
      else byCompany.set(key, [e])
    }
    return companies
      .map((c) => {
        const key = companyKeyOf(c)
        const signals = byCompany.get(key) ?? []
        return {
          key,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'technologies']),
          keywords: extraList(c, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [companies, enriched])

  const filteredCompanyRows = useMemo<CompanyRowData[]>(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return companyRows
    return companyRows.filter((r) => (r.company.company_name ?? '').toLowerCase().includes(q))
  }, [companyRows, search])

  const severityPie = SEVERITIES.map((sev) => ({
    name: sev,
    value: severityCounts[sev],
    color: OVERVIEW_SEVERITY_COLORS[sev],
  })).filter((d) => d.value > 0)

  const typeBars = useMemo(
    () =>
      Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count, color: typeColor(type) }))
        .sort((a, b) => b.count - a.count),
    [typeCounts]
  )

  const typeTotal = typeBars.reduce((acc, t) => acc + t.count, 0)

  const familyBars = useMemo(
    () =>
      families.map((f) => ({
        family: f,
        label: FAMILY_META[f].label,
        color: FAMILY_META[f].color,
        count: enriched.filter((e) => familyOf(e) === f).length,
      })),
    [families, enriched]
  )

  const insightGroups = useMemo(() => {
    const high = enriched.filter((e) => e.severity === 'HIGH')
    return families
      .map((f) => ({ family: f, items: high.filter((e) => familyOf(e) === f) }))
      .filter((g) => g.items.length > 0)
  }, [enriched, families])

  const hasFilters =
    severityFilter !== 'all' ||
    familyFilter !== 'all' ||
    typeFilter !== 'all' ||
    weekFilter !== null ||
    search.trim() !== ''

  const clearFilters = () => {
    setSeverityFilter('all')
    setFamilyFilter('all')
    setTypeFilter('all')
    setWeekFilter(null)
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

  const handleWeekChartClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (label === null) return
    const bucket = weeklyBuckets.find((w) => w.label === label)
    if (!bucket) return
    setWeekFilter((prev) => (prev === bucket.key ? null : bucket.key))
    setTab('signals')
  }

  const recentSignals = enriched.slice(0, 15)

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <header className='border-b border-[#E2E3E5] bg-white'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4'>
          <div>
            <h1 className='text-base font-semibold text-[#2C2D33]'>Account Signals</h1>
            <p className='text-xs text-[#8A8D99]'>
              {formatNumber(totalCompanies)} companies tracked {'\u00b7'} {formatNumber(totalSignals)} signal
              {totalSignals === 1 ? '' : 's'}
            </p>
          </div>
          {onRefresh && (
            <button
              type='button'
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className='ml-auto rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:opacity-60'
            >
              {refreshing ? 'Refreshing\u2026' : 'Refresh Dashboard'}
            </button>
          )}
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
                  onClick={() => handleCardClick(c)}
                />
              ))}
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <ChartCard title='Severity Mix'>
                {severityPie.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-56'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Pie
                            data={severityPie}
                            dataKey='value'
                            nameKey='name'
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            stroke='#FFFFFF'
                          >
                            {severityPie.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className='mt-3 flex flex-wrap gap-4'>
                      {severityPie.map((d) => (
                        <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                          <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                          {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </ChartCard>

              <ChartCard title='Weekly Signal Trend (8 Weeks)'>
                {enriched.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-56'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart
                          data={weeklyBuckets}
                          margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                          onClick={handleWeekChartClick}
                        >
                          <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                          <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                          <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                          <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to see that week in the signal feed.</p>
                  </>
                )}
              </ChartCard>
            </div>

            <section aria-label='Recent signals'>
              <h2 className='mb-3 text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
              {recentSignals.length === 0 ? (
                <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                  <p className='text-3xl' aria-hidden='true'>{'\u{1F4E1}'}</p>
                  <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals yet</p>
                  <p className='mt-1 text-xs text-[#8A8D99]'>
                    Import a company list and run analysis to start tracking account signals.
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {recentSignals.map((e, i) => (
                    <OverviewSignalRow
                      key={`${e.s.id}-${i}`}
                      e={e}
                      company={companyByKey.get(signalCompanyKey(e.s))}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <input
                type='search'
                aria-label='Search companies'
                placeholder='Search companies\u2026'
                className={`${selectCls} w-64`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {filteredCompanyRows.length} of {companyRows.length} compan
                {companyRows.length === 1 ? 'y' : 'ies'}
              </span>
            </div>

            <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
              <div className='max-h-[70vh] overflow-auto rounded-2xl'>
                <table className='w-full min-w-[720px] text-sm'>
                  <thead>
                    <tr>
                      {['Company', 'Industry', 'Signals', 'High', 'Latest Signal'].map((h, i) => (
                        <th
                          key={h}
                          className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                            i >= 2 ? 'text-right' : 'text-left'
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanyRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                          No companies match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanyRows.map((row) => {
                        const rawName = (row.company.company_name ?? '').trim()
                        const name = rawName !== '' ? rawName : row.key
                        const expanded = expandedCompany === row.key
                        const high = row.signals.filter((e) => e.severity === 'HIGH').length
                        return (
                          <Fragment key={row.key}>
                            <tr
                              tabIndex={0}
                              aria-expanded={expanded}
                              onClick={() => setExpandedCompany(expanded ? null : row.key)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter' || ev.key === ' ') {
                                  setExpandedCompany(expanded ? null : row.key)
                                }
                              }}
                              className='cursor-pointer border-b border-[#F7F8F9] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none'
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
                                  {name}
                                </span>
                              </td>
                              <td className='px-4 py-3 text-[#575A66]'>{industryOf(row.company)}</td>
                              <td className='px-4 py-3 text-right text-[#575A66]'>{row.signals.length}</td>
                              <td className='px-4 py-3 text-right text-[#575A66]'>{high}</td>
                              <td className='px-4 py-3 text-right text-[#8A8D99]'>
                                {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                              </td>
                            </tr>
                            {expanded && (
                              <tr className='border-b border-[#F7F8F9] last:border-b-0'>
                                <td colSpan={5} className='bg-[#FBFBFC] px-6 py-5'>
                                  <CompanyInfoSection company={row.company} />
                                  <ChipList title='Tech stack' items={row.techStack} />
                                  <ChipList title='Keywords' items={row.keywords} />
                                  <div className='mt-4'>
                                    <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>
                                      Signal History
                                    </h3>
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
          </div>
        )}

        {tab === 'signals' && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <input
                type='search'
                aria-label='Search signals'
                placeholder='Search signals\u2026'
                className={`${selectCls} w-56`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                {signalTypes.map((t) => (
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
              {weekFilter !== null && (
                <button
                  type='button'
                  onClick={() => setWeekFilter(null)}
                  className='inline-flex items-center gap-1 rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2.5 py-1 text-xs font-medium text-[#10458B]'
                >
                  Week of {weekLabel(weekFilter)} {'\u2715'}
                </button>
              )}
              {hasFilters && (
                <button
                  type='button'
                  onClick={clearFilters}
                  className='rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:border-[#F31A1A]/50 hover:text-[#2C2D33]'
                >
                  Clear
                </button>
              )}
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {filteredSignals.length} of {enriched.length} signal
                {enriched.length === 1 ? '' : 's'}
              </span>
            </div>

            {filteredSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F50D}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try widening the filters or clearing them.</p>
              </div>
            ) : (
              <div className='max-h-[70vh] space-y-3 overflow-y-auto pr-1'>
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
                <NoData />
              ) : (
                <>
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={weeklyBuckets}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={handleWeekChartClick}
                      >
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to filter the signal feed by that week.</p>
                </>
              )}
            </ChartCard>

            <ChartCard title='Signals by Family'>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={familyBars} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                          {familyBars.map((f) => (
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
            </ChartCard>

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
                          data={typeBars}
                          dataKey='count'
                          nameKey='type'
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke='#FFFFFF'
                        >
                          {typeBars.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                    {typeBars.map((t) => {
                      const pct = ((t.count / typeTotal) * 100).toFixed(1)
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

            <ChartCard title='Severity Mix'>
              {severityPie.length === 0 ? (
                <NoData />
              ) : (
                <>
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
                          stroke='#FFFFFF'
                        >
                          {severityPie.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='mt-3 flex flex-wrap gap-4'>
                    {severityPie.map((d) => (
                      <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                        <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                        {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ChartCard>
          </div>
        )}

        {tab === 'insights' && (
          <div className='space-y-6'>
            {insightGroups.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>
                  Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
                </p>
              </div>
            ) : (
              insightGroups.map((g) => (
                <section key={g.family} aria-label={`${g.family} insights`}>
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

      <footer className='mx-auto max-w-7xl px-4 pb-8'>
        <p className='text-xs text-[#8A8D99]'>
          {formatNumber(enriched.length)} significant signal{enriched.length === 1 ? '' : 's'} across{' '}
          {formatNumber(companies.length)} compan{companies.length === 1 ? 'y' : 'ies'}
        </p>
      </footer>
    </div>
  )
}
