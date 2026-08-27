/**
 * Design tokens for the QA Webapp new design.
 *
 * This file mirrors the CSS custom properties in public/qa-webapp.css
 * (which is the wireframe source of truth) so that TypeScript code can
 * reference the same values without hardcoding magic strings.
 *
 * If a value diverges from the wireframe CSS, the wireframe CSS wins.
 * The shape of this object is the canonical contract for:
 *   - color tokens
 *   - semantic status colors
 *   - radius scale
 *   - spacing scale
 *   - font stacks
 *   - the canonical easing curve
 *
 * Tailwind's theme.extend in tailwind.config.js exposes the same values
 * via the `qa-*` keys, e.g. `bg-qa-bg`, `text-qa-fg`, `rounded-qa-md`.
 * See AGENTS.md → "Design System" for the full mapping.
 */

export const tokens = {
  color: {
    bg: "oklch(99% 0.002 240)",
    surface: "oklch(100% 0 0)",
    fg: "oklch(18% 0.012 250)",
    muted: "oklch(54% 0.012 250)",
    border: "oklch(92% 0.005 250)",
    accent: "oklch(58% 0.18 255)",
    success: "oklch(62% 0.15 150)",
    danger: "oklch(60% 0.18 25)",
    warn: "oklch(72% 0.14 75)",
    surfaceHover: "oklch(96% 0.005 250)",
  },
  font: {
    display:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
    body: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
  radius: {
    sm: "0.375rem", // 6px  — buttons, fields, nav items
    md: "0.5rem", //   8px  — dropdowns, project cards
    lg: "0.625rem", // 10px — panels, stat blocks
    xl: "0.75rem", //  12px — landing card, modal
    pill: "9999px",
  },
  spacing: {
    shell: "1280px",
    sidebar: "240px",
    sidebarCollapsed: "56px",
    pageX: "40px",
    pageY: "28px",
    pageYBottom: "64px",
  },
  easing: {
    /** The ONE canonical easing. Use for ALL color/transform/scale transitions. */
    out: "cubic-bezier(0.16, 1, 0.3, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
  },
  duration: {
    fast: "120ms",
    base: "150ms",
    slow: "200ms",
    modal: "250ms",
  },
} as const;

export type DesignToken = typeof tokens;
export type DesignColor = keyof typeof tokens.color;
export type DesignRadius = keyof typeof tokens.radius;
