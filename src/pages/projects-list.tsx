import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fmtRel } from "~/lib/mock-data-new";
import type { AppProject, ProjectDashboard } from "~/types/project";
import { useProjects } from "~/hooks/api/useProjects";
import { colorForName } from "~/lib/map-app-project";
import { qk } from "~/api/queryKeys";

/** Cards revealed per scroll page. */
const PAGE_SIZE = 6;
/** Simulated latency when "loading" the next page. */
const PAGE_DELAY_MS = 320;

/**
 * Card data from live `AppProject` + optional dashboard aggregate.
 * Only fields the API can support are shown — no fake run history,
 * environment, or specs count.
 */
interface ProjectCardData {
  project: AppProject;
  color: string;
  tests: number;
  passRate: number | null;
  openIssues: number;
  updatedAt: string;
  dashboardLoading: boolean;
}

function buildCardData(
  project: AppProject,
  dashboard: ProjectDashboard | undefined,
  dashboardLoading: boolean,
): ProjectCardData {
  const passRate = dashboard?.passRate?.value ?? null;
  const tests = dashboard?.testScenarios ?? 0;
  return {
    project,
    color: colorForName(project.name),
    tests,
    passRate,
    openIssues: dashboard?.openIssues ?? 0,
    updatedAt: project.updatedAt,
    dashboardLoading,
  };
}

/**
 * Card with a per-instance entrance delay. We compute it inline (rather than
 * via `:nth-child` keyframes) because cards arrive in waves as the user
 * scrolls — the freshly-revealed batch is what should stagger, not the
 * already-settled cards above the fold. The 24h-trend path draws via
 * `motion.path` so the line reveals in sync with the card settling.
 */
function ProjectCard({
  data,
  index,
}: {
  data: ProjectCardData;
  index: number;
  reduce: boolean | null;
}) {
  const {
    project,
    passRate,
    tests,
    openIssues,
    updatedAt,
    dashboardLoading,
  } = data;

  // Stagger only the latest batch of cards; older ones are already settled
  // and re-staging them on every scroll would feel busy and slow.
  const staggerMs = (index % PAGE_SIZE) * 40;

  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="ap-card"
      data-od-id={`ap-card-${project.id}`}
      data-search={`${project.name} ${project.specsRepoName} ${project.issueRepoName} ${project.frontendRepoName} ${project.backendRepoName}`}
      style={{ animationDelay: `${staggerMs}ms` }}
    >
      <span
        className="ap-stripe"
        style={{ background: data.color }}
        aria-hidden="true"
      />
      <div className="ap-body">
        <div className="ap-head">
          <div className="ap-head-meta">
            <div className="ap-title">
              <span
                className="project-dot"
                style={{ background: data.color }}
              />
              <span className="ap-name">{project.name}</span>
            </div>
            <div className="ap-sub">
              {project.specsRepoName || project.frontendRepoName || 'no repos linked'}
            </div>
          </div>
        </div>

        <div className="ap-stats">
          <div className="ap-stat">
            <div className="ap-stat-label">Open issues</div>
            <div className="ap-stat-value">
              {dashboardLoading ? '…' : openIssues}
            </div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-label">Test scenarios</div>
            <div className="ap-stat-value">
              {dashboardLoading && tests === 0 ? '…' : tests}
            </div>
          </div>
          <div className="ap-stat">
            <div className="ap-stat-label">Pass rate</div>
            <div className="ap-stat-value">
              {passRate === null ? '—' : `${passRate.toFixed(1)}%`}
              <span className="ap-stat-caption">
                {passRate === null ? 'no recent runs' : 'last 7 days'}
              </span>
            </div>
          </div>
        </div>

        <div className="ap-foot">
          <div className="ap-spark">
            <div className="ap-spark-head">
              <span style={{ color: 'var(--muted)' }}>Trend history unavailable</span>
            </div>
          </div>
          <div className="ap-foot-meta">
            <span className="ap-lastrun">
              Updated · {fmtRel(updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function PageLoader() {
  return (
    <div className="ap-page-loader" aria-hidden="true">
      <span className="ap-page-loader-dot" />
      <span className="ap-page-loader-dot" />
      <span className="ap-page-loader-dot" />
    </div>
  );
}

export function ProjectsListPage() {
  const reduce = useReducedMotion();
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Live list of projects from the backend. While the first load is
  // pending, we render skeleton cards so the layout doesn't reflow.
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];

  // Fan out a dashboard request per project. `useQueries` lets us
  // dedupe in-flight requests and gives us a single render point
  // to drive the skeleton → loaded transition. We keep the previous
  // results visible while subsequent pages load (TanStack Query's
  // default `keepPreviousData` semantics inside `useQueries` are
  // approximate; we approximate manually below).
  const dashboardQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: qk.projectDashboard(p.id),
      queryFn: async () => {
        const { getProjectDashboard } = await import('~/api/project');
        const r = await getProjectDashboard(p.id);
        if (!r.success || !r.data) {
          throw new Error(r.error || 'Failed to load dashboard');
        }
        return r.data;
      },
      enabled: projects.length > 0,
      staleTime: 60_000,
    })),
  });

  const pool: ProjectCardData[] = useMemo(
    () =>
      projects.map((p, i) =>
        buildCardData(
          p,
          dashboardQueries[i]?.data as ProjectDashboard | undefined,
          dashboardQueries[i]?.isPending ?? true,
        ),
      ),
    [projects, dashboardQueries],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((d) =>
      (
        d.project.name +
        ' ' +
        d.project.specsRepoName +
        ' ' +
        d.project.issueRepoName +
        ' ' +
        d.project.frontendRepoName +
        ' ' +
        d.project.backendRepoName +
        ' ' +
        d.project.description
      )
        .toLowerCase()
        .includes(q),
    );
  }, [pool, search]);

  // Reset visible window to PAGE_SIZE whenever the filter changes — otherwise
  // we'd render fewer cards than requested and the sentinel would never fire.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const total = filtered.length;
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < total;

  // Simulated "fetch next page" — resolves after a short, jittered delay so
  // the loader has a chance to breathe but the user never waits long.
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const jitter = PAGE_DELAY_MS + Math.random() * 120;
    const timer = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, total));
      setIsLoadingMore(false);
    }, jitter);
    return () => window.clearTimeout(timer);
  }, [hasMore, isLoadingMore, total]);

  // IntersectionObserver on the sentinel — fires `loadMore` when the
  // sentinel scrolls within `200px` of the viewport. Off the main thread,
  // doesn't compete with scroll for rAF budget.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            loadMore();
          }
        }
      },
      { rootMargin: "0px 0px 200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div className="app-pane" id="pane-all-projects" data-od-id="pane-all-projects">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">All projects</h1>
          <p className="page-subtitle">
            Every workspace project and its live health from the project dashboard.
          </p>
        </div>
        <div className="page-head-actions">
          <div
            className="field"
            style={{ height: 28, cursor: "default" }}
            title="Pass rate uses the last 7 days of automation runs"
          >
            <span className="field-label">Pass rate</span>
            <span>Last 7d</span>
          </div>
          <button
            className="btn btn-secondary"
            style={{ height: 28 }}
            onClick={() => alert("Filter: not implemented in UI migration")}
          >
            <svg
              viewBox="0 0 16 16"
              width={12}
              height={12}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 4h12M4 8h8M6 12h4" />
            </svg>
            Filter
          </button>
          <Link
            to="/add-project"
            className="btn btn-primary"
            style={{ height: 28 }}
          >
            <svg
              viewBox="0 0 16 16"
              width={12}
              height={12}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
            New project
          </Link>
        </div>
      </div>

      <div className="page-body">
        <div className="ap-search-row" data-od-id="all-projects-search">
          <label className="ap-search">
            <svg
              className="ap-search-icon"
              viewBox="0 0 16 16"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              className="ap-search-input"
              type="search"
              placeholder="Search projects or repositories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search projects"
            />
            {search && (
              <button
                className="ap-search-clear"
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <svg
                  viewBox="0 0 16 16"
                  width={11}
                  height={11}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </label>
          <span
            className={`ap-count${search ? " is-filtered" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {total === 0
              ? "0 projects"
              : hasMore
                ? `Showing ${visible.length} of ${total}`
                : `${total} project${total === 1 ? "" : "s"}`}
          </span>
        </div>

        {projectsQuery.isPending && projects.length === 0 ? (
          // First-load skeleton — three neutral cards so the page
          // doesn't flash an empty state then pop in.
          <div className="ap-grid" data-od-id="all-projects-skeleton" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={`skel-${i}`}
                className="ap-card"
                style={{
                  background: 'var(--border)',
                  opacity: 0.35,
                  height: 220,
                }}
              />
            ))}
          </div>
        ) : total === 0 ? (
          <motion.div
            className="ap-empty"
            role="status"
            initial={
              reduce
                ? false
                : { opacity: 0, transform: "translateY(6px)" }
            }
            animate={{ opacity: 1, transform: "translateY(0)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="ap-empty-icon" aria-hidden="true">
              <svg
                viewBox="0 0 32 32"
                width={22}
                height={22}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="13.5" cy="13.5" r="7.5" />
                <path d="M19.5 19.5L26 26" />
                <path d="M10 13.5h7" />
              </svg>
            </div>
            <div className="ap-empty-title">
              {search ? 'No projects match your search' : 'No projects yet'}
            </div>
            <div className="ap-empty-sub">
              {search
                ? 'Try a different name, repo, or branch — or clear the search.'
                : 'Create your first workspace project to start running tests.'}
            </div>
            {search ? (
              <button
                className="btn btn-secondary ap-empty-cta"
                type="button"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            ) : (
              <Link to="/add-project" className="btn btn-primary ap-empty-cta">
                Add a project
              </Link>
            )}
          </motion.div>
        ) : (
          <>
            <div className="ap-grid" data-od-id="all-projects-grid">
              {visible.map((d, i) => (
                <ProjectCard key={d.project.id} data={d} index={i} reduce={reduce} />
              ))}
            </div>

            <div className="ap-list-tail" aria-live="polite">
              {hasMore ? (
                <>
                  <div
                    ref={sentinelRef}
                    className="ap-sentinel"
                    aria-hidden="true"
                  />
                  {isLoadingMore && <PageLoader />}
                </>
              ) : (
                <div className="ap-end" role="status">
                  <span className="ap-end-rule" aria-hidden="true" />
                  <span className="ap-end-text">
                    You've reached the end · {total} project{total === 1 ? "" : "s"}
                  </span>
                  <span className="ap-end-rule" aria-hidden="true" />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}