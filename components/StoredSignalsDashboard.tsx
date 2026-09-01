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
import { useArenaEmailId } from '@/components/arena-email-provider'
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
      <p className='mt-1 text-sm leading-relaxed text-[#575A66]'>
        {description !== '' ? description : 'No description available for this company.'}
      </p>
      <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline gap-2'>
            <dt className='shrink-0 text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]'>{f.label}</dt>
            <dd className='min-w-0 truncate text-xs text-[#2C2D33]'>
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

function ChartCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#E2E3E5] bg-white p-5 ${className ?? ''}`} aria-label={title}>
      <h2 className='text-sm font-semibold text-[#575A66]'>{title}</h2>
      {children}
    </section>
  )
}

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const email = useArenaEmailId()
  const [tab, setTab] = useState<TabKey>('overview')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)

  const companyByKey = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of result.companies ?? []) {
      if ((c.company_key ?? '').trim() !== '') map.set(c.company_key, c)
      if ((c.company_name ?? '').trim() !== '') map.set(c.company_name.toLowerCase(), c)
    }
    return map
  }, [result.companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    const out: EnrichedSignal[] = []
    for (const s of result.signals) {
      const type = (s.signal_type ?? '').toUpperCase()
      if (type.includes(NO_SIGNIFICANT_SIGNAL)) continue
      const dateIso = storedSignalDate(s)
      const d = new Date(dateIso)
      const timestamp = Number.isNaN(d.getTime()) ? 0 : d.getTime()
      const company =
        companyByKey.get((s.company_key ?? '').trim()) ??
        companyByKey.get(companyNameOf(s).toLowerCase())
      out.push({
        s,
        severity: normalizeStoredSeverity(s),
        displayType: storedDisplayType(s),
        dateIso,
        timestamp,
        weekKey: timestamp === 0 ? '' : weekKeyOf(d),
        industry: company ? industryOf(company) : '\u2014',
        links: getStoredSourceLinks(s),
      })
    }
    return out.sort((a, b) => b.timestamp - a.timestamp)
  }, [result.signals, companyByKey])

  const companyOf = (e: EnrichedSignal): StoredCompany | undefined => {
    const byKey = companyByKey.get((e.s.company_key ?? '').trim())
    if (byKey) return byKey
    return companyByKey.get(companyNameOf(e.s).toLowerCase())
  }

  const severityCounts = useMemo<Record<NormalizedSeverity, number>>(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const e of enriched) counts[e.severity] += 1
    return counts
  }, [enriched])

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    return map
  }, [enriched])

  const weeklyData = useMemo<WeekBucket[]>(() => {
    const now = new Date()
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
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

  const spark = weeklyData.map((w) => w.count)

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    dash.total_companies ??
    dash.companies_total ??
    dash.companies_tracked ??
    result.total_companies ??
    (result.companies ?? []).length

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: dash.total_signals ?? enriched.length,
      accent: '#1A73E8',
      spark,
      pills: [
        { label: 'H', value: dash.high_alerts ?? severityCounts.HIGH, color: '#FF5252' },
        { label: 'M', value: dash.medium_alerts ?? severityCounts.MEDIUM, color: '#FB8145' },
        { label: 'L', value: dash.low_alerts ?? severityCounts.LOW, color: '#9AA0AE' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: dash.high_alerts ?? severityCounts.HIGH, accent: '#F31A1A', spark },
    {
      icon: '\u{1F454}',
      label: 'C-Suite Changes',
      value: dash.csuite_changes ?? (typeCounts.get('C-Suite Join') ?? 0) + (typeCounts.get('C-Suite Exit') ?? 0),
      accent: '#B364D7',
      spark,
    },
    { icon: '\u{1F4B0}', label: 'Funding', value: dash.funding ?? typeCounts.get('Funding Round') ?? 0, accent: '#3BC884', spark },
    {
      icon: '\u{1F91D}',
      label: 'Mergers & Acquisitions',
      value: dash.mergers_acquisitions ?? typeCounts.get('Acquisition / M&A') ?? 0,
      accent: '#FB8145',
      spark,
    },
    { icon: '\u{1F4C8}', label: 'IPO', value: dash.ipo ?? typeCounts.get('IPO') ?? 0, accent: '#DFC612', spark },
    {
      icon: '\u{1F680}',
      label: 'Product Launches',
      value: dash.product_launches ?? typeCounts.get('Product Launch') ?? 0,
      accent: '#00A7D6',
      spark,
    },
    {
      icon: '\u{1F517}',
      label: 'Partnerships',
      value: dash.partnerships ?? typeCounts.get('Partnership') ?? 0,
      accent: '#F8528F',
      spark,
    },
  ]

  const severityData = useMemo(
    () => SEVERITIES.map((sv) => ({ name: sv, value: severityCounts[sv], color: OVERVIEW_SEVERITY_COLORS[sv] })),
    [severityCounts]
  )
  const severityTotal = severityData.reduce((acc, d) => acc + d.value, 0)

  const familyData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        name: FAMILY_META[f].label,
        value: enriched.filter((e) => familyOf(e) === f).length,
        color: FAMILY_META[f].color,
      })),
    [enriched]
  )
  const familyTotal = familyData.reduce((acc, d) => acc + d.value, 0)

  const typeBreakdown = useMemo(
    () =>
      Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count, color: typeColor(type) }))
        .sort((a, b) => b.count - a.count),
    [typeCounts]
  )

  const topCompanies = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) {
      const name = companyNameOf(e.s)
      if (name === '\u2014') continue
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [enriched])

  const trendHighlights = useMemo(() => {
    const mostSignals = topCompanies[0] ?? null
    let mostHighName = ''
    let mostHighCount = 0
    const highByCompany = new Map<string, number>()
    for (const e of enriched) {
      if (e.severity !== 'HIGH') continue
      const name = companyNameOf(e.s)
      if (name === '\u2014') continue
      const next = (highByCompany.get(name) ?? 0) + 1
      highByCompany.set(name, next)
      if (next > mostHighCount) {
        mostHighCount = next
        mostHighName = name
      }
    }
    const mostCommonType = typeBreakdown[0] ?? null
    const latest = enriched[0] ?? null
    return [
      {
        label: 'Most Signals',
        value: mostSignals ? mostSignals.company : '\u2014',
        sub: mostSignals
          ? `${mostSignals.count} total signal${mostSignals.count === 1 ? '' : 's'}`
          : 'No companies yet',
        accent: '#1A73E8',
      },
      {
        label: 'Most High Alerts',
        value: mostHighCount > 0 ? mostHighName : '\u2014',
        sub:
          mostHighCount > 0
            ? `${mostHighCount} high-severity signal${mostHighCount === 1 ? '' : 's'}`
            : 'No high-severity signals',
        accent: '#F31A1A',
      },
      {
        label: 'Most Common Type',
        value: mostCommonType ? mostCommonType.type : '\u2014',
        sub: mostCommonType
          ? `${mostCommonType.count} occurrence${mostCommonType.count === 1 ? '' : 's'}`
          : 'No signal types yet',
        accent: '#B364D7',
      },
      {
        label: 'Most Recent Signal',
        value: latest ? companyNameOf(latest.s) : '\u2014',
        sub: latest ? `${latest.displayType} \u00b7 ${formatDate(latest.dateIso)}` : 'No signals yet',
        accent: '#3BC884',
      },
    ]
  }, [enriched, topCompanies, typeBreakdown])

  const signalTypes = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched]
  )

  const filteredSignals = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (selectedWeek !== null && e.weekKey !== selectedWeek) return false
      if (
        q !== '' &&
        !companyNameOf(e.s).toLowerCase().includes(q) &&
        !(e.s.summary ?? '').toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [enriched, severityFilter, familyFilter, typeFilter, selectedWeek, search])

  const overviewFeed = useMemo(() => {
    const base = selectedWeek === null ? enriched : enriched.filter((e) => e.weekKey === selectedWeek)
    return base.slice(0, 12)
  }, [enriched, selectedWeek])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const map = new Map<string, EnrichedSignal[]>()
    for (const e of enriched) {
      const key =
        (e.s.company_key ?? '').trim() !== '' ? e.s.company_key : companyNameOf(e.s).toLowerCase()
      const arr = map.get(key)
      if (arr) arr.push(e)
      else map.set(key, [e])
    }
    const rows: CompanyRowData[] = []
    for (const c of result.companies ?? []) {
      const signals = map.get(c.company_key) ?? map.get(c.company_name.toLowerCase()) ?? []
      rows.push({
        key: (c.company_id ?? '').trim() !== '' ? c.company_id : c.company_key,
        company: c,
        signals,
        latest: signals[0] ?? null,
        techStack: extraList(c, ['tech_stack', 'technologies']),
        keywords: extraList(c, ['keywords', 'tags']),
      })
    }
    return rows.sort((a, b) => b.signals.length - a.signals.length)
  }, [enriched, result.companies])

  const insights = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])

  const lastActivityOf = (row: CompanyRowData): string => {
    const la = (row.company.last_analysed_at ?? '').trim()
    if (la !== '') return relativeTime(la)
    if (row.latest) return relativeTime(row.latest.dateIso)
    return '\u2014'
  }

  const handleCardClick = (label: string) => {
    if (label === 'Companies Tracked') {
      setTab('companies')
      return
    }
    const mapped = CARD_TYPE_FILTER[label]
    setTypeFilter(mapped ?? 'all')
    setTab('signals')
  }

  const toggleCompany = (key: string) => {
    setExpandedCompany((prev) => (prev === key ? null : key))
  }

  const handleDelete = async (row: CompanyRowData) => {
    if (deletingKey !== null) return
    const name = row.company.company_name
    if (!window.confirm(`Delete ${name} and all of its stored signals?`)) return
    setDeletingKey(row.key)
    try {
      const res = await fetch('/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company: name,
          companyId: row.company.company_id,
          confirm: true,
        }),
      })
      if (res.ok && onRefresh) await onRefresh()
    } catch {
      // network failure — keep the row; user can retry
    } finally {
      setDeletingKey(null)
    }
  }

  const clearFilters = () => {
    setSeverityFilter('all')
    setFamilyFilter('all')
    setTypeFilter('all')
    setSearch('')
    setSelectedWeek(null)
  }

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />
      <div className='mx-auto max-w-7xl px-4 py-6'>
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
                  selected={CARD_TYPE_FILTER[c.label] !== undefined && CARD_TYPE_FILTER[c.label] === typeFilter}
                  onClick={() => handleCardClick(c.label)}
                />
              ))}
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <ChartCard title={'Weekly Signal Trend (8 weeks) \u2014 click a bar to filter the feed'} className='lg:col-span-2'>
                {enriched.length === 0 ? (
                  <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No signals yet.</p>
                ) : (
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={weeklyData}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          const label = activeLabelOf(state)
                          if (label === null) return
                          const bucket = weeklyData.find((w) => w.label === label)
                          if (!bucket) return
                          setSelectedWeek((prev) => (prev === bucket.key ? null : bucket.key))
                        }}
                      >
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                          {weeklyData.map((w) => (
                            <Cell
                              key={w.key}
                              cursor='pointer'
                              fill={selectedWeek === null || selectedWeek === w.key ? '#1A73E8' : '#A3C7F6'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title='Severity Mix'>
                {severityTotal === 0 ? (
                  <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
                ) : (
                  <div className='mt-2 h-52'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={severityData}
                          dataKey='value'
                          nameKey='name'
                          innerRadius={45}
                          outerRadius={75}
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
                )}
                <ul className='mt-3 flex flex-wrap gap-4'>
                  {severityData.map((d) => (
                    <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                      <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                      {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
                    </li>
                  ))}
                </ul>
              </ChartCard>
            </div>
            <section aria-label='Recent signals' className='rounded-2xl border border-[#E2E3E5] bg-white p-5'>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                {selectedWeek !== null && (
                  <button
                    type='button'
                    onClick={() => setSelectedWeek(null)}
                    className='rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'
                  >
                    Week of {weekLabel(selectedWeek)} {'\u2715'}
                  </button>
                )}
                <span className='ml-auto text-xs text-[#8A8D99]'>{overviewFeed.length} shown</span>
              </div>
              {overviewFeed.length === 0 ? (
                <p className='mt-6 text-center text-sm text-[#8A8D99]'>No signals for this selection.</p>
              ) : (
                <div className='mt-3 space-y-3'>
                  {overviewFeed.map((e, i) => (
                    <OverviewSignalRow key={`${e.s.id}-${i}`} e={e} company={companyOf(e)} />
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
                    {['Company', 'Industry', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Last Activity', 'Actions'].map(
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
                  {companyRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                        No companies tracked yet. Import a company list to get started.
                      </td>
                    </tr>
                  ) : (
                    companyRows.map((row) => {
                      const expanded = expandedCompany === row.key
                      return (
                        <Fragment key={row.key}>
                          <tr
                            onClick={() => toggleCompany(row.key)}
                            className='cursor-pointer border-b border-[#F0F1F2] transition-colors last:border-b-0 hover:bg-[#F7F8F9]'
                          >
                            <td className='px-4 py-3 font-medium text-[#2C2D33]'>
                              <span className='inline-flex items-center gap-2'>
                                <span
                                  aria-hidden='true'
                                  className={`inline-block text-[10px] text-[#A7AAB2] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                                >
                                  {'\u25B6'}
                                </span>
                                {row.company.company_name}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-[#575A66]'>{industryOf(row.company)}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.signals.length}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.funding ?? 0}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.csuite ?? 0}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.product ?? 0}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.partnership ?? 0}</td>
                            <td className='px-4 py-3 text-[#8A8D99]'>{lastActivityOf(row)}</td>
                            <td className='px-4 py-3'>
                              <button
                                type='button'
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  void handleDelete(row)
                                }}
                                disabled={deletingKey !== null}
                                className='rounded-lg border border-[#E2E3E5] px-2.5 py-1 text-xs font-medium text-[#C21515] transition-colors hover:bg-[#FFF3F3] disabled:opacity-60'
                              >
                                {deletingKey === row.key ? 'Deleting\u2026' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className='border-b border-[#F0F1F2] last:border-b-0'>
                              <td colSpan={9} className='bg-[#F7F8F9] px-6 py-5'>
                                <div className='space-y-4'>
                                  <CompanyInfoSection company={row.company} />
                                  {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                    <div className='flex flex-wrap gap-2'>
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
                                          className='rounded-full bg-[#FBF7FD] px-2 py-0.5 text-[11px] font-medium text-[#8F50AC]'
                                        >
                                          {k}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div>
                                    <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>
                                      Signals ({row.signals.length})
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
              <input
                type='search'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search signals'
                aria-label='Search signals'
                className={selectCls}
              />
              <select
                className={selectCls}
                aria-label='Filter by severity'
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
                className={selectCls}
                aria-label='Filter by family'
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
                className={selectCls}
                aria-label='Filter by signal type'
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
                <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing filters or importing more companies.</p>
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
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              {trendHighlights.map((t) => (
                <div key={t.label} className='rounded-2xl border border-[#E2E3E5] bg-white p-4'>
                  <p className='text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]'>{t.label}</p>
                  <p className='mt-1 truncate text-xl font-semibold' style={{ color: t.accent }}>
                    {t.value}
                  </p>
                  <p className='mt-0.5 text-xs text-[#575A66]'>{t.sub}</p>
                </div>
              ))}
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <ChartCard title='Signals by Family'>
              {familyTotal === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie
                        data={familyData}
                        dataKey='value'
                        nameKey='name'
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        stroke='none'
                      >
                        {familyData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className='mt-3 flex flex-wrap gap-4'>
                {familyData.map((d) => (
                  <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                    <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                    {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
            <ChartCard title='Signal Type Breakdown'>
              {typeBreakdown.length === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={typeBreakdown} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                      <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis type='category' dataKey='type' width={150} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' radius={[0, 4, 4, 0]}>
                        {typeBreakdown.map((t) => (
                          <Cell key={t.type} fill={t.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Top 10 Companies by Signal Count'>
              {topCompanies.length === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
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
            <ChartCard title='Weekly Signal Trend (8 weeks)'>
              {enriched.length === 0 ? (
                <p className='mb-16 mt-16 text-center text-sm text-[#8A8D99]'>No data yet.</p>
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
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
            </div>
          </div>
        )}
        {tab === 'insights' && (
          <div>
            {insights.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>
                  Insights surface HIGH-severity signals only. Check the Signals tab for the full feed.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {insights.slice(0, 100).map((e, i) => (
                  <OverviewSignalRow key={`${e.s.id}-${i}`} e={e} company={companyOf(e)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
