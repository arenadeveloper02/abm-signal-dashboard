"use client"

import { useMemo, useState } from 'react';
import type { CompanyRow, GlobalFilters, SignalRow } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import CompanyDrawer from '@/components/CompanyDrawer';
import EmptyState from '@/components/EmptyState';

interface CompaniesTabProps {
  companies: CompanyRow[];
  signals: SignalRow[];
  search: string;
  filters: GlobalFilters;
}

type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof CompanyRow; label: string; numeric: boolean }[] = [
  { key: 'company', label: 'Company', numeric: false },
  { key: 'total', label: 'Total Signals', numeric: true },
  { key: 'funding', label: 'Funding', numeric: true },
  { key: 'csuite', label: 'C-Suite', numeric: true },
  { key: 'product', label: 'Product', numeric: true },
  { key: 'partnership', label: 'Partnership', numeric: true },
  { key: 'high', label: 'High Conf.', numeric: true },
  { key: 'latestDate', label: 'Latest Signal', numeric: false },
];

export default function CompaniesTab({ companies, signals, search, filters }: CompaniesTabProps) {
  const [sortKey, setSortKey] = useState<keyof CompanyRow>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filteredRows = companies.filter((c) => {
      if (q && !c.company.toLowerCase().includes(q)) return false;
      if (filters.family !== 'all' && c[filters.family] === 0) return false;
      if (filters.confidence === 'HIGH' && c.high === 0) return false;
      return true;
    });
    const copy = [...filteredRows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [companies, search, filters, sortKey, sortDir]);

  const handleSort = (key: keyof CompanyRow) => {
    if (key === sortKey) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'company' ? 'asc' : 'desc');
    }
  };

  const drawerSignals = useMemo(
    () => (selected ? signals.filter((s) => s.company === selected) : []),
    [selected, signals]
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#8B94A7]">
        {rows.length} compan{rows.length === 1 ? 'y' : 'ies'} · click a row to see its signals
      </p>
      {rows.length === 0 ? (
        <EmptyState icon="🏢" title="No companies match" message="Adjust your search or filters to see tracked companies." />
      ) : (
        <div className="card overflow-hidden">
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 z-10 bg-[#12161D]">
                <tr className="border-b border-white/[0.08]">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`px-4 py-3 ${col.numeric ? 'text-right' : 'text-left'}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="label-caps inline-flex items-center gap-1 transition-colors duration-150 hover:text-white"
                      >
                        {col.label}
                        {sortKey === col.key && <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.company}
                    onClick={() => setSelected(c.company)}
                    className="cursor-pointer border-b border-white/[0.04] transition-colors duration-150 hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3 font-medium text-white">{c.company}</td>
                    <td className="kpi-number px-4 py-3 text-right text-[#C2CAD8]">{c.total}</td>
                    <td className="kpi-number px-4 py-3 text-right text-[#C2CAD8]">{c.funding}</td>
                    <td className="kpi-number px-4 py-3 text-right text-[#C2CAD8]">{c.csuite}</td>
                    <td className="kpi-number px-4 py-3 text-right text-[#C2CAD8]">{c.product}</td>
                    <td className="kpi-number px-4 py-3 text-right text-[#C2CAD8]">{c.partnership}</td>
                    <td className={`kpi-number px-4 py-3 text-right ${c.high > 0 ? 'font-semibold text-[#EF4444]' : 'text-[#8B94A7]'}`}>{c.high}</td>
                    <td className="px-4 py-3 text-right text-[#8B94A7]">{formatDate(c.latestDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selected && <CompanyDrawer company={selected} signals={drawerSignals} onClose={() => setSelected(null)} />}
    </div>
  );
}
