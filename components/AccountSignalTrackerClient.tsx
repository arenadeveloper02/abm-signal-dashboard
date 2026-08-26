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

  const visibleCompanies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, search])

  const subtitle = analysisResult
    ? `${analysisResult.total_signals} signals found \u00b7 Funding ${analysisResult.signals_by_family.funding} \u00b7 C-Suite ${analysisResult.signals_by_family.csuite} \u00b7 Product ${analysisResult.signals_by_family.product} \u00b7 Partnership ${analysisResult.signals_by_family.partnership}`
    : storedResult
      ? `${storedResult.total} stored signals \u00b7 Funding ${storedResult.counts_by_family.funding} \u00b7 C-Suite ${storedResult.counts_by_family.csuite} \u00b7 Product ${storedResult.counts_by_family.product} \u00b7 Partnership ${storedResult.counts_by_family.partnership}`
      : ''

  const showUploadScreen =
    !initialLoading && (showUpload || (companies.length === 0 && !storedResult && !analysisResult))

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <header className="border-b border-[#E2E3E5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-[#2C2D33]">Account Signal Tracker</h1>
            {subtitle !== '' && <p className="mt-0.5 text-xs text-[#8A8D99]">{subtitle}</p>}
          </div>
          {!initialLoading && !showUploadScreen && (
            <button
              type="button"
              onClick={handleUploadDifferent}
              className="ml-auto rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#575A66] transition-colors hover:border-[#1A73E8]/60 hover:text-[#1A73E8]"
            >
              Upload Different File
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {initialLoading ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-[#E2E3E5] bg-white px-6 py-20 text-center"
            aria-busy="true"
            aria-label="Loading stored signals"
          >
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-medium text-[#2C2D33]">Loading stored signals\u2026</p>
            <p className="mt-1 text-xs text-[#8A8D99]">Fetching your saved company and signal data.</p>
          </div>
        ) : showUploadScreen ? (
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
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-6 py-16 text-center transition-colors ${
              isDragging ? 'border-[#1A73E8] bg-[#F3F8FE]' : 'border-[#C5C6CC]'
            }`}
          >
            <span className="text-4xl" aria-hidden="true">\ud83d\udcc4</span>
            <h2 className="mt-4 text-lg font-semibold text-[#2C2D33]">Upload your company list</h2>
            <p className="mt-1 text-sm text-[#8A8D99]">
              Drag and drop a CSV or XLSX file here, or browse to select one.
            </p>
            <p className="mt-1 text-xs text-[#A7AAB2]">
              Expected a column named Company, Company_Name or Company Name.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 rounded-xl bg-[#1A73E8] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA]"
            >
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              aria-label="Upload company list file"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {error && (
              <p className="mt-4 text-sm text-[#C21515]" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {companies.length > 0 && (
              <section className="rounded-2xl border border-[#E2E3E5] bg-white p-4" aria-label="Uploaded company list">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#2C2D33]">{fileName}</h2>
                    <p className="text-xs text-[#8A8D99]">
                      {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} loaded
                    </p>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search companies..."
                      aria-label="Search uploaded companies"
                      className="w-48 rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAnalyze()}
                      disabled={analyzing || companies.length === 0}
                      className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:opacity-60"
                    >
                      {analyzing ? 'Analyzing\u2026' : 'Analyze Signals'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleFetchStored()}
                      disabled={fetchingStored || analyzing || companies.length === 0}
                      className="rounded-xl border border-[#1A73E8] bg-white px-4 py-2 text-sm font-semibold text-[#1A73E8] transition-colors hover:bg-[#F3F8FE] disabled:opacity-60"
                    >
                      {fetchingStored ? 'Loading\u2026' : 'Load Stored Signals'}
                    </button>
                  </div>
                </div>
                {analyzeError && (
                  <p className="mt-3 text-sm text-[#C21515]" role="alert">
                    {analyzeError}
                  </p>
                )}
                {analysisResult && (
                  <p className="mt-3 text-sm text-[#2FA06A]">
                    Run {analysisResult.run_id} {analysisResult.status} \u00b7 {analysisResult.companies_processed}{' '}
                    companies processed \u00b7 {analysisResult.total_signals} signals found.
                  </p>
                )}
                <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-[#E2E3E5]">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr>
                        <th className="sticky top-0 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">
                          Company
                        </th>
                        <th className="sticky top-0 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">
                          Location
                        </th>
                        <th className="sticky top-0 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[#8A8D99]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-sm text-[#8A8D99]">
                            No companies match your search.
                          </td>
                        </tr>
                      ) : (
                        visibleCompanies.map((c) => (
                          <tr key={c.id} className="border-b border-[#F7F8F9] last:border-b-0">
                            <td className="px-4 py-2.5 font-medium text-[#2C2D33]">{c.name}</td>
                            <td className="px-4 py-2.5 text-[#575A66]">{c.location || '\u2014'}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemove(c.id)}
                                className="text-xs font-medium text-[#C21515] hover:underline"
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
              </section>
            )}
            {storedError && (
              <div className="rounded-2xl border border-[#FAA3A3] bg-[#FFF3F3] p-4" role="alert">
                <p className="text-sm text-[#921010]">{storedError}</p>
              </div>
            )}
            {storedResult && <StoredSignalsDashboard result={storedResult} />}
          </div>
        )}
      </main>
    </div>
  )
}
