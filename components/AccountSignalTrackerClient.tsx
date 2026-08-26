"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [search, setSearch] = useState('')
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
        if (!res.ok || json.error) return
        if (!Array.isArray(json.signals) || typeof json.total !== 'number') return
        const hasCompanies = Array.isArray(json.companies) && json.companies.length > 0
        if (json.signals.length === 0 && !hasCompanies) return
        const fallbackCount = Array.isArray(json.companies) ? json.companies.length : 0
        setStoredResult(normalizeStoredPayload(json, fallbackCount))
      } catch {
        // Fall back to the upload screen when the initial fetch fails
      } finally {
        if (active) setInitialLoading(false)
      }
    }
    void loadInitial()
    return () => {
      active = false
    }
  }, [])

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
      setShowUpload(false)
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

  const handleUploadDifferent = () => {
    setError(null)
    setShowUpload(true)
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
      setStoredResult(normalizeStoredPayload(json, companies.length))
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

  const uploadZone = (
    <div className="mt-10 flex flex-col items-center justify-center text-center">
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
        className={`w-full max-w-xl rounded-2xl border-2 border-dashed px-6 py-14 transition-colors ${
          isDragging ? 'border-[#1A73E8] bg-[#F3F8FE]' : 'border-[#E2E3E5] bg-white'
        }`}
      >
        <p className="text-3xl" aria-hidden="true">📄</p>
        <h2 className="mt-3 text-lg font-semibold text-[#2C2D33]">Upload your company list</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-[#6D717F]">
          Drag and drop a CSV or XLSX file here, or browse to select one. Include a Company column
          plus optional Website, Industry, City, State and Country columns.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 rounded-xl bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1765CC]"
        >
          Browse Files
        </button>
      </div>
      {error && (
        <p className="mt-4 text-sm text-[#F31A1A]" role="alert">
          {error}
        </p>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
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
              Some companies could not be matched {'\u2014'} results may be incomplete.
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx"
        className="hidden"
        aria-label="Upload company list"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {initialLoading ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-[#E2E3E5] bg-white px-6 py-16 text-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent"
            aria-hidden="true"
          />
          <p className="mt-4 text-sm font-medium text-[#2C2D33]">Loading stored signals…</p>
          <p className="mt-1 text-xs text-[#6D717F]">Fetching existing company signal data</p>
        </div>
      ) : showUpload ? (
        uploadZone
      ) : companies.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={analyzing}
              className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1765CC] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing ? 'Analyzing…' : 'Analyze Companies'}
            </button>
            <button
              type="button"
              onClick={() => void handleFetchStored()}
              disabled={fetchingStored || analyzing}
              className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {fetchingStored ? 'Loading…' : 'Load Stored Signals'}
            </button>
            <button
              type="button"
              onClick={handleUploadDifferent}
              className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9]"
            >
              Upload Different File
            </button>
          </div>
          {analyzeError && (
            <p className="mt-3 text-sm text-[#F31A1A]" role="alert">
              {analyzeError}
            </p>
          )}
          {storedError && (
            <p className="mt-3 text-sm text-[#F31A1A]" role="alert">
              {storedError}
            </p>
          )}
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E3E5] bg-[#F7F8F9] text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-[#6D717F]">
                      No companies match your search.
                    </td>
                  </tr>
                ) : (
                  visibleCompanies.map((c) => (
                    <tr key={c.id} className="border-b border-[#F1F2F4] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[#2C2D33]">{c.name}</td>
                      <td className="px-4 py-3 text-[#6D717F]">{c.location !== '' ? c.location : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemove(c.id)}
                          className="text-sm font-medium text-[#F31A1A] hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#6D717F]">
            {fileName !== '' ? `${fileName} · ` : ''}
            {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} loaded
          </p>
          {storedResult && (
            <div className="mt-6">
              <StoredSignalsDashboard result={storedResult} />
            </div>
          )}
        </>
      ) : storedResult ? (
        <>
          <div className="mt-6 flex items-center justify-end">
            <button
              type="button"
              onClick={handleUploadDifferent}
              className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9]"
            >
              Upload Different File
            </button>
          </div>
          <div className="mt-4">
            <StoredSignalsDashboard result={storedResult} />
          </div>
        </>
      ) : (
        uploadZone
      )}
    </div>
  )
}
