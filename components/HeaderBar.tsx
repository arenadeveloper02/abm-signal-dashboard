"use client"

import { useEffect, useState } from 'react'
import type { DashboardMeta, GlobalFilters } from '@/lib/types'
import { formatDate, formatDateTime, relativeTime } from '@/lib/utils'
import FiltersPopover from '@/components/FiltersPopover'

interface HeaderBarProps {
  meta: DashboardMeta | null
  email: string
  onEmailChange: (email: string) => void
  runId: string
  onRunChange: (runId: string) => void
  search: string
  onSearchChange: (value: string) => void
  filters: GlobalFilters
  onFiltersChange: (filters: GlobalFilters) => void
  onRefresh: () => void
  refreshing: boolean
  signalTypes: string[]
}

const fieldCls =
  'rounded-xl border border-[#2E313A] bg-[#12131A] px-3 py-2 text-sm text-[#F2F3F5] placeholder-[#6D717F] focus:border-[#3BC884] focus:outline-none'

export default function HeaderBar({
  meta,
  email,
  onEmailChange,
  runId,
  onRunChange,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onRefresh,
  refreshing,
  signalTypes,
}: HeaderBarProps) {
  const [emailDraft, setEmailDraft] = useState(email)

  useEffect(() => {
    setEmailDraft(email)
  }, [email])

  const commitEmail = () => {
    const value = emailDraft.trim()
    if (value !== '' && value !== email) {
      onEmailChange(value)
    }
  }

  const availableRuns = meta ? meta.availableRuns : []

  return (
    <header className="sticky top-0 z-40 border-b border-[#2E313A] bg-[#15161C]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#3BC884]" aria-hidden="true" />
          <h1 className="text-base font-semibold text-white">ABM Signal Tracker</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#A6ABB8]">
          <span>Updated {meta ? formatDateTime(meta.generatedAt) : '—'}</span>
          {meta && (
            <span className="rounded-full bg-[#22242C] px-2 py-0.5 text-[10px] text-[#8A8F9C]">
              {relativeTime(meta.generatedAt)}
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <input
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            onBlur={commitEmail}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEmail()
            }}
            placeholder="client@email.com"
            aria-label="Client email"
            className={`w-52 ${fieldCls}`}
          />
          <select
            value={runId}
            onChange={(e) => onRunChange(e.target.value)}
            aria-label="Select run"
            className={`max-w-[16rem] ${fieldCls}`}
          >
            <option value="">All runs</option>
            {availableRuns.map((r) => (
              <option key={r.run_id} value={r.run_id}>
                {formatDate(r.run_date)} · {r.rows} row{r.rows === 1 ? '' : 's'} ·{' '}
                {r.families.length > 0 ? r.families.join(', ') : 'all families'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="rounded-xl bg-[#3BC884] px-4 py-2 text-sm font-semibold text-[#0F1712] transition-colors hover:bg-[#34b578] disabled:opacity-60"
          >
            {refreshing ? 'Refreshing…' : 'Refresh Dashboard'}
          </button>
          <FiltersPopover filters={filters} onChange={onFiltersChange} signalTypes={signalTypes} />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search companies..."
            aria-label="Search companies"
            className={`w-48 sm:w-56 ${fieldCls}`}
          />
        </div>
      </div>
    </header>
  )
}
