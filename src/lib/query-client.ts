import { QueryClient } from "@tanstack/react-query"

/**
 * Single QueryClient instance for the migrated qa-webapp pages.
 *
 * Defaults match the source qa-webapp's habits:
 *  - 30s stale time so refetches feel live without thrashing
 *  - no refetch on window focus / reconnect (the source explicitly opts out
 *    for project-list and current-user queries)
 *  - 1 retry on transient network errors
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
