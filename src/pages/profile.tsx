import { Link } from "@tanstack/react-router";
import { useSession } from "~/contexts/session-context";
import { getProject, TESTS } from "~/lib/mock-data-new";

const OWNED_TESTS = TESTS.slice(0, 6);

function RateBar({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div
      className="rate-bar"
      style={{
        position: "relative",
        height: 6,
        background: "oklch(94% 0.005 250)",
        borderRadius: 3,
        overflow: "hidden",
        flex: 1,
        minWidth: 60,
      }}
    >
      <div
        className={`rate-fill${warn ? " rate-fill-warn" : ""}`}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${value}%`,
          background: warn ? "oklch(72% 0.14 75)" : "oklch(62% 0.15 150)",
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export function ProfilePage() {
  const session = useSession();
  const user = session?.user;

  return (
    <div data-od-id="pane-profile">
      <div className="page-head">
        <nav className="bread">
          <Link to="/tests">Tests</Link>
          <span className="bread-sep">›</span>
          <span className="bread-current">{user?.name || user?.username || "Profile"}</span>
        </nav>
        <div className="page-head-text">
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Your account, tests, and activity across QA Webapp.</p>
        </div>
      </div>

      <div className="page-body" data-od-id="pane-profile">
        {/* Hero */}
        <section className="profile-hero panel" data-od-id="profile-hero">
          <div className="profile-hero-bg" />
          <div className="profile-hero-body">
            <div className="avatar avatar-hero">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || user.username}
                  style={{ width: "100%", height: "100%", borderRadius: "50%" }}
                />
              ) : (
                "EM"
              )}
            </div>
            <div className="profile-hero-meta">
              <div className="profile-hero-name-row">
                <h2 className="profile-hero-name">{user?.name || "Eli Marsh"}</h2>
                <span className="pill pill-success">
                  <span className="pill-dot" />
                  active
                </span>
              </div>
              <div className="profile-hero-handle">
                @{user?.username || "eli.marsh"} · Senior QA Engineer
              </div>
              <p className="profile-hero-bio">
                Building and breaking checkout flows. Day-1 user of QA Webapp. Reach me on GitLab at{" "}
                <span className="profile-hero-link">@{user?.username || "eli.marsh"}</span>.
              </p>
              <div className="profile-hero-tags">
                <span className="kv-chip">Berlin, DE</span>
                <span className="kv-chip">Europe/Berlin · UTC+1</span>
                <span className="kv-chip">Joined Mar 2024</span>
              </div>
            </div>
            <div className="profile-hero-actions">
              <button
                className="btn btn-secondary"
                onClick={() => alert("Edit profile: not implemented in UI migration")}
              >
                Edit profile
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => alert("Sign out: not implemented in UI migration")}
              >
                Sign out
              </button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="stat-strip" data-od-id="profile-stats">
          <div className="stat">
            <div className="stat-label">Tests owned</div>
            <div className="stat-value">18</div>
            <div className="stat-meta">across 3 projects</div>
          </div>
          <div className="stat">
            <div className="stat-label">Runs · 30 days</div>
            <div className="stat-value">1,842</div>
            <div className="stat-meta stat-meta-up">+12% vs prior period</div>
          </div>
          <div className="stat">
            <div className="stat-label">Pass rate</div>
            <div className="stat-value">96.7%</div>
            <div className="stat-meta stat-meta-up">+0.4 pt</div>
          </div>
          <div className="stat">
            <div className="stat-label">Avg run time</div>
            <div className="stat-value">
              9.9<span className="stat-suffix">s</span>
            </div>
            <div className="stat-meta stat-meta-down">−0.6s</div>
          </div>
        </section>

        <div className="detail-grid">
          <div className="detail-col-main">
            {/* Activity chart */}
            <section className="panel" data-od-id="profile-activity">
              <div className="panel-head">
                <div className="panel-title">Activity · last 30 days</div>
                <div className="panel-meta">Runs · passing + failing</div>
              </div>
              <div className="panel-body">
                <svg
                  viewBox="0 0 720 200"
                  preserveAspectRatio="none"
                  className="chart-svg"
                  data-od-id="profile-activity-chart"
                  style={{ width: "100%", height: 200, display: "block" }}
                >
                  <line x1="0" y1="40" x2="720" y2="40" className="chart-grid" />
                  <line x1="0" y1="100" x2="720" y2="100" className="chart-grid" />
                  <line x1="0" y1="160" x2="720" y2="160" className="chart-grid" />
                  <g>
                    {Array.from({ length: 28 }).map((_, i) => {
                      const x = 6 + i * 24;
                      const h = 100 + Math.sin(i * 0.7) * 12;
                      const y = 160 - h;
                      return (
                        <rect
                          key={i}
                          x={x}
                          y={y}
                          width={14}
                          height={h}
                          fill="oklch(82% 0.12 150)"
                        />
                      );
                    })}
                  </g>
                  <g>
                    {[2, 6, 11, 18, 22, 26].map((i) => {
                      const x = 6 + i * 24;
                      return (
                        <rect
                          key={i}
                          x={x}
                          y={160 - 100 - Math.sin(i * 0.7) * 12 - 10}
                          width={14}
                          height={8}
                          fill="oklch(70% 0.18 25)"
                        />
                      );
                    })}
                  </g>
                  <line x1="0" y1="160" x2="720" y2="160" stroke="var(--border)" />
                  <text x="6" y="178" fontSize="10" fill="var(--muted)" fontFamily="ui-monospace">
                    Jul 30
                  </text>
                  <text x="240" y="178" fontSize="10" fill="var(--muted)" fontFamily="ui-monospace">
                    Aug 14
                  </text>
                  <text x="510" y="178" fontSize="10" fill="var(--muted)" fontFamily="ui-monospace">
                    Aug 29
                  </text>
                </svg>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span
                      className="legend-dot legend-dot-pass"
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        background: "oklch(62% 0.15 150)",
                        marginRight: 6,
                      }}
                    />
                    Passing runs · 1,780
                  </span>
                  <span className="legend-item">
                    <span
                      className="legend-dot legend-dot-fail"
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        background: "oklch(60% 0.18 25)",
                        marginRight: 6,
                      }}
                    />
                    Failing runs · 62
                  </span>
                </div>
              </div>
            </section>

            {/* Owned tests */}
            <section className="panel" data-od-id="profile-tests">
              <div className="panel-head">
                <div className="panel-title">Owned tests</div>
                <div className="panel-meta">6 of 18</div>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <div className="profile-tests-head">
                  <div>Name</div>
                  <div>Project</div>
                  <div>Last run</div>
                  <div>Pass rate</div>
                  <div></div>
                </div>

                {OWNED_TESTS.map((t, i) => {
                  const proj = getProject(t.project);
                  const rates = [96.7, 99.2, 88.0, 97.4, 100, 99.8];
                  const rate = rates[i];
                  return (
                    <Link
                      key={t.id}
                      className="profile-tests-row"
                      to="/tests/$id" params={{ id: t.id }}
                      style={{ textDecoration: "none" }}
                    >
                      <div className="profile-tests-name">
                        <span
                          className={`step-icon ${i === 2 ? "step-icon-warn" : "step-icon-ok"}`}
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 16 16" width={14} height={14}>
                            <path
                              d="M3 8.3l3.4 3.4L13 5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span>{t.name}</span>
                      </div>
                      <div className="profile-tests-project">
                        <span
                          className="project-dot"
                          style={{ background: proj.color }}
                        />
                        {proj.label}
                      </div>
                      <div className="profile-tests-when">
                        {["just now", "7 min ago", "2 hr ago", "yesterday", "3 days ago", "5 days ago"][i]}
                      </div>
                      <div className="profile-tests-rate">
                        <RateBar value={rate} warn={rate < 90} />
                        <span className="rate-num" style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                          {rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="profile-tests-link">›</div>
                    </Link>
                  );
                })}

                <div className="profile-tests-foot">
                  <Link className="profile-tests-more" to="/tests">
                    View all 18 owned tests ›
                  </Link>
                </div>
              </div>
            </section>
          </div>

          <div className="detail-col-side">
            <section className="panel" data-od-id="profile-about">
              <div className="panel-head">
                <div className="panel-title">About</div>
              </div>
              <div className="panel-body">
                <div className="kv-row">
                  <div className="kv-key">Email</div>
                  <div className="kv-val">eli@acme.io</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Role</div>
                  <div className="kv-val">
                    <span className="pill pill-fg">
                      <span className="pill-dot pill-dot-fg" />
                      Senior QA Engineer
                    </span>
                  </div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Team</div>
                  <div className="kv-val">Checkout Squad · 6 members</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Location</div>
                  <div className="kv-val">Berlin, Germany</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Timezone</div>
                  <div className="kv-val">Europe/Berlin · UTC+1</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Joined</div>
                  <div className="kv-val">Mar 12, 2024</div>
                </div>
                <div className="kv-row">
                  <div className="kv-key">Last seen</div>
                  <div className="kv-val">just now</div>
                </div>
              </div>
            </section>

            <section className="panel" data-od-id="profile-account" style={{ marginTop: 20 }}>
              <div className="panel-head">
                <div className="panel-title">Account</div>
              </div>
              <div className="panel-body" style={{ padding: 0 }}>
                <a className="account-row" href="#">
                  <div className="account-row-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.4">
                      <rect x="2" y="4" width="12" height="9" rx="1" />
                      <path d="M2 4l6 5 6-5" />
                    </svg>
                  </div>
                  <div className="account-row-meta">
                    <div className="account-row-name">Email preferences</div>
                    <div className="account-row-sub">Run alerts, weekly digest, mentions</div>
                  </div>
                  <div className="account-row-cta">›</div>
                </a>
                <a className="account-row" href="#">
                  <div className="account-row-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" />
                      <path d="M5 6h6M5 9h4" />
                    </svg>
                  </div>
                  <div className="account-row-meta">
                    <div className="account-row-name">API tokens</div>
                    <div className="account-row-sub account-row-sub-ok">2 active</div>
                  </div>
                  <div className="account-row-cta">›</div>
                </a>
                <a className="account-row" href="#">
                  <div className="account-row-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M8 5v3l2 2" />
                    </svg>
                  </div>
                  <div className="account-row-meta">
                    <div className="account-row-name">Recent activity</div>
                    <div className="account-row-sub">Last sign-in just now · Berlin, DE</div>
                  </div>
                  <div className="account-row-cta">›</div>
                </a>
                <a className="account-row account-row-danger" href="#">
                  <div className="account-row-icon">
                    <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M5 3h6M6 3v-.5A1.5 1.5 0 0 1 7.5 1h1A1.5 1.5 0 0 1 10 2.5V3M3 5h10M4.5 5l.6 8a1.5 1.5 0 0 0 1.5 1.4h2.8a1.5 1.5 0 0 0 1.5-1.4l.6-8" />
                    </svg>
                  </div>
                  <div className="account-row-meta">
                    <div className="account-row-name">Delete account</div>
                    <div className="account-row-sub">Permanent and irreversible</div>
                  </div>
                  <div className="account-row-cta">›</div>
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
