import { useQuery } from '@tanstack/react-query';
import { getAppProject } from '~/api/project';
import { qk } from '~/api/queryKeys';
import type { AppProject } from '~/types/project';

/**
 * Fetches one workspace project by id.
 *
 * Returns the raw `AppProject` (not the response wrapper) for ergonomic
 * use in components. The backend returns the project directly, not
 * wrapped in `{project: ...}`, so the `getAppProject` API helper is
 * already unwrapping it for us.
 *
 * `enabled: !!id` so callers can pass a route param that may not be
 * resolved yet without firing a request.
 */
export function useAppProject(id: string | undefined) {
  return useQuery<AppProject>({
    queryKey: id ? qk.project(id) : ['projects', '__noop__'],
    queryFn: async () => {
      if (!id) throw new Error('Missing project id');
      const r = await getAppProject(id);
      if (!r.success || !r.data) {
        const e = new Error(r.error || 'Project not found') as Error & {
          status?: number;
        };
        if (r.error?.toLowerCase().includes('not found')) e.status = 404;
        throw e;
      }
      return r.data as AppProject;
    },
    enabled: !!id,
  });
}
