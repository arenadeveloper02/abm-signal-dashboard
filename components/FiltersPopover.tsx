"use client"

import { useState } from 'react'
import type { GlobalFilters } from '@/lib/types'
import { CONFIDENCES, FAMILIES, FAMILY_META } from '@/lib/utils'

interface FiltersPopoverProps {
  filters: GlobalFilters
  onChange: (filters: GlobalFilters) => void
  signalTypes: string[]
}

const selectCls =
  'w-full rounded-lg border border-[#2E313A] bg-[#12131A] px-2 py-1.5 text-sm text-[#F2F3F5] focus:border-[#3BC884] focus:outline-none'

export default function FiltersPopover({ filters, onChange, signalTypes }: FiltersPopoverProps) {
  const [open, setOpen] = useState(false)
  const activeCount = [
    filters.family !== 'all',
    filters.confidence !== 'all',
    filters.signalType !== 'all',
    filters.dateFrom !== '',
    filters.dateTo !== '',
  ].filter(Boolean).length

  const clearAll = () => {
    onChange({ family: 'all', confidence: 'all', signalType: 'all', dateFrom: '', dateTo: '' })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle filters panel"
        className="flex items-center gap-2 rounded-xl border border-[#2E313A] bg-[#1B1D24] px-3 py-2 text-sm font-medium text-[#D3D6DE] transition-colors hover:border-[#3BC884]/60"
      >
        <span aria-hidden="true">⚙️</span> Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-[#3BC884] px-1.5 text-[10px] font-semibold text-[#0F1712]">{activeCount}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-[#2E313A] bg-[#1B1D24] p-4 shadow-2xl">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Family</label>
                <select
                  className={selectCls}
                  value={filters.family}
                  onChange={(e) => onChange({ ...filters, family: e.target.value as GlobalFilters['family'] })}
                >
                  <option value="all">All families</option>
                  {FAMILIES.map((f) => (
                    <option key={f} value={f}>{FAMILY_META[f].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Confidence</label>
                <select
                  className={selectCls}
                  value={filters.confidence}
                  onChange={(e) => onChange({ ...filters, confidence: e.target.value as GlobalFilters['confidence'] })}
                >
                  <option value="all">All confidence</option>
                  {CONFIDENCES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">Signal type</label>
                <select
                  className={selectCls}
                  value={filters.signalType}
                  onChange={(e) => onChange({ ...filters, signalType: e.target.value })}
                >
                  <option value="all">All types</option>
                  {signalTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">From</label>
                  <input
                    type="date"
                    className={selectCls}
                    style={{ colorScheme: 'dark' }}
                    value={filters.dateFrom}
                    onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#8A8F9C]">To</label>
                  <input
                    type="date"
                    className={selectCls}
                    style={{ colorScheme: 'dark' }}
                    value={filters.dateTo}
                    onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={clearAll}
                className="w-full rounded-lg border border-[#2E313A] px-3 py-1.5 text-sm text-[#A6ABB8] transition-colors hover:border-[#F31A1A]/50 hover:text-white"
              >
                Clear all filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
