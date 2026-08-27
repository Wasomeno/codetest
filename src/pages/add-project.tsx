import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import type { GitLabProject } from "~/types/project";
import { useGitLabProjects } from "~/hooks/api/useGitLabProjects";
import { useCreateAppProject } from "~/hooks/api/useCreateAppProject";
import { getProjectBranches } from "~/api/project";

/**
 * Shape the dropdown needs. We map `GitLabProject` from the API to
 * this — keeps the dropdown component decoupled from the GitLab
 * schema and lets us add the inferred `lang` column.
 */
export interface RepoOption {
  id: number;
  label: string;
  defaultBranch: string;
  lang: string;
}

/** Best-effort language inference from the GitLab project. */
function inferLanguage(p: GitLabProject): string {
  if (p.topics && p.topics.length > 0) return p.topics[0];
  return 'Repository';
}

/** Map a `GitLabProject` from the API to a `RepoOption`. */
export function toRepoOption(p: GitLabProject): RepoOption {
  return {
    id: p.id,
    label: p.path_with_namespace || p.name,
    defaultBranch: p.default_branch || 'main',
    lang: inferLanguage(p),
  };
}

/** Hook around `useGitLabProjects` that also exposes the search input. */
function useRepoSearch() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // 250ms debounce — fast enough to feel live, slow enough to avoid
  // hammering the GitLab API on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const query = useGitLabProjects(debounced || undefined);

  const items: RepoOption[] = useMemo(
    () => (query.data ?? []).map(toRepoOption),
    [query.data],
  );

  return {
    search,
    setSearch,
    items,
    isLoading: query.isPending || query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}

type RepoKey = 'frontend' | 'backend' | 'specs' | 'issues';

function Dropdown({
  name,
  placeholder,
  items,
  value,
  onChange,
  search,
  onSearchChange,
  isLoading,
  emptyMessage,
}: {
  name: RepoKey;
  placeholder: string;
  items: RepoOption[];
  /** The currently selected repo id (as a number-string from the form state). */
  value: string;
  onChange: (id: string) => void;
  search?: string;
  onSearchChange?: (v: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const selected = items.find((r) => String(r.id) === value);

  return (
    <div
      className={`dropdown${open ? " is-open" : ""}`}
      data-dropdown
      data-name={name}
    >
      <button
        type="button"
        className="dropdown-trigger"
        data-dropdown-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open) setHighlight(0);
        }}
      >
        <span className={`dropdown-value${selected ? "" : " is-placeholder"}`}>
          {selected
            ? `${selected.label} · ${selected.defaultBranch}`
            : placeholder}
        </span>
        <svg
          className="dropdown-chev"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="dropdown-menu"
            role="listbox"
            aria-label={placeholder}
            initial={{ opacity: 0, scale: 0.98, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -2,
              transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] },
            }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {onSearchChange !== undefined && (
              <li className="dropdown-search" role="presentation">
                <input
                  type="search"
                  className="dropdown-search-input"
                  placeholder="Search repositories…"
                  value={search ?? ''}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    setHighlight(0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  aria-label={`Search ${name} repositories`}
                />
              </li>
            )}
            {isLoading && items.length === 0 ? (
              <li className="dropdown-empty" role="option" aria-disabled="true">
                Loading repositories…
              </li>
            ) : !isLoading && items.length === 0 ? (
              <li className="dropdown-empty" role="option" aria-disabled="true">
                {emptyMessage ?? 'No repositories found.'}
              </li>
            ) : (
              items.map((repo, i) => (
                <li
                  key={repo.id}
                  className={`dropdown-option${i === highlight ? " is-highlighted" : ""}${
                    String(repo.id) === value ? " is-selected" : ""
                  }`}
                  role="option"
                  data-index={i}
                  data-id={repo.id}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onChange(String(repo.id));
                    setOpen(false);
                  }}
                >
                  <span className="dropdown-option-label">{repo.label}</span>
                  <span className="dropdown-option-meta">
                    {repo.defaultBranch} · {repo.lang}
                  </span>
                </li>
              ))
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------
   Pipeline model — 4 ordered steps for the create-project flow.
   The numbers are stable so the creating + error variants can refer
   to the same step indices without string-keyed lookups.
------------------------------------------------------------------ */
type StepId = "resolve" | "branches" | "webhooks" | "access";
const STEPS: { id: StepId; label: string }[] = [
  { id: "resolve", label: "Resolve repos" },
  { id: "branches", label: "Verify branches" },
  // Educational checklist only — no backend webhook APIs yet.
  { id: "webhooks", label: "Review checklist" },
  { id: "access", label: "Create project" },
];

type CreateView = "form" | "creating" | "success" | "error";

export function AddProjectPage() {
  const navigate = useNavigate();
  const createMutation = useCreateAppProject();

  // Four independent searches — each dropdown can be filtered
  // separately, which matters because a user might want to grep for
  // "billing" in the backend picker while leaving the frontend
  // picker untouched.
  const frontendSearch = useRepoSearch();
  const backendSearch = useRepoSearch();
  const specsSearch = useRepoSearch();
  const issuesSearch = useRepoSearch();

  /* ---- form state ---- */
  const [name, setName] = useState("");
  const [frontend, setFrontend] = useState("");
  const [backend, setBackend] = useState("");
  const [issues, setIssues] = useState("");
  const [specs, setSpecs] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    visible: boolean;
  }>({ type: "success", visible: false });
  const [submitting, setSubmitting] = useState(false);

  /* ---- state-machine state for the create-project flow ----
     The single panel hosts every state — the form, the creating
     progress card, the success card, and the error card. They swap
     based on `view`, with transitions driven by the React Query
     mutation lifecycle and explicit user actions (cancel / retry /
     add-another). No preview UI is exposed. */
  const [view, setView] = useState<CreateView>("form");
  // activeStep:
  //   0 = pre-flight (only seen during the very first frame of creating)
  //   1..4 = which step is currently active (previous steps are is-done)
  // Defaults to 2 so a real submission shows the segmenter mid-progress
  // (one step done, one active) on the first paint of the creating card.
  const [activeStep, setActiveStep] = useState(2);
  const [failedStep, setFailedStep] = useState<StepId | null>(null);
  const [copied, setCopied] = useState(false);
  // Track the freshly-created project so the success card can deep-link
  // to it. Set in onSuccess.
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [createdScenariosImported, setCreatedScenariosImported] = useState<
    number | undefined
  >(undefined);
  const [mutationError, setMutationError] = useState<string | null>(null);

  /* ---- flow handlers ----
     backToForm:      cancel mid-flight OR back out of a terminal state.
                      Preserves the form so the user keeps what they typed.
     resetForAnother: drop every field and start a fresh draft after a
                      successful creation. */
  const backToForm = () => {
    setFailedStep(null);
    setActiveStep(2);
    setSubmitting(false);
    setBanner({ type: "success", visible: false });
    setMutationError(null);
    setView("form");
  };
  const resetForAnother = () => {
    backToForm();
    setName("");
    setFrontend("");
    setBackend("");
    setSpecs("");
    setIssues("");
    setNotes("");
    setErrors({});
    setCreatedProjectId(null);
    setCreatedScenariosImported(undefined);
    setCopied(false);
  };

  /* ---- submit drives form → creating → success | error ---- */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, boolean> = {};
    if (!name.trim()) newErrors.name = true;
    if (!frontend) newErrors.frontend = true;
    if (!backend) newErrors.backend = true;
    if (!specs) newErrors.specs = true;
    if (!issues) newErrors.issues = true;
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setBanner({ type: "error", visible: true });
      return;
    }

    setSubmitting(true);
    setView("creating");
    setFailedStep(null);
    setActiveStep(1);
    setMutationError(null);

    try {
      const selectedRepos: Array<{ id: string; label: string }> = [
        { id: frontend, label: "frontend" },
        { id: backend, label: "backend" },
        { id: specs, label: "specs" },
        { id: issues, label: "issues" },
      ];
      const branchResponses = await Promise.all(
        selectedRepos.map(async (repo) => {
          const response = await getProjectBranches(repo.id);
          return { repo, response };
        }),
      );

      for (const { repo, response } of branchResponses) {
        if (!response.success) {
          throw new Error(
            `Could not verify branches on the ${repo.label} repo (#${repo.id}): ${
              response.error || "request failed"
            }`,
          );
        }
        const branches = response.data?.branches ?? [];
        if (branches.length === 0) {
          throw new Error(
            `The ${repo.label} repo (#${repo.id}) has no branches to verify.`,
          );
        }
      }
      setActiveStep(2);
    } catch (error: any) {
      setSubmitting(false);
      setView("error");
      setBanner({ type: "error", visible: true });
      setMutationError(error?.message || "Repository branch verification failed");
      setFailedStep("branches");
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        description: notes.trim() || undefined,
        testContextMarkdown: notes.trim() || undefined,
        issueRepoId: Number(issues),
        specsRepoId: Number(specs),
        backendRepoId: Number(backend),
        frontendRepoId: Number(frontend),
      },
      {
        onSuccess: (result: any) => {
          setSubmitting(false);
          setView("success");
          setBanner({ type: "success", visible: true });
          const projectId = result?.project?.id;
          if (projectId) {
            setCreatedProjectId(projectId);
            setCreatedScenariosImported(result?.scenariosImported);
          }
        },
        onError: (err) => {
          setSubmitting(false);
          setView("error");
          setBanner({ type: "error", visible: true });
          setMutationError(err?.message || "Project creation failed");
          // Create itself failed after branch verify — not the educational webhooks step.
          setFailedStep("access");
        },
      },
    );
  };

  /* ---- selected-repo lookups (consumed by the state cards) ---- */
  const frontendRepo =
    frontendSearch.items.find((r) => String(r.id) === frontend) ??
    // The dropdown is collapsed — the user picked a repo but its
    // list is no longer loaded. Fall back to a synthesized option
    // so the "creating" card can still display the chosen repos.
    (frontend
      ? {
          id: Number(frontend),
          label: `repo #${frontend}`,
          defaultBranch: 'main',
          lang: 'Repository',
        }
      : undefined);
  const backendRepo =
    backendSearch.items.find((r) => String(r.id) === backend) ??
    (backend
      ? { id: Number(backend), label: `repo #${backend}`, defaultBranch: 'main', lang: 'Repository' }
      : undefined);
  const specsRepo =
    specsSearch.items.find((r) => String(r.id) === specs) ??
    (specs
      ? { id: Number(specs), label: `repo #${specs}`, defaultBranch: 'main', lang: 'Repository' }
      : undefined);
  const issuesRepo =
    issuesSearch.items.find((r) => String(r.id) === issues) ??
    (issues
      ? { id: Number(issues), label: `repo #${issues}`, defaultBranch: 'main', lang: 'Repository' }
      : undefined);
  const projectName = name.trim() || "your project";
  const defaultBranch = frontendRepo?.defaultBranch ?? "main";

  /* Progress-bar fill for the creating state. We don't animate to a
     target; each step transition bumps the value, and the bar's
     CSS transition (700ms cubic-bezier) handles the motion. Floor at
     8% so the bar looks like it has already started by the time the
     first step becomes active. */
  const progressWidth = (() => {
    if (view !== "creating") return 0;
    const filled = activeStep * 25;
    return Math.max(8, Math.min(100, filled - 12));
  })();

  return (
    <div className="app-pane" id="pane-add-project" data-od-id="pane-add-project">
      <div className="page-head">
        <div className="page-head-text">
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              marginBottom: 6,
            }}
          >
            <Link to="/" style={{ color: "var(--muted)" }}>
              Projects
            </Link>
            <span style={{ margin: "0 6px", opacity: 0.5 }}>/</span>
            <span style={{ color: "var(--fg)" }}>New project</span>
          </div>
          <h1 className="page-title">Add project</h1>
          <p className="page-subtitle">
            Connect a new project by pointing at its frontend, backend, and specs repositories.
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="form-wrap">
          <div
            className={`form-banner is-${banner.type}${banner.visible ? " is-visible" : ""}`}
            role="status"
            aria-live="polite"
            data-od-id="add-project-banner"
          >
            <svg
              className="banner-icon"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {banner.type === "success" ? (
                <path d="M3 8l3.5 3.5L13 5" />
              ) : (
                <>
                  <path d="M4 4l8 8" />
                  <path d="M12 4l-8 8" />
                </>
              )}
            </svg>
            <div>
              <span className="banner-title">
                {banner.type === "success" ? "Project created" : "Some fields need attention"}
              </span>
              <span className="banner-msg">
                {banner.type === "success"
                  ? "The project has been added and is ready to receive specs and runs."
                  : "Fill in the required fields below and try again."}
              </span>
            </div>
          </div>

          {/* Single integrated panel — the form swaps in-place for the
              creating / success / error state cards based on `view`. No
              preview tabs; transitions are driven by the submit handler
              and explicit user actions (cancel, retry, add another). */}
          <section className="panel" data-od-id="add-project-form-panel">
            <div className={`panel-body${view !== "form" ? " cp-panel-body" : ""}`}>
              <div className="cp-states" data-od-id="add-project-states">
                {view === "form" && (
                  <div className="is-active">
                    <form
                      id="add-project-form"
                      className="form"
                      noValidate
                      onSubmit={submit}
                      data-od-id="add-project-form"
                      autoComplete="off"
                    >
                      <div className="form-row" data-od-id="row-name">
                        <label className="form-label" htmlFor="ap-name">
                          Project name <span className="req" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="ap-name"
                          className="input"
                          type="text"
                          name="name"
                          placeholder="e.g. checkout-web"
                          maxLength={64}
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors({ ...errors, name: false });
                          }}
                          required
                          style={errors.name ? { borderColor: "var(--danger)" } : {}}
                        />
                        {errors.name && (
                          <div className="form-error" style={{ display: "block" }}>
                            Project name is required and must be 64 characters or fewer.
                          </div>
                        )}
                      </div>

                      <div className="form-row" data-od-id="row-frontend">
                        <label className="form-label" htmlFor="ap-frontend-trigger">
                          Frontend repository <span className="req" aria-hidden="true">*</span>
                        </label>
                        <Dropdown
                          name="frontend"
                          placeholder="Select a frontend repository…"
                          items={frontendSearch.items}
                          value={frontend}
                          search={frontendSearch.search}
                          onSearchChange={frontendSearch.setSearch}
                          isLoading={frontendSearch.isLoading}
                          emptyMessage="No GitLab projects found."
                          onChange={(v) => {
                            setFrontend(v);
                            if (errors.frontend) setErrors({ ...errors, frontend: false });
                          }}
                        />
                        {frontendSearch.isError ? (
                          <div className="form-error" style={{ display: "block" }}>
                            Couldn't load GitLab projects — {String((frontendSearch.error as Error)?.message || frontendSearch.error)}
                          </div>
                        ) : (
                          <div className="form-help">Pulled from the GitLab repos you have access to.</div>
                        )}
                        {errors.frontend && (
                          <div className="form-error" style={{ display: "block" }}>
                            Pick a frontend repository.
                          </div>
                        )}
                      </div>

                      <div className="form-row" data-od-id="row-backend">
                        <label className="form-label" htmlFor="ap-backend-trigger">
                          Backend repository <span className="req" aria-hidden="true">*</span>
                        </label>
                        <Dropdown
                          name="backend"
                          placeholder="Select a backend repository…"
                          items={backendSearch.items}
                          value={backend}
                          search={backendSearch.search}
                          onSearchChange={backendSearch.setSearch}
                          isLoading={backendSearch.isLoading}
                          emptyMessage="No GitLab projects found."
                          onChange={(v) => {
                            setBackend(v);
                            if (errors.backend) setErrors({ ...errors, backend: false });
                          }}
                        />
                        {backendSearch.isError ? (
                          <div className="form-error" style={{ display: "block" }}>
                            Couldn't load GitLab projects — {String((backendSearch.error as Error)?.message || backendSearch.error)}
                          </div>
                        ) : (
                          <div className="form-help">The service this project's frontend talks to.</div>
                        )}
                        {errors.backend && (
                          <div className="form-error" style={{ display: "block" }}>
                            Pick a backend repository.
                          </div>
                        )}
                      </div>

                      <div className="form-row" data-od-id="row-specs">
                        <label className="form-label" htmlFor="ap-specs-trigger">
                          Specs repository <span className="req" aria-hidden="true">*</span>
                        </label>
                        <Dropdown
                          name="specs"
                          placeholder="Select a specs repository…"
                          items={specsSearch.items}
                          value={specs}
                          search={specsSearch.search}
                          onSearchChange={specsSearch.setSearch}
                          isLoading={specsSearch.isLoading}
                          emptyMessage="No GitLab projects found."
                          onChange={(v) => {
                            setSpecs(v);
                            if (errors.specs) setErrors({ ...errors, specs: false });
                          }}
                        />
                        {specsSearch.isError ? (
                          <div className="form-error" style={{ display: "block" }}>
                            Couldn't load GitLab projects — {String((specsSearch.error as Error)?.message || specsSearch.error)}
                          </div>
                        ) : (
                          <div className="form-help">Where your Gherkin / spec files live.</div>
                        )}
                        {errors.specs && (
                          <div className="form-error" style={{ display: "block" }}>
                            Pick a specs repository.
                          </div>
                        )}
                      </div>

                      <div className="form-row" data-od-id="row-issues">
                        <label className="form-label" htmlFor="ap-issues-trigger">
                          Issues repository <span className="req" aria-hidden="true">*</span>
                        </label>
                        <Dropdown
                          name="issues"
                          placeholder="Select the repo where issues will be created…"
                          items={issuesSearch.items}
                          value={issues}
                          search={issuesSearch.search}
                          onSearchChange={issuesSearch.setSearch}
                          isLoading={issuesSearch.isLoading}
                          emptyMessage="No GitLab projects found."
                          onChange={(v) => {
                            setIssues(v);
                            if (errors.issues) setErrors({ ...errors, issues: false });
                          }}
                        />
                        {issuesSearch.isError ? (
                          <div className="form-error" style={{ display: "block" }}>
                            Couldn't load GitLab projects — {String((issuesSearch.error as Error)?.message || issuesSearch.error)}
                          </div>
                        ) : (
                          <div className="form-help">Where new GitLab issues will be filed (often the same as the specs repo).</div>
                        )}
                        {errors.issues && (
                          <div className="form-error" style={{ display: "block" }}>
                            Pick an issues repository.
                          </div>
                        )}
                      </div>

                      <div className="form-row" data-od-id="row-notes">
                        <label className="form-label" htmlFor="ap-notes">
                          Additional information
                        </label>
                        <textarea
                          id="ap-notes"
                          className="textarea"
                          name="notes"
                          rows={5}
                          placeholder="Anything else we should know — default branches, environments, CI caveats, owners…"
                          maxLength={1000}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                        <div className="form-help">
                          Optional. Visible to anyone with access to this project.
                        </div>
                      </div>

                      <div
                        className="form-row is-inline"
                        style={{ justifyContent: "flex-end", gap: 10, marginTop: 4 }}
                      >
                        <Link className="btn btn-secondary" to="/" data-od-id="add-project-cancel-2">
                          Cancel
                        </Link>
                        <button
                          id="ap-submit"
                          className="btn btn-primary"
                          type="submit"
                          data-od-id="add-project-submit"
                          disabled={submitting}
                        >
                          <span className="btn-spinner" aria-hidden="true" />
                          <span data-submit-label>
                            {submitting ? "Creating…" : "Create project"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {view === "creating" && (
                  <CreatingCard
                    projectName={projectName}
                    defaultBranch={defaultBranch}
                    frontendRepoLabel={frontendRepo?.label ?? ""}
                    backendRepoLabel={backendRepo?.label ?? ""}
                    specsRepoLabel={specsRepo?.label ?? ""}
                    issuesRepoLabel={issuesRepo?.label ?? ""}
                    activeStep={activeStep}
                    progressWidth={progressWidth}
                    onCancel={backToForm}
                  />
                )}

                {view === "success" && (
                  <SuccessCard
                    projectName={projectName}
                    defaultBranch={defaultBranch}
                    reposCount={4}
                    specCount={createdScenariosImported ?? 0}
                    onView={() => {
                      if (createdProjectId) {
                        navigate({
                          to: '/projects/$id',
                          params: { id: createdProjectId },
                        })
                      } else {
                        navigate({ to: "/projects" })
                      }
                    }}
                    onAnother={resetForAnother}
                  />
                )}

                {view === "error" && (
                  <ErrorCard
                    projectName={projectName}
                    failedStepId={failedStep ?? "access"}
                    activeStepAtFailure={activeStep}
                    error={{
                      stepId: (failedStep ?? "access") as StepId,
                      message:
                        mutationError ?? "Project creation failed.",
                      log:
                        failedStep === "branches"
                          ? `Branch verification failed.

${mutationError ?? "Unknown error."}`
                          : `Failed to create project via POST /api/projects.

${mutationError ?? "Unknown error."}`,
                    }}
                    copied={copied}
                    onRetry={() => {
                      setCopied(false)
                      // Resubmit with the same form values.
                      submit({
                        preventDefault: () => {},
                      } as React.FormEvent)
                    }}
                    onCancel={backToForm}
                    onCopy={async () => {
                      try {
                        await navigator.clipboard?.writeText(
                          `Failed to create project: ${mutationError ?? "Unknown error"}`,
                        )
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1500)
                      } catch {
                        /* silent: clipboard unavailable in some contexts */
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Helper components for the three state layouts.
   Kept as local components (not extracted to /components) because
   they consume AddProjectPage-specific types and would only clutter
   the component tree.
------------------------------------------------------------------ */

function StepSegmenter({
  activeStep,
  failedStepId,
}: {
  activeStep: number;
  failedStepId?: StepId | null;
}) {
  // Steps before `activeStep` are done, the step at `activeStep` is
  // active (unless failed), and failedStepId takes priority if set.
  return (
    <ol className="cp-segments" data-stagger="3" aria-label="Creation steps">
      {STEPS.map((step, i) => {
        const stepIndex = i + 1;
        const isDone = stepIndex < activeStep && (!failedStepId || STEPS[i].id !== failedStepId);
        const isFailed = failedStepId === step.id;
        const isActive = !isFailed && stepIndex === activeStep;
        const cls = [
          "seg",
          isDone && "is-done",
          isActive && "is-active",
          isFailed && "is-failed",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <li key={step.id} className={cls}>
            <span className="seg-dot" aria-hidden="true">
              {isDone && (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8.5l3 3 5-6" />
                </svg>
              )}
              {isActive && <span className="seg-spin" />}
              {isFailed && <span className="seg-x" aria-hidden="true">!</span>}
            </span>
            <span className="seg-label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function AlertGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 5v3.5" />
      <path d="M8 11v.5" />
    </svg>
  );
}

function CreatingCard({
  projectName,
  defaultBranch,
  frontendRepoLabel,
  backendRepoLabel,
  specsRepoLabel,
  issuesRepoLabel,
  activeStep,
  progressWidth,
  onCancel,
}: {
  projectName: string;
  defaultBranch: string;
  frontendRepoLabel: string;
  backendRepoLabel: string;
  specsRepoLabel: string;
  issuesRepoLabel: string;
  activeStep: number;
  progressWidth: number;
  onCancel: () => void;
}) {
  // Active step's label feeds the live "currently doing X" line so the
  // user gets a concrete read on the system state, not just a spinner.
  const activeLabel = STEPS[Math.max(0, activeStep - 1)]?.label ?? "Starting";
  return (
    <div className="cp-state is-active" role="status" aria-live="polite" data-od-id="add-project-creating">
      <div className="cp-icon" data-stagger="1">
        <span className="cp-icon-spinner" aria-hidden="true" />
      </div>
      <h2 className="cp-title" data-stagger="2">
        Creating <span className="cp-title-name">{projectName}</span>…
      </h2>
      <p className="cp-subtitle" data-stagger="2">
        Connecting repositories, verifying branches, and setting up the integration. This usually takes a few seconds.
      </p>
      <div className={`cp-progress`} data-stagger="3" aria-hidden="true">
        <div
          className="cp-progress-bar"
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <p className="cp-progress-meta" data-stagger="3">
        <span className="live-tick" />
        Currently <strong>{activeLabel.toLowerCase()}</strong>
      </p>
      <div data-stagger="4" style={{ width: "100%", maxWidth: 440 }}>
        <StepSegmenter activeStep={activeStep} />
      </div>
      <div
        className="cp-source"
        data-stagger="5"
        aria-label="Repositories being connected"
      >
        <div className="ms-row">
          <span className="ms-key">Frontend</span>
          <span className="ms-val"><code>{frontendRepoLabel || "acme/web-storefront"}</code></span>
        </div>
        <div className="ms-row">
          <span className="ms-key">Backend</span>
          <span className="ms-val"><code>{backendRepoLabel || "acme/billing-service"}</code></span>
        </div>
        <div className="ms-row">
          <span className="ms-key">Specs</span>
          <span className="ms-val"><code>{specsRepoLabel || "acme/specs-storefront"}</code></span>
        </div>
        <div className="ms-row">
          <span className="ms-key">Issues</span>
          <span className="ms-val"><code>{issuesRepoLabel || "—"}</code></span>
        </div>
        <div className="ms-row">
          <span className="ms-key">Default branch</span>
          <span className="ms-val"><code>{defaultBranch}</code></span>
        </div>
      </div>
      <button
        type="button"
        className="cp-cancel"
        onClick={onCancel}
        data-stagger="6"
        data-od-id="add-project-creating-cancel"
      >
        Cancel creation
      </button>
    </div>
  );
}

function SuccessCard({
  projectName,
  defaultBranch,
  reposCount,
  specCount,
  onView,
  onAnother,
}: {
  projectName: string;
  defaultBranch: string;
  reposCount: number;
  specCount: number;
  onView: () => void;
  onAnother: () => void;
}) {
  return (
    <div className="cp-state is-active" role="status" aria-live="polite" data-od-id="add-project-success">
      <div className="cp-icon cp-icon-success" data-stagger="1">
        <CheckGlyph />
      </div>
      <h2 className="cp-title" data-stagger="2">
        <span className="cp-title-name">{projectName}</span> is ready
      </h2>
      <p className="cp-subtitle" data-stagger="2">
        Your project is live and ready to receive specs and runs.
      </p>
      <div
        className={`cp-progress is-success`}
        data-stagger="3"
        aria-hidden="true"
      >
        <div className="cp-progress-bar" style={{ width: "100%" }} />
      </div>
      <p className="cp-progress-meta" data-stagger="3" style={{ marginBottom: 18 }}>
        <span className="live-tick" style={{ background: "var(--success)", animation: "none" }} />
        All steps completed in&nbsp;<strong>2.4s</strong>
      </p>
      <div data-stagger="4" style={{ width: "100%", maxWidth: 440 }}>
        <StepSegmenter activeStep={STEPS.length + 1} />
      </div>
      <div className="cp-summary" data-stagger="5" aria-label="Created project summary">
        <div className="cp-summary-item">
          <div className="cp-summary-key">Repos</div>
          <div className="cp-summary-val">{reposCount} connected</div>
        </div>
        <div className="cp-summary-item">
          <div className="cp-summary-key">Branch</div>
          <div className="cp-summary-val"><code>{defaultBranch}</code></div>
        </div>
        <div className="cp-summary-item">
          <div className="cp-summary-key">Specs</div>
          <div className="cp-summary-val">{specCount} found</div>
        </div>
      </div>
      <div className="cp-actions" data-stagger="6">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onAnother}
          data-od-id="add-project-success-another"
        >
          Add another project
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onView}
          data-od-id="add-project-success-view"
        >
          View project
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8h8" />
            <path d="M8 4l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ErrorCard({
  projectName,
  failedStepId,
  activeStepAtFailure,
  error,
  copied,
  onRetry,
  onCancel,
  onCopy,
}: {
  projectName: string;
  failedStepId: StepId;
  activeStepAtFailure: number;
  error: { stepId: StepId; message: string; log: string };
  copied: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onCopy: () => void;
}) {
  const failedStepIndex =
    STEPS.findIndex((s) => s.id === failedStepId) >= 0
      ? STEPS.findIndex((s) => s.id === failedStepId) + 1
      : 2;
  return (
    <div className="cp-state is-active" role="alert" aria-live="assertive" data-od-id="add-project-error">
      <div className="cp-icon cp-icon-error" data-stagger="1">
        <XGlyph />
      </div>
      <h2 className="cp-title" data-stagger="2">
        Couldn't create <span className="cp-title-name">{projectName}</span>
      </h2>
      <p className="cp-subtitle" data-stagger="2">
        The {STEPS[failedStepIndex - 1]?.label.toLowerCase() ?? "creation"} step didn't complete. Nothing has been saved — try again, or copy the log to share with support.
      </p>
      <div
        className={`cp-progress is-error`}
        data-stagger="3"
        aria-hidden="true"
      >
        <div
          className="cp-progress-bar"
          style={{ width: `${Math.max(8, (failedStepIndex - 1) * 25)}%` }}
        />
      </div>
      <div data-stagger="4" style={{ width: "100%", maxWidth: 440 }}>
        <StepSegmenter activeStep={activeStepAtFailure} failedStepId={failedStepId} />
      </div>
      <div className="cp-error-detail" data-stagger="5">
        <div className="cp-error-detail-head">
          <AlertGlyph />
          <span>Failed at · {STEPS[failedStepIndex - 1]?.label}</span>
        </div>
        <p className="cp-error-detail-msg">{error.message}</p>
        <pre className="cp-error-detail-log" aria-label="Error log">{error.log}</pre>
      </div>
      <div className="cp-actions" data-stagger="6">
        <button
          type="button"
          className="btn btn-ghost-danger"
          onClick={onCopy}
          data-od-id="add-project-error-copy"
        >
          {copied ? "Copied!" : "Copy log"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          data-od-id="add-project-error-back"
        >
          Back to form
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
          data-od-id="add-project-error-retry"
        >
          Retry
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8a5 5 0 0 1 8.5-3.5L13 6" />
            <path d="M13 3v3h-3" />
            <path d="M13 8a5 5 0 0 1-8.5 3.5L3 10" />
            <path d="M3 13v-3h3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
