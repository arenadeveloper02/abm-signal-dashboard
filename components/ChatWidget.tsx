"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CountsByAlert,
  StoredCompany,
  StoredDashboardTotals,
  StoredSignal,
  StoredSignalsCounts,
} from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatApiResponse {
  reply?: string
  error?: string
}

interface AllSignalsPayload {
  total?: number
  returned?: number
  signals?: StoredSignal[]
  companies?: StoredCompany[]
  counts_by_family?: StoredSignalsCounts
  counts_by_alert?: CountsByAlert
  counts_by_category?: Record<string, number>
  dashboard?: StoredDashboardTotals
  error?: string
}

const MAX_CONTEXT_CHARS = 350000
const PAGE_LIMIT = 1000
const MAX_PAGES = 20

function buildContext(first: AllSignalsPayload | null, signals: StoredSignal[]): string {
  const companies = (first?.companies ?? []).map((c) => ({
    name: c.company_name,
    industry: c.industry,
    hq: c.hq,
    website: c.website,
    total: c.total,
    by_family: c.by_family,
  }))
  const compactSignals = signals.map((s) => ({
    company: (s.company_name ?? '').trim() !== '' ? s.company_name : s.company,
    family: s.signal_family,
    type: s.signal_type,
    confidence: s.confidence,
    date: (s.announcement_date ?? '').trim() !== '' ? s.announcement_date : s.run_date,
    summary: (s.summary ?? '').slice(0, 300),
    source: s.source_name,
  }))
  const ctx = {
    totals: {
      total_signals: signals.length,
      total_companies: companies.length,
    },
    dashboard: first?.dashboard ?? {},
    counts_by_family: first?.counts_by_family ?? {},
    counts_by_alert: first?.counts_by_alert ?? {},
    counts_by_category: first?.counts_by_category ?? {},
    companies,
    signals: compactSignals,
  }
  let str = JSON.stringify(ctx)
  if (str.length > MAX_CONTEXT_CHARS) {
    str = str.slice(0, MAX_CONTEXT_CHARS)
  }
  return str
}

function ChatIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const contextRef = useRef<string | null>(null)
  const loadPromiseRef = useRef<Promise<string> | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages, sending, open])

  const loadContext = useCallback((): Promise<string> => {
    if (contextRef.current !== null) return Promise.resolve(contextRef.current)
    if (loadPromiseRef.current !== null) return loadPromiseRef.current
    const promise = (async () => {
      setLoadingData(true)
      setDataError(null)
      try {
        const allSignals: StoredSignal[] = []
        let first: AllSignalsPayload | null = null
        let offset = 0
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await fetch('/api/all-stored-signals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ limit: PAGE_LIMIT, offset, includeSignals: true }),
          })
          let json: AllSignalsPayload = {}
          try {
            json = (await res.json()) as AllSignalsPayload
          } catch {
            json = {}
          }
          if (!res.ok) {
            throw new Error(json.error ?? `Signal data request failed with status ${res.status}`)
          }
          if (json.error) {
            throw new Error(json.error)
          }
          if (first === null) first = json
          const batch = Array.isArray(json.signals) ? json.signals : []
          allSignals.push(...batch)
          const total = typeof json.total === 'number' ? json.total : allSignals.length
          offset += PAGE_LIMIT
          if (batch.length === 0 || allSignals.length >= total) break
        }
        const ctx = buildContext(first, allSignals)
        contextRef.current = ctx
        return ctx
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not load signal data.'
        setDataError(message)
        throw new Error(message)
      } finally {
        setLoadingData(false)
        loadPromiseRef.current = null
      }
    })()
    loadPromiseRef.current = promise
    return promise
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && contextRef.current === null) {
      void loadContext().catch(() => undefined)
    }
  }

  const handleSend = async () => {
    const question = input.trim()
    if (question === '' || sending) return
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    try {
      let ctx = ''
      try {
        ctx = await loadContext()
      } catch {
        ctx = ''
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, context: ctx }),
      })
      let json: ChatApiResponse = {}
      try {
        json = (await res.json()) as ChatApiResponse
      } catch {
        json = {}
      }
      const reply =
        json.reply ?? json.error ?? 'Sorry, I could not get an answer right now. Please try again.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Could not reach the chat API. Please try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white shadow-[0_8px_32px_rgba(44,45,51,0.16)]"
          role="dialog"
          aria-label="Signal data chat assistant"
        >
          <div className="flex items-center gap-2 bg-[#1A73E8] px-4 py-3">
            <span className="text-white" aria-hidden="true">
              <ChatIcon />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Signal Assistant</p>
              <p className="truncate text-[11px] text-white/80">Ask about your ABM signal data</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="ml-auto rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15"
            >
              <CloseIcon />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#F7F8F9] px-4 py-3">
            {loadingData && (
              <div className="rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-xs text-[#575A66]">
                Loading data\u2026 fetching all stored signals for context.
              </div>
            )}
            {dataError !== null && !loadingData && (
              <div className="rounded-xl border border-[#FAA3A3] bg-[#FFF3F3] px-3 py-2 text-xs text-[#921010]">
                {dataError} Answers may be limited until data loads.
              </div>
            )}
            {messages.length === 0 && !loadingData && (
              <div className="rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-xs text-[#575A66]">
                Hi! Ask me anything about your tracked companies and signals \u2014 for example
                \u201cWhich companies raised funding recently?\u201d or \u201cHow many high alerts are
                there?\u201d
              </div>
            )}
            {messages.map((m, i) => (
              <div key={`msg-${i}`} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#1A73E8] px-3 py-2 text-sm text-white'
                      : 'max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33]'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#8A8D99]">
                  Thinking\u2026
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-[#E2E3E5] bg-white px-3 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSend()
              }}
              placeholder="Ask about your signals\u2026"
              aria-label="Chat message"
              className="min-w-0 flex-1 rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || input.trim() === ''}
              className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:opacity-60"
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={open ? 'Close signal data chat' : 'Open signal data chat'}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1A73E8] text-white shadow-[0_4px_16px_rgba(44,45,51,0.24)] transition-colors hover:bg-[#155CBA]"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  )
}
