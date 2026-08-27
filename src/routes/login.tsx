import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NewLoginPage } from '~/pages/login'
import { useSession } from '~/contexts/session-context'
import { useEffect } from 'react'
import { z } from 'zod'

/**
 * /login route.
 *
 * Query string accepts an optional `redirect` parameter that
 * `__root.tsx`'s `beforeLoad` populates when bouncing a logged-out
 * user away from a protected page. After a successful OAuth round
 * trip the user lands back here and we forward them to `redirect`
 * (or the dashboard if absent).
 */
const loginSearchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  component: LoginRoute,
  validateSearch: loginSearchSchema,
})

function LoginRoute() {
  const navigate = useNavigate()
  const session = useSession()
  const { redirect: redirectTo } = Route.useSearch()

  // If the user is already signed in, forward them to the requested
  // destination (or the dashboard). This catches the case where the
  // user lands on /login manually while a session is active.
  useEffect(() => {
    if (!session?.loading && session?.user) {
      navigate({
        to: redirectTo ?? '/dashboard',
      })
    }
  }, [session?.loading, session?.user, redirectTo, navigate])

  return (
    <NewLoginPage
      redirectAfterLogin={redirectTo}
      onSignedIn={() => navigate({ to: redirectTo ?? '/dashboard' })}
    />
  )
}
