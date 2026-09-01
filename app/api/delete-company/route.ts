import { NextResponse } from 'next/server'
import { resolveRequestEmail } from '@/lib/resolve-request-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DEFAULT_DELETE_API_URL =
  'https://agent.thearena.ai/api/v2/workflows/94429fa9-03d4-4f93-b422-c0cfdebacd4c/execute'

// Prefer SIM_API_KEY / ABM_DELETE_API_KEY / ABM_API_KEY in the environment.
const DEFAULT_SIM_API_KEY = 'sk-sim-obzfF9mr5hpsnuyOl6AP5njgk31gc19R'

function getApiUrl(): string {
  const fromEnv = process.env.ABM_DELETE_COMPANY_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_DELETE_API_URL
}

function getApiKey(): string {
  const dedicated = process.env.SIM_API_KEY
  if (dedicated && dedicated.length > 0) return dedicated
  const deleteKey = process.env.ABM_DELETE_API_KEY
  if (deleteKey && deleteKey.length > 0) return deleteKey
  const shared = process.env.ABM_API_KEY
  if (shared && shared.length > 0) return shared
  return DEFAULT_SIM_API_KEY
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: Request) {
  const apiKey = getApiKey()
  if (!apiKey || apiKey.length === 0) {
    return NextResponse.json(
      { error: 'Delete API not configured', missing: ['SIM_API_KEY'] },
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

  const company =
    typeof body.company === 'string'
      ? body.company.trim()
      : typeof body.company_name === 'string'
        ? body.company_name.trim()
        : ''
  const companyId =
    typeof body.companyId === 'string'
      ? body.companyId.trim()
      : typeof body.company_id === 'string'
        ? body.company_id.trim()
        : ''

  if (company === '' && companyId === '') {
    return NextResponse.json(
      { error: 'company or companyId is required' },
      { status: 400 }
    )
  }

  const signalsOnly = body.signalsOnly === true
  const confirm = body.confirm !== false
  const email = await resolveRequestEmail(body)

  const upstreamBody = {
    input: {
      ...(email !== '' ? { email } : {}),
      company,
      companyId,
      confirm,
      signalsOnly,
    },
  }

  try {
    const upstream = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(upstreamBody),
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
