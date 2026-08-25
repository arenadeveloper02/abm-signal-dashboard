export type Family = 'funding' | 'csuite' | 'product' | 'partnership'

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'

export type TabKey = 'overview' | 'companies' | 'signals' | 'trends' | 'insights'

export interface RunInfo {
  run_id: string
  run_date: string
  rows: number
  families: string[]
}

export interface DashboardMeta {
  email: string
  runId: string
  family: string
  generatedAt: string
  rowsReturned: number
  rowsAllRuns: number
  families: string[]
  availableRuns: RunInfo[]
}

export interface Kpis {
  companiesWithSignals: number
  totalSignals: number
  highAlerts: number
  confidenceHigh: number
  confidenceMedium: number
  confidenceLow: number
  csuiteChanges: number
  funding: number
  mergersAcquisitions: number
  ipo: number
  grants: number
  debtFinancing: number
  productLaunches: number
  partnerships: number
}

export interface ByFamily {
  funding: number
  csuite: number
  product: number
  partnership: number
}

export interface ByConfidence {
  HIGH: number
  MEDIUM: number
  LOW: number
  UNKNOWN: number
}

export interface CompanyRow {
  company: string
  total: number
  funding: number
  csuite: number
  product: number
  partnership: number
  high: number
  latestDate: string
}

export interface Signal {
  company: string
  family: Family
  signal_type: string
  date: string
  source_name: string
  source_url: string
  summary: string
  confidence: Confidence
  run_id: string
  run_date: string
}

export interface TrendPoint {
  date: string
  total: number
  funding: number
  csuite: number
  product: number
  partnership: number
}

export interface MonthPoint {
  month: string
  total: number
  funding: number
  csuite: number
  product: number
  partnership: number
}

export interface Trends {
  byRunDate: TrendPoint[]
  byMonth: MonthPoint[]
}

export interface DashboardData {
  meta: DashboardMeta
  kpis: Kpis
  byFamily: ByFamily
  byType: Record<string, number>
  byConfidence: ByConfidence
  companies: CompanyRow[]
  signals: Signal[]
  insights: Signal[]
  trends: Trends
}

export interface GlobalFilters {
  family: 'all' | Family
  confidence: 'all' | Confidence
  signalType: string
  dateFrom: string
  dateTo: string
}

export interface KpiPill {
  label: string
  value: number
  color: string
}

export interface ParsedCompany {
  id: string
  name: string
  location: string
  raw: Record<string, string>
}

export type AnalyzeStatus = 'completed' | 'partial' | 'failed'

export interface AnalyzeResult {
  run_id: string
  file_name: string
  companies_processed: number
  signals_by_family: ByFamily
  total_signals: number
  status: AnalyzeStatus
}

export interface StoredSignalsCounts {
  funding: number
  csuite: number
  product: number
  partnership: number
}

export interface StoredCompany {
  company_id: string
  company_name: string
  company_key: string
  domain: string
  website: string
  industry: string
  hq: string
  total: number
  by_family: StoredSignalsCounts
}

export interface StoredSignal {
  id: string
  company_id: string
  company_name: string
  company_key: string
  signal_family: string
  signal_key: string
  signal_type: string
  company: string
  summary: string
  source_name: string
  source_url: string
  confidence: string
  announcement_date: string
  run_id: string
  run_date: string
  first_seen_at: string
  last_seen_at: string
  seen_count: number
  fields?: Record<string, string>
}

export interface StoredSignalsResult {
  total: number
  returned: number
  counts_by_family: StoredSignalsCounts
  unmatched_inputs: string[]
  signals: StoredSignal[]
  limit?: number
  offset?: number
  requested_count?: number
  matched_count?: number
  unmatched_count?: number
  companies?: StoredCompany[]
}
