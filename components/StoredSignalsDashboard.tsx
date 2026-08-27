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
      .filter((e) => (industryFilter === null ? true : e.industry === industryFilter))
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek, feedFamily, industryFilter])

  const displayTypes = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched]
  )

  const industries = useMemo(() => {
    const set = new Set<string>()
    for (const c of result.companies ?? []) set.add(industryOf(c))
    for (const e of enriched) set.add(e.industry)
    return Array.from(set)
      .filter((v) => v !== '')
      .sort()
  }, [result.companies, enriched])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const map = new Map<string, CompanyRowData>()
    for (const c of result.companies ?? []) {
      const key = c.company_id || c.company_key || c.company_name
      if (!key) continue
      map.set(key, {
        key,
        company: c,
        signals: [],
        latest: null,
        techStack: extraList(c, ['tech_stack', 'techStack', 'technologies']),
        keywords: extraList(c, ['keywords', 'tags']),
      })
    }
    for (const e of enriched) {
      const key = e.s.company_id || e.s.company_key || e.s.company_name
      if (!key) continue
      let row = map.get(key)
      if (!row) {
        const synthetic: StoredCompany = {
          company_id: e.s.company_id,
          company_name: e.s.company_name,
          company_key: e.s.company_key,
          domain: '',
          website: '',
          industry: '',
          hq: '',
          total: 0,
          by_family: { funding: 0, csuite: 0, product: 0, partnership: 0 },
        }
        row = { key, company: synthetic, signals: [], latest: null, techStack: [], keywords: [] }
        map.set(key, row)
      }
      row.signals.push(e)
      if (!row.latest || e.timestamp > row.latest.timestamp) row.latest = e
    }
    const rows = Array.from(map.values())
    rows.forEach((r) => r.signals.sort((a, b) => b.timestamp - a.timestamp))
    return rows.sort((a, b) => b.signals.length - a.signals.length)
  }, [result.companies, enriched])

  const recentSignals = useMemo(
    () => [...enriched].sort((a, b) => b.timestamp - a.timestamp),
    [enriched]
  )

  const glance = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    let last7 = 0
    const companySet = new Set<string>()
    for (const e of enriched) {
      const key = e.s.company_key || e.s.company_id || e.s.company_name
      if (key) companySet.add(key)
      if (e.timestamp >= cutoff) last7 += 1
    }
    return { total: enriched.length, last7, companies: companySet.size }
  }, [enriched])

  const severityPieData = SEVERITIES.map((sv) => ({
    name: sv,
    value: severityCounts[sv],
    color: SEVERITY_COLORS[sv],
  }))
  const severityTotal = severityPieData.reduce((acc, d) => acc + d.value, 0)

  const typeBarData = useMemo(() => {
    const counts = new Map<string, number>()
    enriched.forEach((e) => counts.set(e.displayType, (counts.get(e.displayType) ?? 0) + 1))
    return Array.from(counts.entries())
      .map(([type, count]) => ({ name: `${type} · ${count}`, type, count, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const weeklyTrend = useMemo(() => {
    return weekKeys.map((wk) => {
      const d = new Date(wk)
      return {
        week: wk,
        label: Number.isNaN(d.getTime()) ? wk : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: enriched.filter((e) => e.weekKey === wk).length,
      }
    })
  }, [weekKeys, enriched])

  const familyBarData = FAMILIES.map((f) => ({
    family: f,
    name: FAMILY_META[f].label,
    count: enriched.filter((e) => familyOf(e) === f).length,
    color: FAMILY_META[f].color,
  }))

  const topCompanies = useMemo(
    () =>
      companyRows
        .filter((r) => r.signals.length > 0)
        .slice(0, 10)
        .map((r) => ({ name: r.company.company_name, count: r.signals.length })),
    [companyRows]
  )

  const highSignals = useMemo(
    () => enriched.filter((e) => e.severity === 'HIGH').sort((a, b) => b.timestamp - a.timestamp),
    [enriched]
  )

  const topCompanyRow = companyRows.find((r) => r.signals.length > 0) ?? null
  const topHighRow =
    [...companyRows].sort(
      (a, b) =>
        b.signals.filter((e) => e.severity === 'HIGH').length -
        a.signals.filter((e) => e.severity === 'HIGH').length
    )[0] ?? null
  const topHighCount = topHighRow ? topHighRow.signals.filter((e) => e.severity === 'HIGH').length : 0
  const topTypeEntry = typeBarData[0] ?? null
  const latestSignal = recentSignals[0] ?? null

  const insightTiles = [
    {
      label: 'Most Signals',
      value: topCompanyRow ? topCompanyRow.company.company_name : '—',
      sub: topCompanyRow
        ? `${topCompanyRow.signals.length} total signal${topCompanyRow.signals.length === 1 ? '' : 's'}`
        : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'Most High Alerts',
      value: topHighRow && topHighCount > 0 ? topHighRow.company.company_name : '—',
      sub: topHighCount > 0 ? `${topHighCount} high-severity` : 'No high-severity signals',
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: topTypeEntry ? topTypeEntry.type : '—',
      sub: topTypeEntry ? `${topTypeEntry.count} occurrence${topTypeEntry.count === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? latestSignal.s.company_name : '—',
      sub: latestSignal ? `${latestSignal.displayType} · ${formatDate(latestSignal.dateIso)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  const insightGroups = FAMILIES.map((f) => ({
    family: f,
    items: highSignals.filter((e) => familyOf(e) === f),
  })).filter((g) => g.items.length > 0)

  const handleCardClick = (label: string) => {
    const type = CARD_TYPE_FILTER[label]
    if (label === 'C-Suite Changes') {
      setFeedFamily('csuite')
      setFeedType(null)
    } else if (type) {
      setFeedType(type)
      setFeedFamily(null)
    } else {
      setFeedType(null)
      setFeedFamily(null)
    }
    setFeedWeek(null)
    setIndustryFilter(null)
    setTab('signals')
  }

  const clearFeedFilters = () => {
    setFeedType(null)
    setFeedWeek(null)
    setFeedFamily(null)
    setIndustryFilter(null)
  }

  return (
    <div>
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
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Recent signals">
              <h2 className="text-sm font-semibold text-[#575A66]">Recent Signals</h2>
              {recentSignals.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {recentSignals.map((e, i) => (
                    <SignalRow key={`${e.s.id}-recent-${i}`} e={e} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className="rounded-2xl border border-[#E2E3E5] bg-white">
            <div className="max-h-[70vh] overflow-auto rounded-2xl">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    {['Company', 'Industry', 'Website', 'HQ', 'Signals', 'High', 'Latest'].map((h) => (
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
                  {companyRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-[#8A8D99]">
                        No companies yet. Import a company list to get started.
                      </td>
                    </tr>
                  ) : (
                    companyRows.map((row) => {
                      const expanded = expandedCompany === row.key
                      const highCount = row.signals.filter((e) => e.severity === 'HIGH').length
                      return (
                        <Fragment key={row.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => setExpandedCompany(expanded ? null : row.key)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                setExpandedCompany(expanded ? null : row.key)
                              }
                            }}
                            className="cursor-pointer border-b border-[#F0F1F3] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none"
                          >
                            <td className="px-4 py-3 font-medium text-[#2C2D33]">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${
                                    expanded ? 'rotate-90' : ''
                                  }`}
                                >
                                  ▶
                                </span>
                                {row.company.company_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#575A66]">{industryOf(row.company)}</td>
                            <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['website', 'domain'])}</td>
                            <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['hq'])}</td>
                            <td className="px-4 py-3 text-[#575A66]">{formatNumber(row.signals.length)}</td>
                            <td className="px-4 py-3 text-[#575A66]">{highCount}</td>
                            <td className="px-4 py-3 text-[#8A8D99]">
                              {row.latest ? relativeTime(row.latest.dateIso) : '—'}
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-[#F0F1F3] last:border-b-0">
                              <td colSpan={7} className="bg-[#F7F8F9] px-6 py-5">
                                {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                  <div className="mb-4 flex flex-wrap gap-2">
                                    {row.techStack.map((t) => (
                                      <span
                                        key={`tech-${t}`}
                                        className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                    {row.keywords.map((k) => (
                                      <span
                                        key={`kw-${k}`}
                                        className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]"
                                      >
                                        {k}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {row.signals.length === 0 ? (
                                  <p className="text-xs text-[#8A8D99]">No signals recorded for this company.</p>
                                ) : (
                                  <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                                    {row.signals.map((e, i) => (
                                      <SignalRow key={`${e.s.id}-company-${i}`} e={e} />
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
        )}

        {tab === 'signals' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ChartCard title="⚡ Severity mix">
                {severityTotal === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className="mt-2 h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={severityPieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={3}
                            stroke="none"
                          >
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
                          {d.name} · <span className="font-medium text-[#2C2D33]">{d.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </ChartCard>

              <ChartCard title="📊 Signal types">
                {typeBarData.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="mt-2 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={typeBarData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={150}
                          stroke="#A7AAB2"
                          tick={{ fill: '#575A66', fontSize: 11 }}
                        />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8F9' }} />
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

              <ChartCard title="📡 At a glance">
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
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">
                      companies with signals
                    </div>
                  </div>
                </div>
              </ChartCard>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <select
                aria-label="Filter by signal type"
                className={selectCls}
                value={feedType ?? ''}
                onChange={(e) => setFeedType(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All types</option>
                {displayTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by family"
                className={selectCls}
                value={feedFamily ?? ''}
                onChange={(e) => setFeedFamily(e.target.value === '' ? null : (e.target.value as Family))}
              >
                <option value="">All families</option>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_META[f].label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by industry"
                className={selectCls}
                value={industryFilter ?? ''}
                onChange={(e) => setIndustryFilter(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All industries</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
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
                  <option key={wk} value={wk}>
                    Week of {formatDate(wk)}
                  </option>
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
                <p className="text-3xl" aria-hidden="true">🔍</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals match your filters</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Try clearing filters or importing more companies.</p>
              </div>
            ) : (
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signal feed">
                <h2 className="text-sm font-semibold text-[#575A66]">Signal Feed</h2>
                <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
                  {feed.map((e, i) => (
                    <SignalRow key={`${e.s.id}-feed-${i}`} e={e} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Weekly Signal Trend">
              {weeklyTrend.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyTrend}
                        margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
                        onClick={(state) => {
                          const label = activeLabelOf(state)
                          if (label === null) return
                          const point = weeklyTrend.find((p) => p.label === label)
                          if (!point) return
                          setFeedWeek(point.week)
                          setFeedType(null)
                          setFeedFamily(null)
                          setTab('signals')
                        }}
                      >
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="label" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8F9' }} />
                        <Bar dataKey="count" name="Signals" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-[#8A8D99]">Click a bar to see that week's signals in the feed.</p>
                </>
              )}
            </ChartCard>

            <ChartCard title="Signals by Category">
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <>
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={familyBarData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F7F8F9' }} />
                        <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]}>
                          {familyBarData.map((d) => (
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
                  <p className="mt-2 text-xs text-[#8A8D99]">Click a bar to filter the signal feed by that category.</p>
                </>
              )}
            </ChartCard>

            <ChartCard title="Top 10 Companies by Signal Count">
              {topCompanies.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompanies} layout="vertical" margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
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
              {typeBarData.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-64 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie
                          data={typeBarData}
                          dataKey="count"
                          nameKey="type"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          stroke="#FFFFFF"
                        >
                          {typeBarData.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-1.5 sm:w-1/2" aria-label="Signal type legend">
                    {typeBarData.map((t) => (
                      <li key={t.type} className="flex items-center gap-2 text-xs text-[#575A66]">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                        <span className="truncate">{t.type}</span>
                        <span className="ml-auto shrink-0 text-[#8A8D99]">{t.count}</span>
                      </li>
                    ))}
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
                  <p className="mt-1 truncate text-xl font-semibold" style={{ color: t.accent }}>
                    {t.value}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8A8D99]">{t.sub}</p>
                </div>
              ))}
            </div>
            {insightGroups.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">💡</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No high-severity insights yet</p>
                <p className="mt-1 text-xs text-[#8A8D99]">
                  Insights list HIGH-severity signals only. Check the Signals tab for all activity.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {insightGroups.map((g) => (
                  <section key={g.family} aria-label={`${FAMILY_META[g.family].label} insights`}>
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          color: FAMILY_META[g.family].color,
                          borderColor: `${FAMILY_META[g.family].color}55`,
                          backgroundColor: `${FAMILY_META[g.family].color}14`,
                        }}
                      >
                        {FAMILY_META[g.family].label}
                      </span>
                      <span className="text-xs text-[#8A8D99]">
                        {g.items.length} insight{g.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {g.items.map((e, i) => (
                        <SignalRow key={`${e.s.id}-insight-${i}`} e={e} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
