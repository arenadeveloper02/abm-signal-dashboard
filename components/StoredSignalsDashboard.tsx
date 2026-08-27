"use client"

import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Family,
  KpiPill,
  NormalizedSeverity,
  SourceLink,
  StoredCompany,
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
  return '—'
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
  return v !== '' ? v : 'Unknown'
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
        <span className='font-medium text-[#2C2D33]'>{e.s.company_name}</span>
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
              {l.name} ↗
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
    ? '—'
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
            {e.s.company_name}
          </a>
        ) : (
          <span className='text-sm font-bold text-[#1A73E8]'>{e.s.company_name}</span>
        )}
      </div>
      {headline !== '' && <p className='mt-1 text-sm font-semibold text-[#2C2D33]'>{headline}</p>}
      {description !== '' && <p className='mt-1 text-sm leading-relaxed text-[#575A66] line-clamp-2'>{description}</p>}
      <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
        <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 font-medium text-[#155CBA]'>
          {e.industry}
        </span>
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
          industry: industry !== '' ? industry : 'Unknown',
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

  const companiesTracked =
    typeof result.requested_count === 'number' ? result.requested_count : (result.companies ?? []).length

  const fundingCount =
    enriched.length === 0
      ? result.counts_by_family.funding ?? 0
      : enriched.filter((e) => familyOf(e) === 'funding' && e.displayType === 'Funding Round').length

  const totalSignalPills: KpiPill[] = [
    { label: 'H', value: severityCounts.HIGH, color: '#FF5252' },
    { label: 'M', value: severityCounts.MEDIUM, color: '#FB8145' },
    { label: 'L', value: severityCounts.LOW, color: '#9AA0AE' },
  ]

  const cards: { icon: string; label: string; value: number; accent: string; spark: number[]; pills?: KpiPill[] }[] = [
    { icon: '🏢', label: 'Companies Tracked', value: companiesTracked, accent: '#00A7D6', spark: [companiesTracked] },
    { icon: '📡', label: 'Total Signals', value: enriched.length, accent: '#1A73E8', spark: weeklySeries(() => true), pills: totalSignalPills },
    { icon: '🚨', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: weeklySeries((e) => e.severity === 'HIGH') },
    { icon: '👔', label: 'C-Suite Changes', value: familyTotal('csuite'), accent: '#B364D7', spark: weeklySeries((e) => familyOf(e) === 'csuite') },
    { icon: '💰', label: 'Funding', value: fundingCount, accent: '#3BC884', spark: weeklySeries((e) => familyOf(e) === 'funding' && e.displayType === 'Funding Round') },
    { icon: '🤝', label: 'Mergers & Acquisitions', value: enriched.filter((e) => (e.s.signal_type ?? '').toUpperCase() === 'M_AND_A').length, accent: '#FB8145', spark: weeklySeries((e) => (e.s.signal_type ?? '').toUpperCase() === 'M_AND_A') },
    { icon: '📈', label: 'IPO', value: enriched.filter((e) => (e.s.signal_type ?? '').toUpperCase() === 'IPO_SIGNAL').length, accent: '#DFC612', spark: weeklySeries((e) => (e.s.signal_type ?? '').toUpperCase() === 'IPO_SIGNAL') },
    { icon: '📰', label: 'News', value: enriched.filter((e) => e.displayType === 'News Mention').length, accent: '#6D717F', spark: weeklySeries((e) => e.displayType === 'News Mention') },
    { icon: '🚀', label: 'Product Launches', value: familyTotal('product'), accent: '#00A7D6', spark: weeklySeries((e) => familyOf(e) === 'product') },
    { icon: '🔗', label: 'Partnerships', value: familyTotal('partnership'), accent: '#F8528F', spark: weeklySeries((e) => familyOf(e) === 'partnership') },
    { icon: '🎨', label: 'Creative Hiring', value: enriched.filter((e) => isCreativeHiring(e.s)).length, accent: '#FF5252', spark: weeklySeries((e) => isCreativeHiring(e.s)) },
  ]

  const weeklyChartData = useMemo(() => {
    return weekKeys.map((wk) => {
      const d = new Date(wk)
      return {
        week: wk,
        label: Number.isNaN(d.getTime()) ? wk : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: enriched.filter((e) => e.weekKey === wk).length,
      }
    })
  }, [weekKeys, enriched])

  const typeChartData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const typeTotal = useMemo(() => typeChartData.reduce((acc, t) => acc + t.count, 0), [typeChartData])

  const industryChartData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.industry, (map.get(e.industry) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [enriched])

  const feed = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    return enriched
      .filter((e) => e.timestamp >= cutoff)
      .filter((e) => (feedType === null ? true : e.displayType === feedType))
      .filter((e) => (feedWeek === null ? true : e.weekKey === feedWeek))
      .filter((e) => (feedFamily === null ? true : familyOf(e) === feedFamily))
      .filter((e) => (industryFilter === null ? true : e.industry === industryFilter))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek, feedFamily, industryFilter])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    return (result.companies ?? [])
      .filter((c) => (industryFilter === null ? true : industryOf(c) === industryFilter))
      .map((c) => {
        const key = c.company_key || c.company_id || c.company_name
        const signals = enriched
          .filter((e) => (c.company_id !== '' && e.s.company_id === c.company_id) || (c.company_key !== '' && e.s.company_key === c.company_key))
          .sort((a, b) => b.timestamp - a.timestamp)
        return {
          key,
          company: c,
          signals,
          latest: signals[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'techStack', 'technologies']),
          keywords: extraList(c, ['keywords', 'tags', 'topics']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [result.companies, enriched, industryFilter])

  const familyChartData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        label: FAMILY_META[f].label,
        count: enriched.filter((e) => familyOf(e) === f).length,
        color: FAMILY_META[f].color,
      })),
    [enriched],
  )

  const severityChartData = useMemo(
    () => SEVERITIES.map((sev) => ({ name: sev, value: severityCounts[sev], color: SEVERITY_COLORS[sev] })),
    [severityCounts],
  )

  const displayTypes = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched],
  )

  const signalsFeed = useMemo(() => {
    return enriched
      .filter((e) => (sigType === 'all' ? true : e.displayType === sigType))
      .filter((e) => (sigSeverity === 'all' ? true : e.severity === sigSeverity))
      .filter((e) => (sigFamily === 'all' ? true : familyOf(e) === sigFamily))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, sigType, sigSeverity, sigFamily])

  const topCompanyInsight = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      const name = (e.s.company_name ?? '').trim()
      if (name !== '') map.set(name, (map.get(name) ?? 0) + 1)
    })
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    return sorted[0] ?? null
  }, [enriched])

  const latestSignal = useMemo(() => {
    const sorted = [...enriched].sort((a, b) => b.timestamp - a.timestamp)
    return sorted[0] ?? null
  }, [enriched])

  const highSignals = useMemo(
    () => enriched.filter((e) => e.severity === 'HIGH').sort((a, b) => b.timestamp - a.timestamp),
    [enriched],
  )

  const hasFeedFilter = feedType !== null || feedWeek !== null || feedFamily !== null || industryFilter !== null

  const toggleWeek = (week: string) => setFeedWeek((prev) => (prev === week ? null : week))
  const toggleType = (type: string) => setFeedType((prev) => (prev === type ? null : type))
  const toggleIndustry = (industry: string) => setIndustryFilter((prev) => (prev === industry ? null : industry))
  const toggleCompany = (key: string) => setExpandedCompany((prev) => (prev === key ? null : key))

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
    setIndustryFilter(null)
  }

  const clearSignalFilters = () => {
    setSigType('all')
    setSigSeverity('all')
    setSigFamily('all')
  }

  const handleWeeklyClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (!label) return
    const point = weeklyChartData.find((w) => w.label === label)
    if (!point) return
    toggleWeek(point.week)
  }

  const handleIndustryClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (!label) return
    toggleIndustry(label)
  }

  const handleTypeSliceClick = (entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return
    const rec = entry as Record<string, unknown>
    let t: unknown = rec['type']
    if (typeof t !== 'string') {
      const payload = rec['payload']
      if (typeof payload === 'object' && payload !== null) {
        t = (payload as Record<string, unknown>)['type']
      }
    }
    if (typeof t === 'string' && t !== '') toggleType(t)
  }

  const handleCardClick = (label: string) => {
    const mapped = CARD_TYPE_FILTER[label]
    if (mapped !== undefined) {
      setFeedType((prev) => (prev === mapped ? null : mapped))
      setFeedFamily(null)
      setTab('overview')
      return
    }
    if (label === 'C-Suite Changes') {
      setFeedFamily((prev) => (prev === 'csuite' ? null : 'csuite'))
      setFeedType(null)
      setTab('overview')
      return
    }
    clearFeedFilters()
  }

  const selectedWeekLabel =
    feedWeek !== null ? (weeklyChartData.find((w) => w.week === feedWeek)?.label ?? feedWeek) : ''

  const insightTiles: { label: string; value: string; sub: string; accent: string }[] = [
    {
      label: 'Most Signals',
      value: topCompanyInsight ? topCompanyInsight[0] : '—',
      sub: topCompanyInsight ? `${formatNumber(topCompanyInsight[1])} total signal${topCompanyInsight[1] === 1 ? '' : 's'}` : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'High Severity',
      value: formatNumber(severityCounts.HIGH),
      sub: 'signals marked HIGH',
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: typeChartData[0]?.type ?? '—',
      sub: typeChartData[0] ? `${formatNumber(typeChartData[0].count)} occurrence${typeChartData[0].count === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? latestSignal.s.company_name : '—',
      sub: latestSignal ? `${latestSignal.displayType} · ${formatDate(latestSignal.dateIso)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  return (
    <div className='bg-[#F7F8F9]'>
      <TabBar active={tab} onChange={setTab} />
      <main className='mx-auto max-w-7xl px-4 py-6' role='tabpanel' aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className='space-y-6'>
            {result.unmatched_inputs.length > 0 && (
              <div className='rounded-xl border border-[#FDCDB5] bg-[#FFF9F5] px-4 py-3 text-xs text-[#974D29]'>
                {result.unmatched_inputs.length} input compan{result.unmatched_inputs.length === 1 ? 'y' : 'ies'} could not be matched:{' '}
                {result.unmatched_inputs.slice(0, 5).join(', ')}
                {result.unmatched_inputs.length > 5 ? '…' : ''}
              </div>
            )}
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
                  onClick={() => handleCardClick(c.label)}
                />
              ))}
            </div>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
              <ChartCard title='Weekly Signal Trend (click point to filter feed)'>
                {enriched.length === 0 || weeklyChartData.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-56 cursor-pointer'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={weeklyChartData} margin={{ top: 10, right: 12, bottom: 0, left: -8 }} onClick={handleWeeklyClick}>
                          <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                          <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                          <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                          <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                            {weeklyChartData.map((w) => (
                              <Cell key={w.week} fill={feedWeek === null || feedWeek === w.week ? '#1A73E8' : '#D1E3FA'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to filter the Recent Signals feed by that week.</p>
                  </>
                )}
              </ChartCard>
              <ChartCard title='Signal Type Breakdown (click to filter feed)'>
                {typeTotal === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-48'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <PieChart>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Pie
                            data={typeChartData}
                            dataKey='count'
                            nameKey='type'
                            innerRadius={42}
                            outerRadius={72}
                            paddingAngle={2}
                            stroke='#FFFFFF'
                            cursor='pointer'
                            onClick={handleTypeSliceClick}
                          >
                            {typeChartData.map((t) => (
                              <Cell key={t.type} fill={feedType === null || feedType === t.type ? typeColor(t.type) : '#E2E3E5'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className='mt-2 space-y-1' aria-label='Signal type legend'>
                      {typeChartData.slice(0, 6).map((t) => (
                        <li key={t.type}>
                          <button
                            type='button'
                            onClick={() => toggleType(t.type)}
                            className='flex w-full items-center gap-2 text-xs text-[#575A66] transition-colors hover:text-[#1A73E8]'
                          >
                            <span className='h-2 w-2 shrink-0 rounded-full' style={{ backgroundColor: typeColor(t.type) }} aria-hidden='true' />
                            <span className='truncate'>{t.type}</span>
                            <span className='ml-auto shrink-0 text-[#8A8D99]'>{t.count}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </ChartCard>
              <ChartCard title='Top Industries by Signal Count (click to filter table)'>
                {industryChartData.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className='mt-2 h-56 cursor-pointer'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart
                          data={industryChartData}
                          layout='vertical'
                          margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                          onClick={handleIndustryClick}
                        >
                          <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' horizontal={false} />
                          <XAxis type='number' allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                          <YAxis type='category' dataKey='industry' width={110} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 10 }} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(0,167,214,0.06)' }} />
                          <Bar dataKey='count' name='Signals' radius={[0, 4, 4, 0]}>
                            {industryChartData.map((d) => (
                              <Cell
                                key={d.industry}
                                fill={industryFilter === null || industryFilter === d.industry ? '#00A7D6' : '#CCEDF7'}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className='mt-2 text-xs text-[#8A8D99]'>Click a bar to filter the Companies table by that industry.</p>
                  </>
                )}
              </ChartCard>
            </div>
            <section className='rounded-2xl border border-[#E2E3E5] bg-white p-5' aria-label='Recent signals'>
              <div className='flex flex-wrap items-center gap-2'>
                <h2 className='text-sm font-semibold text-[#575A66]'>Recent Signals</h2>
                <span className='text-xs text-[#8A8D99]'>{formatNumber(feed.length)} in the last 90 days</span>
                {hasFeedFilter && (
                  <button
                    type='button'
                    onClick={clearFeedFilters}
                    className='ml-auto rounded-full border border-[#E2E3E5] px-3 py-1 text-xs font-medium text-[#575A66] transition-colors hover:border-[#1A73E8] hover:text-[#1A73E8]'
                  >
                    Clear filters ✕
                  </button>
                )}
              </div>
              {hasFeedFilter && (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  {feedWeek !== null && (
                    <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                      Week of {selectedWeekLabel}
                    </span>
                  )}
                  {feedType !== null && (
                    <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>{feedType}</span>
                  )}
                  {feedFamily !== null && (
                    <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                      {FAMILY_META[feedFamily].label}
                    </span>
                  )}
                  {industryFilter !== null && (
                    <span className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>{industryFilter}</span>
                  )}
                </div>
              )}
              <div className='mt-3 max-h-[480px] space-y-3 overflow-y-auto pr-1'>
                {feed.length === 0 ? (
                  <p className='py-10 text-center text-sm text-[#8A8D99]'>No signals match the current filters.</p>
                ) : (
                  feed.map((e, i) => (
                    <OverviewSignalRow
                      key={`${e.s.id}-${i}`}
                      e={e}
                      company={companyLookup.get(e.s.company_id) ?? companyLookup.get(e.s.company_key)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        )}
        {tab === 'companies' && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-sm font-semibold text-[#575A66]'>Companies ({formatNumber(companyRows.length)})</h2>
              {industryFilter !== null && (
                <button
                  type='button'
                  onClick={() => setIndustryFilter(null)}
                  className='rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-3 py-1 text-xs font-medium text-[#155CBA] transition-colors hover:border-[#1A73E8]'
                >
                  Industry: {industryFilter} ✕
                </button>
              )}
            </div>
            <div className='rounded-2xl border border-[#E2E3E5] bg-white'>
              <div className='max-h-[70vh] overflow-auto rounded-2xl'>
                <table className='w-full min-w-[760px] text-sm'>
                  <thead>
                    <tr>
                      {['Company', 'Industry', 'HQ', 'Signals', 'Latest'].map((h, hi) => (
                        <th
                          key={h}
                          className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${hi >= 3 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companyRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className='px-4 py-12 text-center text-sm text-[#8A8D99]'>
                          No companies match the current filters.
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
                              onClick={() => toggleCompany(row.key)}
                              onKeyDown={(ev) => {
                                if (ev.key === 'Enter' || ev.key === ' ') toggleCompany(row.key)
                              }}
                              className='cursor-pointer border-b border-[#F1F2F3] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none'
                            >
                              <td className='px-4 py-3 font-medium text-[#2C2D33]'>
                                <span className='inline-flex items-center gap-2'>
                                  <span
                                    aria-hidden='true'
                                    className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                                  >
                                    ▶
                                  </span>
                                  {row.company.company_name}
                                </span>
                              </td>
                              <td className='px-4 py-3 text-[#575A66]'>{industryOf(row.company)}</td>
                              <td className='px-4 py-3 text-[#575A66]'>{extraField(row.company, ['hq', 'location', 'headquarters'])}</td>
                              <td className='px-4 py-3 text-right text-[#2C2D33]'>{formatNumber(row.signals.length)}</td>
                              <td className='px-4 py-3 text-right text-[#8A8D99]'>{row.latest ? relativeTime(row.latest.dateIso) : '—'}</td>
                            </tr>
                            {expanded && (
                              <tr className='border-b border-[#F1F2F3] last:border-b-0'>
                                <td colSpan={5} className='bg-[#F7F8F9] px-6 py-5'>
                                  <div className='space-y-4'>
                                    {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                      <div className='flex flex-wrap gap-2'>
                                        {row.techStack.map((t) => (
                                          <span key={`tech-${t}`} className='rounded-full border border-[#CCEDF7] bg-[#F2FBFD] px-2 py-0.5 text-[11px] font-medium text-[#0086AB]'>
                                            {t}
                                          </span>
                                        ))}
                                        {row.keywords.map((k) => (
                                          <span key={`kw-${k}`} className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#575A66]'>
                                            {k}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {row.signals.length === 0 ? (
                                      <p className='text-xs text-[#8A8D99]'>No signals recorded for this company.</p>
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
          </div>
        )}
        {tab === 'signals' && (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-end gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4'>
              <select aria-label='Filter by signal type' className={selectCls} value={sigType} onChange={(e) => setSigType(e.target.value)}>
                <option value='all'>All types</option>
                {displayTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select aria-label='Filter by severity' className={selectCls} value={sigSeverity} onChange={(e) => setSigSeverity(e.target.value)}>
                <option value='all'>All severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
                onClick={clearSignalFilters}
                className='rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:border-[#F31A1A]/50 hover:text-[#2C2D33]'
              >
                Clear
              </button>
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {formatNumber(signalsFeed.length)} of {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>
            {signalsFeed.length === 0 ? (
              <div className='rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center'>
                <p className='text-3xl' aria-hidden='true'>🔍</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No signals match your filters</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Try clearing the filters above.</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {signalsFeed.map((e, i) => (
                  <SignalRow key={`${e.s.id}-${i}`} e={e} />
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'trends' && (
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <ChartCard title='Weekly Signal Trend'>
              {enriched.length === 0 || weeklyChartData.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={weeklyChartData} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                      <Bar dataKey='count' name='Signals' fill='#1A73E8' radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Signals by Family'>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <div className='mt-2 h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <BarChart data={familyChartData} margin={{ top: 10, right: 16, bottom: 0, left: -8 }}>
                      <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' />
                      <XAxis dataKey='label' stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke='#A7AAB2' tick={{ fill: '#8A8D99', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                      <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
                        {familyChartData.map((f) => (
                          <Cell key={f.label} fill={f.color} />
                        ))}
                      </Bar>
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
                        <Pie data={typeChartData} dataKey='count' nameKey='type' innerRadius={50} outerRadius={85} paddingAngle={2} stroke='#FFFFFF'>
                          {typeChartData.map((t) => (
                            <Cell key={t.type} fill={typeColor(t.type)} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='w-full space-y-1.5 sm:w-1/2' aria-label='Signal type legend'>
                    {typeChartData.map((t) => {
                      const pct = typeTotal === 0 ? '0.0' : ((t.count / typeTotal) * 100).toFixed(1)
                      return (
                        <li key={t.type} className='flex items-center gap-2 text-xs text-[#575A66]'>
                          <span className='h-2 w-2 shrink-0 rounded-full' style={{ backgroundColor: typeColor(t.type) }} aria-hidden='true' />
                          <span className='truncate'>{t.type}</span>
                          <span className='ml-auto shrink-0 text-[#8A8D99]'>
                            {t.count} · {pct}%
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </ChartCard>
            <ChartCard title='Severity Mix'>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className='mt-2 h-64'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie data={severityChartData} dataKey='value' nameKey='name' innerRadius={50} outerRadius={85} paddingAngle={3} stroke='#FFFFFF'>
                          {severityChartData.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className='mt-3 flex flex-wrap gap-4'>
                    {severityChartData.map((d) => (
                      <li key={d.name} className='flex items-center gap-2 text-xs text-[#575A66]'>
                        <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: d.color }} aria-hidden='true' />
                        {d.name} · <span className='text-[#2C2D33]'>{d.value}</span>
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
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
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
                <p className='text-3xl' aria-hidden='true'>💡</p>
                <p className='mt-3 text-sm font-medium text-[#2C2D33]'>No high-severity insights yet</p>
                <p className='mt-1 text-xs text-[#8A8D99]'>Insights list HIGH-severity signals only. Check the Signals tab for the full feed.</p>
              </div>
            ) : (
              <section aria-label='High severity insights'>
                <h2 className='text-sm font-semibold text-[#575A66]'>High Severity Signals ({formatNumber(highSignals.length)})</h2>
                <div className='mt-3 space-y-3'>
                  {highSignals.map((e, i) => (
                    <SignalRow key={`${e.s.id}-${i}`} e={e} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
