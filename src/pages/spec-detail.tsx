import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LoaderCircle, Pencil, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { getAppProject } from "~/api/project";
import {
  deleteSpecsFile,
  getSpecsCommitDetail,
  getSpecsCommits,
  getSpecsFile,
  saveSpecsFile,
  type SpecCommit,
} from "~/api/specs";
import { decodeSpecId } from "~/hooks/api/useProjectSpecs";
import { fmtRel } from "~/lib/mock-data-new";
import {
  Skeleton,
  SpecDetailSkeleton,
  SpecHistorySkeleton,
} from "~/components/Skeleton";
import { SpecDocumentEditor } from "~/components/spec-document-editor/SpecDocumentEditor";
import { CommitDiffViewer } from "~/components/commit-diff-view";
import "~/components/spec-document-editor/spec-document-editor.css";

interface CodeBlock {
  type: "code";
  lang: string;
  code: string;
}
interface HeadingBlock {
  type: "heading";
  level: number;
  text: string;
}
interface ParagraphBlock {
  type: "paragraph";
  text: string;
}
interface ListItem {
  text: string;
  /** null when the item is a plain bullet, not a `- [ ]` task item. */
  checked: boolean | null;
}
interface ListBlock {
  type: "list";
  ordered: boolean;
  items: ListItem[];
}
interface BlockquoteBlock {
  type: "blockquote";
  text: string;
}
interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}
interface HrBlock {
  type: "hr";
}

type MarkdownBlock =
  | CodeBlock
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | BlockquoteBlock
  | TableBlock
  | HrBlock;

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// GFM task item: "- [ ] todo" / "- [x] done". The spec editor writes these
// for acceptance criteria, so the reader has to recognise them too.
const TASK_ITEM_MARKER = /^\[([ xX])\]\s+/;

function parseListItem(raw: string): ListItem {
  const match = raw.match(TASK_ITEM_MARKER);
  if (!match) return { text: raw, checked: null };
  return {
    text: raw.slice(match[0].length),
    checked: match[1].toLowerCase() === "x",
  };
}

function parseMarkdown(md: string): MarkdownBlock[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lang, code: codeLines.join("\n") });
      continue;
    }

    if (/^(---|___|\*\*\*)\s*$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const splitRow = (row: string) =>
          row
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
        const headers = splitRow(tableLines[0]);
        const hasDivider = /^[\s|:-]+$/.test(tableLines[1]);
        const dataRows = (hasDivider ? tableLines.slice(2) : tableLines.slice(1)).map(splitRow);
        blocks.push({ type: "table", headers, rows: dataRows });
        continue;
      }
    }

    if (/^[-*+]\s+/.test(line.trim())) {
      const items: ListItem[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(parseListItem(lines[i].trim().replace(/^[-*+]\s+/, "")));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items: ListItem[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(parseListItem(lines[i].trim().replace(/^\d+\.\s+/, "")));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---|___|\*\*\*)\s*$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|"))
    ) {
      pLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: pLines.join(" ") });
  }

  return blocks;
}

function SpecMarkdownView({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);

  // Share `.spec-doc-prose` with the TipTap editor so view ↔ edit keep the
  // same type scale, spacing, and block chrome. Only the toolbar differs.
  return (
    <div className="spec-doc-prose">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const HeadingTag = `h${Math.min(block.level, 4)}` as
              | "h1"
              | "h2"
              | "h3"
              | "h4";
            return (
              <HeadingTag key={idx}>
                {renderInline(block.text)}
              </HeadingTag>
            );
          }
          case "paragraph":
            return <p key={idx}>{renderInline(block.text)}</p>;
          case "list": {
            const isTaskList = block.items.some((item) => item.checked !== null);
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={idx}
                {...(isTaskList ? { "data-type": "taskList" as const } : {})}
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    {...(item.checked !== null
                      ? { "data-checked": item.checked ? "true" : "false" }
                      : {})}
                  >
                    {item.checked !== null ? (
                      <>
                        <label>
                          <input
                            type="checkbox"
                            checked={item.checked}
                            // Read view: the file lives in GitLab, so state
                            // changes belong to the editor, not here.
                            disabled
                            aria-label={
                              item.checked
                                ? "Acceptance criterion met"
                                : "Acceptance criterion not met"
                            }
                            readOnly
                          />
                        </label>
                        <div>{renderInline(item.text)}</div>
                      </>
                    ) : (
                      renderInline(item.text)
                    )}
                  </li>
                ))}
              </ListTag>
            );
          }
          case "blockquote":
            return (
              <blockquote key={idx}>{renderInline(block.text)}</blockquote>
            );
          case "code":
            return (
              <pre key={idx} data-lang={block.lang || undefined}>
                <code>{block.code}</code>
              </pre>
            );
          case "table":
            return (
              <table key={idx}>
                {block.headers.length > 0 && (
                  <thead>
                    <tr>
                      {block.headers.map((header, hIdx) => (
                        <th key={hIdx}>{renderInline(header)}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case "hr":
            return <hr key={idx} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

function CommitDiffModal({
  commit,
  projectId,
  onClose,
}: {
  commit: SpecCommit;
  projectId: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const commitDetailQuery = useQuery({
    queryKey: ["spec-commit", projectId, commit.hash],
    queryFn: async () => {
      const response = await getSpecsCommitDetail(projectId, commit.hash);
      if (!response.success || !response.data) throw new Error(response.error || "Commit detail unavailable");
      return response.data;
    },
  });

  const diffs = useMemo(() => commitDetailQuery.data?.diffs ?? [], [commitDetailQuery.data]);
  const fileCount = commitDetailQuery.isPending ? null : diffs.length;

  return (
    <motion.div
      className="run-modal-overlay diff-modal-overlay"
      style={{ animation: "none" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="run-modal diff-modal"
        style={{ animation: "none" }}
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          className="run-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close commit diff modal"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="run-modal-head diff-modal-head">
          <h2 className="diff-modal-title" id="diff-modal-title">
            {commit.message}
          </h2>
          <p className="diff-modal-meta">
            <span className="diff-modal-author">{commit.authorName || "Unknown"}</span>
            <span className="diff-modal-dot" aria-hidden>
              ·
            </span>
            <span className="diff-modal-when">{fmtRel(commit.committedDate)}</span>
          </p>
          <p className="diff-modal-refs">
            <code className="diff-modal-sha">{commit.shortHash}</code>
            <span className="diff-modal-dot" aria-hidden>
              ·
            </span>
            <span className="diff-modal-files">
              {fileCount === null
                ? "… files"
                : `${fileCount} ${fileCount === 1 ? "file" : "files"}`}
            </span>
          </p>
        </div>

        {commitDetailQuery.isPending ? (
          <div className="diff-reader" aria-busy="true">
            <div className="diff-rail">
              <div className="diff-rail-head">
                <Skeleton width={56} height={11} borderRadius={3} />
              </div>
              <ul className="diff-rail-list">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i}>
                    <div className="diff-rail-item diff-rail-skel" aria-hidden>
                      <Skeleton width={18} height={18} borderRadius={5} />
                      <div className="diff-rail-skel-text">
                        <Skeleton width={`${62 + ((i * 17) % 28)}%`} height={12} borderRadius={3} />
                      </div>
                      <Skeleton width={28} height={10} borderRadius={3} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="diff-pane">
              <div className="diff-pane-body">
                <div className="diff-file-card diff-file-card-skel">
                  <div className="diff-file-head">
                    <Skeleton width={220} height={12} borderRadius={3} />
                    <Skeleton width={64} height={12} borderRadius={3} />
                  </div>
                  <div className="diff-skel-lines">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <Skeleton
                        key={i}
                        width={`${52 + ((i * 19) % 42)}%`}
                        height={12}
                        borderRadius={3}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : commitDetailQuery.isError ? (
          <div className="diff-reader">
            <div className="diff-empty-state is-error">
              {String(commitDetailQuery.error?.message || "Failed to load commit diff")}
            </div>
          </div>
        ) : (
          <CommitDiffViewer diffs={diffs} />
        )}
      </motion.div>
    </motion.div>
  );
}

export function SpecDetailPage({ specId }: { specId: string }) {
  const decoded = useMemo(() => decodeSpecId(specId), [specId]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [activeModalCommit, setActiveModalCommit] = useState<SpecCommit | null>(null);
  // Portal after mount so SSR markup matches the first client paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduceMotion = useReducedMotion();
  // Shared enter/exit for the view ↔ edit layout swap. Blur bridges the
  // crossfade so the eye reads one morph instead of two overlapping layers
  // (Emil: "Use blur to mask imperfect transitions").
  const swapTransition = {
    duration: reduceMotion ? 0.01 : 0.22,
    ease: [0.23, 1, 0.32, 1] as const,
  };
  const swapInitial = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(2px)", transform: "translateY(4px)" };
  const swapAnimate = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" };
  const swapExit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(2px)", transform: "translateY(-3px)" };

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

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editing, saveMutation]);

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

  if (!decoded) {
    return (
      <StatePane
        title="Spec reference unavailable"
        message="This spec is not linked to a live project file."
      />
    );
  }
  if (projectQuery.isPending || fileQuery.isPending) {
    return <SpecDetailSkeleton project={projectQuery.data} path={decoded?.path} />;
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
              <AnimatePresence mode="popLayout" initial={false}>
                {!editing ? (
                  <motion.button
                    key="edit"
                    className="action-chip is-edit"
                    type="button"
                    initial={swapInitial}
                    animate={swapAnimate}
                    exit={swapExit}
                    transition={swapTransition}
                    onClick={() => {
                      setContent(file.content);
                      setEditing(true);
                      setNotice(null);
                    }}
                  >
                    <span className="action-chip-icon" aria-hidden>
                      <Pencil />
                    </span>
                    Edit
                  </motion.button>
                ) : (
                  <motion.div
                    key="edit-actions"
                    className="detail-actions-edit"
                    initial={swapInitial}
                    animate={swapAnimate}
                    exit={swapExit}
                    transition={swapTransition}
                  >
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={saveMutation.isPending}
                      onClick={() => {
                        setContent(file.content);
                        setEditing(false);
                        setCommitMessage("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={saveMutation.isPending}
                      onClick={() => saveMutation.mutate()}
                    >
                      {saveMutation.isPending ? "Saving…" : "Save changes"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <button
                className="action-chip is-delete"
                type="button"
                disabled={deleteMutation.isPending}
                aria-busy={deleteMutation.isPending}
                onClick={() =>
                  window.confirm(`Delete ${displayName}?`) && deleteMutation.mutate()
                }
              >
                <span className="action-chip-icon" aria-hidden>
                  {deleteMutation.isPending ? (
                    <LoaderCircle className="spec-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </span>
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
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

        <div className="detail-grid">
          <div className="detail-col-main">
            <section className="panel" data-od-id="spec-body">
              <div className="spec-body-panel-head">
                <span className="spec-body-panel-label">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={editing ? "edit" : "view"}
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)" }}
                      transition={swapTransition}
                      style={{ display: "inline-block" }}
                    >
                      {editing ? "Edit spec" : "Content"}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AnimatePresence initial={false}>
                    {editing && (
                      <motion.input
                        key="commit-msg"
                        className="input"
                        style={{ width: 220, height: 28 }}
                        placeholder="Commit message"
                        value={commitMessage}
                        onChange={(event) => setCommitMessage(event.target.value)}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateX(6px)" }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateX(0px)" }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateX(6px)" }}
                        transition={swapTransition}
                      />
                    )}
                  </AnimatePresence>
                  <Link
                    className="spec-open-doc-btn"
                    to="/specs/$id/document"
                    params={{ id: specId }}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in document editor"
                  >
                    <SquareArrowOutUpRight aria-hidden />
                    <span>Open</span>
                  </Link>
                </div>
              </div>
              <div className="spec-body-swap" data-editing={editing || undefined}>
                <AnimatePresence mode="sync" initial={false}>
                  {editing ? (
                    <motion.div
                      key="editor"
                      className="spec-body-swap-layer"
                      initial={swapInitial}
                      animate={swapAnimate}
                      exit={swapExit}
                      transition={swapTransition}
                    >
                      <div className="spec-detail-editor-container">
                        <SpecDocumentEditor
                          key={`${decoded.projectId}:${decoded.path}:edit`}
                          initialMarkdown={content || file.content}
                          onMarkdownChange={setContent}
                          className="spec-detail-embedded-editor"
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reader"
                      className="spec-body-swap-layer"
                      initial={swapInitial}
                      animate={swapAnimate}
                      exit={swapExit}
                      transition={swapTransition}
                    >
                      <div className="spec-detail-content-frame">
                        <SpecMarkdownView content={file.content} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>

          <div className="detail-col-side">
            <section className="panel" data-od-id="spec-history">
              <div className="panel-head">
                <span className="panel-title">Commit history</span>
                <span className="panel-meta">
                  {commitsQuery.isPending ? "…" : commitsQuery.data?.length ?? 0}
                </span>
              </div>
              {commitsQuery.isPending ? (
                <SpecHistorySkeleton />
              ) : commitsQuery.data?.length ? (
                <div className="spec-timeline" style={{ position: "relative", padding: "14px 18px" }}>
                  {commitsQuery.data.slice(0, 8).map((commit, index, arr) => {
                    const isLast = index === arr.length - 1;
                    return (
                      <div
                        key={commit.hash}
                        className="spec-timeline-item"
                        onClick={() => setActiveModalCommit(commit)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveModalCommit(commit);
                          }
                        }}
                        style={{
                          paddingBottom: isLast ? 6 : 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: 14,
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--border)",
                              marginTop: 4,
                              flexShrink: 0,
                            }}
                          />
                          {!isLast && (
                            <div
                              style={{
                                width: 1.5,
                                flex: 1,
                                background: "var(--border)",
                                marginTop: 4,
                              }}
                            />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 500,
                                fontSize: 13,
                                lineHeight: 1.4,
                                color: "var(--fg)",
                                wordBreak: "break-word",
                              }}
                            >
                              {commit.message}
                            </div>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                padding: "2px 6px",
                                height: 22,
                                flexShrink: 0,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveModalCommit(commit);
                              }}
                              title="View commit diff"
                            >
                              {commit.shortHash}
                            </button>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginTop: 4,
                              fontSize: 11,
                              color: "var(--muted)",
                            }}
                          >
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "oklch(90% 0.02 250)",
                                color: "var(--fg)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 9,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                flexShrink: 0,
                              }}
                            >
                              {commit.authorName ? commit.authorName.charAt(0) : "—"}
                            </span>
                            <span
                              style={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 130,
                              }}
                            >
                              {commit.authorName}
                            </span>
                            <span style={{ color: "var(--border)" }}>·</span>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontVariantNumeric: "tabular-nums",
                                flexShrink: 0,
                              }}
                            >
                              {fmtRel(commit.committedDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="panel-body" style={{ color: "var(--muted)" }}>
                  No commits found.
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
                  <div className="kv-val">{project.specsRepoName || "—"}</div>
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
          </div>
        </div>
      </div>

      {/* Portal to <body>: `.main` carries `view-transition-name: app-main`,
          which makes `position: fixed` resolve against the content column
          instead of the viewport — so a modal rendered here could never
          cover the sidebar. AnimatePresence keeps the node mounted through
          the exit motion. */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeModalCommit && (
              <CommitDiffModal
                key={activeModalCommit.hash}
                commit={activeModalCommit}
                projectId={project.id}
                onClose={() => setActiveModalCommit(null)}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
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
