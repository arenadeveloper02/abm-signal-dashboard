'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useOptionalArenaEmailId } from '@/components/arena-email-provider'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface HistorySession {
  id: string
  title: string
  created_at: string
}

interface ChatApiResponse {
  reply?: string
  id?: string
  error?: string
}

interface HistoryApiResponse {
  sessions?: HistorySession[]
  error?: string
}

interface HistoryByIdApiResponse {
  messages?: ChatMessage[]
  error?: string
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

function formatSessionDate(value: string): string {
  if (value.trim() === '') return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ChatWidget() {
  const email = useOptionalArenaEmailId()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<HistorySession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingTranscript, setLoadingTranscript] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTop = list.scrollHeight
  }, [messages, sending, open, loadingTranscript])

  const loadSessions = useCallback(async (): Promise<void> => {
    if (!email) {
      setSessions([])
      return
    }
    setLoadingSessions(true)
    setError(null)
    try {
      const res = await fetch('/api/vimi/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      let json: HistoryApiResponse = {}
      try {
        json = (await res.json()) as HistoryApiResponse
      } catch {
        json = {}
      }
      if (!res.ok) {
        setError(json.error ?? `Could not load chat history (${res.status}).`)
        setSessions([])
        return
      }
      setSessions(Array.isArray(json.sessions) ? json.sessions : [])
    } catch {
      setError('Could not reach the chat history API.')
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }, [email])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) {
      void loadSessions()
    }
  }

  const handleNewChat = () => {
    setSessionId('')
    setMessages([])
    setError(null)
  }

  const handleSelectSession = async (id: string) => {
    if (!email || id === '' || loadingTranscript) return
    setSessionId(id)
    setLoadingTranscript(true)
    setError(null)
    setMessages([])
    try {
      const res = await fetch('/api/vimi/history-by-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, id }),
      })
      let json: HistoryByIdApiResponse = {}
      try {
        json = (await res.json()) as HistoryByIdApiResponse
      } catch {
        json = {}
      }
      if (!res.ok) {
        setError(json.error ?? `Could not load this chat (${res.status}).`)
        return
      }
      setMessages(Array.isArray(json.messages) ? json.messages : [])
    } catch {
      setError('Could not reach the chat transcript API.')
    } finally {
      setLoadingTranscript(false)
    }
  }

  const handleSend = async () => {
    const question = input.trim()
    if (question === '' || sending) return
    if (!email) {
      setError('Sign in with an email to use chat.')
      return
    }

    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/vimi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          input: question,
          id: sessionId,
        }),
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

      const nextId = typeof json.id === 'string' ? json.id.trim() : ''
      if (nextId !== '') {
        setSessionId(nextId)
        void loadSessions()
      }
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
          className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[560px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#E2E3E5] bg-white shadow-[0_8px_32px_rgba(44,45,51,0.16)]"
          role="dialog"
          aria-label="Signal data chat assistant"
        >
          <aside className="flex w-[180px] shrink-0 flex-col border-r border-[#E2E3E5] bg-[#F7F8F9]">
            <div className="border-b border-[#E2E3E5] p-3">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full rounded-xl bg-[#1A73E8] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#155CBA]"
              >
                New chat
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {loadingSessions && (
                <p className="px-2 py-2 text-[11px] text-[#8A8D99]">Loading chats…</p>
              )}
              {!loadingSessions && sessions.length === 0 && (
                <p className="px-2 py-2 text-[11px] text-[#8A8D99]">No past chats yet.</p>
              )}
              {sessions.map((s) => {
                const active = s.id === sessionId
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => void handleSelectSession(s.id)}
                    className={`w-full rounded-xl px-2.5 py-2 text-left transition-colors ${
                      active ? 'bg-white shadow-sm ring-1 ring-[#E2E3E5]' : 'hover:bg-white/80'
                    }`}
                  >
                    <p className="truncate text-xs font-medium text-[#2C2D33]">{s.title}</p>
                    {s.created_at !== '' && (
                      <p className="mt-0.5 truncate text-[10px] text-[#8A8D99]">
                        {formatSessionDate(s.created_at)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2 bg-[#1A73E8] px-4 py-3">
              <span className="text-white" aria-hidden="true">
                <ChatIcon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Signal Assistant</p>
                <p className="truncate text-[11px] text-white/80">
                  {sessionId !== '' ? 'Continuing chat' : 'New chat'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/15"
              >
                <CloseIcon />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#F7F8F9] px-4 py-3">
              {error !== null && (
                <div className="rounded-xl border border-[#FAA3A3] bg-[#FFF3F3] px-3 py-2 text-xs text-[#921010]">
                  {error}
                </div>
              )}
              {loadingTranscript && (
                <div className="rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-xs text-[#575A66]">
                  Loading conversation…
                </div>
              )}
              {!loadingTranscript && messages.length === 0 && (
                <div className="rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-xs text-[#575A66]">
                  Hi! Ask me anything about your tracked companies and signals — for example
                  “Which companies raised funding recently?” or “How many high alerts are
                  there?”
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={`msg-${i}-${m.role}`}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
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
                    Thinking…
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
                placeholder="Ask about your signals…"
                aria-label="Chat message"
                className="min-w-0 flex-1 rounded-xl border border-[#E2E3E5] bg-white px-3 py-2 text-sm text-[#2C2D33] placeholder-[#A7AAB2] focus:border-[#1A73E8] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || input.trim() === '' || !email}
                className="rounded-xl bg-[#1A73E8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#155CBA] disabled:opacity-60"
              >
                Send
              </button>
            </div>
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
