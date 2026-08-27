import { useQuery } from '@tanstack/react-query';
import { getAppProjectActivity } from '~/api/project';
import { qk } from '~/api/queryKeys';
import type { AppProjectActivity } from '~/types/project';

/**
 * Fetches the audit-log activity feed for a single project.
 *
 * The backend caps the list at 200 events (see
 * `appProjectActivityLimit` in `services/project_store.go`), so this
 * is a fixed-size fetch — no pagination needed in the UI yet.
 */
export function useProjectActivity(id: string | undefined) {
  return useQuery<AppProjectActivity[]>({
    queryKey: id ? qk.projectActivity(id) : ['projects', '__noop__', 'activity'],
    queryFn: async () => {
      if (!id) throw new Error('Missing project id');
      const r = await getAppProjectActivity(id);
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to load project activity');
      }
      return r.data.activity ?? [];
    },
    enabled: !!id,
  });
}
