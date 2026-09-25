import { useQuery } from '@tanstack/react-query';
import { testScenarioApi } from '~/api/test-scenario';
import type { TestScenario } from '~/types/test-scenario';

export function useTestScenarios(projectId?: string, search?: string) {
  return useQuery<TestScenario[]>({
    queryKey: ['test-scenarios', projectId ?? 'all', search ?? ''],
    queryFn: async () => {
      const response = await testScenarioApi.listScenarios(
        projectId,
        search,
        1,
        100,
      );
      return response.scenarios ?? [];
    },
  });
}

export function useTestScenario(scenarioId: string, projectId?: string) {
  return useQuery<TestScenario>({
    queryKey: ['test-scenario', scenarioId, projectId ?? ''],
    queryFn: async () => {
      return await testScenarioApi.getScenario(scenarioId, projectId);
    },
    enabled: !!scenarioId,
  });
}
