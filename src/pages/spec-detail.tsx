import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";
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
interface ListBlock {
  type: "list";
  ordered: boolean;
  items: string[];
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
        <code
          key={match.index}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.88em",
            padding: "2px 5px",
            borderRadius: 4,
            background: "oklch(96% 0.005 250)",
            border: "1px solid var(--border)",
            color: "var(--fg)",
          }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 600, color: "var(--fg)" }}>
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
            style={{ color: "var(--accent)", textDecoration: "underline" }}
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
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
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

  return (
    <div
      className="spec-prose"
      style={{
        fontSize: 14,
        lineHeight: 1.7,
        color: "var(--fg)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading": {
            const HeadingTag = `h${block.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
            const fontSizes: Record<number, number> = {
              1: 22,
              2: 18,
              3: 15,
              4: 14,
              5: 13,
              6: 12,
            };
            return (
              <HeadingTag
                key={idx}
                style={{
                  fontSize: fontSizes[block.level] ?? 16,
                  fontWeight: 600,
                  color: "var(--fg)",
                  margin: 0,
                  paddingTop: idx > 0 ? 8 : 0,
                  paddingBottom: 4,
                  borderBottom: block.level <= 2 ? "1px solid var(--border)" : "none",
                  letterSpacing: "-0.01em",
                }}
              >
                {renderInline(block.text)}
              </HeadingTag>
            );
          }
          case "paragraph":
            return (
              <p key={idx} style={{ margin: 0, color: "var(--fg)" }}>
                {renderInline(block.text)}
              </p>
            );
          case "list": {
            const ListTag = block.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={idx}
                style={{
                  margin: 0,
                  paddingLeft: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{renderInline(item)}</li>
                ))}
              </ListTag>
            );
          }
          case "blockquote":
            return (
              <blockquote
                key={idx}
                style={{
                  margin: 0,
                  padding: "8px 14px",
                  borderLeft: "3px solid var(--accent)",
                  background: "oklch(97% 0.005 250)",
                  borderRadius: "0 6px 6px 0",
                  color: "var(--muted)",
                  fontStyle: "italic",
                }}
              >
                {renderInline(block.text)}
              </blockquote>
            );
          case "code":
            return (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--surface)",
                  overflow: "hidden",
                }}
              >
                {block.lang && (
                  <div
                    style={{
                      padding: "4px 10px",
                      background: "oklch(96% 0.005 250)",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {block.lang}
                  </div>
                )}
                <pre
                  style={{
                    margin: 0,
                    padding: "12px 14px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    lineHeight: 1.6,
                    overflowX: "auto",
                    color: "var(--fg)",
                  }}
                >
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          case "table":
            return (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                >
                  {block.headers.length > 0 && (
                    <thead>
                      <tr style={{ background: "oklch(96% 0.005 250)" }}>
                        {block.headers.map((header, hIdx) => (
                          <th
                            key={hIdx}
                            style={{
                              padding: "8px 12px",
                              borderBottom: "1px solid var(--border)",
                              fontWeight: 600,
                              color: "var(--fg)",
                            }}
                          >
                            {renderInline(header)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom:
                            rIdx < block.rows.length - 1
                              ? "1px solid var(--border)"
                              : undefined,
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            style={{
                              padding: "8px 12px",
                              color: "var(--fg)",
                            }}
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return (
              <hr
                key={idx}
                style={{
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  margin: "8px 0",
                }}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

interface ParsedDiffLine {
  type: "hunk" | "addition" | "deletion" | "context";
  oldNum: number | null;
  newNum: number | null;
  prefix: string;
  content: string;
}

function getDiffStats(diffText?: string) {
  if (!diffText) return { additions: 0, deletions: 0 };
  let additions = 0;
  let deletions = 0;
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions++;
    else if (line.startsWith("-") && !line.startsWith("---")) deletions++;
  }
  return { additions, deletions };
}

function DiffLinesViewer({
  rawDiff,
  emptyNotice,
}: {
  rawDiff: string;
  emptyNotice?: string;
}) {
  if (!rawDiff || !rawDiff.trim()) {
    return (
      <div className="diff-empty-banner">
        {emptyNotice || "No textual changes to display."}
      </div>
    );
  }

  const parsedLines = useMemo(() => {
    const rawLines = rawDiff.replace(/\r\n/g, "\n").split("\n");
    const result: ParsedDiffLine[] = [];
    let currentOldLine = 1;
    let currentNewLine = 1;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (line.startsWith("---") || line.startsWith("+++")) {
        continue;
      }

      if (line.startsWith("@@")) {
        const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          currentOldLine = parseInt(match[1], 10);
          currentNewLine = parseInt(match[2], 10);
        }
        result.push({
          type: "hunk",
          oldNum: null,
          newNum: null,
          prefix: "...",
          content: line,
        });
        continue;
      }

      if (line.startsWith("+")) {
        result.push({
          type: "addition",
          oldNum: null,
          newNum: currentNewLine++,
          prefix: "+",
          content: line.slice(1),
        });
        continue;
      }

      if (line.startsWith("-")) {
        result.push({
          type: "deletion",
          oldNum: currentOldLine++,
          newNum: null,
          prefix: "-",
          content: line.slice(1),
        });
        continue;
      }

      if (line.startsWith("\\")) {
        result.push({
          type: "context",
          oldNum: null,
          newNum: null,
          prefix: " ",
          content: line,
        });
        continue;
      }

      if (line === "" && i === rawLines.length - 1) {
        continue;
      }

      result.push({
        type: "context",
        oldNum: currentOldLine++,
        newNum: currentNewLine++,
        prefix: " ",
        content: line.startsWith(" ") ? line.slice(1) : line,
      });
    }

    return result;
  }, [rawDiff]);

  return (
    <div className="diff-lines-wrap">
      {parsedLines.map((row, idx) => (
        <div key={idx} className={`diff-line is-${row.type}`}>
          <span className="diff-line-num-old">
            {row.type === "hunk" ? "..." : row.oldNum ?? ""}
          </span>
          <span className="diff-line-num-new">
            {row.type === "hunk" ? "..." : row.newNum ?? ""}
          </span>
          <span className="diff-line-prefix">
            {row.type === "hunk" ? " " : row.prefix}
          </span>
          <span className="diff-line-content">{row.content || " "}</span>
        </div>
      ))}
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

  return (
    <div
      className="run-modal-overlay diff-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
    >
      <div className="run-modal diff-modal" onClick={(e) => e.stopPropagation()}>
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

        <div className="run-modal-head">
          <div className="run-modal-eyebrow">
            <span>Commit changes</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                background: "oklch(95% 0.005 250)",
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              {commit.shortHash}
            </code>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>{commitDetailQuery.data?.diffs?.length ?? 0} files changed</span>
          </div>
          <h2 className="run-modal-title" id="diff-modal-title">
            {commit.message}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "oklch(90% 0.02 250)",
                color: "var(--fg)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              {commit.authorName ? commit.authorName.charAt(0) : "—"}
            </span>
            <strong style={{ color: "var(--fg)" }}>{commit.authorName}</strong>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>committed {fmtRel(commit.committedDate)}</span>
          </div>
        </div>

        <div className="diff-modal-body">
          {commitDetailQuery.isPending ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="diff-file-card">
                <div className="diff-file-head">
                  <Skeleton width={180} height={12} borderRadius={3} />
                  <Skeleton width={60} height={12} borderRadius={3} />
                </div>
                <div style={{ padding: "14px", display: "grid", gap: 8 }}>
                  <Skeleton width="92%" height={12} borderRadius={3} />
                  <Skeleton width="65%" height={12} borderRadius={3} />
                  <Skeleton width="80%" height={12} borderRadius={3} />
                  <Skeleton width="45%" height={12} borderRadius={3} />
                </div>
              </div>
            </div>
          ) : commitDetailQuery.isError ? (
            <div style={{ padding: "24px", textAlign: "center", color: "var(--danger)" }}>
              {String(commitDetailQuery.error?.message || "Failed to load commit diff")}
            </div>
          ) : commitDetailQuery.data?.diffs?.length ? (
            commitDetailQuery.data.diffs.map((diff, index) => {
              const stats = getDiffStats(diff.diff);
              return (
                <div
                  key={`${diff.oldPath || ""}-${diff.newPath || ""}-${index}`}
                  className="diff-file-card"
                >
                  <div className="diff-file-head">
                    <div className="diff-file-info">
                      <svg
                        className="diff-file-icon"
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {diff.renamedFile ? (
                        <div className="diff-file-path">
                          <span className="diff-path-old">{diff.oldPath}</span>
                          <span className="diff-path-arrow">→</span>
                          <span className="diff-path-new">{diff.newPath}</span>
                        </div>
                      ) : diff.deletedFile ? (
                        <div className="diff-file-path">
                          <span className="diff-path-old">{diff.oldPath}</span>
                        </div>
                      ) : (
                        <div className="diff-file-path">
                          <span className="diff-path-new">
                            {diff.newPath || diff.oldPath}
                          </span>
                        </div>
                      )}
                      {diff.renamedFile ? (
                        <span className="diff-badge is-renamed">Renamed</span>
                      ) : diff.newFile ? (
                        <span className="diff-badge is-new">New</span>
                      ) : diff.deletedFile ? (
                        <span className="diff-badge is-deleted">Deleted</span>
                      ) : (
                        <span className="diff-badge is-modified">Modified</span>
                      )}
                    </div>
                    {(stats.additions > 0 || stats.deletions > 0) && (
                      <div className="diff-file-stats">
                        {stats.additions > 0 && (
                          <span className="diff-stat-add">+{stats.additions}</span>
                        )}
                        {stats.deletions > 0 && (
                          <span className="diff-stat-del">-{stats.deletions}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <DiffLinesViewer
                    rawDiff={diff.diff}
                    emptyNotice={
                      diff.renamedFile
                        ? "File moved without content changes."
                        : undefined
                    }
                  />
                </div>
              );
            })
          ) : (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
              No file diffs recorded for this commit.
            </div>
          )}
        </div>
      </div>
    </div>
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

        <div className="detail-grid">
          <div className="detail-col-main">
            <section className="panel" data-od-id="spec-body">
              <div className="spec-body-panel-head">
                <span className="spec-body-panel-label">
                  {editing ? "Edit spec" : "Content"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {editing && (
                    <input
                      className="input"
                      style={{ width: 220, height: 28 }}
                      placeholder="Commit message"
                      value={commitMessage}
                      onChange={(event) => setCommitMessage(event.target.value)}
                    />
                  )}
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
                  <SpecMarkdownView content={file.content} />
                )}
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

      {activeModalCommit && (
        <CommitDiffModal
          commit={activeModalCommit}
          projectId={project.id}
          onClose={() => setActiveModalCommit(null)}
        />
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
