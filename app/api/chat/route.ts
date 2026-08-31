import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_CONTEXT_CHARS = 300000
const MAX_HISTORY = 12

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

function extractReply(raw: unknown): string | null {
  if (!isRecord(raw)) return null
  const choices = raw.choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const first = choices[0]
  if (!isRecord(first)) return null
  const message = first.message
  if (!isRecord(message)) return null
  const content = message.content
  return typeof content === 'string' && content.trim() !== '' ? content : null
}

const SYSTEM_PROMPT =
  'You are an assistant for the ABM Signal Tracker dashboard. Answer questions ONLY using the provided signal data context (companies, signals, signal families, alerts, categories, and totals). If the answer is not present in the data, clearly say the data does not contain that information. Be concise and factual. Do not invent companies, numbers, dates, or signals that are not in the context.'

export async function POST(request: Request) {
  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const messages = isRecord(body) ? parseMessages(body.messages) : []
  let context = isRecord(body) && typeof body.context === 'string' ? body.context : ''
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS)
  }

  if (messages.length === 0) {
    return NextResponse.json({ reply: 'Please ask a question about your signal data.' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.length === 0) {
    return NextResponse.json({
      reply: 'Chat is not configured (missing API key). Add OPENAI_API_KEY to the environment to enable the assistant.',
    })
  }

  const model = process.env.OPENAI_MODEL && process.env.OPENAI_MODEL.length > 0 ? process.env.OPENAI_MODEL : 'gpt-4o-mini'

  const systemContent =
    context.length > 0
      ? `${SYSTEM_PROMPT}\n\nSIGNAL DATA CONTEXT (JSON):\n${context}`
      : `${SYSTEM_PROMPT}\n\nNOTE: No signal data context was provided for this request. Tell the user the data could not be loaded and suggest they retry.`

  try {
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{ role: 'system', content: systemContent }, ...messages],
      }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json({
        reply: `The chat service returned an error (status ${upstream.status}). Please try again shortly.`,
      })
    }

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      raw = null
    }

    const reply = extractReply(raw)
    if (reply === null) {
      return NextResponse.json({
        reply: 'Sorry, I could not generate an answer right now. Please try again.',
      })
    }

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({
      reply: 'Could not reach the chat service. Please check your connection and try again.',
    })
  }
}
