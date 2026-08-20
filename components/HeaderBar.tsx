"use client"

import { useEffect, useState } from 'react';
import type { Confidence, GlobalFilters, SignalFamily } from '@/lib/types';
import { FAMILY_LABELS, formatDateTime, formatRelativeTime } from '@/lib/utils';

interface HeaderBarProps {
  generatedAt: string;
  search: string;
  onSearchChange: (value: string) => void;
  filters: GlobalFilters;
  onFiltersChange: (filters: GlobalFilters) => void;
  signalTypes: string[];
  onRefresh: () => void;
  refreshing: boolean;
}

const FAMILY_OPTIONS: SignalFamily[] = ['funding', 'csuite', 'product', 'partnership'];
const CONFIDENCE_OPTIONS: Confidence[] = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

const selectClass =
  'mt-1 w-full rounded-lg border border-white/[0.08] bg-[#0A0C10] px-2.5 py-1.5 text-sm text-white focus:border-[#22C55E] focus:outline-none';

export default function HeaderBar({
  generatedAt,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  signalTypes,
  onRefresh,
  refreshing,
}: HeaderBarProps) {
  const [open, setOpen] = useState(false);
  const [relative, setRelative] = useState('');

  useEffect(() => {
    setRelative(formatRelativeTime(generatedAt));
  }, [generatedAt]);

  const activeCount = [
    filters.family !== 'all',
    filters.confidence !== 'all',
    filters.signalType !== 'all',
    filters.dateFrom !== '',
    filters.dateTo !== '',
  ].filter(Boolean).length;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0C10]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]" aria-hidden="true" />
          <span className="text-base font-semibold tracking-tight text-white">ABM Signal Tracker</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8B94A7]">
          <span>Updated {formatDateTime(generatedAt)}</span>
          {relative !== '' && (
            <span className="rounded-full border border-white/[0.08] bg-[#12161D] px-2 py-0.5 text-[11px]">
              {relative}
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="rounded-lg bg-[#22C55E] px-3.5 py-2 text-sm font-medium text-[#052E14] transition-colors duration-150 hover:bg-[#16A34A] disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh Dashboard'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-haspopup="true"
              className="rounded-lg border border-white/[0.08] bg-[#12161D] px-3.5 py-2 text-sm text-[#C2CAD8] transition-colors duration-150 hover:border-white/[0.16]"
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
            {open && (
              <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-white/[0.08] bg-[#12161D] p-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="label-caps">Filters</span>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="text-sm text-[#8B94A7] hover:text-white">
                    ✕
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="label-caps" htmlFor="filter-family">Family</label>
                    <select
                      id="filter-family"
                      value={filters.family}
                      onChange={(e) => onFiltersChange({ ...filters, family: e.target.value as GlobalFilters['family'] })}
                      className={selectClass}
                    >
                      <option value="all">All families</option>
                      {FAMILY_OPTIONS.map((f) => (
                        <option key={f} value={f}>{FAMILY_LABELS[f]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-caps" htmlFor="filter-confidence">Confidence</label>
                    <select
                      id="filter-confidence"
                      value={filters.confidence}
                      onChange={(e) => onFiltersChange({ ...filters, confidence: e.target.value as GlobalFilters['confidence'] })}
                      className={selectClass}
                    >
                      <option value="all">All confidence</option>
                      {CONFIDENCE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-caps" htmlFor="filter-type">Signal type</label>
                    <select
                      id="filter-type"
                      value={filters.signalType}
                      onChange={(e) => onFiltersChange({ ...filters, signalType: e.target.value })}
                      className={selectClass}
                    >
                      <option value="all">All types</option>
                      {signalTypes.map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-caps" htmlFor="filter-from">From</label>
                      <input
                        id="filter-from"
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                        className={selectClass}
                      />
                    </div>
                    <div>
                      <label className="label-caps" htmlFor="filter-to">To</label>
                      <input
                        id="filter-to"
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                        className={selectClass}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onFiltersChange({ family: 'all', confidence: 'all', signalType: 'all', dateFrom: '', dateTo: '' })}
                    className="w-full rounded-lg border border-white/[0.08] px-3 py-1.5 text-sm text-[#8B94A7] transition-colors duration-150 hover:text-white"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search companies..."
            aria-label="Search companies and summaries"
            className="w-44 rounded-lg border border-white/[0.08] bg-[#12161D] px-3 py-2 text-sm text-white placeholder:text-[#5B6473] focus:border-[#22C55E] focus:outline-none sm:w-56"
          />
        </div>
      </div>
    </header>
  );
}
