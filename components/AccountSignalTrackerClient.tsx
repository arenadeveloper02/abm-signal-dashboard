"use client"

import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { AnalyzeResult, ParsedCompany, StoredSignal, StoredSignalsResult } from '@/lib/types'
import StoredSignalsDashboard from '@/components/StoredSignalsDashboard'

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '')
}

const KNOWN_COLUMNS = ['website', 'industry', 'city', 'state', 'country']

function toApiCompany(company: ParsedCompany): Record<string, string> {
  const result: Record<string, string> = { company_name: company.name }
  Object.keys(company.raw).forEach((key) => {
    const normalized = normalizeKey(key)
    if (normalized === 'company' || normalized === 'companyname') return
    const value = company.raw[key]
    if (value === undefined) return
    const known = KNOWN_COLUMNS.find((col) => normalizeKey(col) === normalized)
    result[known ?? key] = value
  })
  return result
}

type AnalyzePayload = Partial<AnalyzeResult> & { error?: string; missing?: string[] }

type StoredPayload = Partial<StoredSignalsResult> & { error?: string; missing?: string[] }

function normalizeStoredPayload(json: StoredPayload, requestedCount: number): StoredSignalsResult {
  const signals = Array.isArray(json.signals) ? (json.signals as StoredSignal[]) : []
  return {
    total: typeof json.total === 'number' ? json.total : signals.length,
    returned: typeof json.returned === 'number' ? json.returned : signals.length,
    limit: typeof json.limit === 'number' ? json.limit : 1000,
    offset: typeof json.offset === 'number' ? json.offset : 0,
    requested_count:
      typeof json.requested_count === 'number' ? json.requested_count : requestedCount,
    matched_count:
      typeof json.matched_count === 'number'
        ? json.matched_count
        : Array.isArray(json.companies)
          ? json.companies.length
          : 0,
    unmatched_count:
      typeof json.unmatched_count === 'number'
        ? json.unmatched_count
        : Array.isArray(json.unmatched_inputs)
          ? json.unmatched_inputs.length
          : 0,
    counts_by_family: {
      funding: json.counts_by_family?.funding ?? 0,
      csuite: json.counts_by_family?.csuite ?? 0,
      product: json.counts_by_family?.product ?? 0,
      partnership: json.counts_by_family?.partnership ?? 0,
    },
    unmatched_inputs: Array.isArray(json.unmatched_inputs) ? json.unmatched_inputs : [],
    companies: Array.isArray(json.companies) ? json.companies : [],
    signals,
  }
}

export default function AccountSignalTrackerClient() {
  const [companies, setCompanies] = useState<ParsedCompany[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null)
  const [fetchingStored, setFetchingStored] = useState(false)
  const [storedError, setStoredError] = useState<string | null>(null)
  const [storedResult, setStoredResult] = useState<StoredSignalsResult | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let active = true
    const loadInitial = async () => {
      try {
        const res = await fetch('/api/all-stored-signals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 1000, offset: 0, includeSignals: true }),
        })
        let json: StoredPayload = {}
        try {
          json = (await res.json()) as StoredPayload
        } catch {
          json = {}
        }
        if (!active) return
        if (!res.ok || json.error) {
          setStoredError(
            json.error ?? 'Could not load stored signals. Click \u201cLoad Stored Signals\u201d to retry.'
          )
          return
        }
        if (!Array.isArray(json.signals) || typeof json.total !== 'number') {
          setStoredError('Unexpected response from the signal read API')
          return
        }
        const fallbackCount = Array.isArray(json.companies) ? json.companies.length : 0
        setStoredResult(normalizeStoredPayload(json, fallbackCount))
      } catch {
        if (active) {
          setStoredError(
            'Could not reach the signal read API. Click \u201cLoad Stored Signals\u201d to retry.'
          )
        }
      } finally {
        if (active) setInitialLoading(false)
      }
    }
    void loadInitial()
    return () => {
      active = false
    }
  }, [])

  const fetchAllStored = async (): Promise<void> => {
    setFetchingStored(true)
    setStoredError(null)
    try {
      const res = await fetch('/api/all-stored-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1000, offset: 0, includeSignals: true }),
      })
      let json: StoredPayload = {}
      try {
        json = (await res.json()) as StoredPayload
      } catch {
        json = {}
      }
      if (!res.ok) {
        if (res.status === 500 && Array.isArray(json.missing) && json.missing.length > 0) {
          setStoredError(
            `Missing environment variable${json.missing.length === 1 ? '' : 's'}: ${json.missing.join(', ')}. Add ${json.missing.length === 1 ? 'it' : 'them'} to .env.local and restart the server.`
          )
          return
        }
        setStoredError(json.error ?? `Fetching stored signals failed with status ${res.status}`)
        return
      }
      if (json.error) {
        setStoredError(json.error)
        return
      }
      if (!Array.isArray(json.signals) || typeof json.total !== 'number') {
        setStoredError('Unexpected response from the signal read API')
        return
      }
      const fallbackCount = Array.isArray(json.companies) ? json.companies.length : 0
      setStoredResult(normalizeStoredPayload(json, fallbackCount))
    } catch {
      setStoredError('Could not reach the signal read API. Check your connection and try again.')
    } finally {
      setFetchingStored(false)
    }
  }

  const fetchStoredForCompanies = async (list: ParsedCompany[]): Promise<void> => {
    if (list.length === 0) return
    setFetchingStored(true)
    setStoredError(null)
    try {
      const res = await fetch('/api/stored-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: list.map((c) => ({ company_name: c.name })),
          limit: 1000,
        }),
      })
      let json: StoredPayload = {}
      try {
        json = (await res.json()) as StoredPayload
      } catch {
        json = {}
      }
      if (!res.ok) {
        if (res.status === 500 && Array.isArray(json.missing) && json.missing.length > 0) {
          setStoredError(
            `Missing environment variable${json.missing.length === 1 ? '' : 's'}: ${json.missing.join(', ')}. Add ${json.missing.length === 1 ? 'it' : 'them'} to .env.local and restart the server.`
          )
          return
        }
        setStoredError(json.error ?? `Fetching stored signals failed with status ${res.status}`)
        return
      }
      if (json.error) {
        setStoredError(json.error)
        return
      }
      if (!Array.isArray(json.signals) || typeof json.total !== 'number') {
        setStoredError('Unexpected response from the signal read API')
        return
      }
      setStoredResult(normalizeStoredPayload(json, list.length))
    } catch {
      setStoredError('Could not reach the signal read API. Check your connection and try again.')
    } finally {
      setFetchingStored(false)
    }
  }

  const parseFile = async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop() ?? ''
    if (ext !== 'csv' && ext !== 'xlsx') {
      setError('Unsupported file format. Please upload a CSV or XLSX file.')
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        setError('The uploaded file does not contain any sheets.')
        return
      }
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) {
        setError('The uploaded file does not contain any data.')
        return
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const parsed: ParsedCompany[] = []
      rows.forEach((row, i) => {
        const keys = Object.keys(row)
        const companyKey = keys.find((k) => {
          const n = normalizeKey(k)
          return n === 'company' || n === 'companyname'
        })
        if (!companyKey) return
        const name = String(row[companyKey]).trim()
        if (!name) return
        const locationParts = ['city', 'state', 'country']
          .map((target) => {
            const key = keys.find((k) => normalizeKey(k) === target)
            return key ? String(row[key]).trim() : ''
          })
          .filter((part) => part !== '')
        const raw: Record<string, string> = {}
        keys.forEach((k) => {
          raw[k] = String(row[k])
        })
        parsed.push({
          id: `company-${i}`,
          name,
          location: locationParts.join(', '),
          raw,
        })
      })
      if (parsed.length === 0) {
        setError(
          'No company names were found. Expected a column named Company, Company_Name or Company Name.'
        )
        return
      }
      setError(null)
      setCompanies(parsed)
      setFileName(file.name)
      setAnalysisResult(null)
      setAnalyzeError(null)
      setStoredError(null)
      setStoredResult(null)
      setShowUpload(false)
      void fetchStoredForCompanies(parsed)
    } catch {
      setError('Could not parse the uploaded file. Please check the file and try again.')
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file) return
    void parseFile(file)
  }

  const handleUploadDifferent = () => {
    setError(null)
    setShowUpload(true)
  }

  const scopedToUpload = companies.length > 0
  const analyzeScopeCount = scopedToUpload
    ? companies.length
    : (storedResult?.companies ?? []).length

  const handleAnalyze = async () => {
    if (analyzing) return
    const scopedCompanies: Record<string, string>[] = scopedToUpload
      ? companies.map((c) => toApiCompany(c))
      : (storedResult?.companies ?? []).map((c) => ({ company_name: c.company_name }))
    if (scopedCompanies.length === 0) {
      setAnalyzeError('No companies are in scope to analyze yet.')
      return
    }
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: scopedCompanies,
          fileName: scopedToUpload ? fileName : 'all-companies',
          signalTypes: 'funding,csuite,product,partnership',
          lookbackDays: 90,
          batchSize: 10,
        }),
      })
      let json: AnalyzePayload = {}
      try {
        json = (await res.json()) as AnalyzePayload
      } catch {
        json = {}
      }
      if (!res.ok) {
        if (res.status === 500 && Array.isArray(json.missing) && json.missing.length > 0) {
          setAnalyzeError(
            `Missing environment variable${json.missing.length === 1 ? '' : 's'}: ${json.missing.join(', ')}. Add ${json.missing.length === 1 ? 'it' : 'them'} to .env.local and restart the server.`
          )
          return
        }
        setAnalyzeError(json.error ?? `Analysis failed with status ${res.status}`)
        return
      }
      if (json.error) {
        setAnalyzeError(json.error)
        return
      }
      if (
        typeof json.run_id !== 'string' ||
        typeof json.total_signals !== 'number' ||
        !json.signals_by_family
      ) {
        setAnalyzeError('Unexpected response from the analyze API')
        return
      }
      setAnalysisResult({
        run_id: json.run_id,
        file_name:
          typeof json.file_name === 'string'
            ? json.file_name
            : scopedToUpload
              ? fileName
              : 'all-companies',
        companies_processed:
          typeof json.companies_processed === 'number'
            ? json.companies_processed
            : scopedCompanies.length,
        signals_by_family: {
          funding: json.signals_by_family.funding ?? 0,
          csuite: json.signals_by_family.csuite ?? 0,
          product: json.signals_by_family.product ?? 0,
          partnership: json.signals_by_family.partnership ?? 0,
        },
        total_signals: json.total_signals,
        status:
          json.status === 'partial' || json.status === 'failed' ? json.status : 'completed',
      })
    } catch {
      setAnalyzeError('Could not reach the analyze API. Check your connection and try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFetchStored = async () => {
    if (analyzing || fetchingStored) return
    if (scopedToUpload) {
      await fetchStoredForCompanies(companies)
    } else {
      await fetchAllStored()
    }
  }

  const subtitle = storedResult
    ? `${storedResult.total} stored signals \u00b7 Funding ${storedResult.counts_by_family.funding} \u00b7 C-Suite ${storedResult.counts_by_family.csuite} \u00b7 Product ${storedResult.counts_by_family.product} \u00b7 Partnership ${storedResult.counts_by_family.partnership}`
    : ''

  if (initialLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F8F9]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A73E8] border-t-transparent"
            aria-hidden="true"
          />
          <p className="text-sm text-[#6D717F]">Loading account signals\u2026</p>
        </div>
      </main>
    )
  }

  if (showUpload) {
    return (
      <main className="min-h-screen bg-[#F7F8F9] px-6 py-10">
        <div className="mx-auto w-full max-w-[720px]">
          <h1 className="text-2xl font-semibold text-[#2C2D33]">Upload Company List</h1>
          <p className="mt-1 text-sm text-[#6D717F]">
            Upload a CSV or XLSX file with a Company / Company Name column. The dashboard will show
            signals scoped to only those companies.
          </p>
          <div
            className={`mt-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-6 py-14 text-center transition-colors ${
              isDragging ? 'border-[#1A73E8] bg-[#F3F8FE]' : 'border-[#E2E3E5]'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDragging(false)
              handleFiles(e.dataTransfer.files)
            }}
          >
            <span className="text-4xl" aria-hidden="true">
              \ud83d\udcc4
            </span>
            <p className="mt-4 text-base font-medium text-[#2C2D33]">
              Drag &amp; drop your CSV or XLSX file here
            </p>
            <p className="mt-1 text-sm text-[#6D717F]">or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#155DBB]"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          {error !== null && (
            <div className="mt-4 rounded-xl border border-[#F8B4B4] bg-[#FEF3F3] px-4 py-3 text-sm text-[#B91C1C]">
              {error}
            </div>
          )}
          {storedResult !== null && (
            <button
              type="button"
              onClick={() => {
                setShowUpload(false)
                setError(null)
              }}
              className="mt-6 text-sm font-medium text-[#1A73E8] transition-colors hover:text-[#155DBB]"
            >
              \u2190 Back to dashboard
            </button>
          )}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#F7F8F9] px-6 py-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#2C2D33]">Account Signal Tracker</h1>
            <p className="mt-1 text-sm text-[#6D717F]">
              {scopedToUpload
                ? `Scoped to ${companies.length} ${companies.length === 1 ? 'company' : 'companies'} from ${fileName}`
                : 'Showing signals for all tracked companies'}
            </p>
            {subtitle !== '' && <p className="mt-1 text-xs text-[#9AA0AE]">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleUploadDifferent}
              className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9]"
            >
              Upload Different File
            </button>
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={analyzing || analyzeScopeCount === 0}
              className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#155DBB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Analyze Signals
            </button>
            <button
              type="button"
              onClick={() => void handleFetchStored()}
              disabled={fetchingStored || analyzing}
              className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Load Stored Signals
            </button>
          </div>
        </div>

        {analyzing && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#BFDBFE] bg-[#F3F8FE] px-4 py-3 text-sm text-[#0A2E5D]">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent"
              aria-hidden="true"
            />
            Analyzing {analyzeScopeCount} {analyzeScopeCount === 1 ? 'company' : 'companies'}
            {scopedToUpload ? ` from ${fileName}` : ' (all companies)'}\u2026 This can take a few
            minutes.
          </div>
        )}

        {analyzeError !== null && (
          <div className="mb-4 rounded-xl border border-[#F8B4B4] bg-[#FEF3F3] px-4 py-3 text-sm text-[#B91C1C]">
            {analyzeError}
          </div>
        )}

        {storedError !== null && (
          <div className="mb-4 rounded-xl border border-[#F8B4B4] bg-[#FEF3F3] px-4 py-3 text-sm text-[#B91C1C]">
            {storedError}
          </div>
        )}

        {analysisResult !== null && (
          <div className="mb-4 rounded-xl border border-[#BBEBD5] bg-[#F0FBF6] px-4 py-3 text-sm text-[#14532D]">
            Analysis {analysisResult.status} \u00b7 Run {analysisResult.run_id} \u00b7{' '}
            {analysisResult.companies_processed} companies processed \u00b7{' '}
            {analysisResult.total_signals} signals found (Funding{' '}
            {analysisResult.signals_by_family.funding} \u00b7 C-Suite{' '}
            {analysisResult.signals_by_family.csuite} \u00b7 Product{' '}
            {analysisResult.signals_by_family.product} \u00b7 Partnership{' '}
            {analysisResult.signals_by_family.partnership}). Click \u201cLoad Stored Signals\u201d
            to refresh the dashboard.
          </div>
        )}

        {fetchingStored ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E3E5] bg-white px-6 py-20">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A73E8] border-t-transparent"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm text-[#6D717F]">
              Loading stored signals
              {scopedToUpload ? ` for ${companies.length} companies` : ''}\u2026
            </p>
          </div>
        ) : storedResult !== null ? (
          <StoredSignalsDashboard result={storedResult} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E3E5] bg-white px-6 py-20 text-center">
            <span className="text-4xl" aria-hidden="true">
              \ud83d\udce1
            </span>
            <p className="mt-4 text-base font-medium text-[#2C2D33]">No signals loaded yet</p>
            <p className="mt-1 max-w-md text-sm text-[#6D717F]">
              Click \u201cLoad Stored Signals\u201d to retry loading all companies, or use
              \u201cUpload Different File\u201d to scope the dashboard to a specific company list.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
