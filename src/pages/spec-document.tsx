import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Save, X } from "lucide-react";
import { getAppProject } from "~/api/project";
import { getSpecsFile, saveSpecsFile } from "~/api/specs";
import { SpecDocumentEditor } from "~/components/spec-document-editor/SpecDocumentEditor";
import { decodeSpecId } from "~/hooks/api/useProjectSpecs";
import "~/components/spec-document-editor/spec-document-editor.css";

function displayNameFromPath(path: string) {
  const name = path.split("/").pop()?.replace(/\.[^.]+$/, "") || path;
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function closeDocumentTab() {
  // Opened via target=_blank from detail; window.close() works for script-opened tabs.
  window.close();
  // Fallback if the browser blocks close (typed URL / refreshed tab).
  window.setTimeout(() => {
    if (!window.closed) {
      window.history.back();
    }
  }, 80);
}

export function SpecDocumentPage({ specId }: { specId: string }) {
  const decoded = useMemo(() => decodeSpecId(specId), [specId]);
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [baseline, setBaseline] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<"success" | "error">("success");
  const hydratedPathRef = useRef<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["projects", decoded?.projectId],
    queryFn: async () => {
      const response = await getAppProject(decoded!.projectId);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Project not found");
      }
      return response.data;
    },
    enabled: !!decoded,
  });

  const fileQuery = useQuery({
    queryKey: ["spec-file", decoded?.projectId, decoded?.path],
    queryFn: async () => {
      const response = await getSpecsFile(decoded!.projectId, decoded!.path);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Spec file not found");
      }
      return response.data;
    },
    enabled: !!decoded,
  });

  // Hydrate once per file path; avoid clobbering in-progress edits on refetch.
  useEffect(() => {
    if (!decoded || !fileQuery.data) return;
    const pathKey = `${decoded.projectId}|${decoded.path}`;
    if (hydratedPathRef.current === pathKey) return;
    hydratedPathRef.current = pathKey;
    setContent(fileQuery.data.content);
    setBaseline(fileQuery.data.content);
  }, [decoded, fileQuery.data]);

  useEffect(() => {
    hydratedPathRef.current = null;
  }, [specId]);

  const dirty = content !== baseline;

  const saveMutation = useMutation({
    mutationFn: async (markdown: string) => {
      if (!decoded) throw new Error("Invalid spec reference");
      const response = await saveSpecsFile(decoded.projectId, {
        path: decoded.path,
        content: markdown,
        commitMessage: commitMessage.trim() || `Update ${decoded.path}`,
        action: "update",
      });
      if (!response.success) throw new Error(response.error || "Failed to save spec");
      return markdown;
    },
    onMutate: () => {
      setNotice(null);
    },
    onSuccess: async (savedContent) => {
      setBaseline(savedContent);
      setCommitMessage("");
      setNoticeKind("success");
      setNotice("Spec saved to GitLab.");
      await queryClient.invalidateQueries({
        queryKey: ["spec-file", decoded?.projectId, decoded?.path],
      });
      await queryClient.invalidateQueries({
        queryKey: ["spec-commits", decoded?.projectId, decoded?.path],
      });
    },
    onError: (error: Error) => {
      setNoticeKind("error");
      setNotice(error.message || "Failed to save spec");
    },
  });


  const requestSave = useCallback(() => {
    if (saveMutation.isPending || content === baseline) return;
    saveMutation.mutate(content);
  }, [baseline, content, saveMutation]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        requestSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestSave]);

  useEffect(() => {
    document.title = decoded
      ? `${displayNameFromPath(decoded.path)} · Spec document`
      : "Spec document";
    return () => {
      document.title = "codetest";
    };
  }, [decoded]);

  const isLoading =
    !!decoded && (projectQuery.isPending || fileQuery.isPending) && !fileQuery.data;
  const hasError =
    !decoded ||
    projectQuery.isError ||
    fileQuery.isError ||
    (!projectQuery.isPending && !fileQuery.isPending && (!projectQuery.data || !fileQuery.data));

  const displayName = decoded ? displayNameFromPath(decoded.path) : "Spec document";
  const projectName = projectQuery.data?.name;
  const pathLabel = decoded?.path;

  return (
    <div className="spec-doc-shell" data-od-id="pane-spec-document">
      <div className="spec-doc-sticky-chrome">
        <header className="spec-doc-topbar">
          <div className="spec-doc-topbar-path">
            <div className="spec-doc-topbar-title">
              {isLoading ? "Document" : displayName}
            </div>
            {(projectName || pathLabel) && !isLoading && !hasError ? (
              <div className="spec-doc-topbar-sub">
                {projectName}
                {projectName && pathLabel ? " / " : null}
                {pathLabel}
              </div>
            ) : null}
          </div>

          <div className="spec-doc-topbar-actions">
            {!isLoading && !hasError ? (
              <>
                <input
                  className="spec-doc-commit-input"
                  placeholder="Commit message"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  aria-label="Commit message"
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saveMutation.isPending || !dirty}
                  onClick={requestSave}
                  style={{
                    height: 32,
                    padding: "0 12px",
                    gap: 6,
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {saveMutation.isPending ? (
                    <LoaderCircle size={14} />
                  ) : (
                    <Save size={14} strokeWidth={1.75} />
                  )}
                  {saveMutation.isPending ? "Saving…" : "Save"}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="spec-doc-close-btn"
              onClick={closeDocumentTab}
              title="Close tab"
              aria-label="Close tab"
            >
              <X size={15} strokeWidth={2.25} />
            </button>
          </div>
        </header>
      </div>

      {notice && (
        <div className={`spec-doc-banner is-${noticeKind}`} role="status">
          {notice}
        </div>
      )}

      {isLoading ? (
        <div className="spec-doc-loading" role="status" aria-live="polite">
          <LoaderCircle
            size={20}
            style={{ animation: "spin 0.9s linear infinite" }}
            aria-hidden
          />
          <span>Loading document…</span>
        </div>
      ) : hasError ? (
        <div className="spec-doc-loading">
          <p style={{ color: "var(--danger)", margin: 0, textAlign: "center", maxWidth: 420 }}>
            {!decoded
              ? "This spec is not linked to a live project file."
              : String(
                  (projectQuery.error || fileQuery.error)?.message ||
                    "Couldn’t load this document.",
                )}
          </p>
        </div>
      ) : (
        <div className="spec-doc-body">
          <SpecDocumentEditor
            key={`${decoded!.projectId}:${decoded!.path}`}
            initialMarkdown={fileQuery.data!.content}
            onMarkdownChange={setContent}
          />
        </div>
      )}
    </div>
  );
}
