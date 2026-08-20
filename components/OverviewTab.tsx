"use client"

import KpiCard from '@/components/KpiCard'
import type { DashboardData, Family, KpiPill } from '@/lib/types'
import { FAMILIES, FAMILY_META } from '@/lib/utils'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

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

export default function OverviewTab({ data, onSelectKpi }: OverviewTabProps) {
  const { kpis, byConfidence, byFamily, byType, trends } = data
  const spark = (key: 'total' | Family): number[] => trends.byMonth.map((m) => m[key])

  const cards: CardDef[] = [
    { icon: '🏢', label: 'Companies with Signals', value: kpis.companiesWithSignals, accent: '#00A7D6', spark: spark('total'), family: 'all' },
    {
      icon: '📡',
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
    { icon: '🚨', label: 'High Alerts', value: kpis.highAlerts, accent: '#F31A1A', spark: [kpis.highAlerts], family: 'all' },
    { icon: '👔', label: 'C-Suite Changes', value: kpis.csuiteChanges, accent: '#B364D7', spark: spark('csuite'), family: 'csuite' },
    { icon: '💰', label: 'Funding', value: kpis.funding, accent: '#3BC884', spark: spark('funding'), family: 'funding', selected: true },
    { icon: '🤝', label: 'Mergers & Acquisitions', value: kpis.mergersAcquisitions, accent: '#FB8145', spark: [kpis.mergersAcquisitions], family: 'all' },
    { icon: '📈', label: 'IPO', value: kpis.ipo, accent: '#DFC612', spark: [kpis.ipo], family: 'all' },
    { icon: '🚀', label: 'Product Launches', value: kpis.productLaunches, accent: '#00A7D6', spark: spark('product'), family: 'product' },
    { icon: '🔗', label: 'Partnerships', value: kpis.partnerships, accent: '#F8528F', spark: spark('partnership'), family: 'partnership' },
  ]

  const famData = FAMILIES.map((f) => ({ name: FAMILY_META[f].label, value: byFamily[f], color: FAMILY_META[f].color }))
  const famTotal = famData.reduce((acc, d) => acc + d.value, 0)
  const typeData = Object.entries(byType)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

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
                {d.name} · <span className="text-white">{d.value}</span>
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
    </div>
  )
}
