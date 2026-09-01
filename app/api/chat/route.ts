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
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  let context = typeof body.context === 'string' ? body.context : ''
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS)
  }

  const system = [
    'You are Signal Assistant, a concise analyst for an ABM (account-based marketing) signal tracking dashboard.',
    'Answer questions using ONLY the JSON data provided below. Be specific: name companies, counts, signal types, severities, and dates when relevant.',
    'If the data does not contain the answer, say so clearly instead of guessing.',
    context !== '' ? `DATA (JSON):\n${context}` : 'DATA: no signal data is available right now.',
  ].join('\n\n')

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Chat provider responded with status ${upstream.status}` },
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
          if (isRecord(message)) {
            const content = message.content
            if (typeof content === 'string') reply = content.trim()
          }
        }
      }
    }

    if (reply === '') {
      return NextResponse.json(
        { error: 'Chat provider returned an empty response' },
        { status: 502 }
      )
    }

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ error: 'Failed to reach the chat provider' }, { status: 502 })
  }
}
