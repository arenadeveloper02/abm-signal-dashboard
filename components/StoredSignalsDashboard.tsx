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
    const map = new Map<string, number>()
    for (const e of enriched) {
      if (e.weekKey === '') continue
      map.set(e.weekKey, (map.get(e.weekKey) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-8)
      .map(([key, count]) => ({ key, label: weekLabel(key), count }))
  }, [enriched])

  const weeklySpark = useMemo(() => weeklyBuckets.map((w) => w.count), [weeklyBuckets])

  const typeCounts = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return map
  }, [enriched])

  const signalTypeOptions = useMemo(() => Array.from(typeCounts.keys()).sort(), [typeCounts])

  const typePieData = useMemo(
    () =>
      Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count, color: typeColor(type) }))
        .sort((a, b) => b.count - a.count),
    [typeCounts]
  )

  const typePieTotal = useMemo(() => typePieData.reduce((acc, t) => acc + t.count, 0), [typePieData])

  const familyBarData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        label: FAMILY_META[f].label,
        count: enriched.filter((e) => familyOf(e) === f).length,
        color: FAMILY_META[f].color,
      })),
    [enriched]
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

  const companyRows = useMemo<CompanyRowData[]>(() => {
    return (result.companies ?? [])
      .map((c, idx) => {
        const key = c.company_id !== '' ? c.company_id : c.company_key !== '' ? c.company_key : `company-${idx}`
        const signals = enriched
          .filter(
            (e) =>
              (c.company_id !== '' && e.s.company_id === c.company_id) ||
              (c.company_key !== '' && e.s.company_key === c.company_key)
          )
          .slice()
          .sort((a, b) => b.timestamp - a.timestamp)
        return {
          key,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'techStack', 'technologies']),
          keywords: extraList(c, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [result.companies, enriched])

  const topCompanies = useMemo(
    () =>
      companyRows
        .filter((r) => r.signals.length > 0)
        .slice(0, 10)
        .map((r) => ({ company: r.company.company_name, count: r.signals.length })),
    [companyRows]
  )

  const insights = useMemo(
    () =>
      enriched
        .filter((e) => e.severity === 'HIGH')
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp),
    [enriched]
  )

  const overviewFeed = useMemo(() => {
    return enriched
      .filter((e) => {
        if (feedType !== null && e.displayType !== feedType) return false
        if (feedWeek !== null && e.weekKey !== feedWeek) return false
        if (feedFamily !== null && familyOf(e) !== feedFamily) return false
        if (industryFilter !== null && e.industry !== industryFilter) return false
        return true
      })
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek, feedFamily, industryFilter])

  const filteredSignals = useMemo(() => {
    return enriched
      .filter((e) => {
        if (sigType !== 'all' && e.displayType !== sigType) return false
        if (sigSeverity !== 'all' && e.severity !== sigSeverity) return false
        if (sigFamily !== 'all' && familyOf(e) !== sigFamily) return false
        return true
      })
      .slice()
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, sigType, sigSeverity, sigFamily])

  const dashboard: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    dashboard.total_companies ??
    dashboard.companies_total ??
    dashboard.companies_tracked ??
    result.total_companies ??
    (result.companies ? result.companies.length : 0)
  const totalSignals = enriched.length

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
    setIndustryFilter(null)
  }

  const toggleType = (type: string) => setFeedType((prev) => (prev === type ? null : type))
  const toggleFamily = (f: Family) => setFeedFamily((prev) => (prev === f ? null : f))
  const toggleIndustry = (ind: string) => setIndustryFilter((prev) => (prev === ind ? null : ind))

  const handleCardClick = (label: string) => {
    const t = CARD_TYPE_FILTER[label]
    if (t === undefined) {
      clearFeedFilters()
      return
    }
    setFeedType((prev) => (prev === t ? null : t))
  }

  const cards = useMemo<StoredCardDef[]>(() => {
    const count = (label: string): number => typeCounts.get(label) ?? 0
    return [
      { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark: weeklySpark },
      {
        icon: '\u{1F4E1}',
        label: 'Total Signals',
        value: totalSignals,
        accent: '#1A73E8',
        spark: weeklySpark,
        pills: [
          { label: 'H', value: severityCounts.HIGH, color: '#FF5252' },
          { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
          { label: 'L', value: severityCounts.LOW, color: '#9AA0AE' },
        ],
      },
      { icon: '\u{1F6A8}', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: weeklySpark },
      { icon: '\u{1F4B0}', label: 'Funding', value: count('Funding Round'), accent: '#3BC884', spark: weeklySpark },
      { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: count('Acquisition / M&A'), accent: '#FB8145', spark: weeklySpark },
      { icon: '\u{1F4C8}', label: 'IPO', value: count('IPO'), accent: '#DFC612', spark: weeklySpark },
      { icon: '\u{1F680}', label: 'Product Launches', value: count('Product Launch'), accent: '#00A7D6', spark: weeklySpark },
      { icon: '\u{1F517}', label: 'Partnerships', value: count('Partnership'), accent: '#F8528F', spark: weeklySpark },
      { icon: '\u{1F4F0}', label: 'News', value: count('News Mention'), accent: '#6D717F', spark: weeklySpark },
    ]
  }, [typeCounts, totalCompanies, totalSignals, severityCounts, weeklySpark])

  const hasFeedFilter = feedType !== null || feedWeek !== null || feedFamily !== null || industryFilter !== null

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <div className='border-b border-[#E2E3E5] bg-white'>
        <div className='mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4'>
          <h1 className='text-base font-semibold text-[#2C2D33]'>Stored Signals</h1>
          <span className='text-xs text-[#8A8D99]'>
            {formatNumber(totalCompanies)} companies {'\u00b7'} {formatNumber(totalSignals)} signal
            {totalSignals === 1 ? '' : 's'}
          </span>
          {result.unmatched_inputs.length > 0 && (
            <span className='rounded-full border border-[#FDCDB5] bg-[#FFF9F5] px-2 py-0.5 text-[11px] font-medium text-[#974D29]'>
              {result.unmatched_inputs.length} unmatched input{result.unmatched_inputs.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>
      <TabBar active={tab} onChange={setTab} />
      <main className='mx-auto max-w-7xl space-y-6 px-4 py-6' role='tabpanel' aria-label={`${tab} panel`}>
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
                  selected={feedType !== null && CARD_TYPE_FILTER[c.label] === feedType}
                  onClick={() => handleCardClick(c.label)}
                />
              ))}
            </div>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <ChartCard title='Weekly Signal Trend (click a bar to filter the feed)'>
                {weeklyBuckets.length === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={weeklyBuckets}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          const label = activeLabelOf(state)
                          if (label === null) return
                          const wk = weeklyBuckets.find((w) => w.label === label)
                          if (!wk) return
                          setFeedWeek((prev) => (prev === wk.key ? null : wk.key))
                        }}
                      >
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} cursor='pointer' />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title='Signals by Category (click a bar to filter the feed)'>
                {totalSignals === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={familyBarData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                          {familyBarData.map((d) => (
                            <Cell key={d.family} fill={d.color} cursor='pointer' onClick={() => toggleFamily(d.family)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title='Signals by Industry (click a bar to filter the feed)'>
                {industryData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart data={industryData} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                        <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis type='category' dataKey='industry' width={140} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[0, 4, 4, 0]}>
                          {industryData.map((d) => (
                            <Cell key={d.industry} fill='#00A7D6' cursor='pointer' onClick={() => toggleIndustry(d.industry)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title='Signal Type Breakdown (click a slice to filter the feed)'>
                {typePieTotal === 0 ? (
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
                              <Cell key={t.type} fill={t.color} cursor='pointer' onClick={() => toggleType(t.type)} />
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

            {hasFeedFilter && (
              <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white px-4 py-3'>
                <span className='text-xs font-medium text-[#575A66]'>Feed filters:</span>
                {feedType !== null && (
                  <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    {feedType}
                  </span>
                )}
                {feedWeek !== null && (
                  <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    Week of {weekLabel(feedWeek)}
                  </span>
                )}
                {feedFamily !== null && (
                  <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    {FAMILY_META[feedFamily].label}
                  </span>
                )}
                {industryFilter !== null && (
                  <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                    {industryFilter}
                  </span>
                )}
                <button
                  type='button'
                  onClick={clearFeedFilters}
                  className='ml-auto rounded-lg border border-[#E2E3E5] px-3 py-1 text-xs font-medium text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
                >
                  Clear
                </button>
              </div>
            )}

            <section aria-label='Recent signals feed' className='space-y-3'>
              <div className='flex items-center gap-2'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                <span className='text-xs text-[#8A8D99]'>
                  {overviewFeed.length} signal{overviewFeed.length === 1 ? '' : 's'}
                </span>
              </div>
              {overviewFeed.length === 0 ? (
                <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                  <p className='text-sm font-medium text-[#2C2D33]'>No signals match the current filters</p>
                  <p className='mt-1 text-xs text-[#8A8D99]'>Clear the feed filters to see all stored signals.</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {overviewFeed.slice(0, 30).map((e, i) => (
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
          <section className='rounded-2xl border border-[#E2E3E5] bg-white' aria-label='Companies table'>
            <div className='max-h-[70vh] overflow-auto rounded-2xl'>
              <table className='w-full min-w-[760px] text-sm'>
                <thead>
                  <tr>
                    {['Company', 'Industry', 'HQ', 'Employees', 'Signals', 'Latest Signal'].map((h) => (
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
                      <td colSpan={6} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
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
                            onClick={() => setExpandedCompany((prev) => (prev === row.key ? null : row.key))}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                setExpandedCompany((prev) => (prev === row.key ? null : row.key))
                              }
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
                            <td className='px-4 py-3 text-[#575A66]'>
                              {extraField(row.company, ['employees', 'employee_count', 'company_size'])}
                            </td>
                            <td className='px-4 py-3 text-[#575A66]'>{row.signals.length}</td>
                            <td className='px-4 py-3 text-[#8A8D99]'>
                              {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                            </td>
                          </tr>
                          {expanded && (
                            <tr className='border-b border-[#F0F1F2] last:border-b-0'>
                              <td colSpan={6} className='bg-[#F7F8F9] px-6 py-5'>
                                {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                  <div className='mb-4 flex flex-wrap gap-1.5'>
                                    {row.techStack.map((t) => (
                                      <span
                                        key={`tech-${t}`}
                                        className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'
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
                                  <p className='text-xs text-[#8A8D99]'>No signals recorded for this company yet.</p>
                                ) : (
                                  <div className='space-y-3'>
                                    {row.signals.map((e, i) => (
                                      <SignalRow key={`${e.s.id}-${i}`} e={e} />
                                    ))}
                                  </div>
                                )}
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
          </section>
        )}

        {tab === 'signals' && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <select
                aria-label='Filter by signal type'
                className={selectCls}
                value={sigType}
                onChange={(ev) => setSigType(ev.target.value)}
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
                value={sigSeverity}
                onChange={(ev) => setSigSeverity(ev.target.value)}
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
                onChange={(ev) => setSigFamily(ev.target.value)}
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
                {filteredSignals.length} of {enriched.length} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>
            {filteredSignals.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing the filters above.</p>
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
            <ChartCard title='Weekly Signal Trend'>
              {weeklyBuckets.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={weeklyBuckets}
                      margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                      onClick={(state) => {
                        const label = activeLabelOf(state)
                        if (label === null) return
                        const wk = weeklyBuckets.find((w) => w.label === label)
                        if (!wk) return
                        setFeedWeek((prev) => (prev === wk.key ? null : wk.key))
                        setTab('overview')
                      }}
                    >
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#3BC884' radius={[4, 4, 0, 0]} cursor='pointer' />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title='Signals by Category'>
              {totalSignals === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={familyBarData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                        {familyBarData.map((d) => (
                          <Cell
                            key={d.family}
                            fill={d.color}
                            cursor='pointer'
                            onClick={() => {
                              toggleFamily(d.family)
                              setTab('overview')
                            }}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title='Top 10 Companies by Signal Count'>
              {topCompanies.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-72'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={topCompanies} layout='vertical' margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                      <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis type='category' dataKey='company' width={140} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#00A7D6' radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title='Signal Type Breakdown'>
              {typePieTotal === 0 ? (
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

        {tab === 'insights' && (
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <h2 className='text-sm font-semibold text-[#575A66]'>High-Severity Insights</h2>
              <span className='text-xs text-[#8A8D99]'>
                {insights.length} insight{insights.length === 1 ? '' : 's'}
              </span>
            </div>
            {insights.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>
                  Insights list HIGH severity signals only. Check the Signals tab for medium and low severity activity.
                </p>
              </div>
            ) : (
              insights.map((e, i) => (
                <OverviewSignalRow
                  key={`${e.s.id}-${i}`}
                  e={e}
                  company={companyLookup.get(e.s.company_id) ?? companyLookup.get(e.s.company_key)}
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}
