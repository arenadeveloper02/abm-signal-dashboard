"use client"

import { Fragment, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  Family,
  KpiPill,
  NormalizedSeverity,
  SourceLink,
  StoredCompany,
  StoredDashboardTotals,
  StoredSignal,
  StoredSignalsResult,
  TabKey,
} from '@/lib/types'
import TabBar from '@/components/TabBar'
import { NO_SIGNIFICANT_SIGNAL, formatDate, relativeTime } from '@/lib/utils'
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

interface StoredCardDef {
  icon: string
  label: string
  value: number | null
  accent: string
  spark: number[]
  pills?: KpiPill[]
}

interface WeekBucket {
  key: string
  label: string
  count: number
}

interface TypeCount {
  type: string
  count: number
  color: string
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

const OVERVIEW_SEVERITY_COLORS: Record<NormalizedSeverity, string> = {
  HIGH: '#F31A1A',
  MEDIUM: '#FB8145',
  LOW: '#3BC884',
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

function weekLabel(wk: string): string {
  const d = new Date(wk)
  if (Number.isNaN(d.getTime())) return wk
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  return v !== '' ? v : '\u2014'
}

function companyNameOf(s: StoredSignal): string {
  const primary = (s.company_name ?? '').trim()
  if (primary !== '') return primary
  const secondary = (s.company ?? '').trim()
  return secondary !== '' ? secondary : '\u2014'
}

function familyOf(e: EnrichedSignal): string {
  return (e.s.signal_family ?? '').toLowerCase()
}

function splitHeadline(summary: string): { headline: string; description: string } {
  const text = summary.trim()
  const idx = text.indexOf('. ')
  if (idx > 10 && idx < 140) {
    return { headline: text.slice(0, idx + 1), description: text.slice(idx + 2) }
  }
  return { headline: text, description: '' }
}

function SeverityBadge({ severity }: { severity: NormalizedSeverity }) {
  const color = SEVERITY_COLORS[severity]
  return (
    <span
      className='inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide'
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      {severity}
    </span>
  )
}

function TypeBadge({ label }: { label: string }) {
  const color = typeColor(label)
  return (
    <span className='inline-flex items-center gap-1.5 rounded-full border border-[#E2E3E5] bg-[#F7F8F9] px-2 py-0.5 text-[11px] font-medium text-[#575A66]'>
      <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: color }} aria-hidden='true' />
      {label}
    </span>
  )
}

function SignalRow({ e }: { e: EnrichedSignal }) {
  return (
    <article className='rounded-2xl border border-[#E2E3E5] bg-white p-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-medium text-[#2C2D33]'>{companyNameOf(e.s)}</span>
        <TypeBadge label={e.displayType} />
        <SeverityBadge severity={e.severity} />
        <span className='ml-auto text-xs text-[#8A8D99]'>{formatDate(e.dateIso)}</span>
      </div>
      {e.s.summary !== '' && (
        <p className='mt-2 text-sm leading-relaxed text-[#575A66]'>{e.s.summary}</p>
      )}
      {e.links.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-3'>
          {e.links.map((l, i) => (
            <a
              key={`${l.url}-${i}`}
              href={l.url}
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-xs font-medium text-[#1A73E8] hover:underline'
            >
              {l.name} {'\u2197'}
            </a>
          ))}
        </div>
      )}
    </article>
  )
}

function OverviewSignalRow({ e, company }: { e: EnrichedSignal; company: StoredCompany | undefined }) {
  const color = OVERVIEW_SEVERITY_COLORS[e.severity]
  const { headline, description } = splitHeadline(e.s.summary ?? '')
  const website = (company?.website ?? '').trim()
  const location = (company?.hq ?? '').trim()
  const source = e.links[0]
  const d = new Date(e.dateIso)
  const dateLabel = Number.isNaN(d.getTime())
    ? '\u2014'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <article className='rounded-xl border border-[#E2E3E5] border-l-4 bg-white p-4' style={{ borderLeftColor: color }}>
      <div className='flex flex-wrap items-center gap-2'>
        <span
          className='inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white'
          style={{ backgroundColor: color }}
        >
          {e.severity}
        </span>
        <TypeBadge label={e.displayType} />
        <span className='ml-auto text-xs text-[#8A8D99]'>{dateLabel}</span>
      </div>
      <div className='mt-2'>
        {website !== '' ? (
          <a
            href={website.startsWith('http') ? website : `https://${website}`}
            target='_blank'
            rel='noopener noreferrer'
            className='text-sm font-bold text-[#1A73E8] hover:underline'
          >
            {companyNameOf(e.s)}
          </a>
        ) : (
          <span className='text-sm font-bold text-[#1A73E8]'>{companyNameOf(e.s)}</span>
        )}
      </div>
      {headline !== '' && <p className='mt-1 text-sm font-semibold text-[#2C2D33]'>{headline}</p>}
      {description !== '' && <p className='mt-1 text-sm leading-relaxed text-[#575A66] line-clamp-2'>{description}</p>}
      <div className='mt-2 flex flex-wrap items-center gap-2 text-xs'>
        {e.industry !== '\u2014' && (
          <span className='inline-flex items-center rounded-full bg-[#F3F8FE] px-2 py-0.5 font-medium text-[#155CBA]'>
            {e.industry}
          </span>
        )}
        {location !== '' && <span className='text-[#8A8D99]'>{location}</span>}
        {source && (
          <a href={source.url} target='_blank' rel='noopener noreferrer' className='font-medium text-[#1A73E8] hover:underline'>
            {source.name}
          </a>
        )}
      </div>
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
  'rounded-lg border border-[#E2E3E5] bg-white px-2 py-1.5 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none'

function CompanyInfoSection({ company }: { company: StoredCompany }) {
  const website = (company.website ?? '').trim()
  const linkedin = (company.linkedin_url ?? '').trim()
  const domain = (company.domain ?? '').trim()
  const description = (company.short_description ?? '').trim()
  const locationParts = [company.city, company.state, company.country]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p !== '')
  const location =
    locationParts.length > 0
      ? locationParts.join(', ')
      : (company.hq ?? '').trim() !== ''
        ? (company.hq ?? '').trim()
        : ''

  const facts: { label: string; value: string; href?: string }[] = [
    {
      label: 'Website',
      value: website !== '' ? website : '\u2014',
      href: website !== '' ? (website.startsWith('http') ? website : `https://${website}`) : undefined,
    },
    { label: 'Domain', value: domain !== '' ? domain : '\u2014' },
    { label: 'Industry', value: industryOf(company) },
    { label: 'HQ / Location', value: location !== '' ? location : '\u2014' },
    { label: 'Employees', value: extraField(company, ['employees', 'employee_count']) },
    { label: 'Founded', value: extraField(company, ['founded_year', 'foundedYear']) },
    {
      label: 'LinkedIn',
      value: linkedin !== '' ? linkedin : '\u2014',
      href: linkedin !== '' ? linkedin : undefined,
    },
    { label: 'Account stage', value: extraField(company, ['account_stage', 'accountStage']) },
    { label: 'Account owner', value: extraField(company, ['account_owner', 'accountOwner']) },
    { label: 'Status', value: extraField(company, ['status']) },
    { label: 'Analyses', value: extraField(company, ['analysis_count', 'analysisCount']) },
    {
      label: 'First seen',
      value:
        (company.first_seen_at ?? '').trim() !== ''
          ? formatDate(company.first_seen_at as string)
          : '\u2014',
    },
    {
      label: 'Last analysed',
      value:
        (company.last_analysed_at ?? '').trim() !== ''
          ? formatDate(company.last_analysed_at as string)
          : '\u2014',
    },
  ]

  return (
    <section
      aria-label={`Company info for ${company.company_name}`}
      className='rounded-xl border border-[#E2E3E5] bg-white p-4'
    >
      <h3 className='text-xs font-semibold uppercase tracking-wide text-[#8A8D99]'>Company info</h3>
      {description !== '' && <p className='mt-2 text-sm leading-relaxed text-[#575A66]'>{description}</p>}
      <dl className='mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3'>
        {facts.map((f) => (
          <div key={f.label} className='flex items-baseline justify-between gap-2 sm:block'>
            <dt className='text-[11px] font-medium uppercase tracking-wide text-[#A7AAB2]'>{f.label}</dt>
            <dd className='truncate text-sm text-[#2C2D33]'>
              {f.href ? (
                <a href={f.href} target='_blank' rel='noopener noreferrer' className='text-[#1A73E8] hover:underline'>
                  {f.value}
                </a>
              ) : (
                f.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const FAMILY_KEYS: Family[] = ['funding', 'csuite', 'product', 'partnership']

const FAMILY_LABELS: Record<Family, string> = {
  funding: 'Funding',
  csuite: 'C-Suite',
  product: 'Product',
  partnership: 'Partnership',
}

const FAMILY_COLORS: Record<Family, string> = {
  funding: '#3BC884',
  csuite: '#B364D7',
  product: '#00A7D6',
  partnership: '#1A73E8',
}

const DISPLAY_TYPE_LABELS: Record<string, string> = {
  csuite_join: 'C-Suite Join',
  csuite_exit: 'C-Suite Exit',
  funding_round: 'Funding Round',
  funding: 'Funding Round',
  acquisition: 'Acquisition / M&A',
  merger_acquisition: 'Acquisition / M&A',
  mergers_acquisitions: 'Acquisition / M&A',
  ipo: 'IPO',
  product_launch: 'Product Launch',
  partnership: 'Partnership',
  news_mention: 'News Mention',
  news: 'News Mention',
  creative_hiring: 'Creative Hiring',
}

function severityOf(confidence: string): NormalizedSeverity {
  const c = (confidence ?? '').trim().toUpperCase()
  if (c === 'HIGH') return 'HIGH'
  if (c === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function displayTypeOf(s: StoredSignal): string {
  const raw = (s.signal_type ?? '').trim()
  const key = raw.toLowerCase().replace(/[\s/-]+/g, '_')
  const mapped = DISPLAY_TYPE_LABELS[key]
  if (mapped !== undefined) return mapped
  if (raw === '') return 'Other'
  return raw
    .split(/[\s_]+/)
    .filter((w) => w !== '')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function signalDateOf(s: StoredSignal): string {
  const candidates = [s.announcement_date, s.run_date, s.last_seen_at, s.first_seen_at]
  for (const candidate of candidates) {
    const v = (candidate ?? '').trim()
    if (v !== '') return v
  }
  return ''
}

function linksOf(s: StoredSignal): SourceLink[] {
  const url = (s.source_url ?? '').trim()
  if (url === '') return []
  const name = (s.source_name ?? '').trim()
  return [{ name: name !== '' ? name : 'Source', url }]
}

function CardSpark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values)
  return (
    <div className='flex h-8 items-end gap-1' aria-hidden='true'>
      {values.map((v, i) => (
        <span
          key={i}
          className='w-1.5 rounded-sm'
          style={{ height: `${Math.max(8, Math.round((v / max) * 100))}%`, backgroundColor: `${color}66` }}
        />
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='rounded-2xl border border-[#E2E3E5] bg-white p-4'>
      <h2 className='text-sm font-semibold text-[#2C2D33]'>{title}</h2>
      <div className='mt-3'>{children}</div>
    </section>
  )
}

export default function StoredSignalsDashboard({ result }: StoredSignalsDashboardProps) {
  const [tab, setTab] = useState<TabKey>('overview')
  const [severityFilter, setSeverityFilter] = useState<'all' | NormalizedSeverity>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')
  const [companySearch, setCompanySearch] = useState('')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [weekFilter, setWeekFilter] = useState<string | null>(null)

  const companies = useMemo(() => result.companies ?? [], [result])

  const companyByKey = useMemo(() => {
    const map = new Map<string, StoredCompany>()
    companies.forEach((c) => {
      if (c.company_id !== '') map.set(c.company_id, c)
      if (c.company_key !== '') map.set(c.company_key, c)
      const name = (c.company_name ?? '').trim().toLowerCase()
      if (name !== '') map.set(name, c)
    })
    return map
  }, [companies])

  const enriched = useMemo<EnrichedSignal[]>(() => {
    return result.signals
      .filter((s) => s.signal_type !== NO_SIGNIFICANT_SIGNAL && s.signal_key !== NO_SIGNIFICANT_SIGNAL)
      .map((s) => {
        const company =
          companyByKey.get(s.company_id) ??
          companyByKey.get(s.company_key) ??
          companyByKey.get(companyNameOf(s).toLowerCase())
        const dateIso = signalDateOf(s)
        const d = new Date(dateIso)
        const ts = Number.isNaN(d.getTime()) ? 0 : d.getTime()
        return {
          s,
          severity: severityOf(s.confidence),
          displayType: displayTypeOf(s),
          dateIso,
          timestamp: ts,
          weekKey: ts === 0 ? '' : weekKeyOf(d),
          industry: company ? industryOf(company) : '\u2014',
          links: linksOf(s),
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }, [result, companyByKey])

  const signalTypes = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.displayType))).sort(),
    [enriched]
  )

  const familyCounts = useMemo<Record<Family, number>>(() => {
    const counts: Record<Family, number> = { funding: 0, csuite: 0, product: 0, partnership: 0 }
    enriched.forEach((e) => {
      const f = familyOf(e)
      if (f === 'funding' || f === 'csuite' || f === 'product' || f === 'partnership') counts[f] += 1
    })
    return counts
  }, [enriched])

  const weekBuckets = useMemo<WeekBucket[]>(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => {
      if (e.weekKey === '') return
      map.set(e.weekKey, (map.get(e.weekKey) ?? 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([key, count]) => ({ key, label: weekLabel(key), count }))
  }, [enriched])

  const typeCounts = useMemo<TypeCount[]>(() => {
    const map = new Map<string, number>()
    enriched.forEach((e) => map.set(e.displayType, (map.get(e.displayType) ?? 0) + 1))
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, color: typeColor(type) }))
  }, [enriched])

  const companyRows = useMemo<CompanyRowData[]>(() => {
    const byCompany = new Map<string, EnrichedSignal[]>()
    enriched.forEach((e) => {
      const key = companyNameOf(e.s).toLowerCase()
      const list = byCompany.get(key)
      if (list) list.push(e)
      else byCompany.set(key, [e])
    })
    return companies
      .map((company) => {
        const nameKey = (company.company_name ?? '').trim().toLowerCase()
        const signals = byCompany.get(nameKey) ?? []
        return {
          key: company.company_id !== '' ? company.company_id : nameKey,
          company,
          signals,
          latest: signals.length > 0 ? signals[0] ?? null : null,
          techStack: extraList(company, ['tech_stack', 'technologies', 'techStack']),
          keywords: extraList(company, ['keywords', 'tags']),
        }
      })
      .filter((row) => {
        const q = companySearch.trim().toLowerCase()
        if (q === '') return true
        return (
          row.company.company_name.toLowerCase().includes(q) ||
          industryOf(row.company).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.signals.length - a.signals.length)
  }, [companies, enriched, companySearch])

  const overviewSignals = useMemo(() => {
    const rank: Record<NormalizedSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 }
    return [...enriched]
      .sort((a, b) => rank[a.severity] - rank[b.severity] || b.timestamp - a.timestamp)
      .slice(0, 6)
  }, [enriched])

  const highSignals = useMemo(() => enriched.filter((e) => e.severity === 'HIGH'), [enriched])

  const filteredSignals = useMemo(() => {
    return enriched.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false
      if (typeFilter !== 'all' && e.displayType !== typeFilter) return false
      if (familyFilter !== 'all' && familyOf(e) !== familyFilter) return false
      if (weekFilter !== null && e.weekKey !== weekFilter) return false
      return true
    })
  }, [enriched, severityFilter, typeFilter, familyFilter, weekFilter])

  const dash: StoredDashboardTotals = result.dashboard ?? {}
  const totalCompanies = dash.companies_tracked ?? dash.total_companies ?? dash.companies_total ?? companies.length
  const totalSignals = dash.total_signals ?? enriched.length
  const highAlerts = dash.high_alerts ?? highSignals.length

  const spark = weekBuckets.slice(-8).map((b) => b.count)

  const severityPills: KpiPill[] = SEVERITIES.map((sev) => ({
    label: sev,
    value: enriched.filter((e) => e.severity === sev).length,
    color: OVERVIEW_SEVERITY_COLORS[sev],
  }))

  const cards: StoredCardDef[] = [
    { icon: '\uD83C\uDFE2', label: 'Companies Tracked', value: totalCompanies, accent: '#1A73E8', spark },
    { icon: '\uD83D\uDCE1', label: 'Total Signals', value: totalSignals, accent: '#3BC884', spark, pills: severityPills },
    { icon: '\uD83D\uDEA8', label: 'High Alerts', value: highAlerts, accent: '#F31A1A', spark },
    { icon: '\uD83D\uDCB0', label: 'Funding', value: dash.funding ?? result.counts_by_family.funding, accent: '#3BC884', spark },
    { icon: '\uD83D\uDC54', label: 'C-Suite Changes', value: dash.csuite_changes ?? result.counts_by_family.csuite, accent: '#B364D7', spark },
    { icon: '\uD83D\uDE80', label: 'Product Launches', value: dash.product_launches ?? result.counts_by_family.product, accent: '#00A7D6', spark },
    { icon: '\uD83E\uDD1D', label: 'Partnerships', value: dash.partnerships ?? result.counts_by_family.partnership, accent: '#1A73E8', spark },
  ]

  const handleCardClick = (label: string) => {
    const mapped = CARD_TYPE_FILTER[label]
    if (mapped) {
      setTypeFilter(mapped)
      setTab('signals')
      return
    }
    if (label === 'High Alerts') {
      setSeverityFilter('HIGH')
      setTab('signals')
      return
    }
    if (label === 'Companies Tracked') {
      setTab('companies')
      return
    }
    setTab('signals')
  }

  const handleWeekChartClick = (state: unknown) => {
    const label = activeLabelOf(state)
    if (!label) return
    const bucket = weekBuckets.find((b) => b.label === label)
    if (!bucket) return
    setWeekFilter(bucket.key)
    setTab('signals')
  }

  const weeklyChart = (height: number) => (
    <ResponsiveContainer width='100%' height={height}>
      <BarChart data={weekBuckets} onClick={handleWeekChartClick}>
        <CartesianGrid stroke='#E2E3E5' strokeDasharray='3 3' vertical={false} />
        <XAxis dataKey='label' stroke='#8A8D99' fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E3E5' }} />
        <YAxis stroke='#8A8D99' fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E3E5' }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#F3F8FE' }} />
        <Bar dataKey='count' name='Signals' radius={[4, 4, 0, 0]}>
          {weekBuckets.map((b) => (
            <Cell key={b.key} fill={weekFilter === b.key ? '#155CBA' : '#1A73E8'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <div className='overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white shadow-sm'>
      <TabBar active={tab} onChange={setTab} />
      <div className='space-y-4 bg-[#F7F8F9] p-4' role='tabpanel' aria-label={`${tab} panel`}>
        {tab === 'overview' && (
          <div className='space-y-4'>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              {cards.map((card) => (
                <button
                  key={card.label}
                  type='button'
                  onClick={() => handleCardClick(card.label)}
                  className='rounded-2xl border border-[#E2E3E5] bg-white p-4 text-left transition-shadow hover:shadow-md'
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-lg' aria-hidden='true'>{card.icon}</span>
                    <CardSpark values={card.spark} color={card.accent} />
                  </div>
                  <p className='mt-2 text-2xl font-semibold' style={{ color: card.accent }}>
                    {card.value === null ? '\u2014' : card.value.toLocaleString('en-US')}
                  </p>
                  <p className='mt-0.5 text-xs font-medium text-[#8A8D99]'>{card.label}</p>
                  {card.pills && card.pills.length > 0 && (
                    <div className='mt-2 flex flex-wrap gap-1.5'>
                      {card.pills.map((pill) => (
                        <span
                          key={pill.label}
                          className='inline-flex items-center gap-1 rounded-full border border-[#E2E3E5] px-1.5 py-0.5 text-[10px] font-medium text-[#575A66]'
                        >
                          <span className='h-1.5 w-1.5 rounded-full' style={{ backgroundColor: pill.color }} aria-hidden='true' />
                          {pill.label} {pill.value}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <Section title='Signals by family'>
              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {FAMILY_KEYS.map((f) => (
                  <button
                    key={f}
                    type='button'
                    onClick={() => {
                      setFamilyFilter(f)
                      setTab('signals')
                    }}
                    className='rounded-xl border border-[#E2E3E5] bg-white p-3 text-left transition-colors hover:bg-[#F7F8F9]'
                  >
                    <p className='text-lg font-semibold' style={{ color: FAMILY_COLORS[f] }}>{familyCounts[f]}</p>
                    <p className='text-xs text-[#8A8D99]'>{FAMILY_LABELS[f]}</p>
                  </button>
                ))}
              </div>
            </Section>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Section title='Signals per week'>{weeklyChart(220)}</Section>
              <Section title='Signals by type'>
                <ResponsiveContainer width='100%' height={180}>
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Pie data={typeCounts} dataKey='count' nameKey='type' innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {typeCounts.map((t) => (
                        <Cell key={t.type} fill={t.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className='mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2'>
                  {typeCounts.map((t) => (
                    <div key={t.type} className='flex items-center gap-2 text-xs text-[#575A66]'>
                      <span className='h-2 w-2 rounded-full' style={{ backgroundColor: t.color }} aria-hidden='true' />
                      <span className='truncate'>{t.type}</span>
                      <span className='ml-auto font-medium text-[#2C2D33]'>{t.count}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
            <Section title='Latest high-priority signals'>
              {overviewSignals.length === 0 ? (
                <p className='p-6 text-center text-sm text-[#8A8D99]'>No signals yet. Import companies to start tracking.</p>
              ) : (
                <div className='space-y-3'>
                  {overviewSignals.map((e) => (
                    <OverviewSignalRow key={e.s.id} e={e} company={companyByKey.get(companyNameOf(e.s).toLowerCase())} />
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
        {tab === 'companies' && (
          <Section title='Companies'>
            <input
              type='search'
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder='Search companies...'
              aria-label='Search companies'
              className={`w-full max-w-xs ${selectCls}`}
            />
            <div className='mt-3 overflow-x-auto'>
              <table className='w-full min-w-[560px] text-left text-sm'>
                <thead>
                  <tr className='text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]'>
                    <th className='px-3 py-2'>Company</th>
                    <th className='px-3 py-2'>Industry</th>
                    <th className='px-3 py-2'>Signals</th>
                    <th className='px-3 py-2'>Latest signal</th>
                  </tr>
                </thead>
                <tbody>
                  {companyRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className='px-3 py-8 text-center text-sm text-[#8A8D99]'>
                        No companies match your search.
                      </td>
                    </tr>
                  ) : (
                    companyRows.map((row) => (
                      <Fragment key={row.key}>
                        <tr
                          onClick={() => setExpandedCompany(expandedCompany === row.key ? null : row.key)}
                          className='cursor-pointer border-t border-[#E2E3E5] hover:bg-[#F7F8F9]'
                        >
                          <td className='px-3 py-2 font-medium text-[#2C2D33]'>{row.company.company_name}</td>
                          <td className='px-3 py-2 text-[#575A66]'>{industryOf(row.company)}</td>
                          <td className='px-3 py-2 text-[#2C2D33]'>{row.signals.length}</td>
                          <td className='px-3 py-2 text-[#8A8D99]'>
                            {row.latest ? formatDate(row.latest.dateIso) : '\u2014'}
                          </td>
                        </tr>
                        {expandedCompany === row.key && (
                          <tr className='border-t border-[#E2E3E5] bg-[#F7F8F9]'>
                            <td colSpan={4} className='p-3'>
                              <div className='space-y-3'>
                                <CompanyInfoSection company={row.company} />
                                {row.techStack.length > 0 && (
                                  <div className='flex flex-wrap gap-1.5'>
                                    {row.techStack.map((t) => (
                                      <span key={t} className='rounded-full bg-[#F3F8FE] px-2 py-0.5 text-[11px] font-medium text-[#155CBA]'>
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {row.keywords.length > 0 && (
                                  <div className='flex flex-wrap gap-1.5'>
                                    {row.keywords.map((k) => (
                                      <span key={k} className='rounded-full border border-[#E2E3E5] bg-white px-2 py-0.5 text-[11px] text-[#575A66]'>
                                        {k}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {row.signals.slice(0, 5).map((e) => (
                                  <SignalRow key={e.s.id} e={e} />
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        )}
        {tab === 'signals' && (
          <Section title='All signals'>
            <div className='flex flex-wrap items-center gap-2'>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as 'all' | NormalizedSeverity)}
                className={selectCls}
                aria-label='Filter by severity'
              >
                <option value='all'>All severities</option>
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className={selectCls}
                aria-label='Filter by signal type'
              >
                <option value='all'>All types</option>
                {signalTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={familyFilter}
                onChange={(e) => setFamilyFilter(e.target.value as 'all' | Family)}
                className={selectCls}
                aria-label='Filter by family'
              >
                <option value='all'>All families</option>
                {FAMILY_KEYS.map((f) => (
                  <option key={f} value={f}>{FAMILY_LABELS[f]}</option>
                ))}
              </select>
              {weekFilter !== null && (
                <button
                  type='button'
                  onClick={() => setWeekFilter(null)}
                  className='rounded-full border border-[#1A73E8]/40 bg-[#F3F8FE] px-2.5 py-1 text-xs font-medium text-[#155CBA] hover:bg-[#E5F0FD]'
                >
                  Week of {weekLabel(weekFilter)} {'\u2715'}
                </button>
              )}
              <span className='ml-auto text-xs text-[#8A8D99]'>
                {filteredSignals.length} signal{filteredSignals.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className='mt-3 space-y-3'>
              {filteredSignals.length === 0 ? (
                <p className='rounded-2xl border border-[#E2E3E5] bg-white p-8 text-center text-sm text-[#8A8D99]'>
                  No signals match the current filters.
                </p>
              ) : (
                filteredSignals.map((e) => <SignalRow key={e.s.id} e={e} />)
              )}
            </div>
          </Section>
        )}
        {tab === 'trends' && (
          <div className='space-y-4'>
            <Section title='Weekly signal volume'>{weeklyChart(280)}</Section>
            <Section title='Signals by family'>
              <div className='space-y-2'>
                {FAMILY_KEYS.map((f) => {
                  const count = familyCounts[f]
                  const max = Math.max(1, ...FAMILY_KEYS.map((k) => familyCounts[k]))
                  return (
                    <div key={f} className='flex items-center gap-3'>
                      <span className='w-28 text-xs text-[#575A66]'>{FAMILY_LABELS[f]}</span>
                      <div className='h-2 flex-1 overflow-hidden rounded-full bg-[#F0F1F3]'>
                        <div
                          className='h-full rounded-full'
                          style={{ width: `${Math.round((count / max) * 100)}%`, backgroundColor: FAMILY_COLORS[f] }}
                        />
                      </div>
                      <span className='w-8 text-right text-xs font-medium text-[#2C2D33]'>{count}</span>
                    </div>
                  )
                })}
              </div>
            </Section>
          </div>
        )}
        {tab === 'insights' && (
          <Section title='High-priority insights'>
            {highSignals.length === 0 ? (
              <p className='p-6 text-center text-sm text-[#8A8D99]'>No high-severity signals yet.</p>
            ) : (
              <div className='space-y-3'>
                {highSignals.map((e) => (
                  <div key={e.s.id}>
                    <SignalRow e={e} />
                    <p className='mt-1 text-right text-[11px] text-[#A7AAB2]'>{relativeTime(e.dateIso)}</p>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  )
}
