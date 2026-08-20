import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SIM_ENDPOINT = 'https://sim.ai/api/workflows/5ecfc0da-795c-430d-be4e-48888ee6217a/execute'

interface SignalsRequestBody {
  email?: string
  runId?: string
  family?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapPayload(raw: unknown): unknown {
  let current: unknown = raw
  for (let i = 0; i < 8; i++) {
    if (!isRecord(current)) break
    if ('meta' in current || 'kpis' in current || 'error' in current) {
      if ('meta' in current || 'kpis' in current) return current
      // has error only — check whether a nested payload exists before returning
      if (!isRecord(current.output) && !isRecord(current.result)) return current
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
  const apiKey = process.env.ABM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ABM_API_KEY is not configured on the server' }, { status: 500 })
  }

  let body: SignalsRequestBody = {}
  try {
    body = (await request.json()) as SignalsRequestBody
  } catch {
    body = {}
  }

  try {
    const upstream = await fetch(SIM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email: body.email ?? '',
        runId: body.runId ?? '',
        family: body.family ?? '',
      }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Signals API responded with status ${upstream.status}` },
        { status: 502 }
      )
    }

    const raw: unknown = await upstream.json()
    const payload = unwrapPayload(raw)

    if (!isRecord(payload)) {
      return NextResponse.json({ error: 'Unexpected response from signals API' }, { status: 502 })
    }

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ error: 'Failed to reach the signals API' }, { status: 502 })
  }
}
