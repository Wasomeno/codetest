import { api } from '~/services/api';

// --- Types ---

export interface SpecCommit {
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  committedDate: string;
  webUrl?: string;
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: 'tree' | 'blob';
  children?: FileTreeNode[];
  lastCommit?: SpecCommit;
}

export interface SpecSearchHit {
  path: string;
  name: string;
  type: 'tree' | 'blob';
  matchLine?: number;
  matchPreview?: string;
  matchSource?: 'path' | 'content';
  lastCommit?: SpecCommit;
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface CommitDiff {
  oldPath: string;
  newPath: string;
  diff: string;
  newFile: boolean;
  renamedFile: boolean;
  deletedFile: boolean;
}

export interface CommitDetail extends SpecCommit {
  diffs: CommitDiff[];
}

export interface FileAction {
  action: 'create' | 'update' | 'delete' | 'move';
  filePath: string;
  content?: string;
  previousPath?: string;
}

// --- API Functions ---

export async function getSpecsTree(
  projectId: string | number,
  path = '',
  ref?: string,
  recursive = false,
  enrich = false,
) {
  const params = new URLSearchParams({ path });
  if (ref) params.set('ref', ref);
  if (recursive) params.set('recursive', 'true');
  if (enrich) params.set('enrich', '1');
  return api.get<{ tree: FileTreeNode[] }>(
    `/projects/${projectId}/specs/tree?${params}`
  );
}

/**
 * Fetch a single directory's immediate children (non-recursive).
 * Used for lazy-loading the file tree on expand.
 */
export async function getSpecsDirectory(
  projectId: string | number,
  dirPath: string,
  ref?: string
) {
  const params = new URLSearchParams({ path: dirPath });
  if (ref) params.set('ref', ref);
  return api.get<{ tree: FileTreeNode[] }>(
    `/projects/${projectId}/specs/tree?${params}`
  );
}

export async function getSpecsFile(
  projectId: string | number,
  filePath: string,
  ref?: string
) {
  const params = new URLSearchParams({ path: filePath });
  if (ref) params.set('ref', ref);
  return api.get<FileContent>(
    `/projects/${projectId}/specs/file?${params}`
  );
}

export async function saveSpecsFile(
  projectId: string | number,
  data: {
    path: string;
    content: string;
    branch?: string;
    commitMessage?: string;
    action?: 'create' | 'update';
  }
) {
  return api.put<{ success: boolean; path: string; action: string }>(
    `/projects/${projectId}/specs/file`,
    { body: JSON.stringify(data) }
  );
}

export async function deleteSpecsFile(
  projectId: string | number,
  data: {
    path: string;
    branch?: string;
    commitMessage?: string;
  }
) {
  return api.delete<{ success: boolean; path: string }>(
    `/projects/${projectId}/specs/file`,
    { body: JSON.stringify(data) }
  );
}

export async function commitSpecsFiles(
  projectId: string | number,
  data: {
    branch?: string;
    commitMessage: string;
    actions: FileAction[];
  }
) {
  return api.post<{ success: boolean; commit: SpecCommit }>(
    `/projects/${projectId}/specs/commit`,
    { body: JSON.stringify(data) }
  );
}

export async function getSpecsCommits(
  projectId: string | number,
  params?: {
    path?: string;
    ref?: string;
    per_page?: number;
    page?: number;
  }
) {
  const searchParams = new URLSearchParams();
  if (params?.path) searchParams.set('path', params.path);
  if (params?.ref) searchParams.set('ref', params.ref);
  if (params?.per_page) searchParams.set('per_page', String(params.per_page));
  if (params?.page) searchParams.set('page', String(params.page));
  return api.get<{ commits: SpecCommit[] }>(
    `/projects/${projectId}/specs/commits?${searchParams}`
  );
}

export async function getSpecsCommitDetail(
  projectId: string | number,
  sha: string
) {
  return api.get<CommitDetail>(
    `/projects/${projectId}/specs/commits/${sha}`
  );
}

export interface BlameLine {
  commit?: string;
  author?: string;
  line?: number;
  content?: string;
}

/**
 * Normalize GitLab blame payloads into a flat line list the UI can render.
 * Backend returns raw GitLab blame ranges (or occasionally a pre-wrapped
 * `{ blame: [...] }` object); either shape is accepted.
 */
export function normalizeBlame(raw: unknown): BlameLine[] {
  if (raw == null) return [];

  let payload: unknown = raw;
  if (typeof payload === 'object' && payload !== null && 'blame' in payload) {
    payload = (payload as { blame: unknown }).blame;
  }

  if (!Array.isArray(payload)) return [];

  // Already flat: { commit, author, line, content }
  if (
    payload.length > 0 &&
    typeof payload[0] === 'object' &&
    payload[0] !== null &&
    ('content' in payload[0] || 'line' in payload[0]) &&
    !('lines' in payload[0])
  ) {
    return payload.map((item, index) => {
      const row = item as Record<string, unknown>;
      return {
        commit: typeof row.commit === 'string' ? row.commit : undefined,
        author: typeof row.author === 'string' ? row.author : undefined,
        line: typeof row.line === 'number' ? row.line : index + 1,
        content: typeof row.content === 'string' ? row.content : undefined,
      };
    });
  }

  // GitLab blame ranges: { commit: { id, author_name, ... }, lines: string[] }
  const lines: BlameLine[] = [];
  let lineNo = 1;
  for (const item of payload) {
    if (typeof item !== 'object' || item === null) continue;
    const range = item as {
      commit?: { id?: string; short_id?: string; author_name?: string; authorName?: string };
      lines?: string[];
    };
    const commitId = range.commit?.id || range.commit?.short_id || '';
    const author = range.commit?.author_name || range.commit?.authorName || '';
    const rangeLines = Array.isArray(range.lines) ? range.lines : [];
    if (rangeLines.length === 0) {
      lines.push({
        commit: commitId || undefined,
        author: author || undefined,
        line: lineNo,
      });
      lineNo += 1;
      continue;
    }
    for (const content of rangeLines) {
      lines.push({
        commit: commitId || undefined,
        author: author || undefined,
        line: lineNo,
        content: typeof content === 'string' ? content : String(content ?? ''),
      });
      lineNo += 1;
    }
  }
  return lines;
}

export async function getSpecsFileBlame(
  projectId: string | number,
  filePath: string,
  ref?: string,
) {
  const params = new URLSearchParams({ path: filePath });
  if (ref) params.set('ref', ref);
  const response = await api.get<unknown>(
    `/projects/${projectId}/specs/blame?${params}`,
  );
  if (!response.success) {
    return response as { success: false; error?: string; data?: null };
  }
  // Backend may return `{ blame: [...] }` or a bare blame array.
  const blame = normalizeBlame(response.data);
  return { success: true as const, data: { blame } };
}

export async function searchSpecs(
  projectId: string | number,
  query: string,
  path?: string,
  ref?: string
) {
  const params = new URLSearchParams({ q: query });
  if (path) params.set('path', path);
  if (ref) params.set('ref', ref);
  return api.get<{
    results: SpecSearchHit[];
    hits?: SpecSearchHit[];
    degraded?: boolean;
  }>(`/projects/${projectId}/specs/search?${params}`);
}
