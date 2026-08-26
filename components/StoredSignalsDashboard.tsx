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

const CARD_TYPE_FILTER: Record<string, string | undefined> = {
  Funding: 'Funding Round',
  'Mergers & Acquisitions': 'Acquisition / M&A',
  IPO: 'IPO',
  News: 'News Mention',
  'Product Launches': 'Product Launch',
  Partnerships: 'Partnership',
  'Creative Hiring': 'Creative Hiring',
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
    { icon: '\ud83c\udfe2', label: 'Companies Tracked', value: companiesTracked, accent: '#00A7D6', spark: [companiesTracked] },
    { icon: '\ud83d\udce1', label: 'Total Signals', value: enriched.length, accent: '#1A73E8', spark: weeklySeries(() => true), pills: totalSignalPills },
    { icon: '\ud83d\udea8', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: weeklySeries((e) => e.severity === 'HIGH') },
    { icon: '\ud83d\udc54', label: 'C-Suite Changes', value: familyTotal('csuite'), accent: '#B364D7', spark: weeklySeries((e) => familyOf(e) === 'csuite') },
    { icon: '\ud83d\udcb0', label: 'Funding', value: fundingCount, accent: '#3BC884', spark: weeklySeries((e) => familyOf(e) === 'funding' && e.displayType === 'Funding Round') },
    { icon: '\ud83e\udd1d', label: 'Mergers & Acquisitions', value: enriched.filter((e) => (e.s.signal_type ?? '').toUpperCase() === 'M_AND_A').length, accent: '#FB8145', spark: weeklySeries((e) => (e.s.signal_type ?? '').toUpperCase() === 'M_AND_A') },
    { icon: '\ud83d\udcc8', label: 'IPO', value: enriched.filter((e) => (e.s.signal_type ?? '').toUpperCase() === 'IPO_SIGNAL').length, accent: '#DFC612', spark: weeklySeries((e) => (e.s.signal_type ?? '').toUpperCase() === 'IPO_SIGNAL') },
    { icon: '\ud83d\udcf0', label: 'News', value: enriched.filter((e) => e.displayType === 'News Mention').length, accent: '#6D717F', spark: weeklySeries((e) => e.displayType === 'News Mention') },
    { icon: '\ud83d\ude80', label: 'Product Launches', value: familyTotal('product'), accent: '#00A7D6', spark: weeklySeries((e) => familyOf(e) === 'product') },
    { icon: '\ud83d\udd17', label: 'Partnerships', value: familyTotal('partnership'), accent: '#F8528F', spark: weeklySeries((e) => familyOf(e) === 'partnership') },
    { icon: '\ud83c\udfa8', label: 'Creative Hiring', value: enriched.filter((e) => isCreativeHiring(e.s)).length, accent: '#FF5252', spark: weeklySeries((e) => isCreativeHiring(e.s)) },
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

  const sortedCompanies = useMemo(
    () => [...(result.companies ?? [])].sort((a, b) => b.total - a.total),
    [result.companies],
  )

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

  const renderSignalCard = (e: EnrichedSignal, i: number) => (
    <article key={`${e.s.company_name}-${e.dateIso}-${i}`} className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-[#2C2D33]">{e.s.company_name}</span>
        <TypeBadge label={e.displayType} />
        <SeverityBadge severity={e.severity} />
        <span className="ml-auto text-xs text-[#8A8D99]">{e.dateIso !== '' ? formatDate(e.dateIso) : '\u2014'}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[#575A66]">{e.s.summary}</p>
      {e.links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-3">
          {e.links.map((l, j) => (
            <a
              key={`${l.url}-${j}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#1A73E8] hover:underline"
            >
              {l.name} \u2197
            </a>
          ))}
        </div>
      )}
    </article>
  )

  return (
    <section className="rounded-2xl border border-[#E2E3E5] bg-white" aria-label="Stored signals dashboard">
      <div className="border-b border-[#E2E3E5] px-5 pt-4">
        <h2 className="text-base font-semibold text-[#2C2D33]">Stored Signals Dashboard</h2>
        <p className="mt-0.5 pb-3 text-xs text-[#8A8D99]">
          {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'} across {formatNumber(companiesTracked)}{' '}
          tracked compan{companiesTracked === 1 ? 'y' : 'ies'}
        </p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      <div className="p-5">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((c) => {
                const target = CARD_TYPE_FILTER[c.label]
                return (
                  <KpiCard
                    key={c.label}
                    icon={c.icon}
                    label={c.label}
                    value={c.value}
                    accent={c.accent}
                    sparkData={c.spark}
                    pills={c.pills}
                    selected={target !== undefined && feedType === target}
                    onClick={() => {
                      if (target) toggleFeedType(target)
                    }}
                  />
                )
              })}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signal volume chart">
                <h3 className="text-sm font-semibold text-[#575A66]">Weekly Signal Volume</h3>
                {weeklyData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No dated signals yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyData}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state: unknown) => {
                          const label = activeLabelOf(state)
                          if (label) setFeedWeek((prev) => (prev === label ? null : label))
                        }}
                      >
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="week" stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} tickFormatter={(v: string) => formatDate(v)} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                        {SEVERITIES.map((sev) => (
                          <Bar key={sev} dataKey={sev} stackId="sev" fill={SEVERITY_COLORS[sev]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-[#A7AAB2]">Click a week to filter the signal feed below.</p>
              </section>
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signals by type chart">
                <h3 className="text-sm font-semibold text-[#575A66]">Signals by Type</h3>
                {donutData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No signal types yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
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
                <ul className="mt-3 flex flex-wrap gap-3">
                  {donutData.map((d) => (
                    <li key={d.name} className="flex items-center gap-1.5 text-xs text-[#575A66]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: typeColor(d.name) }} aria-hidden="true" />
                      {d.name} \u00b7 <span className="font-medium text-[#2C2D33]">{formatNumber(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <section aria-label="Recent signal feed">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-[#575A66]">Recent Signals (last 90 days)</h3>
                {feedType !== null && (
                  <button
                    type="button"
                    onClick={() => setFeedType(null)}
                    className="flex items-center gap-1 rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]"
                  >
                    {feedType} \u2715
                  </button>
                )}
                {feedWeek !== null && (
                  <button
                    type="button"
                    onClick={() => setFeedWeek(null)}
                    className="flex items-center gap-1 rounded-full border border-[#A3C7F6] bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]"
                  >
                    Week of {formatDate(feedWeek)} \u2715
                  </button>
                )}
                <span className="ml-auto text-xs text-[#8A8D99]">
                  {formatNumber(feed.length)} signal{feed.length === 1 ? '' : 's'}
                </span>
              </div>
              {feed.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-[#E2E3E5] bg-[#F7F8F9] p-10 text-center">
                  <p className="text-sm text-[#8A8D99]">No signals match the current feed filters.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">{feed.slice(0, 50).map((e, i) => renderSignalCard(e, i))}</div>
              )}
            </section>
          </div>
        )}
        {tab === 'companies' && (
          <div className="overflow-auto rounded-2xl border border-[#E2E3E5]">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership'].map((h, idx) => (
                    <th
                      key={h}
                      className={`border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                        idx >= 3 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#8A8D99]">
                      No matched companies in the stored data.
                    </td>
                  </tr>
                ) : (
                  sortedCompanies.map((c, i) => (
                    <tr key={`${c.company_id || c.company_key || c.company_name}-${i}`} className="border-b border-[#F7F8F9] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[#2C2D33]">{c.company_name}</td>
                      <td className="px-4 py-3 text-[#575A66]">{c.industry || '\u2014'}</td>
                      <td className="px-4 py-3 text-[#575A66]">{c.hq || '\u2014'}</td>
                      <td className="px-4 py-3 text-right text-[#2C2D33]">{formatNumber(c.total)}</td>
                      <td className="px-4 py-3 text-right text-[#575A66]">{c.by_family?.funding ?? 0}</td>
                      <td className="px-4 py-3 text-right text-[#575A66]">{c.by_family?.csuite ?? 0}</td>
                      <td className="px-4 py-3 text-right text-[#575A66]">{c.by_family?.product ?? 0}</td>
                      <td className="px-4 py-3 text-right text-[#575A66]">{c.by_family?.partnership ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'signals' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signals by industry chart">
              <h3 className="text-sm font-semibold text-[#575A66]">Signals by Industry</h3>
              {industryData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#8A8D99]">No industry data yet.</p>
              ) : (
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={140} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                      <Bar dataKey="value" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <div className="flex flex-wrap items-center gap-2">
              {industryData.map((ind) => (
                <button
                  key={ind.name}
                  type="button"
                  aria-pressed={industryFilter === ind.name}
                  onClick={() => setIndustryFilter((prev) => (prev === ind.name ? null : ind.name))}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    industryFilter === ind.name
                      ? 'border-[#1A73E8] bg-[#F3F8FE] text-[#155CBA]'
                      : 'border-[#E2E3E5] bg-white text-[#575A66] hover:border-[#A3C7F6]'
                  }`}
                >
                  {ind.name} \u00b7 {formatNumber(ind.value)}
                </button>
              ))}
              {industryFilter !== null && (
                <button type="button" onClick={() => setIndustryFilter(null)} className="text-xs font-medium text-[#C21515] hover:underline">
                  Clear
                </button>
              )}
              <span className="ml-auto text-xs text-[#8A8D99]">
                {formatNumber(tableSignals.length)} signal{tableSignals.length === 1 ? '' : 's'}
              </span>
            </div>
            {tableSignals.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-[#F7F8F9] p-10 text-center">
                <p className="text-sm text-[#8A8D99]">No signals for this industry filter.</p>
              </div>
            ) : (
              <div className="space-y-3">{tableSignals.slice(0, 100).map((e, i) => renderSignalCard(e, i))}</div>
            )}
          </div>
        )}
        {tab === 'trends' && (
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signals by family chart">
            <h3 className="text-sm font-semibold text-[#575A66]">Weekly Signals by Family</h3>
            {weeklyFamilyData.length === 0 ? (
              <p className="mt-16 text-center text-sm text-[#8A8D99]">No dated signals yet.</p>
            ) : (
              <div className="mt-2 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyFamilyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                    <XAxis dataKey="week" stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} tickFormatter={(v: string) => formatDate(v)} />
                    <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(26,115,232,0.06)' }} />
                    {FAMILIES.map((f) => (
                      <Bar key={f} dataKey={f} stackId="fam" name={FAMILY_META[f].label} fill={FAMILY_META[f].color} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <ul className="mt-3 flex flex-wrap gap-4">
              {FAMILIES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-[#575A66]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                  {FAMILY_META[f].label}
                </li>
              ))}
            </ul>
          </section>
        )}
        {tab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[#00A7D6]/40 bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">Most Signals</p>
                <p className="mt-1 truncate text-xl font-semibold text-[#00A7D6]">{topCompany ? topCompany[0] : '\u2014'}</p>
                <p className="mt-0.5 text-xs text-[#8A8D99]">
                  {topCompany ? `${formatNumber(topCompany[1])} signal${topCompany[1] === 1 ? '' : 's'}` : 'No companies yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#B364D7]/40 bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">Top Signal Type</p>
                <p className="mt-1 truncate text-xl font-semibold text-[#B364D7]">{topType ? topType.name : '\u2014'}</p>
                <p className="mt-0.5 text-xs text-[#8A8D99]">
                  {topType ? `${formatNumber(topType.value)} occurrence${topType.value === 1 ? '' : 's'}` : 'No signal types yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#3BC884]/40 bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">Most Recent Signal</p>
                <p className="mt-1 truncate text-xl font-semibold text-[#3BC884]">
                  {newestSignal ? newestSignal.s.company_name : '\u2014'}
                </p>
                <p className="mt-0.5 text-xs text-[#8A8D99]">
                  {newestSignal ? `${newestSignal.displayType} \u00b7 ${formatDate(newestSignal.dateIso)}` : 'No signals yet'}
                </p>
              </div>
              <div className="rounded-2xl border border-[#F31A1A]/40 bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">High Alerts</p>
                <p className="mt-1 text-xl font-semibold text-[#F31A1A]">{formatNumber(severityCounts.HIGH)}</p>
                <p className="mt-0.5 text-xs text-[#8A8D99]">High-severity signals in stored data</p>
              </div>
            </div>
            <section aria-label="High severity signals">
              <h3 className="text-sm font-semibold text-[#575A66]">High-Severity Signals</h3>
              {highSignals.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-[#E2E3E5] bg-[#F7F8F9] p-10 text-center">
                  <p className="text-sm text-[#8A8D99]">No high-severity signals in the stored data.</p>
                </div>
              ) : (
                <div className="mt-3 space-y-3">{highSignals.slice(0, 30).map((e, i) => renderSignalCard(e, i))}</div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  )
}
