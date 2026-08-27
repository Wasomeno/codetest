import { Link, useLocation } from "@tanstack/react-router";

const BRAND_SVG = (
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
);

const MODULES = [
  {
    title: "A live read, not a report.",
    desc:
      "Recent runs, pass-rate curve, per-project health. Refreshes every 30 seconds, so what you see is what the suite saw.",
    href: "/dashboard" as const,
    linkLabel: "dashboard",
    iconPath: (
      <>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="3" rx="1" />
        <rect x="9" y="7" width="5" height="7" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
      </>
    ),
  },
  {
    title: "Steps, asserts, replays.",
    desc:
      "Tests live as readable steps — not YAML, not a vendor DSL. Each step has a timestamped screenshot, an assertion, and the commit it shipped in.",
    href: "/tests" as const,
    linkLabel: "tests",
    iconPath: <path d="M3 3h10M3 8h10M3 13h6" />,
  },
  {
    title: "Product specs the tests cite.",
    desc:
      "A spec is a markdown file with a checklist. Migrations track every change to it — so when a test breaks, the spec that changed is one click away.",
    href: "/specs" as const,
    linkLabel: "specs",
    iconPath: (
      <>
        <path
          d="M4 2h6l2 2v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
        />
        <path d="M9 2v3h3" />
        <path d="M5 9h6M5 12h4" />
      </>
    ),
  },
  {
    title: "One workspace per product.",
    desc:
      "Each project owns its tests, its specs, and its dashboards. Sidebar groups collapse and remember. Owner, team, and color are set once and reused everywhere.",
    href: "/projects" as const,
    linkLabel: "projects",
    iconPath: (
      <>
        <rect x="2" y="3" width="5" height="4" rx="1" />
        <rect x="9" y="3" width="5" height="4" rx="1" />
        <rect x="2" y="9" width="5" height="4" rx="1" />
        <rect x="9" y="9" width="5" height="4" rx="1" />
      </>
    ),
  },
];

const PRINCIPLES = [
  {
    title: "Show the run, not the spreadsheet.",
    body:
      "A green check tells you nothing. We surface the step that failed, the commit that caused it, and the spec it should have satisfied — in one screen, every time.",
  },
  {
    title: "Tests stay readable.",
    body:
      "No YAML, no DSL, no “click here, type there.” A test in codetest reads like a checklist a QA engineer would write down. Editing it does not require a parser.",
  },
  {
    title: "Built for this week, not next year.",
    body:
      "We design for the deploy happening tomorrow, not the product roadmap we imagine eighteen months out. If a feature doesn’t help the next ship, it doesn’t ship.",
  },
];

const LOG_ENTRIES = [
  {
    day: "Aug 18",
    year: "2026",
    tag: "New",
    tagClass: "about-log-tag-new",
    title: "Spec migrations get a timeline view.",
    desc:
      "Every change to a spec is now a row in a single log, with the author, the diff, and the test runs that touched it. Replaces the old per-spec history tab.",
  },
  {
    day: "Aug 06",
    year: "2026",
    tag: "Fix",
    tagClass: "about-log-tag-fix",
    title: "Flaky tests stop paging at 2am.",
    desc:
      "A test marked flaky now collapses consecutive failures into a single notification with a “first seen / last seen / runs between” summary. Pager stays dark until the run count crosses the threshold you set.",
  },
  {
    day: "Jul 24",
    year: "2026",
    tag: "Improved",
    tagClass: "about-log-tag-improved",
    title: "Run detail loads in under 400ms.",
    desc:
      "Switched the run-detail pane to a server-rendered shell with streamed step content. Largest Contentful Paint on a cold dashboard session is down to 380ms from 1.4s.",
  },
  {
    day: "Jul 09",
    year: "2026",
    tag: "New",
    tagClass: "about-log-tag-new",
    title: "Project color carries through everywhere.",
    desc:
      "The dot you pick on a project now appears in the sidebar, the dashboard pass-rate bars, the test rows, and the run detail — so you can scan a list and know which product a row belongs to.",
  },
  {
    day: "Jun 27",
    year: "2026",
    tag: "Fix",
    tagClass: "about-log-tag-fix",
    title: "GitLab merge-request deep links.",
    desc:
      "A failing run now links directly to the MR that introduced the failing commit — via the GitLab API key in your profile. No more “which PR is this again” in the standup channel.",
  },
];

export function AboutPage() {
  const location = useLocation();
  const isCurrent = (href: string) => location.pathname === href;

  return (
    <section id="about" data-od-id="about">
      <nav className="nav nav-letter" data-od-id="about-nav">
        <Link to="/" className="brand" title="codetest">
          {BRAND_SVG}
          <span>codetest</span>
        </Link>
        <Link to="/login" className="nav-link nav-link-quiet">
          Log in
        </Link>
      </nav>

      <main className="about-main">
        {/* Letter Hero */}
        <section className="about-hero" data-od-id="about-hero">
          <p className="about-salutation">
            <em>Hello.</em>
          </p>
          <p className="about-lede">
            We made <strong>codetest</strong> because the tools we’d been using
            to run end-to-end tests were built for the people who write the tests
            — not for the people who actually own the product. We wanted the
            second group to be able to see <em>the run</em>, not just the green
            check.
          </p>
          <p className="about-lede">
            This page is a short note from us about what we built, why, and
            where we’re going next. It’s longer than a marketing page and
            shorter than a manifesto. If you have fifteen minutes, we’d love
            you to read it.
          </p>
          <p className="about-hero-meta">
            <span>August 2026</span>
            <span className="about-hero-meta-sep" aria-hidden="true">
              ·
            </span>
            <span>v0.4.2</span>
          </p>
        </section>

        {/* Mission Prose */}
        <section className="about-prose" data-od-id="about-mission">
          <h2 className="about-h2">Why we built it.</h2>
          <p>
            End-to-end tests are the only layer that exercises a product the
            way a real user does. But the tools around them — the cloud grids,
            the flaky-test dashboards, the vendor portals — were designed for
            people who write tests for a living. The people who actually own a
            product page are the ones who need to know <em>why it broke</em>.
          </p>
          <p>
            So codetest collapses that loop. Every run is a story you can
            replay. Every failure is attached to a commit. Every flaky test is a
            quiet notification, not a page to someone’s phone at 2am.
          </p>

          <figure className="about-pullquote">
            <span className="about-pullquote-mark" aria-hidden="true">
              “
            </span>
            <blockquote>
              <p>
                We don’t want to be a platform. We want to be the tab the
                on-call engineer has open when something red shows up at 2am —
                and the tab the PM closes at 6pm because nothing is red.
              </p>
            </blockquote>
            <figcaption>
              <span className="about-pullquote-role">
                from the founding notes
              </span>
            </figcaption>
          </figure>

          <p>
            If you’re reading this because you’re considering the tool —
            welcome. What follows is the four surfaces you’ll use, the three
            principles that shape every feature we ship, and a short, honest
            log of what changed lately.
          </p>
        </section>

        {/* Modules */}
        <section className="about-modules" data-od-id="about-modules">
          <h2 className="about-h2">What you’ll find inside.</h2>
          <p className="about-h2-sub">
            Four surfaces, one workspace. Nothing here is decorative.
          </p>

          <ol className="about-module-list">
            {MODULES.map((m) => (
              <li className="about-module" key={m.linkLabel}>
                <span className="about-module-glyph" aria-hidden="true">
                  <svg
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {m.iconPath}
                  </svg>
                </span>
                <div className="about-module-body">
                  <div className="about-module-head">
                    <h3 className="about-module-title">{m.title}</h3>
                    <Link
                      to={m.href}
                      className="about-module-link"
                      data-od-id={`module-${m.linkLabel}`}
                    >
                      {m.linkLabel}
                    </Link>
                  </div>
                  <p className="about-module-desc">{m.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Principles */}
        <section
          className="about-principles-prose"
          data-od-id="about-principles"
        >
          <h2 className="about-h2">How we choose what to build.</h2>
          <p className="about-h2-sub">
            Three rules. They are the reason the product feels small.
          </p>

          <ol className="about-principle-list">
            {PRINCIPLES.map((p, i) => (
              <li className="about-principle-row" key={p.title}>
                <div className="about-principle-num">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="about-principle-body">
                  <h3 className="about-principle-title">{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Changelog */}
        <section className="about-changelog" data-od-id="about-changelog">
          <h2 className="about-h2">What shipped lately.</h2>
          <p className="about-h2-sub">
            A short, honest log. We don’t bury fixes in marketing copy.
          </p>

          <ol className="about-log">
            {LOG_ENTRIES.map((entry) => (
              <li className="about-log-row" key={entry.title}>
                <div className="about-log-date">
                  <span className="about-log-day">{entry.day}</span>
                  <span className="about-log-year">{entry.year}</span>
                </div>
                <div className="about-log-body">
                  <div className={`about-log-tag ${entry.tagClass}`}>
                    {entry.tag}
                  </div>
                  <div className="about-log-title">{entry.title}</div>
                  <p className="about-log-desc">{entry.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Letter Close */}
        <section className="about-close" data-od-id="about-close">
          <p className="about-close-ps">
            <span className="about-close-ps-label">P.S.</span>
            The fastest way to see if codetest fits is to point it at your next
            deploy.{" "}
            <Link to="/dashboard" data-od-id="about-cta-bottom">
              Sign in, hook a project, watch the first run land →
            </Link>
          </p>
        </section>
      </main>

      <footer className="about-foot" data-od-id="about-foot">
        <div className="about-foot-brand">
          {BRAND_SVG}
          <span>codetest</span>
        </div>
        <div className="about-foot-links">
          <Link
            to="/dashboard"
            aria-current={isCurrent("/dashboard") ? "page" : undefined}
          >
            Dashboard
          </Link>
          <Link
            to="/tests"
            aria-current={isCurrent("/tests") ? "page" : undefined}
          >
            Tests
          </Link>
          <Link
            to="/specs"
            aria-current={isCurrent("/specs") ? "page" : undefined}
          >
            Specs
          </Link>
          <Link
            to="/projects"
            aria-current={isCurrent("/projects") ? "page" : undefined}
          >
            Projects
          </Link>
          <Link
            to="/profile"
            aria-current={isCurrent("/profile") ? "page" : undefined}
          >
            Profile
          </Link>
          <Link to="/about" aria-current="page">
            About
          </Link>
        </div>
        <div className="about-foot-meta">
          <span className="about-foot-status">
            <span className="live-dot" />
            all systems normal
          </span>
        </div>
      </footer>
    </section>
  );
}
