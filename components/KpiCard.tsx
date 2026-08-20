"use client"

import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { KpiPill } from '@/lib/types';

interface KpiCardProps {
  icon: string;
  label: string;
  value: number;
  accent: string;
  spark: number[];
  selected?: boolean;
  pills?: KpiPill[];
  onClick: () => void;
}

export default function KpiCard({ icon, label, value, accent, spark, selected = false, pills, onClick }: KpiCardProps) {
  const rawId = useId();
  const gid = `spark-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const data = spark.map((v, i) => ({ i, v }));

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. Click to filter signals`}
      className={`card flex flex-col p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/40 ${
        selected ? 'border-[#22C55E]/70 ring-1 ring-[#22C55E]/40' : ''
      }`}
    >
      <span className="text-xl" aria-hidden="true">{icon}</span>
      <span className="kpi-number mt-2 text-4xl font-semibold text-white">{value}</span>
      <span className="label-caps mt-1.5">{label}</span>
      {pills && pills.length > 0 && (
        <span className="mt-2 flex gap-1.5">
          {pills.map((p) => (
            <span
              key={p.label}
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ color: p.color, backgroundColor: `${p.color}1A`, border: `1px solid ${p.color}33` }}
            >
              {p.label} {p.value}
            </span>
          ))}
        </span>
      )}
      <span className="mt-3 block h-10 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={accent}
              strokeWidth={2}
              fill={`url(#${gid})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </span>
    </button>
  );
}
