export type SignalFamily = 'funding' | 'csuite' | 'product' | 'partnership';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type TabId = 'overview' | 'companies' | 'signals' | 'trends' | 'insights';

export interface PayloadMeta {
  email: string;
  runId: string;
  generatedAt: string;
  rowsInRun: number;
  rowsAllRuns: number;
  families: string[];
}

export interface Kpis {
  companiesTracked: number;
  totalSignals: number;
  highAlerts: number;
  csuiteChanges: number;
  funding: number;
  mergersAcquisitions: number;
  ipo: number;
  grants: number;
  debtFinancing: number;
  productLaunches: number;
  partnerships: number;
}

export interface FamilyCounts {
  funding: number;
  csuite: number;
  product: number;
  partnership: number;
}

export interface ConfidenceCounts {
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  UNKNOWN: number;
}

export interface CompanyRow {
  company: string;
  total: number;
  funding: number;
  csuite: number;
  product: number;
  partnership: number;
  high: number;
  latestDate: string;
}

export interface SignalRow {
  company: string;
  family: SignalFamily;
  signal_type: string;
  date: string;
  source: string;
  url: string;
  summary: string;
  confidence: Confidence;
  run_id: string;
  run_date: string;
}

export interface RunTrendPoint {
  date: string;
  total: number;
  funding: number;
  csuite: number;
  product: number;
  partnership: number;
}

export interface MonthTrendPoint {
  month: string;
  total: number;
  funding: number;
  csuite: number;
  product: number;
  partnership: number;
}

export interface Trends {
  byRunDate: RunTrendPoint[];
  byMonth: MonthTrendPoint[];
}

export interface DashboardPayload {
  meta: PayloadMeta;
  kpis: Kpis;
  byFamily: FamilyCounts;
  byType: Record<string, number>;
  byConfidence: ConfidenceCounts;
  companies: CompanyRow[];
  signals: SignalRow[];
  insights: SignalRow[];
  trends: Trends;
}

export interface GlobalFilters {
  family: SignalFamily | 'all';
  confidence: Confidence | 'all';
  signalType: string;
  dateFrom: string;
  dateTo: string;
}

export interface KpiPill {
  label: string;
  value: number;
  color: string;
}
