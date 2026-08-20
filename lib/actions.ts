'use server'

import { prisma } from '@/lib/prisma'

export async function logRefresh(
  emailId: string,
  runId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.refreshEvent.create({ data: { emailId, runId } })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to log refresh event' }
  }
}
