import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Landing page motion language (shared with the dashboard):
 *  - One canonical ease-out: cubic-bezier(0.16, 1, 0.3, 1). Mixing curves
 *    is the fastest way a page feels "off" in the aggregate.
 *  - 60ms stagger between hero siblings (30–80ms band).
 *  - GPU-only properties: transform + opacity, nothing else.
 *  - Entrance is rare (first visit) → delight is earned; every reveal
 *    collapses to a plain fade when prefers-reduced-motion is set.
 */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const STAGGER = 0.06;

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

const TICKER_ITEMS = [
  "Schedule runs",
  "Watch live",
  "Trace failures",
  "Attach commits",
  "Team workspaces",
  "Nightly & on-commit",
];

const FEATURES = [
  {
    index: "01",
    title: "Schedule runs",
    desc: "Nightly, on-commit, or on your own cron — codetest queues and executes the suites you define, with no babysitting.",
  },
  {
    index: "02",
    title: "Watch live",
    desc: "Follow a run step by step as it happens. Pass and fail stream in as each test settles, not after the whole suite finishes.",
  },
  {
    index: "03",
    title: "Trace failures",
    desc: "Every failure points back to the commit that introduced it, so the fix starts at the source — not with guesswork.",
  },
];

export function LandingPage() {
  const reduce = useReducedMotion();

  // Hero entrance — staggered cascade; nothing scales from 0, nothing moves
  // more than 8px. delay grows with each sibling (60ms steps).
  const heroEnter = (i: number) => ({
    initial: reduce ? false : { opacity: 0, transform: "translateY(8px)" },
    animate: { opacity: 1, transform: "translateY(0)" },
    transition: {
      duration: reduce ? 0 : 0.5,
      ease: EASE_OUT,
      delay: reduce ? 0 : i * STAGGER,
    },
  });

  // Scroll reveal — shared for the below-the-fold blocks. Slight rise +
  // scale from 0.985 (real things don't appear from nothing).
  const reveal = {
    initial: reduce
      ? false
      : { opacity: 0, transform: "translateY(16px) scale(0.985)" },
    whileInView: { opacity: 1, transform: "translateY(0) scale(1)" },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: reduce ? 0 : 0.55, ease: EASE_OUT },
  };

  return (
    <section id="landing" data-od-id="landing">
      <div className="landing-ambient" aria-hidden="true" />

      <nav className="nav" data-od-id="landing-nav">
        <Link to="/" className="brand">
          {BRAND_SVG}
          <span>codetest</span>
        </Link>
        <div className="nav-links">
          <Link to="/about" className="nav-link">
            About
          </Link>
        </div>
        <div className="nav-spacer" />
        <Link to="/login" className="btn btn-ghost nav-login">
          Log in
        </Link>
      </nav>

      <main className="landing-main">
        <div className="landing-card" data-od-id="landing-hero">
          <motion.span className="eyebrow" {...heroEnter(0)}>
            <span className="dot" />
            End-to-end test automation
          </motion.span>
          <motion.h1 className="display" {...heroEnter(1)}>
            Run, watch and audit every webapp test from one place.
          </motion.h1>
          <motion.p className="landing-lede" {...heroEnter(2)}>
            codetest is a workspace for teams shipping automated end-to-end
            tests on the web — schedule runs, watch them live, and trace every
            failure back to the commit that caused it.
          </motion.p>
          <motion.div
            className="landing-actions"
            style={{ marginTop: 24 }}
            {...heroEnter(3)}
          >
            <Link
              to="/login"
              className="btn btn-primary btn-lg"
              data-od-id="landing-cta-primary"
            >
              Get started
              <svg
                className="btn-arrow"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  d="M2 8 H13 M9 4 L13 8 L9 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <a
              className="btn btn-ghost btn-lg"
              href="https://github.com/codetest/webapp"
              target="_blank"
              rel="noopener"
              data-od-id="landing-cta-github"
            >
              View on GitHub
            </a>
          </motion.div>
        </div>

        {/* Capability ticker — decorative, so it's aria-hidden. Constant
            motion → linear easing; masked edges so tokens fade, not clip. */}
        <motion.div
          className="landing-ticker"
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
        >
          <div className="landing-ticker-track">
            <ul className="landing-ticker-list">
              {TICKER_ITEMS.map((item) => (
                <li key={item} className="landing-ticker-item">
                  {item}
                </li>
              ))}
            </ul>
            <ul className="landing-ticker-list" aria-hidden="true">
              {TICKER_ITEMS.map((item) => (
                <li key={item} className="landing-ticker-item">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <motion.figure
          className="landing-preview"
          data-od-id="landing-preview"
          {...reveal}
        >
          <div className="preview-chrome">
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-dot" />
            <span className="preview-url">codetest / dashboard</span>
            <span className="preview-pane-meta">
              <span className="live-dot" />
              live
            </span>
          </div>
          <div className="preview-body preview-body--video">
            <video
              className="dashboard-motion"
              src="/qa-automation-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="codetest automation test generation and live run"
            />
          </div>
        </motion.figure>

        <motion.div
          className="feature-row"
          data-od-id="landing-features"
          {...reveal}
        >
          {FEATURES.map((f) => (
            <div key={f.index} className="feature-cell">
              <span className="feature-index">{f.index}</span>
              <h2 className="feature-title">{f.title}</h2>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <motion.footer
        className="landing-foot"
        data-od-id="landing-foot"
        style={{ maxWidth: "none", margin: 0 }}
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: reduce ? 0 : 0.5, ease: EASE_OUT }}
      >
        <div
          className="landing-foot-grid"
          style={{ gridTemplateColumns: "minmax(220px, 1.4fr) repeat(3, minmax(110px, 1fr))" }}
        >
          <section className="landing-foot-brand" aria-label="About codetest">
            <Link to="/" className="landing-foot-brand-row">
              {BRAND_SVG}
              <span className="landing-foot-wordmark">codetest</span>
            </Link>
            <p className="landing-foot-tagline">
              End-to-end test automation for web teams — schedule runs, watch
              them live, trace every failure to a commit.
            </p>
            <a
              className="landing-foot-source"
              href="https://github.com/codetest/webapp"
              target="_blank"
              rel="noopener"
            >
              <span className="landing-foot-source-handle">
                github.com/codetest/webapp
              </span>
              <svg
                className="landing-foot-source-arrow"
                viewBox="0 0 16 16"
                width="11"
                height="11"
                aria-hidden="true"
              >
                <path
                  d="M5 11 L11 5 M6 5 H11 V10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </section>

          <nav className="landing-foot-col" aria-label="Product">
            <h3 className="landing-foot-eyebrow">Product</h3>
            <ul className="landing-foot-list">
              <li>
                <Link to="/dashboard" className="landing-foot-link">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/tests" className="landing-foot-link">
                  Tests
                </Link>
              </li>
              <li>
                <Link to="/tests" className="landing-foot-link">
                  Run detail
                </Link>
              </li>
              <li>
                <Link to="/projects" className="landing-foot-link">
                  All projects
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="landing-foot-col" aria-label="Specs">
            <h3 className="landing-foot-eyebrow">Specs</h3>
            <ul className="landing-foot-list">
              <li>
                <Link to="/specs" className="landing-foot-link">
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/specs" className="landing-foot-link">
                  Spec detail
                </Link>
              </li>
              <li>
                <Link to="/specs" className="landing-foot-link">
                  Migrating
                </Link>
              </li>
              <li>
                <Link to="/specs" className="landing-foot-link">
                  Migration log
                </Link>
              </li>
            </ul>
          </nav>

          <nav className="landing-foot-col" aria-label="Team">
            <h3 className="landing-foot-eyebrow">Team</h3>
            <ul className="landing-foot-list">
              <li>
                <Link to="/about" className="landing-foot-link">
                  About
                </Link>
              </li>
              <li>
                <Link to="/login" className="landing-foot-link">
                  Log in
                </Link>
              </li>
              <li>
                <Link to="/profile" className="landing-foot-link">
                  Profile
                </Link>
              </li>
              <li>
                <a
                  className="landing-foot-link"
                  href="mailto:hello@codetest.dev"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="landing-foot-bottom">
          <span className="landing-foot-meta">
            © 2026 codetest · made for QA teams that ship daily.
          </span>
          <nav className="landing-foot-legal" aria-label="Legal">
            <a className="landing-foot-legal-link" href="#terms">
              Terms
            </a>
            <a className="landing-foot-legal-link" href="#privacy">
              Privacy
            </a>
            <a className="landing-foot-legal-link" href="#security">
              Security
            </a>
            <a className="landing-foot-legal-link" href="#changelog">
              Changelog
            </a>
          </nav>
        </div>
      </motion.footer>
    </section>
  );
}
