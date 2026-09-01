'use client'

import { createContext, Suspense, useContext, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'

const ArenaEmailContext = createContext<string | null>(null)

interface ArenaEmailProviderProps {
  emailId: string | null
  children: ReactNode
}

function ArenaEmailFromQuery({
  emailId,
  children,
}: ArenaEmailProviderProps) {
  const searchParams = useSearchParams()
  const fromQuery = searchParams.get('emailId')?.trim() || null
  const value = emailId || fromQuery
  return <ArenaEmailContext.Provider value={value}>{children}</ArenaEmailContext.Provider>
}

/**
 * Provides the Arena email id to client components when present.
 * Missing email no longer blocks the app; API calls send it in the request body.
 */
export function ArenaEmailProvider({ emailId, children }: ArenaEmailProviderProps) {
  return (
    <Suspense
      fallback={<ArenaEmailContext.Provider value={emailId}>{children}</ArenaEmailContext.Provider>}
    >
      <ArenaEmailFromQuery emailId={emailId}>{children}</ArenaEmailFromQuery>
    </Suspense>
  )
}

/** Client hook for the Arena email id. Empty when it was not provided. */
export function useArenaEmailId(): string {
  return useContext(ArenaEmailContext) ?? ''
}

/** Optional client hook when a page can render without an email id. */
export function useOptionalArenaEmailId(): string | null {
  return useContext(ArenaEmailContext)
}
