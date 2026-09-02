import { NextResponse } from 'next/server'
import { resolveRequestEmail } from '@/lib/resolve-request-email'
import { isRecord, jsonError, postArenaWorkflow } from '@/lib/vimi-upstream'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_URL =
  'https://agent.thearena.ai/api/workflows/aab24b1f-59af-4eda-8d76-5cbea1719d36/execute'
const DEFAULT_KEY = 'sk-sim-Zl03tCZvY88FeOFnCYJHtsArNNDGmPeB'

function getUrl(): string {
  const fromEnv = process.env.ABM_VIMI_HISTORY_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_URL
}

function getKey(): string {
  const dedicated = process.env.ABM_VIMI_HISTORY_API_KEY
  if (dedicated && dedicated.length > 0) return dedicated
  return DEFAULT_KEY
}

interface HistoryItem {
  id: string
  title: string
  created_at: string
}

function asList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!isRecord(payload)) return []
  for (const key of ['sessions', 'chats', 'history', 'items', 'data', 'rows', 'results']) {
    const value = payload[key]
    if (Array.isArray(value)) return value
  }
  return []
}

function normalizeItem(raw: unknown): HistoryItem | null {
  if (!isRecord(raw)) return null
  const idRaw = raw.id ?? raw.session_id ?? raw.sessionId ?? raw.chat_id ?? raw.chatId
  const id =
    typeof idRaw === 'string'
      ? idRaw.trim()
      : typeof idRaw === 'number' && Number.isFinite(idRaw)
        ? String(idRaw)
        : ''
  if (id === '') return null
  const titleRaw = raw.title ?? raw.name ?? raw.subject ?? raw.preview ?? raw.first_message
  const title = typeof titleRaw === 'string' && titleRaw.trim() !== '' ? titleRaw.trim() : 'Untitled chat'
  const createdRaw =
    raw.created_at ?? raw.createdAt ?? raw.updated_at ?? raw.updatedAt ?? raw.timestamp ?? ''
  const created_at =
    typeof createdRaw === 'string'
      ? createdRaw
      : typeof createdRaw === 'number'
        ? new Date(createdRaw).toISOString()
        : ''
  return { id, title, created_at }
}

export async function POST(request: Request) {
  const apiKey = getKey()
  if (apiKey === '') {
    return jsonError('Vimi history API not configured', 500, { missing: ['ABM_VIMI_HISTORY_API_KEY'] })
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await request.json()
    if (isRecord(parsed)) body = parsed
  } catch {
    body = {}
  }

  const email = await resolveRequestEmail(body)
  if (email === '') {
    return jsonError('email is required', 400)
  }

  const result = await postArenaWorkflow({
    url: getUrl(),
    apiKey,
    input: { email },
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Upstream error', status: result.status, detail: result.detail },
      { status: result.status >= 400 && result.status < 600 ? result.status : 502 }
    )
  }

  const sessions = asList(result.payload)
    .map(normalizeItem)
    .filter((item): item is HistoryItem => item !== null)

  return NextResponse.json({ sessions, raw: result.payload })
}
