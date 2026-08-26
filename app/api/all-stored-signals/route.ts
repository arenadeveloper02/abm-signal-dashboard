import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DEFAULT_ALL_SIGNALS_API_URL =
  'https://agent.thearena.ai/api/workflows/8983ed27-5c88-4505-9847-ad4ed0deaf65/execute'

const DEFAULT_ALL_SIGNALS_API_KEY = 'sk-sim-u3_2d6AaWsa4zd2yoaaw9IyWfpHVTi_F'

function getApiUrl(): string {
  const fromEnv = process.env.ABM_ALL_SIGNALS_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ALL_SIGNALS_API_URL
}

function getApiKey(): string {
  const dedicated = process.env.ABM_ALL_SIGNALS_API_KEY
  if (dedicated && dedicated.length > 0) return dedicated
  const shared = process.env.ABM_API_KEY
  if (shared && shared.length > 0) return shared
  return DEFAULT_ALL_SIGNALS_API_KEY
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapPayload(raw: unknown): unknown {
  let current: unknown = raw
  for (let i = 0; i < 8; i++) {
    if (!isRecord(current)) break
    if ('signals' in current || 'total' in current) return current
    if ('error' in current && !isRecord(current.output) && !isRecord(current.result)) {
      return current
    }
    if (isRecord(current.output)) {
      current = current.output
      continue
    }
    if (isRecord(current.result)) {
      current = current.result
      continue
    }
    break
  }
  return current
}

export async function POST(request: Request) {
  const apiKey = getApiKey()

  if (!apiKey || apiKey.length === 0) {
    return NextResponse.json(
      { error: 'ABM all-signals API not configured', missing: ['ABM_ALL_SIGNALS_API_KEY'] },
      { status: 500 }
    )
  }

  let body: Record<string, unknown> = { limit: 1000, offset: 0, includeSignals: true }
  try {
    const parsed: unknown = await request.json()
    if (isRecord(parsed)) {
      body = { limit: 1000, offset: 0, includeSignals: true, ...parsed }
    }
  } catch {
    body = { limit: 1000, offset: 0, includeSignals: true }
  }

  try {
    const upstream = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      let detail = ''
      try {
        detail = (await upstream.text()).slice(0, 500)
      } catch {
        detail = ''
      }
      return NextResponse.json(
        { error: 'Upstream error', status: upstream.status, detail },
        { status: upstream.status }
      )
    }

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      raw = null
    }

    if (raw === null) {
      return NextResponse.json(
        {
          error: 'Upstream error',
          status: upstream.status,
          detail: 'Upstream returned a non-JSON response body',
        },
        { status: 502 }
      )
    }

    const payload = unwrapPayload(raw)

    if (!isRecord(payload)) {
      return NextResponse.json(
        { error: 'Unexpected response from the signal read API' },
        { status: 502 }
      )
    }

    return NextResponse.json(payload, { status: upstream.status })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error'
    return NextResponse.json(
      { error: 'Upstream request failed', detail },
      { status: 502 }
    )
  }
}
