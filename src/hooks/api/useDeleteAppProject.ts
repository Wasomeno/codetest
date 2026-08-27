import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteAppProject } from '~/api/project'
import { qk } from '~/api/queryKeys'

export function useDeleteAppProject() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string; id: string }, Error, string>({
    mutationFn: async (projectId) => {
      const r = await deleteAppProject(projectId)
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to delete project')
      }
      return r.data
    },
    onSuccess: (_data, projectId) => {
      queryClient.removeQueries({ queryKey: qk.project(projectId) })
      queryClient.invalidateQueries({ queryKey: qk.projects() })
    },
  })
}
