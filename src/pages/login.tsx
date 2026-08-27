import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { gitlabLogin } from "~/api/auth";

/* One canonical ease-out, shared with the landing + dashboard pages. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export interface NewLoginPageProps {
  /**
   * Where to send the user after a successful login. The OAuth round
   * trip ends on `/static/auth_success.html` (backend) and bounces
   * back to the app's `/login?session_id=...` (or the requested
   * `redirect` URL). The session restore happens in `AuthBootstrap`,
   * then the route effect forwards to `redirectAfterLogin`.
   */
  redirectAfterLogin?: string;
  /**
   * Fires when the user has a valid session (post OAuth). Currently
   * used by the `/login` route to forward to the destination; can
   * also be used by tests to short-circuit the round trip.
   */
  onSignedIn?: () => void;
}

export function NewLoginPage({
  redirectAfterLogin,
}: NewLoginPageProps) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Ask the backend to build the GitLab OAuth URL. The backend
      // base64-encodes `redirectAfterLogin` into the `state` param
      // so the OAuth callback can bounce us back to where the user
      // was trying to go.
      //
      // We pass `window.location.origin + "/login"` as the
      // `redirect_url` (where the backend's auth callback will
      // redirect after GitLab completes). The session id will be
      // appended to that URL, and our AuthBootstrap component will
      // pick it up.
      const r = await gitlabLogin(
        redirectAfterLogin
          ? `${window.location.origin}/login?redirect=${encodeURIComponent(redirectAfterLogin)}`
          : `${window.location.origin}/login`,
      );
      if (!r.success || !r.data?.url) {
        throw new Error(r.error || "Could not start login");
      }
      // Full-page navigation to GitLab OAuth.
      window.location.href = r.data.url;
    } catch (err: any) {
      setError(err?.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <section id="login" data-od-id="login">
      <nav className="nav">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate({ to: "/" });
          }}
        >
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
          <span>codetest</span>
        </a>
        <div className="nav-spacer" />
        <button
          className="btn btn-ghost"
          style={{ border: "none", background: "transparent", cursor: "pointer" }}
          onClick={() => navigate({ to: "/" })}
        >
          Cancel
        </button>
      </nav>

      <main className="login-main">
        <div className="login-card" data-od-id="login-card">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in to your QA Webapp workspace.</p>

          {error ? (
            <div
              role="alert"
              className="login-error"
              style={{
                color: "var(--danger)",
                fontSize: 13,
                margin: "8px 0 12px",
                padding: "8px 12px",
                background: "oklch(96% 0.04 25)",
                border: "1px solid oklch(85% 0.10 25)",
                borderRadius: 6,
              }}
            >
              {error}
            </div>
          ) : null}

          <form onSubmit={handleLogin}>
            <motion.div
              initial={reduce ? false : { opacity: 0, transform: "translateY(4px)" }}
              animate={{ opacity: 1, transform: "translateY(0)" }}
              transition={{
                duration: reduce ? 0 : 0.4,
                ease: EASE_OUT,
                delay: reduce ? 0 : 0.12,
              }}
              style={{ width: "100%" }}
            >
              <button
                type="submit"
                className="btn btn-gitlab btn-block btn-lg"
                data-od-id="login-gitlab"
                disabled={loading}
                data-loading={loading || undefined}
                style={{ width: "100%" }}
              >
                <span className="gitlab-icon" aria-hidden="true">
                  <svg
                    className="gitlab-mark"
                    viewBox="0 0 586 559"
                    fill="currentColor"
                  >
                    <path d="M461.17 301.83l-18.91-58.12-37.42-114.99a6.43 6.43 0 0 0-12.26 0L355.4 243.81H230.6L193.59 128.72a6.43 6.43 0 0 0-12.26 0L143.81 243.81l-18.91 58.12a12.82 12.82 0 0 0 4.69 14.34L293 435l163.48-118.73a12.82 12.82 0 0 0 4.69-14.34" />
                    <path d="M293 435.07l62.41-191.95H230.59L293 435.07z" />
                    <path d="M293 435.07L230.59 243.12H143.81L293 435.07z" />
                    <path d="M143.81 243.12l-18.91 58.12a12.82 12.82 0 0 0 4.69 14.34L293 435.07 143.81 243.12z" />
                    <path d="M143.81 243.12h86.78L193.59 128.72a6.43 6.43 0 0 0-12.26 0l-37.52 114.4z" />
                  </svg>
                  <span className="gitlab-spinner" />
                </span>
                {loading ? "Redirecting to GitLab…" : "Continue with GitLab"}
              </button>
            </motion.div>
          </form>

          <div className="divider" />
          <p className="login-sub" style={{ margin: 0, textAlign: "center" }}>
            SSO only · Access is provisioned by your GitLab group owner.
          </p>
        </div>
      </main>
    </section>
  );
}
