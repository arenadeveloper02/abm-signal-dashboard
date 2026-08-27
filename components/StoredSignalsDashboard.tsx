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
  isCreativeHiring,
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

  const weekKeys = useMemo(() => {
    const set = new Set<string>()
    enriched.forEach((e) => {
      if (e.weekKey !== '') set.add(e.weekKey)
    })
    return Array.from(set).sort()
  }, [enriched])

  const weeklySeries = (predicate: (e: EnrichedSignal) => boolean): number[] => {
    if (weekKeys.length === 0) return [0]
    return weekKeys.map((wk) => enriched.filter((e) => e.weekKey === wk && predicate(e)).length)
  }

  const familyTotal = (family: 'funding' | 'csuite' | 'product' | 'partnership'): number => {
    if (enriched.length === 0) return result.counts_by_family[family] ?? 0
    return enriched.filter((e) => familyOf(e) === family).length
  }

  // ── Authoritative totals from the API `dashboard` object (never derived from the paginated page) ──
  const dash = result.dashboard
  const countsByAlert = result.counts_by_alert
  const countsByCategory = result.counts_by_category

  const companiesTracked =
    dash?.total_companies ?? result.total_companies ?? dash?.companies_total ?? dash?.companies_tracked ?? null

  const totalSignals = dash?.total_signal_rows ?? result.total_signal_rows ?? result.total ?? null

  const highAlerts = dash?.high_alerts ?? countsByAlert?.high ?? null
  const mediumAlerts = dash?.medium_alerts ?? countsByAlert?.medium ?? null
  const lowAlerts = dash?.low_alerts ?? countsByAlert?.low ?? null

  const categoryCount = (dashKey: keyof StoredDashboardTotals, categoryKey: string): number | null => {
    const dv = dash?.[dashKey]
    if (typeof dv === 'number') return dv
    const cv = countsByCategory?.[categoryKey]
    if (typeof cv === 'number') return cv
    return null
  }

  const creativeHiringCount = enriched.filter((e) => isCreativeHiring(e.s)).length

  const sparkFor = (type: string | undefined): number[] =>
    type === undefined ? weeklySeries(() => true) : weeklySeries((e) => e.displayType === type)

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: companiesTracked, accent: '#00A7D6', spark: weeklySeries(() => true) },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: totalSignals,
      accent: '#1A73E8',
      spark: weeklySeries(() => true),
      pills: [
        { label: 'H', value: highAlerts ?? 0, color: '#FF5252' },
        { label: 'M', value: mediumAlerts ?? 0, color: '#FB8145' },
        { label: 'L', value: lowAlerts ?? 0, color: '#9AA0AE' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: highAlerts, accent: '#F31A1A', spark: weeklySeries((e) => e.severity === 'HIGH') },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: categoryCount('csuite_changes', 'csuite_change'), accent: '#B364D7', spark: weeklySeries((e) => familyOf(e) === 'csuite') },
    { icon: '\u{1F4B0}', label: 'Funding', value: categoryCount('funding', 'funding'), accent: '#3BC884', spark: sparkFor(CARD_TYPE_FILTER['Funding']) },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: categoryCount('mergers_acquisitions', 'm_and_a'), accent: '#FB8145', spark: sparkFor(CARD_TYPE_FILTER['Mergers & Acquisitions']) },
    { icon: '\u{1F4C8}', label: 'IPO', value: categoryCount('ipo', 'ipo'), accent: '#DFC612', spark: sparkFor(CARD_TYPE_FILTER['IPO']) },
    { icon: '\u{1F4F0}', label: 'News', value: categoryCount('news', 'news'), accent: '#6D717F', spark: sparkFor(CARD_TYPE_FILTER['News']) },
    { icon: '\u{1F680}', label: 'Product Launches', value: categoryCount('product_launches', 'product_launch'), accent: '#00A7D6', spark: sparkFor(CARD_TYPE_FILTER['Product Launches']) },
    { icon: '\u{1F9EA}', label: 'R&D', value: categoryCount('r_and_d', 'r_and_d'), accent: '#B364D7', spark: weeklySeries(() => true) },
    { icon: '\u{1F517}', label: 'Partnerships', value: categoryCount('partnerships', 'partnership'), accent: '#F8528F', spark: sparkFor(CARD_TYPE_FILTER['Partnerships']) },
    { icon: '\u{1F3A8}', label: 'Creative Hiring', value: creativeHiringCount, accent: '#FF5252', spark: sparkFor(CARD_TYPE_FILTER['Creative Hiring']) },
  ]

  const handleCardClick = (label: string) => {
    const type = CARD_TYPE_FILTER[label]
    setFeedWeek(null)
    setFeedFamily(null)
    setIndustryFilter(null)
    setFeedType((prev) => (type === undefined ? null : prev === type ? null : type))
  }

  const feedSignals = useMemo(
    () =>
      enriched
        .filter((e) => {
          if (feedType !== null && e.displayType !== feedType) return false
          if (feedWeek !== null && e.weekKey !== feedWeek) return false
          if (feedFamily !== null && familyOf(e) !== feedFamily) return false
          if (industryFilter !== null && e.industry !== industryFilter) return false
          return true
        })
        .sort((a, b) => b.timestamp - a.timestamp),
    [enriched, feedType, feedWeek, feedFamily, industryFilter]
  )

  const hasFeedFilter = feedType !== null || feedWeek !== null || feedFamily !== null || industryFilter !== null

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
    setIndustryFilter(null)
  }

  const weeklyChartData = useMemo(
    () => weekKeys.map((wk) => ({ week: wk, count: enriched.filter((e) => e.weekKey === wk).length })),
    [weekKeys, enriched]
  )

  const familyChartData = FAMILIES.map((f) => ({
    family: f,
    label: FAMILY_META[f].label,
    count: familyTotal(f),
    color: FAMILY_META[f].color,
  }))

  const industryChartData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.industry, (map.get(e.industry) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [enriched])

  const typeBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const typeBreakdownTotal = typeBreakdown.reduce((acc, t) => acc + t.count, 0)

  const severityPieData = SEVERITIES.map((sv) => ({ name: sv, value: severityCounts[sv], color: SEVERITY_COLORS[sv] }))
  const severityPieTotal = severityPieData.reduce((acc, d) => acc + d.value, 0)

  const displayTypes = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched]
  )

  const filteredSignals = useMemo(
    () =>
      enriched
        .filter((e) => {
          if (sigType !== 'all' && e.displayType !== sigType) return false
          if (sigSeverity !== 'all' && e.severity !== sigSeverity) return false
          if (sigFamily !== 'all' && familyOf(e) !== sigFamily) return false
          return true
        })
        .sort((a, b) => b.timestamp - a.timestamp),
    [enriched, sigType, sigSeverity, sigFamily]
  )

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const rows = (result.companies ?? []).map((c) => {
      const key = c.company_id !== '' ? c.company_id : c.company_key
      const signals = enriched
        .filter((e) => (c.company_id !== '' && e.s.company_id === c.company_id) || (c.company_key !== '' && e.s.company_key === c.company_key))
        .sort((a, b) => b.timestamp - a.timestamp)
      return {
        key,
        company: c,
        signals,
        latest: signals[0] ?? null,
        techStack: extraList(c, ['tech_stack', 'techstack', 'technologies', 'tech']),
        keywords: extraList(c, ['keywords', 'tags', 'topics']),
      }
    })
    return rows.sort((a, b) => b.signals.length - a.signals.length || b.company.total - a.company.total)
  }, [result.companies, enriched])

  const highSignals = useMemo(
    () => enriched.filter((e) => e.severity === 'HIGH').sort((a, b) => b.timestamp - a.timestamp),
    [enriched]
  )

  return (
    <div className='space-y-6'>
      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {cards.map((c) => (
              <KpiCard
                key={c.label}
                icon={c.icon}
                label={c.label}
                value={c.value}
                accent={c.accent}
                sparkData={c.spark}
                pills={c.pills}
                selected={CARD_TYPE_FILTER[c.label] !== undefined && feedType === CARD_TYPE_FILTER[c.label]}
                onClick={() => handleCardClick(c.label)}
              />
            ))}
          </div>

          <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
            <ChartCard title='Weekly Signal Trend (click a bar to filter feed)'>
              {weeklyChartData.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-56'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart
                      data={weeklyChartData}
                      margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                      onClick={(state) => {
                        const label = activeLabelOf(state)
                        if (label !== null) setFeedWeek((prev) => (prev === label ? null : label))
                      }}
                    >
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='week' tickFormatter={weekLabel} stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => weekLabel(String(l))} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                      <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                        {weeklyChartData.map((w) => (
                          <Cell key={w.week} cursor='pointer' fill={feedWeek === w.week ? '#155CBA' : '#1A73E8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title='Signals by Family (click a slice to filter feed)'>
              {familyChartData.every((f) => f.count === 0) ? (
                <NoData />
              ) : (
                <>
                  <div className='mt-2 h-56'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie data={familyChartData} dataKey='count' nameKey='label' innerRadius={45} outerRadius={75} paddingAngle={3} stroke='none'>
                          {familyChartData.map((f) => (
                            <Cell
                              key={f.family}
                              fill={f.color}
                              cursor='pointer'
                              onClick={() => setFeedFamily((prev) => (prev === f.family ? null : f.family))}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='mt-3 flex flex-wrap gap-4'>
                    {familyChartData.map((f) => (
                      <li key={f.family} className='flex items-center gap-2 text-xs text-[#575A66]'>
                        <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: f.color }} aria-hidden='true' />
                        {f.label} {'\u00b7'} <span className='text-[#2C2D33]'>{formatNumber(f.count)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ChartCard>

            <ChartCard title='Signals by Industry (click a bar to filter feed)'>
              {industryChartData.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-56'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={industryChartData} layout='vertical' margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <XAxis type='number' allowDecimals={false} stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                      <YAxis type='category' dataKey='industry' width={110} stroke='#9AA0AE' tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                      <Bar dataKey='count' radius={[0, 6, 6, 0]} barSize={16}>
                        {industryChartData.map((d) => (
                          <Cell
                            key={d.industry}
                            cursor='pointer'
                            fill={industryFilter === d.industry ? '#155CBA' : '#00A7D6'}
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

          <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Latest signals feed'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-sm font-semibold text-[#575A66]'>Latest Signals</h2>
              <span className='text-xs text-[#8A8D99]'>{formatNumber(feedSignals.length)} shown</span>
              {hasFeedFilter && (
                <button
                  type='button'
                  onClick={clearFeedFilters}
                  className='ml-auto rounded-lg border border-[#E2E3E5] px-3 py-1 text-xs font-medium text-[#575A66] transition-colors hover:border-[#1A73E8] hover:text-[#1A73E8]'
                >
                  Clear filters
                </button>
              )}
            </div>
            {feedSignals.length === 0 ? (
              <p className='mt-6 pb-4 text-center text-sm text-[#8A8D99]'>No signals match the current filters.</p>
            ) : (
              <div className='mt-4 max-h-[36rem] space-y-3 overflow-y-auto pr-1'>
                {feedSignals.slice(0, 50).map((e) => (
                  <OverviewSignalRow
                    key={e.s.id}
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
          <div className='flex flex-wrap items-center gap-2 border-b border-[#E2E3E5] px-4 py-3'>
            <h2 className='text-sm font-semibold text-[#575A66]'>Companies</h2>
            <span className='text-xs text-[#8A8D99]'>
              {companiesTracked !== null ? formatNumber(companiesTracked) : '\u2014'} tracked
            </span>
          </div>
          <div className='max-h-[70vh] overflow-auto'>
            <table className='w-full min-w-[860px] text-sm'>
              <thead>
                <tr>
                  {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership', 'Latest'].map((h, idx) => (
                    <th
                      key={h}
                      className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                        idx >= 3 ? 'text-right' : 'text-left'
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
                      No companies returned yet. Import a company list to start tracking signals.
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setExpandedCompany((prev) => (prev === row.key ? null : row.key))
                          }}
                          className='cursor-pointer border-b border-[#F0F1F3] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none'
                        >
                          <td className='px-4 py-3 font-medium text-[#2C2D33]'>
                            <span className='inline-flex items-center gap-2'>
                              <span
                                aria-hidden='true'
                                className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                              >
                                {'\u25B6'}
                              </span>
                              {(row.company.company_name ?? '').trim() !== '' ? row.company.company_name : '\u2014'}
                            </span>
                          </td>
                          <td className='px-4 py-3 text-[#575A66]'>{industryOf(row.company)}</td>
                          <td className='px-4 py-3 text-[#575A66]'>
                            {(row.company.hq ?? '').trim() !== '' ? row.company.hq : extraField(row.company, ['location', 'city'])}
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
                          <tr className='border-b border-[#F0F1F3] last:border-b-0'>
                            <td colSpan={9} className='bg-[#F7F8F9] px-6 py-5'>
                              {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                <div className='mb-4 space-y-3'>
                                  {row.techStack.length > 0 && (
                                    <div>
                                      <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Tech Stack</h3>
                                      <div className='mt-2 flex flex-wrap gap-1.5'>
                                        {row.techStack.map((t) => (
                                          <span key={t} className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'>
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
                                          <span key={k} className='rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                                            {k}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              <h3 className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>Signal History</h3>
                              {row.signals.length === 0 ? (
                                <p className='mt-3 text-xs text-[#8A8D99]'>No signal rows on this page for this company.</p>
                              ) : (
                                <div className='mt-3 space-y-3'>
                                  {row.signals.map((e) => (
                                    <SignalRow key={e.s.id} e={e} />
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
          <div className='flex flex-wrap items-end gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
            <select aria-label='Filter by type' className={selectCls} value={sigType} onChange={(e) => setSigType(e.target.value)}>
              <option value='all'>All types</option>
              {displayTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select aria-label='Filter by severity' className={selectCls} value={sigSeverity} onChange={(e) => setSigSeverity(e.target.value)}>
              <option value='all'>All severities</option>
              {SEVERITIES.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
            </select>
            <select aria-label='Filter by family' className={selectCls} value={sigFamily} onChange={(e) => setSigFamily(e.target.value)}>
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
              className='rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:border-[#1A73E8] hover:text-[#1A73E8]'
            >
              Clear
            </button>
            <span className='ml-auto text-xs text-[#8A8D99]'>
              {formatNumber(filteredSignals.length)} of {formatNumber(enriched.length)} on this page {'\u00b7'}{' '}
              {totalSignals !== null ? formatNumber(totalSignals) : '\u2014'} total
            </span>
          </div>
          {filteredSignals.length === 0 ? (
            <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
              <p className='text-3xl' aria-hidden='true'>{'\u{1F50D}'}</p>
              <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
              <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing the filters above.</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {filteredSignals.map((e) => (
                <SignalRow key={e.s.id} e={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          <ChartCard title='Weekly Signal Trend'>
            {weeklyChartData.length === 0 ? (
              <NoData />
            ) : (
              <div className='mt-2 h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={weeklyChartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                    <XAxis dataKey='week' tickFormatter={weekLabel} stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                    <YAxis allowDecimals={false} stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => weekLabel(String(l))} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                    <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title='Signals by Family'>
            {familyChartData.every((f) => f.count === 0) ? (
              <NoData />
            ) : (
              <div className='mt-2 h-64'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={familyChartData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                    <XAxis dataKey='label' stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                    <YAxis allowDecimals={false} stroke='#9AA0AE' tick={{ fill: '#6D717F', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                    <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                      {familyChartData.map((f) => (
                        <Cell key={f.family} fill={f.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>

          <ChartCard title='Severity Mix'>
            {severityPieTotal === 0 ? (
              <NoData />
            ) : (
              <>
                <div className='mt-2 h-56'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Pie data={severityPieData} dataKey='value' nameKey='name' innerRadius={45} outerRadius={75} paddingAngle={3} stroke='none'>
                        {severityPieData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className='mt-3 flex flex-wrap gap-4'>
                  {severityPieData.map((d) => (
                    <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                      <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                      {d.name} {'\u00b7'} <span className='text-[#2C2D33]'>{formatNumber(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </ChartCard>

          <ChartCard title='Signal Type Breakdown'>
            {typeBreakdownTotal === 0 ? (
              <NoData />
            ) : (
              <div className='mt-2 flex flex-col gap-4 sm:flex-row sm:items-center'>
                <div className='h-56 w-full sm:w-1/2'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Pie data={typeBreakdown} dataKey='count' nameKey='type' innerRadius={45} outerRadius={80} paddingAngle={2} stroke='none'>
                        {typeBreakdown.map((t) => (
                          <Cell key={t.type} fill={t.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                  {typeBreakdown.map((t) => {
                    const pct = ((t.count / typeBreakdownTotal) * 100).toFixed(1)
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
        <div className='space-y-4'>
          {highSignals.length === 0 ? (
            <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
              <p className='text-3xl' aria-hidden='true'>{'\u{1F4A1}'}</p>
              <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights on this page</p>
              <p className='mt-1 text-xs text-[#8A8D99]'>Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.</p>
            </div>
          ) : (
            <>
              <p className='text-xs text-[#8A8D99]'>
                {formatNumber(highSignals.length)} high-severity signal{highSignals.length === 1 ? '' : 's'} on this page {'\u00b7'}{' '}
                {highAlerts !== null ? formatNumber(highAlerts) : '\u2014'} across all pages
              </p>
              <div className='space-y-3'>
                {highSignals.map((e) => (
                  <SignalRow key={e.s.id} e={e} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
