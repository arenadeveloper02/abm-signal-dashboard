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

  return (
    <div className="space-y-6">
      <TabBar active={tab} onChange={setTab} />
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
                    if (target !== undefined) {
                      toggleFeedType(target)
                    } else {
                      setFeedType(null)
                    }
                  }}
                />
              )
            })}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signal trend chart">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#575A66]">Weekly Signal Trend</h2>
                {feedWeek !== null && (
                  <button type="button" onClick={() => setFeedWeek(null)} className="text-xs font-medium text-[#1A73E8] hover:underline">
                    Clear week {feedWeek}
                  </button>
                )}
              </div>
              {weeklyData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#6D717F]">No weekly data yet.</p>
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={weeklyData}
                      onClick={(state) => {
                        const label = activeLabelOf(state)
                        if (label !== null) setFeedWeek((prev) => (prev === label ? null : label))
                      }}
                    >
                      <CartesianGrid stroke="#E2E3E5" vertical={false} />
                      <XAxis dataKey="week" stroke="#9AA0AE" tick={{ fill: '#6D717F', fontSize: 11 }} />
                      <YAxis allowDecimals={false} stroke="#9AA0AE" tick={{ fill: '#6D717F', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                      {SEVERITIES.map((sev) => (
                        <Bar key={sev} dataKey={sev} stackId="sev" fill={SEVERITY_COLORS[sev]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-3 flex flex-wrap gap-4">
                {SEVERITIES.map((sev) => (
                  <li key={sev} className="flex items-center gap-2 text-xs text-[#575A66]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} aria-hidden="true" />
                    {sev} · <span className="font-semibold text-[#2C2D33]">{severityCounts[sev]}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signal type breakdown chart">
              <h2 className="text-sm font-semibold text-[#575A66]">Signal Type Breakdown</h2>
              {donutData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#6D717F]">No signal types yet.</p>
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
                        onClick={(entry) => handleDonutClick(entry)}
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
              <ul className="mt-3 flex flex-wrap gap-4">
                {donutData.slice(0, 6).map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-xs text-[#575A66]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColor(d.name) }} aria-hidden="true" />
                    {d.name} · <span className="font-semibold text-[#2C2D33]">{d.value}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Top industries chart">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#575A66]">Top Industries</h2>
              {industryFilter !== null && (
                <button type="button" onClick={() => setIndustryFilter(null)} className="text-xs font-medium text-[#1A73E8] hover:underline">
                  Clear industry: {industryFilter}
                </button>
              )}
            </div>
            {industryData.length === 0 ? (
              <p className="mt-16 text-center text-sm text-[#6D717F]">No industry data yet.</p>
            ) : (
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={industryData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                    onClick={(state) => {
                      const label = activeLabelOf(state)
                      if (label !== null) setIndustryFilter((prev) => (prev === label ? null : label))
                    }}
                  >
                    <XAxis type="number" allowDecimals={false} stroke="#9AA0AE" tick={{ fill: '#6D717F', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={130} stroke="#9AA0AE" tick={{ fill: '#575A66', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                    <Bar dataKey="value" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Recent signals feed">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[#575A66]">
                Recent Signals <span className="font-normal text-[#6D717F]">(last 90 days)</span>
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {feedType !== null && (
                  <button
                    type="button"
                    onClick={() => setFeedType(null)}
                    className="rounded-full border border-[#1A73E8]/40 bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#1A73E8]"
                    aria-label={`Clear type filter ${feedType}`}
                  >
                    {feedType} ✕
                  </button>
                )}
                {feedWeek !== null && (
                  <button
                    type="button"
                    onClick={() => setFeedWeek(null)}
                    className="rounded-full border border-[#1A73E8]/40 bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#1A73E8]"
                    aria-label={`Clear week filter ${feedWeek}`}
                  >
                    Week {feedWeek} ✕
                  </button>
                )}
                <span className="rounded-full bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-semibold text-[#575A66]">{feed.length}</span>
              </div>
            </div>
            {feed.length === 0 ? (
              <p className="mt-10 pb-6 text-center text-sm text-[#6D717F]">No signals in the last 90 days for the current selection.</p>
            ) : (
              <ul className="mt-3 max-h-[480px] space-y-3 overflow-y-auto pr-1">
                {feed.map((e) => (
                  <li key={e.s.id} className="rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#2C2D33]">{e.s.company_name || e.s.company}</span>
                        <TypeBadge label={e.displayType} />
                        <SeverityBadge severity={e.severity} />
                      </div>
                      <span className="text-[11px] text-[#6D717F]">{e.dateIso !== '' ? formatDate(e.dateIso) : '—'}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-[#575A66]">{e.s.summary}</p>
                    {e.links.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        {e.links.map((l) => (
                          <a
                            key={l.url}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[#1A73E8] hover:underline"
                          >
                            {l.name} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
      {tab === 'companies' && (
        <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Companies">
          <h2 className="text-sm font-semibold text-[#575A66]">Companies ({sortedCompanies.length})</h2>
          {sortedCompanies.length === 0 ? (
            <p className="mt-10 pb-6 text-center text-sm text-[#6D717F]">No companies available yet.</p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedCompanies.map((c) => (
                <article key={c.company_id || c.company_key || c.company_name} className="rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#2C2D33]">{c.company_name}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#575A66]">{formatNumber(c.total)}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#6D717F]">
                    {[c.industry, c.hq].filter((v) => v !== '').join(' · ') || '—'}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-3">
                    {FAMILIES.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[11px] text-[#575A66]">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                        {FAMILY_META[f].label} · <span className="font-semibold text-[#2C2D33]">{c.by_family[f]}</span>
                      </li>
                    ))}
                  </ul>
                  {c.website !== '' && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[11px] font-medium text-[#1A73E8] hover:underline"
                    >
                      {c.domain !== '' ? c.domain : 'Website'} ↗
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {tab === 'signals' && (
        <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="All signals">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#575A66]">All Signals ({tableSignals.length})</h2>
            {industryFilter !== null && (
              <button
                type="button"
                onClick={() => setIndustryFilter(null)}
                className="rounded-full border border-[#1A73E8]/40 bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#1A73E8]"
              >
                {industryFilter} ✕
              </button>
            )}
          </div>
          {tableSignals.length === 0 ? (
            <p className="mt-10 pb-6 text-center text-sm text-[#6D717F]">No signals match the current selection.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E3E5] text-[11px] uppercase tracking-wide text-[#6D717F]">
                    <th className="py-2 pr-3 font-medium">Company</th>
                    <th className="py-2 pr-3 font-medium">Type</th>
                    <th className="py-2 pr-3 font-medium">Severity</th>
                    <th className="py-2 pr-3 font-medium">Industry</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 font-medium">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {tableSignals.map((e) => (
                    <tr key={e.s.id} className="border-b border-[#F0F1F3] align-top">
                      <td className="py-2 pr-3 font-semibold text-[#2C2D33]">{e.s.company_name || e.s.company}</td>
                      <td className="py-2 pr-3">
                        <TypeBadge label={e.displayType} />
                      </td>
                      <td className="py-2 pr-3">
                        <SeverityBadge severity={e.severity} />
                      </td>
                      <td className="py-2 pr-3 text-[#575A66]">{e.industry}</td>
                      <td className="whitespace-nowrap py-2 pr-3 text-[#575A66]">{e.dateIso !== '' ? formatDate(e.dateIso) : '—'}</td>
                      <td className="py-2 text-[#575A66]">{e.s.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {tab === 'trends' && (
        <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signals by family chart">
          <h2 className="text-sm font-semibold text-[#575A66]">Weekly Signals by Family</h2>
          {weeklyFamilyData.length === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No trend data yet.</p>
          ) : (
            <div className="mt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyFamilyData}>
                  <CartesianGrid stroke="#E2E3E5" vertical={false} />
                  <XAxis dataKey="week" stroke="#9AA0AE" tick={{ fill: '#6D717F', fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#9AA0AE" tick={{ fill: '#6D717F', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                  {FAMILIES.map((f) => (
                    <Bar key={f} dataKey={f} stackId="fam" fill={FAMILY_META[f].color} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-3 flex flex-wrap gap-4">
            {FAMILIES.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-[#575A66]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                {FAMILY_META[f].label} · <span className="font-semibold text-[#2C2D33]">{familyTotal(f)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Most active company">
              <h2 className="text-xs font-medium uppercase tracking-wide text-[#6D717F]">Most Active Company</h2>
              {topCompany === null ? (
                <p className="mt-2 text-sm text-[#6D717F]">—</p>
              ) : (
                <p className="mt-2 text-sm font-semibold text-[#2C2D33]">
                  {topCompany[0]} <span className="font-normal text-[#6D717F]">· {formatNumber(topCompany[1])} signals</span>
                </p>
              )}
            </section>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Top signal type">
              <h2 className="text-xs font-medium uppercase tracking-wide text-[#6D717F]">Top Signal Type</h2>
              {topType === null ? (
                <p className="mt-2 text-sm text-[#6D717F]">—</p>
              ) : (
                <div className="mt-2 flex items-center gap-2">
                  <TypeBadge label={topType.name} />
                  <span className="text-sm font-semibold text-[#2C2D33]">{formatNumber(topType.value)}</span>
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Latest signal">
              <h2 className="text-xs font-medium uppercase tracking-wide text-[#6D717F]">Latest Signal</h2>
              {newestSignal === null ? (
                <p className="mt-2 text-sm text-[#6D717F]">—</p>
              ) : (
                <p className="mt-2 text-sm font-semibold text-[#2C2D33]">
                  {newestSignal.s.company_name || newestSignal.s.company}{' '}
                  <span className="font-normal text-[#6D717F]">
                    · {newestSignal.dateIso !== '' ? formatDate(newestSignal.dateIso) : '—'}
                  </span>
                </p>
              )}
            </section>
          </div>
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="High severity signals">
            <h2 className="text-sm font-semibold text-[#575A66]">High Severity Signals ({highSignals.length})</h2>
            {highSignals.length === 0 ? (
              <p className="mt-10 pb-6 text-center text-sm text-[#6D717F]">No high severity signals yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {highSignals.map((e) => (
                  <li key={e.s.id} className="rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#2C2D33]">{e.s.company_name || e.s.company}</span>
                        <TypeBadge label={e.displayType} />
                        <SeverityBadge severity={e.severity} />
                      </div>
                      <span className="text-[11px] text-[#6D717F]">{e.dateIso !== '' ? formatDate(e.dateIso) : '—'}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-[#575A66]">{e.s.summary}</p>
                    {e.links.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-3">
                        {e.links.map((l) => (
                          <a
                            key={l.url}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-[#1A73E8] hover:underline"
                          >
                            {l.name} ↗
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
