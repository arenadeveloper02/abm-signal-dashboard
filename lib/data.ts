import type { DashboardData } from '@/lib/types'

// Zero-data fallback shape. The dashboard now fetches live data from /api/signals;
// this constant documents the expected payload contract and can be used for zero states.
export const emptyDashboardData: DashboardData = {
  meta: {
    email: '',
    runId: '',
    family: '',
    generatedAt: '',
    rowsReturned: 0,
    rowsAllRuns: 0,
    families: [],
    availableRuns: [],
  },
  kpis: {
    companiesWithSignals: 0,
    totalSignals: 0,
    highAlerts: 0,
    confidenceHigh: 0,
    confidenceMedium: 0,
    confidenceLow: 0,
    csuiteChanges: 0,
    funding: 0,
    mergersAcquisitions: 0,
    ipo: 0,
    grants: 0,
    debtFinancing: 0,
    productLaunches: 0,
    partnerships: 0,
  },
  byFamily: { funding: 0, csuite: 0, product: 0, partnership: 0 },
  byType: {},
  byConfidence: { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 },
  companies: [],
  signals: [],
  insights: [],
  trends: { byRunDate: [], byMonth: [] },
}
