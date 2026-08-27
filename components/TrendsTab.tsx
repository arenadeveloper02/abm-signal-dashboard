"use client"

import { useMemo } from 'react'
import type { Family, Signal } from '@/lib/types'
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

interface TrendsTabProps {
  signals: Signal[]
  onSelectFamily: (family: 'all' | Family) => void
}

const tooltipStyle = {
  backgroundColor: '#22242C',
  border: '1px solid #2E313A',
  borderRadius: 8,
  color: '#F2F3F5',
  fontSize: 12,
}

const PIE_PALETTE = ['#1A73E8', '#FB8145', '#B364D7', '#00A7D6', '#DFC612', '#F8528F', '#3BC884', '#6D717F', '#FF5252', '#9AA0AE']

interface WeekPoint {
  key: number
  label: string
  count: number
}

interface CategoryPoint {
  family: Family
  label: string
  count: number
  color: string
}

interface CompanyPoint {
  company: string
  count: number
}

interface TypePoint {
  type: string
  count: number
  color: string
}

function weekStartOf(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label={title}>
      <h2 className="text-sm font-semibold text-[#A6ABB8]">{title}</h2>
      {children}
    </section>
  )
}

function NoData() {
  return <p className="mt-16 mb-16 text-center text-sm text-[#6D717F]">No data</p>
}

export default function TrendsTab({ signals, onSelectFamily }: TrendsTabProps) {
  const weeklyData = useMemo<WeekPoint[]>(() => {
    const currentWeek = weekStartOf(new Date())
    const buckets: WeekPoint[] = []
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
    for (const s of signals) {
      const d = new Date(s.date)
      if (Number.isNaN(d.getTime())) continue
      const wk = weekStartOf(d).getTime()
      const pos = index.get(wk)
      if (pos !== undefined) {
        const bucket = buckets[pos]
        if (bucket) bucket.count += 1
      }
    }
    return buckets
  }, [signals])

  const categoryData = useMemo<CategoryPoint[]>(
    () =>
      FAMILIES.map((f) => ({
        family: f,
        label: FAMILY_META[f].label,
        count: signals.filter((s) => s.family === f).length,
        color: FAMILY_META[f].color,
      })),
    [signals],
  )

  const companyData = useMemo<CompanyPoint[]>(() => {
    const map = new Map<string, number>()
    for (const s of signals) {
      const name = s.company.trim()
      if (name === '') continue
      map.set(name, (map.get(name) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [signals])

  const typeData = useMemo<TypePoint[]>(() => {
    const map = new Map<string, number>()
    for (const s of signals) {
      const t = s.signal_type.trim() === '' ? 'Unknown' : s.signal_type.trim()
      map.set(t, (map.get(t) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([type, count], i) => ({ type, count, color: PIE_PALETTE[i % PIE_PALETTE.length] ?? '#6D717F' }))
      .sort((a, b) => b.count - a.count)
  }, [signals])

  const typeTotal = typeData.reduce((acc, t) => acc + t.count, 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="Weekly Signal Trend (8 Weeks)">
        {signals.length === 0 ? (
          <NoData />
        ) : (
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#2E313A55' }} />
                <Bar dataKey="count" name="Signals" fill="#3BC884" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Signals by Category">
        {signals.length === 0 ? (
          <NoData />
        ) : (
          <>
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                  <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#2E313A55' }} />
                  <Bar dataKey="count" name="Signals" radius={[4, 4, 0, 0]}>
                    {categoryData.map((c) => (
                      <Cell
                        key={c.family}
                        fill={c.color}
                        cursor="pointer"
                        onClick={() => onSelectFamily(c.family)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-[#6D717F]">Click a bar to filter the signal feed by that category.</p>
          </>
        )}
      </ChartCard>

      <ChartCard title="Top 10 Companies by Signal Count">
        {companyData.length === 0 ? (
          <NoData />
        ) : (
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyData} layout="vertical" margin={{ top: 10, right: 24, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="company"
                  width={140}
                  stroke="#6D717F"
                  tick={{ fill: '#A6ABB8', fontSize: 11 }}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#2E313A55' }} />
                <Bar dataKey="count" name="Signals" fill="#00A7D6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Signal Type Breakdown">
        {typeTotal === 0 ? (
          <NoData />
        ) : (
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-64 w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie
                    data={typeData}
                    dataKey="count"
                    nameKey="type"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    stroke="#1B1D24"
                  >
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
                  <li key={t.type} className="flex items-center gap-2 text-xs text-[#D3D6DE]">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                    <span className="truncate">{t.type}</span>
                    <span className="ml-auto shrink-0 text-[#8A8F9C]">
                      {t.count} \u00b7 {pct}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </ChartCard>
    </div>
  )
}
