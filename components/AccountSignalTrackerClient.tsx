"use client"

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { AnalyzeResult, ParsedCompany, StoredSignal, StoredSignalsResult } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import EmptyState from '@/components/EmptyState'

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
        counts_by_family: {
          funding: json.counts_by_family?.funding ?? 0,
          csuite: json.counts_by_family?.csuite ?? 0,
          product: json.counts_by_family?.product ?? 0,
          partnership: json.counts_by_family?.partnership ?? 0,
        },
        unmatched_inputs: Array.isArray(json.unmatched_inputs) ? json.unmatched_inputs : [],
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
        <p className="mt-1 text-sm">Supported formats: CSV, XLSX</p>
        <button
          type="button"
          onClick={() => {
            if (fileInputRef.current) fileInputRef.current.click()
          }}
          className="mt-4 rounded border px-4 py-2 text-sm font-medium"
        >
          Upload Companies
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          aria-label="Upload company file"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {companies.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {companies.length} companies ready to import \u00b7 {fileName}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleFetchStored()}
                disabled={companies.length === 0 || analyzing || fetchingStored}
                aria-busy={fetchingStored}
                className="flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {fetchingStored && (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                {fetchingStored ? 'Fetching stored signals...' : 'Fetch Stored Signals'}
              </button>
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={companies.length === 0 || analyzing}
                aria-busy={analyzing}
                className="flex items-center gap-2 rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {analyzing && (
                  <span
                    aria-hidden="true"
                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                )}
                {analyzing ? `Analyzing ${companies.length} companies...` : 'Analyze Companies'}
              </button>
            </div>
          </div>

          {analyzing && (
            <p className="mt-3 text-xs" role="status">
              Analyzing {companies.length} companies... This can take several minutes for large
              lists \u2014 keep this tab open.
            </p>
          )}

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

          <div className="mt-4 max-h-96 overflow-y-auto rounded border">
            <ul>
              {visibleCompanies.map((company) => {
                const index = companies.findIndex((c) => c.id === company.id)
                return (
                  <li
                    key={company.id}
                    className="flex items-center gap-4 border-b px-4 py-2 last:border-b-0"
                  >
                    <span className="w-10 shrink-0 text-sm">{index + 1}</span>
                    <span className="flex-1 text-sm">
                      {company.name}
                      {company.location !== '' && (
                        <span className="ml-2 text-xs text-[#6D717F]">{company.location}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(company.id)}
                      aria-label={`Remove ${company.name}`}
                      className="rounded border px-2 py-1 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {storedResult && (
            <section className="mt-8" aria-label="Stored signals">
              <h2 className="text-lg font-medium">Stored Signals</h2>
              <p className="mt-1 text-sm">
                {storedResult.total} total signal{storedResult.total === 1 ? '' : 's'} \u00b7{' '}
                {storedResult.returned} returned \u00b7 Funding {storedResult.counts_by_family.funding}{' '}
                \u00b7 C-Suite {storedResult.counts_by_family.csuite} \u00b7 Product{' '}
                {storedResult.counts_by_family.product} \u00b7 Partnership{' '}
                {storedResult.counts_by_family.partnership}
              </p>
              {storedResult.unmatched_inputs.length > 0 && (
                <p className="mt-2 text-xs text-[#6D717F]" role="status">
                  No stored signals found for: {storedResult.unmatched_inputs.join(', ')}
                </p>
              )}
              {storedResult.signals.length === 0 ? (
                <div className="mt-4">
                  <EmptyState
                    icon="\ud83d\udd0d"
                    title="No stored signals"
                    message="No stored signals exist for the selected companies."
                  />
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded border">
                  <table className="w-full min-w-[64rem] text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 font-medium">Company</th>
                        <th className="px-4 py-2 font-medium">Family</th>
                        <th className="px-4 py-2 font-medium">Signal Type</th>
                        <th className="px-4 py-2 font-medium">Summary</th>
                        <th className="px-4 py-2 font-medium">Confidence</th>
                        <th className="px-4 py-2 font-medium">Announcement Date</th>
                        <th className="px-4 py-2 font-medium">Last Seen</th>
                        <th className="px-4 py-2 font-medium">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storedResult.signals.map((s, i) => (
                        <tr key={s.id !== '' && s.id !== undefined ? s.id : `stored-${i}`} className="border-b last:border-b-0 align-top">
                          <td className="px-4 py-2 font-medium">{s.company_name}</td>
                          <td className="px-4 py-2">{s.signal_family}</td>
                          <td className="px-4 py-2">{s.signal_type}</td>
                          <td className="px-4 py-2 max-w-md">{s.summary}</td>
                          <td className="px-4 py-2">{s.confidence}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{formatDate(s.announcement_date)}</td>
                          <td className="px-4 py-2 whitespace-nowrap">{formatDate(s.last_seen_at)}</td>
                          <td className="px-4 py-2">
                            <a
                              href={s.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium underline"
                            >
                              {s.source_name} \u2197
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
