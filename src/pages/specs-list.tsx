import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { DEFAULT_PAGE_SIZE, Pagination } from "~/components/Pagination";
import { PopoverMenu } from "~/components/PopoverMenu";
import { fmtRel } from "~/lib/mock-data-new";
import { useProjectSpecs } from "~/hooks/api/useProjectSpecs";
import { type LiveSpec } from "~/hooks/api/useProjectSpecs";
import { useProjects } from "~/hooks/api/useProjects";
import { colorForName } from "~/lib/map-app-project";
import { searchSpecs, saveSpecsFile } from "~/api/specs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SORTS = {
  name: { label: "Name · A → Z", cmp: (a: LiveSpec, b: LiveSpec) => a.name.localeCompare(b.name) },
  "name-desc": { label: "Name · Z → A", cmp: (a: LiveSpec, b: LiveSpec) => b.name.localeCompare(a.name) },
  updated: {
    label: "Updated · newest",
    cmp: (a: LiveSpec, b: LiveSpec) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  },
  "updated-asc": {
    label: "Updated · oldest",
    cmp: (a: LiveSpec, b: LiveSpec) =>
      new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  },
};

type SortKey = keyof typeof SORTS;

const SpecIcon = () => (
  <svg
    className="spec-glyph"
    viewBox="0 0 16 16"
    width={13}
    height={13}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 2h6l2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M9 2v3h3" />
  </svg>
);

export interface SpecsListPageProps {
  /**
   * When set, the page is the project-scoped Specs list at
   * `/projects/$id/specs`. The project filter is pre-applied and the
   * toolbar's project dropdown is hidden — the surrounding context
   * already provides the project identity.
   */
  defaultProject?: string;
}

export function SpecsListPage({ defaultProject }: SpecsListPageProps = {}) {
  // Pull the project filter from whatever route we are on. The list page
  // can be mounted at /specs (global) or /projects/$id/specs (project-scoped);
  // both routes register `project` in their validateSearch shape.
  let projectParam: string | undefined;
  try {
    projectParam = (useSearch({ strict: false }) as { project?: string }).project;
  } catch {
    projectParam = undefined;
  }
  const navigate = useNavigate();
  const projectsQuery = useProjects();
  const specsQuery = useProjectSpecs(defaultProject);
  const projects = projectsQuery.data ?? [];
  const specs = specsQuery.data ?? [];
  const [filter, setFilter] = useState<string>(
    defaultProject ?? projectParam ?? "all",
  );
  const [sort, setSort] = useState<SortKey>("updated");
  const [openMenu, setOpenMenu] = useState<"filter" | "sort" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const serverSearchQuery = useQuery({
    queryKey: ["spec-search", defaultProject, searchQuery],
    queryFn: async () => {
      const response = await searchSpecs(defaultProject!, searchQuery.trim());
      if (!response.success || !response.data) throw new Error(response.error || "Failed to search specs");
      return response.data.results ?? [];
    },
    enabled: !!defaultProject && !!searchQuery.trim(),
  });
  const [newSpecOpen, setNewSpecOpen] = useState(false);
  const [newSpecPath, setNewSpecPath] = useState("docs/specs/new-spec.md");
  const [newSpecContent, setNewSpecContent] = useState("# New spec\n\nDescribe the expected behavior.\n");
  const [newSpecProject, setNewSpecProject] = useState(defaultProject ?? "");
  const queryClient = useQueryClient();
  const createSpecMutation = useMutation({
    mutationFn: async () => {
      if (!newSpecProject || !newSpecPath.trim()) throw new Error("Choose a project and enter a file path");
      const response = await saveSpecsFile(newSpecProject, {
        path: newSpecPath.trim(),
        content: newSpecContent,
        action: "create",
        commitMessage: `Create ${newSpecPath.trim()}`,
      });
      if (!response.success) throw new Error(response.error || "Failed to create spec");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["live-specs"] });
      setNewSpecOpen(false);
    },
  });

  const filtered = useMemo(() => {
    let list = specs;
    if (filter !== "all") list = list.filter((s) => s.projectId === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const serverHits = serverSearchQuery.data;
      if (defaultProject && serverHits) {
        const byPath = new Map(
          serverHits.map((hit) => [hit.path, hit.matchPreview]),
        );
        list = list
          .filter((s) => byPath.has(s.path))
          .map((s) => {
            const preview = byPath.get(s.path);
            return preview ? { ...s, matchPreview: preview } : s;
          });
      } else {
        list = list.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.path.toLowerCase().includes(q),
        );
      }
    }
    return list;
  }, [defaultProject, filter, searchQuery, serverSearchQuery.data, specs]);

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
    if (defaultProject) {
      // In project context, switching project means navigating to a
      // different project-scoped page. We don't allow switching from
      // inside a project view; the user uses the sidebar.
      return;
    }
    setFilter(id);
    if (id === "all") navigate({ to: "/specs", search: {} });
    else navigate({ to: "/specs", search: { project: id } });
  };

  const filterLabel = filter === "all"
    ? "All projects"
    : projects.find((project) => project.id === filter)?.name ?? filter;
  const sortLabel = SORTS[sort].label;
  const scopeLabel = defaultProject
    ? projects.find((project) => project.id === defaultProject)?.name ?? defaultProject
    : null;

  return (
    <div className="app-pane" id="pane-specs" data-od-id="pane-specs">
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
              <span style={{ color: "var(--fg)" }}>Specs</span>
            </div>
          )}
          <h1 className="page-title">Specs</h1>
          <p className="page-subtitle">
            Every product behavior your team has committed to, organized by project.
          </p>
        </div>
        <div className="page-head-actions">
          <button
            className="btn btn-secondary"
            type="button"
            disabled
            title="Import is not supported by the current backend"
          >
            Import
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setNewSpecOpen((open) => !open)}
          >
            New spec
          </button>
        </div>
      </div>

      <div className="page-body">
        {newSpecOpen && <section className="panel" style={{ marginBottom: 16 }} data-od-id="new-spec-form"><div className="panel-head"><span className="panel-title">New spec</span><span className="panel-meta">Creates a GitLab file</span></div><div className="panel-body" style={{ display: "grid", gap: 10 }}><select className="input" value={newSpecProject} onChange={(event) => setNewSpecProject(event.target.value)} disabled={!!defaultProject}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><input className="input" value={newSpecPath} onChange={(event) => setNewSpecPath(event.target.value)} placeholder="docs/specs/example.md" /><textarea className="textarea" value={newSpecContent} onChange={(event) => setNewSpecContent(event.target.value)} rows={8} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }} />{createSpecMutation.isError && <span style={{ color: "var(--danger)", fontSize: 12 }}>{String(createSpecMutation.error)}</span>}<button className="btn btn-primary" type="button" disabled={createSpecMutation.isPending} onClick={() => createSpecMutation.mutate()}>{createSpecMutation.isPending ? "Creating…" : "Create spec"}</button></div></section>}
        <div className="toolbar" data-od-id="specs-toolbar">
          {!defaultProject && (
            <div
              className="field"
              id="specs-filter"
              data-od-id="specs-filter"
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
              placeholder="Search by file name or content"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div
            className="field"
            id="specs-sort"
            data-od-id="specs-sort"
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
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {specs.length} specs · {projects.length} projects
          </span>
        </div>

        <section className="panel" data-od-id="specs-panel">
          <table className="specs-table">
            <thead>
              <tr>
                <th className="col-spec-name" data-sort="name">
                  Name <span className="caret">↕</span>
                </th>
                <th className="col-spec-project">Project</th>
                <th
                  className="col-spec-created"
                  data-sort="updated"
                  title="Last commit date when available; otherwise project update"
                >
                  Updated <span className="caret">↕</span>
                </th>
                <th className="col-spec-author">Author</th>
                <th className="col-spec-desc">Path</th>
              </tr>
            </thead>
            <tbody id="specs-tbody">
              {pageItems.map((s) => {
                return (
                  <tr
                    key={s.id}
                    data-od-id={`spec-row-${s.id}`}
                    onClick={() => navigate({ to: "/specs/$id", params: { id: s.id } })}
                  >
                    <td className="td-spec-name">
                      <Link
                        className="td-spec-name-link"
                        to="/specs/$id" params={{ id: s.id }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SpecIcon />
                        {s.name}
                      </Link>
                    </td>
                    <td>
                      <span className="td-project">
                        <span className="project-dot" style={{ background: colorForName(s.projectName) }} />
                        {s.projectName}
                      </span>
                    </td>
                    <td className="col-spec-created">
                      <span title={new Date(s.updatedAt).toLocaleString()}>
                        {fmtRel(s.updatedAt)}
                      </span>
                    </td>
                    <td className="col-spec-author">
                      <span
                        className="author-chip"
                        title={s.authorName || s.source}
                      >
                        <span className="avatar avatar-sm">
                          {s.authorInitials || "R"}
                        </span>
                        <span className="author-name">
                          {s.authorName || s.source}
                        </span>
                      </span>
                    </td>
                    <td className="col-spec-desc">
                      <code style={{ fontSize: 11 }}>{s.path}</code>
                      {s.matchPreview ? (
                        <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                          {s.matchPreview}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-foot">
            <span>
              {sorted.length === 0
                ? "No specs"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    sorted.length,
                  )} of ${sorted.length} spec${sorted.length === 1 ? "" : "s"}`}
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
            ? document.getElementById("specs-filter")
            : null
        }
        onClose={() => setOpenMenu(null)}
      >
        {[
          { id: "all", label: "All projects" },
          ...projects.map((p) => ({ id: p.id, label: p.name })),
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
            ? document.getElementById("specs-sort")
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
