import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '~/hooks/api/useCurrentUser'
import { qk } from '~/api/queryKeys'
import type { User } from '~/api/user'

const STORAGE_KEY = 'session_user'

/**
 * Hook to manage ephemeral global user state.
 *
 * Two-tier source of truth:
 *   1. localStorage — for instant render on first paint (avoids a
 *      loading flash on every page navigation). Re-hydrated via
 *      `storage` events from other tabs.
 *   2. React Query `useCurrentUser` — the source of truth for "is the
 *      session still valid?"; if the backend rejects, we clear
 *      localStorage and the user state.
 *
 * Public surface (`{user, setUser, syncUser, clearUser, loading}`) is
 * unchanged from the pre-React-Query version so the SessionContext
 * and its consumers don't have to change.
 */
export const useSessionUser = () => {
  const [user, setUserState] = useState<User | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const queryClient = useQueryClient()

  const setUser = useCallback(async (newUser: User) => {
    setUserState(newUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
  }, [])

  const clearUser = useCallback(async () => {
    setUserState(null)
    localStorage.removeItem(STORAGE_KEY)
    queryClient.setQueryData(qk.user(), null)
  }, [queryClient])

  // Hydrate from localStorage on mount so we have an instant user
  // before the network round-trip resolves.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUserState(JSON.parse(stored))
      }
    } catch {
      // Corrupt JSON — ignore and let the network sync populate.
    }
    setHasHydrated(true)
  }, [])

  // Live query against the backend. On success → push to local state
  // and localStorage. On 401 → api.ts already redirects; here we
  // just clear local state so the UI is consistent on the next mount.
  const q = useCurrentUser()

  useEffect(() => {
    if (q.data) {
      setUserState(q.data)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(q.data))
      } catch {
        // localStorage unavailable (private mode) — keep in-memory.
      }
    } else if (q.error) {
      // Don't clear on a single transient failure — only when the
      // query definitively has no data and has stopped fetching.
      // (A 401 here is already handled by api.ts → /login redirect.)
      setUserState(null)
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [q.data, q.error])

  // Cross-tab sync — same shape as the original implementation.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          const newValue = e.newValue ? JSON.parse(e.newValue) : null
          setUserState(newValue)
        } catch {
          setUserState(null)
        }
      }
    }
    const handleLogout = () => {
      setUserState(null)
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth_logout', handleLogout)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth_logout', handleLogout)
    }
  }, [])

  const syncUser = useCallback(async () => {
    await q.refetch()
    return q.data ?? null
  }, [q])

  // `loading` is true until we have a definitive answer (success or
  // error) AND we've finished hydrating localStorage. Without the
  // localStorage gate, the UI would flash "loading" on every mount
  // even when we already have a cached user.
  const loading = !hasHydrated || (q.isPending && !user)

  return { user, setUser, syncUser, clearUser, loading }
}
