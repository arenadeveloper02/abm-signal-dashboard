import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CONTEXT_CHARS = 300000
const MAX_HISTORY = 40

function getApiKey(): string {
  const fromEnv = process.env.OPENAI_API_KEY
  return fromEnv && fromEnv.length > 0 ? fromEnv : ''
}

interface IncomingMessage {
  role: 'user' | 'assistant'
  content: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMessages(raw: unknown): IncomingMessage[] {
  if (!Array.isArray(raw)) return []
  const out: IncomingMessage[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const role = item.role
    const content = item.content
    if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim() !== '') {
      out.push({ role, content })
    }
  }
  return out.slice(-MAX_HISTORY)
}

function parseContext(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.length > MAX_CONTEXT_CHARS ? raw.slice(0, MAX_CONTEXT_CHARS) : raw
}

interface OpenAiChoice {
  message?: {
    content?: string
  }
}

interface OpenAiResponse {
  choices?: OpenAiChoice[]
  error?: {
    message?: string
  }
}

export async function POST(request: Request) {
  const apiKey = getApiKey()

  if (apiKey === '') {
    return NextResponse.json(
      { error: 'Chat is not configured. Add OPENAI_API_KEY to the server environment.' },
      { status: 500 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await request.json()
    if (isRecord(parsed)) {
      body = parsed
    }
  } catch {
    body = {}
  }

  const messages = parseMessages(body.messages)
  const context = parseContext(body.context)

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 })
  }

  const systemPrompt =
    'You are the ABM Signal Tracker assistant. Answer questions about the tracked companies and their signals ' +
    '(funding, C-suite changes, product launches, partnerships and related activity) using ONLY the JSON data ' +
    'context provided below. Be concise and specific: cite company names, signal types, confidence levels and ' +
    'dates from the data. If the data does not contain the answer, say so plainly instead of guessing.\n\n' +
    (context !== '' ? `DATA CONTEXT (JSON):\n${context}` : 'DATA CONTEXT: not available for this request.')

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.2,
        max_tokens: 800,
      }),
      cache: 'no-store',
    })

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      raw = null
    }

    if (!upstream.ok) {
      const upstreamError =
        isRecord(raw) && isRecord(raw.error) && typeof raw.error.message === 'string'
          ? raw.error.message
          : `Chat provider responded with status ${upstream.status}`
      return NextResponse.json({ error: upstreamError }, { status: 502 })
    }

    if (raw === null || !isRecord(raw)) {
      return NextResponse.json({ error: 'Unexpected response from the chat provider.' }, { status: 502 })
    }

    const data = raw as OpenAiResponse
    const reply =
      Array.isArray(data.choices) &&
      data.choices.length > 0 &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === 'string'
        ? data.choices[0].message.content.trim()
        : ''

    if (reply === '') {
      return NextResponse.json({ error: 'The chat provider returned an empty reply.' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error'
    return NextResponse.json({ error: `Could not reach the chat provider: ${detail}` }, { status: 502 })
  }
}
