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
  city?: string
  state?: string
  country?: string
  employees?: number | string | null
  founded_year?: number | string | null
  short_description?: string
  linkedin_url?: string
  account_stage?: string
  account_owner?: string
  status?: string
  analysis_count?: number
  first_seen_at?: string
  last_analysed_at?: string
  has_signals?: boolean
  tech_stack?: string[] | string
  technologies?: string[] | string
  keywords?: string[] | string
  tags?: string[] | string
}

export interface StoredSignalsTotals {
  total_companies?: number
  companies_returned?: number
  companies_with_signals?: number
  total_signals?: number
  signals_returned?: number
  signals_excluded_no_significant?: number
  total_signal_rows?: number
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

export interface CountsByAlert {
  high?: number
  medium?: number
  low?: number
}

export interface StoredDashboardTotals {
  total_companies?: number
  companies_total?: number
  companies_tracked?: number
  total_signal_rows?: number
  total_signals?: number
  high_alerts?: number
  medium_alerts?: number
  low_alerts?: number
  csuite_changes?: number
  funding?: number
  mergers_acquisitions?: number
  ipo?: number
  news?: number
  product_launches?: number
  r_and_d?: number
  partnerships?: number
  other?: number
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
  total_companies?: number
  total_signal_rows?: number
  company_count?: number
  counts_by_alert?: CountsByAlert
  counts_by_category?: Record<string, number>
  dashboard?: StoredDashboardTotals
  totals?: StoredSignalsTotals
}

export type NormalizedSeverity = 'HIGH' | 'MEDIUM' | 'LOW'

export interface SourceLink {
  name: string
  url: string
}
