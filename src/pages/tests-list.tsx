import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { DEFAULT_PAGE_SIZE, Pagination } from "~/components/Pagination";
import { PopoverMenu } from "~/components/PopoverMenu";
import { fmtDate, fmtRel, getProject, PROJECTS, TESTS } from "~/lib/mock-data-new";
import type { Test, TestStatus } from "~/lib/mock-data-new";

const SORTS = {
  ran: { label: "Last run · newest", cmp: (a: Test, b: Test) => new Date(b.ranAt).getTime() - new Date(a.ranAt).getTime() },
  "ran-asc": { label: "Last run · oldest", cmp: (a: Test, b: Test) => new Date(a.ranAt).getTime() - new Date(b.ranAt).getTime() },
  created: { label: "Created · newest", cmp: (a: Test, b: Test) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() },
  name: { label: "Name · A → Z", cmp: (a: Test, b: Test) => a.name.localeCompare(b.name) },
  steps: { label: "Steps · most", cmp: (a: Test, b: Test) => b.steps - a.steps },
  status: {
    label: "Status · failures first",
    cmp: (a: Test, b: Test) => {
      const rank: Record<TestStatus, number> = { failed: 0, flaky: 1, passed: 2, draft: 3 };
      return rank[a.status] - rank[b.status];
    },
  },
};

type SortKey = keyof typeof SORTS;

function Pill({ status }: { status: TestStatus }) {
  if (status === "passed")
    return (
      <span className="pill pill-success">
        <span className="swatch" />
        passed
      </span>
    );
  if (status === "failed")
    return (
      <span className="pill pill-danger">
        <span className="swatch" />
        failed
      </span>
    );
  if (status === "flaky")
    return (
      <span className="pill pill-warn">
        <span className="swatch" />
        flaky
      </span>
    );
  return (
    <span className="pill">
      <span className="swatch" />
      draft
    </span>
  );
}

export interface TestsListPageProps {
  /**
   * When set, the page is the project-scoped Test Scenarios list at
   * `/projects/$id/test-scenarios`. The project filter is pre-applied
   * and the toolbar's project dropdown is hidden — the surrounding
   * context already provides the project identity.
   */
  defaultProject?: string;
  /**
   * Override the page title. Defaults to "Test Scenarios"; the
   * project-scoped route keeps the same label for consistency.
   */
  pageTitle?: string;
  pageSubtitle?: string;
}

export function TestsListPage({
  defaultProject,
  pageTitle = "Test Scenarios",
  pageSubtitle = "Every automated test your team has committed across every project.",
}: TestsListPageProps = {}) {
  // Works on both /tests (global) and /projects/$id/test-scenarios (project).
  let projectParam: string | undefined;
  try {
    projectParam = (useSearch({ strict: false }) as { project?: string }).project;
  } catch {
    projectParam = undefined;
  }
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>(
    defaultProject ?? projectParam ?? "all",
  );
  const [sort, setSort] = useState<SortKey>("ran");
  const [openMenu, setOpenMenu] = useState<"filter" | "sort" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = TESTS;
    if (filter !== "all") list = list.filter((t) => t.project === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filter, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort(SORTS[sort].cmp);
  }, [filtered, sort]);

  // Any change to the dataset (filter, search, sort) or the page size
  // invalidates the current page — jump back to the first one.
  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery, sort, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, currentPage, pageSize]);

  const applyFilter = (id: string) => {
    if (defaultProject) return; // locked in project context
    setFilter(id);
    if (id === "all") {
      navigate({ to: "/tests" });
    } else {
      navigate({ to: "/tests", search: { project: id } });
    }
  };

  const filterLabel = filter === "all" ? "All projects" : getProject(filter).label;
  const sortLabel = SORTS[sort].label;
  const scopeLabel = defaultProject ? getProject(defaultProject).label : null;

  return (
    <div className="app-pane" id="pane-tests" data-od-id="pane-tests">
      <div className="page-head">
        <div className="page-head-text">
          {scopeLabel && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                marginBottom: 6,
              }}
            >
              <Link to="/tests" params={{ id: defaultProject }}>{scopeLabel}</Link>
              <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
              <span style={{ color: "var(--fg)" }}>{pageTitle}</span>
            </div>
          )}
          <h1 className="page-title">{pageTitle}</h1>
          <p className="page-subtitle">{pageSubtitle}</p>
        </div>
      </div>

      <div className="page-body">
        <div className="toolbar" data-od-id="tests-toolbar">
          {!defaultProject && (
            <div
              className="field"
              id="tests-filter"
              data-od-id="tests-filter"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === "filter" ? null : "filter");
              }}
              style={{ cursor: "pointer" }}
          >
            <span className="field-label">Project</span>
            <span>{filterLabel}</span>
            <span className="field-caret" />
          </div>
          )}

          <div className="field search">
            <svg
              viewBox="0 0 16 16"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              style={{ color: "var(--muted)" }}
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L13.5 13.5" />
            </svg>
            <input
              type="text"
              placeholder="Search tests"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="field"
            id="tests-sort"
            data-od-id="tests-sort"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu(openMenu === "sort" ? null : "sort");
            }}
            style={{ cursor: "pointer" }}
          >
            <span className="field-label">Sort</span>
            <span>{sortLabel}</span>
            <span className="field-caret" />
          </div>

          <div className="spacer" />
          <button
            className="btn btn-secondary"
            onClick={() => alert("Export CSV: not implemented in UI migration")}
          >
            Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => alert("New test: not implemented in UI migration")}
          >
            New test
          </button>
        </div>

        <section className="panel" data-od-id="tests-panel">
          <table className="tests-table">
            <thead>
              <tr>
                <th className="col-name" data-sort="name">
                  Name <span className="caret">↕</span>
                </th>
                <th className="col-project">Project</th>
                <th className="col-created" data-sort="created">
                  Created <span className="caret">↕</span>
                </th>
                <th
                  className={`col-ran${sort === "ran" || sort === "ran-asc" ? " is-sorted" : ""}`}
                  data-sort="ran"
                  onClick={() => setSort(sort === "ran" ? "ran-asc" : "ran")}
                >
                  Last run <span className="caret">↕</span>
                </th>
                <th className="col-status" data-sort="status">
                  Status <span className="caret">↕</span>
                </th>
                <th className="col-steps" data-sort="steps">
                  Steps <span className="caret">↕</span>
                </th>
              </tr>
            </thead>
            <tbody id="tests-tbody">
              {pageItems.map((t) => {
                const proj = getProject(t.project);
                return (
                  <tr
                    key={t.id}
                    data-od-id={`test-row-${t.id}`}
                    onClick={() => navigate({ to: "/tests/$id", params: { id: t.id } })}
                  >
                    <td className="td-name">
                      <Link
                        className="td-name-link"
                        to="/tests/$id" params={{ id: t.id }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td>
                      <span className="td-project">
                        <span
                          className="project-dot"
                          style={{ background: proj.color }}
                        />
                        {proj.label}
                      </span>
                    </td>
                    <td className="col-created">{fmtDate(t.createdAt)}</td>
                    <td className="col-ran">{fmtRel(t.ranAt)}</td>
                    <td className="col-status">
                      <Pill status={t.status} />
                    </td>
                    <td className="col-steps">{t.steps}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              {sorted.length === 0
                ? "No tests"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    sorted.length,
                  )} of ${sorted.length} test${sorted.length === 1 ? "" : "s"}`}
              {!defaultProject && filter !== "all" ? " · filtered" : ""}
            </span>
            <div className="spacer" />
            <Pagination
              page={currentPage}
              pageCount={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          </div>
        </section>
      </div>

      <PopoverMenu
        open={openMenu === "filter"}
        anchor={
          typeof document !== "undefined"
            ? document.getElementById("tests-filter")
            : null
        }
        onClose={() => setOpenMenu(null)}
      >
        {[
          { id: "all", label: "All projects" },
          ...PROJECTS.map((p) => ({ id: p.id, label: p.label })),
        ].map((it) => (
          <button
            key={it.id}
            type="button"
            className={`popover-item${it.id === filter ? " is-selected" : ""}`}
            onClick={() => {
              applyFilter(it.id);
              setOpenMenu(null);
            }}
          >
            {it.label}
            {it.id === filter && <span className="popover-item-check">✓</span>}
          </button>
        ))}
      </PopoverMenu>
      <PopoverMenu
        open={openMenu === "sort"}
        anchor={
          typeof document !== "undefined"
            ? document.getElementById("tests-sort")
            : null
        }
        onClose={() => setOpenMenu(null)}
      >
        {Object.entries(SORTS).map(([k, v]) => (
          <button
            key={k}
            type="button"
            className={`popover-item${k === sort ? " is-selected" : ""}`}
            onClick={() => {
              setSort(k as SortKey);
              setOpenMenu(null);
            }}
          >
            {v.label}
            {k === sort && <span className="popover-item-check">✓</span>}
          </button>
        ))}
      </PopoverMenu>
    </div>
  );
}
