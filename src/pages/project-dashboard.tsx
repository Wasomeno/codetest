import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { fmtRel } from "~/lib/mock-data-new";
import { AnimatedNumber } from "~/components/charts/AnimatedNumber";
import { PassRateChart } from "~/components/charts/PassRateChart";
import { StaggerRow, StaggeredDelta } from "~/components/charts/dashboard-anim";
import { ProjectActivityFeed } from "~/components/ProjectActivityFeed";
import { ProjectLiveProgress } from "~/components/ProjectLiveProgress";
import { useAppProject } from "~/hooks/api/useAppProject";
import { useProjectDashboard } from "~/hooks/api/useProjectDashboard";
import { colorForName } from "~/lib/map-app-project";
import { useProjectStream } from "~/hooks/api/useProjectStream";
import { useDeleteAppProject } from "~/hooks/api/useDeleteAppProject";
import {
  Skeleton,
  StatCellSkeleton,
  MiniStatSkeleton,
  ProjectDashboardSkeleton,
} from "~/components/Skeleton";

/* ------------------------------------------------------------------ */
/*  Stat cell with the same A → B narrative as the workspace dashboard. */
/* ------------------------------------------------------------------ */
function ProjectStatCell({
  label,
  value,
  format,
  delta,
  direction,
  index,
  reduce,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta: string;
  direction: "up" | "down";
  index: number;
  reduce: boolean | null;
}) {
  return (
    <StaggerRow index={index} reduce={reduce} className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">
        <AnimatedNumber value={value} format={format} />
        <StaggeredDelta
          reduce={reduce}
          index={index}
          direction={direction}
        >
          {delta}
        </StaggeredDelta>
      </div>
    </StaggerRow>
  );
}

const NEUTRAL_DELTA = "0";

export function ProjectDashboardPage({ id }: { id: string }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const projectQuery = useAppProject(id);
  const dashboardQuery = useProjectDashboard(id);
  const stream = useProjectStream(id);
  const deleteMutation = useDeleteAppProject();

  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showDeleteModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleteMutation.isPending) {
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDeleteModal, deleteMutation.isPending]);

  if (projectQuery.isPending) {
    return <ProjectDashboardSkeleton id={id} />;
  }

  if (projectQuery.isError || !projectQuery.data) {
    const err = projectQuery.error as Error & { status?: number };
    const notFound =
      err?.status === 404 || String(err?.message || '').toLowerCase().includes('not found');
    return (
      <div
        className="app-pane"
        id="pane-project-dashboard"
        data-od-id="pane-project-dashboard"
      >
        <div className="page-head">
          <div className="page-head-text">
            <h1 className="page-title">
              {notFound ? 'Project not found' : 'Couldn’t load project'}
            </h1>
            <p className="page-subtitle">
              {notFound
                ? `No project matches “${id}”.`
                : err?.message || 'Unexpected error'}
            </p>
          </div>
        </div>
        <div className="page-body">
          <Link to="/projects" className="btn btn-secondary">
            Back to All projects
          </Link>
        </div>
      </div>
    );
  }

  const project = projectQuery.data;
  const dashboard = dashboardQuery.data;
  const projectColor = colorForName(project.name);
  const openIssues = dashboard?.openIssues ?? 0;
  const testScenarios = dashboard?.testScenarios ?? 0;
  const passRateDisplay = dashboard?.passRate?.value ?? null;
  const passRateTrend = dashboard?.passRate?.trend ?? null;
  const passRateLabel = dashboard?.passRate?.trendLabel || 'Last 7 days';
  const issuesToday = dashboard?.issuesToday;
  const secondaryMeta = [
    dashboard?.recordings && dashboard.recordings > 0
      ? `${dashboard.recordings} recording${dashboard.recordings === 1 ? '' : 's'}`
      : null,
    dashboard?.fixSessions && dashboard.fixSessions > 0
      ? `${dashboard.fixSessions} fix session${dashboard.fixSessions === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean);

  const streamBanner = stream.event?.message
    ? {
        message: stream.event.message,
        stage: stream.event.stage,
        type: stream.event.type,
        title: streamBannerTitle(stream.event.stage, stream.event.type),
        tone: streamBannerTone(stream.event.stage),
        stepInfo: stream.event.stepInfo,
      }
    : null;

  const repoLine = [
    project.frontendRepoName && `fe ${project.frontendRepoName}`,
    project.backendRepoName && `be ${project.backendRepoName}`,
    project.specsRepoName && `specs ${project.specsRepoName}`,
    project.issueRepoName && `issues ${project.issueRepoName}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="app-pane"
      id="pane-project-dashboard"
      data-od-id={`pane-project-dashboard-${project.id}`}
    >
      <div className="page-head">
        <div className="page-head-text">
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/projects">All projects</Link>
            <span className="sep">›</span>
            <span className="current">{project.name}</span>
          </nav>
          <h1 className="page-title">
            <span
              className="project-dot"
              style={{
                background: projectColor,
                width: 10,
                height: 10,
                display: "inline-block",
                marginRight: 10,
                verticalAlign: "1px",
              }}
            />
            {project.name}
          </h1>
          <div
            className="page-head-meta"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--muted)",
              marginTop: 6,
              letterSpacing: "0.04em",
            }}
          >
            {project.description || 'No description'}
            {' · created '}
            {fmtRel(project.createdAt)}
            {secondaryMeta.length > 0 ? ` · ${secondaryMeta.join(' · ')}` : ''}
          </div>
          {repoLine && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 4,
                lineHeight: 1.5,
              }}
            >
              {repoLine}
            </div>
          )}
        </div>
        <div className="page-head-actions" style={{ gap: 8, flexWrap: 'wrap' }}>
          <div
            className="field"
            style={{ height: 28, cursor: 'default' }}
            title={passRateLabel}
          >
            <span className="field-label">Pass rate</span>
            <span>{passRateLabel}</span>
          </div>
          <button
            className="btn-danger-icon"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => setShowDeleteModal(true)}
            aria-label="Delete project"
            title="Delete project"
          >
            <Trash2 size={13} style={{ color: "#ffffff" }} />
          </button>
        </div>
      </div>

      {actionError && (
        <div className="page-body" style={{ paddingBottom: 0 }}>
          <div className="form-banner is-visible is-error" role="status">
            {actionError}
          </div>
        </div>
      )}

      <div className="page-body">
        <ProjectLiveProgress banner={streamBanner} reduce={reduce} />

        <div className="proj-stat-strip" data-od-id="proj-stats">
          {dashboardQuery.isPending ? (
            <>
              <StatCellSkeleton index={0} reduce={reduce} />
              <StatCellSkeleton index={1} reduce={reduce} />
              <StatCellSkeleton index={2} reduce={reduce} />
            </>
          ) : (
            <>
              <ProjectStatCell
                label="Open issues"
                value={openIssues}
                delta={
                  issuesToday && issuesToday.opened > 0
                    ? `+${issuesToday.opened} today`
                    : NEUTRAL_DELTA
                }
                direction={issuesToday && issuesToday.opened > 0 ? "up" : "down"}
                index={0}
                reduce={reduce}
              />
              <ProjectStatCell
                label="Pass rate"
                value={passRateDisplay ?? 0}
                format={(n) => (passRateDisplay === null ? "—" : `${n.toFixed(1)}%`)}
                delta={
                  passRateTrend === "up"
                    ? "+trending"
                    : passRateTrend === "down"
                      ? "−trending"
                      : "flat"
                }
                direction={passRateTrend === "down" ? "down" : "up"}
                index={1}
                reduce={reduce}
              />
              <ProjectStatCell
                label="Test scenarios"
                value={testScenarios}
                delta={NEUTRAL_DELTA}
                direction="down"
                index={2}
                reduce={reduce}
              />
            </>
          )}
        </div>

        <div className="dash-grid" style={{ marginTop: 20 }}>
          {/* Primary column: Recent activity audit trail */}
          <section className="panel" data-od-id="proj-activity">
            <div className="panel-head">
              <span className="panel-title">Recent activity</span>
              <span className="panel-meta">audit trail · live</span>
            </div>
            <div className="panel-body" style={{ padding: "4px 16px 8px" }}>
              <ProjectActivityFeed projectId={project.id} />
            </div>
          </section>

          {/* Companion column: Health metrics & Today's velocity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section className="panel" data-od-id="proj-health">
              <div className="panel-head">
                <span className="panel-title">Pass rate</span>
                <span className="panel-meta">7d trend</span>
              </div>
              <div className="panel-body">
                {dashboardQuery.isPending ? (
                  <div
                    style={{
                      height: 120,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Skeleton width="100%" height={80} borderRadius={6} />
                  </div>
                ) : passRateDisplay === null ? (
                  <div
                    style={{
                      color: "var(--muted)",
                      padding: "16px 4px",
                      textAlign: "center",
                      fontSize: 12,
                    }}
                  >
                    No recent automation runs — pass rate appears after tests run
                    in the last 7 days.
                  </div>
                ) : (
                  <PassRateChart
                    data={[
                      passRateDisplay - 4,
                      passRateDisplay - 2,
                      passRateDisplay - 1,
                      passRateDisplay - 0.5,
                      passRateDisplay,
                    ]}
                    color={projectColor}
                  />
                )}
              </div>
            </section>

            <section className="panel" data-od-id="proj-issues-today">
              <div className="panel-head">
                <span className="panel-title">Issues today</span>
                <span className="panel-meta">
                  {dashboardQuery.isPending ? (
                    <Skeleton width={90} height={11} borderRadius={3} />
                  ) : issuesToday ? (
                    `${issuesToday.opened} opened · ${issuesToday.closed} closed`
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className="panel-body">
                {dashboardQuery.isPending ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <MiniStatSkeleton />
                    <MiniStatSkeleton />
                  </div>
                ) : issuesToday ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <MiniStat
                      label="Opened"
                      value={issuesToday.opened}
                      tone={issuesToday.status === "success" ? "ok" : "warn"}
                    />
                    <MiniStat
                      label="Closed"
                      value={issuesToday.closed}
                      tone="ok"
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      color: "var(--muted)",
                      padding: "16px 4px",
                      textAlign: "center",
                      fontSize: 12,
                    }}
                  >
                    No issue activity today.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {showDeleteModal && (
              <motion.div
                className="run-modal-overlay"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "oklch(0% 0 0 / 0.45)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                  zIndex: 1000,
                  display: "grid",
                  placeItems: "center",
                  padding: 24,
                  animation: "none",
                }}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  if (!deleteMutation.isPending) setShowDeleteModal(false);
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-modal-title"
              >
                <motion.div
                  className="run-modal"
                  style={{
                    width: 420,
                    maxWidth: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    position: "relative",
                    boxShadow:
                      "0 24px 80px -16px oklch(0% 0 0 / 0.28), 0 8px 24px -8px oklch(0% 0 0 / 0.12)",
                    overflow: "hidden",
                    animation: "none",
                  }}
              initial={
                reduce
                  ? false
                  : { opacity: 0, scale: 0.95, y: 10 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.97, y: 8 }
              }
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="run-modal-close"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteMutation.isPending}
                aria-label="Close"
              >
                <X size={15} />
              </button>

              <div style={{ padding: "24px 24px 0" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--danger)",
                    marginBottom: 8,
                  }}
                >
                  <Trash2 size={12} />
                  <span>Delete project</span>
                </div>
                <h2
                  id="delete-modal-title"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    margin: "0 0 8px",
                    color: "var(--fg)",
                  }}
                >
                  Delete “{project.name}”?
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: "var(--muted)",
                    margin: 0,
                  }}
                >
                  This cannot be undone. All linked test scenarios, activity logs,
                  and project configurations will be permanently removed.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 10,
                  padding: "18px 24px 20px",
                  marginTop: 16,
                  borderTop: "1px solid var(--border)",
                  background: "oklch(99% 0.002 240 / 0.5)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: 32 }}
                  disabled={deleteMutation.isPending}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    height: 32,
                    background: "var(--danger)",
                    color: "#ffffff",
                    borderColor: "transparent",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate(project.id, {
                      onSuccess: () => {
                        navigate({ to: "/projects" });
                      },
                      onError: (err) => {
                        setActionError(err.message || "Failed to delete project");
                        setShowDeleteModal(false);
                      },
                    });
                  }}
                >
                  <Trash2 size={13} style={{ color: "#ffffff" }} />
                  <span>{deleteMutation.isPending ? "Deleting…" : "Delete project"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </div>
  );
}

function streamBannerTitle(stage?: string, type?: string): string {
  if (stage === 'error') return 'Something went wrong';
  if (stage === 'done') {
    if (type === 'generation') return 'Generation complete';
    return 'Complete';
  }
  if (type === 'generation') return 'Generation in progress';
  return 'Live project progress';
}

function streamBannerTone(stage?: string): 'success' | 'error' {
  return stage === 'error' ? 'error' : 'success';
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'warn';
}) {
  const color =
    tone === 'ok' ? 'oklch(70% 0.14 150)' : 'oklch(70% 0.14 75)';
  return (
    <div
      className="mini-stat"
      style={{
        padding: '12px 14px',
        borderRadius: 6,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 500,
          color,
          marginTop: 4,
        }}
      >
        <AnimatedNumber value={value} />
      </div>
    </div>
  );
}
