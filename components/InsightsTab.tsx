"use client"

import type { CompanyRow, GlobalFilters, Signal } from '@/lib/types'
import { FAMILIES, filterSignals, formatDate } from '@/lib/utils'
import { ConfidenceBadge, FamilyChip, TypeChip } from '@/components/Badges'

interface InsightsTabProps {
  insights: Signal[]
  signals: Signal[]
  companies: CompanyRow[]
  byType: Record<string, number>
  filters: GlobalFilters
  search: string
}

export default function InsightsTab({ insights, signals, companies, byType, filters, search }: InsightsTabProps) {
  const topCompany = [...companies].sort((a, b) => b.total - a.total)[0] ?? null
  const topHigh = [...companies].sort((a, b) => b.high - a.high)[0] ?? null
  const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0] ?? null
  const latest = signals[0] ?? null

  const filteredInsights = filterSignals(insights, filters, search)
  const grouped = FAMILIES.map((f) => ({ family: f, items: filteredInsights.filter((s) => s.family === f) })).filter(
    (g) => g.items.length > 0,
  )

  const tiles = [
    {
      label: 'Most Signals',
      value: topCompany ? topCompany.company : '—',
      sub: topCompany ? `${topCompany.total} total signal${topCompany.total === 1 ? '' : 's'}` : 'No companies yet',
      accent: '#1A73E8',
    },
    {
      label: 'Most High-Confidence',
      value: topHigh && topHigh.high > 0 ? topHigh.company : '—',
      sub: topHigh && topHigh.high > 0 ? `${topHigh.high} high-confidence` : 'No high-confidence signals',
      accent: '#F31A1A',
    },
    {
      label: 'Most Common Type',
      value: topType ? topType[0] : '—',
      sub: topType ? `${topType[1]} occurrence${topType[1] === 1 ? '' : 's'}` : 'No signal types yet',
      accent: '#B364D7',
    },
    {
      label: 'Most Recent Signal',
      value: latest ? latest.company : '—',
      sub: latest ? `${latest.signal_type} · ${formatDate(latest.date)}` : 'No signals yet',
      accent: '#3BC884',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">{t.label}</p>
            <p className="mt-1 truncate text-xl font-semibold" style={{ color: t.accent }}>{t.value}</p>
            <p className="mt-0.5 text-xs text-[#A6ABB8]">{t.sub}</p>
          </div>
        ))}
      </div>

      {filteredInsights.length === 0 ? (
        <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-12 text-center">
          <p className="text-3xl" aria-hidden="true">💡</p>
          <p className="mt-3 text-sm font-medium text-white">No high-confidence insights in this run</p>
          <p className="mt-1 text-xs text-[#8A8F9C]">
            Insights list HIGH-confidence signals only. Check the Signals tab for medium and low confidence activity.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.family} aria-label={`${g.family} insights`}>
              <div className="mb-3 flex items-center gap-2">
                <FamilyChip family={g.family} />
                <span className="text-xs text-[#8A8F9C]">{g.items.length} insight{g.items.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-3">
                {g.items.map((s, i) => (
                  <article key={`${s.company}-${s.date}-${i}`} className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{s.company}</span>
                      <TypeChip type={s.signal_type} family={s.family} />
                      <ConfidenceBadge confidence={s.confidence} />
                      <span className="ml-auto text-xs text-[#8A8F9C]">{formatDate(s.date)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#D3D6DE]">{s.summary}</p>
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#3BC884] hover:underline"
                    >
                      {s.source_name} ↗
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
