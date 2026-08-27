/**
 * Central, type-safe React Query keys for the codetest app.
 *
 * Every query is defined here so cache invalidation in mutations is
 * mechanical — no string keys floating around in component files.
 *
 * The factory is read-only at runtime; type-narrowing happens via
 * `as const` so consumers get literal-string types back (useful for
 * testing / debugging).
 *
 * Naming convention:
 *   - one key per logical "thing" (project, project-dashboard, etc.)
 *   - args go in their order of importance; the ID first, then filters
 *   - `null` / `undefined` filters are normalized to `''` so cache hits
 *     don't fragment (e.g. `['projects', id, 'specs', 'tree', path, '']`
 *     is the same query regardless of whether `ref` was passed).
 */
export const qk = {
  // ── Auth & user ───────────────────────────────────────────────
  user: () => ['user', 'me'] as const,

  // ── App projects ──────────────────────────────────────────────
  projects: () => ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  projectActivity: (id: string) => ['projects', id, 'activity'] as const,
  projectDashboard: (id: string) => ['projects', id, 'dashboard'] as const,
  projectTestContext: (id: string) => ['projects', id, 'test-context'] as const,

  // ── GitLab proxies ────────────────────────────────────────────
  gitlabProjects: (search?: string) =>
    ['gitlab', 'projects', search ?? ''] as const,
  gitlabProject: (id: number | string) =>
    ['gitlab', 'projects', id] as const,
  gitlabMembers: (id: number | string) =>
    ['gitlab', 'projects', id, 'members'] as const,
  gitlabBranches: (id: number | string, search?: string) =>
    ['gitlab', 'projects', id, 'branches', search ?? ''] as const,

  // ── Specs (per project, GitLab-backed) ────────────────────────
  specsTree: (id: string, path: string, ref?: string) =>
    ['projects', id, 'specs', 'tree', path, ref ?? ''] as const,
  specsFile: (id: string, path: string, ref?: string) =>
    ['projects', id, 'specs', 'file', path, ref ?? ''] as const,
  specsCommits: (id: string, path?: string, ref?: string) =>
    ['projects', id, 'specs', 'commits', path ?? '', ref ?? ''] as const,
  specsCommit: (id: string, sha: string) =>
    ['projects', id, 'specs', 'commits', sha] as const,
  specsSearch: (id: string, q: string, path?: string, ref?: string) =>
    ['projects', id, 'specs', 'search', q, path ?? '', ref ?? ''] as const,
} as const;

export type QueryKey = ReturnType<(typeof qk)[keyof typeof qk]>;
