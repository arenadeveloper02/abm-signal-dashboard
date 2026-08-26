"use client"

import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import type { KpiPill } from '@/lib/types'

interface KpiCardProps {
  icon: string
  label: string
  value: number
  accent: string
  sparkData: number[]
  pills?: KpiPill[]
  selected?: boolean
  onClick: () => void
}

export default function KpiCard({ icon, label, value, accent, sparkData, pills, selected, onClick }: KpiCardProps) {
  const base = sparkData.length >= 2 ? sparkData : [sparkData[0] ?? 0, sparkData[0] ?? 0]
  const points = base.map((v, i) => ({ i, v }))
  const gradId = `kpi-grad-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. Click to filter signals`}
      className="group flex flex-col rounded-2xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3BC884]/60"
      style={{ borderColor: selected ? accent : `${accent}55`, boxShadow: selected ? `0 0 0 1px ${accent}` : undefined }}
    >
      <div className="flex w-full items-start justify-between">
        <span className="text-xl" aria-hidden="true">{icon}</span>
        {selected && (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{ color: accent, borderColor: `${accent}66`, backgroundColor: `${accent}14` }}
          >
            Selected
          </span>
        )}
      </div>
      <div className="mt-2 text-4xl font-semibold text-[#2C2D33]">{value.toLocaleString('en-US')}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8A8D99]">{label}</div>
      {pills && (
        <div className="mt-2 flex gap-1.5">
          {pills.map((p) => (
            <span
              key={p.label}
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{ color: p.color, borderColor: `${p.color}55`, backgroundColor: `${p.color}14` }}
            >
              {p.label} {p.value.toLocaleString('en-US')}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={2} fill={`url(#${gradId})`} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </button>
  )
}
