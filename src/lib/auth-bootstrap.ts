/**
 * Module-level auth bootstrap.
 *
 * Runs ONCE at module load — before any React component mounts, before
 * any React Query hook fires. This is the only safe place to do
 * session-id extraction, because:
 *
 *   1. It runs before `useCurrentUser` mounts, so the first query fires
 *      with the session_id already in localStorage (and the X-Session-ID
 *      header set in api.ts).
 *
 *   2. It runs before the router's `beforeLoad` auth guard evaluates, so
 *      protected routes don't see a transient "no session" state on the
 *      first paint after OAuth round-trip.
 *
 * Guarded by `typeof window` so it no-ops during SSR (where window is
 * undefined and localStorage doesn't exist).
 */
import { extractSessionIdFromUrl } from '~/utils/session'

if (typeof window !== 'undefined') {
  // Read ?session_id=... from the URL (set by the backend's auth
  // callback) and persist it to localStorage. Strips the param from
  // the URL so it doesn't end up in browser history / share links.
  extractSessionIdFromUrl()
}
