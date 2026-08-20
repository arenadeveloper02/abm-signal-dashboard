import type { DashboardPayload } from '@/lib/types';

export const dashboardPayload: DashboardPayload = {
  meta: {
    email: 'sakshi.mishra@position2.com',
    runId: '20260820-101524-u6vvc8',
    generatedAt: '2026-08-20T10:49:28.593Z',
    rowsInRun: 1,
    rowsAllRuns: 9,
    families: ['funding', 'csuite', 'product', 'partnership'],
  },
  kpis: {
    companiesTracked: 1,
    totalSignals: 1,
    highAlerts: 0,
    csuiteChanges: 1,
    funding: 0,
    mergersAcquisitions: 0,
    ipo: 0,
    grants: 0,
    debtFinancing: 0,
    productLaunches: 0,
    partnerships: 0,
  },
  byFamily: { funding: 0, csuite: 1, product: 0, partnership: 0 },
  byType: { Departed: 1 },
  byConfidence: { HIGH: 0, MEDIUM: 1, LOW: 0, UNKNOWN: 0 },
  companies: [
    {
      company: 'Realme',
      total: 1,
      funding: 0,
      csuite: 1,
      product: 0,
      partnership: 0,
      high: 0,
      latestDate: '2026-06-23',
    },
  ],
  signals: [
    {
      company: 'Realme',
      family: 'csuite',
      signal_type: 'Departed',
      date: '2026-06-23',
      source: 'Storyboard18',
      url: 'https://www.storyboard18.com/brand-makers/realme-india-ceo-michael-guo-exits-amid-oppo-oneplus-restructuring-102128.htm',
      summary:
        'Michael Guo — Chief Executive Officer — Departed | Source: Storyboard18, https://www.storyboard18.com/brand-makers/realme-india-ceo-michael-guo-exits-amid-oppo-oneplus-restructuring-102128.htm ; Confidence: Medium ; Michael Guo exited as Realme India CEO amid Oppo/OnePlus restructuring, with reports saying Chase Xu would temporarily oversee India operations.',
      confidence: 'MEDIUM',
      run_id: '20260820-101524-u6vvc8',
      run_date: '2026-08-20',
    },
  ],
  insights: [],
  trends: {
    byRunDate: [
      { date: '2026-08-20', total: 9, funding: 4, csuite: 4, product: 1, partnership: 0 },
    ],
    byMonth: [
      { month: '2026-06', total: 1, funding: 0, csuite: 1, product: 0, partnership: 0 },
    ],
  },
};

export function getDashboardPayload(): DashboardPayload {
  return dashboardPayload;
}
