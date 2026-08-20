"use client"

import { useState } from 'react'
import type { Family, MonthPoint, Trends } from '@/lib/types'
import { FAMILIES, FAMILY_META } from '@/lib/utils'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface TrendsTabProps {
  trends: Trends
}

const tooltipStyle = {
  backgroundColor: '#22242C',
  border: '1px solid #2E313A',
  borderRadius: 8,
  color: '#F2F3F5',
  fontSize: 12,
}

export default function TrendsTab({ trends }: TrendsTabProps) {
  const [enabled, setEnabled] = useState<Record<Family, boolean>>({
    funding: true,
    csuite: true,
    product: true,
    partnership: true,
  })

  const totalSignals = trends.byMonth.reduce((acc, m) => acc + m.total, 0)
  const familyTotals = FAMILIES.map((f) => ({
    family: f,
    total: trends.byMonth.reduce((acc, m) => acc + m[f], 0),
  }))
  const mostActiveFamily = familyTotals.reduce<{ family: Family; total: number } | null>(
    (best, cur) => (!best || cur.total > best.total ? cur : best),
    null,
  )
  const mostActiveMonth = trends.byMonth.reduce<MonthPoint | null>(
    (best, cur) => (!best || cur.total > best.total ? cur : best),
    null,
  )

  const toggle = (f: Family) => {
    setEnabled((prev) => ({ ...prev, [f]: !prev[f] }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Total Signals</p>
          <p className="mt-1 text-2xl font-semibold text-white">{totalSignals}</p>
        </div>
        <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Most Active Family</p>
          <p
            className="mt-1 text-2xl font-semibold"
            style={{ color: mostActiveFamily ? FAMILY_META[mostActiveFamily.family].color : '#F2F3F5' }}
          >
            {mostActiveFamily && mostActiveFamily.total > 0 ? FAMILY_META[mostActiveFamily.family].label : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Most Active Month</p>
          <p className="mt-1 text-2xl font-semibold text-white">{mostActiveMonth ? mostActiveMonth.month : '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Toggle family series">
        {FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => toggle(f)}
            aria-pressed={enabled[f]}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              enabled[f] ? 'border-[#2E313A] bg-[#1B1D24] text-white' : 'border-[#22242C] bg-transparent text-[#6D717F] opacity-60'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FAMILY_META[f].color }} aria-hidden="true" />
            {FAMILY_META[f].label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Signals by month chart">
        <h2 className="text-sm font-semibold text-[#A6ABB8]">Signals by Month</h2>
        {trends.byMonth.length === 0 ? (
          <p className="mt-16 text-center text-sm text-[#6D717F]">No monthly trend data yet.</p>
        ) : (
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends.byMonth} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                {FAMILIES.filter((f) => enabled[f]).map((f) => (
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
                    dot
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-5" aria-label="Run over run totals chart">
        <h2 className="text-sm font-semibold text-[#A6ABB8]">Run-over-run Totals</h2>
        {trends.byRunDate.length === 0 ? (
          <p className="mt-16 text-center text-sm text-[#6D717F]">No run data yet.</p>
        ) : (
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.byRunDate} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#2E313A" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#6D717F" tick={{ fill: '#A6ABB8', fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#3BC884" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
