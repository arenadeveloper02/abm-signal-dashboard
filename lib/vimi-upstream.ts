import { NextResponse } from 'next/server'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Unwrap nested Arena workflow `output` / `result` envelopes. */
export function unwrapPayload(raw: unknown): unknown {
  let current: unknown = raw
  for (let i = 0; i < 8; i += 1) {
    if (!isRecord(current)) break
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

export async function postArenaWorkflow(options: {
  url: string
  apiKey: string
  input: Record<string, unknown>
}): Promise<{ ok: true; payload: unknown } | { ok: false; status: number; detail: string }> {
  try {
    const upstream = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': options.apiKey,
      },
      body: JSON.stringify({ input: options.input }),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      let detail = ''
      try {
        detail = (await upstream.text()).slice(0, 500)
      } catch {
        detail = ''
      }
      return { ok: false, status: upstream.status, detail }
    }

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      return { ok: false, status: 502, detail: 'Upstream returned a non-JSON response body' }
    }

    return { ok: true, payload: unwrapPayload(raw) }
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error'
    return { ok: false, status: 502, detail }
  }
}

export function jsonError(message: string, status = 500, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}
