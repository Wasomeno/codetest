import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  CircleAlert,
  CircleCheck,
  Code2,
  FlaskConical,
  ListOrdered,
  LoaderCircle,
  MousePointerClick,
  Play,
} from "lucide-react";
import {
  fmtDate,
  fmtRel,
  RECENT_TEST_RUNS,
} from "~/lib/mock-data-new";
import { useTestScenario } from "~/hooks/api/useTestScenarios";
import { useProjects } from "~/hooks/api/useProjects";
import { colorForName } from "~/lib/map-app-project";
import { testScenarioApi } from "~/api/test-scenario";
import type { TestCase, TestScenario, TestSection } from "~/types/test-scenario";

const PlayIcon = () => <Play size={12} strokeWidth={1.75} aria-hidden />;

const GENERATION_PIPELINE = [
  {
    id: "read",
    label: "Read steps",
    detail: "Parse each scenario step",
    Icon: ListOrdered,
  },
  {
    id: "map",
    label: "Map selectors",
    detail: "Prefer test IDs, then role/text",
    Icon: MousePointerClick,
  },
  {
    id: "emit",
    label: "Emit Playwright",
    detail: "Fixtures, assertions, ready to run",
    Icon: Code2,
  },
] as const;

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

function PriorityPill({ priority }: { priority?: string }) {
  if (!priority) return null;
  const p = priority.toLowerCase();
  let style: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: "11px",
    fontWeight: 500,
    height: "20px",
    padding: "0 7px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    textTransform: "capitalize",
    lineHeight: 1,
  };

  if (p === "critical") {
    style = {
      ...style,
      background: "oklch(96% 0.03 25)",
      border: "1px solid oklch(88% 0.06 25)",
      color: "var(--danger)",
    };
  } else if (p === "high") {
    style = {
      ...style,
      background: "oklch(97% 0.04 55)",
      border: "1px solid oklch(88% 0.08 55)",
      color: "oklch(55% 0.18 55)",
    };
  } else if (p === "medium") {
    style = {
      ...style,
      background: "oklch(97% 0.02 240)",
      border: "1px solid oklch(90% 0.05 240)",
      color: "oklch(50% 0.14 240)",
    };
  } else {
    style = {
      ...style,
      background: "oklch(97% 0.002 250)",
      border: "1px solid var(--border)",
      color: "var(--muted)",
    };
  }

  return (
    <span style={style}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "currentColor",
        }}
      />
      {priority}
    </span>
  );
}

function TypePill({ type }: { type?: string }) {
  if (!type) return null;
  const isPositive = type.toLowerCase() === "positive";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 500,
        height: "20px",
        padding: "0 7px",
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        background: isPositive ? "oklch(97% 0.02 150)" : "oklch(97% 0.02 25)",
        border: `1px solid ${isPositive ? "oklch(90% 0.05 150)" : "oklch(90% 0.05 25)"}`,
        color: isPositive ? "var(--success)" : "var(--danger)",
      }}
    >
      {type}
    </span>
  );
}

type IndexedCase = {
  key: string;
  section: TestSection;
  testCase: TestCase;
};

function flattenCases(sections: TestSection[] | undefined): IndexedCase[] {
  if (!sections?.length) return [];
  const out: IndexedCase[] = [];
  for (const section of sections) {
    for (const testCase of section.testCases ?? []) {
      out.push({
        key: testCase.id || `${section.id}-${testCase.order}`,
        section,
        testCase,
      });
    }
  }
  return out;
}

function AutomationCategoryPill({ category }: { category?: string | null }) {
  if (!category) return null;
  const cat = category.toUpperCase();
  const isE2E = category.toLowerCase() === "e2e";
  const isAPI = category.toLowerCase() === "api";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.04em",
        height: "20px",
        padding: "0 6px",
        borderRadius: "4px",
        display: "inline-flex",
        alignItems: "center",
        lineHeight: 1,
        background: isE2E
          ? "oklch(96% 0.03 290)"
          : isAPI
            ? "oklch(96% 0.03 230)"
            : "oklch(96% 0.005 250)",
        border: `1px solid ${
          isE2E
            ? "oklch(88% 0.06 290)"
            : isAPI
              ? "oklch(88% 0.06 230)"
              : "var(--border)"
        }`,
        color: isE2E
          ? "oklch(45% 0.16 290)"
          : isAPI
            ? "oklch(45% 0.15 230)"
            : "var(--muted)",
      }}
    >
      {cat}
    </span>
  );
}

function generatePlaywrightCode(scenario: TestScenario): string {
  const cases = scenario.sections?.flatMap((s) => s.testCases || []) || [];
  const lines: string[] = [
    `import { test, expect } from '@playwright/test';`,
    ``,
    `test.describe('${(scenario.title || "Test Scenario").replace(/'/g, "\\'")}', () => {`,
  ];

  if (scenario.authConfig?.baseUrl) {
    lines.push(`  test.beforeEach(async ({ page }) => {`);
    lines.push(`    await page.goto('${scenario.authConfig.baseUrl}');`);
    lines.push(`  });`);
    lines.push(``);
  }

  for (const tc of cases) {
    const title = tc.code ? `${tc.code}: ${tc.title}` : tc.title;
    lines.push(`  test('${title.replace(/'/g, "\\'")}', async ({ page }) => {`);

    if (tc.preCondition) {
      lines.push(`    // Precondition: ${tc.preCondition.replace(/\n/g, " ")}`);
    }

    if (tc.automationTest?.steps && tc.automationTest.steps.length > 0) {
      for (const st of tc.automationTest.steps) {
        if (st.description) {
          lines.push(`    // ${st.description}`);
        }
        if (st.action === "navigate" && st.url) {
          lines.push(`    await page.goto('${st.url}');`);
        } else if (st.action === "click" && st.selector) {
          lines.push(`    await page.locator('${st.selector}').click();`);
        } else if (st.action === "type" && st.selector) {
          lines.push(`    await page.locator('${st.selector}').fill('${(st.value || "").replace(/'/g, "\\'")}');`);
        } else if (st.action === "select" && st.selector) {
          lines.push(`    await page.locator('${st.selector}').selectOption('${(st.value || "").replace(/'/g, "\\'")}');`);
        } else if (st.action === "assert" && st.selector) {
          lines.push(`    await expect(page.locator('${st.selector}')).toBeVisible();`);
        } else {
          lines.push(`    // Step: ${st.action} on ${st.selector || "page"}`);
        }
      }
    } else if (tc.steps && tc.steps.length > 0) {
      for (const st of tc.steps) {
        lines.push(`    // Step ${st.order}: ${st.action}`);
        if (st.data) {
          lines.push(`    // Data: ${st.data}`);
        }
        lines.push(`    // Expected: ${st.expected}`);
        const actionLower = st.action.toLowerCase();
        if (actionLower.includes("navigate") || actionLower.includes("open") || actionLower.includes("go to")) {
          lines.push(`    await page.goto('/');`);
        } else if (actionLower.includes("click") || actionLower.includes("press") || actionLower.includes("tap")) {
          lines.push(`    await page.getByRole('button').click();`);
        } else if (actionLower.includes("enter") || actionLower.includes("type") || actionLower.includes("fill")) {
          lines.push(`    await page.getByRole('textbox').fill('${st.data ? st.data.replace(/'/g, "\\'") : "test"}');`);
        } else {
          lines.push(`    await expect(page).toHaveTitle(/.+/);`);
        }
      }
    } else {
      lines.push(`    await expect(page).toBeDefined();`);
    }

    lines.push(`  });`);
    lines.push(``);
  }

  lines.push(`});`);
  return lines.join("\n");
}

function ATStateEmpty({
  test,
  onGenerate,
  isGenerating,
}: {
  test: { name: string; steps: number };
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="at-stage" data-state="empty" data-od-id="at-state-empty">
      <div className="at-stage-mark" aria-hidden>
        <FlaskConical strokeWidth={1.6} />
      </div>
      <h3 className="at-stage-title">Generate automation from this scenario</h3>
      <p className="at-stage-sub">
        Turn <strong>{test.steps} scenario steps</strong> into a runnable
        Playwright suite — selectors, fixtures, and assertions included.
      </p>

      <ol className="at-pipeline" aria-label="Generation pipeline">
        {GENERATION_PIPELINE.map(({ id, label, detail, Icon }, index) => (
          <li key={id} className="at-pipeline-step">
            <span className="at-pipeline-icon">
              <Icon strokeWidth={1.6} aria-hidden />
            </span>
            <span className="at-pipeline-copy">
              <span className="at-pipeline-label">
                <span className="at-pipeline-num">{index + 1}</span>
                {label}
              </span>
              <span className="at-pipeline-detail">{detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="at-stage-cta">
        <button
          className="btn btn-primary at-stage-btn"
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <LoaderCircle className="at-spin" strokeWidth={1.75} aria-hidden />
          ) : (
            <Play strokeWidth={1.75} aria-hidden />
          )}
          {isGenerating ? "Enqueuing generation…" : "Generate Playwright test"}
        </button>
        <span className="at-stage-meta">est. 30–45s · Test ID preferred</span>
      </div>
    </div>
  );
}

function ATStateRunning({
  test,
  jobId,
  jobStatus,
  onDismiss,
}: {
  test: { name: string; steps: number };
  jobId?: string | null;
  jobStatus?: any;
  onDismiss?: () => void;
}) {
  const statusText = jobStatus?.status || "processing";
  const progressText = jobStatus?.caseCount
    ? `Processing ${jobStatus.caseCount} test cases`
    : `Mapping ${test.steps} scenario steps`;
  // Soft progress through the three pipeline stages while the job runs.
  const activeStep = 1;

  return (
    <div className="at-stage" data-state="running" data-od-id="at-state-running">
      <div className="at-stage-mark is-running" aria-hidden>
        <LoaderCircle className="at-spin" strokeWidth={1.6} />
      </div>
      <h3 className="at-stage-title">Generating Playwright test</h3>
      <p className="at-stage-sub">
        {progressText} — resolving selectors, binding fixtures, scaffolding
        assertions.
      </p>

      <div className="at-stage-status">
        <span>
          <b>{statusText}</b>
          {jobId ? ` · ${jobId.slice(0, 8)}` : ""}
        </span>
        <span className="at-stage-status-bar" aria-hidden>
          <span className="at-stage-status-fill" />
        </span>
      </div>

      <ol className="at-pipeline" aria-label="Generation progress">
        {GENERATION_PIPELINE.map(({ id, label, detail, Icon }, index) => {
          const state =
            index < activeStep ? "done" : index === activeStep ? "current" : "pending";
          return (
            <li key={id} className={`at-pipeline-step is-${state}`}>
              <span className="at-pipeline-icon">
                {state === "done" ? (
                  <CircleCheck strokeWidth={1.75} aria-hidden />
                ) : state === "current" ? (
                  <LoaderCircle className="at-spin" strokeWidth={1.75} aria-hidden />
                ) : (
                  <Icon strokeWidth={1.6} aria-hidden />
                )}
              </span>
              <span className="at-pipeline-copy">
                <span className="at-pipeline-label">{label}</span>
                <span className="at-pipeline-detail">{detail}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="at-stage-cta">
        {onDismiss && (
          <button className="btn btn-ghost" type="button" onClick={onDismiss}>
            Dismiss
          </button>
        )}
        <span className="at-stage-meta is-live">
          <span className="dot" />
          running
        </span>
      </div>
    </div>
  );
}

function ATStateSuccess({
  scenario,
  test,
  onRegenerate,
  isRegenerating,
  recentRuns,
}: {
  scenario: TestScenario;
  test: { name: string; steps: number };
  onRegenerate: () => void;
  isRegenerating: boolean;
  recentRuns: typeof RECENT_TEST_RUNS;
}) {
  const [activeTab, setActiveTab] = useState<"steps" | "code">("steps");
  const [copied, setCopied] = useState(false);

  const allTestCases = scenario.sections?.flatMap((s) => s.testCases || []) || [];
  const scriptName = `tests/${(scenario.title || "scenario").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.spec.ts`;
  const playwrightCode = generatePlaywrightCode(scenario);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(playwrightCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="at-card at-card-state" data-state="success" data-od-id="at-state-success">
      <div className="at-card-head">
        <div className="at-card-icon">
          <CircleCheck strokeWidth={1.75} aria-hidden />
        </div>
        <div className="at-card-body">
          <h3 className="at-card-title">Automation test generated</h3>
          <p className="at-card-sub">
            Playwright test suite for <strong>{scenario.title || test.name}</strong> ·{" "}
            <strong>{allTestCases.length}</strong> test cases ·{" "}
            <strong>{test.steps}</strong> steps mapped.
          </p>
        </div>
      </div>

      <div className="at-result">
        <div className="at-result-cell">
          <div className="at-result-key">Framework</div>
          <div className="at-result-val is-pass">Playwright</div>
        </div>
        <div className="at-result-cell">
          <div className="at-result-key">Test Cases Mapped</div>
          <div className="at-result-val">{allTestCases.length}</div>
        </div>
        <div className="at-result-cell">
          <div className="at-result-key">Selector Strategy</div>
          <div className="at-result-val" style={{ fontSize: 13 }}>
            Test ID preferred
          </div>
        </div>
        <div className="at-result-cell">
          <div className="at-result-key">Target Script</div>
          <div className="at-result-val" style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
            {scriptName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "16px", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
        <button
          type="button"
          className={`btn ${activeTab === "steps" ? "btn-secondary" : "btn-ghost"}`}
          style={{ height: 28, fontSize: 12, padding: "0 10px" }}
          onClick={() => setActiveTab("steps")}
        >
          Mapped Test Cases ({allTestCases.length})
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "code" ? "btn-secondary" : "btn-ghost"}`}
          style={{ height: 28, fontSize: 12, padding: "0 10px" }}
          onClick={() => setActiveTab("code")}
        >
          Generated Playwright Code
        </button>
      </div>

      {activeTab === "steps" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
          {allTestCases.map((tc, tcIdx) => (
            <div
              key={tc.id || tcIdx}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "oklch(99.5% 0.001 250)",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {tc.code && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "oklch(96% 0.005 250)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tc.code}
                    </span>
                  )}
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)" }}>
                    {tc.title}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    className="pill pill-success"
                    style={{ height: "20px", fontSize: "11px" }}
                  >
                    <span className="swatch" />
                    generated
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(tc.automationTest?.steps && tc.automationTest.steps.length > 0
                  ? tc.automationTest.steps.map((st, i) => ({
                      num: i + 1,
                      action: st.action,
                      name: st.description || `${st.action} ${st.selector || ""}`,
                      selector: st.selector,
                    }))
                  : (tc.steps || []).map((st, i) => ({
                      num: st.order || i + 1,
                      action: st.action,
                      name: st.action,
                      expected: st.expected,
                      selector: st.data ? `data: ${st.data}` : undefined,
                    }))
                ).map((s) => (
                  <div
                    key={s.num}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      background: "var(--surface)",
                      border: "1px solid oklch(95% 0.004 250)",
                      fontSize: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--muted)",
                        minWidth: "20px",
                      }}
                    >
                      {String(s.num).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "var(--accent-text)",
                        background: "oklch(96% 0.03 162 / 0.5)",
                        padding: "1px 5px",
                        borderRadius: "3px",
                      }}
                    >
                      {s.action}
                    </span>
                    <span style={{ color: "var(--fg)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                    </span>
                    {s.selector && (
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: "var(--muted)",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.selector}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "code" && (
        <div style={{ marginTop: "12px", position: "relative" }}>
          <div style={{ position: "absolute", top: "8px", right: "8px", zIndex: 2 }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: 26, fontSize: 11, padding: "0 8px" }}
              onClick={handleCopyCode}
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              padding: "14px 16px",
              borderRadius: "8px",
              background: "oklch(15% 0.02 250)",
              color: "oklch(92% 0.01 250)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              lineHeight: 1.6,
              overflowX: "auto",
              maxHeight: "450px",
            }}
          >
            <code>{playwrightCode}</code>
          </pre>
        </div>
      )}

      <div className="at-card-actions">
        <button
          className="btn btn-secondary"
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
        >
          {isRegenerating ? (
            <LoaderCircle className="at-spin" strokeWidth={1.75} aria-hidden />
          ) : (
            <FlaskConical strokeWidth={1.75} aria-hidden />
          )}
          {isRegenerating ? "Regenerating…" : "Regenerate"}
        </button>
        <span className="at-card-meta" style={{ color: "var(--success)" }}>
          <span className="dot" />generated · ready to run
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
        {recentRuns.map((r) => (
          <Link
            key={r.id}
            to="/runs/$id" params={{ id: r.id }}
            className="run-row"
            data-run-id={r.id}
            style={{ cursor: "pointer", textDecoration: "none" }}
          >
            <span className="run-id">
              <span
                className="commit-dot"
                style={{
                  background:
                    r.status === "passed"
                      ? "var(--success)"
                      : r.status === "flaky"
                        ? "var(--warn)"
                        : "var(--danger)",
                }}
              />
              #{r.id} · main · {r.trigger}
            </span>
            <span className="run-when">{fmtRel(r.when)}</span>
            <span className="run-duration">{r.duration}</span>
            <span style={{ textAlign: "right" }}>
              <StatusPill status={r.status} />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function ATStateError({
  errorMessage,
  onRetry,
  isRetrying,
}: {
  test: { name: string; steps: number };
  errorMessage?: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const displayMsg = errorMessage || "E2E generation timed out after 5m0s";

  return (
    <div className="at-card at-card-state" data-state="error" data-od-id="at-state-error">
      <div className="at-card-head">
        <div className="at-card-icon">
          <CircleAlert strokeWidth={1.75} aria-hidden />
        </div>
        <div className="at-card-body">
          <h3 className="at-card-title">
            Generation failed
          </h3>
          <p className="at-card-sub">
            The automation generation worker encountered an error while processing the scenario.
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
          generation-error
        </div>
        <div className="at-error-body">
          <div style={{ padding: "8px 0", fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--danger)", wordBreak: "break-word" }}>
            {displayMsg}
          </div>
          <div className="err-hint" style={{ marginTop: 8 }}>
            <span className="err-hint-icon">!</span>
            <span>
              <b>Fix:</b> Check backend worker logs and verify repository settings, then click <i>Retry generation</i>.
            </span>
          </div>
        </div>
      </div>
      <div className="at-card-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
        >
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
          {isRetrying ? "Retrying generation…" : "Retry generation"}
        </button>
        <span className="at-card-meta" style={{ color: "var(--danger)" }}>
          <span className="dot" />failed
        </span>
      </div>
    </div>
  );
}

export function TestDetailPage({ testId }: { testId: string }) {
  const scenarioQuery = useTestScenario(testId);
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];
  const scenario = scenarioQuery.data;

  const [status, setStatus] = useState("passing");
  const [tab, setTab] = useState<TabId>("overview");
  const reduceMotion = useReducedMotion();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCaseId(null);
  }, [testId]);

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
    setIndicator({ x: el.offsetLeft + 8, w: el.offsetWidth - 16 });
  }, [tab]);

  // Poll generation job if activeJobId is set
  useEffect(() => {
    if (!activeJobId || !isGenerating) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const job = await testScenarioApi.getGenerationJob(activeJobId);
        if (!isMounted) return;
        setJobStatus(job);

        if (job.status === "completed") {
          setIsGenerating(false);
          setActiveJobId(null);
          await scenarioQuery.refetch();
        } else if (job.status === "failed") {
          setIsGenerating(false);
          setActiveJobId(null);
          setGenerationError(job.error || "Generation job failed");
          await scenarioQuery.refetch();
        }
      } catch (err: any) {
        if (!isMounted) return;
        await scenarioQuery.refetch();
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeJobId, isGenerating, scenarioQuery]);

  if (scenarioQuery.isLoading) {
    return <StatePane title="Loading test scenario" message="Fetching scenario details from the backend…" />;
  }
  if (scenarioQuery.isError || !scenario) {
    return (
      <StatePane
        title="Couldn’t load test scenario"
        message={scenarioQuery.error instanceof Error ? scenarioQuery.error.message : "Scenario not found"}
      />
    );
  }

  const hasGeneratedSteps = scenario.sections?.some((s) =>
    s.testCases?.some(
      (tc) =>
        (tc.automationTest?.steps && tc.automationTest.steps.length > 0) ||
        tc.automationTest?.status === "pass" ||
        tc.automationStatus === "passed",
    ),
  ) ?? false;

  const atState: ATStateId = (() => {
    if (isGenerating || (scenario.automationStats?.runningCount ?? 0) > 0) {
      return "running";
    }
    if ((scenario.automationStats?.generatedCount ?? 0) > 0 || hasGeneratedSteps) {
      return "success";
    }
    if (
      generationError ||
      scenario.error ||
      ((scenario.automationStats?.failCount ?? 0) > 0 &&
        (scenario.automationStats?.generatedCount ?? 0) === 0)
    ) {
      return "error";
    }
    return "empty";
  })();

  const handleGenerateAutomations = async () => {
    try {
      setIsGenerating(true);
      setGenerationError(null);

      const res = await testScenarioApi.generateScenarioAutomations(
        scenario.id,
        scenario.projectId,
      );
      if (res.jobId) {
        setActiveJobId(res.jobId);
      }
      await scenarioQuery.refetch();
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationError(err.message || "Failed to start automation generation");
    }
  };

  const proj = projects.find((p) => p.id === scenario.projectId);
  const projectName = proj?.name || "Project";
  const projectColor = colorForName(projectName);
  const scenarioName = scenario.title || scenario.id;
  const totalSteps = scenario.sections?.reduce(
    (acc, sec) => acc + (sec.testCases?.reduce((tcAcc, tc) => tcAcc + (tc.steps?.length || 0), 0) || 0),
    0,
  ) || 0;
  const totalTestCases =
    scenario.sections?.reduce((acc, sec) => acc + (sec.testCases?.length || 0), 0) || 0;
  const allTags = Array.from(
    new Set(
      scenario.sections?.flatMap((s) => s.testCases?.flatMap((tc) => tc.tags || []) || []) || [],
    ),
  );
  const indexedCases = flattenCases(scenario.sections);
  const showSectionLabels =
    (scenario.sections?.length ?? 0) > 1 &&
    scenario.sections!.some((sec) => sec.title && sec.title !== scenario.title);
  const activeCase =
    indexedCases.find((item) => item.key === selectedCaseId) ?? indexedCases[0];
  const testObj = {
    name: scenarioName,
    steps: Math.max(totalSteps, 1),
    ranAt: scenario.updatedAt || scenario.createdAt,
    createdAt: scenario.createdAt,
  };

  return (
    <div
      className="app-pane"
      id="pane-test-detail"
      data-od-id="pane-test-detail"
      data-tab={tab}
    >
      <div className="page-head">
        <div className="page-head-text" style={{ width: "100%" }}>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/tests">Test Scenarios</Link>
            <span className="sep">›</span>
            <Link to="/tests">{projectName}</Link>
            <span className="sep">›</span>
            <span className="current">{scenarioName}</span>
          </nav>
          <div className="detail-title-row">
            <span className="detail-title pill-edit-host">{scenarioName}</span>
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
            {!activeCase ? (
              <section className="panel" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                <p style={{ margin: 0, fontSize: 14 }}>No test sections or steps parsed in this scenario.</p>
              </section>
            ) : (
              <div className="overview-inspector" data-od-id="overview-inspector">
                <nav className="overview-index" aria-label="Test cases">
                  <div className="overview-index-head">
                    <span className="overview-index-title">Cases</span>
                    <span className="overview-index-meta">
                      {totalTestCases} · {totalSteps} steps
                    </span>
                  </div>
                  {indexedCases.map((item, index) => {
                    const prev = indexedCases[index - 1];
                    const showSection =
                      showSectionLabels &&
                      item.section.title &&
                      item.section.title !== scenario.title &&
                      item.section.id !== prev?.section.id;
                    const isActive = item.key === activeCase.key;
                    return (
                      <div key={item.key}>
                        {showSection && (
                          <div className="overview-index-section">{item.section.title}</div>
                        )}
                        <button
                          type="button"
                          className={`overview-index-item${isActive ? " is-active" : ""}`}
                          aria-current={isActive ? "true" : undefined}
                          onClick={() => setSelectedCaseId(item.key)}
                        >
                          <span className="overview-index-code">
                            {item.testCase.code || String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="overview-index-name">{item.testCase.title}</span>
                        </button>
                      </div>
                    );
                  })}
                </nav>

                <article className="overview-doc">
                  {scenario.description && (
                    <p className="overview-desc">{scenario.description}</p>
                  )}

                  <header className="overview-case-head">
                    <div className="overview-case-identity">
                      {activeCase.testCase.code && (
                        <span className="overview-case-code">{activeCase.testCase.code}</span>
                      )}
                      <h2 className="overview-case-title">{activeCase.testCase.title}</h2>
                    </div>
                    <div className="overview-case-pills">
                      <PriorityPill priority={activeCase.testCase.priority} />
                      <TypePill type={activeCase.testCase.type} />
                      <AutomationCategoryPill
                        category={
                          activeCase.testCase.automationType ||
                          activeCase.testCase.automationTest?.category
                        }
                      />
                    </div>
                  </header>

                  {activeCase.testCase.preCondition && (
                    <div className="overview-before">
                      <span className="overview-label">Before</span>
                      <p className="overview-before-text">
                        {activeCase.testCase.preCondition.replace(/^-\s*/, "")}
                      </p>
                    </div>
                  )}

                  {activeCase.testCase.steps && activeCase.testCase.steps.length > 0 ? (
                    <div className="overview-steps">
                      <div className="overview-steps-head">
                        <span />
                        <span>Do</span>
                        <span>Expect</span>
                      </div>
                      {activeCase.testCase.steps.map((st, sIdx) => (
                        <div key={st.id || sIdx} className="overview-step">
                          <span className="overview-step-num">
                            {String(st.order || sIdx + 1).padStart(2, "0")}
                          </span>
                          <div className="overview-step-do">
                            {st.action}
                            {st.data ? (
                              <span className="overview-step-data">{st.data}</span>
                            ) : null}
                          </div>
                          <div className="overview-step-expect">{st.expected}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="overview-empty-steps">No steps in this case.</p>
                  )}
                </article>
              </div>
            )}
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
                        style={{ background: projectColor }}
                      />
                      <span>{projectName}</span>
                    </Link>
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Scenario ID</div>
                  <div
                    className="kv-val"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    {scenario.id}
                  </div>
                </div>
                {scenario.sourcePath && (
                  <div className="kv-row">
                    <div className="kv-key">Source Path</div>
                    <div
                      className="kv-val"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      {scenario.sourcePath}
                    </div>
                  </div>
                )}
                <div className="kv-row">
                  <div className="kv-key">Sections</div>
                  <div className="kv-val">{scenario.sections?.length || 0}</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Total Test Cases</div>
                  <div className="kv-val">{totalTestCases}</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Total Steps</div>
                  <div className="kv-val">{totalSteps}</div>
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
                    {fmtDate(scenario.createdAt)}
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Last updated</div>
                  <div
                    className="kv-val"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    {fmtDate(scenario.updatedAt || scenario.createdAt)}
                  </div>
                </div>
                {allTags.length > 0 && (
                  <div className="kv-row">
                    <div className="kv-key">Tags</div>
                    <div className="kv-val">
                      <span className="kv-tags">
                        {allTags.map((tag) => (
                          <span key={tag} className="kv-tag">
                            {tag}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                )}
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
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={atState}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)", transform: "translateY(6px)" }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, filter: "blur(2px)", transform: "translateY(-4px)" }}
                transition={{ duration: reduceMotion ? 0.01 : 0.22, ease: [0.23, 1, 0.32, 1] }}
              >
                {atState === "empty" && (
                  <ATStateEmpty
                    test={testObj}
                    onGenerate={handleGenerateAutomations}
                    isGenerating={isGenerating}
                  />
                )}
                {atState === "running" && (
                  <ATStateRunning
                    test={testObj}
                    jobId={activeJobId}
                    jobStatus={jobStatus}
                    onDismiss={() => {
                      setActiveJobId(null);
                      setIsGenerating(false);
                    }}
                  />
                )}
                {atState === "success" && (
                  <ATStateSuccess
                    scenario={scenario}
                    test={testObj}
                    onRegenerate={handleGenerateAutomations}
                    isRegenerating={isGenerating}
                    recentRuns={RECENT_TEST_RUNS}
                  />
                )}
                {atState === "error" && (
                  <ATStateError
                    test={testObj}
                    errorMessage={
                      generationError ||
                      scenario.error ||
                      scenario.sections?.flatMap((s) => s.testCases || []).find((tc) => tc.automationTest?.errorMessage)?.automationTest?.errorMessage
                    }
                    onRetry={handleGenerateAutomations}
                    isRetrying={isGenerating}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  );
}

function StatePane({ title, message }: { title: string; message: string }) {
  return (
    <div className="app-pane">
      <div className="page-head">
        <div className="page-head-text">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{message}</p>
        </div>
      </div>
    </div>
  );
}
