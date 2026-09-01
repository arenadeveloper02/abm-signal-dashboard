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

function listFromField(value: string[] | string | undefined): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter((v) => v !== '')
  return value
    .split(/[,;|]/)
    .map((v) => v.trim())
    .filter((v) => v !== '')
}

function externalHref(value: string): string {
  const v = value.trim()
  if (v === '') return ''
  return v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`
}

interface CompanyFact {
  label: string
  value: string
  href?: string
}

function CompanyInfoSection({ company }: { company: StoredCompany }) {
  const facts: CompanyFact[] = []
  const push = (label: string, raw: string | number | null | undefined, link?: boolean) => {
    const v = raw === null || raw === undefined ? '' : String(raw).trim()
    if (v === '') return
    if (link) facts.push({ label, value: v, href: externalHref(v) })
    else facts.push({ label, value: v })
  }

  push('Domain', company.domain)
  push('Industry', company.industry)
  push('Website', company.website, true)
  push('LinkedIn', company.linkedin_url, true)
  push('Employees', company.employees ?? '')

  const locationParts = [company.city ?? '', company.state ?? '', company.country ?? '']
    .map((p) => p.trim())
    .filter((p) => p !== '')
  const location = locationParts.length > 0 ? locationParts.join(', ') : (company.hq ?? '').trim()
  push('Location', location)

  const chips = Array.from(
    new Set([
      ...listFromField(company.tech_stack),
      ...listFromField(company.technologies),
      ...listFromField(company.keywords),
      ...listFromField(company.tags),
    ])
  )

  const description = (company.short_description ?? '').trim()

  return (
    <section className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">Company info</h3>
      {description !== '' ? (
        <p className="mt-2 text-sm leading-relaxed text-[#575A66]">{description}</p>
      ) : (
        <p className="mt-2 text-sm italic text-[#8A8D99]">No company description available yet.</p>
      )}
      {facts.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-[#8A8D99]">{f.label}</dt>
              <dd className="mt-0.5 break-all text-sm text-[#2C2D33]">
                {f.href ? (
                  <a
                    href={f.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1A73E8] hover:underline"
                  >
                    {f.value}
                  </a>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {chips.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A8D99]">Tech &amp; Keywords</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center rounded-full border border-[#E2E3E5] bg-[#F7F8F9] px-2.5 py-0.5 text-[11px] font-medium text-[#575A66]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
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
    { icon: '\u{1F6A8}', label: 'High Alerts', value: severityCounts.HIGH, accent: '#F31A1A', spark: weeklySpark, target: 'insights' },
    { icon: '\u{1F4B0}', label: 'Funding Signals', value: familyCounts.funding, accent: '#3BC884', spark: weeklySpark, target: 'signals' },
  ]

  const rowFamilyCount = (row: CompanyRowData, fam: Family): number =>
    row.signals.filter((e) => (e.s.signal_family ?? '').toLowerCase() === fam).length

  const handleDelete = async (row: CompanyRowData): Promise<void> => {
    const name = (row.company.company_name ?? '').trim()
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete ${name !== '' ? name : 'this company'} and all of its stored signals?`)
    ) {
      return
    }
    setDeletingKey(row.key)
    setDeleteError(null)
    try {
      const res = await fetch('/api/delete-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          company_id: row.company.company_id,
          company_key: row.company.company_key,
          company_name: name,
        }),
      })
      let json: DeletePayload = {}
      try {
        json = (await res.json()) as DeletePayload
      } catch {
        json = {}
      }
      if (!res.ok) {
        setDeleteError(json.error ?? json.detail ?? `Delete failed with status ${res.status}`)
        return
      }
      if (expandedCompany === row.key) setExpandedCompany(null)
      if (onRefresh) await onRefresh()
    } catch {
      setDeleteError('Could not reach the delete API. Please try again.')
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div className="space-y-6">
      <TabBar active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <button
                key={card.label}
                type="button"
                onClick={() => setTab(card.target)}
                className="rounded-2xl border border-[#E2E3E5] bg-white p-5 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl" aria-hidden="true">
                    {card.icon}
                  </span>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: card.accent }} aria-hidden="true" />
                </div>
                <p className="mt-3 text-2xl font-semibold text-[#2C2D33]">{formatNumber(card.value)}</p>
                <p className="mt-1 text-xs font-medium text-[#8A8D99]">{card.label}</p>
                {card.pills && (
                  <div className="mt-2 flex gap-2">
                    {card.pills.map((p) => (
                      <span
                        key={p.label}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: p.color, backgroundColor: `${p.color}14` }}
                      >
                        {p.label} {p.value}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex h-8 items-end gap-1" aria-hidden="true">
                  {card.spark.map((v, i) => {
                    const max = Math.max(...card.spark, 1)
                    return (
                      <span
                        key={`${card.label}-spark-${i}`}
                        className="w-full rounded-t"
                        style={{ height: `${Math.max((v / max) * 100, 6)}%`, backgroundColor: `${card.accent}55` }}
                      />
                    )
                  })}
                </div>
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={cardCls}>
              <h2 className={cardTitleCls}>Signals by Family</h2>
              {totalSignals === 0 ? (
                <NoData />
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={famData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                        {famData.map((d) => (
                          <Cell key={d.family} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {famData.map((d) => (
                  <span key={d.family} className="inline-flex items-center gap-1.5 text-xs text-[#575A66]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                    {d.name} \u00B7 {d.value}
                  </span>
                ))}
              </div>
            </section>

            <section className={cardCls}>
              <h2 className={cardTitleCls}>Weekly Signal Volume</h2>
              {totalSignals === 0 ? (
                <NoData />
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E3E5" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6D717F' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6D717F' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className={cardCls}>
              <h2 className={cardTitleCls}>Top Companies by Signals</h2>
              {topCompaniesData.length === 0 ? (
                <NoData />
              ) : (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCompaniesData} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E3E5" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6D717F' }} />
                      <YAxis type="category" dataKey="company" width={120} tick={{ fontSize: 11, fill: '#6D717F' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="#00A7D6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className={cardCls}>
              <h2 className={cardTitleCls}>Top Signal Types</h2>
              {topTypes.length === 0 ? (
                <NoData />
              ) : (
                <ul className="mt-4 space-y-3">
                  {topTypes.map((t) => (
                    <li key={t.type}>
                      <div className="flex items-center justify-between text-xs text-[#575A66]">
                        <span className="font-medium text-[#2C2D33]">{t.type}</span>
                        <span>{t.count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-[#F7F8F9]">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${typeTotal > 0 ? (t.count / typeTotal) * 100 : 0}%`,
                            backgroundColor: t.color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'companies' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies or industries\u2026"
              aria-label="Search companies"
              className={`${inputCls} w-72`}
            />
            <span className="text-xs text-[#8A8D99]">
              {filteredCompanies.length} of {companyRows.length} companies
            </span>
          </div>
          {deleteError && (
            <div role="alert" className="rounded-xl border border-[#F31A1A]/40 bg-[#FEF2F2] px-4 py-2 text-sm text-[#B91C1C]">
              {deleteError}
            </div>
          )}
          <div className="overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white">
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr>
                    {COMPANY_COLUMNS.map((col) => (
                      <th
                        key={col.label}
                        className={`sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#6D717F] ${
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
                      const expanded = expandedCompany === row.key
                      const rawName = (row.company.company_name ?? '').trim()
                      const name = rawName !== '' ? rawName : '\u2014'
                      return (
                        <Fragment key={row.key}>
                          <tr
                            tabIndex={0}
                            aria-expanded={expanded}
                            onClick={() => setExpandedCompany(expanded ? null : row.key)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setExpandedCompany(expanded ? null : row.key)
                            }}
                            className="cursor-pointer border-b border-[#F0F1F2] transition-colors last:border-b-0 hover:bg-[#F7F8F9] focus:bg-[#F7F8F9] focus:outline-none"
                          >
                            <td className="px-4 py-3 font-medium text-[#2C2D33]">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className={`inline-block text-[10px] text-[#8A8D99] transition-transform duration-200 ${
                                    expanded ? 'rotate-90' : ''
                                  }`}
                                >
                                  {'\u25B6'}
                                </span>
                                {name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#575A66]">{industryOf(row.company)}</td>
                            <td className="px-4 py-3 text-right text-[#2C2D33]">{row.signals.length}</td>
                            <td className="px-4 py-3 text-right text-[#575A66]">{rowFamilyCount(row, 'funding')}</td>
                            <td className="px-4 py-3 text-right text-[#575A66]">{rowFamilyCount(row, 'csuite')}</td>
                            <td className="px-4 py-3 text-right text-[#575A66]">{rowFamilyCount(row, 'product')}</td>
                            <td className="px-4 py-3 text-right text-[#575A66]">{rowFamilyCount(row, 'partnership')}</td>
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
                                disabled={deletingKey === row.key}
                                className="rounded-lg border border-[#F31A1A]/40 px-3 py-1 text-xs font-medium text-[#F31A1A] transition-colors hover:bg-[#FEF2F2] disabled:opacity-60"
                              >
                                {deletingKey === row.key ? 'Deleting\u2026' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-[#F0F1F2] last:border-b-0">
                              <td colSpan={COMPANY_COLUMNS.length} className="bg-[#F7F8F9] px-6 py-5">
                                <CompanyInfoSection company={row.company} />
                                <div className="mt-5">
                                  <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">
                                    Recent Signals
                                  </h3>
                                  {row.signals.length === 0 ? (
                                    <p className="mt-2 text-xs text-[#8A8D99]">
                                      No signals available for this company yet.
                                    </p>
                                  ) : (
                                    <div className="mt-3 space-y-3">
                                      {row.signals.slice(0, 10).map((e, i) => (
                                        <SignalRow key={`${e.s.id}-${i}`} e={e} />
                                      ))}
                                    </div>
                                  )}
                                </div>
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
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search signals\u2026"
              aria-label="Search signals"
              className={`${inputCls} w-72`}
            />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | NormalizedSeverity)}
              aria-label="Filter by severity"
              className={inputCls}
            >
              <option value="all">All severities</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={familyFilter}
              onChange={(e) => setFamilyFilter(e.target.value as 'all' | Family)}
              aria-label="Filter by family"
              className={inputCls}
            >
              <option value="all">All families</option>
              {FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {FAMILY_META[f].label}
                </option>
              ))}
            </select>
            <span className="text-xs text-[#8A8D99]">
              {filtered.length} of {totalSignals} signals
            </span>
          </div>
          {filtered.length === 0 ? (
            <NoData />
          ) : (
            <div className="space-y-3">
              {filtered.map((e, i) => (
                <SignalRow key={`${e.s.id}-${i}`} e={e} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className={`${cardCls} lg:col-span-2`}>
            <h2 className={cardTitleCls}>Weekly Signal Volume (last 8 weeks)</h2>
            {totalSignals === 0 ? (
              <NoData />
            ) : (
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E3E5" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6D717F' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6D717F' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#1A73E8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <section className={cardCls}>
            <h2 className={cardTitleCls}>Family Distribution</h2>
            {totalSignals === 0 ? (
              <NoData />
            ) : (
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={famData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {famData.map((d) => (
                        <Cell key={`trend-${d.family}`} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
          <section className={cardCls}>
            <h2 className={cardTitleCls}>Signal Type Breakdown</h2>
            {topTypes.length === 0 ? (
              <NoData />
            ) : (
              <ul className="mt-4 space-y-3">
                {topTypes.map((t) => (
                  <li key={`trend-${t.type}`}>
                    <div className="flex items-center justify-between text-xs text-[#575A66]">
                      <span className="font-medium text-[#2C2D33]">{t.type}</span>
                      <span>{t.count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-[#F7F8F9]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${typeTotal > 0 ? (t.count / typeTotal) * 100 : 0}%`,
                          backgroundColor: t.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'insights' && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#2C2D33]">
            High priority signals ({insights.length})
          </h2>
          {insights.length === 0 ? (
            <NoData />
          ) : (
            <div className="space-y-3">
              {insights.map((e, i) => (
                <SignalRow key={`insight-${e.s.id}-${i}`} e={e} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
