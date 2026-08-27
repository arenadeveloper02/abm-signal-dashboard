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
  return v !== '' ? v : 'Unknown'
}

function SeverityBadge({ severity }: { severity: NormalizedSeverity }) {
  const color = SEVERITY_COLORS[severity]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      {severity}
    </span>
  )
}

function TypeBadge({ label }: { label: string }) {
  const color = typeColor(label)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E3E5] bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-medium text-[#575A66]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  )
}

function SignalRow({ e }: { e: EnrichedSignal }) {
  return (
    <article className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-[#2C2D33]">{e.s.company_name}</span>
        <TypeBadge label={e.displayType} />
        <SeverityBadge severity={e.severity} />
        <span className="ml-auto text-xs text-[#8A8D99]">{formatDate(e.dateIso)}</span>
      </div>
      {e.s.summary !== '' && (
        <p className="mt-2 text-sm leading-relaxed text-[#575A66]">{e.s.summary}</p>
      )}
      {e.links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {e.links.map((l, i) => (
            <a
              key={`${l.url}-${i}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1A73E8] hover:underline"
            >
              {l.name} ↗
            </a>
          ))}
        </div>
      )}
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
    <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label={title}>
      <h2 className="text-sm font-semibold text-[#575A66]">{title}</h2>
      {children}
    </section>
  )
}

function NoData() {
  return <p className="mb-16 mt-16 text-center text-sm text-[#8A8D99]">No data</p>
}

export default function StoredSignalsDashboard({ result }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [feedType, setFeedType] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
  const [feedFamily, setFeedFamily] = useState<Family | null>(null)
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

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

  const familyOf = (e: EnrichedSignal): string => (e.s.signal_family ?? '').toLowerCase()

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

  const feed = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    return enriched
      .filter((e) => e.timestamp >= cutoff)
      .filter((e) => (feedType === null ? true : e.displayType === feedType))
      .filter((e) => (feedWeek === null ? true : e.weekKey === feedWeek))
      .filter((e) => (feedFamily === null ? true : familyOf(e) === feedFamily))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek, feedFamily])

  const recent = useMemo(
    () => [...enriched].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6),
    [enriched],
  )

  const weeklyData = useMemo(
    () =>
      weekKeys.map((wk) => {
        const items = enriched.filter((e) => e.weekKey === wk)
        return {
          week: wk,
          HIGH: items.filter((e) => e.severity === 'HIGH').length,
          MEDIUM: items.filter((e) => e.severity === 'MEDIUM').length,
          LOW: items.filter((e) => e.severity === 'LOW').length,
        }
      }),
    [weekKeys, enriched],
  )

  const donutData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: typeColor(name) }))
      .sort((a, b) => b.value - a.value)
  }, [enriched])

  const typeTotal = donutData.reduce((acc, d) => acc + d.value, 0)

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const rows: CompanyRowData[] = []
    const lookup = new Map<string, CompanyRowData>()
    const register = (row: CompanyRowData, keys: string[]) => {
      keys.forEach((k) => {
        const key = (k ?? '').trim()
        if (key !== '' && !lookup.has(key)) lookup.set(key, row)
      })
    }
    for (const c of result.companies ?? []) {
      const key = c.company_id || c.company_key || c.company_name
      const row: CompanyRowData = {
        key,
        company: c,
        signals: [],
        latest: null,
        techStack: extraList(c, ['tech_stack', 'techStack', 'technologies', 'Tech Stack']),
        keywords: extraList(c, ['keywords', 'Keywords', 'tags']),
      }
      rows.push(row)
      register(row, [c.company_id, c.company_key, c.company_name])
    }
    for (const e of enriched) {
      const row =
        lookup.get(e.s.company_id) ??
        lookup.get(e.s.company_key) ??
        lookup.get(e.s.company_name) ??
        lookup.get(e.s.company)
      if (row) {
        row.signals.push(e)
        continue
      }
      const name = (e.s.company_name || e.s.company || 'Unknown').trim()
      const key = e.s.company_id || e.s.company_key || name
      const synthetic: StoredCompany = {
        company_id: e.s.company_id ?? '',
        company_name: name,
        company_key: e.s.company_key ?? '',
        domain: '',
        website: '',
        industry: e.industry === 'Unknown' ? '' : e.industry,
        hq: '',
        total: 0,
        by_family: { funding: 0, csuite: 0, product: 0, partnership: 0 },
      }
      const newRow: CompanyRowData = { key, company: synthetic, signals: [e], latest: null, techStack: [], keywords: [] }
      rows.push(newRow)
      register(newRow, [e.s.company_id, e.s.company_key, name])
    }
    rows.forEach((r) => {
      r.signals.sort((a, b) => b.timestamp - a.timestamp)
      r.latest = r.signals[0] ?? null
    })
    return [...rows].sort((a, b) => b.signals.length - a.signals.length)
  }, [result.companies, enriched])

  const industries = useMemo(() => {
    const set = new Set<string>()
    companyRows.forEach((r) => set.add(industryOf(r.company)))
    return Array.from(set).sort()
  }, [companyRows])

  const filteredCompanyRows = useMemo(
    () => (industryFilter === null ? companyRows : companyRows.filter((r) => industryOf(r.company) === industryFilter)),
    [companyRows, industryFilter],
  )

  const trendsWeekly = useMemo(() => {
    const currentWeek = new Date()
    const day = (currentWeek.getDay() + 6) % 7
    currentWeek.setDate(currentWeek.getDate() - day)
    currentWeek.setHours(0, 0, 0, 0)
    const buckets: { key: string; label: string; count: number }[] = []
    const index = new Map<string, number>()
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(currentWeek)
      start.setDate(start.getDate() - i * 7)
      const key = weekKeyOf(start)
      index.set(key, buckets.length)
      buckets.push({
        key,
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: 0,
      })
    }
    for (const e of enriched) {
      if (e.weekKey === '') continue
      const pos = index.get(e.weekKey)
      if (pos !== undefined) {
        const bucket = buckets[pos]
        if (bucket) bucket.count += 1
      }
    }
    return buckets
  }, [enriched])

  const trendsCategory = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        label: FAMILY_META[f].label,
        count: enriched.filter((e) => familyOf(e) === f).length,
        color: FAMILY_META[f].color,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enriched],
  )

  const trendsCompanies = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) {
      const name = (e.s.company_name || e.s.company || '').trim()
      if (name === '') continue
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [enriched])

  const topHigh = useMemo<[string, number] | null>(() => {
    const map = new Map<string, number>()
    for (const e of enriched) {
      if (e.severity !== 'HIGH') continue
      const name = (e.s.company_name || e.s.company || '').trim()
      if (name === '') continue
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    return sorted[0] ?? null
  }, [enriched])

  const highInsights = useMemo(
    () => enriched.filter((e) => e.severity === 'HIGH').sort((a, b) => b.timestamp - a.timestamp),
    [enriched],
  )

  const topCompanyRow = companyRows[0] ?? null
  const topType = donutData[0] ?? null
  const latestSignal = recent[0] ?? null

  const insightTiles = [
    {
      label: 'Most Signals',
      value: topCompanyRow ? topCompanyRow.company.company_name : '\u2014',
      sub: topCompanyRow
        ? `${topCompanyRow.signals.length} total signal${topCompanyRow.signals.length === 1 ? '' : 's'}`
        : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'Most High Severity',
      value: topHigh ? topHigh[0] : '\u2014',
      sub: topHigh ? `${topHigh[1]} high severity signal${topHigh[1] === 1 ? '' : 's'}` : 'No high severity signals',
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: topType ? topType.name : '\u2014',
      sub: topType ? `${topType.value} occurrence${topType.value === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? latestSignal.s.company_name : '\u2014',
      sub: latestSignal ? `${latestSignal.displayType} · ${relativeTime(latestSignal.dateIso)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
  }

  const handleCardClick = (label: string) => {
    if (label === 'Companies Tracked') {
      setTab('companies')
      return
    }
    setFeedWeek(null)
    if (label === 'C-Suite Changes') {
      setFeedFamily('csuite')
      setFeedType(null)
    } else {
      setFeedFamily(null)
      setFeedType(CARD_TYPE_FILTER[label] ?? null)
    }
    setTab('signals')
  }

  const handleCategoryClick = (family: Family) => {
    setFeedFamily(family)
    setFeedType(null)
    setFeedWeek(null)
    setTab('signals')
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <TabBar active={tab} onChange={setTab} />
      <main className="mx-auto max-w-7xl px-4 py-6" role="tabpanel" aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Weekly Signal Volume by Severity">
                {weeklyData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          const wk = activeLabelOf(state)
                          if (wk !== null) {
                            setFeedWeek(wk)
                            setFeedType(null)
                            setFeedFamily(null)
                            setTab('signals')
                          }
                        }}
                      >
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="week"
                          stroke="#A7AAB2"
                          tick={{ fill: '#8A8D99', fontSize: 11 }}
                          tickFormatter={(value) => formatDate(String(value))}
                        />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={tooltipStyle}
                          cursor={{ fill: '#F7F8F9' }}
                          labelFormatter={(value) => `Week of ${formatDate(String(value))}`}
                        />
                        {SEVERITIES.map((sev) => (
                          <Bar key={sev} dataKey={sev} stackId="sev" fill={SEVERITY_COLORS[sev]} cursor="pointer" />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>
              <ChartCard title="Signal Mix">
                {typeTotal === 0 ? (
                  <NoData />
                ) : (
                  <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-64 w-full sm:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip contentStyle={tooltipStyle} />
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                            stroke="#FFFFFF"
                          >
                            {donutData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="w-full space-y-1.5 sm:w-1/2" aria-label="Signal mix legend">
                      {donutData.map((d) => (
                        <li key={d.name} className="flex items-center gap-2 text-xs text-[#575A66]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                          <span className="truncate">{d.name}</span>
                          <span className="ml-auto shrink-0 text-[#8A8D99]">{formatNumber(d.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </ChartCard>
            </div>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Recent signals">
              <h2 className="text-sm font-semibold text-[#575A66]">Recent Signals</h2>
              {recent.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-3 space-y-3">
                  {recent.map((e, i) => (
                    <SignalRow key={`recent-${e.s.id || e.s.company_name}-${i}`} e={e} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by industry"
                className={selectCls}
                value={industryFilter ?? ''}
                onChange={(e) => setIndustryFilter(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <span className="ml-auto text-xs text-[#8A8D99]">
                {filteredCompanyRows.length} of {companyRows.length} compan{companyRows.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
            <div className="rounded-2xl border border-[#E2E3E5] bg-white">
              <div className="max-h-[70vh] overflow-auto rounded-2xl">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr>
                      {['Company', 'Industry', 'HQ', 'Signals', 'High', 'Latest'].map((h) => (
                        <th
                          key={h}
                          className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanyRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8A8D99]">
                          No companies match this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanyRows.map((row) => {
                        const expanded = expandedCompany === row.key
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
                              className="cursor-pointer border-b border-[#F0F1F3] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none"
                            >
                              <td className="px-4 py-3 font-medium text-[#2C2D33]">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    aria-hidden="true"
                                    className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                                  >
                                    {'\u25B6'}
                                  </span>
                                  {row.company.company_name}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#575A66]">{industryOf(row.company)}</td>
                              <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['hq', 'location', 'city'])}</td>
                              <td className="px-4 py-3 text-[#575A66]">{row.signals.length}</td>
                              <td className="px-4 py-3 text-[#575A66]">{row.signals.filter((e) => e.severity === 'HIGH').length}</td>
                              <td className="px-4 py-3 text-[#8A8D99]">{row.latest ? formatDate(row.latest.dateIso) : '\u2014'}</td>
                            </tr>
                            {expanded && (
                              <tr className="border-b border-[#F0F1F3] last:border-b-0">
                                <td colSpan={6} className="bg-[#F7F8F9] px-6 py-5">
                                  {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                    <div className="mb-4 flex flex-wrap gap-1.5">
                                      {row.techStack.map((t) => (
                                        <span key={`tech-${t}`} className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[10px] font-medium text-[#575A66]">
                                          {t}
                                        </span>
                                      ))}
                                      {row.keywords.map((k) => (
                                        <span key={`kw-${k}`} className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[10px] font-medium text-[#8A8D99]">
                                          {k}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {row.signals.length === 0 ? (
                                    <p className="text-xs text-[#8A8D99]">No signals recorded for this company.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {row.signals.map((e, i) => (
                                        <SignalRow key={`${row.key}-sig-${i}`} e={e} />
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
            </div>
          </div>
        )}

        {tab === 'signals' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <select
                aria-label="Filter by signal type"
                className={selectCls}
                value={feedType ?? ''}
                onChange={(e) => setFeedType(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All types</option>
                {donutData.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
              <select
                aria-label="Filter by category"
                className={selectCls}
                value={feedFamily ?? ''}
                onChange={(e) => setFeedFamily(e.target.value === '' ? null : (e.target.value as Family))}
              >
                <option value="">All categories</option>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>{FAMILY_META[f].label}</option>
                ))}
              </select>
              <select
                aria-label="Filter by week"
                className={selectCls}
                value={feedWeek ?? ''}
                onChange={(e) => setFeedWeek(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All weeks</option>
                {weekKeys.map((wk) => (
                  <option key={wk} value={wk}>Week of {formatDate(wk)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFeedFilters}
                className="rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:border-[#F31A1A]/50 hover:text-[#2C2D33]"
              >
                Clear
              </button>
              <span className="ml-auto text-xs text-[#8A8D99]">
                {feed.length} of {enriched.length} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>
            {feed.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">🔍</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals match your filters</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Try clearing filters or selecting a wider range.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((e, i) => (
                  <SignalRow key={`feed-${e.s.id || e.s.company_name}-${i}`} e={e} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Weekly Signal Trend (8 Weeks)">
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendsWeekly} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8F9' }} />
                      <Bar dataKey="count" name="Signals" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title="Signals by Category">
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendsCategory} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8F9' }} />
                        <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]}>
                          {trendsCategory.map((c) => (
                            <Cell
                              key={c.family}
                              fill={c.color}
                              fillOpacity={feedFamily !== null && feedFamily !== c.family ? 0.35 : 1}
                              cursor="pointer"
                              onClick={() => handleCategoryClick(c.family)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-[#8A8D99]">Click a bar to filter the signal feed by that category.</p>
                </>
              )}
            </ChartCard>
            <ChartCard title="Top 10 Companies by Signal Count">
              {trendsCompanies.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendsCompanies} layout="vertical" margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="company"
                        width={140}
                        stroke="#A7AAB2"
                        tick={{ fill: '#575A66', fontSize: 11 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8F9' }} />
                      <Bar dataKey="count" name="Signals" fill="#00A7D6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
            <ChartCard title="Signal Type Breakdown">
              {typeTotal === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-64 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke="#FFFFFF"
                        >
                          {donutData.map((d) => (
                            <Cell key={`trend-${d.name}`} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-1.5 sm:w-1/2" aria-label="Signal type legend">
                    {donutData.map((d) => {
                      const pct = ((d.value / typeTotal) * 100).toFixed(1)
                      return (
                        <li key={`legend-${d.name}`} className="flex items-center gap-2 text-xs text-[#575A66]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                          <span className="truncate">{d.name}</span>
                          <span className="ml-auto shrink-0 text-[#8A8D99]">
                            {formatNumber(d.value)} · {pct}%
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {insightTiles.map((t) => (
                <div key={t.label} className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">{t.label}</p>
                  <p className="mt-1 truncate text-xl font-semibold" style={{ color: t.accent }}>{t.value}</p>
                  <p className="mt-0.5 text-xs text-[#8A8D99]">{t.sub}</p>
                </div>
              ))}
            </div>
            <section aria-label="High severity signals">
              <h2 className="text-sm font-semibold text-[#575A66]">High Severity Signals</h2>
              {highInsights.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                  <p className="text-3xl" aria-hidden="true">💡</p>
                  <p className="mt-3 text-sm font-medium text-[#2C2D33]">No high severity signals yet</p>
                  <p className="mt-1 text-xs text-[#8A8D99]">High severity activity will appear here as it is detected.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {highInsights.map((e, i) => (
                    <SignalRow key={`insight-${e.s.id || e.s.company_name}-${i}`} e={e} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
