import { Link, useLocation } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Standalone error pages — 404 (not found), 500 (internal), 403 (forbidden).
 *
 * Rendered OUTSIDE the AppShell (see `__root.tsx`) so a broken page never
 * inherits a broken shell: full-viewport, centered, quiet.
 *
 * Motion (Emil):
 *  - Rare pages earn a standard entrance, but restrained: 400ms, one canonical
 *    easing `cubic-bezier(0.16, 1, 0.3, 1)` (= the project's `tokens.easing.out`,
 *    same as `dashboard-anim.tsx`), 60ms stagger between blocks so the page
 *    cascades instead of popping.
 *  - GPU-only properties: `transform` + `opacity`, using the full transform
 *    string so it stays off the main thread.
 *  - `prefers-reduced-motion` collapses everything to an instant, quiet render.
 */

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const STAGGER = 0.06; // 60ms between siblings
const DURATION = 0.4;
const RISE = 8; // px — subtle lift, nothing theatrical

function BrandMark() {
  return (
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
}

/** One staggered block: lifts 8px + fades in, then settles. */
function Enter({
  index,
  reduce,
  children,
  className,
}: {
  index: number;
  reduce: boolean | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, transform: `translateY(${RISE}px)` }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{
        duration: reduce ? 0 : DURATION,
        ease: EASE_OUT,
        delay: reduce ? 0 : index * STAGGER,
      }}
    >
      {children}
    </motion.div>
  );
}

function ErrorPage({
  code,
  title,
  message,
  path,
  detail,
  actions,
}: {
  code: string;
  title: string;
  message: string;
  /** 404 only — the URL the user actually tried to reach. */
  path?: string;
  /** 500 only — the underlying error, trimmed to a readable sliver. */
  detail?: string;
  actions: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <main className="error-page" data-od-id="error-page">
      <div className="error-nav">
        <Link to="/" className="brand" data-od-id="error-home">
          <BrandMark />
          <span>codetest</span>
        </Link>
      </div>

      <div className="error-body">
        <Enter index={0} reduce={reduce}>
          <p className="error-code" data-od-id="error-code">
            {code}
          </p>
        </Enter>

        <Enter index={1} reduce={reduce}>
          <h1 className="error-title" data-od-id="error-title">
            {title}
          </h1>
        </Enter>

        {path ? (
          <Enter index={2} reduce={reduce}>
            <code className="error-path" data-od-id="error-path">
              {path}
            </code>
          </Enter>
        ) : null}

        <Enter index={2.5} reduce={reduce}>
          <p className="error-message" data-od-id="error-message">
            {message}
          </p>
        </Enter>

        {detail ? (
          <Enter index={3} reduce={reduce}>
            <pre className="error-detail" data-od-id="error-detail">
              {detail}
            </pre>
          </Enter>
        ) : null}

        <Enter index={3.5} reduce={reduce}>
          <div className="error-actions" data-od-id="error-actions">
            {actions}
          </div>
        </Enter>
      </div>
    </main>
  );
}

function BackToDashboard() {
  return (
    <Link to="/dashboard" className="btn btn-primary btn-lg">
      Back to dashboard
    </Link>
  );
}

function GoHome() {
  return (
    <Link to="/" className="btn btn-ghost btn-lg">
      Go home
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* 404 — the URL doesn't match any route.                              */
/* ------------------------------------------------------------------ */
export function NotFoundErrorPage() {
  const location = useLocation();

  return (
    <ErrorPage
      code="404"
      title="This page doesn't exist"
      message="The link may be broken, the page may have moved, or the address is simply wrong. Double-check the URL above — or head somewhere that still works."
      path={location.pathname}
      actions={
        <>
          <BackToDashboard />
          <GoHome />
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* 500 — an unhandled error bubbled to the root error boundary.        */
/* ------------------------------------------------------------------ */
function errorText(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function InternalErrorPage({ error, reset }: ErrorComponentProps) {
  const detail = errorText(error);

  return (
    <ErrorPage
      code="500"
      title="Something went wrong"
      message="An unexpected error crashed this page. It's on us — try again, and we'll dig into the logs if it keeps happening."
      detail={detail.length > 220 ? `${detail.slice(0, 220)}…` : detail}
      actions={
        <>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={reset}
            data-od-id="error-retry"
          >
            Try again
          </button>
          <BackToDashboard />
        </>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* 403 — the user is signed in but not allowed here.                   */
/* ------------------------------------------------------------------ */
export function ForbiddenErrorPage() {
  return (
    <ErrorPage
      code="403"
      title="You don't have access"
      message="This workspace is private and your account isn't on the guest list. Ask an owner to invite you — or switch to an account that is."
      actions={
        <>
          <BackToDashboard />
          <a
            className="btn btn-ghost btn-lg"
            href="mailto:hello@codetest.dev"
            data-od-id="error-support"
          >
            Contact support
          </a>
        </>
      }
    />
  );
}
