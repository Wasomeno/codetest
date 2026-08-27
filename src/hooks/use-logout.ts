import { useLogout as useLogoutApi } from '~/hooks/api/useLogout';
import { useSession } from '~/contexts/session-context';

/**
 * Compatibility wrapper around `useLogout` from `~/hooks/api/useLogout`.
 *
 * The original implementation lived in this file; moving it to
 * `hooks/api/` keeps all React-Query API hooks in one place. This
 * shim preserves the original behavior of also clearing the local
 * session context after a successful logout, so consumers (the
 * Sidebar) don't have to change.
 */
export function useLogout() {
  const mutation = useLogoutApi();
  const session = useSession();

  return {
    ...mutation,
    mutateAsync: async () => {
      const result = await mutation.mutateAsync();
      if (session) {
        await session.clearUser();
      }
      return result;
    },
  };
}
