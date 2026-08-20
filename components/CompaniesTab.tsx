"use client"

import { useMemo, useState } from 'react'
import type { CompanyRow, GlobalFilters, Signal } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import CompanyDrawer from '@/components/CompanyDrawer'

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

  const drawerSignals = selected ? signals.filter((s) => s.company === selected) : []

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
                    {sortKey === col.key && <span aria-hidden="true"> {sortDir === 'asc' ? '▲' : '▼'}</span>}
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
              rows.map((c) => (
                <tr
                  key={c.company}
                  tabIndex={0}
                  onClick={() => setSelected(c.company)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelected(c.company)
                  }}
                  className="cursor-pointer border-b border-[#22242C] transition-colors last:border-b-0 hover:bg-[#22242C] focus:bg-[#22242C] focus:outline-none"
                >
                  <td className="px-4 py-3 font-medium text-white">{c.company}</td>
                  <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.total}</td>
                  <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.funding}</td>
                  <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.csuite}</td>
                  <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.product}</td>
                  <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.partnership}</td>
                  <td className="px-4 py-3 text-right text-[#D3D6DE]">{c.high}</td>
                  <td className="px-4 py-3 text-right text-[#A6ABB8]">{formatDate(c.latestDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {selected && <CompanyDrawer company={selected} signals={drawerSignals} onClose={() => setSelected(null)} />}
    </div>
  )
}
