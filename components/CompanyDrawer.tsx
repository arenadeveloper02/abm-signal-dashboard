"use client"

import type { SignalRow } from '@/lib/types';
import { ConfidenceBadge, FamilyChip, TypeChip } from '@/components/Badges';
import { formatDate } from '@/lib/utils';

interface CompanyDrawerProps {
  company: string;
  signals: SignalRow[];
  onClose: () => void;
}

export default function CompanyDrawer({ company, signals, onClose }: CompanyDrawerProps) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Signals for ${company}`}>
      <button type="button" aria-label="Close drawer" onClick={onClose} className="absolute inset-0 h-full w-full bg-black/60" />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-white/[0.08] bg-[#0D1117] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{company}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-sm text-[#8B94A7] transition-colors duration-150 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="mt-1 text-xs text-[#8B94A7]">
          {signals.length} signal{signals.length === 1 ? '' : 's'}
        </p>
        <div className="mt-4 space-y-3">
          {signals.length === 0 && (
            <p className="text-sm text-[#8B94A7]">No individual signals recorded for this company.</p>
          )}
          {signals.map((s, i) => (
            <article key={`${s.date}-${i}`} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <FamilyChip family={s.family} />
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
                {s.source} ↗
              </a>
            </article>
          ))}
        </div>
      </aside>
    </div>
  );
}
