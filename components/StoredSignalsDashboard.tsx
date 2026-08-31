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
  'rounded-lg border border-[#E2E3E5] bg-white px-2 py-1.5 text-sm text-[#2C2D33] focus:border-[#1A73E8] focus:outline-none'

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

export default function StoredSignalsDashboard({ result }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [feedType, setFeedType] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
  const [feedFamily, setFeedFamily] = useState<Family | null>(null)
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [sigType, setSigType] = useState<string>('all')
  const [sigSeverity, setSigSeverity] = useState<string>('all')
  const [sigFamily, setSigFamily] = useState<string>('all')

  const companyLookup = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of result.companies ?? []) {
      if (c.company_id) map.set(c.company_id, c)
      if (c.company_key) map.set(c.company_key, c)
    }
    return map
  }, [result.companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    return result.signals
      .filter((s) => (s.signal_type ?? '').toUpperCase() !== NO_SIGNIFICANT_SIGNAL)
      .map((s) => {
        const dateIso = storedSignalDate(s)
        const d = new Date(dateIso)
        const valid = dateIso !== '' && !Number.isNaN(d.getTime())
        const company = companyLookup.get(s.company_id) ?? companyLookup.get(s.company_key)
        const industry = (company?.industry ?? '').trim()
        return {
          s,
          severity: normalizeStoredSeverity(s),
          displayType: storedDisplayType(s),
          dateIso,
          timestamp: valid ? d.getTime() : 0,
          weekKey: valid ? weekKeyOf(d) : '',
          industry: industry !== '' ? industry : '\u2014',
          links: getStoredSourceLinks(s),
        }
      })
  }, [result.signals, companyLookup])

  const severityCounts = useMemo(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    enriched.forEach((e) => {
      counts[e.severity] += 1
    })
    return counts
  }, [enriched])

  const weeklyBuckets = useMemo<WeekBucket[]>(() => {
    const now = new Date()
    const day = (now.getDay() + 6) % 7
    const currentStart = new Date(now)
    currentStart.setDate(currentStart.getDate() - day)
    currentStart.setHours(0, 0, 0, 0)
    const buckets: WeekBucket[] = []
    const index = new Map<string, number>()
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(currentStart)
      start.setDate(start.getDate() - i * 7)
      const key = weekKeyOf(start)
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

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const familyCounts = useMemo<Record<Family, number>>(() => {
    const counts: Record<Family, number> = { funding: 0, csuite: 0, product: 0, partnership: 0 }
    enriched.forEach((e) => {
      const f = familyOf(e)
      if (f === 'funding' || f === 'csuite' || f === 'product' || f === 'partnership') counts[f] += 1
    })
    return counts
  }, [enriched])

  const familyData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        name: FAMILY_META[f].label,
        value: familyCounts[f],
        color: FAMILY_META[f].color,
      })),
    [familyCounts],
  )

  const industryData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      if (e.industry === '\u2014') return
      map.set(e.industry, (map.get(e.industry) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [enriched])

  const typePieData = useMemo(
    () => typeCounts.map((t) => ({ type: t.type, count: t.count, color: typeColor(t.type) })),
    [typeCounts],
  )

  const topCompanyData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      const name = companyNameOf(e.s)
      if (name === '\u2014') return
      map.set(name, (map.get(name) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [enriched])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const groups = new Map<string, EnrichedSignal[]>()
    enriched.forEach((e) => {
      const id = (e.s.company_id ?? '').trim()
      const alt = (e.s.company_key ?? '').trim()
      const key = id !== '' ? id : alt !== '' ? alt : companyNameOf(e.s)
      const list = groups.get(key)
      if (list) list.push(e)
      else groups.set(key, [e])
    })
    return (result.companies ?? [])
      .map((c) => {
        const signals = (
          groups.get(c.company_id) ??
          groups.get(c.company_key) ??
          groups.get(c.company_name) ??
          []
        )
          .slice()
          .sort((a, b) => b.timestamp - a.timestamp)
        const rowKey =
          (c.company_id ?? '').trim() !== ''
            ? c.company_id
            : (c.company_key ?? '').trim() !== ''
              ? c.company_key
              : c.company_name
        return {
          key: rowKey,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'techStack', 'technologies', 'tech']),
          keywords: extraList(c, ['keywords', 'tags', 'topics']),
        }
      })
      .sort((a, b) => (b.company.total ?? b.signals.length) - (a.company.total ?? a.signals.length))
  }, [enriched, result.companies])

  const sortedEnriched = useMemo(
    () => [...enriched].sort((a, b) => b.timestamp - a.timestamp),
    [enriched],
  )

  const overviewFeed = useMemo(
    () =>
      sortedEnriched.filter((e) => {
        if (feedWeek !== null && e.weekKey !== feedWeek) return false
        if (feedType !== null && e.displayType !== feedType) return false
        if (feedFamily !== null && familyOf(e) !== feedFamily) return false
        if (industryFilter !== null && e.industry !== industryFilter) return false
        return true
      }),
    [sortedEnriched, feedWeek, feedType, feedFamily, industryFilter],
  )

  const signalsFiltered = useMemo(
    () =>
      sortedEnriched.filter((e) => {
        if (sigType !== 'all' && e.displayType !== sigType) return false
        if (sigSeverity !== 'all' && e.severity !== sigSeverity) return false
        if (sigFamily !== 'all' && familyOf(e) !== sigFamily) return false
        return true
      }),
    [sortedEnriched, sigType, sigSeverity, sigFamily],
  )

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    result.total_companies ??
    dash.total_companies ??
    dash.companies_total ??
    dash.companies_tracked ??
    (result.companies ?? []).length
  const highAlerts = dash.high_alerts ?? result.counts_by_alert?.high ?? severityCounts.HIGH

  const typeCountOf = (label: string): number => typeCounts.find((t) => t.type === label)?.count ?? 0

  const sparkFor = (pred?: (e: EnrichedSignal) => boolean): number[] =>
    weeklyBuckets.map((w) => enriched.filter((e) => e.weekKey === w.key && (pred ? pred(e) : true)).length)

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark: sparkFor() },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: enriched.length,
      accent: '#1A73E8',
      spark: sparkFor(),
      pills: [
        { label: 'H', value: severityCounts.HIGH, color: '#FF5252' },
        { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
        { label: 'L', value: severityCounts.LOW, color: '#9AA0AE' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: highAlerts, accent: '#F31A1A', spark: sparkFor((e) => e.severity === 'HIGH') },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: familyCounts.csuite, accent: '#B364D7', spark: sparkFor((e) => familyOf(e) === 'csuite') },
    { icon: '\u{1F4B0}', label: 'Funding', value: typeCountOf('Funding Round'), accent: '#3BC884', spark: sparkFor((e) => e.displayType === 'Funding Round') },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: typeCountOf('Acquisition / M&A'), accent: '#FB8145', spark: sparkFor((e) => e.displayType === 'Acquisition / M&A') },
    { icon: '\u{1F4C8}', label: 'IPO', value: typeCountOf('IPO'), accent: '#DFC612', spark: sparkFor((e) => e.displayType === 'IPO') },
    { icon: '\u{1F680}', label: 'Product Launches', value: typeCountOf('Product Launch'), accent: '#00A7D6', spark: sparkFor((e) => e.displayType === 'Product Launch') },
    { icon: '\u{1F517}', label: 'Partnerships', value: typeCountOf('Partnership'), accent: '#F8528F', spark: sparkFor((e) => e.displayType === 'Partnership') },
  ]

  const isCardSelected = (label: string): boolean => {
    if (label === 'C-Suite Changes') return feedFamily === 'csuite'
    const t = CARD_TYPE_FILTER[label]
    return t !== undefined && feedType === t
  }

  const handleCardClick = (label: string) => {
    if (label === 'C-Suite Changes') {
      setFeedFamily((prev) => (prev === 'csuite' ? null : 'csuite'))
      return
    }
    const t = CARD_TYPE_FILTER[label]
    if (t !== undefined) {
      setFeedType((prev) => (prev === t ? null : t))
      return
    }
    setFeedType(null)
    setFeedFamily(null)
    setFeedWeek(null)
    setIndustryFilter(null)
  }

  const hasFeedFilter = feedWeek !== null || feedType !== null || feedFamily !== null || industryFilter !== null

  const clearFeedFilters = () => {
    setFeedWeek(null)
    setFeedType(null)
    setFeedFamily(null)
    setIndustryFilter(null)
  }

  const displayTypes = typeCounts.map((t) => t.type)
  const typeTotal = typePieData.reduce((acc, t) => acc + t.count, 0)

  const highSignals = sortedEnriched.filter((e) => e.severity === 'HIGH')
  const highByFamily = FAMILIES.map((f) => ({ family: f, items: highSignals.filter((e) => familyOf(e) === f) })).filter(
    (g) => g.items.length > 0,
  )

  const topCompanyRow = companyRows[0] ?? null
  const topTypeEntry = typeCounts[0] ?? null
  const latestSignal = sortedEnriched[0] ?? null

  const insightTiles = [
    {
      label: 'Most Signals',
      value: topCompanyRow ? topCompanyRow.company.company_name : '\u2014',
      sub: topCompanyRow
        ? `${formatNumber(topCompanyRow.company.total ?? topCompanyRow.signals.length)} total signals`
        : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'Most Common Type',
      value: topTypeEntry ? topTypeEntry.type : '\u2014',
      sub: topTypeEntry ? `${formatNumber(topTypeEntry.count)} occurrence${topTypeEntry.count === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? companyNameOf(latestSignal.s) : '\u2014',
      sub: latestSignal ? `${latestSignal.displayType} \u00b7 ${formatDate(latestSignal.dateIso)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <TabBar active={tab} onChange={setTab} />
      <main className='mx-auto max-w-7xl px-4 py-6' role='tabpanel' aria-label={`${tab} panel`}>
        {(result.unmatched_inputs ?? []).length > 0 && (
          <div className='mb-4 rounded-xl border border-[#FDCDB5] bg-[#FFF9F5] px-4 py-3 text-xs text-[#974D29]'>
            {result.unmatched_inputs.length} input compan{result.unmatched_inputs.length === 1 ? 'y' : 'ies'} could not be
            matched: {result.unmatched_inputs.join(', ')}
          </div>
        )}

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
                  selected={isCardSelected(c.label)}
                  onClick={() => handleCardClick(c.label)}
                />
              ))}
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <ChartCard title='Weekly Signal Trend (click bar to filter feed)'>
                {enriched.length === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={weeklyBuckets}
                        margin={{ top: 10, right: 12, bottom: 0, left: -8 }}
                        onClick={(state: unknown) => {
                          const label = activeLabelOf(state)
                          if (label === null) return
                          const bucket = weeklyBuckets.find((w) => w.label === label)
                          if (!bucket) return
                          setFeedWeek((prev) => (prev === bucket.key ? null : bucket.key))
                        }}
                      >
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                          {weeklyBuckets.map((w) => (
                            <Cell key={w.key} fill={feedWeek === w.key ? '#155CBA' : '#1A73E8'} cursor='pointer' />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title='Signals by Category (click slice to filter feed)'>
                {enriched.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-56'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Pie
                            data={familyData}
                            dataKey='value'
                            nameKey='name'
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={3}
                            stroke='none'
                          >
                            {familyData.map((d) => (
                              <Cell
                                key={d.family}
                                fill={d.color}
                                cursor='pointer'
                                onClick={() => setFeedFamily((prev) => (prev === d.family ? null : d.family))}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className='mt-2 flex flex-wrap gap-3' aria-label='Category legend'>
                      {familyData.map((d) => (
                        <li key={d.family} className='flex items-center gap-1.5 text-xs text-[#575A66]'>
                          <span className='h-2 w-2 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                          {d.name} {'\u00b7'} <span className='font-medium text-[#2C2D33]'>{d.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </ChartCard>

              <ChartCard title='Signals by Industry (click bar to filter feed)'>
                {industryData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={industryData} layout='vertical' margin={{ top: 5, right: 16, bottom: 0, left: 4 }}>
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                        <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis
                          type='category'
                          dataKey='industry'
                          width={110}
                          stroke='#A7AAB2'
                          tick={{ fill: '#575A66', fontSize: 11 }}
                        />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[0, 4, 4, 0]} barSize={16}>
                          {industryData.map((d) => (
                            <Cell
                              key={d.industry}
                              fill={industryFilter === d.industry ? '#155CBA' : '#00A7D6'}
                              cursor='pointer'
                              onClick={() => setIndustryFilter((prev) => (prev === d.industry ? null : d.industry))}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
            </div>

            <section aria-label='Recent signals feed'>
              <div className='mb-3 flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold text-[#2C2D33]'>Recent Signals</h2>
                <span className='text-xs text-[#8A8D99]'>
                  {formatNumber(overviewFeed.length)} of {formatNumber(enriched.length)}
                </span>
                {feedWeek !== null && (
                  <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    Week of {weekLabel(feedWeek)}
                  </span>
                )}
                {feedType !== null && (
                  <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    {feedType}
                  </span>
                )}
                {feedFamily !== null && (
                  <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    {FAMILY_META[feedFamily].label}
                  </span>
                )}
                {industryFilter !== null && (
                  <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    {industryFilter}
                  </span>
                )}
                {hasFeedFilter && (
                  <button
                    type='button'
                    onClick={clearFeedFilters}
                    className='ml-auto rounded-lg border border-[#E2E3E5] bg-white px-3 py-1 text-xs font-medium text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
                  >
                    Clear feed filters
                  </button>
                )}
              </div>
              {overviewFeed.length === 0 ? (
                <div className='rounded-2xl border border-[#E2E3E5] bg-white p-10 text-center'>
                  <p className='text-sm font-medium text-[#2C2D33]'>No signals match the current feed filters</p>
                  <p className='mt-1 text-xs text-[#8A8D99]'>Click an active chart element again or clear the feed filters.</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {overviewFeed.slice(0, 50).map((e, i) => (
                    <OverviewSignalRow
                      key={`${e.s.id}-${i}`}
                      e={e}
                      company={companyLookup.get(e.s.company_id) ?? companyLookup.get(e.s.company_key)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className='overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white'>
            <div className='max-h-[70vh] overflow-auto'>
              <table className='w-full min-w-[760px] text-sm'>
                <thead>
                  <tr>
                    {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Latest'].map((h) => (
                      <th
                        key={h}
                        className='sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'
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
                    companyRows.map((row) => {
                      const expanded = expandedCompany === row.key
                      return (
                        <Fragment key={row.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => setExpandedCompany(expanded ? null : row.key)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setExpandedCompany(expanded ? null : row.key)
                            }}
                            className='cursor-pointer border-b border-[#F0F1F2] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none'
                          >
                            <td className='px-4 py-3 font-medium text-[#2C2D33]'>
                              <span className='inline-flex items-center gap-2'>
                                <span
                                  aria-hidden='true'
                                  className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
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
                            <td className='px-4 py-3 text-[#2C2D33]'>
                              {formatNumber(row.company.total ?? row.signals.length)}
                            </td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.funding ?? 0}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.csuite ?? 0}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.product ?? 0}</td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.company.by_family?.partnership ?? 0}</td>
                            <td className='px-4 py-3 text-[#8A8D99]'>
                              {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                            </td>
                          </tr>
                          {expanded && (
                            <tr className='border-b border-[#F0F1F2] last:border-b-0'>
                              <td colSpan={9} className='bg-[#F7F8F9] px-6 py-5'>
                                <div className='grid gap-4'>
                                  <div className='flex flex-wrap gap-x-8 gap-y-2 text-xs text-[#575A66]'>
                                    <span>
                                      <span className='font-semibold text-[#2C2D33]'>Website:</span>{' '}
                                      {(row.company.website ?? '').trim() !== '' ? row.company.website : '\u2014'}
                                    </span>
                                    <span>
                                      <span className='font-semibold text-[#2C2D33]'>Domain:</span>{' '}
                                      {(row.company.domain ?? '').trim() !== '' ? row.company.domain : '\u2014'}
                                    </span>
                                    <span>
                                      <span className='font-semibold text-[#2C2D33]'>Employees:</span>{' '}
                                      {extraField(row.company, ['employees', 'employee_count'])}
                                    </span>
                                  </div>
                                  {row.techStack.length > 0 && (
                                    <div className='flex flex-wrap items-center gap-1.5'>
                                      <span className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Tech</span>
                                      {row.techStack.map((t) => (
                                        <span
                                          key={t}
                                          className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {row.keywords.length > 0 && (
                                    <div className='flex flex-wrap items-center gap-1.5'>
                                      <span className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Keywords</span>
                                      {row.keywords.map((k) => (
                                        <span
                                          key={k}
                                          className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
                                        >
                                          {k}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {row.signals.length === 0 ? (
                                    <p className='text-xs text-[#8A8D99]'>No stored signals for this company.</p>
                                  ) : (
                                    <ul className='space-y-3'>
                                      {row.signals.map((e, i) => (
                                        <li key={`${e.s.id}-${i}`}>
                                          <SignalRow e={e} />
                                        </li>
                                      ))}
                                    </ul>
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
                aria-label='Filter by signal type'
                className={selectCls}
                value={sigType}
                onChange={(e) => setSigType(e.target.value)}
              >
                <option value='all'>All types</option>
                {displayTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                aria-label='Filter by severity'
                className={selectCls}
                value={sigSeverity}
                onChange={(e) => setSigSeverity(e.target.value)}
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
                value={sigFamily}
                onChange={(e) => setSigFamily(e.target.value)}
              >
                <option value='all'>All families</option>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_META[f].label}
                  </option>
                ))}
              </select>
              <button
                type='button'
                onClick={() => {
                  setSigType('all')
                  setSigSeverity('all')
                  setSigFamily('all')
                }}
                className='rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
              >
                Clear
              </button>
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {formatNumber(signalsFiltered.length)} of {formatNumber(enriched.length)} signal
                {enriched.length === 1 ? '' : 's'}
              </span>
            </div>
            {signalsFiltered.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F50D}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing the filters above.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {signalsFiltered.map((e, i) => (
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
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weeklyBuckets} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
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
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={familyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='name' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='value' name='Signals' radius={[4, 4, 0, 0]}>
                        {familyData.map((d) => (
                          <Cell key={d.family} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title='Top 10 Companies by Signal Count'>
              {topCompanyData.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={topCompanyData} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                      <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
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
                          data={typePieData}
                          dataKey='count'
                          nameKey='type'
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke='#FFFFFF'
                        >
                          {typePieData.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                    {typePieData.map((t) => {
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
          </div>
        )}

        {tab === 'insights' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
              {insightTiles.map((t) => (
                <div key={t.label} className='rounded-2xl border border-[#E2E3E5] bg-white p-4'>
                  <p className='text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]'>{t.label}</p>
                  <p className='mt-1 truncate text-xl font-semibold' style={{ color: t.accent }}>
                    {t.value}
                  </p>
                  <p className='mt-0.5 text-xs text-[#575A66]'>{t.sub}</p>
                </div>
              ))}
            </div>
            {highSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>
                  Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
                </p>
              </div>
            ) : (
              <div className='space-y-6'>
                {highByFamily.map((g) => (
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
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
