// Mock data extracted from the design wireframes
// This is the source of truth for the UI migration

export interface Project {
  id: string;
  label: string;
  color: string;
  description: string;
  repo: string;
  /** Default branch tracked by the design wireframe (e.g. "main"). */
  branch: string;
  /** Production vs staging — drives the pill on the all-projects card. */
  environment: "production" | "staging";
  lastActivity: string;
  owner: { initials: string; name: string; handle: string };
}

const NOW_MS = Date.now();
const minutesAgoTs = (m: number) => new Date(NOW_MS - m * 60_000).toISOString();

export const PROJECTS: Project[] = [
  {
    id: "acme-storefront",
    label: "acme-storefront",
    color: "oklch(70% 0.14 255)",
    description: "Customer-facing storefront: catalog, search, cart, and checkout.",
    repo: "acme/storefront",
    branch: "main",
    environment: "production",
    lastActivity: minutesAgoTs(1),
    owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" },
  },
  {
    id: "billing-portal",
    label: "billing-portal",
    color: "oklch(70% 0.14 150)",
    description: "Invoices, subscriptions, refunds, and the dunning lifecycle.",
    repo: "acme/billing-portal",
    branch: "main",
    environment: "production",
    lastActivity: minutesAgoTs(8),
    owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" },
  },
  {
    id: "ops-console",
    label: "ops-console",
    color: "oklch(70% 0.14 25)",
    description: "Internal operator console: cron jobs, audit log, alerting.",
    repo: "acme/ops-console",
    branch: "main",
    environment: "staging",
    lastActivity: minutesAgoTs(14),
    owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" },
  },
  {
    id: "docs-site",
    label: "docs-site",
    color: "oklch(70% 0.14 75)",
    description: "Public docs and API reference, built on the in-house static site.",
    repo: "acme/docs-site",
    branch: "main",
    environment: "staging",
    lastActivity: minutesAgoTs(60 * 1),
    owner: { initials: "KN", name: "Kira Nguyen", handle: "@kira.n" },
  },
];

export type TestStatus = "passed" | "failed" | "flaky" | "draft";

export interface Test {
  id: string;
  name: string;
  project: string;
  createdAt: string;
  ranAt: string;
  status: TestStatus;
  steps: number;
  owner?: { initials: string; name: string; handle: string };
  description?: string;
}

const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

export const TESTS: Test[] = [
  { id: "checkout-happy-stripe-usd", name: "checkout · happy path · Stripe USD", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 22), ranAt: minutesAgo(1), status: "passed", steps: 18, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "checkout-3ds-required", name: "checkout · 3DS required", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 40), ranAt: minutesAgo(2), status: "failed", steps: 22, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "auth-sso-okta", name: "auth · sso round-trip · Okta", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 11), ranAt: minutesAgo(22), status: "passed", steps: 9, owner: { initials: "SK", name: "Sarah Kim", handle: "@sarah.k" } },
  { id: "product-variant-rendering", name: "product page · variant rendering", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 70), ranAt: minutesAgo(60 * 4), status: "passed", steps: 14, owner: { initials: "MT", name: "Marcus Tóth", handle: "@marcus.t" } },
  { id: "search-filter-ui", name: "search · filter UI · facet combos", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 18), ranAt: minutesAgo(55), status: "passed", steps: 11, owner: { initials: "MT", name: "Marcus Tóth", handle: "@marcus.t" } },
  { id: "cart-promo-stacking", name: "cart · promo code stacking", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 8), ranAt: minutesAgo(60 * 3), status: "failed", steps: 14, owner: { initials: "SK", name: "Sarah Kim", handle: "@sarah.k" } },
  { id: "signup-email-verification", name: "signup · email verification flow", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 33), ranAt: minutesAgo(60 * 7), status: "passed", steps: 9, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "profile-picture-upload", name: "account · profile picture upload", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 15), ranAt: minutesAgo(60 * 16), status: "failed", steps: 10, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "nav-mega-menu-hover", name: "nav · mega menu hover", project: "acme-storefront", createdAt: minutesAgo(60 * 24 * 4), ranAt: minutesAgo(60 * 20), status: "passed", steps: 5, owner: { initials: "MT", name: "Marcus Tóth", handle: "@marcus.t" } },
  { id: "cart-abandoned-recovery", name: "cart · abandoned-recovery email", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 9), ranAt: minutesAgo(31), status: "passed", steps: 7, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "invoice-month-end-pdf", name: "invoice · month-end export PDF", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 120), ranAt: minutesAgo(8), status: "passed", steps: 12, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "subscription-upgrade", name: "subscription · mid-cycle upgrade", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 3), ranAt: minutesAgo(60 * 2), status: "flaky", steps: 16, owner: { initials: "SK", name: "Sarah Kim", handle: "@sarah.k" } },
  { id: "refund-partial-full", name: "refund · partial and full", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 30), ranAt: minutesAgo(60 * 9), status: "failed", steps: 19, owner: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" } },
  { id: "tax-vat-eu", name: "tax · VAT calculation EU", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 45), ranAt: minutesAgo(60 * 14), status: "passed", steps: 7, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "dunning-failed-payment", name: "dunning · failed payment retry", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 21), ranAt: minutesAgo(60 * 22), status: "flaky", steps: 13, owner: { initials: "SK", name: "Sarah Kim", handle: "@sarah.k" } },
  { id: "webhook-signature", name: "webhook · signature verification", project: "billing-portal", createdAt: minutesAgo(60 * 24 * 60), ranAt: minutesAgo(60 * 28), status: "passed", steps: 6, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "incident-on-call-rotation", name: "incident · on-call rotation", project: "ops-console", createdAt: minutesAgo(60 * 24 * 5), ranAt: minutesAgo(14), status: "flaky", steps: 6, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "deploy-canary-health", name: "deploy · canary health check", project: "ops-console", createdAt: minutesAgo(60 * 24 * 2), ranAt: minutesAgo(40), status: "passed", steps: 11, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "audit-log-pagination", name: "audit log · pagination", project: "ops-console", createdAt: minutesAgo(60 * 24 * 14), ranAt: minutesAgo(60 * 5), status: "passed", steps: 8, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "alert-routing-pager", name: "alert routing · pager escalation", project: "ops-console", createdAt: minutesAgo(60 * 24 * 7), ranAt: minutesAgo(60 * 11), status: "passed", steps: 8, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "sso-scim-provisioning", name: "sso · SCIM provisioning", project: "ops-console", createdAt: minutesAgo(60 * 24 * 25), ranAt: minutesAgo(60 * 30), status: "passed", steps: 12, owner: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" } },
  { id: "docs-search-results", name: "docs · search results render", project: "docs-site", createdAt: minutesAgo(60 * 24 * 60), ranAt: minutesAgo(60 * 12), status: "passed", steps: 5, owner: { initials: "KN", name: "Kira Nguyen", handle: "@kira.n" } },
  { id: "docs-sidebar-collapse", name: "docs · sidebar nav collapse", project: "docs-site", createdAt: minutesAgo(60 * 24 * 6), ranAt: minutesAgo(60 * 1), status: "failed", steps: 4, owner: { initials: "KN", name: "Kira Nguyen", handle: "@kira.n" } },
  { id: "docs-version-switcher", name: "docs · version switcher", project: "docs-site", createdAt: minutesAgo(60 * 24 * 90), ranAt: minutesAgo(60 * 36), status: "passed", steps: 4, owner: { initials: "KN", name: "Kira Nguyen", handle: "@kira.n" } },
  { id: "docs-code-block-copy", name: "docs · code block copy", project: "docs-site", createdAt: minutesAgo(60 * 24 * 3), ranAt: minutesAgo(60 * 48), status: "passed", steps: 3, owner: { initials: "KN", name: "Kira Nguyen", handle: "@kira.n" } },
];

export interface Spec {
  id: string;
  name: string;
  project: string;
  createdAt: string;
  author: { initials: string; name: string; handle: string };
  description: string;
}

const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const AUTHORS: Record<string, { initials: string; name: string; handle: string }> = {
  EM: { initials: "EM", name: "Eli Marsh", handle: "@eli.marsh" },
  SK: { initials: "SK", name: "Sarah Kim", handle: "@sarah.k" },
  MT: { initials: "MT", name: "Marcus Tóth", handle: "@marcus.t" },
  DR: { initials: "DR", name: "Daniel Rao", handle: "@daniel.r" },
  KN: { initials: "KN", name: "Kira Nguyen", handle: "@kira.n" },
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const SPECS: Spec[] = [
  { id: "create-invoice", name: "Create invoice", project: "billing-portal", createdAt: daysAgo(2), author: AUTHORS.EM, description: "Draft a new invoice with line items, tax, and a discount code, then save it as draft." },
  { id: "update-payment-method", name: "Update payment method", project: "billing-portal", createdAt: daysAgo(7), author: AUTHORS.EM, description: "Swap a card on file via Stripe Elements; expect the change to persist across reload." },
  { id: "cancel-subscription-mid-cycle", name: "Cancel subscription mid-cycle", project: "billing-portal", createdAt: daysAgo(12), author: AUTHORS.SK, description: "Cancel an active subscription partway through the billing period; prorate the credit." },
  { id: "refund-partial-and-full", name: "Refund partial and full", project: "billing-portal", createdAt: daysAgo(30), author: AUTHORS.EM, description: "Issue both partial and full refunds against an existing invoice; confirm ledger entries." },
  { id: "dunning-failed-payment-retry", name: "Dunning — failed payment retry", project: "billing-portal", createdAt: daysAgo(21), author: AUTHORS.SK, description: "Trigger a dunning email cadence after a declined payment; retry on day 3, 5, and 7." },
  { id: "user-can-reset-password", name: "User can reset password", project: "acme-storefront", createdAt: daysAgo(4), author: AUTHORS.MT, description: "Request a reset link by email, follow it within the 1h window, and set a new password." },
  { id: "search-with-filters-and-facets", name: "Search with filters and facets", project: "acme-storefront", createdAt: daysAgo(18), author: AUTHORS.MT, description: "Combine brand, size, color, and price filters; expect result count to update without a page reload." },
  { id: "apply-promo-code-at-checkout", name: "Apply promo code at checkout", project: "acme-storefront", createdAt: daysAgo(8), author: AUTHORS.SK, description: "Apply SUMMER20, verify discount line item, then remove it without affecting the cart total." },
  { id: "onboard-new-team-member", name: "Onboard new team member", project: "acme-storefront", createdAt: daysAgo(33), author: AUTHORS.MT, description: "Invite a teammate, set their role, and confirm they receive the welcome email within 30s." },
  { id: "two-factor-auth-setup", name: "Two-factor auth setup", project: "acme-storefront", createdAt: daysAgo(11), author: AUTHORS.SK, description: "Enable TOTP 2FA from the security panel; expect 10 backup codes to be revealed once." },
  { id: "send-transactional-email-digest", name: "Send transactional email digest", project: "acme-storefront", createdAt: daysAgo(60), author: AUTHORS.MT, description: "Trigger the daily order-digest email for a user and confirm it lands within the SLA window." },
  { id: "schedule-cron-job", name: "Schedule cron job", project: "ops-console", createdAt: daysAgo(5), author: AUTHORS.DR, description: "Author a cron expression, attach a target queue, and watch it fire on the next tick." },
  { id: "generate-monthly-usage-report", name: "Generate monthly usage report", project: "ops-console", createdAt: daysAgo(14), author: AUTHORS.DR, description: "Run the month-end usage report; confirm CSV + PDF are stored under the org bucket." },
  { id: "webhook-retry-chain", name: "Webhook retry chain", project: "ops-console", createdAt: daysAgo(22), author: AUTHORS.DR, description: "Configure a webhook, force a 500 from the receiver, and confirm exponential backoff retries." },
  { id: "bulk-delete-with-confirmation", name: "Bulk delete with confirmation", project: "ops-console", createdAt: daysAgo(45), author: AUTHORS.SK, description: "Select 50 rows, confirm via modal, and verify soft-delete with a 7-day restore window." },
  { id: "document-version-restore", name: "Document version restore", project: "docs-site", createdAt: daysAgo(6), author: AUTHORS.KN, description: "Open the version history, restore a prior version, and confirm the diff is visible." },
  { id: "public-api-token-rotation", name: "Public API token rotation", project: "docs-site", createdAt: daysAgo(40), author: AUTHORS.KN, description: "Rotate a public API token; old token should reject within 60s, new one accepted immediately." },
  { id: "gdpr-data-export-request", name: "GDPR data export request", project: "docs-site", createdAt: daysAgo(90), author: AUTHORS.KN, description: "Submit a data-export request from settings; expect a signed download link within 24h." },
].map((s) => ({ ...s, id: s.id || slugify(s.name) }));

// Format helpers
export function fmtRel(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = (NOW - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + "d ago";
  if (diff < 86400 * 30) return Math.floor(diff / 86400 / 7) + "w ago";
  return Math.floor(diff / 86400 / 30) + "mo ago";
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getProject(projectId: string): Project {
  return (
    PROJECTS.find((p) => p.id === projectId) || {
      id: projectId,
      label: projectId,
      color: "var(--muted)",
      description: "",
      repo: "",
      branch: "main",
      environment: "production",
      lastActivity: new Date().toISOString(),
      owner: { initials: "??", name: "Unknown", handle: "@unknown" },
    }
  );
}

// Dashboard stat strip
export const DASHBOARD_STATS = {
  runsLast24h: { value: 128, delta: "+12%", direction: "up" as const },
  passRate: { value: "94.2%", delta: "+1.4", direction: "up" as const },
  failures: { value: 7, delta: "−3", direction: "down" as const },
  avgDuration: { value: "1m 42s", delta: "−8s", direction: "down" as const },
};

// Recent test runs (subset of TESTS, sorted by ranAt)
export const RECENT_RUNS = [...TESTS]
  .sort((a, b) => new Date(b.ranAt).getTime() - new Date(a.ranAt).getTime())
  .slice(0, 6);

// By-project breakdown
export const BY_PROJECT = [
  { id: "acme-storefront", runs: 62, passed: 58, failed: 3, flaky: 1, specs: 12, tests: 48, passRate: 93.5, trend: 1.5, lastRunStatus: "passed" as const, lastRunWhen: minutesAgo(2) },
  { id: "billing-portal", runs: 38, passed: 36, failed: 1, flaky: 1, specs: 9, tests: 36, passRate: 94.7, trend: 0.8, lastRunStatus: "passed" as const, lastRunWhen: minutesAgo(8) },
  { id: "ops-console", runs: 19, passed: 17, failed: 0, flaky: 2, specs: 7, tests: 28, passRate: 89.5, trend: -2.1, lastRunStatus: "flaky" as const, lastRunWhen: minutesAgo(14) },
  { id: "docs-site", runs: 9, passed: 8, failed: 1, flaky: 0, specs: 5, tests: 18, passRate: 88.9, trend: -1.2, lastRunStatus: "failed" as const, lastRunWhen: minutesAgo(60 * 1) },
];

/** Per-project 24h trend sparkline (8 samples, pass rate %). */
export const TREND_SPARK: Record<string, number[]> = {
  "acme-storefront": [88, 91, 90, 94, 92, 95, 93, 96],
  "billing-portal": [92, 94, 95, 93, 96, 94, 95, 97],
  "ops-console": [85, 82, 88, 86, 84, 89, 87, 88],
  "docs-site": [92, 90, 88, 91, 89, 90, 88, 87],
};

// Test steps mock
export interface Step {
  num: number;
  action: string; // navigate, type, click, select, assert, api
  name: string;
  description: string;
  status: "passed" | "failed";
  time: string;
  selector?: { css: string; xpath: string; testid: string; text: string };
  apiTarget?: { method: string; path: string };
  value?: string;
}

export const STEPS_TEMPLATE: Step[] = [
  { num: 1, action: "navigate", name: "Open storefront homepage at /", description: "Open the storefront homepage at the root URL and wait for the hero module to render.", status: "passed", time: "0.3s", selector: { css: "body[data-page='home']", xpath: "//body[@data-page='home']", testid: "home-root", text: "Welcome" } },
  { num: 2, action: "click", name: "Click the main navigation menu", description: "Click the primary nav toggle to expand the mega menu, then verify the dropdown is visible.", status: "passed", time: "0.4s", selector: { css: "header nav button[data-nav='primary']", xpath: "//header//nav//button[@data-nav='primary']", testid: "nav-primary", text: "Shop" } },
  { num: 3, action: "type", name: "Type 'sneakers' into the search box", description: "Focus the search input, type 'sneakers', and assert that the autocomplete suggestions list is visible.", status: "passed", time: "0.6s", selector: { css: "input[type='search'][name='q']", xpath: "//input[@type='search' and @name='q']", testid: "search-input", text: "Search" }, value: "sneakers" },
  { num: 4, action: "api", name: "POST /api/cart with the active session", description: "POST the current session id to the cart endpoint to create a draft cart; assert the returned cart id is non-null.", status: "passed", time: "0.2s", apiTarget: { method: "POST", path: "/api/cart" } },
  { num: 5, action: "click", name: "Click the first product card", description: "Click the first product card in the result grid, then wait for the product detail page to load.", status: "passed", time: "0.7s", selector: { css: "[data-testid='product-card']:first-child a", xpath: "(//*[@data-testid='product-card'])[1]//a", testid: "product-card-link", text: "View" } },
  { num: 6, action: "select", name: "Select size 'EU 42' from the size selector", description: "Open the size selector and pick EU 42. Confirm the option becomes the active selection.", status: "passed", time: "0.3s", selector: { css: "select[name='size']", xpath: "//select[@name='size']", testid: "size-select", text: "Size" }, value: "EU 42" },
  { num: 7, action: "click", name: "Click 'Add to cart' button", description: "Click the add-to-cart CTA. Wait for the cart drawer to slide in and the line item to appear.", status: "passed", time: "0.5s", selector: { css: "button[data-testid='add-to-cart']", xpath: "//button[@data-testid='add-to-cart']", testid: "add-to-cart", text: "Add to cart" } },
  { num: 8, action: "navigate", name: "Open the cart drawer", description: "Open the cart drawer to confirm the line item is present with the correct size and price.", status: "passed", time: "0.3s", selector: { css: "[data-testid='cart-drawer']", xpath: "//*[@data-testid='cart-drawer']", testid: "cart-drawer", text: "Your cart" } },
  { num: 9, action: "click", name: "Click 'Checkout' to begin the checkout flow", description: "Click the checkout button. Wait for navigation to /checkout and the form to be ready.", status: "passed", time: "0.6s", selector: { css: "button[data-testid='checkout-cta']", xpath: "//button[@data-testid='checkout-cta']", testid: "checkout-cta", text: "Checkout" } },
  { num: 10, action: "type", name: "Type the test customer email", description: "Type 'qa+stripe@acme.io' into the email field and tab out to trigger validation.", status: "passed", time: "0.4s", selector: { css: "input[name='email']", xpath: "//input[@name='email']", testid: "email-input", text: "Email" }, value: "qa+stripe@acme.io" },
  { num: 11, action: "type", name: "Type the test customer first and last name", description: "Type 'Ada' and 'Lovelace' into the first and last name fields.", status: "passed", time: "0.3s", selector: { css: "input[name='firstName']", xpath: "//input[@name='firstName']", testid: "first-name", text: "First name" }, value: "Ada Lovelace" },
  { num: 12, action: "type", name: "Type the test shipping address", description: "Type '12 Curzon Lane', 'London', 'W1J 5BN', 'GB' into the address fields.", status: "passed", time: "0.5s", selector: { css: "input[name='address1']", xpath: "//input[@name='address1']", testid: "address1", text: "Address" }, value: "12 Curzon Lane, London W1J 5BN, GB" },
  { num: 13, action: "select", name: "Pick 'Standard' shipping option", description: "Pick the standard shipping option in the radio group. Verify the price updates to £3.99.", status: "passed", time: "0.4s", selector: { css: "input[name='shipping'][value='standard']", xpath: "//input[@name='shipping' and @value='standard']", testid: "shipping-standard", text: "Standard" } },
  { num: 14, action: "click", name: "Click 'Continue to payment'", description: "Click continue. Wait for the Stripe payment element to mount in the payment step.", status: "passed", time: "0.7s", selector: { css: "button[data-testid='continue-to-payment']", xpath: "//button[@data-testid='continue-to-payment']", testid: "continue-to-payment", text: "Continue" } },
  { num: 15, action: "api", name: "POST /api/checkout/confirm with the payment method", description: "Confirm the checkout with a Stripe test payment method. Wait for the 200 response and capture the order id.", status: "passed", time: "0.5s", apiTarget: { method: "POST", path: "/api/checkout/confirm" } },
  { num: 16, action: "assert", name: "Assert the order confirmation page shows order id", description: "Verify the order confirmation page renders with the order id, total, and a success state.", status: "passed", time: "0.3s", selector: { css: "[data-testid='order-confirmation']", xpath: "//*[@data-testid='order-confirmation']", testid: "order-confirmation", text: "Thank you" } },
  { num: 17, action: "webhook", name: "Wait for the order.paid webhook to be delivered", description: "Wait up to 30s for the order.paid webhook to be delivered to the test receiver; assert the signature is valid.", status: "passed", time: "1.4s" },
  { num: 18, action: "assert", name: "Assert the cart is empty after checkout", description: "Re-open the cart drawer and assert no line items remain.", status: "passed", time: "0.3s", selector: { css: "[data-testid='cart-drawer'] [data-testid='cart-line']", xpath: "//*[@data-testid='cart-drawer']//*[@data-testid='cart-line']", testid: "cart-line", text: "" } },
];

// Recent runs for test detail
export const RECENT_TEST_RUNS = [
  { id: "1842", sha: "a3f7c91", when: minutesAgo(1), duration: "9.8s", trigger: "manual", status: "passed" as const },
  { id: "1841", sha: "b8e4d20", when: minutesAgo(33), duration: "9.4s", trigger: "schedule", status: "passed" as const },
  { id: "1840", sha: "c2a9f13", when: minutesAgo(60 * 1 + 11), duration: "11.2s", trigger: "push", status: "passed" as const },
  { id: "1839", sha: "d5b1e8a", when: minutesAgo(60 * 2 + 4), duration: "10.7s", trigger: "manual", status: "passed" as const },
  { id: "1838", sha: "e7c2d4f", when: minutesAgo(60 * 3 + 17), duration: "9.9s", trigger: "schedule", status: "passed" as const },
  { id: "1837", sha: "f9d3a6b", when: minutesAgo(60 * 5 + 2), duration: "10.4s", trigger: "manual", status: "passed" as const },
  { id: "1836", sha: "18a4b2c", when: minutesAgo(60 * 7 + 8), duration: "11.6s", trigger: "schedule", status: "flaky" as const },
  { id: "1835", sha: "29b5c3d", when: minutesAgo(60 * 9 + 11), duration: "10.1s", trigger: "push", status: "passed" as const },
];

// Run log lines
export const RUN_LOG = [
  { ts: "12:00:01.142", tag: "info" as const, msg: "Runner booted · node 20.11.0 · commit a3f7c91" },
  { ts: "12:00:01.880", tag: "step" as const, msg: "→ 01 · Open storefront homepage at /" },
  { ts: "12:00:02.207", tag: "info" as const, msg: "GET / · 200 · 814ms" },
  { ts: "12:00:02.244", tag: "assert" as const, msg: "✓ home-root visible (314ms)" },
  { ts: "12:00:02.601", tag: "step" as const, msg: "→ 02 · Click the main navigation menu" },
  { ts: "12:00:03.012", tag: "assert" as const, msg: "✓ nav-primary expanded" },
  { ts: "12:00:03.440", tag: "step" as const, msg: "→ 03 · Type 'sneakers' into the search box" },
  { ts: "12:00:04.011", tag: "assert" as const, msg: "✓ search-input has value 'sneakers'" },
  { ts: "12:00:04.512", tag: "step" as const, msg: "→ 04 · POST /api/cart" },
  { ts: "12:00:04.700", tag: "info" as const, msg: "POST /api/cart · 201 · 188ms · cart_8c1a" },
  { ts: "12:00:05.180", tag: "step" as const, msg: "→ 05 · Click the first product card" },
  { ts: "12:00:05.860", tag: "assert" as const, msg: "✓ product detail loaded · /p/sneaker-pro-2" },
  { ts: "12:00:06.001", tag: "step" as const, msg: "→ 06 · Select size 'EU 42'" },
  { ts: "12:00:06.350", tag: "step" as const, msg: "→ 07 · Click 'Add to cart' button" },
  { ts: "12:00:06.880", tag: "assert" as const, msg: "✓ cart-drawer open · 1 line item" },
  { ts: "12:00:07.220", tag: "step" as const, msg: "→ 08 · Open the cart drawer" },
  { ts: "12:00:07.560", tag: "step" as const, msg: "→ 09 · Click 'Checkout'" },
  { ts: "12:00:08.241", tag: "assert" as const, msg: "✓ /checkout loaded · form ready" },
  { ts: "12:00:08.501", tag: "step" as const, msg: "→ 10–12 · Fill customer details" },
  { ts: "12:00:09.114", tag: "step" as const, msg: "→ 13 · Pick 'Standard' shipping" },
  { ts: "12:00:09.512", tag: "step" as const, msg: "→ 14 · Click 'Continue to payment'" },
  { ts: "12:00:10.212", tag: "assert" as const, msg: "✓ stripe payment element mounted" },
  { ts: "12:00:10.401", tag: "step" as const, msg: "→ 15 · POST /api/checkout/confirm" },
  { ts: "12:00:10.901", tag: "info" as const, msg: "POST /api/checkout/confirm · 200 · 500ms · ord_8812" },
  { ts: "12:00:10.980", tag: "step" as const, msg: "→ 16 · Assert order confirmation" },
  { ts: "12:00:11.214", tag: "assert" as const, msg: "✓ order-confirmation visible · ord_8812 · £84.00" },
  { ts: "12:00:11.402", tag: "step" as const, msg: "→ 17 · Wait for order.paid webhook" },
  { ts: "12:00:12.602", tag: "info" as const, msg: "webhook delivered · 200 · sig ok" },
  { ts: "12:00:12.802", tag: "step" as const, msg: "→ 18 · Assert cart is empty" },
  { ts: "12:00:13.014", tag: "assert" as const, msg: "✓ no cart lines" },
  { ts: "12:00:13.142", tag: "info" as const, msg: "Run complete · 18 steps · 9.8s · 0 failed" },
];
