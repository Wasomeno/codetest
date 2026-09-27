import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FileDiff,
  FileMinus2,
  FilePlus2,
} from "lucide-react";
import type { CommitDiff } from "~/api/specs";

/* ------------------------------------------------------------------
   Commit diff reader.

   GitLab hands back one unified diff per file. A commit that touches
   twenty files used to render as twenty stacked cards, which is not
   reviewable, so the reader is split in two: a rail that indexes every
   file in the commit, and a pane that shows one file at a time.
   ------------------------------------------------------------------ */

export type DiffRowType = "hunk" | "addition" | "deletion" | "context" | "meta";

export interface DiffRow {
  type: DiffRowType;
  oldNum: number | null;
  newNum: number | null;
  content: string;
}

export interface DiffHunk {
  header: string;
  rows: DiffRow[];
}

export interface ParsedDiff {
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  binary: boolean;
}

const EMPTY_DIFF: ParsedDiff = {
  hunks: [],
  additions: 0,
  deletions: 0,
  binary: false,
};

// Git plumbing that precedes the hunks. Rendering these as diff lines is
// noise: they describe the patch, not the file.
const PLUMBING = [
  "diff --git ",
  "index ",
  "old mode ",
  "new mode ",
  "new file mode ",
  "deleted file mode ",
  "similarity index ",
  "dissimilarity index ",
  "rename from ",
  "rename to ",
  "copy from ",
  "copy to ",
];

const HUNK_HEADER = /^@@+ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/**
 * Parse a unified diff into hunks of typed rows.
 *
 * Tolerates the shapes real APIs return: no `@@` headers at all, blank
 * context lines (many backends strip the leading space), CRLF, and a
 * missing/empty diff body.
 */
export function parseUnifiedDiff(raw?: string): ParsedDiff {
  if (!raw || !raw.trim()) return EMPTY_DIFF;

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const hunks: DiffHunk[] = [];
  let current: DiffHunk | null = null;
  let oldLine = 1;
  let newLine = 1;
  let additions = 0;
  let deletions = 0;
  let sawHunkHeader = false;

  const startHunk = (header: string) => {
    current = { header, rows: [] };
    hunks.push(current);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      return { hunks, additions, deletions, binary: true };
    }

    if (PLUMBING.some((prefix) => line.startsWith(prefix))) continue;
    if (line.startsWith("---") || line.startsWith("+++")) continue;

    if (line.startsWith("@@")) {
      const match = line.match(HUNK_HEADER);
      if (match) {
        sawHunkHeader = true;
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[3], 10);
      }
      startHunk(line);
      continue;
    }

    // A patch body with no @@ headers still has to render with numbers.
    if (!current) startHunk("");

    if (line.startsWith("\\")) {
      current!.rows.push({
        type: "meta",
        oldNum: null,
        newNum: null,
        content: line.slice(1).trim(),
      });
      continue;
    }

    if (line.startsWith("+")) {
      additions++;
      current!.rows.push({
        type: "addition",
        oldNum: null,
        newNum: newLine++,
        content: line.slice(1),
      });
      continue;
    }

    if (line.startsWith("-")) {
      deletions++;
      current!.rows.push({
        type: "deletion",
        oldNum: oldLine++,
        newNum: null,
        content: line.slice(1),
      });
      continue;
    }

    // Blank context line: the leading space was stripped somewhere upstream.
    const isLast = i === lines.length - 1;
    if (line === "" && isLast) continue;

    current!.rows.push({
      type: "context",
      oldNum: oldLine++,
      newNum: newLine++,
      content: line.startsWith(" ") ? line.slice(1) : line,
    });
  }

  // Hunks with no rows carry no information.
  const kept = hunks.filter((hunk) => hunk.rows.length > 0);
  if (!sawHunkHeader && kept.length === 0) return EMPTY_DIFF;
  return { hunks: kept, additions, deletions, binary: false };
}

type FileStatus = "added" | "deleted" | "renamed" | "modified";

interface DiffFileView {
  key: string;
  path: string;
  oldPath?: string;
  status: FileStatus;
  parsed: ParsedDiff;
}

function statusOf(diff: CommitDiff): FileStatus {
  if (diff.renamedFile) return "renamed";
  if (diff.deletedFile) return "deleted";
  if (diff.newFile) return "added";
  return "modified";
}

function statusLabel(status: FileStatus) {
  return status === "added"
    ? "Added"
    : status === "deleted"
      ? "Deleted"
      : status === "renamed"
        ? "Renamed"
        : "Modified";
}

function statusBadgeClass(status: FileStatus) {
  return status === "added"
    ? "is-new"
    : status === "deleted"
      ? "is-deleted"
      : status === "renamed"
        ? "is-renamed"
        : "is-modified";
}

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "added") return <FilePlus2 />;
  if (status === "deleted") return <FileMinus2 />;
  if (status === "renamed") return <ArrowRight />;
  return <FileDiff />;
}

function fileName(path?: string) {
  if (!path) return "(unknown)";
  return path.split("/").pop() || path;
}

const MAX_ROWS = 400;

function DiffRowView({ row }: { row: DiffRow }) {
  if (row.type === "hunk") {
    return (
      <div className="diff-line is-hunk">
        <span className="diff-line-num-old">…</span>
        <span className="diff-line-num-new">…</span>
        <span className="diff-line-prefix" />
        <span className="diff-line-content">{row.content}</span>
      </div>
    );
  }

  if (row.type === "meta") {
    return (
      <div className="diff-line is-meta">
        <span className="diff-line-num-old" />
        <span className="diff-line-num-new" />
        <span className="diff-line-prefix" />
        <span className="diff-line-content">{row.content}</span>
      </div>
    );
  }

  const prefix = row.type === "addition" ? "+" : row.type === "deletion" ? "-" : " ";
  return (
    <div className={`diff-line is-${row.type}`}>
      <span className="diff-line-num-old">{row.oldNum ?? ""}</span>
      <span className="diff-line-num-new">{row.newNum ?? ""}</span>
      <span className="diff-line-prefix">{prefix}</span>
      <span className="diff-line-content">{row.content || " "}</span>
    </div>
  );
}

export function CommitDiffViewer({ diffs }: { diffs: CommitDiff[] }) {
  const files = useMemo<DiffFileView[]>(
    () =>
      diffs.map((diff, index) => ({
        key: `${diff.oldPath || ""}~${diff.newPath || ""}~${index}`,
        path: diff.newPath || diff.oldPath || "(unknown)",
        oldPath: diff.oldPath,
        status: statusOf(diff),
        parsed: parseUnifiedDiff(diff.diff),
      })),
    [diffs],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const selectedIndex = Math.max(
    0,
    files.findIndex((file) => file.key === selectedKey),
  );
  const selected = files[selectedIndex];

  const select = (index: number) => {
    const file = files[index];
    if (file) setSelectedKey(file.key);
  };

  if (!files.length) {
    return (
      <div className="diff-modal-body">
        <div className="diff-empty-state">No file diffs recorded for this commit.</div>
      </div>
    );
  }

  const renderFile = (file: DiffFileView) => {
    const { parsed } = file;
    const isOpen = !collapsed[file.key];
    const rows = parsed.hunks.flatMap((hunk) => [
      { type: "hunk" as const, oldNum: null, newNum: null, content: hunk.header },
      ...hunk.rows,
    ]);
    const isTruncated = rows.length > MAX_ROWS && !revealed[file.key];
    const visible = isTruncated ? rows.slice(0, MAX_ROWS) : rows;

    return (
      <div className="diff-file-card" key={file.key}>
        <button
          type="button"
          className="diff-file-head diff-file-head-toggle"
          aria-expanded={isOpen}
          onClick={() =>
            setCollapsed((prev) => ({ ...prev, [file.key]: isOpen }))
          }
        >
          <span className="diff-file-info">
            <span className={`diff-file-icon is-${file.status}`}>
              <StatusIcon status={file.status} />
            </span>
            <span className="diff-file-path">
              {file.status === "renamed" && file.oldPath ? (
                <>
                  <span className="diff-path-old">{file.oldPath}</span>
                  <span className="diff-path-arrow">→</span>
                </>
              ) : null}
              <span className="diff-path-new">{file.path}</span>
            </span>
            <span className={`diff-badge ${statusBadgeClass(file.status)}`}>
              {statusLabel(file.status)}
            </span>
          </span>
          <span className="diff-file-stats">
            {parsed.additions > 0 && (
              <span className="diff-stat-add">+{parsed.additions}</span>
            )}
            {parsed.deletions > 0 && (
              <span className="diff-stat-del">−{parsed.deletions}</span>
            )}
            <span className="diff-file-caret" aria-hidden>
              {isOpen ? <ChevronDown /> : <ChevronRight />}
            </span>
          </span>
        </button>

        {isOpen ? (
          parsed.binary ? (
            <div className="diff-empty-banner">Binary file — no textual diff.</div>
          ) : rows.length === 0 ? (
            <div className="diff-empty-banner">
              {file.status === "renamed"
                ? "File moved without content changes."
                : "No textual changes to display."}
            </div>
          ) : (
            <>
              <div className="diff-lines-wrap">
                {visible.map((row, index) => (
                  <DiffRowView key={index} row={row} />
                ))}
              </div>
              {isTruncated && (
                <button
                  type="button"
                  className="diff-expand-btn"
                  onClick={() =>
                    setRevealed((prev) => ({ ...prev, [file.key]: true }))
                  }
                >
                  <ChevronDown aria-hidden />
                  Show the remaining {rows.length - MAX_ROWS} lines
                </button>
              )}
            </>
          )
        ) : null}
      </div>
    );
  };

  return (
    <div className="diff-reader">
      <nav className="diff-rail" aria-label="Changed files">
        <div className="diff-rail-head">
          <span>{files.length} files</span>
        </div>
        <ul className="diff-rail-list">
          {files.map((file, index) => (
            <li key={file.key}>
              <button
                type="button"
                className={`diff-rail-item${index === selectedIndex ? " is-active" : ""}`}
                aria-current={index === selectedIndex ? "true" : undefined}
                onClick={() => select(index)}
              >
                <span className={`diff-rail-icon is-${file.status}`}>
                  <StatusIcon status={file.status} />
                </span>
                <span className="diff-rail-text">
                  <span className="diff-rail-name" title={file.path}>
                    {fileName(file.path)}
                  </span>
                </span>
                <span className="diff-rail-counts">
                  {file.parsed.additions > 0 && (
                    <span className="diff-stat-add">+{file.parsed.additions}</span>
                  )}
                  {file.parsed.deletions > 0 && (
                    <span className="diff-stat-del">−{file.parsed.deletions}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="diff-pane">
        <div className="diff-pane-body">
          {selected ? (
            renderFile(selected)
          ) : (
            <div className="diff-empty-state">Pick a file to read its diff.</div>
          )}
        </div>
      </div>
    </div>
  );
}
