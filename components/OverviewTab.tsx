"use client"

import { useMemo, useState } from 'react'
import KpiCard from '@/components/KpiCard'
import type { Confidence, DashboardData, Family, KpiPill, Signal, TabKey } from '@/lib/types'
import { FAMILIES, FAMILY_META } from '@/lib/utils'
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

interface OverviewTabProps {
  data: DashboardData
  onSelectKpi: (family: 'all' | Family, target?: TabKey) => void
}

interface CardDef {
  icon: string
  label: string
  value: number
  accent: string
  spark: number[]
  family: 'all' | Family
  target?: TabKey
  pills?: KpiPill[]
  selected?: boolean
}

const tooltipStyle = {
  backgroundColor: '#22242C',
  border: '1px solid #2E313A',
  borderRadius: 8,
  color: '#F2F3F5',
  fontSize: 12,
}

const PIE_PALETTE = ['#1A73E8', '#FB8145', '#B364D7', '#00A7D6', '#DFC612', '#F8528F', '#3BC884', '#6D717F', '#FF5252', '#9AA0AE']

type Severity = 'HIGH' | 'MEDIUM' | 'LOW'

const SEVERITY_COLORS: Record<Severity, string> = {
  HIGH: '#F31A1A',
  MEDIUM: '#FB8145',
  LOW: '#3BC884',
}

const CATEGORY_LABEL: Record<Family, string> = {
  funding: 'Funding',
  csuite: 'C-Suite Change',
  product: 'Product Launch',
  partnership: 'Partnership',
}

function severityOf(confidence: Confidence): Severity {
  if (confidence === 'HIGH') return 'HIGH'
  if (confidence === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

const INDUSTRY_RULES: { label: string; keywords: string[] }[] = [
  { label: 'Financial Services', keywords: ['bank', 'fintech', 'insur', 'payment', 'lending'] },
  { label: 'Healthcare', keywords: ['health', 'pharma', 'biotech', 'medic', 'clinic', 'therap'] },
  { label: 'Retail & Consumer', keywords: ['retail', 'commerce', 'consumer', 'shopping', 'grocery'] },
  { label: 'Energy', keywords: ['energy', 'solar', 'renewab', 'oil ', 'utility'] },
  { label: 'Media & Entertainment', keywords: ['media', 'entertain', 'streaming', 'gaming', 'studio'] },
  { label: 'Manufacturing', keywords: ['manufactur', 'industrial', 'automotive', 'factory'] },
  { label: 'Technology', keywords: ['software', 'cloud', 'saas', 'platform', 'cyber', ' ai ', 'tech', 'data'] },
]

function inferIndustry(s: Signal): string {
  const text = ` ${s.company} ${s.summary} ${s.signal_type} `.toLowerCase()
  for (const rule of INDUSTRY_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.label
  }
  return 'Technology'
}

function splitHeadline(summary: string): { headline: string; description: string } {
  const text = summary.trim()
  const idx = text.indexOf('. ')
  if (idx > 10 && idx < 140) {
    return { headline: text.slice(0, idx + 1), description: text.slice(idx + 2) }
  }
  return { headline: text, description: '' }
}

function weekStartOf(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

interface WeekBucket {
  key: number
  label: string
  count: number
}

interface TypeSlice {
  type: string
  count: number
  color: string
}

interface IndustryBar {
  industry: string
  count: number
  color: string
}

export default function OverviewTab({ data, onSelectKpi }: OverviewTabProps) {
  const { kpis, byConfidence, byFamily, byType, trends } = data
  const [feedWeek, setFeedWeek] = useState<number | null>(null)
  const [feedType, setFeedType] = useState<string | null>(null)
  const [feedIndustry, setFeedIndustry] = useState<string | null>(null)

  const spark = (key: 'total' | Family): number[] => trends.byMonth.map((m) => m[key])

  const cards: CardDef[] = [
    { icon: '\u{1F3E2}', label: 'Companies with Signals', value: kpis.companiesWithSignals, accent: '#00A7D6', spark: spark('total'), family: 'all', target: 'companies' },
    {
      icon: '\u{1F4E1}',
      label: 'Total Signals',
      value: kpis.totalSignals,
      accent: '#1A73E8',
      spark: spark('total'),
      family: 'all',
      pills: [
        { label: 'H', value: byConfidence.HIGH, color: '#FF5252' },
        { label: 'M', value: byConfidence.MEDIUM, color: '#FB8145' },
        { label: 'L', value: byConfidence.LOW, color: '#9AA0AE' },
      ],
    },
    { icon: '\u{1F6A8}', label: 'High Alerts', value: kpis.highAlerts, accent: '#F31A1A', spark: [kpis.highAlerts], family: 'all' },
    { icon: '\u{1F454}', label: 'C-Suite Changes', value: kpis.csuiteChanges, accent: '#B364D7', spark: spark('csuite'), family: 'csuite' },
    { icon: '\u{1F4B0}', label: 'Funding', value: kpis.funding, accent: '#3BC884', spark: spark('funding'), family: 'funding', selected: true },
    { icon: '\u{1F91D}', label: 'Mergers & Acquisitions', value: kpis.mergersAcquisitions, accent: '#FB8145', spark: [kpis.mergersAcquisitions], family: 'all' },
    { icon: '\u{1F4C8}', label: 'IPO', value: kpis.ipo, accent: '#DFC612', spark: [kpis.ipo], family: 'all' },
    { icon: '\u{1F680}', label: 'Product Launches', value: kpis.productLaunches, accent: '#00A7D6', spark: spark('product'), family: 'product' },
    { icon: '\u{1F517}', label: 'Partnerships', value: kpis.partnerships, accent: '#F8528F', spark: spark('partnership'), family: 'partnership' },
  ]

  const famData = FAMILIES.map((f) => ({ name: FAMILY_META[f].label, value: byFamily[f], color: FAMILY_META[f].color }))
  const famTotal = famData.reduce((acc, d) => acc + d.value, 0)
  const typeData = Object.entries(byType)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

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
    for (const s of data.signals) {
      const d = new Date(s.date)
      if (Number.isNaN(d.getTime())) continue
      const pos = index.get(weekStartOf(d).getTime())
      if (pos !== undefined) {
        const bucket = buckets[pos]
        if (bucket) bucket.count += 1
      }
    }
    return buckets
  }, [data.signals])

  const typeBreakdownData = useMemo<TypeSlice[]>(() => {
    const map = new Map<string, number>()
    for (const s of data.signals) {
      const t = s.signal_type.trim() === '' ? 'Unknown' : s.signal_type.trim()
      map.set(t, (map.get(t) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([type, count], i) => ({ type, count, color: PIE_PALETTE[i % PIE_PALETTE.length] ?? '#6D717F' }))
      .sort((a, b) => b.count - a.count)
  }, [data.signals])

  const typeBreakdownTotal = typeBreakdownData.reduce((acc, t) => acc + t.count, 0)

  const industryData = useMemo<IndustryBar[]>(() => {
    const map = new Map<string, number>()
    for (const s of data.signals) {
      const industry = inferIndustry(s)
      map.set(industry, (map.get(industry) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([industry, count], i) => ({ industry, count, color: PIE_PALETTE[i % PIE_PALETTE.length] ?? '#00A7D6' }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [data.signals])

  const recentSignals = useMemo<Signal[]>(
    () =>
      data.signals.filter((s) => {
        if (feedWeek !== null) {
          const d = new Date(s.date)
          if (Number.isNaN(d.getTime())) return false
          if (weekStartOf(d).getTime() !== feedWeek) return false
        }
        if (feedType !== null) {
          const t = s.signal_type.trim() === '' ? 'Unknown' : s.signal_type.trim()
          if (t !== feedType) return false
        }
        if (feedIndustry !== null && inferIndustry(s) !== feedIndustry) return false
        return true
      }),
    [data.signals, feedWeek, feedType, feedIndustry],
  )

  const hasFeedFilter = feedWeek !== null || feedType !== null || feedIndustry !== null

  const toggleWeek = (key: number) => setFeedWeek((prev) => (prev === key ? null : key))
  const toggleType = (type: string) => setFeedType((prev) => (prev === type ? null : type))
  const toggleIndustry = (industry: string) => setFeedIndustry((prev) => (prev === industry ? null : industry))
  const clearFeedFilters = () => {
    setFeedWeek(null)
    setFeedType(null)
    setFeedIndustry(null)
  }

  const selectedWeekLabel = feedWeek !== null ? (weeklyData.find((w) => w.key === feedWeek)?.label ?? '') : ''

  return (
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
            selected={c.selected}
            onClick={() => onSelectKpi(c.family, c.target)}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signals by family chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Signals by Family</h2>
          {famTotal === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No family data yet.</p>
          ) : (
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
          )}
          <ul className="mt-3 flex flex-wrap gap-4">
            {famData.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-xs text-[#A6ABB8]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                {d.name} {'\u00b7'} <span className="text-white">{d.value}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Top signal types chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Top Signal Types</h2>
          {typeData.length === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No signal types yet.</p>
          ) : (
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={130} stroke="#6D717F" tick={{ fill: '#D3D6DE', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" fill="#1A73E8" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Weekly signal trend chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Weekly Signal Trend (click point to filter feed)</h2>
          {data.signals.length === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No signals yet.</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="#2E313A" vertical={false} />
                  <XAxis dataKey="label" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={28} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={20}>
                    {weeklyData.map((w) => (
                      <Cell key={w.key} cursor="pointer" fill={feedWeek === w.key ? '#3BC884' : '#1A73E8'} onClick={() => toggleWeek(w.key)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signal type breakdown chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Signal Type Breakdown (click slice to filter feed)</h2>
          {typeBreakdownTotal === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No signal types yet.</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeBreakdownData} dataKey="count" nameKey="type" innerRadius={42} outerRadius={75} paddingAngle={2} stroke="none">
                    {typeBreakdownData.map((t) => (
                      <Cell
                        key={t.type}
                        cursor="pointer"
                        fill={t.color}
                        opacity={feedType === null || feedType === t.type ? 1 : 0.35}
                        onClick={() => toggleType(t.type)}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-3 flex flex-wrap gap-3">
            {typeBreakdownData.slice(0, 6).map((t) => (
              <li key={t.type} className="flex items-center gap-1.5 text-[11px] text-[#A6ABB8]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                {t.type}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signals by industry chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Signals by Industry (click bar to filter feed)</h2>
          {industryData.length === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No industry data yet.</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 16, bottom: 5, left: 4 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="industry" width={110} stroke="#6D717F" tick={{ fill: '#D3D6DE', fontSize: 10 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                    {industryData.map((b) => (
                      <Cell
                        key={b.industry}
                        cursor="pointer"
                        fill={b.color}
                        opacity={feedIndustry === null || feedIndustry === b.industry ? 1 : 0.35}
                        onClick={() => toggleIndustry(b.industry)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Recent signals feed">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">
            Recent Signals
            {hasFeedFilter && (
              <span className="ml-2 text-xs font-normal text-[#6D717F]">
                filtered{feedWeek !== null ? ` · week of ${selectedWeekLabel}` : ''}
                {feedType !== null ? ` · ${feedType}` : ''}
                {feedIndustry !== null ? ` · ${feedIndustry}` : ''}
              </span>
            )}
          </h2>
          {hasFeedFilter && (
            <button
              type="button"
              onClick={clearFeedFilters}
              className="rounded-lg border border-[#2E313A] px-3 py-1 text-xs font-medium text-[#A6ABB8] transition-colors hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
        {recentSignals.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#6D717F]">No signals match the current feed filters.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recentSignals.slice(0, 12).map((s, i) => {
              const { headline, description } = splitHeadline(s.summary)
              const severity = severityOf(s.confidence)
              return (
                <li key={`${s.company}-${s.date}-${i}`} className="rounded-xl border border-[#2E313A] bg-[#22242C] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{s.company}</span>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        color: SEVERITY_COLORS[severity],
                        borderColor: `${SEVERITY_COLORS[severity]}55`,
                        backgroundColor: `${SEVERITY_COLORS[severity]}14`,
                      }}
                    >
                      {severity}
                    </span>
                    <span className="rounded-full border border-[#2E313A] px-2 py-0.5 text-[10px] text-[#A6ABB8]">
                      {CATEGORY_LABEL[s.family]}
                    </span>
                    <span className="ml-auto text-xs text-[#6D717F]">{s.date}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#D3D6DE]">{headline}</p>
                  {description !== '' && <p className="mt-1 text-xs text-[#A6ABB8]">{description}</p>}
                  {s.source_url !== '' && (
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs text-[#1A73E8] hover:underline"
                    >
                      {s.source_name === '' ? 'Source' : s.source_name}
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
