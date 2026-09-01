"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import * as XLSX from 'xlsx'
import type { AnalyzeResult, ParsedCompany, StoredSignalsResult } from '@/lib/types'
import { fetchAllStoredSignals } from '@/lib/fetch-all-stored-signals'
import StoredSignalsDashboard from '@/components/StoredSignalsDashboard'
import { DashboardSkeleton } from '@/components/Skeletons'
import { useArenaEmailId } from '@/components/arena-email-provider'

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '')
}

const COLUMN_ALIASES: Record<string, string> = {
  website: 'website',
  industry: 'industry',
  city: 'company_city',
  companycity: 'company_city',
  state: 'company_state',
  companystate: 'company_state',
  country: 'company_country',
  companycountry: 'company_country',
  employees: 'employees',
  linkedin: 'company_linkedin_url',
  linkedinurl: 'company_linkedin_url',
  companylinkedinurl: 'company_linkedin_url',
  accountowner: 'account_owner',
  accountstage: 'account_stage',
}

function toApiCompany(company: ParsedCompany): Record<string, string> {
  const result: Record<string, string> = { company_name: company.name }
  Object.keys(company.raw).forEach((key) => {
    const normalized = normalizeKey(key)
    if (normalized === 'company' || normalized === 'companyname' || normalized === 'name') return
    const value = company.raw[key]
    if (value === undefined) return
    const mapped = COLUMN_ALIASES[normalized]
    result[mapped ?? key] = value
  })
  return result
}

function websiteOf(company: ParsedCompany): string {
  const key = Object.keys(company.raw).find((k) => normalizeKey(k) === 'website')
  if (!key) return ''
  const value = company.raw[key]
  return value === undefined ? '' : value.trim()
}

const SAMPLE_CSV_HEADERS = [
  'company_name',
  'website',
  'industry',
  'company_city',
  'company_state',
  'company_country',
  'employees',
  'company_linkedin_url',
] as const

const SAMPLE_CSV_ROW = [
  'Position2',
  'position2.com',
  'Marketing Services',
  'Santa Clara',
  'CA',
  'United States',
  '250',
  'https://www.linkedin.com/company/position2',
] as const

function downloadSampleCsv(): void {
  const escape = (value: string): string => {
    if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }
  const csv = `${SAMPLE_CSV_HEADERS.join(',')}\n${SAMPLE_CSV_ROW.map(escape).join(',')}\n`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sample-companies.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

type AnalyzePayload = Partial<AnalyzeResult> & { error?: string; missing?: string[] }

type ViewMode = 'dashboard' | 'import'

const MAX_VISIBLE_ROWS = 100

const inputCls =
  'rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#8A8D99] focus:border-[#1A73E8] focus:outline-none'

const secondaryBtnCls =
  'rounded-xl border border-[#E2E3E5] bg-white px-4 py-2 text-sm font-medium text-[#2C2D33] transition-colors hover:bg-[#F7F8F9]'

const primaryBtnCls =
  'rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:opacity-60'

export default function AccountSignalTrackerClient() {
  const email = useArenaEmailId()
  const [view, setView] = useState<ViewMode>('dashboard')
  const [storedResult, setStoredResult] = useState<StoredSignalsResult | null>(null)
  const [storedError, setStoredError] = useState<string | null>(null)
  const [loadingStored, setLoadingStored] = useState(true)
  const [importList, setImportList] = useState<ParsedCompany[]>([])
  const [typedCompany, setTypedCompany] = useState('')
  const [typedWebsite, setTypedWebsite] = useState('')
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
      const result = await fetchAllStoredSignals(email)
      setStoredResult(result)
    } catch (err) {
      const missing =
        err && typeof err === 'object' && 'missing' in err
          ? (err as { missing?: string[] }).missing
          : undefined
      const status =
        err && typeof err === 'object' && 'status' in err
          ? (err as { status?: number }).status
          : undefined
      if (status === 500 && Array.isArray(missing) && missing.length > 0) {
        setStoredError(
          `Missing environment variable${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Add ${missing.length === 1 ? 'it' : 'them'} to .env.local and restart the server.`
        )
        return
      }
      setStoredError(
        err instanceof Error
          ? err.message
          : 'Could not reach the signal read API. Check your connection and try again.'
      )
    } finally {
      setLoadingStored(false)
    }
  }, [email])

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
          return n === 'company' || n === 'companyname' || n === 'name'
        })
        if (!companyKey) return
        const name = String(row[companyKey]).trim()
        if (!name) return
        const locationParts = [
          ['city', 'companycity'],
          ['state', 'companystate'],
          ['country', 'companycountry'],
        ]
          .map((targets) => {
            const key = keys.find((k) => targets.includes(normalizeKey(k)))
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
          'No company names were found. Expected a column named Company, Company_Name, Company Name or Name.'
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
    const websiteInput = typedWebsite.trim()
    if (rawInput === '' && websiteInput === '') return
    if (rawInput === '' || websiteInput === '') {
      setImportError('Both company name and website are required to add a company.')
      return
    }
    const parts = rawInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p !== '')
    const name = parts[0] ?? ''
    if (name === '') return
    const raw: Record<string, string> = { Company: name, Website: websiteInput }
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
          email,
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
            `Background analysis failed \u2014 missing environment variable${json.missing.length === 1 ? '' : 's'}: ${json.missing.join(', ')}.`
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
          ? ` \u2014 ${json.total_signals} signal${json.total_signals === 1 ? '' : 's'} found`
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
    const invalidRows = importList.filter((c) => c.name.trim() === '' || websiteOf(c) === '')
    if (invalidRows.length > 0) {
      const names = invalidRows
        .slice(0, 5)
        .map((c) => (c.name.trim() !== '' ? c.name : '(unnamed row)'))
        .join(', ')
      setImportError(
        `company_name and website are mandatory. ${invalidRows.length} row${invalidRows.length === 1 ? ' is' : 's are'} missing a website: ${names}${invalidRows.length > 5 ? '\u2026' : ''}. Add a website column or remove these rows before running analysis.`
      )
      return
    }
    setImportError(null)
    const companiesPayload = importList.map((c) => toApiCompany(c))
    const analyzeFileName = fileName !== '' ? fileName : 'imported-companies'
    void runAnalyzeInBackground(companiesPayload, analyzeFileName)
    setView('dashboard')
    setToast('Analysis is running in the background. This may take a few minutes.')
    void fetchAllStored()
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!isDragging) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const visibleRows = importList.slice(0, MAX_VISIBLE_ROWS)

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <header className="sticky top-0 z-40 border-b border-[#E2E3E5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#1A73E8]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#2C2D33]">ABM Signal Tracker</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {view === 'dashboard' ? (
              <>
                <button type="button" onClick={() => setView('import')} className={secondaryBtnCls}>
                  Import Companies
                </button>
                <button
                  type="button"
                  onClick={() => void fetchAllStored()}
                  disabled={loadingStored}
                  className={primaryBtnCls}
                >
                  {loadingStored ? 'Refreshing\u2026' : 'Refresh Dashboard'}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setView('dashboard')} className={secondaryBtnCls}>
                \u2190 Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === 'import' ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6" aria-label="Upload company list">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-[#2C2D33]">Upload a company list</h2>
                  <p className="mt-1 text-xs text-[#8A8D99]">
                    CSV or XLSX with a Company / Company_Name column. Website is required for analysis.
                  </p>
                </div>
                <button type="button" onClick={downloadSampleCsv} className={secondaryBtnCls}>
                  Download sample CSV
                </button>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging ? 'border-[#1A73E8] bg-[#F3F8FE]' : 'border-[#E2E3E5] bg-[#F7F8F9]'
                }`}
                aria-label="Drop a CSV or XLSX file here, or click to browse"
              >
                <p className="text-2xl" aria-hidden="true">{'\u{1F4C4}'}</p>
                <p className="mt-2 text-sm font-medium text-[#2C2D33]">
                  Drag &amp; drop a CSV or XLSX file here, or click to browse
                </p>
                {fileName !== '' && <p className="mt-1 text-xs text-[#1A73E8]">Loaded: {fileName}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files)
                  e.target.value = ''
                }}
                aria-hidden="true"
              />
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="typed-company" className="text-xs font-medium text-[#575A66]">
                    Company name
                  </label>
                  <input
                    id="typed-company"
                    type="text"
                    value={typedCompany}
                    onChange={(e) => setTypedCompany(e.target.value)}
                    placeholder="Acme Inc, City, State, Country"
                    className={`w-64 ${inputCls}`}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="typed-website" className="text-xs font-medium text-[#575A66]">
                    Website
                  </label>
                  <input
                    id="typed-website"
                    type="text"
                    value={typedWebsite}
                    onChange={(e) => setTypedWebsite(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTyped()
                    }}
                    placeholder="acme.com"
                    className={`w-56 ${inputCls}`}
                  />
                </div>
                <button type="button" onClick={handleAddTyped} className={secondaryBtnCls}>
                  Add company
                </button>
              </div>
              {importError && (
                <p className="mt-3 rounded-xl border border-[#F31A1A]/30 bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]" role="alert">
                  {importError}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6" aria-label="Companies to analyze">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#2C2D33]">
                  Companies to analyze ({importList.length})
                </h2>
                <button
                  type="button"
                  onClick={handleSaveAnalyze}
                  disabled={importList.length === 0}
                  className={primaryBtnCls}
                >
                  Save &amp; Run Analysis
                </button>
              </div>
              {importList.length === 0 ? (
                <p className="mt-4 text-sm text-[#8A8D99]">No companies added yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E3E5] text-xs uppercase tracking-wide text-[#8A8D99]">
                        <th className="px-3 py-2 font-medium">Company</th>
                        <th className="px-3 py-2 font-medium">Website</th>
                        <th className="px-3 py-2 font-medium">Location</th>
                        <th className="px-3 py-2 font-medium" aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((c) => (
                        <tr key={c.id} className="border-b border-[#F0F1F3]">
                          <td className="px-3 py-2 font-medium text-[#2C2D33]">{c.name}</td>
                          <td className="px-3 py-2 text-[#575A66]">{websiteOf(c) !== '' ? websiteOf(c) : '\u2014'}</td>
                          <td className="px-3 py-2 text-[#575A66]">{c.location !== '' ? c.location : '\u2014'}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemove(c.id)}
                              className="text-xs font-medium text-[#F31A1A] hover:underline"
                              aria-label={`Remove ${c.name}`}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importList.length > MAX_VISIBLE_ROWS && (
                    <p className="mt-2 text-xs text-[#8A8D99]">
                      Showing first {MAX_VISIBLE_ROWS} of {importList.length} companies. All will be analyzed.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : loadingStored ? (
          <DashboardSkeleton />
        ) : storedError ? (
          <div className="rounded-2xl border border-[#F31A1A]/40 bg-white p-10 text-center" role="alert">
            <p className="text-3xl" aria-hidden="true">{'\u26A0\uFE0F'}</p>
            <p className="mt-3 text-sm font-medium text-[#2C2D33]">Could not load stored signals</p>
            <p className="mt-1 text-xs text-[#8A8D99]">{storedError}</p>
            <button type="button" onClick={() => void fetchAllStored()} className={`mt-4 ${primaryBtnCls}`}>
              Retry
            </button>
          </div>
        ) : storedResult ? (
          <StoredSignalsDashboard result={storedResult} onRefresh={fetchAllStored} />
        ) : (
          <div className="rounded-2xl border border-[#E2E3E5] bg-white p-10 text-center">
            <p className="text-3xl" aria-hidden="true">{'\u{1F4E1}'}</p>
            <p className="mt-3 text-sm font-medium text-[#2C2D33]">No signals yet</p>
            <p className="mt-1 text-xs text-[#8A8D99]">
              Import a company list to start tracking funding, C-suite, product and partnership signals.
            </p>
            <button type="button" onClick={() => setView('import')} className={`mt-4 ${primaryBtnCls}`}>
              Import Companies
            </button>
          </div>
        )}
      </main>

      {toast && (
        <div
          className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-[#E2E3E5] bg-white p-4 shadow-[0_4px_16px_rgba(44,45,51,0.12)]"
          role="status"
        >
          <p className="text-sm text-[#2C2D33]">{toast}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="ml-auto text-xs font-semibold text-[#8A8D99] hover:text-[#2C2D33]"
          >
            {'\u2715'}
          </button>
        </div>
      )}
    </div>
  )
}
