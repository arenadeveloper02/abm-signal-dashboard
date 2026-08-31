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
  const result: Record<string, string> = { company: company.name }
  Object.keys(company.raw).forEach((key) => {
    const normalized = normalizeKey(key)
    if (normalized === 'company' || normalized === 'companyname' || normalized === 'name') return
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
    total_companies: typeof json.total_companies === 'number' ? json.total_companies : undefined,
    total_signal_rows: typeof json.total_signal_rows === 'number' ? json.total_signal_rows : undefined,
    company_count: typeof json.company_count === 'number' ? json.company_count : undefined,
    counts_by_alert: json.counts_by_alert,
    counts_by_category: json.counts_by_category,
    dashboard: json.dashboard,
    signals,
  }
}

type ViewMode = 'dashboard' | 'import'

const MAX_VISIBLE_ROWS = 100

const secondaryBtnCls =
  'rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9]'

const primaryBtnCls =
  'rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:cursor-not-allowed disabled:opacity-60'

const inputCls =
  'w-full max-w-xs rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#8A8D99] focus:border-[#1A73E8] focus:outline-none'

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

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 8000)
    return () => clearTimeout(timer)
  }, [toast])

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
          return n === 'company' || n === 'companyname' || n === 'name'
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
        setImportError('No company names were found. Expected a column named Company (or company_name / Name).')
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
    const name = typedCompany.trim()
    if (name === '') {
      setImportError('Enter a company name to add it to the list.')
      return
    }
    addCompanies([
      {
        id: nextId(),
        name,
        location: '',
        raw: { Company: name },
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
        setToast(`Background analysis failed: ${json.error}`)
        return
      }
      const totalSignals = typeof json.total_signals === 'number' ? json.total_signals : 0
      const companiesProcessed =
        typeof json.companies_processed === 'number' ? json.companies_processed : companiesPayload.length
      setToast(
        `Analysis complete: ${totalSignals} signal${totalSignals === 1 ? '' : 's'} across ${companiesProcessed} compan${companiesProcessed === 1 ? 'y' : 'ies'}. Refreshing dashboard\u2026`
      )
      void fetchAllStored()
    } catch {
      setToast('Background analysis failed. Could not reach the analyze API.')
    }
  }

  const handleSaveAnalyze = () => {
    if (importList.length === 0) {
      setImportError('Add at least one company before running the analysis.')
      return
    }
    const payload = importList.map(toApiCompany)
    const label = fileName !== '' ? fileName : 'manual-entry'
    setToast(
      `Analysis started for ${importList.length} compan${importList.length === 1 ? 'y' : 'ies'}. It runs in the background \u2014 results appear on the dashboard when ready.`
    )
    void runAnalyzeInBackground(payload, label)
    setImportList([])
    setFileName('')
    setImportError(null)
    setView('dashboard')
  }

  const visibleRows = importList.slice(0, MAX_VISIBLE_ROWS)

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <header className="border-b border-[#E2E3E5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold text-[#2C2D33]">ABM Signal Tracker</h1>
            <p className="text-xs text-[#6D717F]">
              Track funding, C-suite, product and partnership signals across your target accounts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {view === 'dashboard' ? (
              <>
                <button
                  type="button"
                  onClick={() => void fetchAllStored()}
                  disabled={loadingStored}
                  className={secondaryBtnCls}
                >
                  {loadingStored ? 'Refreshing\u2026' : 'Refresh'}
                </button>
                <button type="button" onClick={() => setView('import')} className={primaryBtnCls}>
                  Import Companies
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setView('dashboard')} className={secondaryBtnCls}>
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === 'dashboard' ? (
          loadingStored ? (
            <DashboardSkeleton />
          ) : storedError ? (
            <div
              className="rounded-2xl border border-[#F31A1A]/30 bg-white p-10 text-center"
              role="alert"
            >
              <p className="text-3xl" aria-hidden="true">\u26A0\uFE0F</p>
              <p className="mt-3 text-sm font-medium text-[#2C2D33]">Could not load stored signals</p>
              <p className="mt-1 text-xs text-[#6D717F]">{storedError}</p>
              <button
                type="button"
                onClick={() => void fetchAllStored()}
                className={`mt-4 ${primaryBtnCls}`}
              >
                Retry
              </button>
            </div>
          ) : storedResult ? (
            <StoredSignalsDashboard result={storedResult} />
          ) : null
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
              <h2 className="text-base font-semibold text-[#2C2D33]">Import Companies</h2>
              <p className="mt-1 text-xs text-[#6D717F]">
                Upload a CSV or XLSX file with a Company column. Optional columns: website, industry, city, state, country.
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
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
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging ? 'border-[#1A73E8] bg-[#F3F8FE]' : 'border-[#E2E3E5] bg-[#F7F8F9]'
                }`}
              >
                <span className="text-3xl" aria-hidden="true">\uD83D\uDCC4</span>
                <p className="mt-2 text-sm font-medium text-[#2C2D33]">
                  Drag &amp; drop a CSV or XLSX file here, or click to browse
                </p>
                {fileName !== '' && (
                  <p className="mt-1 text-xs text-[#6D717F]">Loaded: {fileName}</p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-medium text-[#2C2D33]">Add a company manually</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={typedCompany}
                    onChange={(e) => setTypedCompany(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTyped()
                    }}
                    placeholder="Company name"
                    aria-label="Company name"
                    className={inputCls}
                  />
                  <button type="button" onClick={handleAddTyped} className={secondaryBtnCls}>
                    Add
                  </button>
                </div>
              </div>

              {importError && (
                <p className="mt-4 text-xs font-medium text-[#F31A1A]" role="alert">
                  {importError}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-[#2C2D33]">
                  Companies to analyse ({importList.length})
                </h2>
                <button
                  type="button"
                  onClick={handleSaveAnalyze}
                  disabled={importList.length === 0}
                  className={primaryBtnCls}
                >
                  Save &amp; Analyse
                </button>
              </div>
              {importList.length === 0 ? (
                <p className="mt-4 text-sm text-[#6D717F]">
                  No companies added yet. Upload a file or add companies manually above.
                </p>
              ) : (
                <div className="mt-4 max-h-[50vh] overflow-auto rounded-xl border border-[#E2E3E5]">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Company
                        </th>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Location
                        </th>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((c) => (
                        <tr key={c.id} className="border-b border-[#F0F1F2] last:border-b-0">
                          <td className="px-4 py-2 font-medium text-[#2C2D33]">{c.name}</td>
                          <td className="px-4 py-2 text-[#6D717F]">{c.location === '' ? '\u2014' : c.location}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemove(c.id)}
                              aria-label={`Remove ${c.name}`}
                              className="text-xs font-medium text-[#F31A1A] transition-colors hover:text-[#C21414]"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importList.length > MAX_VISIBLE_ROWS && (
                    <p className="px-4 py-2 text-xs text-[#6D717F]">
                      Showing first {MAX_VISIBLE_ROWS} of {importList.length} companies. All will be analysed.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,480px)] -translate-x-1/2 rounded-xl border border-[#E2E3E5] bg-white px-4 py-3 text-sm text-[#2C2D33] shadow-[0_4px_16px_rgba(44,45,51,0.12)]"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
