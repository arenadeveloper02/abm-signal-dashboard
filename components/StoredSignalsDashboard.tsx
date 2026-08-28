"use client"

import { useMemo, useState } from 'react'
import type {
  Family,
  NormalizedSeverity,
  StoredCompany,
  StoredSignal,
  StoredSignalsResult,
} from '@/lib/types'
import {
  FAMILY_META,
  NO_SIGNIFICANT_SIGNAL,
  formatDate,
  formatNumber,
  getStoredSourceLinks,
  normalizeStoredSeverity,
  storedDisplayType,
  storedSignalDate,
} from '@/lib/utils'

interface StoredSignalsDashboardProps {
  result: StoredSignalsResult
}

const FAMILY_KEYS: Family[] = ['funding', 'csuite', 'product', 'partnership']

const SEVERITY_STYLE: Record<NormalizedSeverity, { bg: string; text: string; label: string }> = {
  HIGH: { bg: '#FEECEC', text: '#C21414', label: 'High' },
  MEDIUM: { bg: '#FFF1E8', text: '#C2601F', label: 'Medium' },
  LOW: { bg: '#F1F2F4', text: '#6D717F', label: 'Low' },
}

const MAX_SIGNAL_ROWS = 60

export default function StoredSignalsDashboard({ result }: StoredSignalsDashboardProps) {
  const [search, setSearch] = useState('')
  const [familyFilter, setFamilyFilter] = useState<'all' | Family>('all')

  const allSignals = useMemo<StoredSignal[]>(() => {
    const base = result.signals.filter(
      (s) => (s.signal_type ?? '').toUpperCase() !== NO_SIGNIFICANT_SIGNAL
    )
    return [...base].sort((a, b) => storedSignalDate(b).localeCompare(storedSignalDate(a)))
  }, [result.signals])

  const filteredSignals = useMemo<StoredSignal[]>(() => {
    const q = search.trim().toLowerCase()
    return allSignals.filter((s) => {
      if (familyFilter !== 'all' && (s.signal_family ?? '').toLowerCase() !== familyFilter)
        return false
      if (
        q !== '' &&
        !(s.company_name ?? '').toLowerCase().includes(q) &&
        !(s.summary ?? '').toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [allSignals, search, familyFilter])

  const companies: StoredCompany[] = result.companies ?? []

  const filteredCompanies = useMemo<StoredCompany[]>(() => {
    const q = search.trim().toLowerCase()
    if (q === '') return companies
    return companies.filter((c) => (c.company_name ?? '').toLowerCase().includes(q))
  }, [companies, search])

  const totalCompanies =
    result.total_companies ??
    result.dashboard?.total_companies ??
    result.company_count ??
    companies.length

  const totalSignals = result.total_signal_rows ?? result.total

  const highAlerts =
    result.counts_by_alert?.high ??
    result.dashboard?.high_alerts ??
    allSignals.filter((s) => normalizeStoredSeverity(s) === 'HIGH').length

  const kpis: { label: string; value: number }[] = [
    { label: 'Companies tracked', value: totalCompanies },
    { label: 'Total signals', value: totalSignals },
    { label: 'High alerts', value: highAlerts },
  ]

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-[#E2E3E5] bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6D717F]">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold text-[#2C2D33]">{formatNumber(kpi.value)}</p>
          </div>
        ))}
      </section>
      <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFamilyFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${familyFilter === 'all' ? 'bg-[#1A73E8] text-white' : 'bg-[#F7F8F9] text-[#2C2D33] hover:bg-[#F1F2F4]'}`}
            >
              All ({formatNumber(allSignals.length)})
            </button>
            {FAMILY_KEYS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFamilyFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${familyFilter === f ? 'text-white' : 'bg-[#F7F8F9] text-[#2C2D33] hover:bg-[#F1F2F4]'}`}
                style={familyFilter === f ? { backgroundColor: FAMILY_META[f].color } : undefined}
              >
                {FAMILY_META[f].label} ({formatNumber(result.counts_by_family[f])})
              </button>
            ))}
          </div>
          <input
            className="w-full max-w-xs rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#8A8D99] focus:border-[#1A73E8] focus:outline-none"
            placeholder="Search companies or signals"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search companies or signals"
          />
        </div>
        {result.unmatched_inputs.length > 0 && (
          <p className="mt-3 text-xs text-[#C2601F]">
            {result.unmatched_inputs.length} input
            {result.unmatched_inputs.length === 1 ? '' : 's'} had no stored signals:{' '}
            {result.unmatched_inputs.slice(0, 5).join(', ')}
            {result.unmatched_inputs.length > 5 ? '…' : ''}
          </p>
        )}
      </section>
      {filteredCompanies.length > 0 && (
        <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5">
          <h2 className="text-sm font-semibold text-[#2C2D33]">Companies</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E3E5] text-xs font-medium uppercase tracking-wide text-[#6D717F]">
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Industry</th>
                  <th className="px-3 py-2">HQ</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  {FAMILY_KEYS.map((f) => (
                    <th key={f} className="px-3 py-2 text-right">
                      {FAMILY_META[f].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <tr key={c.company_id} className="border-b border-[#F1F2F4]">
                    <td className="px-3 py-2">
                      <span className="font-medium text-[#2C2D33]">{c.company_name}</span>
                      {c.domain !== '' && (
                        <span className="ml-2 text-xs text-[#6D717F]">{c.domain}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#6D717F]">{c.industry || '—'}</td>
                    <td className="px-3 py-2 text-[#6D717F]">{c.hq || '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-[#2C2D33]">
                      {formatNumber(c.total)}
                    </td>
                    {FAMILY_KEYS.map((f) => (
                      <td key={f} className="px-3 py-2 text-right text-[#6D717F]">
                        {formatNumber(c.by_family[f])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-[#E2E3E5] bg-white p-5">
        <h2 className="text-sm font-semibold text-[#2C2D33]">
          Signals ({formatNumber(filteredSignals.length)})
        </h2>
        {filteredSignals.length === 0 ? (
          <p className="mt-4 text-sm text-[#6D717F]">
            No signals match the current filters. Import companies to start tracking signals.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[#F1F2F4]">
            {filteredSignals.slice(0, MAX_SIGNAL_ROWS).map((s) => {
              const severity = normalizeStoredSeverity(s)
              const sevStyle = SEVERITY_STYLE[severity]
              const family = (s.signal_family ?? '').toLowerCase()
              const familyMeta = FAMILY_KEYS.includes(family as Family)
                ? FAMILY_META[family as Family]
                : null
              const links = getStoredSourceLinks(s).slice(0, 2)
              return (
                <li key={s.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-[#2C2D33]">{s.company_name}</span>
                    {familyMeta && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                        style={{ backgroundColor: familyMeta.color }}
                      >
                        {familyMeta.label}
                      </span>
                    )}
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: sevStyle.bg, color: sevStyle.text }}
                    >
                      {sevStyle.label}
                    </span>
                    <span className="text-xs text-[#6D717F]">{storedDisplayType(s)}</span>
                    <span className="ml-auto text-xs text-[#6D717F]">
                      {formatDate(storedSignalDate(s))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#4A4D57]">{s.summary}</p>
                  {links.length > 0 && (
                    <p className="mt-1 text-xs">
                      {links.map((link, i) => (
                        <a
                          key={`${s.id}-link-${i}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-3 font-medium text-[#1A73E8] hover:text-[#155CBA]"
                        >
                          {link.name}
                        </a>
                      ))}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {filteredSignals.length > MAX_SIGNAL_ROWS && (
          <p className="mt-3 text-xs text-[#6D717F]">
            Showing the {MAX_SIGNAL_ROWS} most recent signals of {formatNumber(filteredSignals.length)}.
          </p>
        )}
      </section>
    </div>
  )
}
