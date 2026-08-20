"use client"

import { useMemo, useState } from 'react'
import type { GlobalFilters, Signal } from '@/lib/types'
import { CONFIDENCES, FAMILIES, FAMILY_META, filterSignals, formatDate } from '@/lib/utils'
import { ConfidenceBadge, FamilyChip, TypeChip } from '@/components/Badges'

interface SignalsTabProps {
  signals: Signal[]
  filters: GlobalFilters
  onFiltersChange: (filters: GlobalFilters) => void
  search: string
  signalTypes: string[]
}

const selectCls =
  'rounded-lg border border-[#2E313A] bg-[#12131A] px-2 py-1.5 text-sm text-[#F2F3F5] focus:border-[#3BC884] focus:outline-none'

export default function SignalsTab({ signals, filters, onFiltersChange, search, signalTypes }: SignalsTabProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const filtered = useMemo(() => filterSignals(signals, filters, search), [signals, filters, search])

  const clearFilters = () => {
    onFiltersChange({ family: 'all', confidence: 'all', signalType: 'all', dateFrom: '', dateTo: '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
        <select
          aria-label="Filter by family"
          className={selectCls}
          value={filters.family}
          onChange={(e) => onFiltersChange({ ...filters, family: e.target.value as GlobalFilters['family'] })}
        >
          <option value="all">All families</option>
          {FAMILIES.map((f) => (
            <option key={f} value={f}>{FAMILY_META[f].label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by signal type"
          className={selectCls}
          value={filters.signalType}
          onChange={(e) => onFiltersChange({ ...filters, signalType: e.target.value })}
        >
          <option value="all">All types</option>
          {signalTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Filter by confidence"
          className={selectCls}
          value={filters.confidence}
          onChange={(e) => onFiltersChange({ ...filters, confidence: e.target.value as GlobalFilters['confidence'] })}
        >
          <option value="all">All confidence</option>
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Filter from date"
          className={selectCls}
          style={{ colorScheme: 'dark' }}
          value={filters.dateFrom}
          onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
        />
        <input
          type="date"
          aria-label="Filter to date"
          className={selectCls}
          style={{ colorScheme: 'dark' }}
          value={filters.dateTo}
          onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
        />
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-[#2E313A] px-3 py-1.5 text-sm text-[#A6ABB8] transition-colors hover:border-[#F31A1A]/50 hover:text-white"
        >
          Clear
        </button>
        <span className="ml-auto text-xs text-[#8A8F9C]">
          {filtered.length} of {signals.length} signal{signals.length === 1 ? '' : 's'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-12 text-center">
          <p className="text-3xl" aria-hidden="true">🔍</p>
          <p className="mt-3 text-sm font-medium text-white">No signals match your filters</p>
          <p className="mt-1 text-xs text-[#8A8F9C]">Try widening the date range or clearing filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const isExpanded = Boolean(expanded[i])
            const isLong = s.summary.length > 140
            return (
              <article key={`${s.company}-${s.date}-${i}`} className="rounded-2xl border border-[#2E313A] bg-[#1B1D24] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{s.company}</span>
                  <FamilyChip family={s.family} />
                  <TypeChip type={s.signal_type} family={s.family} />
                  <ConfidenceBadge confidence={s.confidence} />
                  <span className="ml-auto text-xs text-[#8A8F9C]">{formatDate(s.date)}</span>
                </div>
                <p className={`mt-2 text-sm leading-relaxed text-[#D3D6DE] ${isExpanded ? '' : 'line-clamp-2'}`}>{s.summary}</p>
                <div className="mt-2 flex items-center gap-4">
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))}
                      aria-expanded={isExpanded}
                      className="text-xs font-medium text-[#A6ABB8] hover:text-white"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#3BC884] hover:underline"
                  >
                    {s.source_name} ↗
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
