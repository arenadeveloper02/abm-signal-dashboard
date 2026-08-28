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

function websiteOf(company: ParsedCompany): string {
  const key = Object.keys(company.raw).find((k) => normalizeKey(k) === 'website')
  if (!key) return ''
  return (company.raw[key] ?? '').trim()
}

function toApiCompany(company: ParsedCompany): Record<string, string> {
  const result: Record<string, string> = { company_name: company.name, website: websiteOf(company) }
  Object.keys(company.raw).forEach((key) => {
    const normalized = normalizeKey(key)
    if (
      normalized === 'company' ||
      normalized === 'companyname' ||
      normalized === 'name' ||
      normalized === 'website'
    )
      return
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

const SAMPLE_PAYLOAD = `{
  "companies": [
    {
      "company_name": "Position2",
      "website": "position2.com",
      "industry": "Marketing Services",
      "company_city": "Santa Clara",
      "company_state": "CA",
      "company_country": "United States",
      "employees": "250",
      "company_linkedin_url": "https://www.linkedin.com/company/position2",
      "account_owner": "Sakshi Mishra",
      "account_stage": "Customer"
    }
  ],
  "signalTypes": "funding,csuite,product,partnership",
  "lookbackDays": 90,
  "batchSize": 10,
  "fileName": "my-batch-label",
  "skipIfRunToday": false
}`

export default function AccountSignalTrackerClient() {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [storedResult, setStoredResult] = useState<StoredSignalsResult | null>(null)
  const [storedError, setStoredError] = useState<string | null>(null)
  const [loadingStored, setLoadingStored] = useState(true)
  const [importList, setImportList] = useState<ParsedCompany[]>([])
  const [typedCompany, setTypedCompany] = useState('')
  const [typedWebsite, setTypedWebsite] = useState('')
  const [showSample, setShowSample] = useState(false)
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
      let skipped = 0
      rows.forEach((row) => {
        const keys = Object.keys(row)
        const companyKey = keys.find((k) => {
          const n = normalizeKey(k)
          return n === 'company' || n === 'companyname' || n === 'name'
        })
        if (!companyKey) return
        const name = String(row[companyKey]).trim()
        if (!name) return
        const websiteKey = keys.find((k) => normalizeKey(k) === 'website')
        const website = websiteKey ? String(row[websiteKey]).trim() : ''
        if (website === '') {
          skipped += 1
          return
        }
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
        if (skipped > 0) {
          setImportError(
            `All ${skipped} row${skipped === 1 ? ' was' : 's were'} skipped — company_name and website are mandatory for every row.`
          )
        } else {
          setImportError(
            'No company names were found. Expected columns named company_name (or Company) and website.'
          )
        }
        return
      }
      setImportError(
        skipped > 0
          ? `${skipped} row${skipped === 1 ? ' was' : 's were'} skipped — company_name and website are mandatory.`
          : null
      )
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
    const website = typedWebsite.trim()
    if (name === '' || website === '') {
      setImportError('company_name and website are mandatory.')
      return
    }
    addCompanies([
      {
        id: nextId(),
        name,
        location: '',
        raw: { Company: name, Website: website },
      },
    ])
    setTypedCompany('')
    setTypedWebsite('')
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
        setToast(`Background analysis failed: ${json.error ?? `status ${res.status}`}`)
        return
      }
      if (json.error) {
        setToast(`Background analysis failed: ${json.error}`)
        return
      }
      const processed =
        typeof json.companies_processed === 'number'
          ? json.companies_processed
          : companiesPayload.length
      const totalSignals = typeof json.total_signals === 'number' ? json.total_signals : 0
      setToast(
        `Analysis complete for "${analyzeFileName}": ${processed} compan${processed === 1 ? 'y' : 'ies'} processed, ${totalSignals} signal${totalSignals === 1 ? '' : 's'} found.`
      )
      void fetchAllStored()
    } catch {
      setToast('Background analysis failed — could not reach the analyse API.')
    }
  }

  const handleSaveAnalyse = () => {
    if (importList.length === 0) {
      setImportError('Add at least one company before running Save & Analyse.')
      return
    }
    const invalid = importList.filter((c) => c.name.trim() === '' || websiteOf(c) === '')
    if (invalid.length > 0) {
      setImportError(
        `${invalid.length} compan${invalid.length === 1 ? 'y is' : 'ies are'} missing a website — company_name and website are mandatory.`
      )
      return
    }
    const companiesPayload = importList.map((c) => toApiCompany(c))
    const analyzeFileName =
      fileName !== '' ? fileName : `manual-${new Date().toISOString().slice(0, 10)}`
    setToast(
      `Analysis started for ${companiesPayload.length} compan${companiesPayload.length === 1 ? 'y' : 'ies'}. This runs in the background and may take a few minutes.`
    )
    void runAnalyzeInBackground(companiesPayload, analyzeFileName)
    setImportList([])
    setFileName('')
    setImportError(null)
    setView('dashboard')
  }

  const toastEl = toast ? (
    <div className="fixed bottom-4 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4" role="status">
      <div className="flex items-start justify-between gap-3 rounded-xl bg-[#2C2D33] px-4 py-3 text-sm text-white shadow-lg">
        <span>{toast}</span>
        <button
          type="button"
          className="shrink-0 text-xs font-semibold text-[#A6ABB8] transition-colors hover:text-white"
          onClick={() => setToast(null)}
        >
          Dismiss
        </button>
      </div>
    </div>
  ) : null

  if (view === 'import') {
    const visibleRows = importList.slice(0, MAX_VISIBLE_ROWS)
    const hiddenCount = importList.length - visibleRows.length
    return (
      <div className="min-h-screen bg-[#F7F8F9]">
        <header className="border-b border-[#E2E3E5] bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div>
              <h1 className="text-lg font-semibold text-[#2C2D33]">Import Companies</h1>
              <p className="text-xs text-[#6D717F]">
                Upload a CSV or XLSX, or add companies manually, then run signal analysis.
              </p>
            </div>
            <button type="button" className={secondaryBtnCls} onClick={() => setView('dashboard')}>
              Back to dashboard
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#2C2D33]">Upload a company list</h2>
              <button
                type="button"
                className={secondaryBtnCls}
                onClick={() => setShowSample((v) => !v)}
                aria-expanded={showSample}
              >
                {showSample ? 'Hide sample' : 'View sample'}
              </button>
            </div>
            {showSample && (
              <div className="mt-4">
                <p className="text-xs text-[#6D717F]">
                  company_name and website are mandatory. All other fields are optional.
                </p>
                <pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-[#E2E3E5] bg-[#F7F8F9] p-4 text-xs leading-5 text-[#2C2D33]">
                  {SAMPLE_PAYLOAD}
                </pre>
              </div>
            )}
            <div
              className={`mt-4 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${isDragging ? 'border-[#1A73E8] bg-[#F3F8FE]' : 'border-[#E2E3E5] bg-white'}`}
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
              <p className="text-sm font-medium text-[#2C2D33]">
                Drag &amp; drop a CSV or XLSX file here
              </p>
              <p className="mt-1 text-xs text-[#6D717F]">
                Columns company_name (or Company) and website are required for every row.
              </p>
              <button
                type="button"
                className={`${secondaryBtnCls} mt-4`}
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
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
              {fileName !== '' && (
                <p className="mt-3 text-xs text-[#6D717F]">Loaded: {fileName}</p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
            <h2 className="text-sm font-semibold text-[#2C2D33]">Add a company manually</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                className={inputCls}
                placeholder="Company name"
                value={typedCompany}
                onChange={(e) => setTypedCompany(e.target.value)}
                aria-label="Company name"
              />
              <input
                className={inputCls}
                placeholder="position2.com"
                value={typedWebsite}
                onChange={(e) => setTypedWebsite(e.target.value)}
                aria-label="Company website"
              />
              <button
                type="button"
                className={primaryBtnCls}
                onClick={handleAddTyped}
                disabled={typedCompany.trim() === '' || typedWebsite.trim() === ''}
              >
                Add
              </button>
            </div>
          </section>
          {importError && (
            <div
              role="alert"
              className="rounded-xl border border-[#F31A1A]/40 bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91313]"
            >
              {importError}
            </div>
          )}
          <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#2C2D33]">
                Companies to analyse ({importList.length})
              </h2>
              <button
                type="button"
                className={primaryBtnCls}
                onClick={handleSaveAnalyse}
                disabled={importList.length === 0}
              >
                Save &amp; Analyse
              </button>
            </div>
            {importList.length === 0 ? (
              <p className="mt-4 text-sm text-[#6D717F]">
                No companies added yet. Upload a file or add a company manually to get started.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E3E5] text-xs font-medium uppercase tracking-wide text-[#6D717F]">
                      <th className="px-3 py-2">Company</th>
                      <th className="px-3 py-2">Website</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((c) => (
                      <tr key={c.id} className="border-b border-[#F1F2F4]">
                        <td className="px-3 py-2 font-medium text-[#2C2D33]">{c.name}</td>
                        <td className="px-3 py-2 text-[#6D717F]">{websiteOf(c) || '—'}</td>
                        <td className="px-3 py-2 text-[#6D717F]">{c.location || '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="text-xs font-medium text-[#F31A1A] transition-colors hover:text-[#C21414]"
                            onClick={() => handleRemove(c.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hiddenCount > 0 && (
                  <p className="mt-3 text-xs text-[#6D717F]">
                    +{hiddenCount} more compan{hiddenCount === 1 ? 'y' : 'ies'} not shown (all will be analysed).
                  </p>
                )}
              </div>
            )}
          </section>
        </main>
        {toastEl}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <header className="border-b border-[#E2E3E5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-[#2C2D33]">ABM Signal Tracker</h1>
            <p className="text-xs text-[#6D717F]">
              Funding, C-suite, product and partnership signals across your tracked accounts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={secondaryBtnCls}
              onClick={() => void fetchAllStored()}
              disabled={loadingStored}
            >
              {loadingStored ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className={primaryBtnCls} onClick={() => setView('import')}>
              Import companies
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {loadingStored ? (
          <DashboardSkeleton />
        ) : storedError ? (
          <div
            className="rounded-2xl border border-[#F31A1A]/40 bg-white p-10 text-center"
            role="alert"
          >
            <p className="text-3xl" aria-hidden="true">⚠️</p>
            <p className="mt-3 text-sm font-medium text-[#2C2D33]">Could not load stored signals</p>
            <p className="mt-1 text-xs text-[#6D717F]">{storedError}</p>
            <button
              type="button"
              className={`${primaryBtnCls} mt-4`}
              onClick={() => void fetchAllStored()}
            >
              Retry
            </button>
          </div>
        ) : storedResult ? (
          <StoredSignalsDashboard result={storedResult} />
        ) : null}
      </main>
      {toastEl}
    </div>
  )
}
