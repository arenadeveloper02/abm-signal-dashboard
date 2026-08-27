"use client"

import { Fragment, useMemo, useState } from 'react'
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

export default function StoredSignalsDashboard({ result }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [feedType, setFeedType] = useState<string | null>(null)
  const [feedWeek, setFeedWeek] = useState<string | null>(null)
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
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [enriched, feedType, feedWeek])

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

  const typeOptions = useMemo(() => donutData.map((d) => d.name), [donutData])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const map = new Map<string, CompanyRowData>()
    for (const c of result.companies ?? []) {
      const key = c.company_key !== '' ? c.company_key : c.company_id !== '' ? c.company_id : c.company_name
      map.set(key, {
        key,
        company: c,
        signals: [],
        latest: null,
        techStack: extraList(c, ['tech_stack', 'techStack', 'technologies', 'Tech Stack']),
        keywords: extraList(c, ['keywords', 'Keywords', 'tags']),
      })
    }
    enriched.forEach((e) => {
      const company = companyLookup.get(e.s.company_id) ?? companyLookup.get(e.s.company_key)
      const key = company
        ? company.company_key !== ''
          ? company.company_key
          : company.company_id !== ''
            ? company.company_id
            : company.company_name
        : e.s.company_key !== ''
          ? e.s.company_key
          : e.s.company_name
      let row = map.get(key)
      if (!row) {
        row = {
          key,
          company:
            company ??
            ({
              company_id: e.s.company_id,
              company_name: e.s.company_name,
              company_key: e.s.company_key,
              domain: '',
              website: '',
              industry: e.industry === 'Unknown' ? '' : e.industry,
              hq: '',
              total: 0,
              by_family: { funding: 0, csuite: 0, product: 0, partnership: 0 },
            } as StoredCompany),
          signals: [],
          latest: null,
          techStack: [],
          keywords: [],
        }
        map.set(key, row)
      }
      row.signals.push(e)
    })
    const rows = Array.from(map.values())
    rows.forEach((r) => {
      r.signals.sort((a, b) => b.timestamp - a.timestamp)
      r.latest = r.signals[0] ?? null
    })
    return rows.sort((a, b) => (b.latest?.timestamp ?? 0) - (a.latest?.timestamp ?? 0))
  }, [result.companies, enriched, companyLookup])

  const industries = useMemo(() => {
    const set = new Set<string>()
    companyRows.forEach((r) => {
      const ind = (r.company.industry ?? '').trim()
      set.add(ind !== '' ? ind : 'Unknown')
    })
    return Array.from(set).sort()
  }, [companyRows])

  const filteredCompanies = useMemo(() => {
    if (industryFilter === null) return companyRows
    return companyRows.filter((r) => {
      const ind = (r.company.industry ?? '').trim()
      return (ind !== '' ? ind : 'Unknown') === industryFilter
    })
  }, [companyRows, industryFilter])

  const highlights = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        items: enriched
          .filter((e) => (e.s.signal_family ?? '').toLowerCase() === f && e.severity === 'HIGH')
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10),
      })).filter((g) => g.items.length > 0),
    [enriched],
  )

  const handleCardClick = (label: string) => {
    const mapped = CARD_TYPE_FILTER[label]
    setFeedType(mapped ?? null)
    setFeedWeek(null)
    setTab('signals')
  }

  const handleWeekClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (label !== null) {
      setFeedWeek(label)
      setTab('signals')
    }
  }

  const toggleCompany = (key: string) => {
    setExpandedCompany((prev) => (prev === key ? null : key))
  }

  return (
    <div>
      <TabBar active={tab} onChange={setTab} />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6" role="tabpanel" aria-label={`${tab} panel`}>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly signal volume chart">
                <h2 className="text-sm font-semibold text-[#575A66]">Weekly Signal Volume</h2>
                {weeklyData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No dated signals yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }} onClick={handleWeekClick}>
                        <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                        <XAxis dataKey="week" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 11 }} />
                        <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                        {SEVERITIES.map((sev) => (
                          <Bar key={sev} dataKey={sev} stackId="sev" fill={SEVERITY_COLORS[sev]} barSize={18} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <p className="mt-2 text-[11px] text-[#8A8D99]">Click a week to filter the signal feed.</p>
              </section>

              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signal type mix chart">
                <h2 className="text-sm font-semibold text-[#575A66]">Signal Type Mix</h2>
                {donutData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No signal types yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                          {donutData.map((d) => (
                            <Cell key={d.name} fill={typeColor(d.name)} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <ul className="mt-3 flex flex-wrap gap-4">
                  {donutData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2 text-xs text-[#8A8D99]">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColor(d.name) }} aria-hidden="true" />
                      {d.name} {'\u00b7'} <span className="text-[#2C2D33]">{formatNumber(d.value)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Signals by industry chart">
                <h2 className="text-sm font-semibold text-[#575A66]">Signals by Industry</h2>
                {industryData.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No industry data yet.</p>
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <XAxis type="number" allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={130} stroke="#A7AAB2" tick={{ fill: '#575A66', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                        <Bar dataKey="value" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Recent signals">
                <h2 className="text-sm font-semibold text-[#575A66]">Recent Signals</h2>
                {recent.length === 0 ? (
                  <p className="mt-16 text-center text-sm text-[#8A8D99]">No signals yet.</p>
                ) : (
                  <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
                    {recent.map((e, i) => (
                      <li key={`${e.s.id}-${i}`} className="rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[#2C2D33]">{e.s.company_name}</span>
                          <span className="shrink-0 text-xs text-[#8A8D99]">{formatDate(e.dateIso)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <TypeBadge label={e.displayType} />
                          <SeverityBadge severity={e.severity} />
                        </div>
                        {e.s.summary !== '' && <p className="mt-1 text-xs text-[#575A66]">{e.s.summary}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        )}

        {tab === 'companies' && (
          <div className="rounded-2xl border border-[#E2E3E5] bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E2E3E5] p-4">
              <select
                aria-label="Filter companies by industry"
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
                {formatNumber(filteredCompanies.length)} compan{filteredCompanies.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Company</th>
                    <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Industry</th>
                    <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">HQ</th>
                    <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Website</th>
                    <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Signals</th>
                    <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Latest</th>
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
                      const expanded = expandedCompany === row.key
                      return (
                        <Fragment key={row.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => toggleCompany(row.key)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') toggleCompany(row.key)
                            }}
                            className="cursor-pointer border-b border-[#F0F1F2] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none"
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
                            <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['industry'])}</td>
                            <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['hq'])}</td>
                            <td className="px-4 py-3 text-[#575A66]">{extraField(row.company, ['website', 'domain'])}</td>
                            <td className="px-4 py-3 text-right text-[#575A66]">{formatNumber(row.signals.length)}</td>
                            <td className="px-4 py-3 text-right text-[#8A8D99]">
                              {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-[#F0F1F2] last:border-b-0">
                              <td colSpan={6} className="bg-[#F7F8F9] px-6 py-5">
                                {(row.techStack.length > 0 || row.keywords.length > 0) && (
                                  <div className="mb-4 flex flex-wrap gap-2">
                                    {row.techStack.map((t) => (
                                      <span key={`tech-${t}`} className="rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]">
                                        {t}
                                      </span>
                                    ))}
                                    {row.keywords.map((k) => (
                                      <span key={`kw-${k}`} className="rounded-full border border-[#D1E3FA] bg-[#F3F8FE] px-2 py-0.5 text-[11px] text-[#155CBA]">
                                        {k}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {row.signals.length === 0 ? (
                                  <p className="text-xs text-[#8A8D99]">No signals recorded for this company yet.</p>
                                ) : (
                                  <div>
                                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Signal History</h3>
                                    <div className="mt-3 space-y-3">
                                      {row.signals.map((e, i) => (
                                        <SignalRow key={`${e.s.id}-${i}`} e={e} />
                                      ))}
                                    </div>
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
          <section className="space-y-4" aria-label="Signal feed">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <select
                aria-label="Filter feed by signal type"
                className={selectCls}
                value={feedType ?? ''}
                onChange={(e) => setFeedType(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All types</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                aria-label="Filter feed by week"
                className={selectCls}
                value={feedWeek ?? ''}
                onChange={(e) => setFeedWeek(e.target.value === '' ? null : e.target.value)}
              >
                <option value="">All weeks</option>
                {weekKeys.map((wk) => (
                  <option key={wk} value={wk}>Week of {wk}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setFeedType(null)
                  setFeedWeek(null)
                }}
                className="rounded-lg border border-[#E2E3E5] px-3 py-1.5 text-sm text-[#575A66] transition-colors hover:border-[#F31A1A]/50 hover:text-[#2C2D33]"
              >
                Clear
              </button>
              <span className="ml-auto text-xs text-[#8A8D99]">
                {formatNumber(feed.length)} signal{feed.length === 1 ? '' : 's'} in the last 90 days
              </span>
            </div>
            {feed.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">🔍</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals match your filters</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Try clearing the type or week filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((e, i) => (
                  <SignalRow key={`${e.s.id}-${i}`} e={e} />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'trends' && (
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5" aria-label="Weekly trend chart">
            <h2 className="text-sm font-semibold text-[#575A66]">Weekly Signal Volume by Severity</h2>
            {weeklyData.length === 0 ? (
              <p className="mt-16 text-center text-sm text-[#8A8D99]">No dated signals yet.</p>
            ) : (
              <div className="mt-2 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }} onClick={handleWeekClick}>
                    <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                    <XAxis dataKey="week" stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 11 }} />
                    <YAxis allowDecimals={false} stroke="#A7AAB2" tick={{ fill: '#8A8D99', fontSize: 11 }} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(44,45,51,0.04)' }} />
                    {SEVERITIES.map((sev) => (
                      <Bar key={sev} dataKey={sev} stackId="sev" fill={SEVERITY_COLORS[sev]} barSize={22} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-2 text-[11px] text-[#8A8D99]">Click a week to jump to the filtered signal feed.</p>
          </section>
        )}

        {tab === 'insights' && (
          highlights.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
              <p className="text-3xl" aria-hidden="true">💡</p>
              <p className="mt-3 text-sm font-medium text-[#2C2D33]">No high-severity insights yet</p>
              <p className="mt-1 text-xs text-[#8A8D99]">
                Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {highlights.map((g) => (
                <section key={g.family} aria-label={`${g.family} insights`}>
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
                      <SignalRow key={`${e.s.id}-${i}`} e={e} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  )
}
