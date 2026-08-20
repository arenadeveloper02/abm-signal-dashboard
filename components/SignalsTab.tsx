"use client"

import { useMemo, useState } from 'react';
import type { Confidence, GlobalFilters, SignalFamily, SignalRow } from '@/lib/types';
import { FAMILY_LABELS, formatDate } from '@/lib/utils';
import { ConfidenceBadge, FamilyChip, TypeChip } from '@/components/Badges';
import EmptyState from '@/components/EmptyState';

interface SignalsTabProps {
  signals: SignalRow[];
  search: string;
  filters: GlobalFilters;
  onFiltersChange: (filters: GlobalFilters) => void;
  signalTypes: string[];
}

const FAMILY_OPTIONS: (SignalFamily | 'all')[] = ['all', 'funding', 'csuite', 'product', 'partnership'];
const CONFIDENCE_OPTIONS: (Confidence | 'all')[] = ['all', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

const inputClass =
  'rounded-lg border border-white/[0.08] bg-[#12161D] px-2.5 py-1.5 text-sm text-white focus:border-[#22C55E] focus:outline-none';

export default function SignalsTab({ signals, search, filters, onFiltersChange, signalTypes }: SignalsTabProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const filtered = useMemo(
    () =>
      signals.filter((s) => {
        if (filters.family !== 'all' && s.family !== filters.family) return false;
        if (filters.confidence !== 'all' && s.confidence !== filters.confidence) return false;
        if (filters.signalType !== 'all' && s.signal_type !== filters.signalType) return false;
        if (filters.dateFrom !== '' && s.date < filters.dateFrom) return false;
        if (filters.dateTo !== '' && s.date > filters.dateTo) return false;
        const q = search.trim().toLowerCase();
        if (q && !s.company.toLowerCase().includes(q) && !s.summary.toLowerCase().includes(q)) return false;
        return true;
      }),
    [signals, filters, search]
  );

  const hasActiveFilters =
    filters.family !== 'all' ||
    filters.confidence !== 'all' ||
    filters.signalType !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    search.trim() !== '';

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by family">
          {FAMILY_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filters.family === f}
              onClick={() => onFiltersChange({ ...filters, family: f })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150 ${
                filters.family === f
                  ? 'border border-[#22C55E]/40 bg-[#22C55E]/15 text-[#22C55E]'
                  : 'border border-white/[0.08] text-[#8B94A7] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All families' : FAMILY_LABELS[f]}
            </button>
          ))}
        </div>
        <select
          value={filters.confidence}
          onChange={(e) => onFiltersChange({ ...filters, confidence: e.target.value as GlobalFilters['confidence'] })}
          aria-label="Filter by confidence"
          className={inputClass}
        >
          {CONFIDENCE_OPTIONS.map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All confidence' : c}</option>
          ))}
        </select>
        <select
          value={filters.signalType}
          onChange={(e) => onFiltersChange({ ...filters, signalType: e.target.value })}
          aria-label="Filter by signal type"
          className={inputClass}
        >
          <option value="all">All types</option>
          {signalTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
          aria-label="From date"
          className={inputClass}
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
          aria-label="To date"
          className={inputClass}
        />
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onFiltersChange({ family: 'all', confidence: 'all', signalType: 'all', dateFrom: '', dateTo: '' })}
            className="ml-auto text-xs font-medium text-[#22C55E] hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      <p className="text-xs text-[#8B94A7]">
        {filtered.length} signal{filtered.length === 1 ? '' : 's'} shown
      </p>
      {filtered.length === 0 ? (
        <EmptyState
          icon="📡"
          title="No signals match your filters"
          message="Try broadening the family, type, confidence or date range, or clear the search."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <article
              key={`${s.company}-${s.date}-${i}`}
              className="card p-4 transition-colors duration-150 hover:border-white/[0.12]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-white">{s.company}</span>
                <FamilyChip family={s.family} />
                <TypeChip type={s.signal_type} family={s.family} />
                <ConfidenceBadge confidence={s.confidence} />
                <span className="ml-auto text-xs text-[#8B94A7]">{formatDate(s.date)}</span>
              </div>
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                aria-expanded={Boolean(expanded[i])}
                className="mt-2 block w-full text-left"
              >
                <p className={`text-sm leading-relaxed text-[#C2CAD8] ${expanded[i] ? '' : 'line-clamp-2'}`}>{s.summary}</p>
                <span className="mt-1 inline-block text-xs font-medium text-[#22C55E]">
                  {expanded[i] ? 'Show less' : 'Show more'}
                </span>
              </button>
              <div className="mt-2">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6366F1] hover:underline"
                >
                  Source: {s.source} ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
