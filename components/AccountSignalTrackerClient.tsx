"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { AnalyzeResult, ParsedCompany, StoredSignalsResult } from '@/lib/types'
import { fetchAllStoredSignals } from '@/lib/fetch-all-stored-signals'
import StoredSignalsDashboard from '@/components/StoredSignalsDashboard'
import { DashboardSkeleton } from '@/components/Skeletons'

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
      const result = await fetchAllStoredSignals()
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

  const visibleRows = importList.slice(0, MAX_VISIBLE_ROWS)

  return (
    <div className="min-h-screen bg-[#F7F8F9]">
      <header className="sticky top-0 z-40 border-b border-[#E2E3E5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#1A73E8]" aria-hidden="true" />
            <h1 className="text-base font-semibold text-[#2C2D33]">ABM Signal Tracker</h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {view === 'dashboard' ? (
              <>
                <button
                  type="button"
                  onClick={() => void fetchAllStored()}
                  disabled={loadingStored}
                  aria-label="Refresh dashboard"
                  className={primaryBtnCls}
                >
                  {loadingStored ? 'Refreshing\u2026' : 'Refresh Dashboard'}
                </button>
                <button type="button" onClick={() => setView('import')} className={secondaryBtnCls}>
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

      {toast && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-[#B7D4F8] bg-[#F3F8FE] px-4 py-3 text-sm text-[#0A2E5D]"
          >
            <p className="flex-1">{toast}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="text-xs font-medium text-[#1A73E8] transition-colors hover:text-[#0A2E5D]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        {view === 'dashboard' ? (
          loadingStored ? (
            <DashboardSkeleton />
          ) : storedError ? (
            <div role="alert" className="rounded-2xl border border-[#F31A1A]/40 bg-white p-10 text-center">
              <p className="text-3xl" aria-hidden="true">\u26A0\uFE0F</p>
              <p className="mt-3 text-sm font-medium text-[#2C2D33]">Could not load stored signals</p>
              <p className="mt-1 text-xs text-[#6D717F]">{storedError}</p>
              <button type="button" onClick={() => void fetchAllStored()} className={`mt-4 ${primaryBtnCls}`}>
                Retry
              </button>
            </div>
          ) : storedResult ? (
            <StoredSignalsDashboard result={storedResult} />
          ) : null
        ) : (
          <div className="grid gap-6">
            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#2C2D33]">Import Companies</h2>
                  <p className="mt-1 text-sm text-[#6D717F]">
                    Upload a CSV or XLSX file with your target account list, or add companies manually below.
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
                <p className="text-sm font-medium text-[#2C2D33]">Drag and drop a CSV or XLSX file here</p>
                <p className="mt-1 text-xs text-[#6D717F]">or click to browse your computer</p>
                {fileName !== '' && <p className="mt-2 text-xs font-medium text-[#1A73E8]">Loaded: {fileName}</p>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  aria-label="Upload company list file"
                  className="hidden"
                  onChange={(e) => {
                    handleFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#E2E3E5] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#2C2D33]">Add a company manually</h2>
              <p className="mt-1 text-sm text-[#6D717F]">
                Enter a company name (optionally followed by city, state and country separated by commas) and its website.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={typedCompany}
                  onChange={(e) => setTypedCompany(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTyped()
                  }}
                  placeholder="Company name, City, State, Country"
                  aria-label="Company name"
                  className={`w-72 ${inputCls}`}
                />
                <input
                  type="text"
                  value={typedWebsite}
                  onChange={(e) => setTypedWebsite(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTyped()
                  }}
                  placeholder="website"
                  aria-label="Company website"
                  className={`w-56 ${inputCls}`}
                />
                <button type="button" onClick={handleAddTyped} className={secondaryBtnCls}>
                  Add
                </button>
              </div>
            </section>

            {importError && (
              <div role="alert" className="rounded-xl border border-[#F8B9B9] bg-[#FEF3F3] px-4 py-3 text-sm text-[#8F0F0F]">
                {importError}
              </div>
            )}

            <section className="rounded-2xl border border-[#E2E3E5] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E3E5] px-6 py-4">
                <h2 className="text-sm font-semibold text-[#2C2D33]">Companies to analyze ({importList.length})</h2>
                <button
                  type="button"
                  onClick={handleSaveAnalyze}
                  disabled={importList.length === 0}
                  className={primaryBtnCls}
                >
                  Save &amp; Analyze
                </button>
              </div>
              {importList.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-[#6D717F]">
                  No companies added yet. Upload a file or add a company manually to get started.
                </p>
              ) : (
                <div className="max-h-[50vh] overflow-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Company
                        </th>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Location
                        </th>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Website
                        </th>
                        <th className="sticky top-0 z-10 border-b border-[#E2E3E5] bg-[#F7F8F9] px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-[#6D717F]">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((c) => (
                        <tr key={c.id} className="border-b border-[#F0F1F3] last:border-b-0">
                          <td className="px-6 py-3 font-medium text-[#2C2D33]">{c.name}</td>
                          <td className="px-6 py-3 text-[#6D717F]">{c.location === '' ? '\u2014' : c.location}</td>
                          <td className="px-6 py-3 text-[#6D717F]">{websiteOf(c) === '' ? '\u2014' : websiteOf(c)}</td>
                          <td className="px-6 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemove(c.id)}
                              aria-label={`Remove ${c.name}`}
                              className="text-xs font-medium text-[#F31A1A] transition-colors hover:text-[#B00E0E]"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importList.length > MAX_VISIBLE_ROWS && (
                    <p className="px-6 py-3 text-xs text-[#6D717F]">
                      Showing first {MAX_VISIBLE_ROWS} of {importList.length} companies. All companies will be analyzed.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
