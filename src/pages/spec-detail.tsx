import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  createFSDIssues,
  getAppProject,
  previewFSDIssues,
  type FSDIssueCreateResponse,
  type FSDIssueDraft,
} from "~/api/project";
import {
  deleteSpecsFile,
  getSpecsCommitDetail,
  getSpecsCommits,
  getSpecsFile,
  getSpecsFileBlame,
  saveSpecsFile,
} from "~/api/specs";
import { useCurrentUser } from "~/hooks/api/useCurrentUser";
import { decodeSpecId } from "~/hooks/api/useProjectSpecs";
import { fmtRel } from "~/lib/mock-data-new";
import { colorForName } from "~/lib/map-app-project";

export function SpecDetailPage({ specId }: { specId: string }) {
  const decoded = useMemo(() => decodeSpecId(specId), [specId]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [issueDrafts, setIssueDrafts] = useState<FSDIssueDraft[]>([]);
  const [createResult, setCreateResult] = useState<FSDIssueCreateResponse | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["projects", decoded?.projectId],
    queryFn: async () => {
      const response = await getAppProject(decoded!.projectId);
      if (!response.success || !response.data) throw new Error(response.error || "Project not found");
      return response.data;
    },
    enabled: !!decoded,
  });
  const fileQuery = useQuery({
    queryKey: ["spec-file", decoded?.projectId, decoded?.path],
    queryFn: async () => {
      const response = await getSpecsFile(decoded!.projectId, decoded!.path);
      if (!response.success || !response.data) throw new Error(response.error || "Spec file not found");
      return response.data;
    },
    enabled: !!decoded,
  });
  const commitsQuery = useQuery({
    queryKey: ["spec-commits", decoded?.projectId, decoded?.path],
    queryFn: async () => {
      const response = await getSpecsCommits(decoded!.projectId, { path: decoded!.path });
      if (!response.success || !response.data) throw new Error(response.error || "Commit history unavailable");
      return response.data.commits ?? [];
    },
    enabled: !!decoded,
  });
  const commitDetailQuery = useQuery({
    queryKey: ["spec-commit", decoded?.projectId, selectedCommit],
    queryFn: async () => {
      const response = await getSpecsCommitDetail(decoded!.projectId, selectedCommit!);
      if (!response.success || !response.data) throw new Error(response.error || "Commit detail unavailable");
      return response.data;
    },
    enabled: !!decoded && !!selectedCommit,
  });
  const blameQuery = useQuery({
    queryKey: ["spec-blame", decoded?.projectId, decoded?.path],
    queryFn: async () => {
      const response = await getSpecsFileBlame(decoded!.projectId, decoded!.path);
      if (!response.success || !response.data) throw new Error(response.error || "Blame unavailable");
      return response.data.blame ?? [];
    },
    enabled: !!decoded,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!decoded) throw new Error("Invalid spec reference");
      const response = await saveSpecsFile(decoded.projectId, {
        path: decoded.path,
        content,
        commitMessage: commitMessage.trim() || `Update ${decoded.path}`,
        action: "update",
      });
      if (!response.success) throw new Error(response.error || "Failed to save spec");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["spec-file", decoded?.projectId, decoded?.path] });
      await queryClient.invalidateQueries({ queryKey: ["spec-commits", decoded?.projectId, decoded?.path] });
      setEditing(false);
      setCommitMessage("");
      setNotice("Spec saved to GitLab.");
    },
    onError: (error) => setNotice(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!decoded) throw new Error("Invalid spec reference");
      const response = await deleteSpecsFile(decoded.projectId, {
        path: decoded.path,
        commitMessage: `Delete ${decoded.path}`,
      });
      if (!response.success) throw new Error(response.error || "Failed to delete spec");
    },
    onSuccess: () => navigate({ to: "/specs" }),
    onError: (error) => setNotice(error.message),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!decoded) throw new Error("Invalid spec reference");
      const response = await previewFSDIssues(decoded.projectId, [{ path: decoded.path }]);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Could not generate issue preview");
      }
      return response.data.issues;
    },
    onSuccess: (issues) => {
      setIssueDrafts(issues);
      setCreateResult(null);
      setNotice(null);
    },
    onError: (error) => setNotice(error.message),
  });

  const createIssuesMutation = useMutation({
    mutationFn: async () => {
      if (!decoded) throw new Error("Invalid spec reference");
      if (issueDrafts.length === 0) throw new Error("No issue drafts to create");
      const response = await createFSDIssues(decoded.projectId, issueDrafts);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Could not create GitLab issues");
      }
      return response.data;
    },
    onSuccess: (result) => {
      setCreateResult(result);
      const failed = result.failedCount ?? 0;
      const created = result.createdCount ?? 0;
      if (failed > 0 && created > 0) {
        setNotice(`Created ${created} issue${created === 1 ? "" : "s"}; ${failed} failed.`);
      } else if (failed > 0) {
        setNotice(`Could not create issues (${failed} failed).`);
      } else {
        setNotice(`Created ${created} issue${created === 1 ? "" : "s"}.`);
      }
    },
    onError: (error) => setNotice(error.message),
  });

  if (!decoded) {
    return (
      <StatePane
        title="Spec reference unavailable"
        message="This spec is not linked to a live project file."
      />
    );
  }
  if (projectQuery.isPending || fileQuery.isPending) {
    return <StatePane title="Loading spec" message="Reading the file from GitLab…" />;
  }
  if (projectQuery.isError || fileQuery.isError || !projectQuery.data || !fileQuery.data) {
    return (
      <StatePane
        title="Couldn’t load spec"
        message={String((projectQuery.error || fileQuery.error)?.message || "Unexpected error")}
      />
    );
  }

  const project = projectQuery.data;
  const file = fileQuery.data;
  const name = decoded.path.split("/").pop()?.replace(/\.[^.]+$/, "") || decoded.path;
  const displayName = name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const authorName = editing
    ? user.data?.name || user.data?.username || "You"
    : "Repository file";
  const blameLines = blameQuery.data ?? [];

  const updateDraft = (index: number, patch: Partial<FSDIssueDraft>) => {
    setIssueDrafts((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  return (
    <div className="app-pane" id="pane-spec-detail" data-od-id="pane-spec-detail">
      <div className="page-head">
        <div className="page-head-text" style={{ width: "100%" }}>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/specs">Specs</Link>
            <span className="sep">›</span>
            <Link to="/projects/$id/specs" params={{ id: project.id }}>
              {project.name}
            </Link>
            <span className="sep">›</span>
            <span className="current">{displayName}</span>
          </nav>
          <div className="detail-title-row">
            <span className="detail-title">{displayName}</span>
            <div className="detail-actions">
              {!editing && (
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setContent(file.content);
                    setEditing(true);
                    setNotice(null);
                  }}
                >
                  Edit
                </button>
              )}
              {editing && (
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </button>
              )}
              <button
                className="btn btn-secondary"
                type="button"
                disabled={previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
              >
                {previewMutation.isPending ? "Preparing…" : "Create issues"}
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  window.confirm(`Delete ${displayName}?`) && deleteMutation.mutate()
                }
              >
                Delete
              </button>
            </div>
          </div>
          <div className="page-head-meta">
            <code>{decoded.path}</code> · {project.name}
          </div>
        </div>
      </div>

      <div className="page-body">
        {notice && (
          <div className="form-banner is-success is-visible" role="status" style={{ marginBottom: 16 }}>
            {notice}
          </div>
        )}
        <div className="detail-stats" data-od-id="spec-stats">
          <div className="stat">
            <div className="stat-label">Project</div>
            <div className="stat-value">
              <span className="td-project">
                <span className="project-dot" style={{ background: colorForName(project.name) }} />
                {project.name}
              </span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">{editing ? "Editing as" : "Source"}</div>
            <div className="stat-value">{authorName}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Size</div>
            <div className="stat-value">{file.size.toLocaleString()} bytes</div>
          </div>
          <div className="stat">
            <div className="stat-label">Last commit</div>
            <div className="stat-value">
              {commitsQuery.data?.[0] ? fmtRel(commitsQuery.data[0].committedDate) : "—"}
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-col-main">
            <section className="panel" data-od-id="spec-body">
              <div className="panel-head">
                <span className="panel-title">{editing ? "Edit spec" : "Content"}</span>
                {editing && (
                  <input
                    className="input"
                    style={{ marginLeft: "auto", width: 260, height: 28 }}
                    placeholder="Commit message"
                    value={commitMessage}
                    onChange={(event) => setCommitMessage(event.target.value)}
                  />
                )}
              </div>
              <div className="panel-body">
                {editing ? (
                  <textarea
                    className="textarea"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    style={{
                      minHeight: 520,
                      width: "100%",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  />
                ) : (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      lineHeight: 1.7,
                      overflowX: "auto",
                    }}
                  >
                    {file.content}
                  </pre>
                )}
              </div>
            </section>

            {issueDrafts.length > 0 && (
              <section className="panel" style={{ marginTop: 20 }} data-od-id="fsd-issue-preview">
                <div className="panel-head">
                  <span className="panel-title">Issue preview</span>
                  <span className="panel-meta">
                    {issueDrafts.length} draft{issueDrafts.length === 1 ? "" : "s"} · edit before creating
                  </span>
                </div>
                <div className="panel-body" style={{ display: "grid", gap: 16 }}>
                  {issueDrafts.map((draft, index) => (
                    <div
                      key={`${draft.sourcePath}-${index}`}
                      style={{
                        display: "grid",
                        gap: 8,
                        paddingBottom: 16,
                        borderBottom:
                          index < issueDrafts.length - 1 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <input
                        className="input"
                        value={draft.title}
                        onChange={(event) => updateDraft(index, { title: event.target.value })}
                        placeholder="Issue title"
                      />
                      <textarea
                        className="textarea"
                        value={draft.description}
                        onChange={(event) =>
                          updateDraft(index, { description: event.target.value })
                        }
                        rows={6}
                      />
                      <label style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          Labels (comma-separated)
                        </span>
                        <input
                          className="input"
                          value={(draft.labels || []).join(", ")}
                          onChange={(event) =>
                            updateDraft(index, {
                              labels: event.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="e.g. qa, fsd"
                        />
                      </label>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={createIssuesMutation.isPending || issueDrafts.length === 0}
                      onClick={() => createIssuesMutation.mutate()}
                    >
                      {createIssuesMutation.isPending
                        ? "Creating…"
                        : `Create ${issueDrafts.length} issue${issueDrafts.length === 1 ? "" : "s"}`}
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={createIssuesMutation.isPending}
                      onClick={() => {
                        setIssueDrafts([]);
                        setCreateResult(null);
                      }}
                    >
                      Clear preview
                    </button>
                  </div>
                </div>
              </section>
            )}

            {createResult && (
              <section className="panel" style={{ marginTop: 20 }} data-od-id="fsd-issue-results">
                <div className="panel-head">
                  <span className="panel-title">Create results</span>
                  <span className="panel-meta">
                    {createResult.createdCount} created · {createResult.failedCount} failed
                  </span>
                </div>
                <div className="panel-body" style={{ display: "grid", gap: 10 }}>
                  {createResult.results.map((row, index) => (
                    <div
                      key={`${row.title}-${index}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                        fontSize: 13,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{row.title}</strong>
                        {row.error && (
                          <div style={{ color: "var(--danger)", fontSize: 12 }}>{row.error}</div>
                        )}
                      </div>
                      {row.status === "success" && row.issue?.web_url ? (
                        <a href={row.issue.web_url} target="_blank" rel="noreferrer">
                          #{row.issue.iid ?? "open"}
                        </a>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{row.status}</span>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="detail-col-side">
            <section className="panel" data-od-id="spec-history">
              <div className="panel-head">
                <span className="panel-title">Commit history</span>
                <span className="panel-meta">{commitsQuery.data?.length ?? 0}</span>
              </div>
              <div className="recent-list">
                {commitsQuery.isPending ? (
                  <div className="panel-body">Loading history…</div>
                ) : commitsQuery.data?.length ? (
                  commitsQuery.data.slice(0, 8).map((commit) => (
                    <div
                      className="recent-row"
                      key={commit.hash}
                      style={{ gridTemplateColumns: "1fr auto" }}
                    >
                      <div>
                        <strong>{commit.message}</strong>
                        <div className="recent-when">
                          {commit.authorName} · {fmtRel(commit.committedDate)}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() =>
                          setSelectedCommit(selectedCommit === commit.hash ? null : commit.hash)
                        }
                      >
                        {selectedCommit === commit.hash ? "Hide" : commit.shortHash}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="panel-body" style={{ color: "var(--muted)" }}>
                    No commits found.
                  </div>
                )}
              </div>
              {selectedCommit && (
                <div className="panel-body" style={{ borderTop: "1px solid var(--border)" }}>
                  {commitDetailQuery.isPending
                    ? "Loading diff…"
                    : commitDetailQuery.data?.diffs?.map((diff) => (
                        <pre
                          key={diff.newPath}
                          style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "var(--muted)" }}
                        >
                          {diff.diff}
                        </pre>
                      ))}
                </div>
              )}
            </section>

            <section className="panel" style={{ marginTop: 20 }} data-od-id="spec-properties">
              <div className="panel-head">
                <span className="panel-title">Properties</span>
              </div>
              <div className="kv-list">
                <div className="kv-row">
                  <div className="kv-key">Repository</div>
                  <div className="kv-val">{project.specsRepoName}</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Source</div>
                  <div className="kv-val">GitLab</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Branch</div>
                  <div className="kv-val">default branch</div>
                </div>
              </div>
            </section>

            <section className="panel" style={{ marginTop: 20 }} data-od-id="spec-blame">
              <div className="panel-head">
                <span className="panel-title">Blame</span>
                <span className="panel-meta">
                  {blameQuery.isPending
                    ? "…"
                    : blameLines.length > 0
                      ? `${blameLines.length} lines`
                      : "—"}
                </span>
              </div>
              <div className="panel-body" style={{ maxHeight: 220, overflow: "auto" }}>
                {blameQuery.isPending ? (
                  "Loading blame…"
                ) : blameQuery.isError ? (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    Blame unavailable for this file.
                  </span>
                ) : blameLines.length === 0 ? (
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>
                    Blame unavailable for this file.
                  </span>
                ) : (
                  blameLines.slice(0, 12).map((line, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "var(--muted)",
                        padding: "3px 0",
                      }}
                    >
                      <span style={{ marginRight: 8 }}>
                        {line.commit?.slice(0, 7) || "—"}
                      </span>
                      {line.author ? (
                        <span style={{ marginRight: 8 }}>{line.author}</span>
                      ) : null}
                      {line.content || `line ${line.line ?? index + 1}`}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatePane({ title, message }: { title: string; message: string }) {
  return (
    <div className="app-pane">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{message}</p>
        </div>
      </div>
    </div>
  );
}
