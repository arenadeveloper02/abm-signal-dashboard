"use client"

import { useMemo, useState } from 'react'
import type { GlobalFilters, Signal } from '@/lib/types'
import { CONFIDENCES, CONFIDENCE_META, FAMILIES, FAMILY_META, filterSignals, formatDate } from '@/lib/utils'
import { ConfidenceBadge, FamilyChip, TypeChip } from '@/components/Badges'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface SignalsTabProps {
  signals: Signal[]
  filters: GlobalFilters
  onFiltersChange: (filters: GlobalFilters) => void
  search: string
  signalTypes: string[]
}

const selectCls =
  'rounded-lg border border-[#2E313A] bg-[#12131A] px-2 py-1.5 text-sm text-[#F2F3F5] focus:border-[#3BC884] focus:outline-none'

const tooltipStyle = {
  backgroundColor: '#22242C',
  border: '1px solid #2E313A',
  borderRadius: 8,
  color: '#F2F3F5',
  fontSize: 12,
}

export default function SignalsTab({ signals, filters, onFiltersChange, search, signalTypes }: SignalsTabProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const filtered = useMemo(() => filterSignals(signals, filters, search), [signals, filters, search])

  const severityData = useMemo(() => {
    const counts = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const s of signals) {
      if (s.confidence === 'HIGH') counts.HIGH += 1
      else if (s.confidence === 'MEDIUM') counts.MEDIUM += 1
      else counts.LOW += 1
    }
    return [
      { name: 'High', value: counts.HIGH, color: CONFIDENCE_META.HIGH.color },
      { name: 'Medium', value: counts.MEDIUM, color: CONFIDENCE_META.MEDIUM.color },
      { name: 'Low', value: counts.LOW, color: CONFIDENCE_META.LOW.color },
    ]
  }, [signals])

  const severityTotal = useMemo(() => severityData.reduce((acc, d) => acc + d.value, 0), [severityData])

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of signals) {
      counts[s.family] = (counts[s.family] ?? 0) + 1
    }
    return FAMILIES.map((f) => ({
      name: `${FAMILY_META[f].label} \u00b7 ${counts[f] ?? 0}`,
      value: counts[f] ?? 0,
      color: FAMILY_META[f].color,
    }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [signals])

  const glance = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    let last7 = 0
    const companies = new Set<string>()
    for (const s of signals) {
      companies.add(s.company)
      const d = new Date(s.date)
      if (!Number.isNaN(d.getTime()) && d.getTime() >= cutoff) last7 += 1
    }
    return { total: signals.length, last7, companies: companies.size }
  }, [signals])

  const clearFilters = () => {
    onFiltersChange({ family: 'all', confidence: 'all', signalType: 'all', dateFrom: '', dateTo: '' })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Severity mix chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">{'\u26A1'} Severity mix</h2>
          {severityTotal === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No data yet.</p>
          ) : (
            <div className="mt-2 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3} stroke="none">
                    {severityData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <ul className="mt-3 flex flex-wrap gap-4">
            {severityData.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-xs text-[#A6ABB8]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                {d.name} {'\u00b7'} <span className="text-white">{d.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signal types chart">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">{'\u{1F4CA}'} Signal types</h2>
          {typeData.length === 0 ? (
            <p className="mt-16 text-center text-sm text-[#6D717F]">No data yet.</p>
          ) : (
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} stroke="#6D717F" tick={{ fill: '#D3D6DE', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {typeData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="At a glance stats">
          <h2 className="text-sm font-semibold text-[#A6ABB8]">{'\u{1F4E1}'} At a glance</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <div className="text-3xl font-semibold text-white">{glance.total.toLocaleString('en-US')}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">total signals</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white">{glance.last7.toLocaleString('en-US')}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">in the last 7 days</div>
            </div>
            <div>
              <div className="text-3xl font-semibold text-white">{glance.companies.toLocaleString('en-US')}</div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">companies with signals</div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
        <select
          aria-label="Filter by family"
          className={selectCls}
          value={filters.family}
          onChange={(e) => onFiltersChange({ ...filters, family: e.target.value as GlobalFilters['family'] })}
        >
          <option value="all">All families</option>
          {FAMILIES.map((f) => (
            <option key={f} value={f}>{FAMILY_META[f].label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by signal type"
          className={selectCls}
          value={filters.signalType}
          onChange={(e) => onFiltersChange({ ...filters, signalType: e.target.value })}
        >
          <option value="all">All types</option>
          {signalTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Filter by confidence"
          className={selectCls}
          value={filters.confidence}
          onChange={(e) => onFiltersChange({ ...filters, confidence: e.target.value as GlobalFilters['confidence'] })}
        >
          <option value="all">All confidence</option>
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Filter from date"
          className={selectCls}
          style={{ colorScheme: 'dark' }}
          value={filters.dateFrom}
          onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
        />
        <input
          type="date"
          aria-label="Filter to date"
          className={selectCls}
          style={{ colorScheme: 'dark' }}
          value={filters.dateTo}
          onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
        />
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-[#2E313A] px-3 py-1.5 text-sm text-[#A6ABB8] transition-colors hover:border-[#F31A1A]/50 hover:text-white"
        >
          Clear
        </button>
        <span className="ml-auto text-xs text-[#8A8F9C]">
          {filtered.length} of {signals.length} signal{signals.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-12 text-center">
          <p className="text-3xl" aria-hidden="true">{'\u{1F50D}'}</p>
          <p className="mt-3 text-sm font-medium text-white">No signals match your filters</p>
          <p className="mt-1 text-xs text-[#8A8F9C]">Try widening the date range or clearing filters.</p>
        </div>
      ) : (
        <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signal list">
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {filtered.map((s, i) => {
              const isExpanded = Boolean(expanded[i])
              const isLong = s.summary.length > 140
              return (
                <article key={`${s.company}-${s.date}-${i}`} className="rounded-2xl border border-[#2E313A] bg-[#22242C] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">{s.company}</span>
                    <FamilyChip family={s.family} />
                    <TypeChip type={s.signal_type} family={s.family} />
                    <ConfidenceBadge confidence={s.confidence} />
                    <span className="ml-auto text-xs text-[#8A8F9C]">{formatDate(s.date)}</span>
                  </div>
                  <p className={`mt-2 text-sm leading-relaxed text-[#D3D6DE] ${isExpanded ? '' : 'line-clamp-2'}`}>{s.summary}</p>
                  <div className="mt-2 flex items-center gap-4">
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                        aria-expanded={isExpanded}
                        className="text-xs font-medium text-[#A6ABB8] hover:text-white"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#3BC884] hover:underline"
                    >
                      {s.source_name} {'\u2197'}
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
