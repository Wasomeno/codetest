import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getSessionId } from '~/utils/session'
import { useSession } from '~/contexts/session-context'
import { qk } from '~/api/queryKeys'

/**
 * Wraps the app's children inside the QueryClientProvider so any
 * imperative cache work (prefetch / invalidate) takes effect.
 *
 * The actual `extractSessionIdFromUrl()` call is now a module-level
 * side effect in `~/lib/auth-bootstrap.ts` — it runs at import time
 * before this component even mounts, which avoids a race with the
 * first `useCurrentUser` query. This component is kept for any
 * future runtime pre-warm work.
 */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const session = useSession()

  useEffect(() => {
    // Pre-warm the user query if we already have a session id.
    // The first useCurrentUser() call inside the tree will reuse
    // this in-flight promise via React Query's dedupe.
    if (getSessionId() && session) {
      queryClient.prefetchQuery({
        queryKey: qk.user(),
        queryFn: async () => {
          const { getCurrentUser } = await import('~/api/user')
          const r = await getCurrentUser()
          if (!r.success || !r.data) throw new Error('No user')
          return r.data
        },
      })
    }
  }, [queryClient, session])

  return <>{children}</>
}
