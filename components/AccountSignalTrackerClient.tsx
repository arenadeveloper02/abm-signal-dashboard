"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { AnalyzeResult, ParsedCompany, StoredSignal, StoredSignalsResult } from '@/lib/types'
import StoredSignalsDashboard from '@/components/StoredSignalsDashboard'
import { DashboardSkeleton } from '@/components/Skeletons'

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

type ViewMode = 'dashboard' | 'import'

const MAX_VISIBLE_ROWS = 100

export default function AccountSignalTrackerClient() {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [storedResult, setStoredResult] = useState<StoredSignalsResult | null>(null)
  const [storedError, setStoredError] = useState<string | null>(null)
  const [loadingStored, setLoadingStored] = useState(true)
  const [importList, setImportList] = useState<ParsedCompany[]>([])
  const [typedCompany, setTypedCompany] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const idCounter = useRef(0)

  const fetchAllStored = useCallback(async (): Promise<void> => {
    setLoadingStored(true)
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
      setLoadingStored(false)
    }
  }, [])

  useEffect(() => {
    void fetchAllStored()
  }, [fetchAllStored])

  const nextId = (): string => {
    idCounter.current += 1
    return `company-${Date.now()}-${idCounter.current}`
  }

  const addCompanies = (items: ParsedCompany[]) => {
    setImportList((prev) => {
      const seen = new Set(prev.map((c) => c.name.toLowerCase()))
      const merged = [...prev]
      items.forEach((c) => {
        const key = c.name.toLowerCase()
        if (key === '' || seen.has(key)) return
        seen.add(key)
        merged.push(c)
      })
      return merged
    })
  }

  const parseFile = async (file: File) => {
    const ext = file.name.toLowerCase().split('.').pop() ?? ''
    if (ext !== 'csv' && ext !== 'xlsx') {
      setImportError('Unsupported file format. Please upload a CSV or XLSX file.')
      return
    }
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        setImportError('The uploaded file does not contain any sheets.')
        return
      }
      const sheet = workbook.Sheets[sheetName]
      if (!sheet) {
        setImportError('The uploaded file does not contain any data.')
        return
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const parsed: ParsedCompany[] = []
      rows.forEach((row) => {
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
          id: nextId(),
          name,
          location: locationParts.join(', '),
          raw,
        })
      })
      if (parsed.length === 0) {
        setImportError(
          'No company names were found. Expected a column named Company, Company_Name or Company Name.'
        )
        return
      }
      setImportError(null)
      setFileName(file.name)
      addCompanies(parsed)
    } catch {
      setImportError('Could not parse the uploaded file. Please check the file and try again.')
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file) return
    void parseFile(file)
  }

  const handleAddTyped = () => {
    const rawInput = typedCompany.trim()
    if (rawInput === '') return
    const parts = rawInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p !== '')
    const name = parts[0] ?? ''
    if (name === '') return
    const raw: Record<string, string> = { Company: name }
    if (parts[1]) raw['City'] = parts[1]
    if (parts[2]) raw['State'] = parts[2]
    if (parts[3]) raw['Country'] = parts[3]
    addCompanies([
      {
        id: nextId(),
        name,
        location: parts.slice(1).join(', '),
        raw,
      },
    ])
    setTypedCompany('')
    setImportError(null)
  }

  const handleRemove = (id: string) => {
    setImportList((prev) => prev.filter((c) => c.id !== id))
  }

  const runAnalyzeInBackground = async (
    companiesPayload: Record<string, string>[],
    analyzeFileName: string
  ): Promise<void> => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: companiesPayload,
          fileName: analyzeFileName,
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
          setToast(
            `Background analysis failed — missing environment variable${json.missing.length === 1 ? '' : 's'}: ${json.missing.join(', ')}.`
          )
          return
        }
        setToast(json.error ?? `Background analysis failed with status ${res.status}`)
        return
      }
      if (json.error) {
        setToast(json.error)
        return
      }
      const found =
        typeof json.total_signals === 'number'
          ? ` — ${json.total_signals} signal${json.total_signals === 1 ? '' : 's'} found`
          : ''
      setToast(`Background analysis completed${found}. Click \u201cRefresh Dashboard\u201d to see the latest data.`)
    } catch {
      setToast('Background analysis could not reach the API. Please try again.')
    }
  }

  const handleSaveAnalyze = () => {
    if (importList.length === 0) {
      setImportError('Add at least one company before running analysis.')
      return
    }
    const companiesPayload = importList.map((c) => toApiCompany(c))
    const analyzeFileName = fileName !== '' ? fileName : 'imported-companies'
    void runAnalyzeInBackground(companiesPayload, analyzeFileName)
    setView('dashboard')
    setToast('Analysis is running in the background. This may take a few minutes.')
    void fetchAllStored()
  }

  const visibleRows = importList.slice(0, MAX_VISIBLE_ROWS)

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <header className="sticky top-0 z-40 border-b border-[#E2E3E5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1A73E8]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#2C2D33]">Account Signal Tracker</h1>
          </div>
          {view === 'dashboard' ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImportError(null)
                  setView('import')
                }}
                className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:border-[#1A73E8] hover:text-[#1A73E8]"
              >
                Import Company
              </button>
              <button
                type="button"
                onClick={() => void fetchAllStored()}
                disabled={loadingStored}
                aria-label="Refresh dashboard"
                className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1557B0] disabled:opacity-60"
              >
                {loadingStored ? 'Refreshing…' : 'Refresh Dashboard'}
              </button>
            </div>
          ) : (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:border-[#1A73E8] hover:text-[#1A73E8]"
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === 'dashboard' ? (
          loadingStored ? (
            <DashboardSkeleton />
          ) : storedError ? (
            <div
              className="rounded-2xl border border-[#F31A1A]/40 bg-white p-10 text-center"
              role="alert"
            >
              <p className="text-3xl" aria-hidden="true">⚠️</p>
              <p className="mt-3 text-sm font-medium text-[#2C2D33]">Could not load dashboard data</p>
              <p className="mt-1 text-xs text-[#6D717F]">{storedError}</p>
              <button
                type="button"
                onClick={() => void fetchAllStored()}
                className="mt-4 rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1557B0]"
              >
                Retry
              </button>
            </div>
          ) : storedResult ? (
            <StoredSignalsDashboard result={storedResult} />
          ) : null
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-[#2C2D33]">Import Companies</h2>
              <p className="mt-1 text-sm text-[#6D717F]">
                Type companies one at a time or upload a CSV / XLSX file. All entries feed the same
                list below — click “Save &amp; Analyze” when you are ready.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E3E5] bg-white p-4">
              <label htmlFor="typed-company" className="text-xs font-medium tracking-wide text-[#6D717F]">
                Add a company manually
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="typed-company"
                  type="text"
                  value={typedCompany}
                  onChange={(e) => setTypedCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTyped()
                    }
                  }}
                  placeholder="Add a company (e.g. Acme Inc,San Francisco,CA,USA)"
                  aria-label="Add a company"
                  className="flex-1 rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#9AA0AE] focus:border-[#1A73E8] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTyped}
                  className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1557B0]"
                >
                  Add Company
                </button>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
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
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? 'border-[#1A73E8] bg-[#F3F8FE]'
                  : 'border-[#E2E3E5] bg-white hover:border-[#1A73E8]'
              }`}
              aria-label="Upload a company file"
            >
              <p className="text-3xl" aria-hidden="true">📄</p>
              <p className="mt-2 text-sm font-medium text-[#2C2D33]">
                Drag &amp; drop a CSV or XLSX file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-[#6D717F]">
                Expected a column named Company, Company_Name or Company Name.
                {fileName !== '' ? ` Last file: ${fileName}` : ''}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                onChange={(e) => {
                  handleFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>

            {importError && (
              <div
                className="rounded-xl border border-[#F31A1A]/40 bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]"
                role="alert"
              >
                {importError}
              </div>
            )}

            <div className="rounded-2xl border border-[#E2E3E5] bg-white">
              <div className="flex items-center justify-between border-b border-[#E2E3E5] px-4 py-3">
                <p className="text-sm font-medium text-[#2C2D33]">
                  {visibleRows.length} of {importList.length} compan
                  {importList.length === 1 ? 'y' : 'ies'} in the list
                </p>
                {importList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setImportList([])}
                    className="text-xs font-medium text-[#6D717F] transition-colors hover:text-[#F31A1A]"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {importList.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#8A8D99]">
                  No companies added yet. Type a company above or upload a file to get started.
                </p>
              ) : (
                <ul className="divide-y divide-[#F0F1F3]">
                  {visibleRows.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#2C2D33]">{c.name}</p>
                        {c.location !== '' && (
                          <p className="truncate text-xs text-[#8A8D99]">{c.location}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(c.id)}
                        aria-label={`Remove ${c.name}`}
                        className="rounded-lg border border-[#E2E3E5] px-3 py-1 text-xs font-medium text-[#6D717F] transition-colors hover:border-[#F31A1A] hover:text-[#F31A1A]"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {importList.length > MAX_VISIBLE_ROWS && (
                <p className="border-t border-[#F0F1F3] px-4 py-2 text-xs text-[#8A8D99]">
                  Showing the first {MAX_VISIBLE_ROWS} rows. All {importList.length} companies will be
                  analyzed.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setView('dashboard')}
                className="rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:border-[#1A73E8] hover:text-[#1A73E8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAnalyze}
                disabled={importList.length === 0}
                className="rounded-xl bg-[#1A73E8] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1557B0] disabled:opacity-60"
              >
                Save &amp; Analyze
              </button>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-[#E2E3E5] bg-white p-4 shadow-[0_4px_16px_rgba(44,45,51,0.12)]"
        >
          <span className="text-lg" aria-hidden="true">⏳</span>
          <p className="flex-1 text-sm leading-relaxed text-[#2C2D33]">{toast}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="rounded-lg px-1.5 text-sm font-semibold text-[#6D717F] transition-colors hover:text-[#2C2D33]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
