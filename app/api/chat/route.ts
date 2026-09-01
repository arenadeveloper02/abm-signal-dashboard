import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseMessages(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return []
  const out: ChatTurn[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    const role = item.role
    const content = item.content
    if (
      (role === 'user' || role === 'assistant') &&
      typeof content === 'string' &&
      content.trim() !== ''
    ) {
      out.push({ role, content })
    }
  }
  return out.slice(-40)
}

function buildSystemPrompt(context: string): string {
  const base =
    'You are the ABM Signal Assistant for an account-based marketing dashboard. ' +
    'Answer questions about tracked companies and their signals (funding, C-suite changes, product launches, partnerships). ' +
    'Be concise and factual. When the data does not contain the answer, say so clearly instead of guessing.'
  if (context.trim() === '') {
    return `${base}\n\nNo signal data context was provided for this conversation.`
  }
  return `${base}\n\nHere is the current dashboard data as JSON (it may be truncated):\n${context}`
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
  return typeof content === 'string' ? content : ''
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await request.json()
    if (isRecord(parsed)) body = parsed
  } catch {
    body = {}
  }

  const messages = parseMessages(body.messages)
  const context = typeof body.context === 'string' ? body.context : ''

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No message provided.' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY ?? ''
  if (apiKey === '') {
    return NextResponse.json(
      {
        error:
          'The chat assistant is not configured. Set OPENAI_API_KEY on the server to enable answers about your signal data.',
      },
      { status: 200 }
    )
  }

  const model = process.env.OPENAI_MODEL && process.env.OPENAI_MODEL.length > 0 ? process.env.OPENAI_MODEL : 'gpt-4o-mini'

  try {
    const upstream = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: 'system', content: buildSystemPrompt(context) }, ...messages],
      }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Chat API responded with status ${upstream.status}. Please try again.` },
        { status: 200 }
      )
    }

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      raw = null
    }

    const reply = extractReply(raw)
    if (reply.trim() === '') {
      return NextResponse.json(
        { error: 'The chat model returned an empty response. Please try again.' },
        { status: 200 }
      )
    }

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the chat API. Please try again.' },
      { status: 200 }
    )
  }
}
