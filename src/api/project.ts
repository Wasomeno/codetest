
import { api } from "~/services/api"
import type {
  AppProject,
  AppProjectActivity,
  CreateAppProjectRequest,
  GitLabProject,
  GitlabProjectLabel,
  GitLabProjectMember,
  GetProjectBoardsResponse,
  ProjectDashboard,
  ProjectTestContextResponse,
  UpdateAppProjectRequest,
} from "~/types/project"

export async function getProjects(searchParam?: string | any) {
  return getGitLabProjects(searchParam);
}

export async function getGitLabProjects(searchParam?: string | any) {
  const search = typeof searchParam === "string" ? searchParam : undefined;
  const url = search
    ? `/gitlab/projects?search=${encodeURIComponent(search)}`
    : "/gitlab/projects";
  return api.get<{ projects: GitLabProject[] }>(url);
}

export async function getProjectById(projectId: number | string) {
  return getGitLabProjectById(projectId);
}

export async function getGitLabProjectById(projectId: number | string) {
  const response = await api.get<{ project: GitLabProject }>(
    `/gitlab/projects/${projectId}`,
  );
  return response;
}

export async function listAppProjects() {
  return api.get<{ projects: AppProject[] }>("/projects");
}

export async function getAppProject(projectId: string) {
  return api.get<AppProject>(`/projects/${projectId}`);
}

export interface CreateProjectResponse {
  project: AppProject;
  scenariosImported?: number;
  scenarioSyncStarted?: boolean;
}

export async function createAppProject(request: CreateAppProjectRequest) {
  const response = await api.post<CreateProjectResponse>("/projects", {
    body: JSON.stringify(request),
  });
  if (response.success && response.data && "project" in response.data) {
    return { ...response, data: response.data };
  }
  return response as any;
}

export async function updateAppProject(
  projectId: string,
  request: UpdateAppProjectRequest,
) {
  const response = await api.patch<AppProject | { project: AppProject; scenariosImported?: number }>(`/projects/${projectId}`, {
    body: JSON.stringify(request),
  });
  if (response.success && response.data && "project" in response.data) {
    return { ...response, data: response.data.project };
  }
  return response as any;
}

export async function deleteAppProject(projectId: string) {
  return api.delete<{ message: string; id: string }>(`/projects/${projectId}`);
}

export async function getAppProjectActivity(projectId: string) {
  return api.get<{ activity: AppProjectActivity[] }>(
    `/projects/${projectId}/activity`,
  );
}

export async function getProjectDashboard(projectId: string) {
  return api.get<ProjectDashboard>(`/projects/${projectId}/dashboard`);
}

export async function getProjectTestContext(projectId: string) {
  return api.get<ProjectTestContextResponse>(
    `/projects/${projectId}/test-context`,
  );
}

export async function updateProjectTestContext(
  projectId: string,
  markdown: string,
) {
  return api.put<{ projectId: string; markdown: string; maxBytes: number }>(
    `/projects/${projectId}/test-context`,
    { body: JSON.stringify({ markdown }) },
  );
}

export async function getProjectBoards(
  projectId: number | string,
  opts?: { summary?: boolean },
) {
  const qs = opts?.summary ? '?summary=1' : '';
  return api.get<GetProjectBoardsResponse & { summary?: boolean }>(
    `/projects/${projectId}/boards${qs}`,
  );
}

export interface FSDIssueDraft {
  sourcePath?: string;
  title: string;
  description: string;
  labels?: string[];
}

export interface FSDIssuePreviewResponse {
  projectId: string;
  specsRepoId: number;
  issueRepoId: number;
  issues: FSDIssueDraft[];
  previewCount: number;
}

export interface FSDIssueCreateResponse {
  projectId: string;
  issueRepoId: number;
  createdCount: number;
  failedCount: number;
  results: Array<{
    sourcePath?: string;
    title: string;
    status: 'success' | 'failed';
    issue?: { web_url?: string; iid?: number; title?: string };
    error?: string;
  }>;
}

export async function previewFSDIssues(
  projectId: string,
  fsds: Array<{ path: string; ref?: string }>,
) {
  return api.post<FSDIssuePreviewResponse>(
    `/projects/${projectId}/fsd-issues/preview`,
    { body: JSON.stringify({ fsds }) },
  );
}

export async function createFSDIssues(
  projectId: string,
  issues: FSDIssueDraft[],
) {
  return api.post<FSDIssueCreateResponse>(
    `/projects/${projectId}/fsd-issues`,
    { body: JSON.stringify({ issues }) },
  );
}

export async function getProjectLabels(projectId: number | string) {
  return api.get<GitlabProjectLabel[] | { labels: GitlabProjectLabel[] }>(
    `/gitlab/projects/${projectId}/labels`,
  );
}

export async function getAppProjectLabels(projectId: number | string) {
  return api.get<GitlabProjectLabel[] | { labels: GitlabProjectLabel[] }>(
    `/projects/${projectId}/labels`,
  );
}

export async function getProjectMembers(projectId: number | string) {
  return api.get<{ members: Array<GitLabProjectMember> }>(
    `/gitlab/projects/${projectId}/members`,
  );
}

export async function uploadProjectFile(
  projectId: number | string,
  file: Blob,
  fileName: string,
) {
  try {
    const formData = new FormData();
    formData.append("file", file, fileName);
    return await api.post<{ url: string }>(
      `/projects/${projectId}/uploads`,
      { body: formData as any },
    );
  } catch (error: any) {
    return {
      success: false as const,
      data: null,
      error: error.message || "Upload failed",
    };
  }
}

export interface GitLabBranch {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  web_url: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    author_name: string;
    author_email: string;
    authored_date: string;
  };
}

export async function getProjectBranches(
  projectId: number | string,
  search?: string,
) {
  const params = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await api.get<{ branches: GitLabBranch[] }>(
    `/gitlab/projects/${projectId}/branches${params}`,
  );
  return response;
}
