import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
// Side-effect import: runs `extractSessionIdFromUrl()` at module load,
// before any React component mounts. See ./lib/auth-bootstrap.ts.
import './lib/auth-bootstrap'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Wrap every SPA navigation in `document.startViewTransition()` so the
    // browser can interpolate between the previous and next `.main` content
    // using the `view-transition-name: app-main` slot defined in AppShell.
    // TanStack Router ignores this when the API is unavailable, so the
    // fallback is a normal instant navigation.
    defaultViewTransition: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
