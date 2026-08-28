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

  const weeklyData = useMemo<WeekBucket[]>(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      if (e.weekKey === '') return
      map.set(e.weekKey, (map.get(e.weekKey) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-8)
      .map(([key, count]) => ({ key, label: weekLabel(key), count }))
  }, [enriched])

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const familyChartData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        label: FAMILY_META[f].label,
        count: enriched.filter((e) => familyOf(e) === f).length,
        color: FAMILY_META[f].color,
      })),
    [enriched]
  )

  const industryOptions = useMemo(
    () =>
      Array.from(new Set((result.companies ?? []).map((c) => industryOf(c))))
        .filter((i) => i !== '\u2014')
        .sort(),
    [result.companies]
  )

  const signalTypeOptions = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched]
  )

  const companyRows = useMemo<CompanyRowData[]>(() => {
    return (result.companies ?? [])
      .map((c) => {
        const key = (c.company_id ?? '') !== '' ? c.company_id : c.company_key
        const signals = enriched
          .filter((e) => (e.s.company_id !== '' && e.s.company_id === c.company_id) || (e.s.company_key !== '' && e.s.company_key === c.company_key))
          .sort((a, b) => b.timestamp - a.timestamp)
        return {
          key,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'techstack', 'technologies']),
          keywords: extraList(c, ['keywords', 'intent_keywords', 'topics']),
        }
      })
      .sort((a, b) => b.company.total - a.company.total)
  }, [result.companies, enriched])

  const topCompanies = useMemo(
    () =>
      companyRows.slice(0, 10).map((r) => ({ company: r.company.company_name, count: r.company.total })),
    [companyRows]
  )

  const feedSignals = useMemo(() => {
    return enriched
      .filter((e) => {
        if (feedType !== null && e.displayType !== feedType) return false
        if (feedWeek !== null && e.weekKey !== feedWeek) return false
        if (feedFamily !== null && familyOf(e) !== feedFamily) return false
        if (industryFilter !== null && e.industry !== industryFilter) return false
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek, feedFamily, industryFilter])

  const filteredSignals = useMemo(() => {
    return enriched
      .filter((e) => {
        if (sigFamily !== 'all' && familyOf(e) !== sigFamily) return false
        if (sigType !== 'all' && e.displayType !== sigType) return false
        if (sigSeverity !== 'all' && e.severity !== sigSeverity) return false
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, sigFamily, sigType, sigSeverity])

  const insightGroups = useMemo(() => {
    const high = enriched.filter((e) => e.severity === 'HIGH').sort((a, b) => b.timestamp - a.timestamp)
    return FAMILIES.map((f) => ({ family: f, items: high.filter((e) => familyOf(e) === f) })).filter(
      (g) => g.items.length > 0
    )
  }, [enriched])

  const familyCount = (f: Family): number => familyChartData.find((c) => c.family === f)?.count ?? 0
  const typeCount = (label: string): number => typeBreakdown.find((t) => t.type === label)?.count ?? 0

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies =
    dash.total_companies ??
    dash.companies_total ??
    dash.companies_tracked ??
    result.total_companies ??
    result.company_count ??
    (result.companies ?? []).length

  const spark = weeklyData.map((w) => w.count)

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: enriched.length,
      accent: '#1A73E8',
      spark,
      pills: [
        { label: 'H', value: severityCounts.HIGH, color: '#F31A1A' },
        { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
        { label: 'L', value: severityCounts.LOW, color: '#3BC884' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: familyCount('csuite'), accent: '#B364D7', spark },
    { icon: '\u{1F4B0}', label: 'Funding', value: typeCount('Funding Round'), accent: '#3BC884', spark },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: typeCount('Acquisition / M&A'), accent: '#FB8145', spark },
    { icon: '\u{1F4C8}', label: 'IPO', value: typeCount('IPO'), accent: '#DFC612', spark },
    { icon: '\u{1F4F0}', label: 'News', value: typeCount('News Mention'), accent: '#6D717F', spark },
    { icon: '\u{1F680}', label: 'Product Launches', value: typeCount('Product Launch'), accent: '#00A7D6', spark },
    { icon: '\u{1F517}', label: 'Partnerships', value: typeCount('Partnership'), accent: '#F8528F', spark },
  ]

  const severityPie = SEVERITIES.map((sev) => ({
    name: sev,
    value: severityCounts[sev],
    color: OVERVIEW_SEVERITY_COLORS[sev],
  }))
  const severityTotal = severityPie.reduce((acc, d) => acc + d.value, 0)

  const visibleCompanyRows =
    industryFilter === null ? companyRows : companyRows.filter((r) => industryOf(r.company) === industryFilter)

  const hasFeedFilter = feedType !== null || feedWeek !== null || feedFamily !== null || industryFilter !== null

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
    setIndustryFilter(null)
  }

  const clearSignalFilters = () => {
    setSigFamily('all')
    setSigType('all')
    setSigSeverity('all')
  }

  const handleCardClick = (label: string) => {
    if (label === 'C-Suite Changes') {
      setFeedFamily((prev) => (prev === 'csuite' ? null : 'csuite'))
      setFeedType(null)
      return
    }
    const mapped = CARD_TYPE_FILTER[label]
    if (mapped) {
      setFeedType((prev) => (prev === mapped ? null : mapped))
      setFeedFamily(null)
      return
    }
    clearFeedFilters()
  }

  return (
    <div className='min-h-screen bg-[#F7F8F9]'>
      <TabBar active={tab} onChange={setTab} />
      <main className='mx-auto max-w-7xl px-4 py-6' role='tabpanel' aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'>
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
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <ChartCard title='Weekly Signal Trend (click a bar to filter feed)'>
                {weeklyData.length === 0 ? (
                  <NoData />
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
                          setFeedWeek((prev) => (prev === bucket.key ? null : bucket.key))
                        }}
                      >
                        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                        <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                          {weeklyData.map((w) => (
                            <Cell key={w.key} cursor='pointer' fill={feedWeek === w.key ? '#10458B' : '#1A73E8'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title='Signal Type Breakdown'>
                {typeBreakdown.length === 0 ? (
                  <NoData />
                ) : (
                  <div className='mt-2 flex flex-col gap-4 sm:flex-row sm:items-center'>
                    <div className='h-64 w-full sm:w-1/2'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Pie
                            data={typeBreakdown}
                            dataKey='count'
                            nameKey='type'
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                            stroke='#FFFFFF'
                          >
                            {typeBreakdown.map((t) => (
                              <Cell
                                key={t.type}
                                fill={t.color}
                                cursor='pointer'
                                onClick={() => setFeedType((prev) => (prev === t.type ? null : t.type))}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                      {typeBreakdown.map((t) => (
                        <li key={t.type}>
                          <button
                            type='button'
                            onClick={() => setFeedType((prev) => (prev === t.type ? null : t.type))}
                            className='flex w-full items-center gap-2 text-left text-xs text-[#575A66] hover:text-[#2C2D33]'
                          >
                            <span className='h-2 w-2 shrink-0 rounded-full' style={{ backgroundColor: t.color }} aria-hidden='true' />
                            <span className='truncate'>{t.type}</span>
                            <span className='ml-auto shrink-0 text-[#8A8D99]'>{formatNumber(t.count)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </ChartCard>
            </div>
            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Recent signals feed'>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                <span className='text-xs text-[#8A8D99]'>
                  {formatNumber(feedSignals.length)} signal{feedSignals.length === 1 ? '' : 's'}
                </span>
                {hasFeedFilter && (
                  <button
                    type='button'
                    onClick={clearFeedFilters}
                    className='ml-auto rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-xs font-medium text-[#575A66] transition-colors hover:bg-[#F7F8F9]'
                  >
                    Clear filters
                  </button>
                )}
              </div>
              {feedSignals.length === 0 ? (
                <p className='mt-8 pb-4 text-center text-sm text-[#8A8D99]'>No signals match the current filters.</p>
              ) : (
                <div className='mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1'>
                  {feedSignals.slice(0, 50).map((e, i) => (
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
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <label className='text-xs font-medium uppercase tracking-wide text-[#8A8D99]' htmlFor='industry-filter'>
                Industry
              </label>
              <select
                id='industry-filter'
                className={selectCls}
                value={industryFilter ?? 'all'}
                onChange={(e) => setIndustryFilter(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value='all'>All industries</option>
                {industryOptions.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
              <span className='ml-auto text-xs text-[#8A8D99]'>{formatNumber(visibleCompanyRows.length)} companies</span>
            </div>
            <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
              <div className='max-h-[70vh] overflow-auto rounded-2xl'>
                <table className='w-full min-w-[860px] text-sm'>
                  <thead>
                    <tr>
                      {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Latest'].map(
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
                          No companies to display yet.
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
                              <td className='px-4 py-3 text-right text-[#2C2D33]'>{formatNumber(row.company.total)}</td>
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
                                  <div className='grid gap-4'>
                                    <div className='flex flex-wrap gap-6 text-xs text-[#575A66]'>
                                      <span>
                                        Employees:{' '}
                                        <span className='font-medium text-[#2C2D33]'>
                                          {extraField(row.company, ['employees', 'employee_count', 'headcount'])}
                                        </span>
                                      </span>
                                      <span>
                                        Website:{' '}
                                        <span className='font-medium text-[#2C2D33]'>
                                          {(row.company.website ?? '').trim() !== '' ? row.company.website : '\u2014'}
                                        </span>
                                      </span>
                                    </div>
                                    {row.techStack.length > 0 && (
                                      <div>
                                        <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Tech Stack</h3>
                                        <div className='mt-2 flex flex-wrap gap-1.5'>
                                          {row.techStack.map((t) => (
                                            <span
                                              key={t}
                                              className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
                                            >
                                              {t}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {row.keywords.length > 0 && (
                                      <div>
                                        <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Keywords</h3>
                                        <div className='mt-2 flex flex-wrap gap-1.5'>
                                          {row.keywords.map((k) => (
                                            <span
                                              key={k}
                                              className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'
                                            >
                                              {k}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Signal History</h3>
                                      {row.signals.length === 0 ? (
                                        <p className='mt-2 text-xs text-[#8A8D99]'>No signals recorded for this company.</p>
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
          </div>
        )}

        {tab === 'signals' && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
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
              <select
                aria-label='Filter by signal type'
                className={selectCls}
                value={sigType}
                onChange={(e) => setSigType(e.target.value)}
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
                onChange={(e) => setSigSeverity(e.target.value)}
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
                onClick={clearSignalFilters}
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
                <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing filters to see more signals.</p>
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
              {weeklyData.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' fill='#3BC884' radius={[4, 4, 0, 0]} />
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
                    <BarChart data={familyChartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
                      <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                        {familyChartData.map((c) => (
                          <Cell key={c.family} fill={c.color} />
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
                        {d.name} {'\u00b7'} <span className='text-[#2C2D33]'>{formatNumber(d.value)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ChartCard>
          </div>
        )}

        {tab === 'insights' &&
          (insightGroups.length === 0 ? (
            <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
              <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
              <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
              <p className='mt-1 text-xs text-[#8A8D99]'>
                Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
              </p>
            </div>
          ) : (
            <div className='space-y-6'>
              {insightGroups.map((g) => (
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
          ))}
      </main>
    </div>
  )
}
