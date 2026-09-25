import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { StaggerRow } from "~/components/charts/dashboard-anim";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = "",
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export interface StatCellSkeletonProps {
  index?: number;
  reduce?: boolean | null;
  className?: string;
  style?: CSSProperties;
}

/**
 * Matches `.stat` markup: label skeleton ~10px high, value skeleton ~24px high, delta ~12px high.
 */
export function StatCellSkeleton({
  index,
  reduce,
  className = "",
  style,
}: StatCellSkeletonProps) {
  const content = (
    <div className={`stat ${className}`.trim()} style={style} aria-hidden="true">
      <div className="stat-label">
        <Skeleton width={64} height={10} borderRadius={3} />
      </div>
      <div
        className="stat-value"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginTop: 4,
        }}
      >
        <Skeleton width={48} height={24} borderRadius={4} />
        <Skeleton width={56} height={12} borderRadius={3} />
      </div>
    </div>
  );

  if (index != null) {
    return (
      <StaggerRow index={index} reduce={reduce ?? null}>
        {content}
      </StaggerRow>
    );
  }
  return content;
}

/**
 * Matches `.recent-row` layout: project dot, name skeleton, open issues, scenarios, relative time.
 */
export function RecentProjectRowSkeleton({
  index,
  reduce,
}: {
  index?: number;
  reduce?: boolean | null;
}) {
  const row = (
    <div className="recent-row" aria-hidden="true">
      <div className="recent-name" style={{ display: "flex", alignItems: "center" }}>
        <Skeleton
          width={8}
          height={8}
          borderRadius={2}
          style={{ marginRight: 8, flexShrink: 0 }}
        />
        <Skeleton width={110} height={13} borderRadius={3} />
      </div>
      <div className="recent-project" style={{ display: "flex", justifyContent: "flex-end" }}>
        <Skeleton width={22} height={13} borderRadius={3} />
      </div>
      <div className="recent-when" style={{ display: "flex", justifyContent: "flex-end" }}>
        <Skeleton width={22} height={13} borderRadius={3} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Skeleton width={46} height={12} borderRadius={3} />
      </div>
    </div>
  );

  if (index != null) {
    return (
      <StaggerRow index={index} reduce={reduce ?? null}>
        {row}
      </StaggerRow>
    );
  }
  return row;
}

/**
 * Matches `CoverageBars` layout: name + scenario subtitle, progress bar track, percentage.
 */
export function CoverageBarSkeleton({
  index,
  reduce,
  width = "50%",
}: {
  index?: number;
  reduce?: boolean | null;
  width?: number | string;
}) {
  const item = (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 56px",
        gap: 10,
        alignItems: "center",
      }}
      aria-hidden="true"
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            marginBottom: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Skeleton width={80} height={12} borderRadius={3} />
          <Skeleton width={88} height={10} borderRadius={3} />
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <Skeleton width={width} height="100%" borderRadius={3} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Skeleton width={28} height={11} borderRadius={3} />
      </div>
    </div>
  );

  if (index != null) {
    return (
      <StaggerRow index={index} reduce={reduce ?? null}>
        {item}
      </StaggerRow>
    );
  }
  return item;
}

/**
 * Matches `.by-project-row` layout: dot, name, count summary, pass rate, progress bar.
 */
export function ByProjectRowSkeleton({
  index,
  reduce,
}: {
  index?: number;
  reduce?: boolean | null;
}) {
  const row = (
    <div className="by-project-row" aria-hidden="true">
      <span className="by-project-name">
        <Skeleton
          width={8}
          height={8}
          borderRadius={2}
          style={{ marginRight: 8, flexShrink: 0 }}
        />
        <Skeleton width={96} height={13} borderRadius={3} />
      </span>
      <span className="by-project-counts">
        <Skeleton width={140} height={12} borderRadius={3} />
      </span>
      <span className="by-project-rate" style={{ display: "flex", justifyContent: "flex-end" }}>
        <Skeleton width={32} height={12} borderRadius={3} />
      </span>
      <Skeleton width="100%" height={6} borderRadius={3} />
    </div>
  );

  if (index != null) {
    return (
      <StaggerRow index={index} reduce={reduce ?? null}>
        {row}
      </StaggerRow>
    );
  }
  return row;
}

/**
 * Mini-stat card skeleton for "Issues today" panel.
 */
export function MiniStatSkeleton() {
  return (
    <div
      className="mini-stat"
      style={{
        padding: "12px 14px",
        borderRadius: 6,
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      aria-hidden="true"
    >
      <div style={{ marginBottom: 6 }}>
        <Skeleton width={48} height={11} borderRadius={3} />
      </div>
      <Skeleton width={36} height={24} borderRadius={4} />
    </div>
  );
}

/**
 * Full page skeleton for ProjectDashboardPage when `projectQuery.isPending`.
 */
export function ProjectDashboardSkeleton({ id: _id }: { id?: string }) {
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
            <span className="current">
              <Skeleton
                width={60}
                height={11}
                borderRadius={3}
                style={{ display: "inline-block" }}
              />
            </span>
          </nav>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center" }}>
            <span
              className="project-dot"
              style={{
                background: "var(--border)",
                width: 10,
                height: 10,
                display: "inline-block",
                marginRight: 10,
                verticalAlign: "1px",
              }}
            />
            <Skeleton width={180} height={24} borderRadius={4} />
          </h1>
          <div
            className="page-head-meta"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <Skeleton width={140} height={11} borderRadius={3} />
            <span style={{ color: "var(--border)" }}>·</span>
            <Skeleton width={80} height={11} borderRadius={3} />
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
            <Skeleton width={160} height={11} borderRadius={3} />
          </div>
        </div>
        <div className="page-head-actions" style={{ gap: 8, flexWrap: "wrap" }}>
          <Skeleton width={110} height={28} borderRadius={6} />
          <Skeleton width={56} height={28} borderRadius={6} />
        </div>
      </div>

      <div className="page-body">
        {/* Stat strip (3 cells) */}
        <div className="proj-stat-strip" data-od-id="proj-stats-loading">
          {[0, 1, 2].map((i) => (
            <StatCellSkeleton key={i} />
          ))}
        </div>

        {/* Restructured 2-column grid matching the new sleek layout */}
        <div className="dash-grid" style={{ marginTop: 20 }}>
          {/* Main column: Recent activity skeleton */}
          <section className="panel" data-od-id="proj-activity-loading">
            <div className="panel-head">
              <span className="panel-title">Recent activity</span>
              <span className="panel-meta">audit trail · live</span>
            </div>
            <div
              className="panel-body"
              style={{ display: "grid", gap: 14, padding: "14px 16px" }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: i === 4 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <Skeleton width={6} height={6} borderRadius={3} />
                  <div style={{ display: "grid", gap: 4 }}>
                    <Skeleton width={i % 2 === 0 ? "70%" : "55%"} height={13} borderRadius={3} />
                    <Skeleton width={i % 2 === 0 ? "40%" : "30%"} height={10} borderRadius={3} />
                  </div>
                  <Skeleton width={44} height={11} borderRadius={3} />
                </div>
              ))}
            </div>
          </section>

          {/* Side column: Pass rate & Issues today */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <section className="panel" data-od-id="proj-health-loading">
              <div className="panel-head">
                <span className="panel-title">Pass rate</span>
                <span className="panel-meta">7d trend</span>
              </div>
              <div
                className="panel-body"
                style={{
                  height: 120,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Skeleton width="100%" height={80} borderRadius={6} />
              </div>
            </section>

            <section className="panel" data-od-id="proj-issues-today-loading">
              <div className="panel-head">
                <span className="panel-title">Issues today</span>
                <span className="panel-meta">
                  <Skeleton width={90} height={11} borderRadius={3} />
                </span>
              </div>
              <div className="panel-body">
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
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * For when `projectQuery` has loaded but `dashboardQuery` is still pending.
 */
export function ProjectDashboardMetricsSkeleton({
  reduce,
}: {
  reduce?: boolean | null;
}) {
  return (
    <>
      <div className="proj-stat-strip" data-od-id="proj-stats-loading">
        {[0, 1, 2].map((i) => (
          <StatCellSkeleton key={i} index={i} reduce={reduce} />
        ))}
      </div>

      <div className="dash-grid" style={{ marginTop: 20 }}>
        {/* Placeholder for left column when used as a full block */}
        <section className="panel" data-od-id="proj-activity-loading">
          <div className="panel-head">
            <span className="panel-title">Recent activity</span>
            <span className="panel-meta">audit trail · live</span>
          </div>
          <div
            className="panel-body"
            style={{ display: "grid", gap: 14, padding: "14px 16px" }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: i === 3 ? "none" : "1px solid var(--border)",
                }}
              >
                <Skeleton width={6} height={6} borderRadius={3} />
                <div style={{ display: "grid", gap: 4 }}>
                  <Skeleton width={i % 2 === 0 ? "70%" : "55%"} height={13} borderRadius={3} />
                  <Skeleton width={i % 2 === 0 ? "40%" : "30%"} height={10} borderRadius={3} />
                </div>
                <Skeleton width={44} height={11} borderRadius={3} />
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="panel" data-od-id="proj-health-loading">
            <div className="panel-head">
              <span className="panel-title">Pass rate</span>
              <span className="panel-meta">7d trend</span>
            </div>
            <div
              className="panel-body"
              style={{
                height: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Skeleton width="100%" height={80} borderRadius={6} />
            </div>
          </section>

          <section className="panel" data-od-id="proj-issues-today-loading">
            <div className="panel-head">
              <span className="panel-title">Issues today</span>
              <span className="panel-meta">
                <Skeleton width={90} height={11} borderRadius={3} />
              </span>
            </div>
            <div className="panel-body">
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
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

export function SpecHistorySkeleton() {
  return (
    <div
      className="spec-timeline"
      style={{ position: "relative", padding: "14px 18px" }}
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => {
        const isLast = i === 3;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              position: "relative",
              paddingBottom: isLast ? 0 : 18,
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
              <Skeleton
                width={8}
                height={8}
                borderRadius="50%"
                style={{ marginTop: 4, flexShrink: 0 }}
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
                <Skeleton
                  width={i % 2 === 0 ? "75%" : "60%"}
                  height={14}
                  borderRadius={3}
                  style={{ marginTop: 2 }}
                />
                <Skeleton
                  width={48}
                  height={22}
                  borderRadius={4}
                  style={{ flexShrink: 0 }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <Skeleton width={16} height={16} borderRadius="50%" style={{ flexShrink: 0 }} />
                <Skeleton width={80} height={11} borderRadius={3} />
                <span style={{ color: "var(--border)", fontSize: 11 }}>·</span>
                <Skeleton width={48} height={11} borderRadius={3} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SpecBlameSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "8px 0",
      }}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            padding: "2px 0",
          }}
        >
          <Skeleton width={50} height={11} borderRadius={3} style={{ flexShrink: 0 }} />
          <Skeleton width={60} height={11} borderRadius={3} style={{ flexShrink: 0 }} />
          <Skeleton
            width={i % 3 === 0 ? "65%" : i % 3 === 1 ? "80%" : "45%"}
            height={11}
            borderRadius={3}
          />
        </div>
      ))}
    </div>
  );
}

export interface SpecDetailSkeletonProps {
  project?: {
    id: string;
    name: string;
    specsRepoName?: string;
  } | null;
  path?: string;
}

export function SpecDetailSkeleton({ project, path }: SpecDetailSkeletonProps) {
  const name = path ? path.split("/").pop()?.replace(/\.[^.]+$/, "") || path : null;
  const displayName = name
    ? name.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : null;

  return (
    <div
      className="app-pane"
      id="pane-spec-detail"
      data-od-id="pane-spec-detail-loading"
    >
      <div className="page-head">
        <div className="page-head-text" style={{ width: "100%" }}>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/specs">Specs</Link>
            <span className="sep">›</span>
            {project ? (
              <Link to="/projects/$id/specs" params={{ id: project.id }}>
                {project.name}
              </Link>
            ) : (
              <Skeleton
                width={80}
                height={11}
                borderRadius={3}
                style={{ display: "inline-block" }}
              />
            )}
            <span className="sep">›</span>
            <span className="current">
              {displayName || (
                <Skeleton
                  width={110}
                  height={11}
                  borderRadius={3}
                  style={{ display: "inline-block" }}
                />
              )}
            </span>
          </nav>
          <div className="detail-title-row">
            <span className="detail-title">
              {displayName || <Skeleton width={220} height={24} borderRadius={4} />}
            </span>
            <div className="detail-actions">
              <Skeleton width={54} height={28} borderRadius={6} />
              <Skeleton width={62} height={28} borderRadius={6} />
            </div>
          </div>
          <div className="page-head-meta">
            {path ? (
              <code>{path}</code>
            ) : (
              <Skeleton
                width={160}
                height={13}
                borderRadius={3}
                style={{ display: "inline-block" }}
              />
            )}
            {" · "}
            {project?.name ? (
              project.name
            ) : (
              <Skeleton
                width={90}
                height={11}
                borderRadius={3}
                style={{ display: "inline-block" }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-grid">
          <div className="detail-col-main">
            <section className="panel" data-od-id="spec-body-loading">
              <div
                className="panel-body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "20px 24px",
                }}
              >
                {[
                  "82%",
                  "64%",
                  "91%",
                  "45%",
                  "78%",
                  "88%",
                  "55%",
                  "70%",
                  "93%",
                  "60%",
                  "75%",
                  "40%",
                ].map((w, i) => (
                  <Skeleton key={i} width={w} height={14} borderRadius={3} />
                ))}
              </div>
            </section>
          </div>

          <div className="detail-col-side">
            <section className="panel" data-od-id="spec-history-loading">
              <div className="panel-head">
                <span className="panel-title">Commit history</span>
                <span className="panel-meta">
                  <Skeleton width={18} height={12} borderRadius={3} />
                </span>
              </div>
              <SpecHistorySkeleton />
            </section>

            <section
              className="panel"
              style={{ marginTop: 20 }}
              data-od-id="spec-properties"
            >
              <div className="panel-head">
                <span className="panel-title">Properties</span>
              </div>
              <div className="kv-list">
                <div className="kv-row">
                  <div className="kv-key">Repository</div>
                  <div className="kv-val">
                    {project?.specsRepoName ?? (
                      <Skeleton width={110} height={13} borderRadius={3} />
                    )}
                  </div>
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
    </div>
  );
}

/**
 * Single project card skeleton for the all-projects grid.
 * Mirrors `.ap-card` structure so the load → content swap doesn't reflow.
 */
export function ProjectCardSkeleton({
  index = 0,
  reduce = false,
}: {
  index?: number;
  reduce?: boolean | null;
}) {
  const staggerMs = reduce ? 0 : index * 55;
  const nameWidth = [148, 118, 168, 132, 156, 124][index % 6];
  const subWidth = [110, 92, 128, 100, 140, 86][index % 6];
  const valueWidths = [
    [28, 36, 52],
    [22, 42, 48],
    [34, 30, 56],
    [26, 38, 44],
    [30, 34, 50],
    [24, 40, 54],
  ][index % 6];

  return (
    <div
      className="ap-card ap-card-skeleton"
      style={{ animationDelay: `${staggerMs}ms` }}
      aria-hidden="true"
    >
      <span className="ap-stripe ap-stripe-skeleton" aria-hidden="true" />
      <div className="ap-body">
        <div className="ap-head">
          <div className="ap-head-meta" style={{ gap: 8, width: "100%" }}>
            <div className="ap-title">
              <Skeleton
                className="skeleton-circle"
                width={10}
                height={10}
                borderRadius="50%"
                style={{ flexShrink: 0 }}
              />
              <Skeleton width={nameWidth} height={15} borderRadius={5} />
            </div>
            <Skeleton width={subWidth} height={10} borderRadius={3} />
          </div>
        </div>

        <div className="ap-stats">
          {[0, 1, 2].map((statIdx) => (
            <div className="ap-stat" key={statIdx}>
              <div className="ap-stat-label">
                <Skeleton
                  width={statIdx === 1 ? 72 : 58}
                  height={8}
                  borderRadius={3}
                />
              </div>
              <div className="ap-stat-value" style={{ marginTop: 6 }}>
                <Skeleton width={valueWidths[statIdx]} height={18} borderRadius={4} />
                {statIdx === 2 ? (
                  <div style={{ marginTop: 6 }}>
                    <Skeleton width={64} height={8} borderRadius={3} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="ap-foot">
          <div className="ap-spark" style={{ gap: 8 }}>
            <Skeleton width={96} height={9} borderRadius={3} />
            <Skeleton width="100%" height={28} borderRadius={6} />
          </div>
          <div className="ap-foot-meta">
            <Skeleton width={78} height={10} borderRadius={3} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * First-load skeleton grid for the all-projects page.
 * Six cards (one viewport page) keep density honest with PAGE_SIZE.
 */
export function AllProjectsSkeleton({
  count = 6,
  reduce = false,
}: {
  count?: number;
  reduce?: boolean | null;
}) {
  return (
    <div
      className="ap-grid ap-grid-skeleton"
      data-od-id="all-projects-skeleton"
      aria-busy="true"
      aria-label="Loading projects"
    >
      {Array.from({ length: count }, (_, i) => (
        <ProjectCardSkeleton key={i} index={i} reduce={reduce} />
      ))}
    </div>
  );
}
