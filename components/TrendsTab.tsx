"use client"

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { FamilyCounts, SignalFamily, Trends } from '@/lib/types';
import { FAMILY_COLORS, FAMILY_LABELS, formatDate, formatMonth } from '@/lib/utils';
import EmptyState from '@/components/EmptyState';

interface TrendsTabProps {
  trends: Trends;
  byFamily: FamilyCounts;
  totalSignals: number;
}

const FAMILIES: SignalFamily[] = ['funding', 'csuite', 'product', 'partnership'];

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: '#12161D',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#E5EAF2',
  fontSize: 12,
};

export default function TrendsTab({ trends, byFamily, totalSignals }: TrendsTabProps) {
  const [enabled, setEnabled] = useState<Record<SignalFamily, boolean>>({
    funding: true,
    csuite: true,
    product: true,
    partnership: true,
  });

  const monthData = useMemo(() => {
    const pts = trends.byMonth.map((p) => ({ ...p, label: formatMonth(p.month) }));
    return pts.length === 1 ? [pts[0], { ...pts[0] }] : pts;
  }, [trends.byMonth]);

  const runData = useMemo(
    () => trends.byRunDate.map((p) => ({ ...p, label: formatDate(p.date) })),
    [trends.byRunDate]
  );

  const mostActiveFamily = useMemo(() => {
    let best: SignalFamily = 'funding';
    let bestValue = -1;
    for (const f of FAMILIES) {
      if (byFamily[f] > bestValue) {
        bestValue = byFamily[f];
        best = f;
      }
    }
    return bestValue > 0 ? FAMILY_LABELS[best] : '—';
  }, [byFamily]);

  const mostActiveMonth = useMemo(() => {
    if (trends.byMonth.length === 0) return '—';
    let best = trends.byMonth[0];
    for (const p of trends.byMonth) {
      if (p.total > best.total) best = p;
    }
    return formatMonth(best.month);
  }, [trends.byMonth]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="label-caps">Total Signals</p>
          <p className="kpi-number mt-1 text-3xl font-semibold text-white">{totalSignals}</p>
        </div>
        <div className="card p-4">
          <p className="label-caps">Most Active Family</p>
          <p className="mt-1 text-3xl font-semibold text-white">{mostActiveFamily}</p>
        </div>
        <div className="card p-4">
          <p className="label-caps">Most Active Month</p>
          <p className="mt-1 text-3xl font-semibold text-white">{mostActiveMonth}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Toggle chart series">
        {FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={enabled[f]}
            onClick={() => setEnabled((prev) => ({ ...prev, [f]: !prev[f] }))}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ${
              enabled[f] ? 'border-white/[0.14] text-white' : 'border-white/[0.06] text-[#5B6473]'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: FAMILY_COLORS[f], opacity: enabled[f] ? 1 : 0.3 }}
              aria-hidden="true"
            />
            {FAMILY_LABELS[f]}
          </button>
        ))}
      </div>
      <section className="card p-5" aria-label="Signal volume by month">
        <h2 className="label-caps">Signal Volume by Month</h2>
        {trends.byMonth.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="📈" title="No monthly data" message="No monthly trend data is available yet." />
          </div>
        ) : (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8B94A7', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fill: '#8B94A7', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                {FAMILIES.filter((f) => enabled[f]).map((f) => (
                  <Area
                    key={f}
                    type="monotone"
                    dataKey={f}
                    name={FAMILY_LABELS[f]}
                    stackId="1"
                    stroke={FAMILY_COLORS[f]}
                    strokeWidth={2}
                    fill={FAMILY_COLORS[f]}
                    fillOpacity={0.25}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
      <section className="card p-5" aria-label="Run-over-run totals">
        <h2 className="label-caps">Run-over-Run Totals</h2>
        {trends.byRunDate.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="🗓️" title="No run data" message="No run-over-run data is available yet." />
          </div>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={runData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#8B94A7', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fill: '#8B94A7', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="total" name="Total signals" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={40} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
