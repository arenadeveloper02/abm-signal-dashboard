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
              {l.name} {'\u2197'}
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
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: companiesTracked, accent: '#00A7D6', spark: [companiesTracked] },
    { icon: '\u{1F4E1}', label: 'Total Signals', value: enriched.length, accent: '#1A73E8', spark: weeklySeries(() => true), pills: totalSignalPills },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: weeklySeries((e) => e.severity === 'HIGH') },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: familyTotal('csuite'), accent: '#B364D7', spark: weeklySeries((e) => familyOf(e) === 'csuite') },
    { icon: '\u{1F4B0}', label: 'Funding', value: fundingCount, accent: '#3BC884', spark: weeklySeries((e) => familyOf(e) === 'funding' && e.displayType === 'Funding Round') },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: enriched.filter((e) => (e.s.signal_type ?? '').toUpperCase() === 'M_AND_A').length, accent: '#FB8145', spark: weeklySeries((e) => (e.s.signal_type ?? '').toUpperCase() === 'M_AND_A') },
    { icon: '\u{1F4C8}', label: 'IPO', value: enriched.filter((e) => (e.s.signal_type ?? '').toUpperCase() === 'IPO_SIGNAL').length, accent: '#DFC612', spark: weeklySeries((e) => (e.s.signal_type ?? '').toUpperCase() === 'IPO_SIGNAL') },
    { icon: '\u{1F4F0}', label: 'News', value: enriched.filter((e) => e.displayType === 'News Mention').length, accent: '#6D717F', spark: weeklySeries((e) => e.displayType === 'News Mention') },
    { icon: '\u{1F680}', label: 'Product Launches', value: familyTotal('product'), accent: '#00A7D6', spark: weeklySeries((e) => familyOf(e) === 'product') },
    { icon: '\u{1F517}', label: 'Partnerships', value: familyTotal('partnership'), accent: '#F8528F', spark: weeklySeries((e) => familyOf(e) === 'partnership') },
    { icon: '\u{1F3A8}', label: 'Creative Hiring', value: enriched.filter((e) => isCreativeHiring(e.s)).length, accent: '#FF5252', spark: weeklySeries((e) => isCreativeHiring(e.s)) },
  ]

  const feed = useMemo(() => {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
    return enriched
      .filter((e) => e.timestamp >= cutoff)
      .filter((e) => (feedType === null ? true : e.displayType === feedType))
      .filter((e) => (feedWeek === null ? true : e.weekKey === feedWeek))
      .filter((e) => (feedFamily === null ? true : familyOf(e) === feedFamily))
      .sort((a, b) => b.timestamp - a.timestamp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, feedType, feedWeek, feedFamily])

  const recentSignals = useMemo(
    () => [...enriched].sort((a, b) => b.timestamp - a.timestamp).slice(0, 50),
    [enriched],
  )

  const displayTypes = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched],
  )

  const severityPieData = useMemo(
    () => SEVERITIES.map((sev) => ({ name: sev, value: severityCounts[sev], color: SEVERITY_COLORS[sev] })),
    [severityCounts],
  )

  const typeBarData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, name: `${type} \u00b7 ${count}`, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const glance = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    let last7 = 0
    const companySet = new Set<string>()
    for (const e of enriched) {
      const key = e.s.company_key !== '' ? e.s.company_key : e.s.company_name
      companySet.add(key)
      if (e.timestamp >= cutoff) last7 += 1
    }
    return { total: enriched.length, last7, companies: companySet.size }
  }, [enriched])

  const weeklyTrendData = useMemo(
    () => weekKeys.map((wk) => ({ week: wk, count: enriched.filter((e) => e.weekKey === wk).length })),
    [weekKeys, enriched],
  )

  const industryData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.industry, (map.get(e.industry) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [enriched])

  const familyData = FAMILIES.map((f) => ({
    name: FAMILY_META[f].label,
    family: f,
    count: familyTotal(f),
    color: FAMILY_META[f].color,
  }))

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const companies = result.companies ?? []
    return companies
      .map((c) => {
        const key = c.company_id !== '' ? c.company_id : c.company_key
        const sigs = enriched
          .filter((e) => (c.company_id !== '' && e.s.company_id === c.company_id) || (c.company_key !== '' && e.s.company_key === c.company_key))
          .sort((a, b) => b.timestamp - a.timestamp)
        return {
          key,
          company: c,
          signals: sigs,
          latest: sigs[0] ?? null,
          techStack: extraList(c, ['tech_stack', 'techStack', 'technologies']),
          keywords: extraList(c, ['keywords', 'tags']),
        }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [result.companies, enriched])

  const industries = useMemo(() => {
    const set = new Set<string>()
    for (const row of companyRows) set.add(industryOf(row.company))
    return Array.from(set).sort()
  }, [companyRows])

  const filteredCompanies =
    industryFilter === null ? companyRows : companyRows.filter((r) => industryOf(r.company) === industryFilter)

  const topCompanyRow = companyRows.find((r) => r.signals.length > 0) ?? null
  const topType = typeBarData[0] ?? null

  const latestSignal = useMemo(() => {
    let best: EnrichedSignal | null = null
    for (const e of enriched) {
      if (best === null || e.timestamp > best.timestamp) best = e
    }
    return best
  }, [enriched])

  const insightTiles = [
    {
      label: 'Most Signals',
      value: topCompanyRow ? topCompanyRow.company.company_name : '\u2014',
      sub: topCompanyRow ? `${formatNumber(topCompanyRow.signals.length)} total signal${topCompanyRow.signals.length === 1 ? '' : 's'}` : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'High Alerts',
      value: formatNumber(severityCounts.HIGH),
      sub: 'high-severity signals',
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: topType ? topType.type : '\u2014',
      sub: topType ? `${formatNumber(topType.count)} occurrence${topType.count === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? latestSignal.s.company_name : '\u2014',
      sub: latestSignal ? `${latestSignal.displayType} \u00b7 ${formatDate(latestSignal.dateIso)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  const handleCardClick = (label: string) => {
    if (label === 'Companies Tracked') {
      setTab('companies')
      return
    }
    const type = CARD_TYPE_FILTER[label]
    setFeedType(type ?? null)
    setFeedFamily(label === 'C-Suite Changes' ? 'csuite' : null)
    setFeedWeek(null)
    setTab('signals')
  }

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
  }

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />
      <main className="mx-auto max-w-7xl px-4 py-6" role="tabpanel" aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <ChartCard title="Weekly Signal Trend">
              {enriched.length === 0 || weeklyTrendData.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyTrendData}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          const label = activeLabelOf(state)
                          if (label) {
                            setFeedWeek(label)
                            setTab('signals')
                          }
                        }}
                      >
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickFormatter={(v: string) => formatDate(v)} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={(v) => `Week of ${formatDate(String(v))}`} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                        <Bar dataKey="count" name="Signals" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-[#8A8D99]">Click a bar to view that week&apos;s signals.</p>
                </>
              )}
            </ChartCard>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Recent signals">
              <h2 className="text-sm font-semibold text-[#575A66]">Recent Signals</h2>
              {recentSignals.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {recentSignals.map((e, i) => (
                    <SignalRow key={`${e.s.id}-${i}`} e={e} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <select
                aria-label="Filter by industry"
                className={selectCls}
                value={industryFilter ?? 'all'}
                onChange={(e) => setIndustryFilter(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">All industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <span className="ml-auto text-xs text-[#8A8D99]">
                {filteredCompanies.length} of {companyRows.length} compan{companyRows.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
            <div className="rounded-2xl border border-[#E2E3E5] bg-white">
              <div className="max-h-[70vh] overflow-auto rounded-2xl">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr>
                      {['Company', 'Industry', 'Website', 'HQ', 'Signals', 'Latest'].map((h) => (
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
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#8A8D99]">
                          No companies match this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((row) => {
                        const isOpen = expandedCompany === row.key
                        return (
                          <Fragment key={row.key}>
                            <tr
                              onClick={() => setExpandedCompany(isOpen ? null : row.key)}
                              className="cursor-pointer border-b border-[#F0F1F2] transition-colors last:border-b-0 hover:bg-[#F7F8F9]"
                            >
                              <td className="px-4 py-3 font-medium text-[#2C2D33]">{row.company.company_name}</td>
                              <td className="px-4 py-3 text-[#575A66]">{industryOf(row.company)}</td>
                              <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['website', 'domain'])}</td>
                              <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['hq', 'location', 'city'])}</td>
                              <td className="px-4 py-3 text-[#575A66]">{formatNumber(row.signals.length)}</td>
                              <td className="px-4 py-3 text-[#8A8D99]">{row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}</td>
                            </tr>
                            {isOpen && (
                              <tr className="border-b border-[#F0F1F2] last:border-b-0">
                                <td colSpan={6} className="bg-[#F7F8F9] px-6 py-5">
                                  {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                    <div className="mb-4 flex flex-wrap gap-2">
                                      {row.techStack.map((t) => (
                                        <span key={`tech-${t}`} className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]">{t}</span>
                                      ))}
                                      {row.keywords.map((k) => (
                                        <span key={`kw-${k}`} className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#8A8D99]">{k}</span>
                                      ))}
                                    </div>
                                  )}
                                  {row.signals.length === 0 ? (
                                    <p className="text-xs text-[#8A8D99]">No signals recorded for this company.</p>
                                  ) : (
                                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
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
            </div>
          </div>
        )}

        {tab === 'signals' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard title={'\u26A1 Severity mix'}>
                {enriched.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className="mt-2 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={severityPieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3} stroke="none">
                            {severityPieData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-4" aria-label="Severity legend">
                      {severityPieData.map((d) => (
                        <li key={d.name} className="flex items-center gap-2 text-xs text-[#575A66]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                          {d.name} {'\u00b7'} <span className="font-medium text-[#2C2D33]">{formatNumber(d.value)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </ChartCard>

              <ChartCard title={'\u{1F4CA} Signal types'}>
                {typeBarData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="mt-2 h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeBarData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis type="category" dataKey="name" width={150} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                        <Bar dataKey="count" name="Signals" radius={[0, 6, 6, 0]} barSize={16}>
                          {typeBarData.map((d) => (
                            <Cell key={d.type} fill={d.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </ChartCard>

              <ChartCard title={'\u{1F4E1} At a glance'}>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-3xl font-semibold text-[#2C2D33]">{formatNumber(glance.total)}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">total signals</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-[#2C2D33]">{formatNumber(glance.last7)}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">in the last 7 days</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-[#2C2D33]">{formatNumber(glance.companies)}</div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">companies with signals</div>
                  </div>
                </div>
              </ChartCard>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <select
                aria-label="Filter by signal type"
                className={selectCls}
                value={feedType ?? 'all'}
                onChange={(e) => setFeedType(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">All types</option>
                {displayTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                aria-label="Filter by family"
                className={selectCls}
                value={feedFamily ?? 'all'}
                onChange={(e) => setFeedFamily(e.target.value === 'all' ? null : (e.target.value as Family))}
              >
                <option value="all">All families</option>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>{FAMILY_META[f].label}</option>
                ))}
              </select>
              <select
                aria-label="Filter by week"
                className={selectCls}
                value={feedWeek ?? 'all'}
                onChange={(e) => setFeedWeek(e.target.value === 'all' ? null : e.target.value)}
              >
                <option value="all">All weeks</option>
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
                {formatNumber(feed.length)} of {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>

            {feed.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">{'\u{1F50D}'}</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals match your filters</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Try clearing the filters or importing more companies.</p>
              </div>
            ) : (
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signal list">
                <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                  {feed.map((e, i) => (
                    <SignalRow key={`${e.s.id}-${i}`} e={e} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Signals by Family">
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={familyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                        <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]}>
                          {familyData.map((d) => (
                            <Cell
                              key={d.family}
                              fill={d.color}
                              cursor="pointer"
                              onClick={() => {
                                setFeedFamily(d.family)
                                setFeedType(null)
                                setFeedWeek(null)
                                setTab('signals')
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-[#8A8D99]">Click a bar to filter the signal feed by that family.</p>
                </>
              )}
            </ChartCard>
            <ChartCard title="Top Industries by Signal Count">
              {industryData.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={industryData} layout="vertical" margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <YAxis type="category" dataKey="industry" width={140} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                      <Bar dataKey="count" name="Signals" fill="#00A7D6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {tab === 'insights' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {insightTiles.map((t) => (
              <div key={t.label} className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">{t.label}</p>
                <p className="mt-1 truncate text-xl font-semibold" style={{ color: t.accent }}>{t.value}</p>
                <p className="mt-0.5 text-xs text-[#575A66]">{t.sub}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
