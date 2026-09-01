import { NextResponse } from 'next/server'
import { resolveRequestEmail } from '@/lib/resolve-request-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const DEFAULT_ABM_API_URL =
  'https://agent.thearena.ai/api/workflows/9cfb7d2e-8290-424d-b23b-6b46e9a6749c/execute'

const DEFAULT_ABM_API_KEY = 'sk-sim-V-QrZM3gSrgc4RmnWf5gwHl-s6debMJt'

function getApiUrl(): string {
  const fromEnv = process.env.ABM_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ABM_API_URL
}

function getApiKey(): string {
  const fromEnv = process.env.ABM_API_KEY
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ABM_API_KEY
}

function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.protocol}//${u.host}/***`
  } catch {
    return 'invalid-url'
  }
}

export async function GET() {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const urlSet = isValidHttpUrl(apiUrl)
  const keySet = typeof apiKey === 'string' && apiKey.length > 0
  return NextResponse.json({
    configured: urlSet && keySet,
    urlSet,
    keySet,
    url: maskUrl(apiUrl),
  })
}

export async function POST(request: Request) {
  const apiUrl = getApiUrl()
  const apiKey = getApiKey()
  const urlSet = apiUrl.length > 0
  const keySet = typeof apiKey === 'string' && apiKey.length > 0

  console.log(`[analyze] ABM_API_URL set: ${urlSet}, ABM_API_KEY set: ${keySet}`)

  if (!apiKey || apiKey.length === 0) {
    return NextResponse.json(
      { error: 'ABM API not configured', missing: ['ABM_API_KEY'] },
      { status: 500 }
    )
  }

  if (!isValidHttpUrl(apiUrl)) {
    return NextResponse.json(
      { error: 'ABM_API_URL is not a valid absolute URL' },
      { status: 500 }
    )
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await request.json()
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>
    }
  } catch {
    body = {}
  }

  const email = await resolveRequestEmail(body)
  if (email !== '') body.email = email

  try {
    const upstream = await fetch(apiUrl, {
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

    return NextResponse.json(raw, { status: upstream.status })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'Unknown network error'
    return NextResponse.json(
      { error: 'Upstream request failed', detail },
      { status: 502 }
    )
  }
}
