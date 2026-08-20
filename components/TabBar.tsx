"use client"

import type { TabKey } from '@/lib/types'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'companies', label: 'Companies' },
  { key: 'signals', label: 'Signals' },
  { key: 'trends', label: 'Trends' },
  { key: 'insights', label: 'Insights' },
]

interface TabBarProps {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="border-b border-[#2E313A] bg-[#15161C]">
      <div className="mx-auto max-w-7xl px-4">
        <div role="tablist" aria-label="Dashboard sections" className="flex overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.key === active
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onChange(tab.key)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3BC884]/60 ${
                  isActive
                    ? 'border-[#3BC884] text-white'
                    : 'border-transparent text-[#8A8F9C] hover:text-[#D3D6DE]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
