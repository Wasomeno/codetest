import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '~/api/user';
import { qk } from '~/api/queryKeys';
import type { User } from '~/api/user';

/**
 * Returns the current GitLab user.
 *
 * - Cached for 60s (the user object rarely changes mid-session).
 * - `refetchOnMount: 'always'` so navigating between pages always picks
 *   up a session that was just established (e.g. right after login).
 * - `retry: false` — a 401 here means "not logged in", which the
 *   api.ts interceptor already handles by redirecting to /login.
 *   Retrying would just re-fire that same 401.
 */
export function useCurrentUser() {
  return useQuery<User>({
    queryKey: qk.user(),
    queryFn: async () => {
      const r = await getCurrentUser();
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to load current user');
      }
      return r.data;
    },
    staleTime: 60_000,
    refetchOnMount: 'always',
    retry: false,
  });
}
