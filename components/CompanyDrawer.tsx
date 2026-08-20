"use client"

import type { Signal } from '@/lib/types'
import { ConfidenceBadge, FamilyChip, TypeChip } from '@/components/Badges'
import { formatDate } from '@/lib/utils'

interface CompanyDrawerProps {
  company: string
  signals: Signal[]
  onClose: () => void
}

export default function CompanyDrawer({ company, signals, onClose }: CompanyDrawerProps) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-[#2E313A] bg-[#15161C] p-5"
        role="dialog"
        aria-label={`Signals for ${company}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{company}</h2>
            <p className="text-xs text-[#8A8F9C]">{signals.length} signal{signals.length === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-lg border border-[#2E313A] px-2.5 py-1 text-sm text-[#A6ABB8] transition-colors hover:border-[#3BC884]/60 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {signals.length === 0 ? (
            <p className="rounded-xl border border-[#2E313A] bg-[#1B1D24] p-4 text-sm text-[#6D717F]">
              No signals recorded for this company.
            </p>
          ) : (
            signals.map((s, i) => (
              <article key={`${s.company}-${s.date}-${i}`} className="rounded-xl border border-[#2E313A] bg-[#1B1D24] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FamilyChip family={s.family} />
                  <TypeChip type={s.signal_type} family={s.family} />
                  <ConfidenceBadge confidence={s.confidence} />
                  <span className="ml-auto text-xs text-[#8A8F9C]">{formatDate(s.date)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#D3D6DE]">{s.summary}</p>
                <a
                  href={s.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#3BC884] hover:underline"
                >
                  {s.source_name} ↗
                </a>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}
