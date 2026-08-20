"use client"

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CSSProperties } from 'react';
import type { DashboardPayload, GlobalFilters, KpiPill, MonthTrendPoint, SignalFamily } from '@/lib/types';
import { FAMILY_COLORS, FAMILY_LABELS } from '@/lib/utils';
import KpiCard from '@/components/KpiCard';
import EmptyState from '@/components/EmptyState';

interface OverviewTabProps {
  payload: DashboardPayload;
  onKpiSelect: (patch: Partial<GlobalFilters>) => void;
}

interface KpiCardConfig {
  key: string;
  icon: string;
  label: string;
  value: number;
  accent: string;
  sparkKey: 'total' | SignalFamily;
  patch: Partial<GlobalFilters>;
  selected?: boolean;
  pills?: KpiPill[];
}

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: '#12161D',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: '#E5EAF2',
  fontSize: 12,
};

function buildSpark(byMonth: MonthTrendPoint[], key: 'total' | SignalFamily): number[] {
  const vals = byMonth.map((p) => p[key]);
  if (vals.length === 0) return [0, 0];
  if (vals.length === 1) return [vals[0], vals[0]];
  return vals;
}

export default function OverviewTab({ payload, onKpiSelect }: OverviewTabProps) {
  const { kpis, byFamily, byType, byConfidence, trends } = payload;

  const confidencePills: KpiPill[] = [
    { label: 'H', value: byConfidence.HIGH, color: '#EF4444' },
    { label: 'M', value: byConfidence.MEDIUM, color: '#F59E0B' },
    { label: 'L', value: byConfidence.LOW, color: '#64748B' },
  ];

  const cards: KpiCardConfig[] = [
    { key: 'companies', icon: '🏢', label: 'Companies Tracked', value: kpis.companiesTracked, accent: '#64748B', sparkKey: 'total', patch: {} },
    { key: 'total', icon: '📡', label: 'Total Signals', value: kpis.totalSignals, accent: '#6366F1', sparkKey: 'total', patch: {}, pills: confidencePills },
    { key: 'high', icon: '🚨', label: 'High Alerts', value: kpis.highAlerts, accent: '#EF4444', sparkKey: 'total', patch: { confidence: 'HIGH' } },
    { key: 'csuite', icon: '👔', label: 'C-Suite Changes', value: kpis.csuiteChanges, accent: '#8B5CF6', sparkKey: 'csuite', patch: { family: 'csuite' } },
    { key: 'funding', icon: '💰', label: 'Funding', value: kpis.funding, accent: '#22C55E', sparkKey: 'funding', patch: { family: 'funding' }, selected: true },
    { key: 'ma', icon: '🤝', label: 'Mergers & Acquisitions', value: kpis.mergersAcquisitions, accent: '#F472B6', sparkKey: 'total', patch: { signalType: 'M_AND_A' } },
    { key: 'ipo', icon: '📈', label: 'IPO', value: kpis.ipo, accent: '#EAB308', sparkKey: 'total', patch: { signalType: 'IPO_SIGNAL' } },
    { key: 'product', icon: '🚀', label: 'Product Launches', value: kpis.productLaunches, accent: '#F59E0B', sparkKey: 'product', patch: { family: 'product' } },
    { key: 'partnership', icon: '🔗', label: 'Partnerships', value: kpis.partnerships, accent: '#38BDF8', sparkKey: 'partnership', patch: { family: 'partnership' } },
  ];

  const familyData = (Object.keys(byFamily) as SignalFamily[]).map((f) => ({
    name: FAMILY_LABELS[f],
    value: byFamily[f],
    color: FAMILY_COLORS[f],
  }));
  const familyTotal = familyData.reduce((sum, d) => sum + d.value, 0);

  const typeData = Object.entries(byType)
    .map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <KpiCard
            key={c.key}
            icon={c.icon}
            label={c.label}
            value={c.value}
            accent={c.accent}
            spark={buildSpark(trends.byMonth, c.sparkKey)}
            selected={c.selected}
            pills={c.pills}
            onClick={() => onKpiSelect(c.patch)}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-label="Signals by family">
          <h2 className="label-caps">Signals by Family</h2>
          {familyTotal === 0 ? (
            <div className="mt-3">
              <EmptyState icon="🍩" title="No signals" message="No family breakdown is available yet." />
            </div>
          ) : (
            <div className="mt-3">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={familyData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {familyData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {familyData.map((d) => (
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-[#8B94A7]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} aria-hidden="true" />
                    {d.name} · {d.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
        <section className="card p-5" aria-label="Top signal types">
          <h2 className="label-caps">Top Signal Types</h2>
          {typeData.length === 0 ? (
            <div className="mt-3">
              <EmptyState icon="📊" title="No signal types" message="No signal type data is available yet." />
            </div>
          ) : (
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#8B94A7', fontSize: 12 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: '#C2CAD8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
