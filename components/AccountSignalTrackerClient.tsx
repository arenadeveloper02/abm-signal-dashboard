"use client"

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { AnalyzeResult, ParsedCompany, StoredSignal, StoredSignalsResult } from '@/lib/types'
import EmptyState from '@/components/EmptyState'
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

export default function AccountSignalTrackerClient() {
  const [companies, setCompanies] = useState<ParsedCompany[]>([])
  const [fileName, setFileName] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResult | null>(null)
  const [fetchingStored, setFetchingStored] = useState(false)
  const [storedError, setStoredError] = useState<string | null>(null)
  const [storedResult, setStoredResult] = useState<StoredSignalsResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      setStoredResult(null)
      setStoredError(null)
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

  const handleRemove = (id: string) => {
    setCompanies((prev) => prev.filter((c) => c.id !== id))
  }

  const handleAnalyze = async () => {
    if (companies.length === 0 || analyzing) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: companies.map((c) => toApiCompany(c)),
          fileName,
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
        file_name: typeof json.file_name === 'string' ? json.file_name : fileName,
        companies_processed:
          typeof json.companies_processed === 'number' ? json.companies_processed : companies.length,
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
    if (companies.length === 0 || analyzing || fetchingStored) return
    setFetchingStored(true)
    setStoredError(null)
    try {
      const res = await fetch('/api/stored-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: companies.map((c) => ({ company_name: c.name })),
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
      setStoredResult({
        total: json.total,
        returned: typeof json.returned === 'number' ? json.returned : json.signals.length,
        limit: typeof json.limit === 'number' ? json.limit : 1000,
        offset: typeof json.offset === 'number' ? json.offset : 0,
        requested_count:
          typeof json.requested_count === 'number' ? json.requested_count : companies.length,
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
        signals: json.signals as StoredSignal[],
      })
    } catch {
      setStoredError('Could not reach the signal read API. Check your connection and try again.')
    } finally {
      setFetchingStored(false)
    }
  }

  const handleRefresh = () => {
    setError(null)
  }

  const visibleCompanies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, search])

  const subtitle = analysisResult
    ? `${analysisResult.total_signals} signals found \u00b7 Funding ${analysisResult.signals_by_family.funding} \u00b7 C-Suite ${analysisResult.signals_by_family.csuite} \u00b7 Product ${analysisResult.signals_by_family.product} \u00b7 Partnership ${analysisResult.signals_by_family.partnership}`
    : 'No analysis loaded yet'

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav aria-label="Breadcrumb" className="text-sm">
        <span>Agents</span>
        <span aria-hidden="true"> &gt; </span>
        <span>Account Signal Tracking</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Account Signal Tracker</h1>
          <p className="mt-1 text-sm">{subtitle}</p>
          {analysisResult && analysisResult.status === 'partial' && (
            <p className="mt-1 text-xs text-[#FB8145]" role="status">
              Some companies could not be matched \u2014 results may be incomplete.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded border px-4 py-2 text-sm font-medium"
          >
            Refresh Dashboard
          </button>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            aria-label="Search companies"
            className="w-56 rounded border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <hr className="mt-4" />

      {companies.length === 0 && (
        <div className="mt-10 flex flex-col items-center justify-center text-center">
          <h2 className="text-lg font-medium">No companies are currently configured</h2>
          <p className="mt-2 max-w-xl text-sm">
            Upload a company list (CSV or XLSX) to start tracking ABM signals. Columns such as
            Company Name, City, State and Country will be combined automatically.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-6 text-sm" role="alert">
          {error}
        </p>
      )}

      <div
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
        className={`mt-8 flex flex-col items-center justify-center rounded border-2 border-dashed px-6 py-16 text-center ${
          isDragging ? 'border-black' : ''
        }`}
      >
        <p className="text-base font-medium">Drag and drop your company file here</p>
        <p className="mt-1 text-sm">Supports CSV and XLSX files</p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 rounded bg-[#1A73E8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#155db5]"
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          aria-label="Upload company file"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {companies.length > 0 && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">{fileName}</h2>
              <p className="text-sm text-[#6D717F]">
                {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} loaded
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={companies.length === 0 || analyzing || fetchingStored}
                className="rounded bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155db5] disabled:opacity-60"
              >
                {analyzing ? 'Analyzing\u2026' : 'Analyze'}
              </button>
              <button
                type="button"
                onClick={() => void handleFetchStored()}
                disabled={companies.length === 0 || analyzing || fetchingStored}
                className="rounded border border-[#1A73E8] bg-white px-4 py-2 text-sm font-semibold text-[#1A73E8] transition-colors hover:bg-[#F3F8FE] disabled:opacity-60"
              >
                {fetchingStored ? 'Fetching\u2026' : 'Fetch Stored Signals'}
              </button>
            </div>
          </div>
          <ul className="mt-4 divide-y rounded border">
            {visibleCompanies.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  {c.location !== '' && <p className="text-xs text-[#6D717F]">{c.location}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(c.id)}
                  aria-label={`Remove ${c.name}`}
                  className="text-xs font-medium text-[#F31A1A] hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {analyzeError && (
        <p className="mt-4 text-sm text-[#F31A1A]" role="alert">
          {analyzeError}
        </p>
      )}

      {analysisResult && (
        <div className="mt-4 rounded border p-4">
          <p className="text-sm font-medium">Analysis complete \u2014 run {analysisResult.run_id}</p>
          <p className="mt-1 text-sm text-[#6D717F]">
            {analysisResult.companies_processed} companies processed \u00b7 {analysisResult.total_signals} signals
          </p>
        </div>
      )}

      {storedError && (
        <p className="mt-4 text-sm text-[#F31A1A]" role="alert">
          {storedError}
        </p>
      )}

      {storedResult &&
        (storedResult.signals.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No stored signals"
              message="No stored signals were found for the uploaded companies."
            />
          </div>
        ) : (
          <div className="mt-8">
            <StoredSignalsDashboard
              result={storedResult}
              onRefresh={() => void handleFetchStored()}
              onImport={() => fileInputRef.current?.click()}
              refreshing={fetchingStored}
            />
          </div>
        ))}
    </div>
  )
}
