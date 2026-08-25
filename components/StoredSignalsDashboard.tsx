"use client"

import { Fragment, useMemo, useState } from 'react'
import type { StoredCompany, StoredSignal, StoredSignalsResult } from '@/lib/types'
import { FAMILIES, FAMILY_META } from '@/lib/utils'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

type DashTab = 'overview' | 'trends' | 'signals' | 'companies'

type SortKey = 'company' | 'family' | 'type' | 'severity' | 'date'

interface SourceLink {
  label: string
  url: string
}

interface EnrichedSignal {
  signal: StoredSignal
  severity: Severity
  typeLabel: string
  date: string
  links: SourceLink[]
}

interface TrendBucket {
  key: string
  month: string
  funding: number
  csuite: number
  product: number
  partnership: number
}

interface StoredSignalsDashboardProps {
  result: StoredSignalsResult
  onRefresh: () => void
  onImport: () => void
  refreshing: boolean
}

const SKIP_FIELD_KEYS = ['Normalized Entity', 'Sources Checked', 'Research Gaps', 'Reserved']

const SEVERITIES: Severity[] = ['HIGH', 'MEDIUM', 'LOW']

const SEVERITY_COLORS: Record<Severity, string> = {
  HIGH: '#F31A1A',
  MEDIUM: '#FB8145',
  LOW: '#3BC884',
}

const TABS: { key: DashTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'trends', label: 'Trends' },
  { key: 'signals', label: 'All Signals' },
  { key: 'companies', label: 'Companies' },
]

const COLS: { key: SortKey; label: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'family', label: 'Family' },
  { key: 'type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'date', label: 'Date' },
]

function sevRank(s: Severity): number {
  return s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1
}

function normalizeSeverity(s: StoredSignal): Severity {
  const fam = s.signal_family.toLowerCase()
  const conf = (s.confidence ?? '').trim()
  if (fam === 'product') {
    const n = Number(conf)
    if (conf !== '' && !Number.isNaN(n)) {
      if (n >= 8) return 'HIGH'
      if (n >= 5) return 'MEDIUM'
      return 'LOW'
    }
  }
  if (fam === 'csuite') {
    const status = (s.fields?.['Validation Status'] ?? '').trim().toUpperCase()
    return status === 'CONFIRMED' ? 'HIGH' : 'MEDIUM'
  }
  const upper = conf.toUpperCase()
  if (upper === 'HIGH') return 'HIGH'
  if (upper === 'LOW') return 'LOW'
  return 'MEDIUM'
}

function displayType(s: StoredSignal): string {
  const fam = s.signal_family.toLowerCase()
  if (fam === 'csuite') return 'C-Suite Change'
  const t = s.signal_type.toUpperCase()
  if (t === 'M_AND_A') return 'Mergers & Acquisitions'
  if (t === 'FUNDING_ROUND' || t === 'DEBT_FINANCING' || t === 'EARNINGS') return 'Funding'
  if (t === 'IPO_SIGNAL') return 'IPO'
  if (fam === 'partnership') return 'Partnership'
  if (fam === 'product') return 'Product Launch'
  return 'Other'
}

function getSourceLinks(s: StoredSignal): SourceLink[] {
  const fam = s.signal_family.toLowerCase()
  if (fam === 'csuite') {
    const raw = (s.fields?.['Supporting URLs'] ?? '').trim()
    if (raw === '' || raw.toUpperCase() === 'N/A') return []
    const label = (s.fields?.['Document Type'] ?? '').trim() || 'Source'
    return raw
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u !== '' && u.toUpperCase() !== 'N/A')
      .map((url) => ({ label, url }))
  }
  const urls = (s.source_url ?? '')
    .split(/\s+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'))
  const label = (s.source_name ?? '').trim() || 'Source'
  return urls.map((url) => ({ label, url }))
}

function famMeta(family: string): { label: string; color: string } {
  const f = family.toLowerCase()
  if (f === 'funding' || f === 'csuite' || f === 'product' || f === 'partnership') {
    return FAMILY_META[f]
  }
  return { label: family || 'Other', color: '#6D717F' }
}

function detailEntries(s: StoredSignal): [string, string][] {
  const fields = s.fields ?? {}
  return Object.entries(fields)
    .filter(([k, v]) => !SKIP_FIELD_KEYS.includes(k) && String(v).trim() !== '')
    .map(([k, v]) => [k, String(v)] as [string, string])
}

function formatLongDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatShortDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '\u2014'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function agoLabel(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 0) return '0d 0h'
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${color}66`, backgroundColor: `${color}0D` }}>
      <p className="text-3xl font-semibold" style={{ color }}>{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[#6D717F]">{label}</p>
    </div>
  )
}

export default function StoredSignalsDashboard({ result, onRefresh, onImport, refreshing }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<DashTab>('overview')
  const [famFilter, setFamFilter] = useState('all')
  const [sevFilter, setSevFilter] = useState<'all' | Severity>('all')
  const [companyFilter, setCompanyFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const enriched = useMemo<EnrichedSignal[]>(
    () =>
      result.signals
        .filter((s) => s.signal_type.toUpperCase() !== 'NO_SIGNIFICANT_SIGNAL')
        .map((s) => ({
          signal: s,
          severity: normalizeSeverity(s),
          typeLabel: displayType(s),
          date: s.announcement_date && s.announcement_date.trim() !== '' ? s.announcement_date : s.last_seen_at,
          links: getSourceLinks(s),
        })),
    [result]
  )

  const requested = result.requested_count ?? 0
  const matched = result.matched_count ?? (result.companies ? result.companies.length : 0)
  const totalSignals = enriched.length
  const highAlerts = enriched.filter((e) => e.severity === 'HIGH').length
  const last7 = enriched.filter((e) => {
    const d = new Date(e.date)
    if (Number.isNaN(d.getTime())) return false
    const diff = Date.now() - d.getTime()
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
  }).length
  const csuiteChanges = result.counts_by_family.csuite
  const fundingEvents = result.counts_by_family.funding
  const mna = enriched.filter((e) => e.signal.signal_type.toUpperCase() === 'M_AND_A').length

  const cards = [
    { label: 'Companies Tracked', value: requested, color: '#1A73E8' },
    { label: 'Total Signals', value: totalSignals, color: '#00A7D6' },
    { label: 'High Alerts', value: highAlerts, color: '#F31A1A' },
    { label: 'Signals (Last 7 Days)', value: last7, color: '#FB8145' },
    { label: 'Companies With Signals', value: matched, color: '#B364D7' },
    { label: 'C-Suite Changes', value: csuiteChanges, color: '#F8528F' },
    { label: 'Funding Events', value: fundingEvents, color: '#3BC884' },
    { label: 'Mergers & Acquisitions', value: mna, color: '#DFC612' },
  ]

  const typeData = useMemo(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.typeLabel, (map.get(e.typeLabel) ?? 0) + 1))
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [enriched])

  const sevData = SEVERITIES.map((sev) => ({
    name: sev,
    value: enriched.filter((e) => e.severity === sev).length,
  }))
  const sevTotal = sevData.reduce((acc, d) => acc + d.value, 0)

  const topCompanies: StoredCompany[] = useMemo(
    () => [...(result.companies ?? [])].sort((a, b) => b.total - a.total),
    [result]
  )
  const maxCompanyTotal = topCompanies.reduce((acc, c) => Math.max(acc, c.total), 1)

  const recentHigh = useMemo(
    () =>
      enriched
        .filter((e) => e.severity === 'HIGH')
        .sort((a, b) => {
          const ta = new Date(a.date).getTime()
          const tb = new Date(b.date).getTime()
          return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta)
        }),
    [enriched]
  )

  const trendData = useMemo<TrendBucket[]>(() => {
    const map = new Map<string, TrendBucket>()
    enriched.forEach((e) => {
      const d = new Date(e.date)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const entry =
        map.get(key) ?? {
          key,
          month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
          funding: 0,
          csuite: 0,
          product: 0,
          partnership: 0,
        }
      const fam = e.signal.signal_family.toLowerCase()
      if (fam === 'funding') entry.funding += 1
      else if (fam === 'csuite') entry.csuite += 1
      else if (fam === 'product') entry.product += 1
      else if (fam === 'partnership') entry.partnership += 1
      map.set(key, entry)
    })
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
  }, [enriched])

  const companyOptions = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.signal.company_name))).sort(),
    [enriched]
  )

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = enriched.filter((e) => {
      if (famFilter !== 'all' && e.signal.signal_family.toLowerCase() !== famFilter) return false
      if (sevFilter !== 'all' && e.severity !== sevFilter) return false
      if (companyFilter !== 'all' && e.signal.company_name !== companyFilter) return false
      if (
        q &&
        !e.signal.company_name.toLowerCase().includes(q) &&
        !e.signal.summary.toLowerCase().includes(q) &&
        !e.typeLabel.toLowerCase().includes(q)
      )
        return false
      return true
    })
    return [...rows].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'company') cmp = a.signal.company_name.localeCompare(b.signal.company_name)
      else if (sortKey === 'family') cmp = a.signal.signal_family.localeCompare(b.signal.signal_family)
      else if (sortKey === 'type') cmp = a.typeLabel.localeCompare(b.typeLabel)
      else if (sortKey === 'severity') cmp = sevRank(a.severity) - sevRank(b.severity)
      else cmp = a.date.localeCompare(b.date)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [enriched, famFilter, sevFilter, companyFilter, query, sortKey, sortDir])

  const newestRunTs = enriched.reduce<number>((acc, e) => {
    const t = new Date(e.signal.run_date).getTime()
    return Number.isNaN(t) ? acc : Math.max(acc, t)
  }, 0)

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'company' ? 'asc' : 'desc')
    }
  }

  return (
    <section aria-label="Account Signal Tracker dashboard">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#2C2D33]">Account Signal Tracker</h2>
          <p className="mt-1 text-sm text-[#6D717F]">
            Last updated: {newestRunTs > 0 ? formatLongDateTime(new Date(newestRunTs)) : '\u2014'}
            {newestRunTs > 0 && ` \u00b7 Updated ${agoLabel(newestRunTs)} ago`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onImport}
            className="rounded border border-[#1A73E8] bg-white px-4 py-2 text-sm font-semibold text-[#1A73E8] transition-colors hover:bg-[#F3F8FE]"
          >
            Import Companies
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155db5] disabled:opacity-60"
          >
            {refreshing ? 'Refreshing\u2026' : 'Refresh Dashboard'}
          </button>
        </div>
      </div>

      {result.unmatched_inputs.length > 0 && (
        <p className="mt-3 text-xs text-[#6D717F]">
          No stored signals found for: {result.unmatched_inputs.join(', ')}
        </p>
      )}

      {enriched.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[#E4E6EA] bg-white p-12 text-center">
          <p className="text-3xl" aria-hidden="true">\ud83d\udced</p>
          <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals to display</p>
          <p className="mt-1 text-xs text-[#6D717F]">
            All returned rows were filtered out (NO_SIGNIFICANT_SIGNAL placeholders) or no signals were stored for these companies.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 border-b border-[#E4E6EA]" role="tablist" aria-label="Stored signals sections">
            <div className="flex overflow-x-auto">
              {TABS.map((t) => {
                const isActive = t.key === tab
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(t.key)}
                    className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                      isActive ? 'border-[#1A73E8] text-[#1A73E8]' : 'border-transparent text-[#6D717F] hover:text-[#2C2D33]'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {tab === 'overview' && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                  <StatCard key={c.label} label={c.label} value={c.value} color={c.color} />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#2C2D33]">Severity Distribution</h3>
                  {sevTotal === 0 ? (
                    <p className="mt-16 text-center text-sm text-[#6D717F]">No severity data.</p>
                  ) : (
                    <div className="mt-2 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sevData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                            {sevData.map((d) => (
                              <Cell key={d.name} fill={SEVERITY_COLORS[d.name as Severity]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-4">
                    {sevData.map((d) => (
                      <li key={d.name} className="flex items-center gap-2 text-xs text-[#6D717F]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[d.name as Severity] }} aria-hidden="true" />
                        {d.name} \u00b7 <span className="text-[#2C2D33]">{d.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#2C2D33]">Signals by Type</h3>
                  {typeData.length === 0 ? (
                    <p className="mt-16 text-center text-sm text-[#6D717F]">No signal types.</p>
                  ) : (
                    <div className="mt-2 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={typeData} margin={{ top: 8, right: 8, bottom: 10, left: 0 }}>
                          <CartesianGrid stroke="#E4E6EA" strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={70} tick={{ fill: '#6D717F', fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fill: '#6D717F', fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#1A73E8" radius={[4, 4, 0, 0]} barSize={26} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#2C2D33]">Top Companies by Signals</h3>
                  {topCompanies.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-[#6D717F]">No companies returned.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {topCompanies.map((c) => (
                        <li key={c.company_id}>
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-[#2C2D33]">{c.company_name}</span>
                            <span className="text-[#6D717F]">{c.total}</span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-[#F7F8F9]">
                            <div
                              className="h-2 rounded-full bg-[#1A73E8]"
                              style={{ width: `${Math.max(4, Math.round((c.total / maxCompanyTotal) * 100))}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
                  <h3 className="text-sm font-semibold text-[#2C2D33]">Recent High Severity Signals</h3>
                  {recentHigh.length === 0 ? (
                    <p className="mt-8 text-center text-sm text-[#6D717F]">No high severity signals.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {recentHigh.slice(0, 8).map((e) => (
                        <li key={e.signal.id} className="rounded-lg border border-[#E4E6EA] border-l-4 bg-white p-3" style={{ borderLeftColor: '#F31A1A' }}>
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-[#2C2D33]">{e.signal.company_name}</span>
                            <span className="rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#1A73E8]">{e.typeLabel}</span>
                            <span className="ml-auto text-xs text-[#6D717F]">{formatShortDate(e.date)}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-[#6D717F]">{e.signal.summary}</p>
                          {e.links.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-3">
                              {e.links.map((l, i) => (
                                <a
                                  key={`${l.url}-${i}`}
                                  href={l.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-medium text-[#1A73E8] hover:underline"
                                >
                                  {l.label} \u2197
                                </a>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'trends' && (
            <div className="mt-6 rounded-2xl border border-[#E4E6EA] bg-white p-5">
              <h3 className="text-sm font-semibold text-[#2C2D33]">Signals Over Time</h3>
              {trendData.length === 0 ? (
                <p className="mt-16 text-center text-sm text-[#6D717F]">No dated signals to chart.</p>
              ) : (
                <div className="mt-2 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E4E6EA" strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fill: '#6D717F', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#6D717F', fontSize: 12 }} />
                      <Tooltip />
                      {FAMILIES.map((f) => (
                        <Area
                          key={f}
                          type="monotone"
                          dataKey={f}
                          name={FAMILY_META[f].label}
                          stackId="fam"
                          stroke={FAMILY_META[f].color}
                          fill={FAMILY_META[f].color}
                          fillOpacity={0.25}
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-3 flex flex-wrap gap-4">
                {FAMILIES.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[#6D717F]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
                    {FAMILY_META[f].label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'signals' && (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#E4E6EA] bg-white p-4">
                <select
                  aria-label="Filter by family"
                  className="rounded-lg border border-[#E4E6EA] px-2 py-1.5 text-sm"
                  value={famFilter}
                  onChange={(e) => setFamFilter(e.target.value)}
                >
                  <option value="all">All families</option>
                  {FAMILIES.map((f) => (
                    <option key={f} value={f}>{FAMILY_META[f].label}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by severity"
                  className="rounded-lg border border-[#E4E6EA] px-2 py-1.5 text-sm"
                  value={sevFilter}
                  onChange={(e) => setSevFilter(e.target.value as 'all' | Severity)}
                >
                  <option value="all">All severities</option>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter by company"
                  className="rounded-lg border border-[#E4E6EA] px-2 py-1.5 text-sm"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="all">All companies</option>
                  {companyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search signals..."
                  aria-label="Search signals"
                  className="w-56 rounded-lg border border-[#E4E6EA] px-3 py-1.5 text-sm"
                />
                <span className="ml-auto text-xs text-[#6D717F]">
                  {tableRows.length} of {enriched.length} signal{enriched.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="overflow-auto rounded-2xl border border-[#E4E6EA] bg-white">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr>
                      {COLS.map((col) => (
                        <th key={col.key} className="border-b border-[#E4E6EA] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          <button type="button" onClick={() => toggleSort(col.key)} aria-label={`Sort by ${col.label}`} className="transition-colors hover:text-[#2C2D33]">
                            {col.label}
                            {sortKey === col.key && <span aria-hidden="true"> {sortDir === 'asc' ? '\u25b2' : '\u25bc'}</span>}
                          </button>
                        </th>
                      ))}
                      <th className="border-b border-[#E4E6EA] bg-[#F7F8F9] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#6D717F]">No signals match your filters.</td>
                      </tr>
                    ) : (
                      tableRows.map((e) => (
                        <Fragment key={e.signal.id}>
                          <tr
                            tabIndex={0}
                            onClick={() => setExpandedId((prev) => (prev === e.signal.id ? null : e.signal.id))}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                setExpandedId((prev) => (prev === e.signal.id ? null : e.signal.id))
                              }
                            }}
                            className="cursor-pointer border-b border-[#F0F1F3] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none"
                          >
                            <td className="px-4 py-3 font-medium text-[#2C2D33]">{e.signal.company_name}</td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                style={{ color: famMeta(e.signal.signal_family).color, borderColor: `${famMeta(e.signal.signal_family).color}55`, backgroundColor: `${famMeta(e.signal.signal_family).color}14` }}
                              >
                                {famMeta(e.signal.signal_family).label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#2C2D33]">{e.typeLabel}</td>
                            <td className="px-4 py-3">
                              <span
                                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                                style={{ color: SEVERITY_COLORS[e.severity], borderColor: `${SEVERITY_COLORS[e.severity]}55`, backgroundColor: `${SEVERITY_COLORS[e.severity]}14` }}
                              >
                                {e.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#6D717F]">{formatShortDate(e.date)}</td>
                            <td className="px-4 py-3">
                              {e.links.length === 0 ? (
                                <span className="text-xs text-[#B4B8C2]">\u2014</span>
                              ) : (
                                <span className="flex flex-wrap gap-2">
                                  {e.links.map((l, i) => (
                                    <a
                                      key={`${l.url}-${i}`}
                                      href={l.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(ev) => ev.stopPropagation()}
                                      className="text-xs font-medium text-[#1A73E8] hover:underline"
                                    >
                                      {l.label} \u2197
                                    </a>
                                  ))}
                                </span>
                              )}
                            </td>
                          </tr>
                          {expandedId === e.signal.id && (
                            <tr className="border-b border-[#F0F1F3] bg-[#F7F8F9]">
                              <td colSpan={6} className="px-4 py-4">
                                <p className="text-sm text-[#2C2D33]">{e.signal.summary}</p>
                                {detailEntries(e.signal).length > 0 && (
                                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                                    {detailEntries(e.signal).map(([k, v]) => (
                                      <div key={k}>
                                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">{k}</dt>
                                        <dd className="break-words text-sm text-[#2C2D33]">{v}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'companies' && (
            <div className="mt-6">
              {(result.companies ?? []).length === 0 ? (
                <p className="rounded-2xl border border-[#E4E6EA] bg-white p-12 text-center text-sm text-[#6D717F]">No matched companies were returned.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(result.companies ?? []).map((c) => (
                    <div key={c.company_id} className="rounded-2xl border border-[#E4E6EA] bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-[#2C2D33]">{c.company_name}</h3>
                          <p className="mt-0.5 text-xs text-[#6D717F]">
                            {[c.domain || c.website, c.industry, c.hq].filter((v) => typeof v === 'string' && v.trim() !== '').join(' \u00b7 ') || '\u2014'}
                          </p>
                        </div>
                        <span className="whitespace-nowrap rounded-full bg-[#F3F8FE] px-2.5 py-1 text-xs font-semibold text-[#1A73E8]">
                          {c.total} signal{c.total === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {FAMILIES.map((f) => (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                            style={{ color: FAMILY_META[f].color, borderColor: `${FAMILY_META[f].color}55`, backgroundColor: `${FAMILY_META[f].color}14` }}
                          >
                            {FAMILY_META[f].label} {c.by_family[f] ?? 0}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
