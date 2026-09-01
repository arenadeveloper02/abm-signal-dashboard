import { NextResponse } from 'next/server'
import { resolveRequestEmail } from '@/lib/resolve-request-email'
import { isRecord, jsonError, postArenaWorkflow } from '@/lib/vimi-upstream'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_URL =
  'https://agent.thearena.ai/api/v2/workflows/e661cbf6-ec5c-4de6-9547-59956fbf3309/execute'
const DEFAULT_KEY = 'sk-sim-WcRnFtGpPEJfPkYcp2c_xLQmByelfYlV'

function getUrl(): string {
  const fromEnv = process.env.ABM_VIMI_HISTORY_BY_ID_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_URL
}

function getKey(): string {
  const dedicated = process.env.ABM_VIMI_HISTORY_BY_ID_API_KEY
  if (dedicated && dedicated.length > 0) return dedicated
  return DEFAULT_KEY
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function asList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []
  for (const key of ['messages', 'turns', 'history', 'items', 'data', 'rows', 'results', 'pairs']) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function normalizeMessages(payload: unknown): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const item of asList(payload)) {
    if (!isRecord(item)) continue

    const role = item.role
    const content = item.content ?? item.message ?? item.text
    if ((role === 'user' || role === 'assistant') && typeof content === 'string' && content.trim() !== '') {
      out.push({ role, content: content.trim() })
      continue
    }

    const input = item.input ?? item.question ?? item.user
    const output = item.output ?? item.answer ?? item.assistant ?? item.reply
    if (typeof input === 'string' && input.trim() !== '') {
      out.push({ role: 'user', content: input.trim() })
    }
    if (typeof output === 'string' && output.trim() !== '') {
      out.push({ role: 'assistant', content: output.trim() })
    }
  }
  return out
}

export async function POST(request: Request) {
  const apiKey = getKey()
  if (apiKey === '') {
    return jsonError('Vimi history-by-id API not configured', 500, {
      missing: ['ABM_VIMI_HISTORY_BY_ID_API_KEY'],
    })
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await request.json()
    if (isRecord(parsed)) body = parsed
  } catch {
    body = {}
  }

  const email = await resolveRequestEmail(body)
  const id = typeof body.id === 'string' ? body.id.trim() : ''

  if (email === '') {
    return jsonError('email is required', 400)
  }
  if (id === '') {
    return jsonError('id is required', 400)
  }

  const result = await postArenaWorkflow({
    url: getUrl(),
    apiKey,
    input: { email, id },
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Upstream error', status: result.status, detail: result.detail },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
    )
  }

  const messages = normalizeMessages(result.payload)
  return NextResponse.json({ id, messages, raw: result.payload })
}
