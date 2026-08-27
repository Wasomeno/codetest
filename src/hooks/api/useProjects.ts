import { useQuery } from '@tanstack/react-query';
import { listAppProjects } from '~/api/project';
import { qk } from '~/api/queryKeys';
import type { AppProject } from '~/types/project';

/**
 * Returns the list of QA workspace projects (`AppProject[]`).
 *
 * Sorted by `updatedAt` desc on the backend. The codetest sidebar and
 * the /projects page both want this — keep the result in the cache so
 * the sidebar doesn't re-fetch when the projects page mounts.
 *
 * Errors fall through to the page (not auto-redirected) because
 * loading the projects list is not a session check — a 401 here
 * means the api.ts interceptor will already have triggered the
 * /login redirect.
 */
export function useProjects() {
  return useQuery<AppProject[]>({
    queryKey: qk.projects(),
    queryFn: async () => {
      const r = await listAppProjects();
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to load projects');
      }
      return r.data.projects ?? [];
    },
  });
}
