"use client"

import { useMemo, useState } from 'react'
import type {
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

const tooltipStyle = {
  backgroundColor: '#22242C',
  border: '1px solid #2E313A',
  borderRadius: 8,
  color: '#F2F3F5',
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2E313A] bg-[#22242C] px-2 py-0.5 text-[11px] font-medium text-[#D3D6DE]">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {label}
    </span>
  )
}

export default function StoredSignalsDashboard({ result }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [feedType, setFeedType] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
  const [industryFilter, setIndustryFilter] = useState<string | null>(null)

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
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek])

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
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [enriched])

  const industryData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.industry, (map.get(e.industry) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [enriched])

  const weeklyFamilyData = useMemo(
    () =>
      weekKeys.map((wk) => {
        const items = enriched.filter((e) => e.weekKey === wk)
        return {
          week: wk,
          funding: items.filter((e) => (e.s.signal_family ?? '').toLowerCase() === 'funding').length,
          csuite: items.filter((e) => (e.s.signal_family ?? '').toLowerCase() === 'csuite').length,
          product: items.filter((e) => (e.s.signal_family ?? '').toLowerCase() === 'product').length,
          partnership: items.filter((e) => (e.s.signal_family ?? '').toLowerCase() === 'partnership').length,
        }
      }),
    [weekKeys, enriched],
  )

  const tableSignals = useMemo(
    () =>
      enriched
        .filter((e) => (industryFilter === null ? true : e.industry === industryFilter))
        .sort((a, b) => b.timestamp - a.timestamp),
    [enriched, industryFilter],
  )

  const highSignals = useMemo(
    () => enriched.filter((e) => e.severity === 'HIGH').sort((a, b) => b.timestamp - a.timestamp),
    [enriched],
  )

  const companyTotals = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.s.company_name, (map.get(e.s.company_name) ?? 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [enriched])

  const topCompany = companyTotals[0] ?? null
  const topType = donutData[0] ?? null
  const newestSignal = useMemo(
    () => enriched.reduce<EnrichedSignal | null>((best, cur) => (!best || cur.timestamp > best.timestamp ? cur : best), null),
    [enriched],
  )

  const toggleFeedType = (label: string) => {
    setFeedType((prev) => (prev === label ? null : label))
  }

  const handleDonutClick = (entry: unknown) => {
    if (typeof entry === 'object' && entry !== null && 'name' in entry) {
      const name = (entry as { name?: unknown }).name
      if (typeof name === 'string') toggleFeedType(name)
    }
  }

  const renderSignalCard = (e: EnrichedSignal, i: number, clampSummary: boolean) => (
    <article
      key={e.s.id !== '' ? e.s.id : `${e.s.company_name}-${e.dateIso}-${i}`}
      className="rounded-xl border border-[#22242C] bg-[#15161C] p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-white">{e.s.company_name}</span>
        <TypeBadge label={e.displayType} />
        <SeverityBadge severity={e.severity} />
        <span className="ml-auto text-xs text-[#8A8F9C]">{formatDate(e.dateIso)}</span>
      </div>
      <p className={`mt-1.5 text-sm leading-relaxed text-[#D3D6DE] ${clampSummary ? 'line-clamp-2' : ''}`}>{e.s.summary}</p>
      {e.links.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-3">
          {e.links.map((l, j) => (
            <a
              key={`${l.url}-${j}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[#3BC884] hover:underline"
            >
              {l.name} ↗
            </a>
          ))}
        </div>
      )}
    </article>
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2E313A] bg-[#12131A]">
      <div className="border-b border-[#2E313A] bg-[#15161C] px-4 py-3">
        <p className="text-sm font-semibold text-white">Stored Signals Dashboard</p>
        <p className="mt-0.5 text-xs text-[#8A8F9C]">
          {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'} · {formatNumber(companiesTracked)} companies tracked
          {typeof result.matched_count === 'number' ? ` · ${formatNumber(result.matched_count)} matched` : ''}
        </p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      <div className="p-4" role="tabpanel" aria-label={`${tab} panel`}>
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
                  onClick={() => undefined}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signal feed">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold text-[#A6ABB8]">Signal Feed</h2>
                  <span className="rounded-full border border-[#2E313A] bg-[#22242C] px-2 py-0.5 text-[11px] font-medium text-[#D3D6DE]">
                    {formatNumber(feed.length)}
                  </span>
                  {feedType && (
                    <button
                      type="button"
                      onClick={() => setFeedType(null)}
                      className="rounded-full border border-[#2E313A] px-2 py-0.5 text-[11px] text-[#D3D6DE] hover:text-white"
                    >
                      {feedType} ✕
                    </button>
                  )}
                  {feedWeek && (
                    <button
                      type="button"
                      onClick={() => setFeedWeek(null)}
                      className="rounded-full border border-[#2E313A] px-2 py-0.5 text-[11px] text-[#D3D6DE] hover:text-white"
                    >
                      Week of {formatDate(feedWeek)} ✕
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[#6D717F]">Feed limited to signals from the last 90 days, newest first.</p>
                {feed.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-[#22242C] bg-[#15161C] p-8 text-center">
                    <p className="text-2xl" aria-hidden="true">📭</p>
                    <p className="mt-2 text-sm font-medium text-white">No signals in the last 90 days</p>
                    <p className="mt-1 text-xs text-[#8A8F9C]">Try clearing the type or week filters.</p>
                  </div>
                ) : (
                  <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
                    {feed.map((e, i) => renderSignalCard(e, i, true))}
                  </div>
                )}
              </section>
              <div className="space-y-4">
                <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Weekly signal trend chart">
                  <h2 className="text-sm font-semibold text-[#A6ABB8]">Weekly Signal Trend</h2>
                  {weeklyData.length === 0 ? (
                    <p className="mt-12 text-center text-sm text-[#6D717F]">No dated signals yet.</p>
                  ) : (
                    <div className="mt-2 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={weeklyData}
                          margin={{ top: 5, right: 10, bottom: 0, left: 0 }}
                          onClick={(state) => {
                            const label = activeLabelOf(state)
                            if (label) setFeedWeek((prev) => (prev === label ? null : label))
                          }}
                        >
                          <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                          <XAxis dataKey="week" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 10 }} tickFormatter={(v) => formatDate(String(v))} />
                          <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} labelFormatter={(v) => `Week of ${formatDate(String(v))}`} />
                          <Bar dataKey="HIGH" name="High" stackId="sev" fill="#FF5252" cursor="pointer" />
                          <Bar dataKey="MEDIUM" name="Medium" stackId="sev" fill="#FB8145" cursor="pointer" />
                          <Bar dataKey="LOW" name="Low" stackId="sev" fill="#9AA0AE" radius={[4, 4, 0, 0]} cursor="pointer" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-4">
                    {SEVERITIES.map((sev) => (
                      <li key={sev} className="flex items-center gap-2 text-xs text-[#A6ABB8]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} aria-hidden="true" />
                        {sev} · <span className="text-white">{formatNumber(severityCounts[sev])}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-[#6D717F]">Click a bar to filter the signal feed to that week.</p>
                </section>
                <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signal type breakdown chart">
                  <h2 className="text-sm font-semibold text-[#A6ABB8]">Signal Type Breakdown</h2>
                  {donutData.length === 0 ? (
                    <p className="mt-12 text-center text-sm text-[#6D717F]">No signal types yet.</p>
                  ) : (
                    <div className="mt-2 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            stroke="none"
                            onClick={handleDonutClick}
                          >
                            {donutData.map((d) => (
                              <Cell key={d.name} fill={typeColor(d.name)} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {donutData.map((d) => (
                      <li key={d.name}>
                        <button
                          type="button"
                          onClick={() => toggleFeedType(d.name)}
                          aria-pressed={feedType === d.name}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            feedType === d.name ? 'border-[#3BC884] text-white' : 'border-[#2E313A] text-[#A6ABB8] hover:text-white'
                          }`}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: typeColor(d.name) }} aria-hidden="true" />
                          {d.name} · {formatNumber(d.value)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
            <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Top industries by signal count chart">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-[#A6ABB8]">Top Industries by Signal Count</h2>
                {industryFilter && (
                  <button
                    type="button"
                    onClick={() => setIndustryFilter(null)}
                    className="rounded-full border border-[#2E313A] px-2 py-0.5 text-[11px] text-[#D3D6DE] hover:text-white"
                  >
                    {industryFilter} ✕
                  </button>
                )}
              </div>
              {industryData.length === 0 ? (
                <p className="mt-12 text-center text-sm text-[#6D717F]">No industry data yet.</p>
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={industryData}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                      onClick={(state) => {
                        const label = activeLabelOf(state)
                        if (label) {
                          setIndustryFilter((prev) => (prev === label ? null : label))
                          setTab('signals')
                        }
                      }}
                    >
                      <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} stroke="#6D717F" tick={{ fill: '#D3D6DE', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="value" name="Signals" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={18} cursor="pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-[11px] text-[#6D717F]">Click a bar to filter the Signals tab to that industry.</p>
            </section>
          </div>
        )}
        {tab === 'companies' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24]">
              <div className="max-h-[60vh] overflow-auto rounded-2xl">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr>
                      {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership'].map((h, i) => (
                        <th
                          key={h}
                          className={`sticky top-0 z-10 border-b border-[#2E313A] bg-[#22242C] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8F9C] ${
                            i >= 3 ? 'text-right' : 'text-left'
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.companies ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#6D717F]">
                          No matched companies in this result.
                        </td>
                      </tr>
                    ) : (
                      (result.companies ?? []).map((c, i) => (
                        <tr key={c.company_id !== '' ? c.company_id : `${c.company_name}-${i}`} className="border-b border-[#22242C] last:border-b-0">
                          <td className="px-4 py-3 font-medium text-white">{c.company_name}</td>
                          <td className="px-4 py-3 text-[#D3D6DE]">{c.industry || '—'}</td>
                          <td className="px-4 py-3 text-[#D3D6DE]">{c.hq || '—'}</td>
                          <td className="px-4 py-3 text-right text-[#D3D6DE]">{formatNumber(c.total ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-[#D3D6DE]">{formatNumber(c.by_family?.funding ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-[#D3D6DE]">{formatNumber(c.by_family?.csuite ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-[#D3D6DE]">{formatNumber(c.by_family?.product ?? 0)}</td>
                          <td className="px-4 py-3 text-right text-[#D3D6DE]">{formatNumber(c.by_family?.partnership ?? 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {result.unmatched_inputs.length > 0 && (
              <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8A8F9C]">
                  Unmatched inputs ({formatNumber(result.unmatched_inputs.length)})
                </p>
                <p className="mt-1 text-sm text-[#D3D6DE]">{result.unmatched_inputs.join(', ')}</p>
              </div>
            )}
          </div>
        )}
        {tab === 'signals' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
              <span className="text-xs text-[#8A8F9C]">
                {formatNumber(tableSignals.length)} of {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'}
              </span>
              {industryFilter && (
                <button
                  type="button"
                  onClick={() => setIndustryFilter(null)}
                  className="rounded-full border border-[#2E313A] px-2 py-0.5 text-[11px] text-[#D3D6DE] hover:text-white"
                >
                  Industry: {industryFilter} ✕
                </button>
              )}
            </div>
            {tableSignals.length === 0 ? (
              <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-12 text-center">
                <p className="text-3xl" aria-hidden="true">🔍</p>
                <p className="mt-3 text-sm font-medium text-white">No signals to show</p>
                <p className="mt-1 text-xs text-[#8A8F9C]">
                  Signals with type NO_SIGNIFICANT_SIGNAL are excluded. Try clearing the industry filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">{tableSignals.map((e, i) => renderSignalCard(e, i, false))}</div>
            )}
          </div>
        )}
        {tab === 'trends' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Weekly signals by severity chart">
              <h2 className="text-sm font-semibold text-[#A6ABB8]">Weekly Signals by Severity</h2>
              {weeklyData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#6D717F]">No dated signals yet.</p>
              ) : (
                <div className="mt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                      <XAxis dataKey="week" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} tickFormatter={(v) => formatDate(String(v))} />
                      <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} labelFormatter={(v) => `Week of ${formatDate(String(v))}`} />
                      <Bar dataKey="HIGH" name="High" stackId="sev" fill="#FF5252" />
                      <Bar dataKey="MEDIUM" name="Medium" stackId="sev" fill="#FB8145" />
                      <Bar dataKey="LOW" name="Low" stackId="sev" fill="#9AA0AE" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Weekly signals by family chart">
              <h2 className="text-sm font-semibold text-[#A6ABB8]">Weekly Signals by Family</h2>
              {weeklyFamilyData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#6D717F]">No dated signals yet.</p>
              ) : (
                <div className="mt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyFamilyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                      <XAxis dataKey="week" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} tickFormatter={(v) => formatDate(String(v))} />
                      <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} labelFormatter={(v) => `Week of ${formatDate(String(v))}`} />
                      {FAMILIES.map((f) => (
                        <Bar key={f} dataKey={f} name={FAMILY_META[f].label} stackId="fam" fill={FAMILY_META[f].color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-3 flex flex-wrap gap-4">
                {FAMILIES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[#A6ABB8]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                    {FAMILY_META[f].label}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        {tab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Most Signals</p>
                <p className="mt-1 truncate text-xl font-semibold text-[#1A73E8]">{topCompany ? topCompany[0] : '—'}</p>
                <p className="mt-0.5 text-xs text-[#A6ABB8]">
                  {topCompany ? `${formatNumber(topCompany[1])} signal${topCompany[1] === 1 ? '' : 's'}` : 'No companies yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Most Common Type</p>
                <p className="mt-1 truncate text-xl font-semibold text-[#B364D7]">{topType ? topType.name : '—'}</p>
                <p className="mt-0.5 text-xs text-[#A6ABB8]">
                  {topType ? `${formatNumber(topType.value)} occurrence${topType.value === 1 ? '' : 's'}` : 'No signal types yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Most Recent Signal</p>
                <p className="mt-1 truncate text-xl font-semibold text-[#3BC884]">{newestSignal ? newestSignal.s.company_name : '—'}</p>
                <p className="mt-0.5 text-xs text-[#A6ABB8]">
                  {newestSignal ? `${newestSignal.displayType} · ${formatDate(newestSignal.dateIso)}` : 'No signals yet'}
                </p>
              </div>
            </div>
            {highSignals.length === 0 ? (
              <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-12 text-center">
                <p className="text-3xl" aria-hidden="true">💡</p>
                <p className="mt-3 text-sm font-medium text-white">No high-severity insights yet</p>
                <p className="mt-1 text-xs text-[#8A8F9C]">
                  Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
                </p>
              </div>
            ) : (
              <div className="space-y-3">{highSignals.map((e, i) => renderSignalCard(e, i, false))}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
