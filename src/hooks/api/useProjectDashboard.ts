import { useQuery } from '@tanstack/react-query';
import { getProjectDashboard } from '~/api/project';
import { qk } from '~/api/queryKeys';
import type { ProjectDashboard } from '~/types/project';

/**
 * Fetches the dashboard aggregate for a single project.
 *
 * The backend already aggregates open issues, scenario count, recording
 * count, fix-session count, 7-day pass rate, and today's issues into a
 * single response (`routes/dashboard.go`). This hook is therefore
 * cache-friendly: many UI tiles can read from one network round-trip.
 *
 * `staleTime` is bumped to 60s — the dashboard is an aggregate, not a
 * live counter, so a minute of staleness is fine and avoids thrashing
 * the 6 parallel GitLab calls the backend fires.
 */
export function useProjectDashboard(id: string | undefined) {
  return useQuery<ProjectDashboard>({
    queryKey: id ? qk.projectDashboard(id) : ['projects', '__noop__', 'dashboard'],
    queryFn: async () => {
      if (!id) throw new Error('Missing project id');
      const r = await getProjectDashboard(id);
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to load project dashboard');
      }
      return r.data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}
