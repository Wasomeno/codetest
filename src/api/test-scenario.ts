
import { api } from "~/services/api"
import type {
  AuthConfig,
  AutomationCategory,
  ManualTestResult,
  TestScenario,
  TestCase,
} from "~/types/test-scenario"

export interface GenerateAutomationRequest {
  category: AutomationCategory;
  testCaseIds: string[];
}

export interface GenerateAutomationResponse {
  category?: AutomationCategory;
  message?: string;
  jobId?: string;
  id?: string;
  testCaseIds?: string[];
  prompts?: Array<{ testCaseId: string; prompt: string }>;
  updated?: number;
}

export interface GenerateScenarioAutomationsPayload {
  force?: boolean;
}

export interface GenerateScenarioAutomationsResponse {
  message: "scenario automation generation started";
  id: string;
  apiCount: number;
  e2eCount: number;
  manualSkipped: number;
  unassignedSkipped: number;
  e2eJobId: string;
  force: boolean;
}

export type ScenarioImportState = 'idle' | 'syncing' | 'importing' | 'completed' | 'error';
export type ScenarioImportItemStatus = 'pending' | 'importing' | 'imported' | 'error';

export interface ScenarioImportCurrent {
  title?: string;
  sourcePath?: string;
  index?: number;
  total?: number;
}

export interface ScenarioImportCounts {
  total: number;
  imported: number;
  pending: number;
  failed: number;
}

export interface ScenarioImportFeedItem {
  id?: string;
  title: string;
  sourcePath: string;
  testCaseCount: number;
  status: ScenarioImportItemStatus;
  error?: string;
}

export interface ScenarioImportStatus {
  state: ScenarioImportState;
  indicatorText: string;
  current?: ScenarioImportCurrent;
  counts: ScenarioImportCounts;
  feed: ScenarioImportFeedItem[];
  error?: string;
  startedAt?: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ScenarioImportStartResponse {
  started: boolean;
  status: ScenarioImportStatus;
}

export type UpdateAutomationCategoryResponse =
  | TestScenario
  | TestCase
  | {
      scenario?: TestScenario;
      testCase?: TestCase;
      category?: AutomationCategory | null;
    };

export const testScenarioApi = {
  uploadScenario: async (
    file: File,
    projectId: string,
    authConfig: AuthConfig,
  ): Promise<{ message: string; id: string; sheets: number }> => {
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("projectId", projectId);
      formData.append("authConfig", JSON.stringify(authConfig));
      const response = await api.post<{
        message: string;
        id: string;
        sheets: number;
      }>(`/projects/${projectId}/test-scenarios/upload`, {
        body: formData as any,
      });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || "Failed to upload scenario");
    } catch (err: any) {
      throw new Error(err.message || "Failed to upload scenario");
    }
  },

  listScenarios: async (
    projectId?: string,
    search?: string,
    page?: number,
    per_page?: number,
    extraParams?: Record<string, string>,
  ): Promise<{
    scenarios: TestScenario[];
    total?: number;
    page: number;
    per_page: number;
    hasMore?: boolean;
  }> => {
    let url = projectId
      ? `/projects/${projectId}/test-scenarios`
      : "/test-scenarios";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (page !== undefined) params.set("page", String(page));
    if (per_page !== undefined) params.set("per_page", String(per_page));
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;

    const response = await api.get<any>(url);
    if (!response.success) throw new Error(response.error);

    const raw = response.data;
    const requestedPage = page ?? 1;
    const requestedPerPage = per_page ?? 0;

    // Some endpoints return a bare page array instead of pagination metadata.
    // Treat `array.length === requestedPerPage` as "maybe more" so page 2 can be requested.
    if (Array.isArray(raw)) {
      const resolvedPerPage = requestedPerPage || raw.length;
      return {
        scenarios: raw,
        page: requestedPage,
        per_page: resolvedPerPage,
        hasMore: resolvedPerPage > 0 && raw.length === resolvedPerPage,
      };
    }

    const pagination = raw?.pagination ?? raw?.meta?.pagination ?? raw?.meta ?? {};
    const scenarios = raw?.scenarios ?? raw?.data ?? raw?.items ?? [];
    const resolvedPage = Number(raw?.page ?? pagination.page ?? pagination.currentPage ?? pagination.current_page ?? requestedPage);
    const resolvedPerPage = Number(raw?.per_page ?? pagination.per_page ?? pagination.perPage ?? pagination.limit ?? requestedPerPage ?? scenarios.length);
    const total = raw?.total ?? raw?.count ?? pagination.total ?? pagination.totalItems ?? pagination.total_items;
    const totalPages = raw?.totalPages ?? raw?.total_pages ?? pagination.totalPages ?? pagination.total_pages;
    const hasMore = raw?.hasMore ?? raw?.has_more ?? pagination.hasMore ?? pagination.has_more ?? (
      totalPages !== undefined ? resolvedPage < Number(totalPages) : undefined
    );

    return {
      scenarios,
      total: total !== undefined ? Number(total) : undefined,
      page: resolvedPage,
      per_page: resolvedPerPage,
      hasMore,
    };
  }, 

  syncScenario: async (
    scenarioId: string,
    projectId: string,
  ): Promise<TestScenario> => {
    const response = await api.post<TestScenario>(
      `/projects/${projectId}/test-scenarios/${scenarioId}/sync`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  syncScenarios: async (projectId: string): Promise<ScenarioImportStartResponse> => {
    const response = await api.post<ScenarioImportStartResponse>(
      `/projects/${projectId}/test-scenarios/sync`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  getScenarioImportStatus: async (projectId: string): Promise<ScenarioImportStatus> => {
    const response = await api.get<ScenarioImportStatus>(
      `/projects/${projectId}/test-scenarios/import-status`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  getScenario: async (
    id: string,
    projectId?: string,
  ): Promise<TestScenario> => {
    const response = await api.get<TestScenario>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}`
        : `/test-scenarios/${id}`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  deleteScenario: async (
    id: string,
    projectId?: string,
  ): Promise<{ message: string; id: string }> => {
    const response = await api.delete<{ message: string; id: string }>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}`
        : `/test-scenarios/${id}`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  generateTests: async (
    id: string,
    params: {
      sheetNames?: string[];
      sectionIds?: string[];
      testCaseIds?: string[];
      projectId?: string;
    },
  ): Promise<{ message: string; id: string }> => {
    const response = await api.post<{ message: string; id: string }>(
      params.projectId
        ? `/projects/${params.projectId}/test-scenarios/${id}/generate`
        : `/test-scenarios/${id}/generate`,
      {
        body: JSON.stringify(params),
      },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  generateAutomation: async (
    id: string,
    projectId: string,
    params: GenerateAutomationRequest,
  ): Promise<GenerateAutomationResponse> => {
    const response = await api.post<GenerateAutomationResponse>(
      `/projects/${projectId}/test-scenarios/${id}/automations`,
      { body: JSON.stringify(params) },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  generateScenarioAutomations: async (
    id: string,
    projectId: string,
    payload: GenerateScenarioAutomationsPayload = {},
  ): Promise<GenerateScenarioAutomationsResponse> => {
    const response = await api.post<GenerateScenarioAutomationsResponse>(
      `/projects/${projectId}/test-scenarios/${id}/automations/generate`,
      {
        credentials: "include",
        body: JSON.stringify(payload),
      },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  listManualResults: async (
    id: string,
    projectId: string,
    tcId: string,
  ): Promise<ManualTestResult[]> => {
    const response = await api.get<{ manualResults: ManualTestResult[] }>(
      `/projects/${projectId}/test-scenarios/${id}/test-cases/${tcId}/manual-results`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data?.manualResults || [];
  },

  createManualResult: async (
    id: string,
    projectId: string,
    tcId: string,
    data: {
      status: 'passed' | 'failed';
      description: string;
      evidence: File[];
    },
  ): Promise<ManualTestResult> => {
    const formData = new FormData();
    formData.append('status', data.status);
    formData.append('description', data.description);
    data.evidence.forEach(file => formData.append('evidence', file, file.name));
    const response = await api.post<ManualTestResult>(
      `/projects/${projectId}/test-scenarios/${id}/test-cases/${tcId}/manual-results`,
      { body: formData as any },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  updateScenario: async (
    id: string,
    data: { title?: string; description?: string },
    projectId?: string,
  ): Promise<TestScenario> => {
    const response = await api.patch<TestScenario>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}`
        : `/test-scenarios/${id}`,
      {
        body: JSON.stringify(data),
      },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  updateTestCase: async (
    id: string,
    sectionId: string,
    tcId: string,
    data: any,
    projectId?: string,
  ): Promise<TestScenario> => {
    const response = await api.patch<TestScenario>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}/sections/${sectionId}/test-cases/${tcId}`
        : `/test-scenarios/${id}/sections/${sectionId}/test-cases/${tcId}`,
      { body: JSON.stringify(data) },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  updateTestCaseAutomationCategory: async (
    id: string,
    tcId: string,
    category: AutomationCategory | null,
    params: { projectId?: string; sectionId?: string } = {},
  ): Promise<UpdateAutomationCategoryResponse> => {
    const scenarioBase = params.projectId
      ? `/projects/${params.projectId}/test-scenarios/${id}`
      : `/test-scenarios/${id}`;
    const endpoint = params.sectionId
      ? `${scenarioBase}/sections/${params.sectionId}/test-cases/${tcId}/automation-category`
      : `${scenarioBase}/test-cases/${tcId}/automation-category`;

    const response = await api.patch<UpdateAutomationCategoryResponse>(endpoint, {
      body: JSON.stringify({ category }),
    });
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  addTestCase: async (
    id: string,
    sectionId: string,
    data: any,
    projectId?: string,
  ): Promise<TestScenario> => {
    const response = await api.post<TestScenario>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}/sections/${sectionId}/test-cases`
        : `/test-scenarios/${id}/sections/${sectionId}/test-cases`,
      { body: JSON.stringify(data) },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  deleteTestCase: async (
    id: string,
    sectionId: string,
    tcId: string,
    projectId?: string,
  ): Promise<TestScenario> => {
    const response = await api.delete<TestScenario>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}/sections/${sectionId}/test-cases/${tcId}`
        : `/test-scenarios/${id}/sections/${sectionId}/test-cases/${tcId}`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  runScenarioTestCase: async (
    id: string,
    sectionId: string,
    tcId: string,
    projectId?: string,
  ): Promise<{ message: string; id: string }> => {
    const response = await api.post<{ message: string; id: string }>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}/sections/${sectionId}/test-cases/${tcId}/run`
        : `/test-scenarios/${id}/sections/${sectionId}/test-cases/${tcId}/run`,
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  reorderTestCases: async (
    id: string,
    sectionId: string,
    orderedIds: string[],
    projectId?: string,
  ): Promise<TestScenario> => {
    const response = await api.patch<TestScenario>(
      projectId
        ? `/projects/${projectId}/test-scenarios/${id}/sections/${sectionId}/test-cases/reorder`
        : `/test-scenarios/${id}/sections/${sectionId}/test-cases/reorder`,
      { body: JSON.stringify({ orderedIds }) },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },

  bulkDeleteScenarios: async (ids: string[], projectId?: string) => {
    const response = await api.post<{
      message: string;
      deletedCount: number;
      notFound: string[];
      errors: string[];
    }>(
      projectId
        ? `/projects/${projectId}/test-scenarios/bulk-delete`
        : "/test-scenarios/bulk-delete",
      {
        body: JSON.stringify({ ids }),
      },
    );
    if (!response.success) throw new Error(response.error);
    return response.data!;
  },
};
