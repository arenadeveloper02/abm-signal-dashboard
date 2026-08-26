"use client"

import { Fragment, useMemo, useState } from 'react'
import type { CompanyRow, GlobalFilters, Signal } from '@/lib/types'
import { formatDate, relativeTime } from '@/lib/utils'
import { ConfidenceBadge, TypeChip } from '@/components/Badges'

interface CompaniesTabProps {
  companies: CompanyRow[]
  signals: Signal[]
  search: string
  filters: GlobalFilters
}

type SortKey = keyof CompanyRow

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'company', label: 'Company', align: 'left' },
  { key: 'total', label: 'Total Signals', align: 'right' },
  { key: 'funding', label: 'Funding', align: 'right' },
  { key: 'csuite', label: 'C-Suite', align: 'right' },
  { key: 'product', label: 'Product', align: 'right' },
  { key: 'partnership', label: 'Partnership', align: 'right' },
  { key: 'high', label: 'High Conf.', align: 'right' },
  { key: 'latestDate', label: 'Latest Signal', align: 'right' },
]

export default function CompaniesTab({ companies, signals, search, filters }: CompaniesTabProps) {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = companies.filter((c) => {
      if (q && !c.company.toLowerCase().includes(q)) return false
      if (filters.family !== 'all' && c[filters.family] === 0) return false
      return true
    })
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv) : Number(av) - Number(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [companies, search, filters, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'company' ? 'asc' : 'desc')
    }
  }

  const toggleExpand = (company: string) => {
    setSelected((prev) => (prev === company ? null : company))
  }

  const expandedSignals = useMemo(() => {
    if (!selected) return []
    return signals
      .filter((s) => s.company === selected)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [signals, selected])

  return (
    <div className="rounded-2xl border border-[#2E313A] bg-[#1B1D24]">
      <div className="max-h-[70vh] overflow-auto rounded-2xl">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`sticky top-0 z-10 border-b border-[#2E313A] bg-[#22242C] px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-[#8A8F9C] ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    aria-label={`Sort by ${col.label}`}
                    className="transition-colors hover:text-white"
                  >
                    {col.label}
                    {sortKey === col.key && <span aria-hidden="true"> {sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-sm text-[#6D717F]">
                  No companies match your search or filters.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const expanded = selected === c.company
                return (
                  <Fragment key={c.company}>
                    <tr
                      tabIndex={0}
                      aria-expanded={expanded}
                      onClick={() => toggleExpand(c.company)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') toggleExpand(c.company)
                      }}
                      className="cursor-pointer border-b border-[#22242C] transition-colors last:border-b-0 hover:bg-[#22242C] focus:bg-[#22242C] focus:outline-none"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`inline-block text-[10px] text-[#8A8F9C] transition-transform duration-200 ${
                              expanded ? 'rotate-90' : ''
                            }`}
                          >
                            {'\u25B6'}
                          </span>
                          {c.company}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.total}</td>
                      <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.funding}</td>
                      <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.csuite}</td>
                      <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.product}</td>
                      <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.partnership}</td>
                      <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.high}</td>
                      <td className="px-4 py-3 text-right text-[#A6ABB8]">{formatDate(c.latestDate)}</td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-[#22242C] last:border-b-0">
                        <td colSpan={COLUMNS.length} className="bg-[#171920] px-6 py-5">
                          {expandedSignals.length === 0 ? (
                            <p className="text-xs text-[#6D717F]">No signals available for this company in the current run.</p>
                          ) : (
                            <div className="grid gap-6">
                              <div>
                                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8A8F9C]">
                                  Signal History
                                </h3>
                                <ul className="mt-3 space-y-3">
                                  {expandedSignals.map((s, i) => (
                                    <li
                                      key={`${s.company}-${s.signal_type}-${s.date}-${i}`}
                                      className="rounded-xl border border-[#2E313A] bg-[#1B1D24] p-3"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <ConfidenceBadge confidence={s.confidence} />
                                        <TypeChip type={s.signal_type} family={s.family} />
                                        <span className="ml-auto text-[11px] text-[#6D717F]">{relativeTime(s.date)}</span>
                                      </div>
                                      <p className="mt-2 text-sm text-[#D3D6DE]">{s.summary}</p>
                                      {s.source_url && s.source_url.trim() !== '' && (
                                        <a
                                          href={s.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="mt-2 inline-block text-xs font-medium text-[#00A7D6] transition-colors hover:text-white"
                                        >
                                          Source{s.source_name && s.source_name.trim() !== '' ? ` \u00B7 ${s.source_name}` : ''}
                                        </a>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
