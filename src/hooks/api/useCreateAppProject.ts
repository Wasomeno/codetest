import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAppProject } from '~/api/project';
import { qk } from '~/api/queryKeys';
import type { CreateProjectResponse } from '~/api/project';
import type { AppProject } from '~/types/project';

export type CreateAppProjectInput = Parameters<typeof createAppProject>[0];
export type CreateAppProjectResult = CreateProjectResponse;

/**
 * Calls `POST /projects` to create a new workspace project.
 *
 * The backend kicks off a background markdown-scenario sync + test-case
 * generation job in the same handler (see
 * `services/project_store.go → StartMarkdownScenarioSyncJob`). The
 * response returns the project plus a `scenarioSyncStarted` boolean
 * the UI can use to show "importing…" state.
 *
 * On success we invalidate the projects list and seed the cache with
 * the new project so the project-dashboard route can render without
 * a refetch.
 */
export function useCreateAppProject() {
  const queryClient = useQueryClient();

  return useMutation<CreateAppProjectResult, Error, CreateAppProjectInput>({
    mutationFn: async (input) => {
      const r = await createAppProject(input);
      if (!r.success || !r.data) {
        throw new Error(r.error || 'Failed to create project');
      }
      return r.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: qk.projects() });
      const project = (result as any)?.project as AppProject | undefined;
      if (project?.id) {
        queryClient.setQueryData(qk.project(project.id), project);
      }
    },
  });
}
