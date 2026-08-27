import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Shared animation primitives for the dashboard / project-dashboard pages.
 *
 * Emil:
 *  - 60ms stagger (30–80ms band) — cascades without making the last item
 *    feel late.
 *  - One canonical easing: `cubic-bezier(0.16, 1, 0.3, 1)` (= the project's
 *    `tokens.easing.out`). Mixing curves is the single most common way
 *    dashboards feel "off" in the aggregate.
 *  - GPU-only properties. Every motion here uses `transform` + `opacity`.
 *  - `prefers-reduced-motion` is honored by passing `reduce` through from
 *    the page-level `useReducedMotion()` — keeps a single hook call at the
 *    page root and avoids re-subscribing per row.
 */

export const STAGGER = 0.06; // 60ms between siblings
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * A single staggered row. Wrap any repeating element (stat cells, list rows,
 * bar rows) to get consistent cascade entrance.
 */
export function StaggerRow({
  children,
  index,
  reduce,
  className,
  style,
  duration = 0.4,
}: {
  children: ReactNode;
  index: number;
  reduce: boolean | null;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={
        reduce ? false : { opacity: 0, transform: "translateY(6px)" }
      }
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{
        duration: reduce ? 0 : duration,
        ease: EASE_OUT,
        delay: reduce ? 0 : index * STAGGER,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A delta pill that pops in slightly after its parent settles. The `parentDelay`
 * should be the parent row's effective settle time (count-up + small buffer)
 * so the delta lands *after* the count, not during it.
 */
export function StaggeredDelta({
  reduce,
  index,
  parentDelay = 0.45,
  direction,
  children,
  className,
}: {
  reduce: boolean | null;
  index: number;
  parentDelay?: number;
  direction: "up" | "down";
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      className={className ?? `stat-delta ${direction}`}
      initial={
        reduce ? false : { opacity: 0, transform: "translateY(2px)" }
      }
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{
        duration: reduce ? 0 : 0.25,
        ease: EASE_OUT,
        delay: reduce ? 0 : parentDelay + index * STAGGER,
      }}
      style={{ display: "inline-block" }}
    >
      {children}
    </motion.span>
  );
}