import { NextResponse } from 'next/server'
import { resolveRequestEmail } from '@/lib/resolve-request-email'
import { isRecord, jsonError, postArenaWorkflow } from '@/lib/vimi-upstream'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DEFAULT_URL =
  'https://agent.thearena.ai/api/workflows/a915409e-92b5-4abc-9c5f-0f7347555cbc/execute'
const DEFAULT_KEY = 'sk-sim-i2OrYFkBFQfa10do7SfkJde-4GzFejOt'

function getUrl(): string {
  const fromEnv = process.env.ABM_VIMI_CHAT_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_URL
}

function getKey(): string {
  const dedicated = process.env.ABM_VIMI_CHAT_API_KEY
  if (dedicated && dedicated.length > 0) return dedicated
  return DEFAULT_KEY
}

function extractReply(payload: unknown): string {
  if (typeof payload === 'string') return payload.trim()
  if (!isRecord(payload)) return ''
  for (const key of ['reply', 'answer', 'output', 'message', 'response', 'text']) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  if (isRecord(payload.data)) return extractReply(payload.data)
  return ''
}

function extractId(payload: unknown): string {
  if (!isRecord(payload)) return ''
  for (const key of ['id', 'session_id', 'sessionId', 'chat_id', 'chatId']) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  if (isRecord(payload.data)) return extractId(payload.data)
  if (isRecord(payload.session)) return extractId(payload.session)
  return ''
}

export async function POST(request: Request) {
  const apiKey = getKey()
  if (apiKey === '') {
    return jsonError('Vimi chat API not configured', 500, { missing: ['ABM_VIMI_CHAT_API_KEY'] })
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await request.json()
    if (isRecord(parsed)) body = parsed
  } catch {
    body = {}
  }

  const email = await resolveRequestEmail(body)
  const question =
    typeof body.input === 'string'
      ? body.input.trim()
      : typeof body.message === 'string'
        ? body.message.trim()
        : ''
  const id = typeof body.id === 'string' ? body.id.trim() : ''

  if (email === '') {
    return jsonError('email is required', 400)
  }
  if (question === '') {
    return jsonError('input is required', 400)
  }

  const result = await postArenaWorkflow({
    url: getUrl(),
    apiKey,
    input: { email, input: question, id },
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Upstream error', status: result.status, detail: result.detail },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
    )
  }

  if (isRecord(result.payload) && typeof result.payload.error === 'string') {
    return NextResponse.json({ error: result.payload.error }, { status: 200 })
  }

  const reply = extractReply(result.payload)
  const sessionId = extractId(result.payload)

  return NextResponse.json({
    reply: reply !== '' ? reply : 'Sorry, I could not get an answer right now. Please try again.',
    id: sessionId,
    raw: result.payload,
  })
}
