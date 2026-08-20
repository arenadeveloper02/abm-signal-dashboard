"use client"

import { useCallback, useMemo, useState } from 'react';
import type { DashboardPayload, GlobalFilters, TabId } from '@/lib/types';
import { getDashboardPayload } from '@/lib/data';
import { logRefresh } from '@/lib/actions';
import { useArenaEmailId } from '@/components/arena-email-provider';
import HeaderBar from '@/components/HeaderBar';
import TabBar from '@/components/TabBar';
import OverviewTab from '@/components/OverviewTab';
import CompaniesTab from '@/components/CompaniesTab';
import SignalsTab from '@/components/SignalsTab';
import TrendsTab from '@/components/TrendsTab';
import InsightsTab from '@/components/InsightsTab';

interface DashboardClientProps {
  payload: DashboardPayload;
}

const DEFAULT_FILTERS: GlobalFilters = {
  family: 'all',
  confidence: 'all',
  signalType: 'all',
  dateFrom: '',
  dateTo: '',
};

function RefreshSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-40 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card h-72 animate-pulse" />
        <div className="card h-72 animate-pulse" />
      </div>
    </div>
  );
}

export default function DashboardClient({ payload }: DashboardClientProps) {
  const [data, setData] = useState<DashboardPayload>(payload);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);
  const [refreshing, setRefreshing] = useState(false);
  const emailId = useArenaEmailId();

  const signalTypes = useMemo(() => Object.keys(data.byType).sort(), [data.byType]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    void logRefresh(emailId ?? 'unknown', data.meta.runId).catch(() => undefined);
    window.setTimeout(() => {
      setData(getDashboardPayload());
      setRefreshing(false);
    }, 800);
  }, [refreshing, emailId, data.meta.runId]);

  const handleKpiSelect = useCallback((patch: Partial<GlobalFilters>) => {
    setFilters({ ...DEFAULT_FILTERS, ...patch });
    setActiveTab('signals');
  }, []);

  return (
    <div className="min-h-screen">
      <HeaderBar
        generatedAt={data.meta.generatedAt}
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        signalTypes={signalTypes}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      <TabBar active={activeTab} onChange={setActiveTab} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {refreshing ? (
            <RefreshSkeleton />
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab payload={data} onKpiSelect={handleKpiSelect} />}
              {activeTab === 'companies' && (
                <CompaniesTab companies={data.companies} signals={data.signals} search={search} filters={filters} />
              )}
              {activeTab === 'signals' && (
                <SignalsTab
                  signals={data.signals}
                  search={search}
                  filters={filters}
                  onFiltersChange={setFilters}
                  signalTypes={signalTypes}
                />
              )}
              {activeTab === 'trends' && (
                <TrendsTab trends={data.trends} byFamily={data.byFamily} totalSignals={data.kpis.totalSignals} />
              )}
              {activeTab === 'insights' && (
                <InsightsTab
                  insights={data.insights}
                  signals={data.signals}
                  companies={data.companies}
                  byType={data.byType}
                  search={search}
                  filters={filters}
                />
              )}
            </>
          )}
        </div>
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-[#5B6473]">
          Run {data.meta.runId} · {data.meta.rowsInRun} row{data.meta.rowsInRun === 1 ? '' : 's'} in run ·{' '}
          {data.meta.rowsAllRuns} across all runs
        </p>
      </footer>
    </div>
  );
}
