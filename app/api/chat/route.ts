import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CONTEXT_CHARS = 300000
const MAX_HISTORY = 40
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

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

function extractReply(raw: unknown): string {
  if (!isRecord(raw)) return ''
  const choices = raw.choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const first: unknown = choices[0]
  if (!isRecord(first)) return ''
  const message = first.message
  if (!isRecord(message)) return ''
  const content = message.content
  return typeof content === 'string' ? content.trim() : ''
}

export async function POST(request: Request) {
  const apiKey = getApiKey()

  if (apiKey === '') {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
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
    'You are Signal Assistant, a helpful analyst for an ABM (account-based marketing) signal tracking dashboard. ' +
    'Answer questions about the tracked companies and their signals (funding, C-suite changes, product launches, partnerships) ' +
    'using ONLY the dashboard data provided below when it is available. Be concise and specific: cite company names, ' +
    'signal types, confidence levels and dates from the data. If the data does not contain the answer, say so plainly. ' +
    'Do not invent companies or signals.' +
    (context !== '' ? `\n\nDashboard data (JSON):\n${context}` : '\n\nNo dashboard data is currently available.')

  try {
    const upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
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
      let detail = ''
      if (isRecord(raw) && isRecord(raw.error) && typeof raw.error.message === 'string') {
        detail = ` \u2014 ${raw.error.message.slice(0, 200)}`
      }
      return NextResponse.json(
        { error: `Chat API responded with status ${upstream.status}${detail}` },
        { status: 502 }
      )
    }

    const reply = extractReply(raw)
    if (reply === '') {
      return NextResponse.json({ error: 'Chat API returned an empty reply.' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error'
    return NextResponse.json(
      { error: `Could not reach the chat API: ${detail}` },
      { status: 502 }
    )
  }
}
