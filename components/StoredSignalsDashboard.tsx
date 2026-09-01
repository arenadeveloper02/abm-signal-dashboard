"use client"

import { Fragment, useMemo, useState } from 'react'
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
import { useArenaEmailId } from '@/components/arena-email-provider'
import {
  FAMILIES,
  FAMILY_META,
  NO_SIGNIFICANT_SIGNAL,
  formatDate,
  formatNumber,
  getStoredSourceLinks,
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
  onRefresh?: () => void | Promise<void>
}

interface EnrichedSignal {
  s: StoredSignal
  severity: NormalizedSeverity
  displayType: string
  dateIso: string
  timestamp: number
  industry: string
  links: SourceLink[]
}

interface CompanyRowData {
  key: string
  company: StoredCompany
  signals: EnrichedSignal[]
  latest: EnrichedSignal | null
}

interface StoredCardDef {
  icon: string
  label: string
  value: number
  accent: string
  spark: number[]
  pills?: KpiPill[]
  target: TabKey
}

interface WeekBucket {
  key: number
  label: string
  count: number
}

const tooltipStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E2E3E5',
  borderRadius: 8,
  color: '#2C2D33',
  fontSize: 12,
}

const SEVERITY_COLORS: Record<NormalizedSeverity, string> = {
  HIGH: '#F31A1A',
  MEDIUM: '#FB8145',
  LOW: '#3BC884',
}

const SEVERITIES: NormalizedSeverity[] = ['HIGH', 'MEDIUM', 'LOW']

const TYPE_PALETTE = ['#B364D7', '#F8528F', '#3BC884', '#FB8145', '#DFC612', '#00A7D6', '#1A73E8', '#6D717F', '#FF5252']

const inputCls =
  'rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none'

const cardCls = 'rounded-2xl border border-[#E2E3E5] bg-white p-5'

const cardTitleCls = 'text-sm font-semibold text-[#575A66]'

const COMPANY_COLUMNS: { label: string; align: 'left' | 'right' }[] = [
  { label: 'Company', align: 'left' },
  { label: 'Industry', align: 'left' },
  { label: 'Total', align: 'right' },
  { label: 'Funding', align: 'right' },
  { label: 'C-Suite', align: 'right' },
  { label: 'Product', align: 'right' },
  { label: 'Partnership', align: 'right' },
  { label: 'Last Activity', align: 'right' },
  { label: 'Actions', align: 'right' },
]

function typeColor(label: string): string {
  let hash = 0
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash * 31 + label.charCodeAt(i)) % 997
  }
  return TYPE_PALETTE[hash % TYPE_PALETTE.length] ?? '#6D717F'
}

function weekStartOf(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function companyNameOf(s: StoredSignal): string {
  const primary = (s.company_name ?? '').trim()
  if (primary !== '') return primary
  const secondary = (s.company ?? '').trim()
  return secondary !== '' ? secondary : '\u2014'
}

function industryOf(c: StoredCompany): string {
  const v = (c.industry ?? '').trim()
  return v !== '' ? v : '\u2014'
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
        <span className="font-medium text-[#2C2D33]">{companyNameOf(e.s)}</span>
        <TypeBadge label={e.displayType} />
        <SeverityBadge severity={e.severity} />
        <span className="ml-auto text-xs text-[#8A8D99]">{formatDate(e.dateIso)}</span>
      </div>
      {(e.s.summary ?? '') !== '' && (
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

function NoData() {
  return <p className="mt-16 mb-16 text-center text-sm text-[#8A8D99]">No data yet</p>
}

interface DeletePayload {
  error?: string
  detail?: string
}

export default function StoredSignalsDashboard({ result, onRefresh }: StoredSignalsDashboardProps) {
  const email = useArenaEmailId()
  const [tab, setTab] = useState<TabKey>('overview')
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const companies = useMemo<StoredCompany[]>(() => result.companies ?? [], [result])

  const companyByName = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    for (const c of companies) {
      const name = (c.company_name ?? '').trim().toLowerCase()
      if (name !== '') map.set(name, c)
    }
    return map
  }, [companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    return result.signals
      .filter((s) => (s.signal_type ?? '').toUpperCase() !== NO_SIGNIFICANT_SIGNAL)
      .map((s) => {
        const dateIso = storedSignalDate(s)
        const d = new Date(dateIso)
        const company = companyByName.get(companyNameOf(s).toLowerCase())
        return {
          s,
          severity: normalizeStoredSeverity(s),
          displayType: storedDisplayType(s),
          dateIso,
          timestamp: Number.isNaN(d.getTime()) ? 0 : d.getTime(),
          industry: company ? industryOf(company) : '\u2014',
          links: getStoredSourceLinks(s),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [result.signals, companyByName])

  const severityCounts = useMemo(() => {
    const counts: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const e of enriched) counts[e.severity] += 1
    return counts
  }, [enriched])

  const familyCounts = useMemo(() => {
    const counts: Record<Family, number> = { funding: 0, csuite: 0, product: 0, partnership: 0 }
    for (const e of enriched) {
      const fam = (e.s.signal_family ?? '').toLowerCase()
      if (fam === 'funding' || fam === 'csuite' || fam === 'product' || fam === 'partnership') {
        counts[fam] += 1
      }
    }
    return counts
  }, [enriched])

  const typeData = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enriched) map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1)
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count, color: typeColor(type) }))
      .sort((a, b) => b.count - a.count)
  }, [enriched])

  const typeTotal = useMemo(() => typeData.reduce((acc, t) => acc + t.count, 0), [typeData])

  const topTypes = useMemo(() => typeData.slice(0, 8), [typeData])

  const weeklyData = useMemo<WeekBucket[]>(() => {
    const currentWeek = weekStartOf(new Date())
    const buckets: WeekBucket[] = []
    const index = new Map<number, number>()
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(currentWeek)
      start.setDate(start.getDate() - i * 7)
      const key = start.getTime()
      index.set(key, buckets.length)
      buckets.push({
        key,
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: 0,
      })
    }
    for (const e of enriched) {
      if (e.timestamp === 0) continue
      const pos = index.get(weekStartOf(new Date(e.timestamp)).getTime())
      if (pos !== undefined) {
        const bucket = buckets[pos]
        if (bucket) bucket.count += 1
      }
    }
    return buckets
  }, [enriched])

  const famData = useMemo(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        name: FAMILY_META[f].label,
        value: familyCounts[f],
        color: FAMILY_META[f].color,
      })),
    [familyCounts]
  )

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const byCompany = new Map<string, EnrichedSignal[]>()
    for (const e of enriched) {
      const name = companyNameOf(e.s)
      const list = byCompany.get(name)
      if (list) list.push(e)
      else byCompany.set(name, [e])
    }
    return companies
      .map((c, i) => {
        const name = (c.company_name ?? '').trim()
        const signals = byCompany.get(name) ?? []
        const key =
          (c.company_key ?? '').trim() !== ''
            ? c.company_key
            : (c.company_id ?? '').trim() !== ''
              ? c.company_id
              : `${name}-${i}`
        return { key, company: c, signals, latest: signals[0] ?? null }
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [companies, enriched])

  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return companyRows
    return companyRows.filter((r) => {
      const name = (r.company.company_name ?? '').toLowerCase()
      return name.includes(q) || industryOf(r.company).toLowerCase().includes(q)
    })
  }, [companyRows, search])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enriched.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (familyFilter !== 'all' && (e.s.signal_family ?? '').toLowerCase() !== familyFilter) return false
      if (q !== '') {
        const hay = `${companyNameOf(e.s)} ${e.displayType} ${e.s.summary ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [enriched, severityFilter, familyFilter, search])

  const insights = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])

  const topCompaniesData = useMemo(
    () =>
      companyRows
        .filter((r) => r.signals.length > 0)
        .slice(0, 10)
        .map((r) => ({
          company: (r.company.company_name ?? '').trim() !== '' ? (r.company.company_name ?? '').trim() : '\u2014',
          count: r.signals.length,
        })),
    [companyRows]
  )

  const totalCompanies = result.total_companies ?? companies.length
  const totalSignals = enriched.length

  const kpiPills: KpiPill[] = [
    { label: 'H', value: severityCounts.HIGH, color: SEVERITY_COLORS.HIGH },
    { label: 'M', value: severityCounts.MEDIUM, color: SEVERITY_COLORS.MEDIUM },
    { label: 'L', value: severityCounts.LOW, color: SEVERITY_COLORS.LOW },
  ]

  const weeklySpark = weeklyData.map((w) => w.count)

  const cards: StoredCardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies Tracked', value: totalCompanies, accent: '#00A7D6', spark: weeklySpark, target: 'companies' },
    { icon: '\u{1F4E1}', label: 'Total Signals', value: totalSignals, accent: '#1A73E8', spark: weeklySpark, pills: kpiPills, target: 'signals' },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: [severityCounts.HIGH], target: 'insights' },
    { icon: '\u{1F4B0}', label: 'Funding', value: familyCounts.funding, accent: FAMILY_META.funding.color, spark: [familyCounts.funding], target: 'signals' },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: familyCounts.csuite, accent: FAMILY_META.csuite.color, spark: [familyCounts.csuite], target: 'signals' },
    { icon: '\u{1F680}', label: 'Product Launches', value: familyCounts.product, accent: FAMILY_META.product.color, spark: [familyCounts.product], target: 'signals' },
    { icon: '\u{1F517}', label: 'Partnerships', value: familyCounts.partnership, accent: FAMILY_META.partnership.color, spark: [familyCounts.partnership], target: 'signals' },
    { icon: '\u{1F4CA}', label: 'Signal Types', value: typeData.length, accent: '#B364D7', spark: typeData.map((t) => t.count), target: 'trends' },
  ]

  const famCountOf = (row: CompanyRowData, fam: Family): number =>
    row.signals.filter((e) => (e.s.signal_family ?? '').toLowerCase() === fam).length

  const toggleCompany = (key: string) => {
    setExpandedCompany((prev) => (prev === key ? null : key))
  }

  const handleDelete = async (row: CompanyRowData): Promise<void> => {
    if (deletingKey !== null) return
    const name = (row.company.company_name ?? '').trim()
    const confirmed = window.confirm(`Delete ${name !== '' ? name : 'this company'} and all of its signals? This cannot be undone.`)
    if (!confirmed) return
    setDeletingKey(row.key)
    setDeleteError(null)
    try {
      const res = await fetch('/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company: name,
          companyId: row.company.company_id,
          confirm: true,
        }),
      })
      if (!res.ok) {
        let message = `Delete failed with status ${res.status}`
        try {
          const json = (await res.json()) as DeletePayload
          if (json.error) message = json.detail ? `${json.error}: ${json.detail}` : json.error
        } catch {
          // keep default message
        }
        setDeleteError(message)
        return
      }
      if (onRefresh) await onRefresh()
    } catch {
      setDeleteError('Could not reach the delete API. Please try again.')
    } finally {
      setDeletingKey(null)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setSeverityFilter('all')
    setFamilyFilter('all')
  }

  return (
    <div className="bg-[#F7F8F9]">
      <TabBar active={tab} onChange={setTab} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {deleteError !== null && (
          <div role="alert" className="rounded-xl border border-[#F31A1A]/40 bg-[#F31A1A]/5 px-4 py-3 text-sm text-[#B00020]">
            {deleteError}
          </div>
        )}

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
                  onClick={() => setTab(c.target)}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className={cardCls} aria-label="Signals by family chart">
                <h2 className={cardTitleCls}>Signals by Family</h2>
                {enriched.length === 0 ? (
                  <NoData />
                ) : (
                  <>
                    <div className="mt-2 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={famData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                            {famData.map((d) => (
                              <Cell key={d.name} fill={d.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-4">
                      {famData.map((d) => (
                        <li key={d.name} className="flex items-center gap-2 text-xs text-[#575A66]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                          {d.name} {'\u00b7'} <span className="font-medium text-[#2C2D33]">{d.value}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
              <section className={cardCls} aria-label="Top signal types chart">
                <h2 className={cardTitleCls}>Top Signal Types</h2>
                {topTypes.length === 0 ? (
                  <NoData />
                ) : (
                  <div className="mt-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topTypes} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                        <XAxis type="number" allowDecimals={false} stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 12 }} />
                        <YAxis type="category" dataKey="type" width={140} stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F0F1F3' }} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                          {topTypes.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>
            <section className={cardCls} aria-label="Recent signals">
              <h2 className={cardTitleCls}>Recent Signals</h2>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-3 space-y-3">
                  {enriched.slice(0, 8).map((e, i) => (
                    <SignalRow key={`${e.s.id}-${i}`} e={e} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'companies' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                aria-label="Search companies"
                placeholder="Search companies or industries"
                className={inputCls}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="ml-auto text-xs text-[#8A8D99]">
                {formatNumber(filteredCompanies.length)} of {formatNumber(companyRows.length)} companies
              </span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr>
                      {COMPANY_COLUMNS.map((col) => (
                        <th
                          key={col.label}
                          className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99] ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan={COMPANY_COLUMNS.length} className="px-4 py-12 text-center text-sm text-[#8A8D99]">
                          No companies match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((row) => {
                        const name = (row.company.company_name ?? '').trim() !== '' ? (row.company.company_name ?? '').trim() : '\u2014'
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
                                  {name}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#575A66]">{industryOf(row.company)}</td>
                              <td className="px-4 py-3 text-right font-medium text-[#2C2D33]">{row.signals.length}</td>
                              <td className="px-4 py-3 text-right text-[#575A66]">{famCountOf(row, 'funding')}</td>
                              <td className="px-4 py-3 text-right text-[#575A66]">{famCountOf(row, 'csuite')}</td>
                              <td className="px-4 py-3 text-right text-[#575A66]">{famCountOf(row, 'product')}</td>
                              <td className="px-4 py-3 text-right text-[#575A66]">{famCountOf(row, 'partnership')}</td>
                              <td className="px-4 py-3 text-right text-[#8A8D99]">
                                {row.latest ? relativeTime(row.latest.dateIso) : '\u2014'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void handleDelete(row)
                                  }}
                                  disabled={deletingKey !== null}
                                  aria-label={`Delete ${name}`}
                                  className="rounded-lg border border-[#F31A1A]/40 px-3 py-1 text-xs font-medium text-[#F31A1A] transition-colors hover:bg-[#F31A1A]/10 disabled:opacity-50"
                                >
                                  {deletingKey === row.key ? 'Deleting\u2026' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="border-b border-[#F0F1F3] last:border-b-0">
                                <td colSpan={COMPANY_COLUMNS.length} className="bg-[#F7F8F9] px-6 py-4">
                                  {row.signals.length === 0 ? (
                                    <p className="text-xs text-[#8A8D99]">No significant signals stored for this company yet.</p>
                                  ) : (
                                    <div className="space-y-3">
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
            <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <input
                type="text"
                aria-label="Search signals"
                placeholder="Search signals"
                className={inputCls}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filter by family"
                className={inputCls}
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value as 'all' | Family)}
              >
                <option value="all">All families</option>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_META[f].label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by severity"
                className={inputCls}
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as 'all' | NormalizedSeverity)}
              >
                <option value="all">All severities</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-[#E2E3E5] px-3 py-2 text-sm text-[#575A66] transition-colors hover:bg-[#F7F8F9]"
              >
                Clear
              </button>
              <span className="ml-auto text-xs text-[#8A8D99]">
                {filtered.length} of {totalSignals} signal{totalSignals === 1 ? '' : 's'}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">{'\u{1F50D}'}</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals match your filters</p>
                <p className="mt-1 text-xs text-[#8A8D99]">Try clearing the search or filters.</p>
              </div>
            ) : (
              <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                {filtered.map((e, i) => (
                  <SignalRow key={`${e.s.id}-${i}`} e={e} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'trends' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className={cardCls} aria-label="Weekly signal trend chart">
              <h2 className={cardTitleCls}>Weekly Signal Trend (8 Weeks)</h2>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                      <XAxis dataKey="label" stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F0F1F3' }} />
                      <Bar dataKey="count" name="Signals" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <section className={cardCls} aria-label="Signals by category chart">
              <h2 className={cardTitleCls}>Signals by Category</h2>
              {enriched.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={famData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis allowDecimals={false} stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F0F1F3' }} />
                      <Bar dataKey="value" name="Signals" radius={[4, 4, 0, 0]}>
                        {famData.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <section className={cardCls} aria-label="Top companies chart">
              <h2 className={cardTitleCls}>Top 10 Companies by Signal Count</h2>
              {topCompaniesData.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompaniesData} layout="vertical" margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                      <CartesianGrid stroke="#E2E3E5" strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 12 }} />
                      <YAxis type="category" dataKey="company" width={140} stroke="#8A8D99" tick={{ fill: '#575A66', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F0F1F3' }} />
                      <Bar dataKey="count" name="Signals" fill="#00A7D6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
            <section className={cardCls} aria-label="Signal type breakdown">
              <h2 className={cardTitleCls}>Signal Type Breakdown</h2>
              {typeTotal === 0 ? (
                <NoData />
              ) : (
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="h-64 w-full sm:w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Pie data={typeData} dataKey="count" nameKey="type" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="#FFFFFF">
                          {typeData.map((t) => (
                            <Cell key={t.type} fill={t.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="w-full space-y-1.5 sm:w-1/2" aria-label="Signal type legend">
                    {typeData.map((t) => {
                      const pct = ((t.count / typeTotal) * 100).toFixed(1)
                      return (
                        <li key={t.type} className="flex items-center gap-2 text-xs text-[#575A66]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                          <span className="truncate">{t.type}</span>
                          <span className="ml-auto shrink-0 text-[#8A8D99]">
                            {t.count} {'\u00b7'} {pct}%
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'insights' && (
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="rounded-2xl border border-[#E2E3E5] bg-white p-12 text-center">
                <p className="text-3xl" aria-hidden="true">{'\u{1F4A1}'}</p>
                <p className="mt-3 text-sm font-medium text-[#2C2D33]">No high-severity insights yet</p>
                <p className="mt-1 text-xs text-[#8A8D99]">
                  Insights list HIGH-severity signals only. Check the Signals tab for medium and low severity activity.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#8A8D99]">
                  {insights.length} high-severity insight{insights.length === 1 ? '' : 's'}
                </p>
                <div className="space-y-3">
                  {insights.map((e, i) => (
                    <SignalRow key={`${e.s.id}-${i}`} e={e} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
