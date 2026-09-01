import { getArenaEmailId } from '@/lib/arena-email'

function emailFromBody(body: Record<string, unknown>): string {
  const raw = body.email
  return typeof raw === 'string' ? raw.trim() : ''
}

/** Resolves email from the request body or the Arena httpOnly cookie. */
export async function resolveRequestEmail(body: Record<string, unknown>): Promise<string> {
  const fromBody = emailFromBody(body)
  if (fromBody !== '') return fromBody
  return (await getArenaEmailId()) ?? ''
}
