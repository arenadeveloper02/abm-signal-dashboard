"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DashboardData, Family, GlobalFilters, TabKey } from '@/lib/types'
import { logRefresh } from '@/lib/actions'
import { useArenaEmailId } from '@/components/arena-email-provider'
import HeaderBar from '@/components/HeaderBar'
import TabBar from '@/components/TabBar'
import OverviewTab from '@/components/OverviewTab'
import CompaniesTab from '@/components/CompaniesTab'
import SignalsTab from '@/components/SignalsTab'
import TrendsTab from '@/components/TrendsTab'
import InsightsTab from '@/components/InsightsTab'
import { DashboardSkeleton } from '@/components/Skeletons'

interface DashboardClientProps {
  defaultEmail: string
}

const DEFAULT_FILTERS: GlobalFilters = {
  family: 'all',
  confidence: 'all',
  signalType: 'all',
  dateFrom: '',
  dateTo: '',
}

type ApiPayload = Partial<DashboardData> & { error?: string }

export default function DashboardClient({ defaultEmail }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState(defaultEmail)
  const [runId, setRunId] = useState('')
  const [tab, setTab] = useState<TabKey>('overview')
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS)
  const [search, setSearch] = useState('')
  const arenaEmailId = useArenaEmailId()

  const fetchData = useCallback(async (targetEmail: string, targetRunId: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, runId: targetRunId, family: '' }),
      })
      const json = (await res.json()) as ApiPayload
      if (!res.ok) {
        setError(json.error ?? `Request failed with status ${res.status}`)
        setData(null)
        return
      }
      if (json.error) {
        setError(json.error)
        setData(null)
        return
      }
      if (!json.meta || !json.kpis) {
        setError('Unexpected response shape from the signals API')
        setData(null)
        return
      }
      setData({
        meta: { ...json.meta, availableRuns: json.meta.availableRuns ?? [] },
        kpis: json.kpis,
        byFamily: json.byFamily ?? { funding: 0, csuite: 0, product: 0, partnership: 0 },
        byType: json.byType ?? {},
        byConfidence: json.byConfidence ?? { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
        companies: json.companies ?? [],
        signals: json.signals ?? [],
        insights: json.insights ?? [],
        trends: {
          byRunDate: json.trends?.byRunDate ?? [],
          byMonth: json.trends?.byMonth ?? [],
        },
      })
    } catch {
      setError('Could not reach the dashboard API. Check your connection and try again.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData(email, runId)
  }, [email, runId, fetchData])

  const signalTypes = useMemo(
    () => Array.from(new Set((data?.signals ?? []).map((s) => s.signal_type))).sort(),
    [data]
  )

  const handleRefresh = () => {
    if (loading) return
    void logRefresh(arenaEmailId ?? email, data?.meta.runId ?? runId).catch(() => undefined)
    void fetchData(email, runId)
  }

  const handleSelectKpi = (family: 'all' | Family) => {
    setFilters((prev) => ({ ...prev, family }))
    setTab('signals')
  }

  return (
    <div className="min-h-screen">
      <HeaderBar
        meta={data ? data.meta : null}
        email={email}
        onEmailChange={setEmail}
        runId={runId}
        onRunChange={setRunId}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        refreshing={loading}
        signalTypes={signalTypes}
      />
      <TabBar active={tab} onChange={setTab} />
      <main className="mx-auto max-w-7xl px-4 py-6" role="tabpanel" aria-label={`${tab} panel`}>
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-[#F31A1A]/40 bg-[#1B1D24] p-10 text-center" role="alert">
            <p className="text-3xl" aria-hidden="true">⚠️</p>
            <p className="mt-3 text-sm font-medium text-white">Could not load dashboard data</p>
            <p className="mt-1 text-xs text-[#A6ABB8]">{error}</p>
            <button
              type="button"
              onClick={() => void fetchData(email, runId)}
              className="mt-4 rounded-xl bg-[#3BC884] px-4 py-2 text-sm font-semibold text-[#0F1712] transition-colors hover:bg-[#34b578]"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            {tab === 'overview' && <OverviewTab data={data} onSelectKpi={handleSelectKpi} />}
            {tab === 'companies' && (
              <CompaniesTab companies={data.companies} signals={data.signals} search={search} filters={filters} />
            )}
            {tab === 'signals' && (
              <SignalsTab
                signals={data.signals}
                filters={filters}
                onFiltersChange={setFilters}
                search={search}
                signalTypes={signalTypes}
              />
            )}
            {tab === 'trends' && <TrendsTab trends={data.trends} />}
            {tab === 'insights' && (
              <InsightsTab
                insights={data.insights}
                signals={data.signals}
                companies={data.companies}
                byType={data.byType}
                filters={filters}
                search={search}
              />
            )}
          </>
        ) : null}
      </main>
      {data && !loading && !error && (
        <footer className="mx-auto max-w-7xl px-4 pb-8">
          <p className="text-xs text-[#6D717F]">
            Run {data.meta.runId === '' ? 'all' : data.meta.runId} · {data.meta.rowsReturned} row
            {data.meta.rowsReturned === 1 ? '' : 's'} returned · {data.meta.rowsAllRuns} across all runs
          </p>
        </footer>
      )}
    </div>
  )
}
