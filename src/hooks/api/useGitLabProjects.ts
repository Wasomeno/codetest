import { useQuery } from '@tanstack/react-query';
import { getGitLabProjects } from '~/api/project';
import { qk } from '~/api/queryKeys';
import type { GitLabProject } from '~/types/project';

/**
 * Returns the list of GitLab projects the current user is a member of.
 *
 * - Optional `search` param is debounced by the caller (300ms is a good
 *   default) so we don't fire a request on every keystroke.
 * - `staleTime: 30_000` matches the global `queryClient` default; the
 *   list rarely changes mid-session.
 */
export function useGitLabProjects(search?: string) {
  return useQuery<GitLabProject[]>({
    queryKey: qk.gitlabProjects(search),
    queryFn: async () => {
      const r = await getGitLabProjects(search);
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to load GitLab projects');
      }
      return r.data.projects ?? [];
    },
    enabled: true,
    staleTime: 30_000,
  });
}
