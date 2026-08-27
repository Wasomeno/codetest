import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useSession } from "~/contexts/session-context";
import { useLogout } from "~/hooks/use-logout";
import { useProjects } from "~/hooks/api/useProjects";
import { toSidebarProjects } from "~/lib/map-app-project";
import { Loader2, ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";

const STORAGE_KEY_COLLAPSED = "qa-sidebar-collapsed";
const STORAGE_KEY_PROJECTS_EXPANDED = "qa-sidebar-projects-expanded";

const DashboardGlyph = () => (
  <svg
    className="glyph"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="3" rx="1" />
    <rect x="9" y="7" width="5" height="7" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
  </svg>
);

const TestsGlyph = () => (
  <svg
    className="glyph"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <path d="M3 3h10M3 8h10M3 13h6" />
  </svg>
);

const SpecsGlyph = () => (
  <svg
    className="glyph"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 2h6l2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
    <path d="M9 2v3h3" />
    <path d="M5 9h6M5 12h4" />
  </svg>
);

const ProjectsGlyph = () => (
  <svg
    className="glyph"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="5" height="4" rx="1" />
    <rect x="9" y="3" width="5" height="4" rx="1" />
    <rect x="2" y="9" width="5" height="4" rx="1" />
    <rect x="9" y="9" width="5" height="4" rx="1" />
  </svg>
);

const ChevronGlyph = () => (
  <svg
    className="nav-chev"
    viewBox="0 0 16 16"
    width={10}
    height={10}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 4l4 4-4 4" />
  </svg>
);

function getUserInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readExpanded(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROJECTS_EXPANDED);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((v): v is string => typeof v === "string"));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const user = session?.user;
  const logoutMutation = useLogout();

  const handleSignOut = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // ignore for preview
    }
    navigate({ to: "/" });
  };
  // Start with `false` so SSR and the first client render match (no
  // hydration mismatch). After mount we sync from localStorage; the
  // brief flash of the expanded rail is invisible to most users
  // because the persisted preference is restored in the same paint
  // frame as the body class change.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY_COLLAPSED) === "1");
    } catch {
      // ignore — keep default
    }
  }, []);

  useEffect(() => {
    if (collapsed) {
      document.body.classList.add("is-sidebar-collapsed");
    } else {
      document.body.classList.remove("is-sidebar-collapsed");
    }
    try {
      localStorage.setItem(STORAGE_KEY_COLLAPSED, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [collapsed]);

  // Tooltip helper. We always render the same attributes regardless of
  // collapse state so server-rendered HTML matches the client and we avoid
  // a hydration mismatch (`collapsed` is read from localStorage on the
  // client only). `title=""` suppresses the native browser tooltip in
  // every state — the visible label or `aria-label` already carries the
  // accessible name, and the styled popover is what shows the label in the
  // collapsed rail. `data-tooltip` is read by the CSS pseudo-element
  // popover, which only activates when the body has `is-sidebar-collapsed`.
  const tt = (text: string): { title: ""; "data-tooltip": string } => ({
    title: "",
    "data-tooltip": text,
  });
  const userTooltip = user
    ? `${user.name || user.username} · @${user.username}`
    : "Profile";

  const isDashboard = location.pathname.startsWith("/dashboard");
  const isTests =
    location.pathname.startsWith("/tests") || location.pathname.startsWith("/runs");
  // "Specs" is the global specs list. Project-scoped specs pages live under
  // /projects/$id/specs and are matched by the project group below, so we
  // exclude them here to avoid double-highlighting the global item.
  const isGlobalSpecs =
    location.pathname === "/specs" || location.pathname.startsWith("/specs/");
  const isSpecs = isGlobalSpecs && !location.pathname.startsWith("/projects/");
  // "All Projects" is active only on the index page (exact /projects).
  // The per-project sub-pages are active on the individual project row
  // below, so the global nav item does not need to glow for them.
  const isAllProjects = location.pathname === "/projects";
  const isProfile = location.pathname === "/profile";

  // Live list of workspace projects from the backend. Mapped to the
  // sidebar's lightweight shape (id, label, color). Skeleton rows
  // render while the first fetch is in flight so the rail doesn't
  // collapse to empty and then pop.
  const projectsQuery = useProjects();
  const sidebarProjects = projectsQuery.data
    ? toSidebarProjects(projectsQuery.data)
    : [];
  // While the very first load is pending, render three neutral
  // skeleton rows so the layout height is stable.
  const projectsLoading = projectsQuery.isPending && sidebarProjects.length === 0;

  // Expand state for project groups. The active project auto-expands whenever
  // its URL matches, even if the user previously collapsed it — otherwise
  // sub-item navigation would be unreachable.
  const [expanded, setExpanded] = useState<Set<string>>(() => readExpanded());

  useEffect(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)/);
    if (!match) return;
    const id = match[1];
    setExpanded((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_PROJECTS_EXPANDED,
        JSON.stringify(Array.from(expanded)),
      );
    } catch {
      // ignore
    }
  }, [expanded]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // The design wireframe puts the chevron inside the project link as a
  // direct child SVG. The whole link normally navigates to the project
  // dashboard; clicking the chevron itself (or its path) should instead
  // toggle the sub-items without navigating. We detect the chevron via
  // event.target.closest(".nav-chev") — the same trick the design's
  // app-shell.js uses.
  const handleProjectClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    projectId: string,
    isInContext: boolean,
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest && target.closest(".nav-chev")) {
      e.preventDefault();
      toggleExpand(projectId);
      return;
    }
    // If the user clicks anywhere else on the project link, treat it as
    // a normal navigation — even when the project is already expanded.
    // The destination is the project dashboard, which is the same link
    // they would land on if they collapsed the group.
    if (isInContext) {
      // already in context — let the link navigate (default behaviour)
      return;
    }
    // Not yet in context: this click also doubles as "expand the group so
    // I can see the sub-items next time". Expand but still navigate.
    if (!expanded.has(projectId)) {
      toggleExpand(projectId);
    }
  };

  return (
    <aside className="sidebar" data-od-id="app-sidebar">
      <div className="sidebar-head">
        <Link className="brand" to="/">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M9 11 L3 16 L9 21"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23 11 L29 16 L23 21"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 8 L14 24"
              fill="none"
              style={{ stroke: "var(--accent)" }}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M14 24 L20 24"
              fill="none"
              style={{ stroke: "var(--accent)" }}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span className="sidebar-brand-text">codetest</span>
        </Link>
        <button
          className="sidebar-toggle"
          type="button"
          data-action="toggle-sidebar"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          {...tt(collapsed ? "Expand sidebar" : "Collapse sidebar")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {/* Double-chevron icons (`<<` when expanded → collapse,
              `>>` when collapsed → expand) so the affordance is
              unmistakable. Component swaps the SVG on state change.
              The key remounts the SVG so the entrance animation
              fires on every swap instead of only on first mount. */}
          {collapsed ? (
            <ChevronsRight
              key="chevrons-right"
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : (
            <ChevronsLeft
              key="chevrons-left"
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      <div className="nav-section-label">Workspace</div>
      <Link
        to="/dashboard"
        className={`nav-item${isDashboard ? " is-active" : ""}`}
        data-od-id="nav-dashboard"
        {...tt("Dashboard")}
      >
        <DashboardGlyph />
        <span className="nav-item-label">Dashboard</span>
      </Link>
      <Link
        to="/projects"
        className={`nav-item${isAllProjects ? " is-active" : ""}`}
        data-od-id="nav-all-projects"
        {...tt("All projects")}
      >
        <ProjectsGlyph />
        <span className="nav-item-label">All projects</span>
      </Link>
      <Link
        to="/tests"
        className={`nav-item${isTests ? " is-active" : ""}`}
        data-od-id="nav-tests"
        {...tt("Test Scenarios")}
      >
        <TestsGlyph />
        <span className="nav-item-label">Test Scenarios</span>
      </Link>
      <Link
        to="/specs"
        className={`nav-item${isSpecs ? " is-active" : ""}`}
        data-od-id="nav-specs"
        {...tt("Specs")}
      >
        <SpecsGlyph />
        <span className="nav-item-label">Specs</span>
      </Link>

      <div className="nav-section-label">Projects</div>
      {projectsLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <div
              key={`skeleton-${i}`}
              className="nav-item nav-project-skeleton"
              data-od-id={`nav-project-skeleton-${i}`}
              aria-hidden="true"
            >
              <span
                className="project-dot"
                style={{ background: "var(--border)", opacity: 0.5 }}
              />
              <span
                className="nav-item-label"
                style={{
                  background: "var(--border)",
                  opacity: 0.5,
                  borderRadius: 4,
                  height: 10,
                  width: `${60 + (i * 13) % 40}%`,
                  display: "inline-block",
                }}
              />
            </div>
          ))}
        </>
      ) : sidebarProjects.length === 0 ? (
        <div
          className="nav-empty"
          data-od-id="nav-projects-empty"
          style={{
            padding: "8px 12px",
            color: "var(--muted)",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          No projects yet.
        </div>
      ) : (
        sidebarProjects.map((project) => {
        const isProjectHome = location.pathname === `/projects/${project.id}`;
        const isTestScenariosActive = location.pathname.startsWith(
          `/projects/${project.id}/test-scenarios`,
        );
        const isSpecsActive = location.pathname.startsWith(
          `/projects/${project.id}/specs`,
        );
        const isInContext =
          isProjectHome || isTestScenariosActive || isSpecsActive;
        const isOpen = expanded.has(project.id);
        // The active sub-page (Dashboard / Test Scenarios / Specs) is the
        // one that gets the full is-active treatment. The parent project
        // link is only visually active (text-only, no background) when
        // one of its sub-pages is in context.
        const activeSubPage: "dashboard" | "tests" | "specs" | null =
          isProjectHome
            ? "dashboard"
            : isTestScenariosActive
              ? "tests"
              : isSpecsActive
                ? "specs"
                : null;
        return (
          <div key={project.id} data-od-id={`nav-project-${project.id}`}>
            <Link
              to="/projects/$id"
              params={{ id: project.id }}
              className={`nav-item nav-project${isOpen ? " is-open" : ""}${isInContext ? " is-in-context" : ""}`}
              {...tt(project.label)}
              onClick={(e) => handleProjectClick(e, project.id, isInContext)}
            >
              <span
                className="project-dot"
                style={{ background: project.color }}
                aria-hidden="true"
              />
              <span className="nav-item-label">{project.label}</span>
              <ChevronGlyph />
            </Link>
            <div
              className="nav-project-group"
              data-od-id={`nav-project-group-${project.id}`}
              role="group"
              aria-hidden={!isOpen}
            >
              <div className="nav-project-group-inner">
                <Link
                  to="/projects/$id"
                  params={{ id: project.id }}
                  className={`nav-sub${activeSubPage === "dashboard" ? " is-active" : ""}`}
                  title="Dashboard"
                  data-od-id={`nav-project-${project.id}-dashboard`}
                  tabIndex={isOpen ? 0 : -1}
                >
                  <DashboardGlyph />
                  <span className="nav-item-label">Dashboard</span>
                </Link>
                <Link
                  to="/projects/$id/test-scenarios"
                  params={{ id: project.id }}
                  className={`nav-sub${activeSubPage === "tests" ? " is-active" : ""}`}
                  title="Test Scenarios"
                  data-od-id={`nav-project-${project.id}-tests`}
                  tabIndex={isOpen ? 0 : -1}
                >
                  <TestsGlyph />
                  <span className="nav-item-label">Test Scenarios</span>
                </Link>
                <Link
                  to="/projects/$id/specs"
                  params={{ id: project.id }}
                  className={`nav-sub${activeSubPage === "specs" ? " is-active" : ""}`}
                  title="Specs"
                  data-od-id={`nav-project-${project.id}-specs`}
                  tabIndex={isOpen ? 0 : -1}
                >
                  <SpecsGlyph />
                  <span className="nav-item-label">Specs</span>
                </Link>
              </div>
            </div>
          </div>
        );
        })
      )}

      <div className="sidebar-foot">
        <Link
          to="/profile"
          className={`user-chip${isProfile ? " is-current" : ""}`}
          {...tt(userTooltip)}
        >
          <div className="avatar">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name || user.username}
                style={{ width: "100%", height: "100%", borderRadius: "50%" }}
              />
            ) : (
              getUserInitials(user?.name || user?.username)
            )}
          </div>
          <div className="user-meta">
            <div className="user-name">{user?.name || user?.username || "Guest"}</div>
            <div className="user-handle">@{user?.username || "guest"}</div>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          disabled={logoutMutation.isPending}
          className="sidebar-logout-btn"
          aria-label="Sign out"
          {...tt("Sign out")}
        >
          {logoutMutation.isPending ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          ) : (
            <LogOut size={12} strokeWidth={2} aria-hidden="true" />
          )}
          <span className="sidebar-logout-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
