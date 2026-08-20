"use client"

import { useMemo } from 'react';
import type { CompanyRow, GlobalFilters, SignalFamily, SignalRow } from '@/lib/types';
import { FAMILY_COLORS, FAMILY_LABELS, formatDate } from '@/lib/utils';
import { ConfidenceBadge, TypeChip } from '@/components/Badges';
import EmptyState from '@/components/EmptyState';

interface InsightsTabProps {
  insights: SignalRow[];
  signals: SignalRow[];
  companies: CompanyRow[];
  byType: Record<string, number>;
  search: string;
  filters: GlobalFilters;
}

const FAMILIES: SignalFamily[] = ['funding', 'csuite', 'product', 'partnership'];

export default function InsightsTab({ insights, signals, companies, byType, search, filters }: InsightsTabProps) {
  const topCompany = useMemo(() => {
    if (companies.length === 0) return null;
    return [...companies].sort((a, b) => b.total - a.total)[0];
  }, [companies]);

  const topHighCompany = useMemo(() => {
    const withHigh = companies.filter((c) => c.high > 0);
    if (withHigh.length === 0) return null;
    return [...withHigh].sort((a, b) => b.high - a.high)[0];
  }, [companies]);

  const topType = useMemo(() => {
    const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? entries[0] : null;
  }, [byType]);

  const latestSignal = signals.length > 0 ? signals[0] : null;

  const filtered = useMemo(
    () =>
      insights.filter((s) => {
        if (filters.family !== 'all' && s.family !== filters.family) return false;
        if (filters.confidence !== 'all' && s.confidence !== filters.confidence) return false;
        if (filters.signalType !== 'all' && s.signal_type !== filters.signalType) return false;
        if (filters.dateFrom !== '' && s.date < filters.dateFrom) return false;
        if (filters.dateTo !== '' && s.date > filters.dateTo) return false;
        const q = search.trim().toLowerCase();
        if (q && !s.company.toLowerCase().includes(q) && !s.summary.toLowerCase().includes(q)) return false;
        return true;
      }),
    [insights, filters, search]
  );

  const grouped = useMemo(() => {
    const g: Record<SignalFamily, SignalRow[]> = { funding: [], csuite: [], product: [], partnership: [] };
    for (const s of filtered) g[s.family].push(s);
    return g;
  }, [filtered]);

  const callouts = [
    {
      label: 'Most Signals',
      value: topCompany ? topCompany.company : '—',
      detail: topCompany ? `${topCompany.total} total signal${topCompany.total === 1 ? '' : 's'}` : 'No companies tracked',
      icon: '🏆',
    },
    {
      label: 'Most High-Confidence',
      value: topHighCompany ? topHighCompany.company : '—',
      detail: topHighCompany ? `${topHighCompany.high} high-confidence signal${topHighCompany.high === 1 ? '' : 's'}` : 'No high-confidence signals',
      icon: '🎯',
    },
    {
      label: 'Most Common Type',
      value: topType ? topType[0].replace(/_/g, ' ') : '—',
      detail: topType ? `${topType[1]} occurrence${topType[1] === 1 ? '' : 's'}` : 'No signal types',
      icon: '📌',
    },
    {
      label: 'Most Recent Signal',
      value: latestSignal ? latestSignal.company : '—',
      detail: latestSignal ? `${latestSignal.signal_type.replace(/_/g, ' ')} · ${formatDate(latestSignal.date)}` : 'No signals yet',
      icon: '🕒',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {callouts.map((c) => (
          <div key={c.label} className="card p-4">
            <span className="text-lg" aria-hidden="true">{c.icon}</span>
            <p className="label-caps mt-2">{c.label}</p>
            <p className="mt-1 truncate text-lg font-semibold text-white">{c.value}</p>
            <p className="mt-0.5 text-xs text-[#8B94A7]">{c.detail}</p>
          </div>
        ))}
      </div>
      {filtered.length === 0 ? (
        <EmptyState
          icon="💡"
          title="No high-priority insights"
          message={
            insights.length === 0
              ? 'No HIGH-confidence insights were produced in this run. Check back after the next workflow run.'
              : 'No insights match the current filters or search.'
          }
        />
      ) : (
        <div className="space-y-6">
          {FAMILIES.filter((f) => grouped[f].length > 0).map((f) => (
            <section key={f} aria-label={`${FAMILY_LABELS[f]} insights`}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: FAMILY_COLORS[f] }} aria-hidden="true" />
                {FAMILY_LABELS[f]}
                <span className="text-xs font-normal text-[#8B94A7]">({grouped[f].length})</span>
              </h2>
              <div className="mt-3 space-y-3">
                {grouped[f].map((s, i) => (
                  <article
                    key={`${s.company}-${s.date}-${i}`}
                    className="card border-l-2 p-4"
                    style={{ borderLeftColor: FAMILY_COLORS[f] }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{s.company}</span>
                      <TypeChip type={s.signal_type} family={s.family} />
                      <ConfidenceBadge confidence={s.confidence} />
                      <span className="ml-auto text-xs text-[#8B94A7]">{formatDate(s.date)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#C2CAD8]">{s.summary}</p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#6366F1] hover:underline"
                    >
                      Source: {s.source} ↗
                    </a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
