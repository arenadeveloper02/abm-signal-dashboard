"use client"

import { useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { ParsedCompany } from '@/lib/types'

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '')
}

export default function AccountSignalTrackerClient() {
  const [companies, setCompanies] = useState<ParsedCompany[]>([])
  const [fileName, setFileName] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
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
      setAnalyzed(false)
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

  const handleAnalyze = () => {
    if (companies.length === 0) return
    setAnalyzed(true)
  }

  const handleRefresh = () => {
    setError(null)
  }

  const visibleCompanies = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, search])

  const subtitle = analyzed
    ? `Analysis loaded for ${companies.length} companies from ${fileName}`
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
              {companies.length} companies ready to import · {fileName}
            </p>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={companies.length === 0}
              className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Analyze Companies
            </button>
          </div>

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
                        <span className="ml-2 text-xs">({company.location})</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(company.id)}
                      className="rounded border px-3 py-1 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
              {visibleCompanies.length === 0 && (
                <li className="px-4 py-6 text-center text-sm">No companies match your search.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
