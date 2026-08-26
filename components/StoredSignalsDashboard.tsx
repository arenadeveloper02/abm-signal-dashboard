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

  const industries = useMemo(() => {
    const set = new Set<string>()
    enriched.forEach((e) => set.add(e.industry))
    return Array.from(set).sort()
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
      if (typeof name === 'string' && name !== '') {
        setFeedType((prev) => (prev === name ? null : name))
      }
    }
  }

  const handleWeeklyClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (label !== null) {
      setFeedWeek((prev) => (prev === label ? null : label))
    }
  }

  const handleIndustryClick = (entry: unknown) => {
    if (typeof entry === 'object' && entry !== null && 'name' in entry) {
      const name = (entry as { name?: unknown }).name
      if (typeof name === 'string' && name !== '') {
        setIndustryFilter((prev) => (prev === name ? null : name))
        setTab('signals')
      }
    }
  }

  const handleCardClick = (label: string) => {
    const mapped = CARD_TYPE_FILTER[label]
    if (mapped) {
      toggleFeedType(mapped)
    } else {
      setFeedType(null)
    }
  }

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
  }

  const insightTiles = [
    {
      label: 'Most Signals',
      value: topCompany ? topCompany[0] : '—',
      sub: topCompany ? `${formatNumber(topCompany[1])} total signal${topCompany[1] === 1 ? '' : 's'}` : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'High Alerts',
      value: formatNumber(severityCounts.HIGH),
      sub: `${formatNumber(enriched.length)} signals overall`,
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: topType ? topType.name : '—',
      sub: topType ? `${formatNumber(topType.value)} occurrence${topType.value === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: newestSignal ? newestSignal.s.company_name : '—',
      sub: newestSignal ? `${newestSignal.displayType} · ${formatDate(newestSignal.dateIso)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

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
                  selected={feedType !== null && feedType === CARD_TYPE_FILTER[c.label]}
                  onClick={() => handleCardClick(c.label)}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signal volume chart">
                <h2 className="text-sm font-semibold text-[#575A66]">Weekly Signal Volume by Severity</h2>
                {weeklyData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No dated signals yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData} onClick={handleWeeklyClick} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="week" stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                        {SEVERITIES.map((sev) => (
                          <Bar key={sev} dataKey={sev} stackId="sev" fill={SEVERITY_COLORS[sev]} className="cursor-pointer" />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-3 flex flex-wrap gap-4">
                  {SEVERITIES.map((sev) => (
                    <li key={sev} className="flex items-center gap-2 text-xs text-[#575A66]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} aria-hidden="true" />
                      {sev} · <span className="text-[#2C2D33]">{formatNumber(severityCounts[sev])}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signals by type chart">
                <h2 className="text-sm font-semibold text-[#575A66]">Signals by Type</h2>
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
                          paddingAngle={2}
                          stroke="none"
                          onClick={handleDonutClick}
                        >
                          {donutData.map((d) => (
                            <Cell key={d.name} fill={typeColor(d.name)} className="cursor-pointer" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-3 flex flex-wrap gap-3">
                  {donutData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2 text-xs text-[#575A66]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColor(d.name) }} aria-hidden="true" />
                      {d.name} · <span className="text-[#2C2D33]">{formatNumber(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Recent signal feed">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-[#575A66]">Signal Feed (last 90 days)</h2>
                <span className="text-xs text-[#8A8D99]">
                  {formatNumber(feed.length)} signal{feed.length === 1 ? '' : 's'}
                </span>
                {(feedType !== null || feedWeek !== null) && (
                  <button
                    type="button"
                    onClick={clearFeedFilters}
                    className="ml-auto rounded-lg border border-[#E2E3E5] px-3 py-1 text-xs font-medium text-[#575A66] transition-colors hover:border-[#F31A1A]/50 hover:text-[#2C2D33]"
                  >
                    Clear filters{feedType !== null ? ` · ${feedType}` : ''}{feedWeek !== null ? ` · wk ${feedWeek}` : ''}
                  </button>
                )}
              </div>
              {feed.length === 0 ? (
                <p className="mt-10 pb-6 text-center text-sm text-[#8A8D99]">No signals match the current feed filters.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {feed.slice(0, 50).map((e, i) => (
                    <article key={`${e.s.id || e.s.signal_key || 'sig'}-${i}`} className="rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#2C2D33]">{e.s.company_name}</span>
                        <TypeBadge label={e.displayType} />
                        <SeverityBadge severity={e.severity} />
                        <span className="ml-auto text-xs text-[#8A8D99]">{formatDate(e.dateIso)}</span>
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
                              {l.name} ↗
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className="space-y-4">
            {result.unmatched_inputs.length > 0 && (
              <div className="rounded-2xl border border-[#FDCDB5] bg-[#FFF9F5] p-4 text-xs text-[#974D29]" role="note">
                {formatNumber(result.unmatched_inputs.length)} uploaded compan{result.unmatched_inputs.length === 1 ? 'y' : 'ies'} could not be matched:{' '}
                {result.unmatched_inputs.slice(0, 10).join(', ')}
                {result.unmatched_inputs.length > 10 ? '…' : ''}
              </div>
            )}
            {sortedCompanies.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">🏢</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No matched companies yet</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Upload a company list and run an analysis to populate this view.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white">
                <div className="max-h-[70vh] overflow-auto rounded-2xl">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr>
                        {['Company', 'Industry', 'HQ', 'Total', 'Funding', 'C-Suite', 'Product', 'Partnership'].map((h) => (
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
                      {sortedCompanies.map((c, i) => (
                        <tr key={`${c.company_id || c.company_key || c.company_name}-${i}`} className="border-b border-[#F7F8F9] last:border-b-0">
                          <td className="px-4 py-3 font-medium text-[#2C2D33]">{c.company_name}</td>
                          <td className="px-4 py-3 text-[#575A66]">{c.industry !== '' ? c.industry : '—'}</td>
                          <td className="px-4 py-3 text-[#575A66]">{c.hq !== '' ? c.hq : '—'}</td>
                          <td className="px-4 py-3 text-[#2C2D33]">{formatNumber(c.total)}</td>
                          <td className="px-4 py-3 text-[#575A66]">{formatNumber(c.by_family.funding)}</td>
                          <td className="px-4 py-3 text-[#575A66]">{formatNumber(c.by_family.csuite)}</td>
                          <td className="px-4 py-3 text-[#575A66]">{formatNumber(c.by_family.product)}</td>
                          <td className="px-4 py-3 text-[#575A66]">{formatNumber(c.by_family.partnership)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'signals' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <label htmlFor="industry-filter" className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">
                Industry
              </label>
              <select
                id="industry-filter"
                value={industryFilter ?? 'all'}
                onChange={(e) => setIndustryFilter(e.target.value === 'all' ? null : e.target.value)}
                className="rounded-lg border border-[#E2E3E5] bg-white px-2 py-1.5 text-sm text-[#2C2D33] focus:border-[#1A73E8] focus:outline-none"
              >
                <option value="all">All industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              <span className="ml-auto text-xs text-[#8A8D99]">
                {formatNumber(tableSignals.length)} of {formatNumber(enriched.length)} signal{enriched.length === 1 ? '' : 's'}
              </span>
            </div>
            {tableSignals.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">🔍</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals match your filters</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Try clearing the industry filter.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white">
                <div className="max-h-[70vh] overflow-auto rounded-2xl">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr>
                        {['Company', 'Industry', 'Type', 'Severity', 'Date', 'Summary', 'Sources'].map((h) => (
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
                      {tableSignals.map((e, i) => (
                        <tr key={`${e.s.id || e.s.signal_key || 'row'}-${i}`} className="border-b border-[#F7F8F9] align-top last:border-b-0">
                          <td className="px-4 py-3 font-medium text-[#2C2D33]">{e.s.company_name}</td>
                          <td className="px-4 py-3 text-[#575A66]">{e.industry}</td>
                          <td className="px-4 py-3"><TypeBadge label={e.displayType} /></td>
                          <td className="px-4 py-3"><SeverityBadge severity={e.severity} /></td>
                          <td className="whitespace-nowrap px-4 py-3 text-[#575A66]">{formatDate(e.dateIso)}</td>
                          <td className="max-w-md px-4 py-3 text-[#575A66]">
                            <span className="line-clamp-2">{e.s.summary}</span>
                          </td>
                          <td className="px-4 py-3">
                            {e.links.length === 0 ? (
                              <span className="text-xs text-[#A7AAB2]">—</span>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {e.links.slice(0, 2).map((l, j) => (
                                  <a
                                    key={`${l.url}-${j}`}
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-[#1A73E8] hover:underline"
                                  >
                                    {l.name} ↗
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div className="space-y-4">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signals by family chart">
              <h2 className="text-sm font-semibold text-[#575A66]">Weekly Signals by Family</h2>
              {weeklyFamilyData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#8A8D99]">No dated signals yet.</p>
              ) : (
                <div className="mt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyFamilyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                      <XAxis dataKey="week" stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                      {FAMILIES.map((f) => (
                        <Bar key={f} dataKey={f} name={FAMILY_META[f].label} stackId="fam" fill={FAMILY_META[f].color} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-3 flex flex-wrap gap-4">
                {FAMILIES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[#575A66]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                    {FAMILY_META[f].label} · <span className="text-[#2C2D33]">{formatNumber(familyTotal(f))}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signals by industry chart">
              <h2 className="text-sm font-semibold text-[#575A66]">Top Industries by Signal Volume</h2>
              <p className="mt-0.5 text-xs text-[#8A8D99]">Click a bar to filter the Signals tab by that industry.</p>
              {industryData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#8A8D99]">No industry data yet.</p>
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={140} stroke="#A7AAB2" tick={{ fill: '#2C2D33', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                      <Bar dataKey="value" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={18} onClick={handleIndustryClick} className="cursor-pointer" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'insights' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {insightTiles.map((t) => (
                <div key={t.label} className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8D99]">{t.label}</p>
                  <p className="mt-1 truncate text-xl font-semibold" style={{ color: t.accent }}>{t.value}</p>
                  <p className="mt-0.5 text-xs text-[#575A66]">{t.sub}</p>
                </div>
              ))}
            </div>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Top companies by signal count">
              <h2 className="text-sm font-semibold text-[#575A66]">Top Companies</h2>
              {companyTotals.length === 0 ? (
                <p className="mt-10 pb-6 text-center text-sm text-[#8A8D99]">No company activity yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {companyTotals.slice(0, 5).map(([name, count]) => (
                    <li key={name} className="flex items-center justify-between rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2.5 text-sm">
                      <span className="font-medium text-[#2C2D33]">{name}</span>
                      <span className="text-xs text-[#575A66]">{formatNumber(count)} signal{count === 1 ? '' : 's'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-label="High severity signals">
              <div className="mb-3 flex items-center gap-2">
                <SeverityBadge severity="HIGH" />
                <span className="text-xs text-[#8A8D99]">
                  {formatNumber(highSignals.length)} high-severity signal{highSignals.length === 1 ? '' : 's'}
                </span>
              </div>
              {highSignals.length === 0 ? (
                <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                  <p className="text-3xl" aria-hidden="true">💡</p>
                  <p className="mt-3 text-sm font-medium text-[#2C2D33]">No high-severity signals</p>
                  <p className="mt-1 text-xs text-[#8A8D99]">Check the Signals tab for medium and low severity activity.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {highSignals.slice(0, 30).map((e, i) => (
                    <article key={`${e.s.id || e.s.signal_key || 'high'}-${i}`} className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#2C2D33]">{e.s.company_name}</span>
                        <TypeBadge label={e.displayType} />
                        <SeverityBadge severity={e.severity} />
                        <span className="ml-auto text-xs text-[#8A8D99]">{formatDate(e.dateIso)}</span>
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
                              {l.name} ↗
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
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
