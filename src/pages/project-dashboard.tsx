import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useReducedMotion } from "framer-motion";
import { fmtRel } from "~/lib/mock-data-new";
import { AnimatedNumber } from "~/components/charts/AnimatedNumber";
import { PassRateChart } from "~/components/charts/PassRateChart";
import { StaggerRow, StaggeredDelta } from "~/components/charts/dashboard-anim";
import { ProjectActivityFeed } from "~/components/ProjectActivityFeed";
import { ProjectTestContextEditor } from "~/components/ProjectTestContextEditor";
import { useAppProject } from "~/hooks/api/useAppProject";
import { useProjectDashboard } from "~/hooks/api/useProjectDashboard";
import { colorForName } from "~/lib/map-app-project";
import { useProjectStream } from "~/hooks/api/useProjectStream";
import { ProjectArtifactUploader } from "~/components/ProjectArtifactUploader";
import { ProjectBoardPreview } from "~/components/ProjectBoardPreview";
import { useUpdateAppProject } from "~/hooks/api/useUpdateAppProject";
import { useDeleteAppProject } from "~/hooks/api/useDeleteAppProject";

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
  const updateMutation = useUpdateAppProject(id);
  const deleteMutation = useDeleteAppProject();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const openEdit = () => {
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditing(true);
    setActionError(null);
    setActionNotice(null);
  };

  const saveEdit = () => {
    const name = editName.trim();
    if (!name) {
      setActionError('Name cannot be empty');
      return;
    }
    updateMutation.mutate(
      { name, description: editDescription.trim() },
      {
        onSuccess: () => {
          setEditing(false);
          setActionNotice('Project updated.');
          setActionError(null);
        },
        onError: (err) => {
          setActionError(err.message || 'Failed to update project');
        },
      },
    );
  };

  const confirmDelete = () => {
    const ok = window.confirm(
      `Delete project “${project.name}”? This cannot be undone.`,
    );
    if (!ok) return;
    deleteMutation.mutate(project.id, {
      onSuccess: () => {
        navigate({ to: '/projects' });
      },
      onError: (err) => {
        setActionError(err.message || 'Failed to delete project');
      },
    });
  };

  const streamBanner = stream.event?.message
    ? {
        message: stream.event.message,
        stage: stream.event.stage,
        type: stream.event.type,
        title: streamBannerTitle(stream.event.stage, stream.event.type),
        tone: streamBannerTone(stream.event.stage),
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
          <button className="btn btn-secondary" type="button" style={{ height: 28 }} onClick={openEdit}>
            Edit
          </button>
          <button
            className="btn btn-ghost"
            type="button"
            style={{ height: 28, color: 'var(--danger)' }}
            disabled={deleteMutation.isPending}
            onClick={confirmDelete}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {streamBanner && (
        <div className="page-body" style={{ paddingBottom: 0 }}>
          <div
            className={`form-banner is-visible ${streamBanner.tone === 'error' ? 'is-error' : 'is-success'}`}
            role="status"
            data-od-id="project-live-progress"
          >
            <span className="banner-title">{streamBanner.title}</span>
            <span className="banner-msg">{streamBanner.message}</span>
          </div>
        </div>
      )}

      {(actionNotice || actionError) && (
        <div className="page-body" style={{ paddingBottom: 0 }}>
          <div
            className={`form-banner is-visible ${actionError ? 'is-error' : 'is-success'}`}
            role="status"
          >
            {actionError || actionNotice}
          </div>
        </div>
      )}

      {editing && (
        <div className="page-body" style={{ paddingBottom: 0 }}>
          <section className="panel" data-od-id="project-edit-panel">
            <div className="panel-head">
              <span className="panel-title">Edit project</span>
              <span className="panel-meta">Name and description</span>
            </div>
            <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Name</span>
                <input
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={updateMutation.isPending}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Description</span>
                <textarea
                  className="textarea"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={updateMutation.isPending}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={saveEdit}
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  disabled={updateMutation.isPending}
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="page-body">
        <div className="proj-stat-strip" data-od-id="proj-stats">
          <ProjectStatCell
            label="Open issues"
            value={openIssues}
            delta={
              issuesToday && issuesToday.opened > 0
                ? `+${issuesToday.opened} today`
                : NEUTRAL_DELTA
            }
            direction={issuesToday && issuesToday.opened > 0 ? 'up' : 'down'}
            index={0}
            reduce={reduce}
          />
          <ProjectStatCell
            label="Pass rate"
            value={passRateDisplay ?? 0}
            format={(n) => (passRateDisplay === null ? '—' : `${n.toFixed(1)}%`)}
            delta={
              passRateTrend === 'up'
                ? '+trending'
                : passRateTrend === 'down'
                  ? '−trending'
                  : 'flat'
            }
            direction={passRateTrend === 'down' ? 'down' : 'up'}
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
        </div>

        <div className="dash-grid" style={{ marginTop: 20 }}>
          <section className="panel" data-od-id="proj-issues-today">
            <div className="panel-head">
              <span className="panel-title">Issues today</span>
              <span className="panel-meta">
                {issuesToday
                  ? `${issuesToday.opened} opened · ${issuesToday.closed} closed`
                  : '—'}
              </span>
            </div>
            <div className="panel-body">
              {issuesToday ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <MiniStat
                    label="Opened"
                    value={issuesToday.opened}
                    tone={issuesToday.status === 'success' ? 'ok' : 'warn'}
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
                    color: 'var(--muted)',
                    padding: '16px 4px',
                    textAlign: 'center',
                    fontSize: 12,
                  }}
                >
                  No issue activity today.
                </div>
              )}
            </div>
          </section>

          <section className="panel" data-od-id="proj-health">
            <div className="panel-head">
              <span className="panel-title">Pass rate · 7d</span>
            </div>
            <div className="panel-body">
              {passRateDisplay === null ? (
                <div
                  style={{
                    color: 'var(--muted)',
                    padding: '16px 4px',
                    textAlign: 'center',
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
        </div>

        <div className="proj-meta-row">
          <section className="panel" data-od-id="proj-activity">
            <div className="panel-head">
              <span className="panel-title">Recent activity</span>
              <span className="panel-meta">project audit</span>
            </div>
            <div className="panel-body" style={{ padding: '4px 16px 8px' }}>
              <ProjectActivityFeed projectId={project.id} />
            </div>
          </section>
          <ProjectTestContextEditor projectId={project.id} />
          <ProjectArtifactUploader projectId={project.id} />
          <ProjectBoardPreview projectId={project.id} />
        </div>
      </div>
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

function ProjectDashboardSkeleton(_: { id: string }) {
  return (
    <div
      className="app-pane"
      id="pane-project-dashboard"
      data-od-id="pane-project-dashboard-loading"
    >
      <div className="page-head">
        <div className="page-head-text">
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/projects">All projects</Link>
            <span className="sep">›</span>
            <span className="current">…</span>
          </nav>
          <h1 className="page-title">
            <span
              className="project-dot"
              style={{ background: 'var(--border)', width: 10, height: 10, display: 'inline-block', marginRight: 10 }}
            />
            <span
              style={{
                background: 'var(--border)',
                opacity: 0.5,
                display: 'inline-block',
                height: 18,
                width: 220,
                borderRadius: 4,
                verticalAlign: 'middle',
              }}
              aria-hidden="true"
            />
          </h1>
        </div>
      </div>
      <div className="page-body">
        <div className="proj-stat-strip" data-od-id="proj-stats-loading">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="stat"
              style={{
                background: 'var(--border)',
                opacity: 0.4,
                height: 70,
                borderRadius: 6,
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  );
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
