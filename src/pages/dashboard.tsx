import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import { fmtRel } from "~/lib/mock-data-new";
import { AnimatedNumber } from "~/components/charts/AnimatedNumber";
import { ProjectBar } from "~/components/charts/ProjectBar";
import { STAGGER, StaggerRow, StaggeredDelta } from "~/components/charts/dashboard-anim";
import { useProjects } from "~/hooks/api/useProjects";
import { colorForName } from "~/lib/map-app-project";
import { qk } from "~/api/queryKeys";
import type { AppProject, ProjectDashboard } from "~/types/project";

interface ProjectRow {
  project: AppProject;
  dashboard: ProjectDashboard | undefined;
  loading: boolean;
  color: string;
}

/**
 * Workspace-level dashboard built only from live API data:
 * `listAppProjects` + per-project `GET /projects/:id/dashboard`.
 *
 * Retired test-run / scenario-execution metrics are not invented —
 * tiles and lists show open issues, scenarios, recordings, and pass
 * rate when the backend provides them.
 */
export function DashboardPage() {
  const reduce = useReducedMotion();
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];

  const dashboardQueries = useQueries({
    queries: projects.map((p) => ({
      queryKey: qk.projectDashboard(p.id),
      queryFn: async () => {
        const { getProjectDashboard } = await import("~/api/project");
        const r = await getProjectDashboard(p.id);
        if (!r.success || !r.data) {
          throw new Error(r.error || "Failed to load dashboard");
        }
        return r.data;
      },
      enabled: projects.length > 0,
      staleTime: 60_000,
    })),
  });

  const rows: ProjectRow[] = useMemo(
    () =>
      projects.map((project, i) => ({
        project,
        dashboard: dashboardQueries[i]?.data as ProjectDashboard | undefined,
        loading: dashboardQueries[i]?.isPending ?? true,
        color: colorForName(project.name),
      })),
    [projects, dashboardQueries],
  );

  const aggregates = useMemo(() => {
    let openIssues = 0;
    let testScenarios = 0;
    let recordings = 0;
    let fixSessions = 0;
    let issuesOpenedToday = 0;
    let issuesClosedToday = 0;
    let passRateSum = 0;
    let passRateCount = 0;
    let dashboardsReady = 0;

    for (const row of rows) {
      const d = row.dashboard;
      if (!d) continue;
      dashboardsReady += 1;
      openIssues += d.openIssues ?? 0;
      testScenarios += d.testScenarios ?? 0;
      recordings += d.recordings ?? 0;
      fixSessions += d.fixSessions ?? 0;
      issuesOpenedToday += d.issuesToday?.opened ?? 0;
      issuesClosedToday += d.issuesToday?.closed ?? 0;
      if (d.passRate?.value != null && !Number.isNaN(d.passRate.value)) {
        passRateSum += d.passRate.value;
        passRateCount += 1;
      }
    }

    return {
      openIssues,
      testScenarios,
      recordings,
      fixSessions,
      issuesOpenedToday,
      issuesClosedToday,
      avgPassRate: passRateCount > 0 ? passRateSum / passRateCount : null,
      passRateCount,
      dashboardsReady,
      dashboardsPending: rows.some((r) => r.loading),
    };
  }, [rows]);

  const recentProjects = useMemo(() => {
    return [...rows]
      .sort(
        (a, b) =>
          new Date(b.project.updatedAt).getTime() -
          new Date(a.project.updatedAt).getTime(),
      )
      .slice(0, 8);
  }, [rows]);

  const byProject = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ao = a.dashboard?.openIssues ?? -1;
      const bo = b.dashboard?.openIssues ?? -1;
      if (bo !== ao) return bo - ao;
      return a.project.name.localeCompare(b.project.name);
    });
  }, [rows]);

  const loadingProjects = projectsQuery.isPending;
  const projectsError = projectsQuery.isError;

  return (
    <div className="app-pane" id="pane-dashboard" data-od-id="pane-dashboard">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Live totals across your QA workspace projects — issues, scenarios,
            and pass rate where the API provides them.
          </p>
        </div>
        <div className="page-head-actions">
          <Link to="/projects" className="btn btn-secondary" style={{ height: 28 }}>
            All projects
          </Link>
          <Link to="/add-project" className="btn btn-primary" style={{ height: 28 }}>
            New project
          </Link>
        </div>
      </div>

      <div className="page-body">
        {projectsError ? (
          <div
            className="panel"
            style={{ padding: 16, color: "var(--danger)", fontSize: 13 }}
            data-od-id="dash-error"
          >
            Couldn&apos;t load projects:{" "}
            {String((projectsQuery.error as Error)?.message || projectsQuery.error)}
          </div>
        ) : null}

        {/* Stat strip ----------------------------------------------------- */}
        <div className="stat-strip" data-od-id="dash-stats">
          <StatCell
            label="Projects"
            valueNode={
              loadingProjects ? (
                <span style={{ color: "var(--muted)" }}>…</span>
              ) : (
                <AnimatedNumber value={projects.length} />
              )
            }
            delta={
              aggregates.dashboardsPending
                ? "loading metrics…"
                : `${aggregates.dashboardsReady} with metrics`
            }
            direction="up"
            index={0}
            reduce={reduce}
          />
          <StatCell
            label="Open issues"
            valueNode={
              aggregates.dashboardsPending && aggregates.dashboardsReady === 0 ? (
                <span style={{ color: "var(--muted)" }}>…</span>
              ) : (
                <AnimatedNumber value={aggregates.openIssues} />
              )
            }
            delta={
              aggregates.issuesOpenedToday + aggregates.issuesClosedToday > 0
                ? `+${aggregates.issuesOpenedToday} / −${aggregates.issuesClosedToday} today`
                : "across issue repos"
            }
            direction="down"
            index={1}
            reduce={reduce}
          />
          <StatCell
            label="Test scenarios"
            valueNode={
              aggregates.dashboardsPending && aggregates.dashboardsReady === 0 ? (
                <span style={{ color: "var(--muted)" }}>…</span>
              ) : (
                <AnimatedNumber value={aggregates.testScenarios} />
              )
            }
            delta={
              aggregates.recordings > 0
                ? `${aggregates.recordings} recording${aggregates.recordings === 1 ? "" : "s"}`
                : "linked to projects"
            }
            direction="up"
            index={2}
            reduce={reduce}
          />
          <StatCell
            label="Avg pass rate"
            valueNode={
              aggregates.avgPassRate == null ? (
                <span style={{ color: "var(--muted)", fontSize: 18 }}>—</span>
              ) : (
                <AnimatedNumber
                  value={aggregates.avgPassRate}
                  format={(n) => `${n.toFixed(1)}%`}
                />
              )
            }
            delta={
              aggregates.avgPassRate == null
                ? "no recent run data"
                : `${aggregates.passRateCount} project${aggregates.passRateCount === 1 ? "" : "s"} · 7d`
            }
            direction="up"
            index={3}
            reduce={reduce}
          />
        </div>

        <div className="dash-grid">
          {/* Recently updated projects ----------------------------------- */}
          <section className="panel" data-od-id="dash-recent">
            <div className="panel-head">
              <span className="panel-title">Recently updated</span>
              <span className="panel-meta">
                {loadingProjects ? "…" : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <div className="recent-list">
              <div
                className="recent-row"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  paddingTop: 4,
                  paddingBottom: 8,
                }}
              >
                <div>Project</div>
                <div style={{ textAlign: "right" }}>Open issues</div>
                <div style={{ textAlign: "right" }}>Scenarios</div>
                <div style={{ textAlign: "right" }}>Updated</div>
              </div>

              {loadingProjects ? (
                <div style={{ padding: "12px 0", color: "var(--muted)", fontSize: 12 }}>
                  Loading projects…
                </div>
              ) : recentProjects.length === 0 ? (
                <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: 13 }}>
                  No projects yet.{" "}
                  <Link to="/add-project" style={{ color: "var(--fg)" }}>
                    Create one
                  </Link>{" "}
                  to populate this dashboard.
                </div>
              ) : (
                recentProjects.map((row, i) => (
                  <StaggerRow
                    key={row.project.id}
                    index={i}
                    reduce={reduce}
                    className="recent-row"
                  >
                    <Link
                      to="/projects/$id"
                      params={{ id: row.project.id }}
                      style={{
                        display: "contents",
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <div className="recent-name">
                        <span
                          className="project-dot"
                          style={{ background: row.color, marginRight: 8 }}
                          aria-hidden="true"
                        />
                        {row.project.name}
                      </div>
                      <div className="recent-project" style={{ textAlign: "right" }}>
                        {row.loading ? "…" : (row.dashboard?.openIssues ?? 0)}
                      </div>
                      <div className="recent-when" style={{ textAlign: "right" }}>
                        {row.loading ? "…" : (row.dashboard?.testScenarios ?? 0)}
                      </div>
                      <div style={{ textAlign: "right", color: "var(--muted)", fontSize: 12 }}>
                        {fmtRel(row.project.updatedAt)}
                      </div>
                    </Link>
                  </StaggerRow>
                ))
              )}
            </div>
          </section>

          {/* Coverage snapshot (honest substitute for mock run chart) ---- */}
          <section className="panel" data-od-id="dash-coverage">
            <div className="panel-head">
              <span className="panel-title">Coverage snapshot</span>
              <span className="panel-meta">pass rate · 7d when available</span>
            </div>
            <div className="panel-body">
              {loadingProjects || (aggregates.dashboardsPending && rows.length > 0) ? (
                <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
                  Loading project metrics…
                </p>
              ) : rows.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
                  Add a project to see scenario and issue coverage here.
                </p>
              ) : aggregates.avgPassRate == null && aggregates.testScenarios === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
                  No scenario or pass-rate data yet. Run history charts stay hidden until
                  the backend exposes live run series again.
                </p>
              ) : (
                <CoverageBars rows={byProject} reduce={reduce} />
              )}
            </div>
          </section>
        </div>

        {/* By project ----------------------------------------------------- */}
        <section className="panel" style={{ marginTop: 20 }} data-od-id="dash-projects">
          <div className="panel-head">
            <span className="panel-title">By project</span>
            <span className="panel-meta">issues · scenarios · pass rate</span>
          </div>
          <div className="by-project-list">
            {loadingProjects ? (
              <div style={{ padding: 12, color: "var(--muted)", fontSize: 12 }}>
                Loading…
              </div>
            ) : byProject.length === 0 ? (
              <div style={{ padding: 12, color: "var(--muted)", fontSize: 13 }}>
                No projects to rank yet.
              </div>
            ) : (
              byProject.map((row, i) => {
                const d = row.dashboard;
                const rate = d?.passRate?.value ?? null;
                const barPercent =
                  rate != null
                    ? rate
                    : d
                      ? Math.min(100, (d.testScenarios ?? 0) > 0 ? 40 + Math.min(d.testScenarios, 30) : 8)
                      : 0;
                const counts = row.loading
                  ? "loading metrics…"
                  : d
                    ? `${d.openIssues ?? 0} open issues · ${d.testScenarios ?? 0} scenarios${
                        d.recordings ? ` · ${d.recordings} recordings` : ""
                      }${
                        d.fixSessions ? ` · ${d.fixSessions} fix sessions` : ""
                      }`
                    : "metrics unavailable";

                return (
                  <StaggerRow
                    key={row.project.id}
                    index={i}
                    reduce={reduce}
                    className="by-project-row"
                  >
                    <Link
                      to="/projects/$id"
                      params={{ id: row.project.id }}
                      style={{
                        display: "contents",
                        color: "inherit",
                        textDecoration: "none",
                      }}
                    >
                      <span className="by-project-name">
                        <span
                          className="project-dot"
                          style={{ background: row.color }}
                        />
                        {row.project.name}
                      </span>
                      <span className="by-project-counts">{counts}</span>
                      <span className="by-project-rate">
                        {row.loading
                          ? "…"
                          : rate == null
                            ? "—"
                            : `${rate.toFixed(1)}%`}
                      </span>
                      <ProjectBar
                        percent={row.loading ? 0 : barPercent}
                        color={row.color}
                        delay={reduce ? 0 : i * STAGGER + 0.1}
                      />
                    </Link>
                  </StaggerRow>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function CoverageBars({
  rows,
  reduce,
}: {
  rows: ProjectRow[];
  reduce: boolean | null;
}) {
  const top = rows.slice(0, 6);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {top.map((row, i) => {
        const rate = row.dashboard?.passRate?.value;
        const scenarios = row.dashboard?.testScenarios ?? 0;
        const issues = row.dashboard?.openIssues ?? 0;
        const width =
          rate != null
            ? Math.max(4, Math.min(100, rate))
            : scenarios > 0
              ? Math.min(100, 12 + scenarios * 2)
              : Math.min(40, 8 + issues);

        return (
          <StaggerRow key={row.project.id} index={i} reduce={reduce}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 56px",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.project.name}
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>
                    {scenarios} scen · {issues} open
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: "var(--border)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: "100%",
                      background: row.color,
                      borderRadius: 3,
                      transition: reduce ? undefined : "width 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--muted)",
                }}
              >
                {rate == null ? "n/a" : `${rate.toFixed(0)}%`}
              </div>
            </div>
          </StaggerRow>
        );
      })}
    </div>
  );
}

function StatCell({
  label,
  valueNode,
  delta,
  direction,
  index,
  reduce,
}: {
  label: string;
  valueNode: React.ReactNode;
  delta: string;
  direction: "up" | "down";
  index: number;
  reduce: boolean | null;
}) {
  return (
    <StaggerRow index={index} reduce={reduce} className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        {valueNode}
        <StaggeredDelta reduce={reduce} index={index} direction={direction}>
          {delta}
        </StaggeredDelta>
      </div>
    </StaggerRow>
  );
}
