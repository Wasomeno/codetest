import { useQuery } from '@tanstack/react-query'
import { getProjectMembers } from '~/api/project'
import { qk } from '~/api/queryKeys'
import type { GitLabProjectMember } from '~/types/project'

/**
 * GitLab members for a numeric project id (typically the app project's
 * issue repo). Used to resolve activity actor ids to display names.
 */
export function useProjectMembers(gitlabProjectId: number | string | undefined) {
  return useQuery<GitLabProjectMember[]>({
    queryKey: gitlabProjectId
      ? qk.gitlabMembers(gitlabProjectId)
      : ['gitlab', 'projects', '__noop__', 'members'],
    queryFn: async () => {
      if (gitlabProjectId == null || gitlabProjectId === '') {
        throw new Error('Missing GitLab project id')
      }
      const r = await getProjectMembers(gitlabProjectId)
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to load project members')
      }
      return r.data.members ?? []
    },
    enabled: gitlabProjectId != null && gitlabProjectId !== '' && Number(gitlabProjectId) > 0,
    staleTime: 5 * 60_000,
  })
}
