import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const apiUrl = process.env.ABM_API_URL
  const apiKey = process.env.ABM_API_KEY
  if (!apiUrl || !apiKey) {
    return NextResponse.json({ error: 'ABM API not configured' }, { status: 500 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

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

    let raw: unknown = null
    try {
      raw = await upstream.json()
    } catch {
      raw = null
    }

    if (raw === null) {
      return NextResponse.json(
        { error: `Analyze API responded with status ${upstream.status}` },
        { status: 502 }
      )
    }

    return NextResponse.json(raw, { status: upstream.status })
  } catch {
    return NextResponse.json({ error: 'Failed to reach the analyze API' }, { status: 502 })
  }
}
