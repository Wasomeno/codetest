import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateAppProject } from '~/api/project'
import { qk } from '~/api/queryKeys'
import type { AppProject, UpdateAppProjectRequest } from '~/types/project'

export function useUpdateAppProject(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<AppProject, Error, UpdateAppProjectRequest>({
    mutationFn: async (input) => {
      const r = await updateAppProject(projectId, input)
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to update project')
      }
      return r.data as AppProject
    },
    onSuccess: (project) => {
      queryClient.setQueryData(qk.project(projectId), project)
      queryClient.invalidateQueries({ queryKey: qk.projects() })
      queryClient.invalidateQueries({ queryKey: qk.projectActivity(projectId) })
    },
  })
}
