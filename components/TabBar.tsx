"use client"

import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import type { TabId } from '@/lib/types';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'companies', label: 'Companies' },
  { id: 'signals', label: 'Signals' },
  { id: 'trends', label: 'Trends' },
  { id: 'insights', label: 'Insights' },
];

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next === -1) return;
    e.preventDefault();
    const tab = TABS[next];
    onChange(tab.id);
    const el = refs.current[next];
    if (el) el.focus();
  };

  return (
    <nav aria-label="Dashboard sections" className="border-b border-white/[0.06] bg-[#0A0C10]">
      <div role="tablist" aria-label="Dashboard tabs" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            type="button"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:bg-white/[0.04] ${
              active === t.id
                ? 'border-[#22C55E] text-white'
                : 'border-transparent text-[#8B94A7] hover:text-[#C2CAD8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
