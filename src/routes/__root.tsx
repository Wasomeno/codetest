import {
  HeadContent,
  Scripts,
  createRootRoute,
  redirect,
  useLocation,
  useMatches,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { AuthBootstrap } from '../components/AuthBootstrap'
import { SessionProvider } from '../contexts/session-context'
import {
  InternalErrorPage,
  NotFoundErrorPage,
} from '../components/error/ErrorPage'
import { queryClient } from '../lib/query-client'
import { getSessionId } from '../utils/session'

import appCss from '../styles.css?url'

// Public routes (landing, login, about) render without the QA app shell
// AND skip the auth guard.
const PUBLIC_PATHS = new Set(['/', '/login', '/about'])

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'codetest' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundErrorPage,
  errorComponent: InternalErrorPage,
  // Client-side auth guard.
  //
  // On the server we can't read localStorage, so we let the request
  // through and re-evaluate on the client. There is a brief flash of
  // the protected page on first direct-load while logged out, but the
  // next render (after hydration) will redirect. The 401 interceptor
  // in api.ts is the second line of defense for any in-flight calls.
  beforeLoad: ({ location }) => {
    if (PUBLIC_PATHS.has(location.pathname)) return
    if (typeof window === 'undefined') return // SSR: defer to client
    if (!getSessionId()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isPublic = PUBLIC_PATHS.has(location.pathname)
  const matches = useMatches()
  const isErrorPage = matches.some(
    (m) => m.status === 'error' || m.status === 'notFound' || m._notFound,
  )

  // Mounted flag — gates the body class flip so SSR markup matches the
  // first client paint. (See Sidebar for the same pattern.)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body data-mounted={mounted || undefined}>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
          <AuthBootstrap>
            {isPublic || isErrorPage ? children : <AppShell>{children}</AppShell>}
          </AuthBootstrap>
          </SessionProvider>
        </QueryClientProvider>
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
