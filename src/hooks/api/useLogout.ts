import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '~/api/auth';
import { clearSessionId } from '~/utils/session';

/**
 * Calls POST /auth/logout, then clears local session state and the
 * entire React-Query cache so the next page mount doesn't see stale
 * data from the previous user.
 *
 * The api.ts 401 interceptor handles the case where the session is
 * already dead — it redirects to /login before this hook ever fires.
 * So a successful mutation means the server *did* accept the logout
 * and we should clear everything client-side.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const r = await logout();
      if (!r.success) {
        throw new Error(r.error || 'Logout failed');
      }
    },
    onSuccess: async () => {
      clearSessionId();
      // Wipe the cache — user, projects, dashboards, all of it.
      queryClient.clear();
      // Cross-tab notification so any other tab's useSessionUser also
      // clears its local user state.
      window.dispatchEvent(new Event('auth_logout'));
    },
  });
}
