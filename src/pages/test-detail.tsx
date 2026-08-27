import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  fmtDate,
  fmtRel,
  getProject,
  RECENT_TEST_RUNS,
  STEPS_TEMPLATE,
  TESTS,
} from "~/lib/mock-data-new";
import type { Step } from "~/lib/mock-data-new";

// Inline icon defs (matches symbols from automation-test.html)
const StepIcon = ({ action }: { action: Step["action"] }) => {
  const props = {
    viewBox: "0 0 16 16",
    width: 14,
    height: 14,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (action) {
    case "navigate":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <line x1="2" y1="8" x2="14" y2="8" />
          <ellipse cx="8" cy="8" rx="3" ry="6" />
        </svg>
      );
    case "type":
      return (
        <svg {...props}>
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.2" />
          <path d="M5 6h6" />
          <path d="M5 9h3" />
          <path d="M11.5 7.5v3.5M10 9.5h3" />
        </svg>
      );
    case "click":
      return (
        <svg {...props}>
          <path d="M5.5 3v9l2.6-2.5L10 13l1.4-0.8L9 8.7 12.2 8.5z" />
        </svg>
      );
    case "select":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="2.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "assert":
      return (
        <svg {...props}>
          <path d="M3 8.3l3.4 3.4L13 5" />
        </svg>
      );
    case "webhook":
      return (
        <svg {...props}>
          <path d="M9.5 2L4 9h3l-1 5 5.5-7H8.5z" />
        </svg>
      );
    case "api":
      return (
        <svg {...props}>
          <path d="M6 3c-2 0-2 2-2 3.2c0 1-1 1.8-2 1.8c1 0 2 0.8 2 1.8c0 1.2 0 3.2 2 3.2" />
          <path d="M10 3c2 0 2 2 2 3.2c0 1 1 1.8 2 1.8c-1 0-2 0.8-2 1.8c0 1.2 0 3.2-2 3.2" />
        </svg>
      );
    default:
      return null;
  }
};

const ActionIcon = StepIcon;

const PlayIcon = () => (
  <svg viewBox="0 0 16 16" width={12} height={12} fill="currentColor" aria-hidden="true">
    <path d="M4 2.5v11l8-5.5z" />
  </svg>
);

const SparkleIcon = () => (
  <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 1.5 C8 5, 11 8, 14.5 8 C11 8, 8 11, 8 14.5 C8 11, 5 8, 1.5 8 C5 8, 8 5, 8 1.5 Z" />
  </svg>
);

const CheckIcon = ({ size = 12 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8.5l3 3 7-8" />
  </svg>
);

function StatusMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [
    { id: "passing", label: "passing", color: "var(--success)" },
    { id: "flaky", label: "flaky", color: "var(--warn)" },
    { id: "failing", label: "failing", color: "var(--danger)" },
  ];
  const current = options.find((o) => o.id === value) || options[0];
  const pillClass =
    current.id === "passing"
      ? "pill pill-success"
      : current.id === "failing"
        ? "pill pill-danger"
        : "pill pill-warn";
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className={`${pillClass} pill-edit`}
        style={{ height: 22, padding: "0 10px", fontSize: 11, border: 0, cursor: "pointer" }}
        onClick={() => setOpen(!open)}
      >
        <span className="swatch" />
        <span>{current.label}</span>
        <svg
          className="pill-edit-caret"
          viewBox="0 0 16 16"
          width={10}
          height={10}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          style={{ display: "inline-block", marginLeft: 2, opacity: 0.7 }}
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="status-backdrop"
            className="popover-backdrop"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
        {open && (
          <motion.div
            key="status-menu"
            className="status-menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 140,
              display: "flex",
              flexDirection: "column",
              transformOrigin: "top left",
              zIndex: 100,
            }}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              scale: 0.97,
              y: -2,
              transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] },
            }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span
                  className="status-dot"
                  style={{ background: opt.color }}
                />
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type TabId = "overview" | "properties" | "automation";
type ATStateId = "empty" | "running" | "success" | "error";

const AT_STATES: { id: ATStateId; label: string; color: string }[] = [
  { id: "empty", label: "Not generated", color: "var(--muted)" },
  { id: "running", label: "Generating", color: "var(--accent)" },
  { id: "success", label: "Generated", color: "var(--success)" },
  { id: "error", label: "Error", color: "var(--danger)" },
];

function StatusPill({ status }: { status: "passed" | "failed" | "flaky" }) {
  const cls =
    status === "passed"
      ? "pill pill-success"
      : status === "failed"
        ? "pill pill-danger"
        : "pill pill-warn";
  const label =
    status === "passed" ? "passed" : status === "failed" ? "failed" : "flaky";
  return (
    <span className={cls}>
      <span className="swatch" />
      {label}
    </span>
  );
}

function ATStateEmpty({ test }: { test: { name: string; steps: number } }) {
  return (
    <div className="at-card at-card-state" data-state="empty" data-od-id="at-state-empty">
      <div className="at-card-head">
        <div className="at-card-icon">
          <SparkleIcon />
        </div>
        <div className="at-card-body">
          <h3 className="at-card-title">No automation test yet</h3>
          <p className="at-card-sub">
            Generate a runnable Playwright script from the{" "}
            <strong>{test.steps} scenario steps</strong>. The model maps each
            step to a selector strategy — Test ID preferred — and bakes in the
            Stripe fixtures.
          </p>
        </div>
      </div>
      <div className="at-card-actions">
        <button className="btn btn-primary" type="button" onClick={() => alert("Generate: not implemented in UI migration")}>
          <SparkleIcon />
          Generate automation test
        </button>
        <span className="at-card-meta">est. 30–45s · Playwright · Test ID preferred</span>
      </div>
    </div>
  );
}

function ATStateRunning({ test }: { test: { name: string; steps: number } }) {
  return (
    <div className="at-card at-card-state" data-state="running" data-od-id="at-state-running">
      <div className="at-card-head">
        <div className="at-card-icon">
          <svg viewBox="0 0 16 16" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2v4M8 10v4M2 8h4M10 8h4M3.8 3.8l2.8 2.8M9.4 9.4l2.8 2.8M3.8 12.2l2.8-2.8M9.4 6.6l2.8-2.8" />
          </svg>
        </div>
        <div className="at-card-body">
          <h3 className="at-card-title">Generating automation test</h3>
          <p className="at-card-sub">
            Mapping the <strong>{test.steps} scenario steps</strong> into a
            Playwright script — resolving selectors, binding fixtures,
            scaffolding assertions.
          </p>
        </div>
      </div>

      <div className="at-workflow-meta">
        <span>
          <b>Step 11</b> of {test.steps} · mapping selectors
        </span>
        <span className="at-workflow-pct">62%</span>
      </div>
      <div className="at-workflow" aria-label="Generation workflow">
        <div className="at-progress" aria-hidden="true">
          <div
            className="at-progress-fill"
            style={{ transform: "scaleX(0.62)" }}
          />
        </div>
        <div className="at-workflow-step is-done">
          <span className="step-dot">
            <CheckIcon size={11} />
          </span>
          <span className="step-label">Understand</span>
        </div>
        <div className="at-workflow-connector" />
        <div className="at-workflow-step is-done">
          <span className="step-dot">
            <CheckIcon size={11} />
          </span>
          <span className="step-label">Map selectors</span>
        </div>
        <div className="at-workflow-connector" />
        <div className="at-workflow-step is-current">
          <span className="step-dot">3</span>
          <span className="step-label">Bind fixtures</span>
        </div>
        <div className="at-workflow-connector" />
        <div className="at-workflow-step">
          <span className="step-dot">4</span>
          <span className="step-label">Generate code</span>
        </div>
        <div className="at-workflow-connector" />
        <div className="at-workflow-step">
          <span className="step-dot">5</span>
          <span className="step-label">Validate</span>
        </div>
      </div>

      <div className="at-log" aria-hidden="true">
        <div className="at-log-line">
          <span className="at-log-ts">00:00</span>
          <span>analyzing scenario steps…</span>
        </div>
        <div className="at-log-line">
          <span className="at-log-ts">00:04</span>
          <span>resolving selectors (testid preferred)</span>
        </div>
        <div className="at-log-line">
          <span className="at-log-ts">00:09</span>
          <span>binding fixtures: stripe-test-card, usAddress</span>
        </div>
        <div className="at-log-line">
          <span className="at-log-ts">00:18</span>
          <span>generating step 11/{test.steps}: Complete 3DS challenge</span>
        </div>
      </div>
      <div className="at-card-actions">
        <button className="btn btn-ghost" type="button" onClick={() => alert("Cancel: not implemented in UI migration")}>
          Cancel
        </button>
        <span className="at-card-meta" style={{ color: "var(--accent)" }}>
          <span className="dot" />running · j-7f3a · 28s
        </span>
      </div>
    </div>
  );
}

function ATStateSuccess({
  test,
  steps,
  recentRuns,
}: {
  test: { name: string; steps: number };
  steps: Step[];
  recentRuns: typeof RECENT_TEST_RUNS;
}) {
  // Build the generated-step list from the steps data. We map the
  // STEPS_TEMPLATE's action -> generated step-action label, since the
  // design uses friendlier copy ("fill + submit", "click (iframe)").
  const GENERATED_ACTIONS: Record<string, string> = {
    navigate: "navigate",
    click: "click",
    type: "fill + submit",
    select: "select option",
    assert: "assert",
    webhook: "assert webhook",
    api: "api assertion",
  };
  return (
    <div className="at-card at-card-state" data-state="success" data-od-id="at-state-success">
      <div className="at-card-head">
        <div className="at-card-icon">
          <CheckIcon size={18} />
        </div>
        <div className="at-card-body">
          <h3 className="at-card-title">Automation test generated</h3>
          <p className="at-card-sub">
            Playwright script for <strong>{test.name}</strong> ·{" "}
            <strong>{test.steps} / {test.steps}</strong> steps mapped · last
            validated Aug 28, 2024.
          </p>
        </div>
      </div>

      <div className="at-result">
        <div className="at-result-cell">
          <div className="at-result-key">Last dry run</div>
          <div className="at-result-val is-pass">9.9s</div>
        </div>
        <div className="at-result-cell">
          <div className="at-result-key">Steps covered</div>
          <div className="at-result-val">
            {test.steps} / {test.steps}
          </div>
        </div>
        <div className="at-result-cell">
          <div className="at-result-key">Selector strategy</div>
          <div className="at-result-val" style={{ fontSize: 14 }}>
            Test ID preferred
          </div>
        </div>
        <div className="at-result-cell">
          <div className="at-result-key">Script</div>
          <div className="at-result-val" style={{ fontSize: 13 }}>
            tests/{test.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.spec.ts
          </div>
        </div>
      </div>

      <div className="at-step-list" data-od-id="at-step-list">
        <div className="at-step-list-head">
          <span>Generated steps</span>
          <span className="at-step-count">{test.steps} mapped</span>
        </div>
        {steps.map((s) => (
          <div key={s.num} className="step-row" data-step={s.num}>
            <span className="step-icon">
              <ActionIcon action={s.action} />
            </span>
            <span className="step-num">
              {String(s.num).padStart(2, "0")}
            </span>
            <span className="step-action">
              {GENERATED_ACTIONS[s.action] ?? s.action}
            </span>
            <span className="step-name">{s.name}</span>
            <span className="step-time">{s.time}</span>
            <svg
              className="step-chevron"
              viewBox="0 0 16 16"
              width={12}
              height={12}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M6 3l5 5-5 5" />
            </svg>
          </div>
        ))}
      </div>

      <div className="at-card-actions">
        <button className="btn btn-primary" type="button" onClick={() => alert("Run now: not implemented in UI migration")}>
          <PlayIcon />
          Run now
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => alert("View in repo: not implemented in UI migration")}>
          View in repo
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => alert("Add step: not implemented in UI migration")}>
          <svg
            viewBox="0 0 16 16"
            width={11}
            height={11}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add step
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => alert("Regenerate: not implemented in UI migration")}>
          Regenerate
        </button>
        <span className="at-card-meta" style={{ color: "var(--success)" }}>
          <span className="dot" />passed · 1m ago
        </span>
      </div>

      <section className="panel" data-od-id="at-recent-runs" style={{ marginTop: 16 }}>
        <div className="panel-head">
          <span className="panel-title">Recent runs</span>
          <span className="panel-meta">last {recentRuns.length} · this automation test</span>
        </div>
        <div
          className="run-row"
          style={{ background: "oklch(98% 0.003 250)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}
        >
          <div>Run</div>
          <div>When</div>
          <div>Duration</div>
          <div style={{ textAlign: "right" }}>Status</div>
        </div>
        {recentRuns.map((r) => {
          const dotColor =
            r.status === "passed"
              ? "var(--success)"
              : r.status === "flaky"
                ? "var(--warn)"
                : "var(--danger)";
          return (
            <Link
              key={r.id}
              to="/runs/$id" params={{ id: r.id }}
              className="run-row"
              data-run-id={r.id}
              style={{ cursor: "pointer", textDecoration: "none" }}
            >
              <span className="run-id">
                <span className="commit-dot" style={{ background: dotColor }} />
                #{r.id} · main · {r.trigger}
              </span>
              <span className="run-when">{fmtRel(r.when)}</span>
              <span className="run-duration">{r.duration}</span>
              <span style={{ textAlign: "right" }}>
                <StatusPill status={r.status} />
              </span>
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function ATStateError({ test }: { test: { name: string; steps: number } }) {
  return (
    <div className="at-card at-card-state" data-state="error" data-od-id="at-state-error">
      <div className="at-card-head">
        <div className="at-card-icon">
          <svg viewBox="0 0 16 16" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 2.5l6.5 11.5h-13z" />
            <path d="M8 7v3.5" />
            <circle cx="8" cy="12.5" r="0.6" fill="currentColor" />
          </svg>
        </div>
        <div className="at-card-body">
          <h3 className="at-card-title">
            Generation failed · 3 of {test.steps} steps unmapped
          </h3>
          <p className="at-card-sub">
            The model couldn't resolve a stable selector for{" "}
            <strong>step 9 (shipping address)</strong>,{" "}
            <strong>step 13 (3DS iframe)</strong>, or{" "}
            <strong>step 16 (confirmation webhook)</strong>. Edit the scenario,
            then regenerate.
          </p>
        </div>
      </div>
      <div className="at-error">
        <div className="at-error-head">
          <svg
            viewBox="0 0 16 16"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v3.5" />
            <circle cx="8" cy="11" r="0.6" fill="currentColor" />
          </svg>
          generation-error · j-7f3a
        </div>
        <div className="at-error-body">
          <ol className="err-list">
            <li className="err-line">
              <span className="err-ts">00:21</span>
              <span>
                <span className="err-loc">step 13</span> ambiguous selector
                for "Complete 3DS challenge" — 3 matches in{" "}
                <code>checkout.testid.tsx</code>
              </span>
            </li>
            <li className="err-line">
              <span className="err-ts">00:22</span>
              <span>
                <span className="err-loc">step 9</span> no testid found for
                "Fill shipping address" — fallback CSS used, but unstable
              </span>
            </li>
            <li className="err-line">
              <span className="err-ts">00:23</span>
              <span>
                <span className="err-loc">step 16</span> webhook path{" "}
                <code>confirmation-email-webhook</code> not registered in
                fixtures
              </span>
            </li>
          </ol>
          <div className="err-hint">
            <span className="err-hint-icon">!</span>
            <span>
              <b>Fix:</b> add a <code>data-testid</code> to the 3DS iframe
              wrapper + the shipping address input, then register a{" "}
              <code>confirmation-email-webhook</code> fixture. After editing,
              click <i>Regenerate</i>.
            </span>
          </div>
        </div>
      </div>
      <div className="at-card-actions">
        <button className="btn btn-primary" type="button" onClick={() => alert("Retry generation: not implemented in UI migration")}>
          <svg
            viewBox="0 0 16 16"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 8a5.5 5.5 0 0 1 9.7-3.5M13.5 8a5.5 5.5 0 0 1-9.7 3.5" />
            <path d="M11 2v3h-3M5 14v-3h3" />
          </svg>
          Retry generation
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => alert("Open steps to fix: not implemented in UI migration")}>
          Open steps to fix
        </button>
        <span className="at-card-meta" style={{ color: "var(--danger)" }}>
          <span className="dot" />failed · j-7f3a
        </span>
      </div>
    </div>
  );
}

export function TestDetailPage({ testId }: { testId: string }) {
  const test = TESTS.find((t) => t.id === testId) || TESTS[0];
  const project = getProject(test.project);
  const [status, setStatus] = useState("passing");
  const [tab, setTab] = useState<TabId>("overview");
  const [atState, setAtState] = useState<ATStateId>("success");

  // Sliding underline indicator. We measure each tab button and drive
  // the indicator's transform + width from React so the underline
  // interpolates between tabs instead of fading per tab.
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    overview: null,
    properties: null,
    automation: null,
  });
  const [indicator, setIndicator] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    if (!el) return;
    // Match the 8px inset from the previous per-tab ::after so the
    // indicator visually lines up with the old underline.
    setIndicator({ x: el.offsetLeft + 8, w: el.offsetWidth - 16 });
  }, [tab]);

  return (
    <div className="app-pane" id="pane-test-detail" data-od-id="pane-test-detail">
      <div className="page-head">
        <div className="page-head-text" style={{ width: "100%" }}>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/tests">Test Scenarios</Link>
            <span className="sep">›</span>
            <Link to="/tests">{project.label}</Link>
            <span className="sep">›</span>
            <span className="current">{test.name}</span>
          </nav>
          <div className="detail-title-row">
            <span className="detail-title pill-edit-host">{test.name}</span>
            <StatusMenu value={status} onChange={setStatus} />
            <div className="detail-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => alert("Edit: not implemented in UI migration")}
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
                >
                  <path d="M11.5 2.5l2 2L5 13l-3 1 1-3z" />
                </svg>
                Edit
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => alert("Run now: not implemented in UI migration")}
              >
                <PlayIcon />
                Run now
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-tabs" role="tablist" aria-label="Test scenario detail" data-od-id="detail-tabs">
        <span
          className={`detail-tab-indicator${indicator ? " is-ready" : ""}`}
          aria-hidden="true"
          style={
            indicator
              ? {
                  transform: `translateX(${indicator.x}px)`,
                  width: `${indicator.w}px`,
                }
              : undefined
          }
        />
        <button
          className={`detail-tab${tab === "overview" ? " is-active" : ""}`}
          role="tab"
          aria-selected={tab === "overview"}
          aria-controls="panel-overview"
          id="tab-overview"
          data-od-id="tab-overview"
          ref={(el) => {
            tabRefs.current.overview = el;
          }}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={`detail-tab${tab === "properties" ? " is-active" : ""}`}
          role="tab"
          aria-selected={tab === "properties"}
          aria-controls="panel-properties"
          id="tab-properties"
          data-od-id="tab-properties"
          ref={(el) => {
            tabRefs.current.properties = el;
          }}
          onClick={() => setTab("properties")}
        >
          Properties
        </button>
        <button
          className={`detail-tab${tab === "automation" ? " is-active" : ""}`}
          role="tab"
          aria-selected={tab === "automation"}
          aria-controls="panel-automation"
          id="tab-automation"
          data-od-id="tab-automation"
          ref={(el) => {
            tabRefs.current.automation = el;
          }}
          onClick={() => setTab("automation")}
        >
          Automation test
          <span
            className="detail-tab-badge"
            data-state={
              atState === "success"
                ? "generated"
                : atState === "running"
                  ? "running"
                  : atState === "error"
                    ? "error"
                    : "pending"
            }
            role="status"
            aria-label={AT_STATES.find((s) => s.id === atState)?.label}
            title={AT_STATES.find((s) => s.id === atState)?.label}
          />
        </button>
      </div>

      <div className="page-body">
        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div
            className="detail-tab-panel is-active"
            id="panel-overview"
            role="tabpanel"
            aria-labelledby="tab-overview"
            data-od-id="panel-overview"
          >
            <div className="detail-stats" data-od-id="detail-stats">
              <div className="stat">
                <div className="stat-label">Pass rate · 30d</div>
                <div className="stat-value">96.7%</div>
              </div>
              <div className="stat">
                <div className="stat-label">Last run</div>
                <div
                  className="stat-value"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    fontSize: 15,
                  }}
                >
                  {fmtRel(test.ranAt)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">Avg duration</div>
                <div className="stat-value">9.9s</div>
              </div>
              <div className="stat">
                <div className="stat-label">Total runs</div>
                <div className="stat-value">1,842</div>
              </div>
            </div>

            <section className="panel" data-od-id="detail-steps">
              <div className="scenario-prose" data-od-id="scenario-prose">
                <h2 id="scenario-overview">Overview</h2>
                <p>
                  End-to-end checkout against the production storefront on the{" "}
                  <code>main</code> branch. Verifies the Stripe USD happy path:
                  cart subtotal, promo application, shipping selection, 3DS
                  challenge, and post-order webhooks. Scheduled every 30
                  minutes.
                </p>

                <h2 id="scenario-preconditions">Preconditions</h2>
                <ul>
                  <li>
                    Stripe test mode is active and <code>WELCOME10</code> promo
                    is configured for <code>acme-storefront</code>.
                  </li>
                  <li>
                    The test fixture card <code>4242 4242 4242 4242</code>{" "}
                    triggers a 3DS challenge.
                  </li>
                  <li>
                    Webhook listener{" "}
                    <code>confirmation-email-webhook</code> is registered
                    against the test mailbox.
                  </li>
                </ul>

                <h2 id="scenario-flow">Flow</h2>
                <ol>
                  <li>
                    Open <code>https://acme-storefront.com/</code> and wait
                    for the document to load.
                  </li>
                  <li>
                    Search for <code>&quot;Acme Tee&quot;</code> and open the
                    first product detail page.
                  </li>
                  <li>
                    Select size <code>M</code>, color <code>black</code>, and
                    add the variant to the cart.
                  </li>
                  <li>
                    Open the cart drawer and assert the badge reads{" "}
                    <code>&quot;1&quot;</code>.
                  </li>
                  <li>
                    Apply promo code <code>WELCOME10</code> and confirm the
                    subtotal drops by 10%.
                  </li>
                  <li>
                    Begin checkout, fill the shipping address from the{" "}
                    <code>usAddress</code> fixture.
                  </li>
                  <li>
                    Choose <code>Standard</code> shipping and continue to
                    payment.
                  </li>
                  <li>
                    Enter card <code>4242 4242 4242 4242</code> and complete
                    the 3DS challenge.
                  </li>
                  <li>
                    Submit the order and assert the confirmation page renders
                    with order id <code>ord_…</code>.
                  </li>
                  <li>
                    Verify the <code>confirmation-email-webhook</code> fires
                    within 30 seconds.
                  </li>
                  <li>
                    Verify the order is persisted via the API and starts with{" "}
                    <code>ord_</code>.
                  </li>
                  <li>Cleanup — delete the test order via the admin endpoint.</li>
                </ol>

                <hr />

                <h2 id="scenario-assertions">Assertions</h2>
                <p>The scenario asserts on three surfaces:</p>
                <ul>
                  <li>
                    <b>DOM</b> — confirmation page URL matches{" "}
                    <code>/orders/ord_/</code>, cart badge equals{" "}
                    <code>&quot;1&quot;</code>.
                  </li>
                  <li>
                    <b>Webhook</b> — <code>confirmation-email-webhook</code>{" "}
                    receives a <code>200</code> within 30 seconds.
                  </li>
                  <li>
                    <b>API</b> — <code>{"GET /orders/{id}"}</code> returns{" "}
                    <code>200</code> with status <code>paid</code>.
                  </li>
                </ul>

                <h2 id="scenario-failure">Failure handling</h2>
                <p>
                  On any assertion failure the run is marked{" "}
                  <code>failing</code> and the offending step (DOM / webhook
                  / API) is highlighted in the run detail. Retry once on
                  transient webhook timeouts; surface a fix-it prompt when
                  selectors drift.
                </p>
              </div>
            </section>
          </div>
        )}

        {/* PROPERTIES TAB */}
        {tab === "properties" && (
          <div
            className="detail-tab-panel is-active"
            id="panel-properties"
            role="tabpanel"
            aria-labelledby="tab-properties"
            data-od-id="panel-properties"
          >
            <section className="panel" data-od-id="detail-properties">
              <div className="panel-head">
                <span className="panel-title">Properties</span>
              </div>
              <div className="kv-list">
                <div className="kv-row">
                  <div className="kv-key">Project</div>
                  <div className="kv-val">
                    <Link
                      className="kv-chip"
                      to="/tests"
                    >
                      <span
                        className="project-dot"
                        style={{ background: project.color }}
                      />
                      <span>{project.label}</span>
                    </Link>
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Environment</div>
                  <div className="kv-val">{project.environment}</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Branch</div>
                  <div
                    className="kv-val"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    {project.branch}
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Schedule</div>
                  <div className="kv-val">Every 30 min</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Owner</div>
                  <div className="kv-val">
                    <span className="kv-owner">
                      <span className="avatar">
                        {project.owner.initials}
                      </span>
                      {project.owner.name}
                    </span>
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Created</div>
                  <div
                    className="kv-val"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    {fmtDate(test.createdAt)}
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Last edited</div>
                  <div
                    className="kv-val"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    Aug 28, 2024
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Tags</div>
                  <div className="kv-val">
                    <span className="kv-tags">
                      <span className="kv-tag">
                        stripe
                        <span
                          className="kv-tag-x"
                          aria-label="Remove"
                        >
                          ×
                        </span>
                      </span>
                      <span className="kv-tag">
                        checkout
                        <span
                          className="kv-tag-x"
                          aria-label="Remove"
                        >
                          ×
                        </span>
                      </span>
                      <span className="kv-tag">
                        e2e
                        <span
                          className="kv-tag-x"
                          aria-label="Remove"
                        >
                          ×
                        </span>
                      </span>
                      <button className="kv-tag-add" type="button" aria-label="Add tag">
                        + tag
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* AUTOMATION TEST TAB */}
        {tab === "automation" && (
          <div
            className="detail-tab-panel is-active"
            id="panel-automation"
            role="tabpanel"
            aria-labelledby="tab-automation"
            data-od-id="panel-automation"
          >
            <div
              className="at-state-toggle"
              role="tablist"
              aria-label="Automation test state"
              data-od-id="at-state-toggle"
            >
              {AT_STATES.map((s) => (
                <button
                  key={s.id}
                  className={atState === s.id ? "is-active" : ""}
                  data-state-target={s.id}
                  role="tab"
                  aria-selected={atState === s.id}
                  onClick={() => setAtState(s.id)}
                >
                  <span className="dot" style={{ color: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>

            {atState === "empty" && <ATStateEmpty test={test} />}
            {atState === "running" && <ATStateRunning test={test} />}
            {atState === "success" && (
              <ATStateSuccess
                test={test}
                steps={STEPS_TEMPLATE.slice(0, test.steps)}
                recentRuns={RECENT_TEST_RUNS}
              />
            )}
            {atState === "error" && <ATStateError test={test} />}
          </div>
        )}

        {/* Recent runs panel — kept for the migration preview, on the
            Overview tab. The design moves this into the Automation test
            tab (success state) in the new version. */}
        {tab === "overview" && (
          <section className="panel" style={{ marginTop: 20 }} data-od-id="detail-runs">
            <div className="panel-head">
              <span className="panel-title">Recent runs</span>
              <span className="panel-meta">last 24h</span>
            </div>
            {RECENT_TEST_RUNS.slice(0, 4).map((run) => {
              const pillClass =
                run.status === "passed"
                  ? "pill pill-success"
                  : (run.status as string) === "failed"
                    ? "pill pill-danger"
                    : "pill pill-warn";
              const label =
                run.status === "passed"
                  ? "passed"
                  : (run.status as string) === "failed"
                    ? "failed"
                    : "flaky";
              return (
                <Link
                  key={run.id}
                  className="run-row"
                  to="/runs/$id" params={{ id: run.id }}
                  style={{ cursor: "pointer", textDecoration: "none" }}
                >
                  <span className="run-id">
                    <span className="commit-dot" />#{run.id} · {run.sha}
                  </span>
                  <span className="run-trigger">{run.trigger}</span>
                  <span className="run-when">{fmtRel(run.when)}</span>
                  <span style={{ textAlign: "right" }}>
                    <span className={pillClass} style={{ height: 20 }}>
                      <span className="swatch" />
                      {label}
                    </span>{" "}
                    <span
                      className="run-duration"
                      style={{ marginLeft: 8 }}
                    >
                      {run.duration}
                    </span>
                  </span>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
