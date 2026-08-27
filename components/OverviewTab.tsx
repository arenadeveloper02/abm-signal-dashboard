"use client"

import { useMemo, useState } from 'react'
import KpiCard from '@/components/KpiCard'
import type { Confidence, DashboardData, Family, KpiPill, Signal } from '@/lib/types'
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
  onSelectKpi: (family: 'all' | Family) => void
}

interface CardDef {
  icon: string
  label: string
  value: number
  accent: string
  spark: number[]
  family: 'all' | Family
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
    { icon: '\u{1F3E2}', label: 'Companies with Signals', value: kpis.companiesWithSignals, accent: '#00A7D6', spark: spark('total'), family: 'all' },
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
            onClick={() => onSelectKpi(c.family)}
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
            <p className="mt-16 mb-16 text-center text-sm text-[#6D717F]">No data</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#2E313A55' }} />
                  <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((w) => (
                      <Cell
                        key={w.key}
                        fill={feedWeek === null || feedWeek === w.key ? '#3BC884' : '#3BC88444'}
                        cursor="pointer"
                        onClick={() => toggleWeek(w.key)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-[#6D717F]">Click a bar to filter the recent signal feed by that week.</p>
        </section>

        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signal type breakdown chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Signal Type Breakdown (click to filter feed)</h2>
          {typeBreakdownTotal === 0 ? (
            <p className="mt-16 mb-16 text-center text-sm text-[#6D717F]">No data</p>
          ) : (
            <>
              <div className="mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Pie
                      data={typeBreakdownData}
                      dataKey="count"
                      nameKey="type"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      stroke="#1B1D24"
                    >
                      {typeBreakdownData.map((t) => (
                        <Cell
                          key={t.type}
                          fill={feedType === null || feedType === t.type ? t.color : `${t.color}44`}
                          cursor="pointer"
                          onClick={() => toggleType(t.type)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Signal type legend">
                {typeBreakdownData.slice(0, 6).map((t) => (
                  <li key={t.type}>
                    <button
                      type="button"
                      onClick={() => toggleType(t.type)}
                      className="flex items-center gap-1.5 text-xs text-[#A6ABB8] transition-colors hover:text-white"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                      <span className="max-w-[140px] truncate">{t.type}</span>
                      <span className="text-[#6D717F]">{t.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Top industries chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Top Industries by Signal Count (click to filter table)</h2>
          {industryData.length === 0 ? (
            <p className="mt-16 mb-16 text-center text-sm text-[#6D717F]">No data</p>
          ) : (
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={industryData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 8 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="industry" width={130} stroke="#6D717F" tick={{ fill: '#D3D6DE', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="count" name="Signals" radius={[0, 6, 6, 0]} barSize={16}>
                    {industryData.map((d) => (
                      <Cell
                        key={d.industry}
                        fill={feedIndustry === null || feedIndustry === d.industry ? '#00A7D6' : '#00A7D644'}
                        cursor="pointer"
                        onClick={() => toggleIndustry(d.industry)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-[#6D717F]">Click a bar to filter the list by that industry.</p>
        </section>
      </div>

      <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Recent signals">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">Recent Signals</h2>
          {hasFeedFilter && (
            <>
              <span className="text-xs text-[#8A8F9C]">
                Filtered by{feedWeek !== null ? ` week of ${selectedWeekLabel}` : ''}
                {feedType !== null ? ` \u00b7 ${feedType}` : ''}
                {feedIndustry !== null ? ` \u00b7 ${feedIndustry}` : ''}
              </span>
              <button
                type="button"
                onClick={clearFeedFilters}
                className="rounded-full border border-[#2E313A] px-2.5 py-0.5 text-[11px] font-medium text-[#A6ABB8] transition-colors hover:border-[#F31A1A]/50 hover:text-white"
              >
                Clear filters
              </button>
            </>
          )}
          <span className="ml-auto text-xs text-[#6D717F]">
            {recentSignals.length} of {data.signals.length} signal{data.signals.length === 1 ? '' : 's'}
          </span>
        </div>
        {recentSignals.length === 0 ? (
          <p className="mt-16 mb-16 text-center text-sm text-[#6D717F]">
            {data.signals.length === 0 ? 'No signals yet.' : 'No signals match the selected chart filters.'}
          </p>
        ) : (
          <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {recentSignals.map((s, i) => {
              const sev = severityOf(s.confidence)
              const sevColor = SEVERITY_COLORS[sev]
              const { headline, description } = splitHeadline(s.summary)
              const industry = inferIndustry(s)
              const d = new Date(s.date)
              const dateLabel = Number.isNaN(d.getTime())
                ? s.date
                : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              const hasUrl = s.source_url.trim() !== ''
              const sourceName = s.source_name.trim()
              return (
                <li
                  key={`${s.company}-${s.signal_type}-${s.date}-${i}`}
                  className="rounded-xl border border-[#2E313A] border-l-4 bg-[#22242C] p-3"
                  style={{ borderLeftColor: sevColor }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide"
                      style={{ color: sevColor, borderColor: `${sevColor}55`, backgroundColor: `${sevColor}14` }}
                    >
                      {sev}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        color: FAMILY_META[s.family].color,
                        borderColor: `${FAMILY_META[s.family].color}55`,
                        backgroundColor: `${FAMILY_META[s.family].color}14`,
                      }}
                    >
                      {CATEGORY_LABEL[s.family]}
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-[#6D717F]">{dateLabel}</span>
                  </div>
                  <div className="mt-1.5">
                    {hasUrl ? (
                      <a
                        href={s.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-bold text-[#76ABF1] hover:underline"
                      >
                        {s.company}
                      </a>
                    ) : (
                      <span className="text-sm font-bold text-[#76ABF1]">{s.company}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-white">{headline}</p>
                  {description !== '' && (
                    <p className="mt-0.5 text-xs leading-relaxed text-[#8C919E] line-clamp-2">{description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[#2E313A] bg-[#1B1D24] px-2 py-0.5 text-[10px] font-medium text-[#D3D6DE]">
                      {industry}
                    </span>
                    {sourceName !== '' &&
                      (hasUrl ? (
                        <a
                          href={s.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-[#76ABF1] hover:underline"
                        >
                          {sourceName}
                        </a>
                      ) : (
                        <span className="text-xs text-[#8A8F9C]">{sourceName}</span>
                      ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
