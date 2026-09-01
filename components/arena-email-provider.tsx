'use client'

import { createContext, useContext, type ReactNode } from 'react'

const ArenaEmailContext = createContext<string | null>(null)

interface ArenaEmailProviderProps {
  emailId: string | null
  children: ReactNode
}

/**
 * Provides the Arena email id to client components when present.
 * Missing email no longer blocks the app; API calls send it in the request body.
 */
export function ArenaEmailProvider({ emailId, children }: ArenaEmailProviderProps) {
  return <ArenaEmailContext.Provider value={emailId}>{children}</ArenaEmailContext.Provider>
}

/** Client hook for the Arena email id. Empty when it was not provided. */
export function useArenaEmailId(): string {
  return useContext(ArenaEmailContext) ?? ''
}

/** Optional client hook when a page can render without an email id. */
export function useOptionalArenaEmailId(): string | null {
  return useContext(ArenaEmailContext)
}
