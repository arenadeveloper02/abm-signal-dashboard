'use server'

import { prisma } from '@/lib/prisma'

export async function logRefresh(
  emailId: string,
  runId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const key = `last-refresh:${emailId}`
    const value = JSON.stringify({ runId, at: new Date().toISOString() })
    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
    return { success: true }
  } catch {
    return { success: false, error: 'Failed to log refresh event' }
  }
}
