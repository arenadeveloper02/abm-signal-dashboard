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
    if (isRecord(parsed)) body = parsed
  } catch {
    body = {}
  }

  const messages = parseMessages(body.messages)
  const context = parseContext(body.context)

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  const systemPrompt =
    'You are Signal Assistant, a helpful analyst for an ABM (account-based marketing) signal dashboard. ' +
    'Answer questions using ONLY the JSON signal data provided below. Be concise and specific: name companies, counts, dates and signal types when relevant. ' +
    'If the data does not contain the answer, say so plainly.' +
    (context !== '' ? `\n\nSIGNAL DATA (JSON):\n${context}` : '\n\nNo signal data is currently available.')

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
        max_tokens: 700,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      let detail = ''
      try {
        detail = (await upstream.text()).slice(0, 300)
      } catch {
        detail = ''
      }
      return NextResponse.json(
        { error: `Chat model request failed (status ${upstream.status}). ${detail}`.trim() },
        { status: 502 }
      )
    }

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      raw = null
    }

    let reply = ''
    if (isRecord(raw)) {
      const choices = raw.choices
      if (Array.isArray(choices) && choices.length > 0) {
        const first: unknown = choices[0]
        if (isRecord(first)) {
          const message = first.message
          if (isRecord(message) && typeof message.content === 'string') {
            reply = message.content.trim()
          }
        }
      }
    }

    if (reply === '') {
      return NextResponse.json({ error: 'The chat model returned an empty response.' }, { status: 502 })
    }

    return NextResponse.json({ reply })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error'
    return NextResponse.json({ error: `Could not reach the chat model: ${detail}` }, { status: 502 })
  }
}
