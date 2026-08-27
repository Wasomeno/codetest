import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  fmtRel,
  getProject,
  RECENT_TEST_RUNS,
  RUN_LOG,
  STEPS_TEMPLATE,
  TESTS,
} from "~/lib/mock-data-new";

function StepResultIcon({ status }: { status: "pass" | "fail" | "skip" }) {
  return (
    <span className="step-result-icon" data-status={status}>
      {status === "pass" && (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5l3 3 7-8" />
        </svg>
      )}
      {status === "fail" && (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      )}
      {status === "skip" && (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8h8" />
        </svg>
      )}
    </span>
  );
}

const STEP_RESULT_TIMES = [
  "1.2s", "0.4s", "0.8s", "0.2s", "0.3s", "0.4s", "0.6s", "0.5s",
  "1.1s", "0.3s", "0.4s", "0.9s", "1.8s", "0.6s", "0.7s", "0.4s",
  "0.5s", "0.3s",
];

const STEP_RESULT_NAMES = [
  "Open storefront homepage at /",
  "Search for \"Acme Tee\"",
  "Open product detail page",
  "Select size M, color black",
  "Add selected variant to cart",
  "Open cart drawer and verify line item",
  "Apply promo code WELCOME10",
  "Begin checkout — capture cart id",
  "Fill shipping address (Stripe test fixture)",
  "Select Standard shipping",
  "Continue to payment",
  "Enter Stripe test card 4242 4242 4242 4242",
  "Complete 3DS challenge",
  "Submit order",
  "Verify confirmation page renders",
  "Verify confirmation email webhook fires",
  "Verify order persisted in API (id starts with \"ord_\")",
  "Cleanup — delete test order",
];

const STEP_RESULT_ACTIONS = [
  "navigate", "fill + submit", "click", "select option", "click",
  "click + assert", "fill + submit", "click", "fill form", "click",
  "click", "fill input", "click (iframe)", "click", "assert",
  "assert webhook", "api assertion", "click",
];

export function RunDetailPage({ runId }: { runId: string }) {
  const run = RECENT_TEST_RUNS.find((r) => r.id === runId) || RECENT_TEST_RUNS[0];
  const test = TESTS[0]; // Show the checkout test as the canonical example
  const project = getProject(test.project);

  const [openStep, setOpenStep] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [replayStep, setReplayStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="app-pane" id="pane-run-detail" data-od-id="pane-run-detail">
      <div className="page-head">
        <div className="page-head-text" style={{ width: "100%" }}>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/tests">Tests</Link>
            <span className="sep">›</span>
            <Link to="/tests">{project.label}</Link>
            <span className="sep">›</span>
            <Link to="/tests/$id" params={{ id: test.id }}>{test.name}</Link>
            <span className="sep">›</span>
            <span className="current">Run #{run.id}</span>
          </nav>
          <div className="detail-title-row">
            <span className="detail-title">Run #{run.id}</span>
            <span
              className="pill pill-success"
              style={{ height: 22, padding: "0 10px", fontSize: 11 }}
            >
              <span className="swatch" />
              passed
            </span>
            <span className="run-title-meta">
              {fmtRel(run.when)} · {run.duration}
            </span>
            <div className="detail-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setModalOpen(true)}
              >
                <svg
                  viewBox="0 0 16 16"
                  width={12}
                  height={12}
                  fill="currentColor"
                >
                  <path d="M4 2.5v11l8-5.5z" />
                </svg>
                Re-run
              </button>
              <button
                className="btn btn-ghost"
                aria-label="More"
                style={{ padding: "0 8px" }}
              >
                <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor">
                  <circle cx="3" cy="8" r="1.4" />
                  <circle cx="8" cy="8" r="1.4" />
                  <circle cx="13" cy="8" r="1.4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-stats" data-od-id="run-stats">
          <div className="stat">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{run.duration}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Steps</div>
            <div className="stat-value">
              18<span className="stat-suffix"> · all passed</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Trigger</div>
            <div
              className="stat-value"
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 15,
              }}
            >
              {run.trigger === "manual" ? "Manual" : run.trigger === "schedule" ? "Schedule" : "Push"} · @eli.marsh
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Started</div>
            <div
              className="stat-value"
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 500,
                fontSize: 15,
              }}
            >
              {fmtRel(run.when)}
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-col-main">
            {/* Replay */}
            <section className="panel" data-od-id="run-replay">
              <div className="panel-head">
                <span className="panel-title">Replay</span>
                <span className="panel-meta">session recording · {run.duration} · 18 frames</span>
                <span className="replay-mode-tag" data-mode="success">
                  all passed
                </span>
              </div>
              <div className="replay-stage">
                <div className="replay-browser">
                  <div className="replay-chrome">
                    <span className="replay-traffic" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <div className="replay-address">https://acme-storefront.com/</div>
                    <span className="replay-frame-chip">
                      {String(replayStep).padStart(2, "0")} / 18
                    </span>
                  </div>
                  <div className="replay-screen">
                    <div className="replay-wf">
                      <div className="replay-wf-bar">
                        <span />
                        <span />
                        <span />
                      </div>
                      <div className="replay-wf-hero">
                        <div className="replay-wf-block replay-wf-block-lg" />
                        <div className="replay-wf-block" />
                        <div className="replay-wf-block" />
                      </div>
                      <div className="replay-wf-row">
                        <div className="replay-wf-block" />
                        <div className="replay-wf-block" />
                        <div className="replay-wf-block" />
                      </div>
                    </div>
                    <div className="replay-step-overlay">
                      <span className="replay-step-overlay-num">
                        {String(replayStep).padStart(2, "0")}
                      </span>
                      <span className="replay-step-overlay-name">
                        {STEPS_TEMPLATE[replayStep - 1]?.name || "Step"}
                      </span>
                      <span className="replay-step-overlay-loc">
                        {STEPS_TEMPLATE[replayStep - 1]?.apiTarget
                          ? `${STEPS_TEMPLATE[replayStep - 1].apiTarget?.method} ${STEPS_TEMPLATE[replayStep - 1].apiTarget?.path}`
                          : "page interaction"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="replay-controls">
                  <button
                    className="replay-play"
                    type="button"
                    aria-label="Play replay"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor">
                        <path d="M4 3h3v10H4zM9 3h3v10H9z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" width={14} height={14} fill="currentColor">
                        <path d="M4 2.5v11l8-5.5z" />
                      </svg>
                    )}
                  </button>
                  <div className="replay-time-display">
                    0:0{replayStep}.0 / 0:09.8
                  </div>
                  <div className="replay-scrub">
                    <div className="replay-scrub-track">
                      <div
                        className="replay-scrub-progress"
                        style={{ width: `${(replayStep / 18) * 100}%` }}
                      />
                      <div
                        className="replay-scrub-handle"
                        style={{ left: `${(replayStep / 18) * 100}%` }}
                      />
                      {[
                        { s: 1, left: 12.2, status: "pass" },
                        { s: 2, left: 16.3, status: "pass" },
                        { s: 3, left: 24.5, status: "pass" },
                        { s: 4, left: 26.5, status: "pass" },
                        { s: 5, left: 29.6, status: "pass" },
                        { s: 6, left: 33.7, status: "pass" },
                        { s: 7, left: 39.8, status: "pass" },
                        { s: 8, left: 44.9, status: "pass" },
                        { s: 9, left: 56.1, status: "pass" },
                        { s: 10, left: 59.2, status: "pass" },
                        { s: 11, left: 63.3, status: "pass" },
                        { s: 12, left: 72.4, status: "pass" },
                        { s: 13, left: 90.8, status: "pass" },
                        { s: 14, left: 96.9, status: "pass" },
                        { s: 18, left: 100, status: "pass" },
                      ].map((m) => (
                        <span
                          key={m.s}
                          className="replay-scrub-step"
                          data-step={m.s}
                          data-status={m.status}
                          style={{ left: `${m.left}%` }}
                          onClick={() => setReplayStep(m.s)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="replay-speed">
                    <button type="button" className="is-active">1×</button>
                    <button type="button">2×</button>
                    <button type="button">4×</button>
                  </div>
                  <button
                    className="replay-fs"
                    type="button"
                    aria-label="Fullscreen"
                  >
                    <svg viewBox="0 0 16 16" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>

            {/* Step results */}
            <section className="panel" data-od-id="run-steps">
              <div className="panel-head">
                <span className="panel-title">Step results</span>
                <span className="panel-meta">18 total · 18 passed</span>
                <span className="replay-mode-tag replay-mode-tag-sm" data-mode="success">
                  sync to replay
                </span>
              </div>
              <div className="steps-list">
                {STEP_RESULT_NAMES.map((name, i) => {
                  const num = i + 1;
                  return (
                    <div
                      key={num}
                      className={`step-row step-row-result${openStep === num ? " is-open" : ""}`}
                      onClick={() => setOpenStep(openStep === num ? null : num)}
                    >
                      <StepResultIcon status="pass" />
                      <span className="step-num">{String(num).padStart(2, "0")}</span>
                      <span className="step-action">{STEP_RESULT_ACTIONS[i]}</span>
                      <span className="step-name">{name}</span>
                      <span className="step-time">{STEP_RESULT_TIMES[i]}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Logs */}
            <section
              className="panel"
              style={{ marginTop: 20 }}
              data-od-id="run-logs"
            >
              <div className="panel-head">
                <span className="panel-title">Logs</span>
                <span className="panel-meta">{RUN_LOG.length} lines</span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  style={{ marginLeft: 12, height: 26, padding: "0 10px", fontSize: 12 }}
                  onClick={() => {
                    navigator.clipboard.writeText(
                      RUN_LOG.map((l) => `${l.ts} ${l.tag} ${l.msg}`).join("\n"),
                    );
                  }}
                >
                  Copy
                </button>
              </div>
              <div className="log-block">
                {RUN_LOG.map((line, idx) => (
                  <div className="log-line" key={idx}>
                    <span className="log-ts">{line.ts}</span>
                    <span className={`log-tag log-tag-${line.tag}`}>{line.tag}</span>
                    <span className="log-msg">{line.msg}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Artifacts */}
            <section
              className="panel"
              style={{ marginTop: 20 }}
              data-od-id="run-artifacts"
            >
              <div className="panel-head">
                <span className="panel-title">Artifacts</span>
                <span className="panel-meta">3 files</span>
              </div>
              <div className="artifact-list">
                <div className="artifact-row">
                  <span className="artifact-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
                      <circle cx="5.5" cy="7" r="1" />
                      <path d="M2.5 11l3-2.5 2 1.5 2.5-2 3.5 3" />
                    </svg>
                  </span>
                  <span className="artifact-name">checkout-confirmation.png</span>
                  <span className="artifact-meta">1440×900 · 184 KB</span>
                  <button className="btn btn-ghost artifact-action" type="button">
                    View
                  </button>
                </div>
                <div className="artifact-row">
                  <span className="artifact-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4z" />
                      <path d="M9 2v4h4" />
                    </svg>
                  </span>
                  <span className="artifact-name">session.har</span>
                  <span className="artifact-meta">HTTP archive · 12 KB</span>
                  <button className="btn btn-ghost artifact-action" type="button">
                    Download
                  </button>
                </div>
                <div className="artifact-row">
                  <span className="artifact-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4z" />
                      <path d="M9 2v4h4" />
                    </svg>
                  </span>
                  <span className="artifact-name">console.log</span>
                  <span className="artifact-meta">plain text · 4 KB</span>
                  <button className="btn btn-ghost artifact-action" type="button">
                    Download
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="detail-col-side">
            {/* Commit card */}
            <section className="panel" data-od-id="run-commit">
              <div className="panel-head">
                <span className="panel-title">Commit</span>
              </div>
              <div className="panel-body">
                <div className="commit-head">
                  <span className="avatar">EM</span>
                  <div className="commit-meta">
                    <span className="commit-author">Eli Marsh</span>
                    <span className="commit-when">just now · main</span>
                  </div>
                </div>
                <div className="commit-msg">
                  <span className="commit-sha">{run.sha}</span>
                  <span className="commit-subject">
                    test(checkout): add 3DS challenge to happy path
                  </span>
                </div>
                <div className="commit-foot">
                  <span className="commit-stat-add">+34</span>
                  <span className="commit-stat-del">−12</span>
                  <span>· 3 files changed</span>
                </div>
              </div>
            </section>

            {/* Environment */}
            <section className="panel" data-od-id="run-env" style={{ marginTop: 20 }}>
              <div className="panel-head">
                <span className="panel-title">Environment</span>
              </div>
              <div className="kv-list">
                <div className="kv-row">
                  <div className="kv-key">Runner</div>
                  <div className="kv-val">acme-runners · eu-west-1</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Browser</div>
                  <div className="kv-val">chromium 128 · 1440×900</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Target</div>
                  <div className="kv-val">staging.acme.io</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Node</div>
                  <div className="kv-val">v20.11.0</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Runner v</div>
                  <div className="kv-val">3.14.2</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Network</div>
                  <div className="kv-val">no throttle</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Re-run modal — 4-state flow: confirm → running → success | error */}
      {modalOpen && (
        <RerunModal
          testName={test.name}
          runId={run.id}
          projectLabel={project.label}
          commitSha={run.sha}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5l3 3 7-8" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
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
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

interface RerunModalProps {
  testName: string;
  runId: string;
  projectLabel: string;
  commitSha: string;
  onClose: () => void;
}

/**
 * 4-state re-run modal that mirrors the wireframe:
 *   1. confirm  — initial state, user reviews and clicks "Re-run now"
 *   2. running  — simulated progress, increments step counter
 *   3. success  — green check + checklist of what passed
 *   4. error    — red cross + the failing step + remaining skipped steps
 *
 * A "View state" chip strip at the bottom lets the user preview any
 * state without waiting for the simulated transition.
 */
function RerunModal({
  testName,
  runId,
  onClose,
}: RerunModalProps) {
  const [state, setState] = useState<"confirm" | "running" | "success" | "error">(
    "confirm",
  );
  const [trigger, setTrigger] = useState<"Manual" | "Schedule" | "Push">(
    "Manual",
  );
  const [step, setStep] = useState(0);
  const totalSteps = 18;
  const failureStep = 14;

  // Simulate progress when entering "running": advance the step every
  // 600ms until we reach either success (all 18) or error (step 14).
  useEffect(() => {
    if (state !== "running") return;
    setStep(0);
    const interval = setInterval(() => {
      setStep((s) => {
        const next = s + 1;
        if (next === failureStep) {
          clearInterval(interval);
          setState("error");
          return failureStep;
        }
        if (next >= totalSteps) {
          clearInterval(interval);
          setState("success");
          return totalSteps;
        }
        return next;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [state]);

  // Step label for the current step in the running state
  const currentStep = STEPS_TEMPLATE[Math.min(step, totalSteps - 1)];

  return (
    <div className="run-modal-overlay" onClick={onClose}>
      <div className="run-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="run-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            viewBox="0 0 16 16"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        {/* ===== CONFIRM ===== */}
        {state === "confirm" && (
          <div className="run-state run-state-confirm is-active">
            <div className="run-modal-head">
              <div className="run-modal-eyebrow">Re-run test</div>
              <h2 className="run-modal-title" id="run-modal-title">
                Run this test again?
              </h2>
            </div>
            <div className="run-modal-body">
              <p className="confirm-question">
                Re-run <code className="confirm-target">{testName}</code>
              </p>
              <p className="confirm-hint">
                A new run will be added to history. Previous results and logs are preserved.
              </p>
              <div className="confirm-meta">
                <div className="kv-row">
                  <div className="kv-key">Branch</div>
                  <div className="kv-val mono">main</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Environment</div>
                  <div className="kv-val mono">Chromium 128 · us-east-1</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Estimated time</div>
                  <div className="kv-val mono">~10 seconds</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Run as</div>
                  <div className="kv-val">
                    <span className="kv-owner">
                      <span className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>EM</span>
                      <span>@eli.marsh</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="run-modal-foot">
              <div className="run-modal-states">
                <span className="run-modal-states-label">Trigger</span>
                {(["Manual", "Schedule", "Push"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`run-state-chip${trigger === t ? " is-active" : ""}`}
                    onClick={() => setTrigger(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="run-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setState("running")}
                >
                  Re-run
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== RUNNING ===== */}
        {state === "running" && (
          <div className="run-state run-state-running is-active">
            <div className="run-modal-head">
              <div className="run-modal-eyebrow">
                <span className="pulse-dot" aria-hidden="true" />
                Running
              </div>
              <h2 className="run-modal-title">{testName}</h2>
            </div>
            <div className="run-modal-body">
              <div className="running-step-now">
                <div className="running-step-num">
                  Step {String(step).padStart(2, "0")} of {totalSteps}
                </div>
                <div className="running-step-desc">{currentStep.name}</div>
              </div>

              <div className="running-progress">
                <div className="running-progress-bar">
                  <div
                    className="running-progress-fill"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
                <div className="running-progress-meta">
                  <span className="running-progress-text">
                    {step} of {totalSteps} steps
                  </span>
                  <span className="running-progress-pct">
                    {Math.round((step / totalSteps) * 100)}%
                  </span>
                </div>
              </div>

              <div className="running-telemetry">
                <div className="running-telem-cell">
                  <div className="running-telem-key">Elapsed</div>
                  <div className="running-telem-val">
                    {(step * 0.55).toFixed(1)}s
                  </div>
                </div>
                <div className="running-telem-cell">
                  <div className="running-telem-key">Step time</div>
                  <div className="running-telem-val">0.5s</div>
                </div>
                <div className="running-telem-cell">
                  <div className="running-telem-key">ETA</div>
                  <div className="running-telem-val">
                    ~{((totalSteps - step) * 0.55).toFixed(1)}s
                  </div>
                </div>
              </div>

              <div className="running-log">
                {RUN_LOG.slice(0, Math.min(step + 1, 4)).map((l, i) => (
                  <div className="running-log-line" key={i}>
                    <span className="log-ts">{l.ts}</span>
                    <span className={`log-tag log-tag-${l.tag}`}>{l.tag}</span>
                    <span className="running-log-msg">{l.msg}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="run-modal-foot">
              <div className="run-modal-states">
                <span className="run-modal-states-label">View state</span>
                {(["confirm", "running", "success", "error"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      className={`run-state-chip${s === state ? " is-active" : ""}`}
                      onClick={() => setState(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <div className="run-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel run
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== SUCCESS ===== */}
        {state === "success" && (
          <div className="run-state run-state-success is-active">
            <div
              className="run-modal-head"
              style={{
                visibility: "hidden",
                height: 0,
                padding: 0,
                margin: 0,
                overflow: "hidden",
              }}
            />
            <div className="run-modal-body" style={{ paddingTop: 32 }}>
              <div className="result-summary">
                <div className="result-icon">
                  <CheckIcon />
                </div>
                <h2 className="result-title">Test passed</h2>
                <p className="result-detail">
                  All <strong>18 of 18</strong> steps completed in{" "}
                  <strong>9.8s</strong>
                  <br />
                  Run #{runId} · Triggered just now
                </p>
              </div>

              <div className="result-checks">
                <div className="result-check-row">
                  <CheckIcon />
                  <span className="result-check-text">
                    Cart, promo, shipping, and payment flow
                  </span>
                </div>
                <div className="result-check-row">
                  <CheckIcon />
                  <span className="result-check-text">
                    Stripe 3DS challenge authorized
                  </span>
                </div>
                <div className="result-check-row">
                  <CheckIcon />
                  <span className="result-check-text">
                    Confirmation webhook fired · 1/1 listener
                  </span>
                </div>
                <div className="result-check-row">
                  <CheckIcon />
                  <span className="result-check-text">
                    Order persisted ·{" "}
                    <code className="mono">id starts with "ord_"</code>
                  </span>
                </div>
              </div>
            </div>
            <div className="run-modal-foot">
              <div className="run-modal-states">
                <span className="run-modal-states-label">View state</span>
                {(["confirm", "running", "success", "error"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      className={`run-state-chip${s === state ? " is-active" : ""}`}
                      onClick={() => setState(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <div className="run-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Close
                </button>
                <button type="button" className="btn btn-success">
                  View run
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ERROR ===== */}
        {state === "error" && (
          <div className="run-state run-state-error is-active">
            <div
              className="run-modal-head"
              style={{
                visibility: "hidden",
                height: 0,
                padding: 0,
                margin: 0,
                overflow: "hidden",
              }}
            />
            <div className="run-modal-body" style={{ paddingTop: 32 }}>
              <div className="result-summary">
                <div className="result-icon">
                  <CrossIcon />
                </div>
                <h2 className="result-title">Run failed</h2>
                <p className="result-detail">
                  Step <strong>{failureStep}</strong> of {totalSteps} stopped the run
                  <br />
                  Run #{runId} · 9.2s before failure
                </p>
              </div>

              <div className="result-error-detail">
                <span className="mono-label">Error · step {failureStep}</span>
                <div>
                  <span className="error-loc">
                    click → [data-testid="submit-order"]
                  </span>
                </div>
                <div>Element not found. Timeout 4000ms.</div>
                <div className="error-hint">
                  Selector may have changed — verify on the live page.
                </div>
              </div>

              <div className="result-checks">
                {Array.from({ length: failureStep - 1 }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <div className="result-check-row" key={n}>
                      <CheckIcon />
                      <span className="result-check-text">Step {String(n).padStart(2, "0")} passed</span>
                    </div>
                  );
                })}
                <div className="result-check-row" style={{ color: "var(--danger)" }}>
                  <CrossIcon />
                  <span className="result-check-text">
                    Step {String(failureStep).padStart(2, "0")} · Submit order
                    <span className="error-detail">
                      Element not found · 4s timeout
                    </span>
                  </span>
                </div>
                <div
                  className="result-check-row"
                  style={{ color: "var(--muted)" }}
                >
                  <span
                    className="result-check-icon"
                    style={{
                      width: 14,
                      height: 14,
                      display: "inline-block",
                    }}
                  />
                  <span
                    className="result-check-text"
                    style={{ color: "var(--muted)" }}
                  >
                    Steps {String(failureStep + 1).padStart(2, "0")} – {totalSteps}{" "}
                    skipped (run aborted)
                  </span>
                </div>
              </div>
            </div>
            <div className="run-modal-foot">
              <div className="run-modal-states">
                <span className="run-modal-states-label">View state</span>
                {(["confirm", "running", "success", "error"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      className={`run-state-chip${s === state ? " is-active" : ""}`}
                      onClick={() => setState(s)}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ),
                )}
              </div>
              <div className="run-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setState("confirm")}
                >
                  Retry
                </button>
                <button type="button" className="btn btn-danger">
                  View run
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
